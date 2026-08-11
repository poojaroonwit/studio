"use client";

import * as React from 'react';
import {
  Clock3,
  Database,
  ListPlus,
  Plus,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type {
  CompanyPortalCmsCollection,
  CompanyPortalCmsFieldType,
  CompanyPortalDataFilterOperator,
} from '@/lib/company-portal-builder';
import {
  getCompanyPortalFilterOperators,
  normalizeCompanyPortalFilterOperator,
} from '@/lib/company-portal-filter-operators';
import { isSupportedCompanyPortalField } from '@/lib/company-portal-platform-fields';

interface PlatformModelField {
  isList: boolean;
  label: string;
  name: string;
  type: string;
}

interface PlatformModel {
  fields: PlatformModelField[];
  label: string;
  name: string;
}

const FIELD_TYPES: Array<{ value: CompanyPortalCmsFieldType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'rich-text', label: 'Rich text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'asset', label: 'Asset' },
];

export function CompanyPortalCmsDialog({
  collection,
  isNew,
  onClose,
  onSave,
}: {
  collection: CompanyPortalCmsCollection | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (collection: CompanyPortalCmsCollection) => void;
}) {
  const [draft, setDraft] = React.useState<CompanyPortalCmsCollection | null>(collection);
  const [fieldName, setFieldName] = React.useState('');
  const [fieldType, setFieldType] = React.useState<CompanyPortalCmsFieldType>('text');
  const [fieldRequired, setFieldRequired] = React.useState(false);
  const [recordValues, setRecordValues] = React.useState<Record<string, string>>({});
  const [platformModels, setPlatformModels] = React.useState<PlatformModel[]>([]);

  React.useEffect(() => {
    if (collection) {
      const nextDraft = structuredClone(collection);
      nextDraft.filters = nextDraft.filters.map(filter => {
        const field = nextDraft.fields.find(item => item.key === filter.fieldKey);
        return field ? {
          ...filter,
          operator: normalizeCompanyPortalFilterOperator(field.type, filter.operator),
        } : filter;
      });
      setDraft(nextDraft);
    } else {
      setDraft(null);
    }
    setFieldName('');
    setFieldType('text');
    setFieldRequired(false);
    setRecordValues({});
  }, [collection]);

  React.useEffect(() => {
    if (!collection) return;
    let active = true;
    void fetch('/api/settings/field-management')
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to load data models')))
      .then((data: { models?: PlatformModel[] }) => {
        if (active) setPlatformModels(data.models || []);
      })
      .catch(error => console.error('Failed to load platform data models:', error));
    return () => { active = false; };
  }, [collection]);

  if (!draft) return null;

  const updateDraft = (patch: Partial<CompanyPortalCmsCollection>) => {
    setDraft(current => current ? { ...current, ...patch } : current);
  };

  const addField = () => {
    const name = fieldName.trim();
    if (!name) return;
    const baseKey = slugify(name).replace(/-/g, '_') || 'field';
    const existingKeys = new Set(draft.fields.map(field => field.key));
    let key = baseKey;
    let suffix = 2;
    while (existingKeys.has(key)) {
      key = `${baseKey}_${suffix}`;
      suffix += 1;
    }

    updateDraft({
      fields: [...draft.fields, {
        id: crypto.randomUUID(),
        name,
        key,
        type: fieldType,
        required: fieldRequired,
      }],
    });
    setFieldName('');
    setFieldRequired(false);
  };

  const removeField = (fieldId: string, key: string) => {
    updateDraft({
      fields: draft.fields.filter(field => field.id !== fieldId),
      records: draft.records.map(record => {
        const values = { ...record.values };
        delete values[key];
        return { ...record, values };
      }),
    });
  };

  const selectSourceModel = (modelName: string) => {
    const model = platformModels.find(item => item.name === modelName);
    if (!model) return;
    updateDraft({
      sourceModel: model.name,
      fields: model.fields.filter(isSupportedCompanyPortalField).map(field => ({
        id: `platform-${model.name}-${field.name}`,
        name: field.label,
        key: field.name,
        type: mapPlatformFieldType(field.type),
        required: false,
      })),
      records: [],
      filters: [],
    });
  };

  const addFilter = () => {
    const firstField = draft.fields[0];
    if (!firstField || draft.filters.length >= 20) return;
    updateDraft({
      filters: [...draft.filters, {
        id: crypto.randomUUID(),
        fieldKey: firstField.key,
        operator: 'equals',
        value: '',
      }],
    });
  };

  const addRecord = () => {
    if (draft.fields.length === 0) return;
    const requiredMissing = draft.fields.some(field => (
      field.required && !String(recordValues[field.key] || '').trim()
    ));
    if (requiredMissing) return;

    const now = new Date().toISOString();
    updateDraft({
      records: [...draft.records, {
        id: crypto.randomUUID(),
        values: Object.fromEntries(
          draft.fields.map(field => [field.key, recordValues[field.key] || '']),
        ),
        updatedAt: now,
      }],
      activity: [{
        id: crypto.randomUUID(),
        action: 'Data module record added',
        createdAt: now,
      }, ...draft.activity].slice(0, 100),
    });
    setRecordValues({});
  };

  const removeRecord = (recordId: string) => {
    const now = new Date().toISOString();
    updateDraft({
      records: draft.records.filter(record => record.id !== recordId),
      activity: [{
        id: crypto.randomUUID(),
        action: 'Data module record removed',
        createdAt: now,
      }, ...draft.activity].slice(0, 100),
    });
  };

  const save = () => {
    const name = draft.name.trim();
    if (!name) return;
    const now = new Date().toISOString();
    onSave({
      ...draft,
      name,
      slug: slugify(draft.slug || name),
      description: draft.description.trim(),
      activity: [{
        id: crypto.randomUUID(),
        action: isNew ? 'CMS collection created' : 'CMS collection configuration updated',
        createdAt: now,
      }, ...draft.activity].slice(0, 100),
    });
  };

  return (
    <Dialog open={Boolean(collection)} onOpenChange={open => !open && onClose()}>
      <DialogContent
        className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[900px]"
        dialogId="portal-cms-collection"
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-14">
            <DialogTitle>{isNew ? 'Add data module' : `Configure ${draft.name}`}</DialogTitle>
          <DialogDescription>
            Define the data module fields, manage its records, and review configuration activity.
          </DialogDescription>
        </DialogHeader>

        <div className="grid shrink-0 gap-3 border-b bg-muted/70 px-5 py-3 sm:grid-cols-[1fr_220px]">
          <Field label="Collection name">
            <Input
              value={draft.name}
              onChange={event => {
                const name = event.target.value;
                updateDraft({
                  name,
                  slug: isNew ? slugify(name) : draft.slug,
                });
              }}
            />
          </Field>
          <Field label="API ID">
            <Input value={draft.slug} onChange={event => updateDraft({ slug: slugify(event.target.value) })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea
                value={draft.description}
                onChange={event => updateDraft({ description: event.target.value })}
                rows={2}
                placeholder="What content this collection stores"
              />
            </Field>
          </div>
        </div>

        <Tabs defaultValue="fields" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="h-10 w-full shrink-0 justify-start rounded-none border-b bg-background px-5">
            <TabsTrigger value="fields" className="gap-2">
              <ListPlus className="h-4 w-4" />
              Fields
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-2">
              <Database className="h-4 w-4" />
              Data
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Clock3 className="h-4 w-4" />
              Activity Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fields" className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="mb-4 grid gap-3 rounded-[6px] border bg-muted/50 p-3 sm:grid-cols-2">
              <Field label="Data source">
                <Select
                  value={draft.sourceType}
                  onValueChange={value => updateDraft({
                    sourceType: value as 'custom' | 'platform',
                    sourceModel: '',
                    fields: [],
                    records: [],
                    filters: [],
                  })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom data module</SelectItem>
                    <SelectItem value="platform">Existing application data model</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {draft.sourceType === 'platform' && (
                <Field label="Application data model">
                  <Select value={draft.sourceModel || undefined} onValueChange={selectSourceModel}>
                    <SelectTrigger><SelectValue placeholder="Select Position, Employee, or another model" /></SelectTrigger>
                    <SelectContent>
                      {platformModels.map(model => (
                        <SelectItem key={model.name} value={model.name}>{model.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">
                Existing models use live application properties. Add conditions below to control which records are shown on the portal.
              </p>
            </div>

            {draft.sourceType === 'custom' && (
            <div className="grid gap-3 rounded-[6px] border bg-muted/50 p-3 sm:grid-cols-[1fr_170px_auto_auto] sm:items-end">
              <Field label="Field name">
                <Input value={fieldName} onChange={event => setFieldName(event.target.value)} placeholder="Article title" />
              </Field>
              <Field label="Type">
                <Select value={fieldType} onValueChange={value => setFieldType(value as CompanyPortalCmsFieldType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <label className="flex h-9 items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={fieldRequired}
                  onChange={event => setFieldRequired(event.target.checked)}
                />
                Required
              </label>
              <Button type="button" onClick={addField} disabled={!fieldName.trim()}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add
              </Button>
            </div>
            )}

            <div className="mt-4 divide-y rounded-[6px] border">
              {draft.fields.length === 0 && (
                <EmptyState title="No fields yet" description="Add the first field to define this collection." />
              )}
              {draft.fields.map(field => (
                <div key={field.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-[4px] bg-blue-50 text-blue-700">
                    <ListPlus className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{field.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {field.key} - {field.type}{field.required ? ' - required' : ''}
                    </span>
                  </span>
                  {draft.sourceType === 'custom' && <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeField(field.id, field.key)}
                    aria-label={`Remove ${field.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>}
                </div>
              ))}
            </div>

            {draft.sourceType === 'platform' && draft.sourceModel && (
              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Filter conditions</h3>
                    <p className="text-xs text-muted-foreground">All conditions must match for a record to be shown.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addFilter} disabled={!draft.fields.length}>
                    <Plus className="mr-1.5 h-4 w-4" /> Add condition
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  {draft.filters.length === 0 && (
                    <EmptyState title="No conditions" description="All records from this model are eligible to be shown." />
                  )}
                  {draft.filters.map(filter => {
                    const selectedField = draft.fields.find(field => field.key === filter.fieldKey) || draft.fields[0];
                    const filterOperators = selectedField
                      ? getCompanyPortalFilterOperators(selectedField.type)
                      : [];
                    const hidesValue = filter.operator === 'is_empty' || filter.operator === 'is_not_empty';
                    return (
                      <div key={filter.id} className="grid gap-2 rounded-[6px] border p-2 sm:grid-cols-[1fr_180px_1fr_auto]">
                        <Select value={filter.fieldKey} onValueChange={fieldKey => {
                          const field = draft.fields.find(item => item.key === fieldKey);
                          if (!field) return;
                          updateDraft({
                            filters: draft.filters.map(item => item.id === filter.id ? {
                              ...item,
                              fieldKey,
                              operator: normalizeCompanyPortalFilterOperator(field.type, item.operator),
                            } : item),
                          });
                        }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{draft.fields.map(field => <SelectItem key={field.key} value={field.key}>{field.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={filter.operator} onValueChange={operator => updateDraft({ filters: draft.filters.map(item => item.id === filter.id ? { ...item, operator: operator as CompanyPortalDataFilterOperator } : item) })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{filterOperators.map(operator => <SelectItem key={operator.value} value={operator.value}>{operator.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input disabled={hidesValue} value={filter.value} placeholder={hidesValue ? 'No value required' : 'Value'} onChange={event => updateDraft({ filters: draft.filters.map(item => item.id === filter.id ? { ...item, value: event.target.value } : item) })} />
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => updateDraft({ filters: draft.filters.filter(item => item.id !== filter.id) })} aria-label="Remove condition"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="data" className="min-h-0 flex-1 overflow-y-auto p-5">
            {draft.sourceType === 'platform' ? (
              <EmptyState title="Live application data" description={`Records come from the ${draft.sourceModel || 'selected'} application model and are controlled by the configured filter conditions.`} />
            ) : draft.fields.length === 0 ? (
              <EmptyState title="Fields required" description="Create collection fields before adding CMS records." />
            ) : (
              <>
                <div className="grid gap-3 rounded-[6px] border bg-muted/50 p-3 sm:grid-cols-2">
                  {draft.fields.map(field => (
                    <Field key={field.id} label={`${field.name}${field.required ? ' *' : ''}`}>
                      <Input
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                        value={recordValues[field.key] || ''}
                        onChange={event => setRecordValues(current => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))}
                      />
                    </Field>
                  ))}
                  <div className="flex items-end sm:col-span-2">
                    <Button type="button" onClick={addRecord}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add record
                    </Button>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-[6px] border">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        {draft.fields.map(field => <th key={field.id} className="px-3 py-2 font-medium">{field.name}</th>)}
                        <th className="w-12 px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {draft.records.map(record => (
                        <tr key={record.id}>
                          {draft.fields.map(field => (
                            <td key={field.id} className="max-w-[220px] truncate px-3 py-2.5">
                              {record.values[field.key] || '-'}
                            </td>
                          ))}
                          <td className="px-2 py-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeRecord(record.id)}
                              aria-label="Delete CMS record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {draft.records.length === 0 && (
                    <p className="border-t px-3 py-8 text-center text-xs text-muted-foreground">No CMS records yet.</p>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="activity" className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="divide-y rounded-[6px] border">
              {draft.activity.length === 0 && (
                <EmptyState title="No activity yet" description="Collection changes will be recorded here." />
              )}
              {draft.activity.map(item => (
                <div key={item.id} className="flex gap-3 px-3 py-3">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="shrink-0 border-t px-5 py-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={save} disabled={!draft.name.trim() || !draft.slug.trim()}>
              {isNew ? 'Create data module' : 'Save data module'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function mapPlatformFieldType(type: string): CompanyPortalCmsFieldType {
  if (['Int', 'Float', 'Decimal', 'BigInt'].includes(type)) return 'number';
  if (type === 'Boolean') return 'boolean';
  if (type === 'DateTime') return 'date';
  return 'text';
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function EmptyState({ description, title }: { description: string; title: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
