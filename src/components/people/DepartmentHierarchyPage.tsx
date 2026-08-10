"use client";

import * as React from 'react';
import {
  Building2,
  Download,
  FileDown,
  FolderTree,
  Layers3,
  Loader2,
  Plus,
  Search,
  Upload,
  Users,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { OrganizationUnitType } from '@/lib/hr/organization-hierarchy';
import { hasPermission } from '@/lib/permissions';
import { DepartmentHierarchyTree } from './DepartmentHierarchyTree';
import { DepartmentUnitDrawer } from './DepartmentUnitDrawer';
import {
  buildDepartmentHierarchy,
  filterDepartmentUnits,
  getDepartmentHierarchyStats,
  normalizeDepartmentUnit,
  type DepartmentUnit,
} from './department-hierarchy-utils';

interface DepartmentApiResponse {
  code?: string;
  data?: { id: string; code?: string | null };
  resource?: {
    records?: Array<Record<string, unknown> & { id: string }>;
  };
  message?: string;
}

interface DepartmentFormState {
  name: string;
  code: string;
  unitType: OrganizationUnitType;
  parentId: string;
  description: string;
  headcountAllocation: string;
  isActive: boolean;
  newParentName: string;
}

const EMPTY_FORM: DepartmentFormState = {
  name: '',
  code: '',
  unitType: 'division',
  parentId: '',
  description: '',
  headcountAllocation: '',
  isActive: true,
  newParentName: '',
};

const UNIT_TYPE_DETAILS: Array<{
  type: OrganizationUnitType;
  label: string;
  description: string;
  icon: typeof Building2;
}> = [
  { type: 'division', label: 'Division', description: 'Top-level business area or enterprise group.', icon: Building2 },
  { type: 'department', label: 'Department', description: 'Functional team within an existing division.', icon: FolderTree },
  { type: 'section', label: 'Section', description: 'Specialized group within a department.', icon: Layers3 },
  { type: 'unit', label: 'Unit', description: 'Operational team within a section.', icon: Users },
];

export function DepartmentHierarchyPage() {
  const { data: session } = useSession();
  const canManage = hasPermission(session?.user, 'HR_PEOPLE_MANAGE');
  const [units, setUnits] = React.useState<DepartmentUnit[]>([]);
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = React.useState(true);
  const [choiceOpen, setChoiceOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [showNewParent, setShowNewParent] = React.useState(false);
  const [editingUnit, setEditingUnit] = React.useState<DepartmentUnit | null>(null);
  const [archiveUnit, setArchiveUnit] = React.useState<DepartmentUnit | null>(null);
  const [form, setForm] = React.useState<DepartmentFormState>(EMPTY_FORM);
  const [codePreview, setCodePreview] = React.useState('');
  const [newDivisionCodePreview, setNewDivisionCodePreview] = React.useState('');
  const [isCodePreviewLoading, setIsCodePreviewLoading] = React.useState(false);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedUnit, setSelectedUnit] = React.useState<DepartmentUnit | null>(null);

  const loadUnits = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/hr/departments', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await response.json() as DepartmentApiResponse;
      if (!response.ok) throw new Error(data.message || 'Failed to load organization structure');
      setUnits((data.resource?.records || []).map(normalizeDepartmentUnit));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load organization structure');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  const filteredUnits = React.useMemo(
    () => filterDepartmentUnits(units, query, status),
    [query, status, units],
  );
  const hierarchy = React.useMemo(() => buildDepartmentHierarchy(filteredUnits), [filteredUnits]);
  const stats = React.useMemo(() => getDepartmentHierarchyStats(units), [units]);
  const validParents = React.useMemo(() => {
    const requiredType = getParentType(form.unitType);
    return requiredType
      ? units.filter(unit => unit.unitType === requiredType && unit.isActive)
      : [];
  }, [form.unitType, units]);

  React.useEffect(() => {
    if (!formOpen) return;
    if (editingUnit) {
      setCodePreview(editingUnit.code);
      setNewDivisionCodePreview('');
      return;
    }

    const controller = new AbortController();
    const loadPreview = async () => {
      const requiresParent = form.unitType !== 'division';
      const createsNewDivision = form.unitType === 'department' && showNewParent;
      if (requiresParent && !form.parentId && !createsNewDivision) {
        setCodePreview('');
        setNewDivisionCodePreview('');
        return;
      }

      setIsCodePreviewLoading(true);
      try {
        if (createsNewDivision) {
          const divisionCode = await fetchCodePreview('division', null, controller.signal);
          setNewDivisionCodePreview(divisionCode);
          setCodePreview(`${divisionCode}-DEP-001`);
          return;
        }

        const nextCode = await fetchCodePreview(
          form.unitType,
          form.parentId || null,
          controller.signal,
        );
        setCodePreview(nextCode);
        setNewDivisionCodePreview('');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setCodePreview('');
          toast.error(error instanceof Error ? error.message : 'Failed to generate organization code');
        }
      } finally {
        if (!controller.signal.aborted) setIsCodePreviewLoading(false);
      }
    };

    void loadPreview();
    return () => controller.abort();
  }, [editingUnit, form.parentId, form.unitType, formOpen, showNewParent]);

  const openCreate = (seed?: Partial<DepartmentUnit>) => {
    if (!seed?.unitType) {
      setChoiceOpen(true);
      return;
    }
    setEditingUnit(null);
    setShowNewParent(false);
    setForm({
      ...EMPTY_FORM,
      unitType: seed.unitType,
      parentId: seed.parentId || '',
    });
    setFormOpen(true);
  };

  const chooseType = (unitType: OrganizationUnitType) => {
    setChoiceOpen(false);
    openCreate({ unitType, parentId: null });
  };

  const openEdit = (unit: DepartmentUnit) => {
    setEditingUnit(unit);
    setShowNewParent(false);
    setForm({
      name: unit.name,
      code: unit.code,
      unitType: unit.unitType,
      parentId: unit.parentId || '',
      description: unit.description,
      headcountAllocation: unit.headcountAllocation === null ? '' : String(unit.headcountAllocation),
      isActive: unit.isActive,
      newParentName: '',
    });
    setFormOpen(true);
  };

  const updateForm = (key: keyof DepartmentFormState, value: string | boolean) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const saveUnit = async () => {
    if (!form.name.trim()) {
      toast.error('Unit name is required.');
      return;
    }
    if (!editingUnit && form.unitType !== 'division' && !form.parentId && !showNewParent) {
      toast.error(`Select a ${getParentType(form.unitType)}.`);
      return;
    }
    if (showNewParent && !form.newParentName.trim()) {
      toast.error('New division name is required.');
      return;
    }
    if (form.headcountAllocation !== '' && (
      !Number.isInteger(Number(form.headcountAllocation)) || Number(form.headcountAllocation) < 0
    )) {
      toast.error('Headcount allocation must be a non-negative whole number.');
      return;
    }

    setIsSaving(true);
    try {
      let parentId = form.parentId || null;
      if (!editingUnit && form.unitType === 'department' && showNewParent) {
        const parentResponse = await fetch('/api/hr/departments/hierarchy', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.newParentName.trim(),
            code: null,
            unitType: 'division',
            parentId: null,
            isActive: true,
          }),
        });
        const parentData = await parentResponse.json() as DepartmentApiResponse;
        if (!parentResponse.ok || !parentData.data?.id) {
          throw new Error(parentData.message || 'Failed to create division');
        }
        parentId = parentData.data.id;
      }

      const response = await fetch('/api/hr/departments/hierarchy', {
        method: editingUnit ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUnit ? {
          action: 'update',
          id: editingUnit.id,
          name: form.name.trim(),
          description: form.description.trim() || null,
          headcountAllocation: form.headcountAllocation === '' ? null : Number(form.headcountAllocation),
          isActive: form.isActive,
        } : {
          name: form.name.trim(),
          code: null,
          unitType: form.unitType,
          parentId,
          description: form.description.trim() || null,
          headcountAllocation: form.headcountAllocation === '' ? null : Number(form.headcountAllocation),
          isActive: form.isActive,
        }),
      });
      const data = await response.json() as DepartmentApiResponse;
      if (!response.ok) throw new Error(data.message || 'Failed to save organization unit');

      setFormOpen(false);
      toast.success(editingUnit
        ? 'Organization unit updated.'
        : `${capitalize(form.unitType)} ${data.data?.code || codePreview} created.`);
      await loadUnits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save organization unit');
    } finally {
      setIsSaving(false);
    }
  };

  const moveUnit = async (id: string, parentId: string | null, index: number) => {
    try {
      const response = await fetch('/api/hr/departments/hierarchy', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', id, parentId, index }),
      });
      const data = await response.json() as DepartmentApiResponse;
      if (!response.ok) throw new Error(data.message || 'Failed to move organization unit');
      toast.success('Organization structure updated.');
      await loadUnits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to move organization unit');
    }
  };

  const importStructure = async () => {
    if (!importFile) {
      toast.error('Choose a CSV file.');
      return;
    }
    setIsSaving(true);
    try {
      const body = new FormData();
      body.append('file', importFile);
      const response = await fetch('/api/hr/departments/transfer', {
        method: 'POST',
        credentials: 'include',
        body,
      });
      const data = await response.json() as DepartmentApiResponse;
      if (!response.ok) throw new Error(data.message || 'Failed to import organization structure');
      setImportOpen(false);
      setImportFile(null);
      toast.success(data.message || 'Organization structure imported.');
      await loadUnits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import organization structure');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmArchive = async () => {
    if (!archiveUnit) return;
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/hr/departments?id=${encodeURIComponent(archiveUnit.id)}`,
        { method: 'DELETE', credentials: 'include' },
      );
      const data = await response.json() as DepartmentApiResponse;
      if (!response.ok) throw new Error(data.message || 'Failed to archive organization unit');
      setArchiveUnit(null);
      toast.success('Organization unit archived.');
      await loadUnits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to archive organization unit');
    } finally {
      setIsSaving(false);
    }
  };

  const organizationUnitFormFields = (
    <div className="grid gap-4 py-2 sm:grid-cols-2">
      {!editingUnit && form.unitType !== 'division' && (
        <div className="sm:col-span-2">
          <FormField label={`${capitalize(getParentType(form.unitType) || 'parent')} code`}>
            <div className="flex gap-2">
              <Select
                value={form.parentId}
                onValueChange={value => {
                  updateForm('parentId', value);
                  setShowNewParent(false);
                }}
                disabled={showNewParent}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={`Select ${getParentType(form.unitType)} code`} />
                </SelectTrigger>
                <SelectContent>
                  {validParents.map(parent => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {parent.code || 'No code'} - {parent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.unitType === 'department' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNewParent(current => !current);
                    updateForm('parentId', '');
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New division
                </Button>
              )}
            </div>
          </FormField>
        </div>
      )}
      {!editingUnit && form.unitType === 'department' && showNewParent && (
        <>
          <FormField label="New division name">
            <Input value={form.newParentName} onChange={event => updateForm('newParentName', event.target.value)} />
          </FormField>
          <FormField label="New division code">
            <AutoGeneratedCodeField
              code={newDivisionCodePreview}
              isLoading={isCodePreviewLoading}
              placeholder="Generating division code..."
            />
          </FormField>
        </>
      )}
      <FormField label={`${capitalize(form.unitType)} name`}>
        <Input value={form.name} onChange={event => updateForm('name', event.target.value)} />
      </FormField>
      <FormField label={editingUnit ? 'Code' : 'Auto-generated code'}>
        {editingUnit ? (
          <div className="space-y-1.5">
            <Input value={form.code} readOnly className="bg-muted/40 font-mono" />
            <p className="text-[11px] text-muted-foreground">Organization codes stay fixed after creation.</p>
          </div>
        ) : (
          <AutoGeneratedCodeField
            code={codePreview}
            isLoading={isCodePreviewLoading}
            placeholder={form.unitType === 'division'
              ? 'Generating division code...'
              : `Select ${getParentType(form.unitType)} to generate code`}
          />
        )}
      </FormField>
      <FormField label="Status">
        <Select
          value={form.isActive ? 'active' : 'inactive'}
          onValueChange={value => updateForm('isActive', value === 'active')}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Headcount allocation">
        <div className="space-y-1.5">
          <Input
            type="number"
            min={0}
            step={1}
            value={form.headcountAllocation}
            onChange={event => updateForm('headcountAllocation', event.target.value)}
            placeholder="Unlimited"
          />
          <p className="text-[11px] text-muted-foreground">Blank is unlimited. Usage includes all child units.</p>
        </div>
      </FormField>
      <div className="sm:col-span-2">
        <FormField label="Description">
          <Textarea
            value={form.description}
            onChange={event => updateForm('description', event.target.value)}
            rows={4}
          />
        </FormField>
      </div>
    </div>
  );

  return (
    <main className="min-h-full px-4 py-4 sm:px-6">
      <div className="grid grid-cols-2 border border-b-0 md:grid-cols-4">
        <Metric icon={Building2} label="Divisions" value={stats.divisions} />
        <Metric icon={FolderTree} label="Departments" value={stats.departments} />
        <Metric icon={Layers3} label="Sections" value={stats.sections} />
        <Metric icon={Users} label="Employees" value={stats.employees} />
      </div>

      <section className="border bg-background">
        <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search organization..."
                className="pl-8"
              />
            </div>
            <Select value={status} onValueChange={value => setStatus(value as typeof status)}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button type="button" variant="outline" asChild>
                <a href="/api/hr/departments/transfer?mode=export">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </a>
              </Button>
              <Button type="button" onClick={() => openCreate()}>
                <Plus className="mr-2 h-4 w-4" />
                Add unit
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2 border-t p-4">
            {[1, 2, 3, 4].map(item => <div key={item} className="h-10 animate-pulse bg-muted" />)}
          </div>
        ) : (
          <DepartmentHierarchyTree
            canManage={canManage}
            hierarchy={hierarchy}
            onArchive={setArchiveUnit}
            onCreate={openCreate}
            onEdit={openEdit}
            onMove={moveUnit}
            onSelect={setSelectedUnit}
          />
        )}
      </section>

      <DepartmentUnitDrawer
        unit={selectedUnit}
        units={units}
        onOpenChange={open => !open && setSelectedUnit(null)}
      />

      <Dialog open={choiceOpen} onOpenChange={setChoiceOpen}>
        <DialogContent className="sm:max-w-[640px]" dialogId="organization-unit-type">
          <DialogHeader>
            <DialogTitle>Add organization unit</DialogTitle>
            <DialogDescription>Choose the hierarchy level to create.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            {UNIT_TYPE_DETAILS.map(option => (
              <button
                key={option.type}
                type="button"
                onClick={() => chooseType(option.type)}
                className="flex min-h-28 items-start gap-3 rounded-md border bg-background p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <option.icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span>
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen && !editingUnit} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[620px]" dialogId="organization-unit-form">
          <DialogHeader>
            <DialogTitle>{editingUnit ? `Edit ${form.unitType}` : `Add ${form.unitType}`}</DialogTitle>
            <DialogDescription>
              {editingUnit ? 'Update this organization unit. Drag it in the tree to change its level or parent.' : 'Add the unit to the correct place in the hierarchy.'}
            </DialogDescription>
          </DialogHeader>
          {organizationUnitFormFields}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveUnit} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingUnit ? 'Save changes' : `Create ${form.unitType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={formOpen && Boolean(editingUnit)} onOpenChange={setFormOpen}>
        <SheetContent side="right" className="flex w-full flex-col overflow-y-auto p-0 sm:max-w-xl" sheetId="organization-unit-edit">
          <SheetHeader className="border-b bg-muted/20 px-5 py-5 pr-14 text-left">
            <div className="mb-1 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </span>
              <Badge variant="outline" className="capitalize">{form.unitType}</Badge>
            </div>
            <SheetTitle>Edit {form.unitType}</SheetTitle>
            <SheetDescription>
              Update the editable attributes below. Drag the item in the tree to change its parent or hierarchy level.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 px-5 py-4">
            {organizationUnitFormFields}
          </div>
          <SheetFooter className="sticky bottom-0 border-t bg-background px-5 py-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveUnit} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-[560px]" dialogId="organization-import">
          <DialogHeader>
            <DialogTitle>Import organization structure</DialogTitle>
            <DialogDescription>
              Upload a CSV with typed units and parent codes. Import rows are validated before any changes are applied.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between gap-3 border p-3">
              <div>
                <p className="text-sm font-medium">CSV template</p>
                <p className="text-xs text-muted-foreground">Includes division, department, section, and unit examples.</p>
              </div>
              <Button type="button" variant="outline" size="sm" asChild>
                <a href="/api/hr/departments/transfer?mode=template">
                  <FileDown className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
            </div>
            <FormField label="CSV file">
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={event => setImportFile(event.target.files?.[0] || null)}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button type="button" onClick={importStructure} disabled={isSaving || !importFile}>
              <Upload className="mr-2 h-4 w-4" />
              {isSaving ? 'Importing...' : 'Import structure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(archiveUnit)} onOpenChange={open => !open && setArchiveUnit(null)}>
        <AlertDialogContent dialogId="archive-organization-unit">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {archiveUnit?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The unit will remain in history but will no longer be active in HR workflows.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive} disabled={isSaving}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function AutoGeneratedCodeField({
  code,
  isLoading,
  placeholder,
}: {
  code: string;
  isLoading: boolean;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          value={code}
          readOnly
          placeholder={placeholder}
          className="bg-muted/40 pr-9 font-mono"
          aria-label="Auto-generated organization code"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Uses the selected parent code, unit prefix, and next running number.
      </p>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-r p-3 last:border-r-0 md:border-b-0">
      <Icon className="h-4 w-4 text-primary" />
      <div>
        <p className="text-lg font-semibold leading-none">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function FormField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function getParentType(type: OrganizationUnitType): OrganizationUnitType | null {
  const types: OrganizationUnitType[] = ['division', 'department', 'section', 'unit'];
  return types[types.indexOf(type) - 1] || null;
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

async function fetchCodePreview(
  unitType: OrganizationUnitType,
  parentId: string | null,
  signal: AbortSignal,
) {
  const query = new URLSearchParams({ unitType });
  if (parentId) query.set('parentId', parentId);
  const response = await fetch(`/api/hr/departments/hierarchy?${query}`, {
    credentials: 'include',
    cache: 'no-store',
    signal,
  });
  const data = await response.json() as DepartmentApiResponse;
  if (!response.ok || !data.code) {
    throw new Error(data.message || 'Failed to generate organization code');
  }
  return data.code;
}
