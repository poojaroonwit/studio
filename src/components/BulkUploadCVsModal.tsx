"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileViewerModal } from "@/components/ui/file-viewer-modal";
import { useBulkUploadCvsModal } from './use-bulk-upload-cvs-modal';
import {
  BulkUploadMainContent,
  BulkUploadSelectionFields,
} from './BulkUploadCVsModalForm';
import {
  BulkUploadAccessDeniedDialog,
  BulkUploadFooter,
  BulkUploadProgress,
} from './BulkUploadCVsModalParts';
import {
  getBulkUploadLayoutClasses,
  shouldShowBulkUploadProgress,
} from './bulk-upload-cvs-utils';

interface BulkUploadCVsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void;
}

function BulkUploadCVsModal({ isOpen, onOpenChange, onUploadSuccess }: BulkUploadCVsModalProps) {
  const {
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
  } = useBulkUploadCvsModal({
    isOpen,
    onOpenChange,
    onUploadSuccess,
  });

  // Early return check - must happen after all hooks
  if (!canBulkUpload) {
    return (
      <BulkUploadAccessDeniedDialog
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      />
    );
  }

  const totalFiles = selectedFiles.length;
  const layoutClasses = getBulkUploadLayoutClasses(totalFiles);
  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent 
        ref={modalContentRef}
        className="max-w-4xl w-full" 
        dialogId="bulk-upload-cvs-modal"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Process Queue</DialogTitle>
          <DialogDescription>
            Upload multiple PDF resumes and (optionally) assign them to a position.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 p-4 pb-6">
          <BulkUploadSelectionFields
            availableSources={availableSources}
            selectedPositionIds={selectedPositionIds}
            selectedSourceId={selectedSourceId}
            subSource={subSource}
            uploading={uploading}
            onPositionChange={handlePositionChange}
            onSourceChange={setSelectedSourceId}
            onSubSourceChange={setSubSource}
          />

          <BulkUploadMainContent
            dragActive={dragActive}
            fileBatchMap={fileBatchMap}
            layoutClasses={layoutClasses}
            previewUrl={previewUrl}
            selectedFileIndex={selectedFileIndex}
            selectedFiles={selectedFiles}
            onDragActiveChange={handleDragActiveChange}
            onFiles={handleFiles}
            onRemoveFile={removeFile}
            onSelectedFileIndexChange={setSelectedFileIndex}
            onViewerFileChange={setFileViewerFile}
            onViewerOpenChange={setFileViewerOpen}
          />
        </div>
        
        {/* Upload Progress Indicator */}
        {shouldShowBulkUploadProgress(uploading) && (
          <BulkUploadProgress
            totalFiles={totalFiles}
            uploadProgress={uploadProgress}
          />
        )}
        
        <BulkUploadFooter
          totalFiles={totalFiles}
          uploading={uploading}
          onCancelUpload={cancelUpload}
          onConfirmUpload={handleConfirmUpload}
        />
        <FileViewerModal
          isOpen={fileViewerOpen}
          onOpenChange={setFileViewerOpen}
          file={fileViewerFile}
        />
      </DialogContent>
    </Dialog>
  );
}

export default BulkUploadCVsModal; 
