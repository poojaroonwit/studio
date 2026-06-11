export const MAX_FILE_SIZE = 500 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = ['application/pdf'];
export const MAX_FILES_PER_REQUEST = 200;

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export interface UploadResult {
  file_name: string;
  status: 'success' | 'failed';
  file_path?: string;
  file_size?: number;
  error?: string;
  queue_id?: string;
}

export interface UploadOptions {
  position_id?: string;
  batch_id?: string;
  source?: string;
  source_id?: string;
  sub_source?: string;
  webhook_payload?: unknown;
  created_by: string;
}
