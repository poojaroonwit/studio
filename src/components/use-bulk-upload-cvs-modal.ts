import { useCallback, useMemo, useRef, useState, type MouseEvent } from "react";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";

import { useToast } from "@/hooks/use-toast";
import { hasAnyPermission } from "@/lib/permissions";

import { uploadBulkCvFiles } from "./bulk-upload-cvs-api";
import {
  getBulkUploadErrorToast,
  getBulkUploadSuccessToast,
  getInitialBulkUploadModalFormState,
  resolveBulkUploadPositionSelection,
  type BulkUploadViewerFile,
} from "./bulk-upload-cvs-utils";
import { useBulkUploadFileSelection } from "./use-bulk-upload-file-selection";
import { useBulkUploadModalGuards } from "./use-bulk-upload-modal-guards";
import { useBulkUploadPreviewUrl } from "./use-bulk-upload-preview-url";
import { useBulkUploadSources } from "./use-bulk-upload-sources";

interface UseBulkUploadCvsModalInput {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void;
}

export function useBulkUploadCvsModal({
  isOpen,
  onOpenChange,
  onUploadSuccess,
}: UseBulkUploadCvsModalInput) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const [selectedPositionIds, setSelectedPositionIds] = useState<Set<string>>(new Set());
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [subSource, setSubSource] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const { data: session } = useSession();
  const [fileBatchMap, setFileBatchMap] = useState<Record<string, string>>({});
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const { successWithDescription, errorWithDescription } = useToast();
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [fileViewerFile, setFileViewerFile] = useState<BulkUploadViewerFile | null>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const availableSources = useBulkUploadSources(isOpen);
  const previewUrl = useBulkUploadPreviewUrl({
    selectedFileIndex,
    selectedFiles,
    setSelectedFileIndex,
  });
  useBulkUploadModalGuards(isOpen);
  const { handleFiles, removeFile } = useBulkUploadFileSelection({
    fileBatchMap,
    setFileBatchMap,
    setSelectedFiles,
  });

  const canBulkUpload = useMemo(() => {
    return hasAnyPermission(session?.user, ["BULK_UPLOAD_EXECUTE"]);
  }, [session?.user]);

  const handleDragActiveChange = useCallback((active: boolean) => {
    setDragActive(active);
  }, []);

  const handlePositionChange = useCallback((ids: Set<string>) => {
    const selection = resolveBulkUploadPositionSelection(ids);
    setSelectedPositionIds(selection.selectedPositionIds);
    setSelectedPositionId(selection.selectedPositionId);
  }, []);

  const resetUploadFormState = useCallback(() => {
    const state = getInitialBulkUploadModalFormState();
    setSelectedFiles(state.selectedFiles);
    setSelectedPositionId(state.selectedPositionId);
    setSelectedPositionIds(state.selectedPositionIds);
    setSelectedSourceId(state.selectedSourceId);
    setSubSource(state.subSource);
    setSelectedFileIndex(state.selectedFileIndex);
    setUploadProgress(state.uploadProgress);
    setUploading(state.uploading);
  }, []);

  const handleModalClose = useCallback((open: boolean) => {
    onOpenChange(open);
    if (!open) {
      resetUploadFormState();

      setTimeout(() => {
        try {
          const { cleanupAllModals } = require("@/lib/modal-cleanup");
          cleanupAllModals();
        } catch (error) {
          console.error("Error during modal cleanup:", error);
        }
      }, 100);
    }
  }, [onOpenChange, resetUploadFormState]);

  const handleConfirmUpload = useCallback(async (event?: MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();

    if (selectedFiles.length === 0) {
      errorWithDescription("No files selected", "Please select at least one PDF file to upload.");
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    try {
      const batchId = uuidv4();
      const { success, successful, failed, errors } = await uploadBulkCvFiles({
        files: selectedFiles,
        batchId,
        positionId: selectedPositionId,
        sourceId: selectedSourceId,
        subSource,
      });

      if (success) {
        const successToast = getBulkUploadSuccessToast({ successful, failed, errors });
        successWithDescription(successToast.title, successToast.description);

        resetUploadFormState();
        onOpenChange(false);

        onUploadSuccess?.();
        window.dispatchEvent(new CustomEvent("refreshApplicantQueue"));
      }
    } catch (error) {
      console.error("Upload error:", error);
      const errorToast = getBulkUploadErrorToast(error);
      errorWithDescription(errorToast.title, errorToast.description || "Please try again");
      setUploadProgress(null);
    } finally {
      setUploading(false);
    }
  }, [
    selectedFiles,
    selectedPositionId,
    selectedSourceId,
    subSource,
    onOpenChange,
    successWithDescription,
    errorWithDescription,
    onUploadSuccess,
    resetUploadFormState,
  ]);

  const cancelUpload = useCallback(() => {
    setUploading(false);
    setUploadProgress(null);
  }, []);

  return {
    availableSources,
    canBulkUpload,
    dragActive,
    fileBatchMap,
    fileViewerFile,
    fileViewerOpen,
    handleConfirmUpload,
    handleDragActiveChange,
    handleFiles,
    handleModalClose,
    handlePositionChange,
    modalContentRef,
    previewUrl,
    removeFile,
    selectedFileIndex,
    selectedFiles,
    selectedPositionIds,
    selectedSourceId,
    setFileViewerFile,
    setFileViewerOpen,
    setSelectedFileIndex,
    setSelectedSourceId,
    setSubSource,
    subSource,
    uploadProgress,
    uploading,
    cancelUpload,
  };
}
