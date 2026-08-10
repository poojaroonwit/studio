"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, UploadCloud } from "lucide-react";

import {
  buildBulkUploadViewerFile,
  getBulkUploadFileBatchLabel,
  getBulkUploadFileListItemClassName,
  getBulkUploadProgressBarWidth,
  getBulkUploadProgressCountLabel,
  getBulkUploadProgressLabel,
  getBulkUploadSelectedFilesLabel,
  getBulkUploadSubmitButtonText,
  isBulkUploadSubmitDisabled,
} from "./bulk-upload-cvs-utils";
import type { BulkUploadViewerFile } from "./bulk-upload-cvs-utils";

interface BulkUploadAccessDeniedDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BulkUploadFileListProps {
  selectedFiles: File[];
  selectedFileIndex: number;
  fileBatchMap: Record<string, string>;
  previewUrl: string | null;
  onSelectedFileIndexChange: (index: number) => void;
  onViewerFileChange: (file: BulkUploadViewerFile) => void;
  onViewerOpenChange: (open: boolean) => void;
  onRemoveFile: (file: File) => void;
}

interface BulkUploadProgressProps {
  totalFiles: number;
  uploadProgress: { current: number; total: number } | null;
}

interface BulkUploadFooterProps {
  totalFiles: number;
  uploading: boolean;
  onCancelUpload: () => void;
  onConfirmUpload: (event: React.MouseEvent) => void;
}

export function BulkUploadAccessDeniedDialog({
  isOpen,
  onOpenChange,
}: BulkUploadAccessDeniedDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Access Denied</DialogTitle>
          <DialogDescription>
            You don&apos;t have permission to perform bulk uploads. Please contact your administrator.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BulkUploadFileList({
  selectedFiles,
  selectedFileIndex,
  fileBatchMap,
  previewUrl,
  onSelectedFileIndexChange,
  onViewerFileChange,
  onViewerOpenChange,
  onRemoveFile,
}: BulkUploadFileListProps) {
  return (
    <aside className="border-t bg-muted/20 p-4 lg:border-l lg:border-t-0">
      <Label>{getBulkUploadSelectedFilesLabel(selectedFiles.length)}</Label>
      <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {selectedFiles.map((file, index) => (
          <div
            key={index}
            className={getBulkUploadFileListItemClassName(index === selectedFileIndex)}
            onClick={() => {
              onSelectedFileIndexChange(index);
              onViewerFileChange(buildBulkUploadViewerFile(file, previewUrl || URL.createObjectURL(file)));
              onViewerOpenChange(true);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.currentTarget.click();
              }
            }}
          >
            <div className="flex-1 min-w-0">
              <span className="truncate block text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {getBulkUploadFileBatchLabel(fileBatchMap[file.name])}
              </span>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                onRemoveFile(file);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function BulkUploadProgress({
  totalFiles,
  uploadProgress,
}: BulkUploadProgressProps) {
  return (
    <div className="px-4 py-3 bg-muted/20 rounded-lg border">
      <div className="flex items-center justify-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm font-medium">
          {getBulkUploadProgressLabel(totalFiles)}
          {uploadProgress && (
            <span className="text-xs text-muted-foreground ml-2">
              {getBulkUploadProgressCountLabel(uploadProgress)}
            </span>
          )}
        </span>
      </div>
      {uploadProgress && (
        <div className="mt-2 w-full bg-background rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: getBulkUploadProgressBarWidth(uploadProgress) }}
          />
        </div>
      )}
    </div>
  );
}

export function BulkUploadFooter({
  totalFiles,
  uploading,
  onCancelUpload,
  onConfirmUpload,
}: BulkUploadFooterProps) {
  return (
    <DialogFooter>
      {uploading ? (
        <Button type="button" variant="outline" onClick={onCancelUpload}>
          Cancel Upload
        </Button>
      ) : (
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={uploading}>
            Cancel
          </Button>
        </DialogClose>
      )}
      <Button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onConfirmUpload(event);
        }}
        disabled={isBulkUploadSubmitDisabled(totalFiles, uploading)}
      >
        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
        {getBulkUploadSubmitButtonText(uploading, totalFiles)}
      </Button>
    </DialogFooter>
  );
}
