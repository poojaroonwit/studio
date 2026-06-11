import type { ApplicantSource } from '@/lib/types';
import { readJsonOrFallback } from '../lib/response-json';
import { summarizeBulkUploadResponse } from './bulk-upload-cvs-utils';
import {
  buildBulkCvUploadFormData,
  createBulkUploadAbortController,
  normalizeBulkUploadCaughtError,
  readBulkUploadError,
} from './bulk-upload-cvs-api-utils';

interface UploadBulkCvFilesOptions {
  files: File[];
  batchId: string;
  positionId?: string;
  sourceId?: string;
  subSource?: string;
  timeoutMs?: number;
}

export async function fetchBulkUploadSources(): Promise<ApplicantSource[]> {
  const response = await fetch('/api/settings/Applicant-sources', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Applicant sources');
  }

  return readJsonOrFallback<ApplicantSource[]>(response, []);
}

export async function uploadBulkCvFiles({
  files,
  batchId,
  positionId,
  sourceId,
  subSource,
  timeoutMs = 5000,
}: UploadBulkCvFilesOptions) {
  const formData = buildBulkCvUploadFormData({
    batchId,
    files,
    positionId,
    sourceId,
    subSource,
  });
  const { controller, timeoutId } = createBulkUploadAbortController(timeoutMs);

  try {
    const response = await fetch('/api/upload-queue/upload-file', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await readBulkUploadError(response));
    }

    return summarizeBulkUploadResponse(await readJsonOrFallback<unknown>(response, {}));
  } catch (error) {
    throw normalizeBulkUploadCaughtError(error);
  } finally {
    clearTimeout(timeoutId);
  }
}
