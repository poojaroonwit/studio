import type { BulkUploadModalFormState, BulkUploadViewerFile } from "./bulk-upload-cvs-types";

export const BULK_CV_MAX_FILE_SIZE = 500 * 1024 * 1024;

export function validateBulkCvFiles(files: File[], maxFileSize = BULK_CV_MAX_FILE_SIZE) {
  const validFiles: File[] = [];
  const errors: string[] = [];

  files.forEach((file) => {
    if (file.type !== "application/pdf") {
      errors.push(`${file.name}: Invalid file type (PDF only)`);
      return;
    }

    if (file.size > maxFileSize) {
      errors.push(`${file.name}: File too large (max ${maxFileSize / (1024 * 1024)}MB)`);
      return;
    }

    validFiles.push(file);
  });

  return { validFiles, errors };
}

export function appendBulkCvFilesWithBatchIds({
  existingFiles,
  existingBatchMap,
  newFiles,
  createBatchId,
}: {
  existingFiles: File[];
  existingBatchMap: Record<string, string>;
  newFiles: File[];
  createBatchId: () => string;
}) {
  const nextBatchMap = { ...existingBatchMap };

  newFiles.forEach((file) => {
    if (!nextBatchMap[file.name]) {
      nextBatchMap[file.name] = createBatchId();
    }
  });

  return {
    files: [...existingFiles, ...newFiles],
    batchMap: nextBatchMap,
  };
}

export function resolveBulkUploadPositionSelection(ids: Set<string>) {
  const first = Array.from(ids)[0] || "";

  return {
    selectedPositionId: first,
    selectedPositionIds: first ? new Set([first]) : new Set<string>(),
  };
}

export function getInitialBulkUploadModalFormState(): BulkUploadModalFormState {
  return {
    selectedFiles: [],
    selectedPositionId: "",
    selectedPositionIds: new Set(),
    selectedSourceId: "",
    subSource: "",
    selectedFileIndex: 0,
    uploadProgress: null,
    uploading: false,
  };
}

export function getBulkUploadSelectedFileIndex(selectedFileIndex: number, totalFiles: number) {
  return Math.min(selectedFileIndex, Math.max(totalFiles - 1, 0));
}

export function getBulkUploadSourceAllowsSubSource<T extends { id: string; allowSubSource?: boolean }>(
  sources: T[],
  selectedSourceId: string,
) {
  return !!selectedSourceId && !!sources.find((source) => source.id === selectedSourceId)?.allowSubSource;
}

export function buildBulkUploadViewerFile(file: File, url: string): BulkUploadViewerFile {
  return {
    fileName: file.name,
    url,
    label: undefined,
    updatedAt: undefined,
    fileSize: file.size,
  };
}
