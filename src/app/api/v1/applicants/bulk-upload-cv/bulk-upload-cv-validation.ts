import { type NextRequest } from 'next/server';
import { validate as validateUuid } from 'uuid';
import { errorResponse } from './bulk-upload-cv-response';

export function validateBulkUploadCvFields(
  request: NextRequest,
  file: File,
  positionId: string,
  sourceId: string | null
) {
  if (!validateUuid(positionId)) {
    return errorResponse(request, `Invalid positionId format: "${positionId}". Must be a valid UUID.`, 400);
  }

  if (sourceId && !validateUuid(sourceId)) {
    return errorResponse(request, `Invalid sourceId format: "${sourceId}". Must be a valid UUID.`, 400);
  }

  if (file.type && file.type !== 'application/pdf') {
    return errorResponse(request, `Invalid file type: "${file.type}". Only PDF files are supported.`, 400);
  }

  return null;
}
