import { buildPositionsTemplateCsvContent } from '@/components/positions/import-positions-modal-utils';
import { getJsonArray, getJsonNumber, getJsonObject, getJsonString, readJsonObject, type JsonObject } from '@/lib/response-json';
import { sanitizeUrl } from '@/lib/security';

export type DataOperationModelId = 'applicants' | 'positions' | 'system-transfer';
export type ExportFormat = 'excel' | 'csv' | 'zip';

export interface DataOperationModel {
  id: DataOperationModelId;
  name: string;
  description: string;
  accept: string;
  importTypesLabel: string;
  exportFormatsLabel: string;
  uploadHelp: string;
  templateHelp: string;
  importBehavior: string;
  reviewHelp: string;
}

export interface ImportResult {
  jobId: string;
  status: 'pending';
  summary: string;
}

export const DATA_OPERATION_MODELS: DataOperationModel[] = [
  {
    id: 'applicants', name: 'Applicants', description: 'Candidate profiles, recruiting stages, sources, and matching information.', accept: '.xlsx,.csv', importTypesLabel: 'Excel or CSV', exportFormatsLabel: 'Excel or CSV', uploadHelp: 'XLSX or CSV · admin-configured size limit', templateHelp: 'Excel workbook with field instructions', importBehavior: 'Create new records; update rows that include an existing ID', reviewHelp: 'Rows with a blank ID create applicants. Rows with an existing applicant ID update that record.',
  },
  {
    id: 'positions', name: 'Job openings', description: 'Position titles, departments, descriptions, levels, and open status.', accept: '.csv,text/csv', importTypesLabel: 'CSV', exportFormatsLabel: 'Excel', uploadHelp: 'UTF-8 CSV · admin-configured size limit · up to 1,000 rows', templateHelp: 'UTF-8 CSV with supported headers and examples', importBehavior: 'Create new records; duplicate title and department pairs are skipped', reviewHelp: 'Existing title and department pairs are skipped. New positions are created in batches.',
  },
  {
    id: 'system-transfer', name: 'System data transfer', description: 'Permission-controlled business data package for migration between compatible HRI systems.', accept: '.zip,application/zip', importTypesLabel: 'ZIP package', exportFormatsLabel: 'ZIP', uploadHelp: 'ZIP · admin-configured size limit', templateHelp: 'Create a compatible package from the export tab first', importBehavior: 'Validate the package, then merge records by primary key in one transaction', reviewHelp: 'Credentials, sessions, API keys, audit internals, logs, notifications, and queue payloads are never imported.',
  },
];

const ABSOLUTE_MAX_IMPORT_SIZE = 100 * 1024 * 1024;

export function getImportFileError(model: DataOperationModelId, file: File | null) {
  if (!file) return null;
  if (file.size > ABSOLUTE_MAX_IMPORT_SIZE) return 'File too large. The platform cannot accept files larger than 100 MB.';
  if (model === 'system-transfer') return file.name.toLowerCase().endsWith('.zip') ? null : 'Please select an HRI system data ZIP package.';
  if (model === 'positions') return file.name.toLowerCase().endsWith('.csv') ? null : 'Please select a CSV file (.csv). Only CSV files are supported.';
  if (!/\.(xlsx|csv)$/i.test(file.name)) return 'Choose an Excel (.xlsx) or CSV file.';
  return null;
}

export async function downloadImportTemplate(model: DataOperationModelId) {
  if (model === 'system-transfer') throw new Error('Export system data first to create a compatible package.');
  if (model === 'positions') {
    downloadBlob(new Blob([buildPositionsTemplateCsvContent()], { type: 'text/csv;charset=utf-8' }), 'positions_import_template.csv');
    return;
  }
  const response = await fetch('/api/applicants/import');
  if (!response.ok) throw new Error(await readResponseError(response, 'Could not download the applicant template.'));
  downloadBlob(await response.blob(), getResponseFilename(response, 'applicants_import_template.xlsx'));
}

export async function importData(model: DataOperationModelId, file: File): Promise<ImportResult> {
  const validationError = getImportFileError(model, file);
  if (validationError) throw new Error(validationError);
  const body = new FormData();
  body.append('file', file);
  body.append('operation', 'import');
  body.append('entityType', model);
  const response = await fetch('/api/data-operations/jobs', { method: 'POST', body });
  const data = await readJsonObject(response);
  if (!response.ok) throw new Error(formatImportError(data, response.status));
  const jobId = getJsonString(data, 'jobId');
  if (!jobId) throw new Error('The server queued the import without returning a job ID.');
  const label = DATA_OPERATION_MODELS.find((item) => item.id === model)?.name ?? model;
  const validation = getJsonObject(data, 'validation');
  const modelCount = validation ? getJsonNumber(validation, 'modelCount') : undefined;
  const rowCount = validation ? getJsonNumber(validation, 'rowCount') : undefined;
  const validationSummary = modelCount !== undefined && rowCount !== undefined ? ` Validated ${rowCount.toLocaleString()} rows across ${modelCount} models.` : '';
  return { jobId, status: 'pending', summary: `${label} import added to the queue.${validationSummary}` };
}

export async function exportData(model: DataOperationModelId, format: ExportFormat, filters: Record<string, string>) {
  const body = new FormData();
  body.append('operation', 'export');
  body.append('entityType', model);
  body.append('format', model === 'positions' ? 'excel' : model === 'system-transfer' ? 'zip' : format);
  const parameters: Record<string, unknown> = { ...filters };
  if (model === 'system-transfer') parameters.domains = (filters.transferDomains || '').split(',').filter(Boolean);
  body.append('parameters', JSON.stringify(parameters));
  const response = await fetch('/api/data-operations/jobs', { method: 'POST', body });
  const data = await readJsonObject(response);
  if (!response.ok) throw new Error(getJsonString(data, 'error') || `Could not queue ${model} export.`);
  const jobId = getJsonString(data, 'jobId');
  if (!jobId) throw new Error('The server queued the export without returning a job ID.');
  return { jobId, status: 'pending' as const };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const safeUrl = sanitizeUrl(url);
  try {
    if (!safeUrl) throw new Error('Could not create a safe download URL.');
    const anchor = document.createElement('a');
    anchor.href = safeUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function getResponseFilename(response: Response, fallback: string) {
  const disposition = response.headers.get('content-disposition') ?? '';
  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const value = utf8 ? decodeURIComponent(utf8) : plain;
  return value?.replace(/[\\/:*?"<>|]/g, '_') || fallback;
}

async function readResponseError(response: Response, fallback: string) {
  const data = await readJsonObject(response);
  return getJsonString(data, 'error') || getJsonString(data, 'message') || fallback;
}

function formatImportError(data: JsonObject, status: number) {
  const details = getJsonArray(data, 'details');
  if (details?.length) {
    const first = details[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const row = getJsonNumber(first as JsonObject, 'row');
      return `${getJsonString(data, 'error') || 'Validation failed'}${row ? ` at row ${row}` : ''}. Review the template and try again.`;
    }
  }
  return getJsonString(data, 'error') || getJsonString(data, 'message') || `Import failed (HTTP ${status}).`;
}
