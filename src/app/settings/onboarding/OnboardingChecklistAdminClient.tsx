"use client";

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, ClipboardDocumentCheckIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type AdminRecord = Record<string, unknown> & { id: string };
type ApiResponse = { resource?: { records?: AdminRecord[] }; records?: AdminRecord[]; message?: string };

function records(payload: ApiResponse) { return payload.resource?.records || payload.records || []; }
function value(record: AdminRecord, camel: string, snake?: string) { return record[camel] ?? (snake ? record[snake] : undefined); }

export function OnboardingChecklistAdminClient({ embedded = false }: { embedded?: boolean }) {
  const [templates, setTemplates] = React.useState<AdminRecord[]>([]);
  const [tasks, setTasks] = React.useState<AdminRecord[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');
  const [templateName, setTemplateName] = React.useState('');
  const [taskForm, setTaskForm] = React.useState({ title: '', description: '', ownerRole: 'employee', dueDay: '0' });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [templatesResponse, tasksResponse] = await Promise.all([
        fetch('/api/hr/onboarding?view=templates', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/hr/onboarding?view=tasks', { credentials: 'include', cache: 'no-store' }),
      ]);
      if (!templatesResponse.ok || !tasksResponse.ok) throw new Error('Unable to load onboarding checklist configuration.');
      const [templatesPayload, tasksPayload] = await Promise.all([templatesResponse.json() as Promise<ApiResponse>, tasksResponse.json() as Promise<ApiResponse>]);
      const nextTemplates = records(templatesPayload);
      setTemplates(nextTemplates);
      setTasks(records(tasksPayload));
      setSelectedTemplateId(current => current && nextTemplates.some(item => item.id === current) ? current : nextTemplates[0]?.id || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load onboarding checklist configuration.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const createTemplate = async () => {
    if (!templateName.trim()) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/hr/onboarding?view=templates', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: templateName.trim(), description: 'Reusable employee onboarding checklist', isActive: 'true' }) });
      if (!response.ok) throw new Error('Unable to create onboarding template.');
      setTemplateName('');
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to create onboarding template.'); }
    finally { setIsSaving(false); }
  };

  const createTask = async () => {
    if (!selectedTemplateId || !taskForm.title.trim()) return;
    setIsSaving(true);
    try {
      const templateTasks = tasks.filter(task => value(task, 'templateId', 'template_id') === selectedTemplateId);
      const response = await fetch('/api/hr/onboarding?view=tasks', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplateId, title: taskForm.title.trim(), description: taskForm.description.trim() || undefined, ownerRole: taskForm.ownerRole, dueDay: Number(taskForm.dueDay), sortOrder: templateTasks.length + 1 }),
      });
      if (!response.ok) throw new Error('Unable to add checklist step.');
      setTaskForm({ title: '', description: '', ownerRole: 'employee', dueDay: '0' });
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to add checklist step.'); }
    finally { setIsSaving(false); }
  };

  const removeTask = async (taskId: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/hr/onboarding?view=tasks&id=${encodeURIComponent(taskId)}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) throw new Error('Unable to remove checklist step.');
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to remove checklist step.'); }
    finally { setIsSaving(false); }
  };

  const visibleTasks = tasks.filter(task => value(task, 'templateId', 'template_id') === selectedTemplateId);

  return (
    <main className={cn('min-h-full bg-[#f7f9fc] px-4 text-[#172033] dark:bg-zinc-950 dark:text-zinc-50 sm:px-6 lg:px-8', embedded ? 'py-5' : 'py-7')}>
      {!embedded && <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 dark:border-zinc-800 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5873a4] dark:text-blue-300">Admin Center · People configuration</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em]">Onboarding checklist</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-zinc-300">Define the reusable steps, owners, and timing applied to employee onboarding journeys.</p></div>
        <Button asChild variant="outline"><Link href="/people/onboarding"><ArrowLeftIcon className="mr-2 h-4 w-4" />View employee journeys</Link></Button>
      </header>}

      {embedded && <div className="flex justify-end border-b border-slate-200 pb-4 dark:border-zinc-800"><Button asChild variant="outline" size="sm"><Link href="/people/onboarding"><ArrowLeftIcon className="mr-2 h-4 w-4" />View employee journeys</Link></Button></div>}

      {error && <p role="alert" className="border-b border-amber-200 py-3 text-sm text-amber-700 dark:border-amber-900 dark:text-amber-300">{error}</p>}

      <div className="grid lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 py-7 dark:border-zinc-800 lg:border-b-0 lg:border-r lg:pr-7">
          <Label htmlFor="template-name">Checklist template</Label>
          <div className="mt-2 flex gap-2"><Input id="template-name" value={templateName} onChange={event => setTemplateName(event.target.value)} placeholder="New hire essentials" /><Button type="button" size="icon" disabled={!templateName.trim() || isSaving} onClick={() => void createTemplate()} aria-label="Create template"><PlusIcon className="h-4 w-4" /></Button></div>
          <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
            {templates.map(template => <button key={template.id} type="button" onClick={() => setSelectedTemplateId(template.id)} className={cn('w-full py-4 text-left text-sm font-semibold transition-colors', selectedTemplateId === template.id ? 'text-[#316be8] dark:text-blue-300' : 'text-slate-600 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white')}>{String(template.name || 'Untitled template')}<span className="mt-1 block text-xs font-normal text-slate-400">{tasks.filter(task => value(task, 'templateId', 'template_id') === template.id).length} steps</span></button>)}
            {!templates.length && !isLoading && <p className="py-5 text-sm text-slate-500">Create a template to begin.</p>}
          </div>
        </aside>

        <section className="py-7 lg:pl-10">
          <div className="border-b border-slate-200 pb-7 dark:border-zinc-800">
            <div className="flex items-center gap-3"><ClipboardDocumentCheckIcon className="h-6 w-6 text-[#4f83d1]" /><div><h2 className="text-lg font-bold">Add a checklist step</h2><p className="text-xs text-slate-500">Keep each step specific and assign one clear owner.</p></div></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="grid gap-2 sm:col-span-2"><Label htmlFor="task-title">Step title</Label><Input id="task-title" value={taskForm.title} onChange={event => setTaskForm(current => ({ ...current, title: event.target.value }))} placeholder="Complete emergency contact information" /></div><div className="grid gap-2 sm:col-span-2"><Label htmlFor="task-description">Description</Label><Textarea id="task-description" value={taskForm.description} onChange={event => setTaskForm(current => ({ ...current, description: event.target.value }))} placeholder="Explain what is needed and where to complete it." /></div><div className="grid gap-2"><Label htmlFor="task-owner">Owner</Label><select id="task-owner" value={taskForm.ownerRole} onChange={event => setTaskForm(current => ({ ...current, ownerRole: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="employee">Employee</option><option value="manager">Manager</option><option value="hr">HR</option><option value="it">IT</option></select></div><div className="grid gap-2"><Label htmlFor="task-day">Due day</Label><Input id="task-day" type="number" min="0" value={taskForm.dueDay} onChange={event => setTaskForm(current => ({ ...current, dueDay: event.target.value }))} /></div></div>
            <Button type="button" className="mt-5 bg-[#316be8] hover:bg-[#285dce]" disabled={!selectedTemplateId || !taskForm.title.trim() || isSaving} onClick={() => void createTask()}><PlusIcon className="mr-2 h-4 w-4" />Add checklist step</Button>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-zinc-800">
            {visibleTasks.map((task, index) => <article key={task.id} className="grid gap-3 py-5 sm:grid-cols-[32px_minmax(0,1fr)_100px_80px_40px] sm:items-center"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#eaf1fb] text-[10px] font-bold text-[#4f83d1] dark:bg-blue-950/60">{index + 1}</span><div><h3 className="text-sm font-semibold">{String(task.title || 'Checklist step')}</h3><p className="mt-1 text-xs text-slate-500">{String(task.description || 'No description')}</p></div><span className="text-xs capitalize text-slate-500">{String(value(task, 'ownerRole', 'owner_role') || 'employee')}</span><span className="text-xs text-slate-500">Day {String(value(task, 'dueDay', 'due_day') ?? 0)}</span><Button type="button" size="icon" variant="ghost" disabled={isSaving} onClick={() => void removeTask(task.id)} aria-label={`Remove ${String(task.title || 'checklist step')}`} className="text-rose-600"><TrashIcon className="h-4 w-4" /></Button></article>)}
            {!visibleTasks.length && !isLoading && <div className="py-12"><h3 className="text-base font-semibold">No checklist steps yet</h3><p className="mt-1 text-sm text-slate-500">Add the first practical step for this onboarding template.</p></div>}
          </div>
        </section>
      </div>
    </main>
  );
}
