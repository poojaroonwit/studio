"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { Database, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  SortableNativeHeader,
  type SortDirection,
  sortRowsByColumn,
  type SortValueResolverMap,
} from '@/components/ui/sortable-table';
import { CUSTOM_FIELD_TYPES, type CustomFieldDefinition, type CustomFieldOption, type CustomFieldType } from '@/lib/types';
import { hasAnyPermission } from '@/lib/permissions';
import { readJsonOrFallback } from '@/lib/response-json';
import { cn } from '@/lib/utils';
import { OPEN_FIELD_CREATION_EVENT } from './field-management-events';

interface PlatformDataModelField {
  defaultValue?: string;
  isList: boolean;
  isOptional: boolean;
  isSystem: boolean;
  label: string;
  name: string;
  nativeType?: string;
  type: string;
}

interface PlatformDataModel {
  customFields: CustomFieldDefinition[];
  fields: PlatformDataModelField[];
  label: string;
  name: string;
}

interface FieldManagementResponse {
  models: PlatformDataModel[];
  message?: string;
}

type FieldFormState = {
  allowCustomOptions: boolean;
  field_code: string;
  field_type: CustomFieldType;
  is_required: boolean;
  label: string;
  model_name: string;
  optionsText: string;
  sort_order: number;
};

const EMPTY_FORM: FieldFormState = {
  allowCustomOptions: false,
  field_code: '',
  field_type: 'text',
  is_required: false,
  label: '',
  model_name: '',
  optionsText: '',
  sort_order: 0,
};

export default function FieldManagementPage() {
  const { data: session, status } = useSession();
  const canManageFields = hasAnyPermission(session?.user, ['CUSTOM_FIELDS_EDIT']);
  const [models, setModels] = useState<PlatformDataModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeModelName, setActiveModelName] = useState<string>('');
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [form, setForm] = useState<FieldFormState>(EMPTY_FORM);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const pendingCreateFormRef = useRef(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  useEffect(() => {
    setIsEmbedded(new URLSearchParams(window.location.search).get('adminCenterEmbed') === '1');
  }, []);

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/field-management');
      const data = await readJsonOrFallback<FieldManagementResponse>(response, { models: [] });
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load field management data');
      }
      setModels(data.models);
      setActiveModelName(current => current || data.models[0]?.name || '');
    } catch (error) {
      console.error('Failed to load field management data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load field management data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn(undefined, { callbackUrl: '/settings/field-management' });
      return;
    }

    if (status === 'authenticated') {
      void loadModels();
    }
  }, [loadModels, status]);

  const filteredModels = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return models;

    return models.filter(model =>
      model.name.toLowerCase().includes(needle)
      || model.label.toLowerCase().includes(needle)
      || model.fields.some(field => field.name.toLowerCase().includes(needle))
      || model.customFields.some(field => field.label.toLowerCase().includes(needle) || field.field_code.toLowerCase().includes(needle))
    );
  }, [models, query]);

  const activeModel = models.find(model => model.name === activeModelName) || filteredModels[0] || models[0];
  const customFieldMap = new Map(activeModel?.customFields.map(field => [field.field_code, field]) || []);
  const fieldRowsSortValueResolvers = useMemo<SortValueResolverMap<
    { kind: 'system' | 'custom'; field: PlatformDataModelField | CustomFieldDefinition }
  >>(() => ({
    field: row => row.kind === 'system'
      ? `${row.field.label} ${(row.field as PlatformDataModelField).name}`
      : `${row.field.label} ${(row.field as CustomFieldDefinition).field_code}`,
    type: row => {
      if (row.kind === 'system') {
        return formatSystemType(row.field as PlatformDataModelField);
      }
      return formatFieldType((row.field as CustomFieldDefinition).field_type);
    },
    source: row => (row.kind === 'system' ? 'System' : 'Dynamic'),
    rules: row => {
      if (row.kind === 'system') {
        const field = row.field as PlatformDataModelField;
        return [field.isOptional ? 'Optional' : 'Required', field.isList ? 'List' : null, field.defaultValue ? `Default: ${field.defaultValue}` : null]
          .filter(Boolean).join(' | ');
      }

      const field = row.field as CustomFieldDefinition;
      return [
        field.is_required ? 'Required' : 'Optional',
        field.options?.length ? `${field.options.length} options` : null,
        customFieldMap.has(field.field_code) ? 'Overrides system code' : null,
      ].filter(Boolean).join(' | ');
    },
  }), [customFieldMap]);
  const fieldRows = [
    ...(activeModel?.fields || []).map(field => ({ kind: 'system' as const, field })),
    ...(activeModel?.customFields || []).map(field => ({ kind: 'custom' as const, field })),
  ];
  const sortedFieldRows = useMemo(
    () => sortRowsByColumn(fieldRows, sortColumn, sortDirection, fieldRowsSortValueResolvers),
    [fieldRows, sortColumn, sortDirection, fieldRowsSortValueResolvers],
  );

  const handleSort = (column: string | null, direction: SortDirection) => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const openCreateForm = useCallback(() => {
    if (!activeModel) {
      pendingCreateFormRef.current = true;
      return;
    }

    pendingCreateFormRef.current = false;
    setEditingField(null);
    setForm({
      ...EMPTY_FORM,
      model_name: activeModel.name,
      sort_order: activeModel.customFields.length,
    });
  }, [activeModel?.customFields.length, activeModel?.name]);

  useEffect(() => {
    if (activeModel && pendingCreateFormRef.current) openCreateForm();
  }, [activeModel, openCreateForm]);

  useEffect(() => {
    const handleAdminCenterAction = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin
        || event.source !== window.parent
        || event.data?.type !== OPEN_FIELD_CREATION_EVENT
      ) return;

      openCreateForm();
    };

    window.addEventListener('message', handleAdminCenterAction);
    return () => window.removeEventListener('message', handleAdminCenterAction);
  }, [openCreateForm]);

  const openEditForm = (field: CustomFieldDefinition) => {
    setEditingField(field);
    setForm({
      allowCustomOptions: field.allowCustomOptions || false,
      field_code: field.field_code,
      field_type: field.field_type,
      is_required: field.is_required || false,
      label: field.label,
      model_name: field.model_name,
      optionsText: optionsToText(field.options || []),
      sort_order: field.sort_order || 0,
    });
  };

  const closeForm = () => {
    setEditingField(null);
    setForm(EMPTY_FORM);
  };

  const saveField = async () => {
    if (!form.model_name || !form.field_code || !form.label) {
      toast.error('Model, field code, and label are required.');
      return;
    }

    if (!/^[A-Z0-9_]+$/.test(form.field_code)) {
      toast.error('Field code must be uppercase alphanumeric with underscores.');
      return;
    }

    try {
      const payload = {
        model_name: form.model_name,
        field_code: form.field_code,
        label: form.label,
        field_type: form.field_type,
        viewRoles: [],
        editRoles: [],
        showInFilter: false,
        showInApplicantDetail: false,
        showInFullApplicantDetail: false,
        showInTaskBoardFilter: false,
        showInPositionSettings: false,
        showInHeadcountDetail: false,
        is_required: form.is_required,
        allowCustomOptions: form.allowCustomOptions,
        sort_order: Number.isFinite(form.sort_order) ? form.sort_order : 0,
        options: parseOptions(form.optionsText),
      };
      const response = await fetch(
        editingField ? `/api/settings/custom-field-definitions/${editingField.id}` : '/api/settings/custom-field-definitions',
        {
          method: editingField ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const result = await readJsonOrFallback<{ message?: string }>(response, {});
      if (!response.ok) {
        throw new Error(result.message || `Failed to ${editingField ? 'update' : 'create'} field`);
      }

      toast.success(`Field ${editingField ? 'updated' : 'created'} successfully.`);
      closeForm();
      await loadModels();
    } catch (error) {
      console.error('Failed to save field:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save field');
    }
  };

  const deleteField = async (field: CustomFieldDefinition) => {
    if (!confirm(`Delete "${field.label}" from ${field.model_name}?`)) return;

    try {
      const response = await fetch(`/api/settings/custom-field-definitions/${field.id}`, { method: 'DELETE' });
      const result = await readJsonOrFallback<{ message?: string }>(response, {});
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete field');
      }
      toast.success('Field deleted successfully.');
      await loadModels();
    } catch (error) {
      console.error('Failed to delete field:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete field');
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManageFields) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md rounded-md border bg-card p-6 text-center">
          <Database className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-semibold">Field Management</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need CUSTOM_FIELDS_EDIT permission to manage platform fields.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-6">
      {!isEmbedded && (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-normal text-foreground">Field Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse every platform data model. System fields are locked; dynamic fields can be added, updated, or deleted.
            </p>
          </div>
          <Button onClick={openCreateForm} disabled={!activeModel}>
            <Plus className="mr-2 h-4 w-4" />
            Add Field
          </Button>
        </header>
      )}

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-h-0 rounded-md border bg-card">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search models"
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
            </div>
          </div>
          <div className="h-[calc(100%-57px)] overflow-y-auto p-2">
            {filteredModels.map(model => (
              <button
                key={model.name}
                type="button"
                onClick={() => setActiveModelName(model.name)}
                className={cn(
                  'mb-1 flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition-colors',
                  model.name === activeModel?.name
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span className="min-w-0 truncate">{model.label}</span>
                <span className="ml-2 shrink-0 text-xs opacity-80">{model.fields.length + model.customFields.length}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="min-h-0 overflow-hidden rounded-md border bg-card">
          {activeModel && (
            <>
              <div className="flex items-start justify-between gap-4 border-b p-4">
                <div>
                  <h2 className="text-lg font-semibold">{activeModel.label}</h2>
                  <p className="text-sm text-muted-foreground">
                    {activeModel.fields.length} system fields, {activeModel.customFields.length} dynamic fields
                  </p>
                </div>
                <span className="rounded border px-2 py-1 text-xs font-medium text-muted-foreground">{activeModel.name}</span>
              </div>

              {form.model_name && (
                <section className="border-b bg-muted/20 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{editingField ? 'Update Dynamic Field' : 'Add Dynamic Field'}</h3>
                    <Button variant="ghost" size="sm" onClick={closeForm}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <FieldControl label="Model">
                      <Select value={form.model_name} onValueChange={value => setForm(current => ({ ...current, model_name: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent selectId="field-management-model-select">
                          {models.map(model => (
                            <SelectItem key={model.name} value={model.name}>{model.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldControl>
                    <FieldControl label="Field Code">
                      <Input
                        value={form.field_code}
                        onChange={event => setForm(current => ({ ...current, field_code: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') }))}
                        placeholder="FIELD_CODE"
                      />
                    </FieldControl>
                    <FieldControl label="Label">
                      <Input
                        value={form.label}
                        onChange={event => setForm(current => ({ ...current, label: event.target.value }))}
                        placeholder="Display label"
                      />
                    </FieldControl>
                    <FieldControl label="Type">
                      <Select value={form.field_type} onValueChange={value => setForm(current => ({ ...current, field_type: value as CustomFieldType }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent selectId="field-management-type-select">
                          {CUSTOM_FIELD_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{formatFieldType(type)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldControl>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-[160px_160px_minmax(0,1fr)_auto]">
                    <FieldControl label="Sort Order">
                      <Input
                        type="number"
                        value={form.sort_order}
                        onChange={event => setForm(current => ({ ...current, sort_order: Number(event.target.value) }))}
                      />
                    </FieldControl>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-muted-foreground">Required</label>
                      <Switch checked={form.is_required} onCheckedChange={value => setForm(current => ({ ...current, is_required: value }))} />
                    </div>
                    <FieldControl label="Options">
                      <Textarea
                        value={form.optionsText}
                        onChange={event => setForm(current => ({ ...current, optionsText: event.target.value }))}
                        placeholder="One option per line, e.g. active:Active"
                      />
                    </FieldControl>
                    <div className="flex items-end">
                      <Button onClick={saveField}>{editingField ? 'Update Field' : 'Create Field'}</Button>
                    </div>
                  </div>
                </section>
              )}

              <div className="h-[calc(100%-81px)] overflow-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="sticky top-0 z-10 border-b bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <SortableNativeHeader
                        column="field"
                        label="Field"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        className="px-4 py-3 font-medium"
                      />
                      <SortableNativeHeader
                        column="type"
                        label="Type"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        className="px-4 py-3 font-medium"
                      />
                      <SortableNativeHeader
                        column="source"
                        label="Source"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        className="px-4 py-3 font-medium"
                      />
                      <SortableNativeHeader
                        column="rules"
                        label="Rules"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        className="px-4 py-3 font-medium"
                      />
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFieldRows.map(row => {
                      const key = row.kind === 'system' ? row.field.name : row.field.id;
                      const hasDuplicateCustomField = row.kind === 'system' && customFieldMap.has(row.field.name);

                      return (
                        <tr key={`${row.kind}-${key}`} className="border-b last:border-0">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">
                              {row.kind === 'system' ? row.field.label : row.field.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {row.kind === 'system' ? row.field.name : row.field.field_code}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {row.kind === 'system' ? formatSystemType(row.field) : formatFieldType(row.field.field_type)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'rounded px-2 py-1 text-xs font-medium',
                              row.kind === 'system'
                                ? 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
                            )}>
                              {row.kind === 'system' ? 'System' : 'Dynamic'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {row.kind === 'system'
                              ? [
                                  row.field.isOptional ? 'Optional' : 'Required',
                                  row.field.isList ? 'List' : null,
                                  row.field.defaultValue ? `Default: ${row.field.defaultValue}` : null,
                                ].filter(Boolean).join(' | ')
                              : [
                                  row.field.is_required ? 'Required' : 'Optional',
                                  row.field.options?.length ? `${row.field.options.length} options` : null,
                                  hasDuplicateCustomField ? 'Overrides system code' : null,
                                ].filter(Boolean).join(' | ') || 'Optional'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.kind === 'custom' ? (
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditForm(row.field)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => deleteField(row.field)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Locked</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function FieldControl({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function formatFieldType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
}

function formatSystemType(field: PlatformDataModelField) {
  const suffixes = [
    field.nativeType ? field.nativeType : null,
    field.isList ? 'List' : null,
  ].filter(Boolean);

  return suffixes.length ? `${field.type} (${suffixes.join(', ')})` : field.type;
}

function optionsToText(options: CustomFieldOption[]) {
  return options.map(option => `${option.value}:${option.label}`).join('\n');
}

function parseOptions(value: string): CustomFieldOption[] {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [optionValue, ...labelParts] = line.split(':');
      const label = labelParts.join(':').trim() || optionValue.trim();
      return {
        value: optionValue.trim(),
        label,
        sortOrder: index,
        isActive: true,
      };
    });
}
