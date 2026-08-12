'use client';

import * as React from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpFromLine,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Clock3,
  Database,
  FileSpreadsheet,
  History,
  Loader2,
  RotateCcw,
  Search,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

import ApplicantImportUploadQueue from '@/components/applicants/ApplicantImportUploadQueue';
import ProcessQueueAnalytics from '@/components/applicants/ProcessQueueAnalytics';
import { DataOperationQueue } from './DataOperationQueue';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  DATA_OPERATION_MODELS,
  DATA_TRANSFER_DOMAIN_OPTIONS,
  downloadImportTemplate,
  exportData,
  getImportFileError,
  getSystemTransferDomainLabel,
  importData,
  type DataTransferDomain,
  type DataOperationModel,
  type DataOperationModelId,
  type ExportFormat,
  type ImportResult,
} from './data-operations-api';

type WorkspaceTab = 'import' | 'export' | 'activity';
type ActivityView = 'data' | 'cv' | 'analytics';

interface ApplicantExportFilters {
  name: string;
  email: string;
  applicationDateStart: string;
  applicationDateEnd: string;
  minAppliedJobFitScore: string;
  transferDomains: string;
}

const EMPTY_FILTERS: ApplicantExportFilters = {
  name: '',
  email: '',
  applicationDateStart: '',
  applicationDateEnd: '',
  minAppliedJobFitScore: '',
  transferDomains: DATA_TRANSFER_DOMAIN_OPTIONS.map((item) => item.id).join(','),
};

const ALL_TRANSFER_DOMAIN_IDS = DATA_TRANSFER_DOMAIN_OPTIONS.map((item) => item.id);

function isSystemTransferModel(value: DataOperationModelId) {
  return value === 'system-transfer' || value.startsWith('system-transfer:');
}

function getTransferDomainCount(filters: ApplicantExportFilters) {
  return filters.transferDomains.split(',').filter(Boolean).length;
}

function getApplicantFilterCount(filters: ApplicantExportFilters) {
  return Object.entries(filters).filter(([key, value]) => key !== 'transferDomains' && Boolean(value)).length;
}

function getRecordsLabel(model: DataOperationModel, filters: ApplicantExportFilters) {
  const activeFilterCount = getApplicantFilterCount(filters);
  if (model.systemTransferDomain) {
    return getSystemTransferDomainLabel(model.systemTransferDomain);
  }

  if (model.id === 'applicants') {
    return activeFilterCount ? `${activeFilterCount} filters applied` : 'All applicants';
  }

  if (model.id === 'positions') {
    return 'All positions';
  }

  if (model.id === 'system-transfer') {
    const domainCount = getTransferDomainCount(filters);
    return `${domainCount} business domains`;
  }

  return 'None';
}

export function DataOperationsWorkspace() {
  const searchParams = useSearchParams();
  const requestedTab = (() => {
    const requestedMode = searchParams.get('mode');
    return requestedMode === 'import' || requestedMode === 'export' || requestedMode === 'activity'
      ? requestedMode
      : null;
  })();

  const [tab, setTab] = React.useState<WorkspaceTab>(requestedTab ?? 'import');
  const [step, setStep] = React.useState(1);
  const [modelId, setModelId] = React.useState<DataOperationModelId>('applicants');
  const [file, setFile] = React.useState<File | null>(null);
  const [format, setFormat] = React.useState<ExportFormat>('excel');
  const [filters, setFilters] = React.useState<ApplicantExportFilters>(EMPTY_FILTERS);
  const [isRunning, setIsRunning] = React.useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [activityView, setActivityView] = React.useState<ActivityView>('data');
  const model = DATA_OPERATION_MODELS.find((item) => item.id === modelId) ?? DATA_OPERATION_MODELS[0];

  const resetFlow = React.useCallback((nextTab: WorkspaceTab) => {
    setTab(nextTab);
    setStep(1);
    setFile(null);
    setResult(null);
    setFormat('excel');
    setFilters(EMPTY_FILTERS);
  }, [tab]);

  const selectTab = (nextTab: WorkspaceTab) => {
    if (nextTab === 'activity') {
      setTab(nextTab);
      return;
    }
    resetFlow(nextTab);
  };

  const selectModel = (id: DataOperationModelId) => {
    const nextModel = DATA_OPERATION_MODELS.find((item) => item.id === id);
    setModelId(id);
    setFile(null);
    setResult(null);
    setFormat(isSystemTransferModel(id) ? 'jsonl' : id === 'positions' ? 'excel' : 'excel');
    setFilters({
      ...EMPTY_FILTERS,
      transferDomains: nextModel?.systemTransferDomain || EMPTY_FILTERS.transferDomains,
    });
  };

  React.useEffect(() => {
    if (!requestedTab) return;
    resetFlow(requestedTab);
  }, [requestedTab, resetFlow]);

  const handleTemplateDownload = async () => {
    setIsDownloadingTemplate(true);
    try {
      await downloadImportTemplate(modelId);
      toast.success(`${model.name} template downloaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not download the template');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFile = (nextFile: File | null) => {
    const error = getImportFileError(modelId, nextFile);
    if (error) {
      setFile(null);
      toast.error(error);
      return;
    }
    setFile(nextFile);
    setResult(null);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      if (tab === 'import') {
        if (!file) throw new Error('Choose a file before starting the import.');
        const importResult = await importData(modelId, file);
        setResult(importResult);
        toast.success(importResult.summary);
      } else {
        const queued = await exportData(modelId, format, { ...filters });
        setResult({ ...queued, summary: `${model.name} export added to the queue.` });
        toast.success(`${model.name} export added to the queue`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${tab === 'import' ? 'Import' : 'Export'} failed`);
    } finally {
      setIsRunning(false);
    }
  };

  const hasTransferDomains = !isSystemTransferModel(modelId) || getTransferDomainCount(filters) > 0;
  const canContinue = step === 1 || (tab === 'export' ? hasTransferDomains : Boolean(file));

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,hsl(var(--muted)/.35),transparent_22rem)]">
      <header className="border-b bg-background/95 px-4 pt-5 sm:px-6 lg:px-8">
        <div className="w-full">
          <div className="pb-5">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <Database className="h-3.5 w-3.5" /> Data operations
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Import &amp; Export</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Move platform data with a guided, review-before-run workflow.</p>
          </div>
          <nav className="flex gap-6 overflow-x-auto" aria-label="Data operations">
            {(
            [
              ['import', 'Import data', ArrowUpFromLine],
              ['export', 'Export data', ArrowDownToLine],
              ['activity', 'Queue activity', History],
            ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => selectTab(id)}
                className={cn(
                  'relative flex h-11 shrink-0 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  tab === id && 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary',
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
        {tab === 'activity' ? (
          <ActivityPanel view={activityView} onViewChange={setActivityView} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              <StepRail current={step} mode={tab} />
              <div className="mt-5 overflow-hidden rounded-xl border bg-background">
                {step === 1 && <ChooseDataStep selected={modelId} onSelect={selectModel} />}
                {step === 2 && tab === 'import' && (
                  <ImportConfigureStep
                    model={model}
                    file={file}
                    isDownloading={isDownloadingTemplate}
                    onDownload={handleTemplateDownload}
                    onFile={handleFile}
                  />
                )}
                {step === 2 && tab === 'export' && (
                  <ExportConfigureStep model={model} format={format} filters={filters} onFormat={setFormat} onFilters={setFilters} />
                )}
                {step === 3 && (
                  <ReviewStep mode={tab} model={model} file={file} format={format} filters={filters} result={result} />
                )}
                <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-5 py-4">
                  <Button
                    variant="ghost"
                    onClick={() => (step === 1 ? resetFlow(tab) : setStep((value) => value - 1))}
                    disabled={isRunning || step === 1}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  {step < 3 ? (
                    <Button onClick={() => setStep((value) => value + 1)} disabled={!canContinue}>
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : result ? (
                    <Button variant="outline" onClick={() => resetFlow(tab)}>
                      <RotateCcw className="mr-2 h-4 w-4" /> Start another
                    </Button>
                  ) : (
                    <Button
                      onClick={handleRun}
                      disabled={isRunning || (tab === 'import' && !file) || (tab === 'export' && !hasTransferDomains)}
                    >
                      {isRunning ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : tab === 'import' ? (
                        <UploadCloud className="mr-2 h-4 w-4" />
                      ) : (
                        <ArrowDownToLine className="mr-2 h-4 w-4" />
                      )}
                      {isRunning ? 'Adding to queue…' : tab === 'import' ? `Queue ${model.name} import` : `Queue ${model.name} export`}
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <FlowSummary mode={tab} step={step} model={model} file={file} format={format} filters={filters} />
          </div>
        )}
      </main>
    </div>
  );
}

function StepRail({ current, mode }: { current: number; mode: 'import' | 'export' }) {
  const labels = ['Choose data', mode === 'import' ? 'Upload file' : 'Configure export', 'Review & run'];
  return (
    <ol className="grid grid-cols-3" aria-label={`${mode} progress`}>
      {labels.map((label, index) => {
        const number = index + 1;
        const complete = number < current;
        const active = number === current;
        return (
          <li
            key={label}
            className="relative flex items-center gap-2 after:absolute after:left-[calc(50%+1.25rem)] after:right-[calc(-50%+1.25rem)] after:top-4 after:h-px after:bg-border last:after:hidden"
          >
            <span
              className={cn(
                'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-background text-xs font-semibold text-muted-foreground',
                active && 'border-primary bg-primary text-primary-foreground',
                complete && 'border-primary bg-primary/10 text-primary',
              )}
            >
              {complete ? <Check className="h-4 w-4" /> : number}
            </span>
            <span className={cn('hidden text-sm font-medium sm:block', !active && 'text-muted-foreground')}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ChooseDataStep({ selected, onSelect }: { selected: DataOperationModelId; onSelect: (id: DataOperationModelId) => void }) {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | null)?.role;
  const models = DATA_OPERATION_MODELS.filter((model) => model.id === 'applicants' || model.id === 'positions' || userRole === 'Admin');

  return (
    <StepContent eyebrow="Step 1" title="What data are you moving?" description="Only production-backed data types are shown here.">
      <div className="grid gap-3 sm:grid-cols-2">
        {models.map((model) => {
          const Icon = model.id === 'applicants' ? Users : model.id === 'positions' ? BriefcaseBusiness : Database;
          const active = selected === model.id;
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => onSelect(model.id)}
              aria-pressed={active}
              className={cn(
                'group flex min-h-36 flex-col items-start rounded-xl border p-5 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active && 'border-primary bg-primary/[.04] ring-1 ring-primary/20',
              )}
            >
              <span className={cn('grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground', active && 'bg-primary/10 text-primary')}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="mt-4 flex w-full items-center justify-between gap-3">
                <span className="font-semibold">{model.name}</span>
                {active && <CheckCircle2 className="h-5 w-5 text-primary" />}
              </span>
              <span className="mt-1 text-sm leading-5 text-muted-foreground">{model.description}</span>
              <span className="mt-3 text-xs font-medium text-muted-foreground">
                Import {model.importTypesLabel} · Export {model.exportFormatsLabel}
              </span>
            </button>
          );
        })}
      </div>
    </StepContent>
  );
}

function ImportConfigureStep({ model, file, isDownloading, onDownload, onFile }: { model: DataOperationModel; file: File | null; isDownloading: boolean; onDownload: () => void; onFile: (file: File | null) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const isSystemTransferModel = model.id === 'system-transfer' || Boolean(model.systemTransferDomain);

  return (
    <StepContent
      eyebrow="Step 2"
      title={`Prepare your ${model.name.toLowerCase()} file`}
      description="Start from the template so headers and values match the importer."
    >
      <div className="flex flex-col justify-between gap-4 rounded-lg bg-muted/35 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
          <div>
            <p className="text-sm font-medium">{model.name} import template</p>
            <p className="text-xs text-muted-foreground">{model.templateHelp}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onDownload} disabled={isDownloading || isSystemTransferModel}>
          {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDownToLine className="mr-2 h-4 w-4" />}
          {isSystemTransferModel ? 'Export to create package' : 'Download template'}
        </Button>
      </div>
      <div className="mt-5">
        <Label>Completed file</Label>
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            event.preventDefault();
            if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            onFile(event.dataTransfer.files?.[0] ?? null);
          }}
          className={cn(
            'mt-2 flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/15 px-6 text-center transition-colors',
            dragging && 'border-primary bg-primary/[.04]',
            file && 'border-emerald-500/40 bg-emerald-500/[.04]',
          )}
        >
          <input ref={inputRef} type="file" accept={model.accept} className="sr-only" onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
          {file ? (
            <>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                <Check className="h-5 w-5" />
              </span>
              <p className="mt-3 max-w-full truncate text-sm font-medium">{file.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatBytes(file.size)} · ready to review</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => {
                  onFile(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
              >
                <X className="mr-2 h-3.5 w-3.5" /> Remove
              </Button>
            </>
          ) : (
            <>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
                <UploadCloud className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-medium">Drop your file here</p>
              <p className="mt-1 text-xs text-muted-foreground">{model.uploadHelp}</p>
              <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => inputRef.current?.click()}>
                Browse files
              </Button>
            </>
          )}
        </div>
      </div>
    </StepContent>
  );
}

function ExportConfigureStep({
  model,
  format,
  filters,
  onFormat,
  onFilters,
}: {
  model: DataOperationModel;
  format: ExportFormat;
  filters: ApplicantExportFilters;
  onFormat: (value: ExportFormat) => void;
  onFilters: (value: ApplicantExportFilters) => void;
}) {
  const isSystemTransferModel = model.id === 'system-transfer' || Boolean(model.systemTransferDomain);
  const update = (key: keyof ApplicantExportFilters, value: string) => onFilters({ ...filters, [key]: value });

  const description = model.id === 'applicants'
    ? 'Narrow the export when needed. Blank filters include every applicant you can access.'
    : model.id === 'positions'
      ? 'The positions exporter includes all position fields and records.'
      : model.systemTransferDomain
        ? 'This export is scoped to one data model domain so that migration packages stay lightweight.'
        : 'Choose the business domains to include in the validated JSONL transfer package.';

  return (
    <StepContent eyebrow="Step 2" title="Configure the export" description={description}>
      <div className="max-w-sm">
        <Label>File format</Label>
        <Select value={format} onValueChange={(value) => onFormat(value as ExportFormat)} disabled={model.id !== 'applicants'}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            {isSystemTransferModel ? <SelectItem value="jsonl">HRI transfer package (.jsonl)</SelectItem> : <SelectItem value="excel">Excel workbook (.xlsx)</SelectItem>}
            {model.id === 'applicants' && <SelectItem value="csv">CSV file (.csv)</SelectItem>}
          </SelectContent>
        </Select>
      </div>
      {model.id === 'applicants' ? (
        <div className="mt-6 border-t pt-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Optional filters</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">All filled filters are applied together.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onFilters(EMPTY_FILTERS)}>
              Clear
            </Button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Name contains"><Input value={filters.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Anan" /></Field>
            <Field label="Email contains"><Input type="email" value={filters.email} onChange={(event) => update('email', event.target.value)} placeholder="e.g. @company.com" /></Field>
            <Field label="Applied from"><Input type="date" value={filters.applicationDateStart} onChange={(event) => update('applicationDateStart', event.target.value)} /></Field>
            <Field label="Applied through">
              <Input type="date" value={filters.applicationDateEnd} min={filters.applicationDateStart || undefined} onChange={(event) => update('applicationDateEnd', event.target.value)} />
            </Field>
            <Field label="Minimum fit score">
              <Input type="number" min="0" max="100" value={filters.minAppliedJobFitScore} onChange={(event) => update('minAppliedJobFitScore', event.target.value)} placeholder="0–100" />
            </Field>
          </div>
        </div>
      ) : model.systemTransferDomain ? (
        <TransferDomainNotice domain={model.systemTransferDomain} />
      ) : (
        <TransferDomainSelector value={filters.transferDomains} onChange={(transferDomains) => onFilters({ ...filters, transferDomains })} />
      )}
    </StepContent>
  );
}

function ReviewStep({ mode, model, file, format, filters, result }: { mode: 'import' | 'export'; model: DataOperationModel; file: File | null; format: ExportFormat; filters: ApplicantExportFilters; result: ImportResult | null }) {
  if (result) {
    return (
      <StepContent
        eyebrow="Queued"
        title={`${mode === 'import' ? 'Import' : 'Export'} submitted`}
        description={result.summary}
      >
        <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-4">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium">Job #{result.jobId.slice(0, 8)}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              The operation will run when capacity is available. Open Data job queue to follow progress, see who requested it, review results, or download a completed export.
            </p>
          </div>
        </div>
      </StepContent>
    );
  }

  return (
    <StepContent eyebrow="Step 3" title={`Review your ${mode}`} description="Nothing runs until you confirm below.">
      <div className="divide-y rounded-lg border">
        <ReviewRow label="Data" value={model.name} />
        {mode === 'import' ? (
          <>
            <ReviewRow label="File" value={file?.name ?? 'No file selected'} />
            <ReviewRow label="File size" value={file ? formatBytes(file.size) : '—'} />
            <ReviewRow label="Behavior" value={model.importBehavior} />
          </>
        ) : (
          <>
            <ReviewRow label="Format" value={format === 'excel' ? 'Excel workbook (.xlsx)' : format === 'jsonl' ? 'HRI transfer package (.jsonl)' : 'CSV file (.csv)'} />
            <ReviewRow label="Records" value={getRecordsLabel(model, filters)} />
          </>
        )}
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-lg bg-primary/[.05] p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium">Ready to add to queue</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {mode === 'import' ? model.reviewHelp : 'The export will be generated asynchronously. Download it from the data job queue when it is ready.'}
          </p>
        </div>
      </div>
    </StepContent>
  );
}

function FlowSummary({ mode, step, model, file, format, filters }: { mode: 'import' | 'export'; step: number; model: DataOperationModel; file: File | null; format: ExportFormat; filters: ApplicantExportFilters }) {
  return (
    <aside className="h-fit rounded-xl border bg-background p-5 lg:sticky lg:top-4">
      <p className="text-sm font-semibold">Current operation</p>
      <div className="mt-4 space-y-3 text-sm">
        <ReviewRow compact label="Action" value={mode === 'import' ? 'Import' : 'Export'} />
        <ReviewRow compact label="Data" value={model.name} />
        <ReviewRow compact label="Progress" value={`Step ${step} of 3`} />
        {mode === 'import' ? (
          <ReviewRow compact label="File" value={file ? file.name : 'Not selected'} />
        ) : (
          <>
            <ReviewRow compact label="Format" value={format.toUpperCase()} />
            <ReviewRow compact label={model.systemTransferDomain || model.id === 'system-transfer' ? 'Selection' : 'Scope'} value={getRecordsLabel(model, filters)} />
          </>
        )}
      </div>
      <p className="mt-5 border-t pt-4 text-xs leading-5 text-muted-foreground">
        Confirming creates a queued job. Processing never runs inside the submission request, and every affected record is audit logged.
      </p>
    </aside>
  );
}

function TransferDomainNotice({ domain }: { domain: DataTransferDomain }) {
  return (
    <div className="mt-6 rounded-lg border bg-muted/25 p-4 text-sm">
      <h3 className="text-sm font-semibold">Transfer scope</h3>
      <p className="mt-1 text-xs text-muted-foreground">This export is scoped to {getSystemTransferDomainLabel(domain)}.</p>
    </div>
  );
}

function TransferDomainSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = new Set(value.split(',').filter(Boolean));
  const toggle = (domain: string) => {
    const next = new Set(selected);
    if (next.has(domain)) {
      next.delete(domain);
    } else {
      next.add(domain);
    }
    onChange(ALL_TRANSFER_DOMAIN_IDS.filter((id) => next.has(id)).join(','));
  };

  return (
    <div className="mt-6 border-t pt-5">
      <div>
        <h3 className="text-sm font-semibold">Business domains</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Sensitive authentication, security, audit, notification, and operational records are always excluded.
        </p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {DATA_TRANSFER_DOMAIN_OPTIONS.map((domain) => (
          <label key={domain.id} className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={selected.has(domain.id)}
              onChange={() => toggle(domain.id)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span>{domain.label}</span>
          </label>
        ))}
      </div>
      {selected.size === 0 && <p className="mt-2 text-xs font-medium text-destructive">Select at least one domain.</p>}
    </div>
  );
}

function ActivityPanel({ view, onViewChange }: { view: ActivityView; onViewChange: (view: ActivityView) => void }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant={view === 'data' ? 'secondary' : 'ghost'} size="sm" onClick={() => onViewChange('data')}>
          <Database className="mr-2 h-4 w-4" /> Data job queue
        </Button>
        <Button variant={view === 'cv' ? 'secondary' : 'ghost'} size="sm" onClick={() => onViewChange('cv')}>
          <History className="mr-2 h-4 w-4" /> CV processing
        </Button>
        <Button variant={view === 'analytics' ? 'secondary' : 'ghost'} size="sm" onClick={() => onViewChange('analytics')}>
          <Search className="mr-2 h-4 w-4" /> Analytics
        </Button>
      </div>
      {view === 'data' ? (
        <DataOperationQueue />
      ) : view === 'cv' ? (
        <ApplicantImportUploadQueue />
      ) : (
        <ErrorBoundary>
          <ProcessQueueAnalytics />
        </ErrorBoundary>
      )}
    </div>
  );
}

function StepContent({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="border-b px-5 py-5 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-start justify-between gap-4', compact ? 'border-b pb-3 last:border-0 last:pb-0' : 'px-4 py-3')}>
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[65%] truncate text-right font-medium" title={value}>
        {value}
      </span>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
