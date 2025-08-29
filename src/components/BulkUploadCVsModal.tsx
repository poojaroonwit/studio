"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import type { Position } from '@/lib/types';
import { useSession } from 'next-auth/react';
import { UploadCloud, Loader2, Trash2 } from "lucide-react";
import FileUploadArea from "@/components/ui/FileUploadArea";
import { toast } from "react-hot-toast";
import { PositionMultiSelectDropdown } from "@/components/candidates/PositionMultiSelectDropdown";
import { FileViewerModal } from "@/components/ui/file-viewer-modal";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

interface BulkUploadCVsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void;
}

function BulkUploadCVsModal({ isOpen, onOpenChange, onUploadSuccess }: BulkUploadCVsModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const [selectedPositionIds, setSelectedPositionIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const { data: session } = useSession();
  const [fileBatchMap, setFileBatchMap] = useState<{ [fileName: string]: string }>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const { successWithDescription, errorWithDescription, error: showError } = useToast();
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [fileViewerFile, setFileViewerFile] = useState<{
    fileName: string;
    url: string;
    label?: string;
    updatedAt?: string;
    fileSize?: number;
  } | null>(null);
  
  // Memoize the permission check to prevent unnecessary re-renders
  const canBulkUpload = useMemo(() => {
    return session?.user?.role === 'Admin' || 
      session?.user?.modulePermissions?.includes('BULK_UPLOAD_EXECUTE');
  }, [session?.user?.role, session?.user?.modulePermissions]);
  
  if (!canBulkUpload) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access Denied</DialogTitle>
            <DialogDescription>
              You don't have permission to perform bulk uploads. Please contact your administrator.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  useEffect(() => {
    if (selectedFiles.length > 0) {
      // Use the selected file index, defaulting to 0 if out of bounds
      const index = Math.min(selectedFileIndex, selectedFiles.length - 1);
      const url = URL.createObjectURL(selectedFiles[index]);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
      setSelectedFileIndex(0);
    }
  }, [selectedFiles, selectedFileIndex]);

  // Prevent page navigation when modal is open
  useEffect(() => {
    if (isOpen) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      
      const handlePopState = (e: PopStateEvent) => {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
      };

      // Prevent browser from opening files when dragged over the modal
      const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
      };

      const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('dragover', handleDragOver);
      window.addEventListener('drop', handleDrop);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('dragover', handleDragOver);
        window.removeEventListener('drop', handleDrop);
      };
    }
  }, [isOpen]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    Array.from(files).forEach((file) => {
      if (file.type !== "application/pdf") {
        errors.push(`${file.name}: Invalid file type (PDF only)`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max ${MAX_FILE_SIZE / (1024*1024)}MB)`);
        return;
      }
      validFiles.push(file);
    });
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
    }
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => {
        const newFiles = [...prev, ...validFiles];
        // Generate batch IDs for new files
        const newBatchMap = { ...fileBatchMap };
        validFiles.forEach(file => {
          if (!newBatchMap[file.name]) {
            newBatchMap[file.name] = uuidv4();
          }
        });
        setFileBatchMap(newBatchMap);
        return newFiles;
      });
    }
  }, [fileBatchMap]);

  const handleDragActiveChange = useCallback((active: boolean) => {
    setDragActive(active);
  }, []);

  const removeFile = useCallback((fileToRemove: File) => {
    setSelectedFiles(prev => prev.filter(file => file !== fileToRemove));
    setFileBatchMap(prev => {
      const newMap = { ...prev };
      delete newMap[fileToRemove.name];
      return newMap;
    });
  }, []);

  const handleFileIndexChange = useCallback((index: number) => {
    setSelectedFileIndex(index);
  }, []);

  // For single-select, enforce only one selected position
  const handlePositionChange = useCallback((ids: Set<string>) => {
    if (ids.size > 1) {
      // Only allow one selection
      const first = Array.from(ids)[0];
      setSelectedPositionIds(new Set([first]));
      setSelectedPositionId(first);
    } else if (ids.size === 1) {
      const first = Array.from(ids)[0];
      setSelectedPositionIds(new Set([first]));
      setSelectedPositionId(first);
    } else {
      setSelectedPositionIds(new Set());
      setSelectedPositionId("");
    }
  }, []);

  // Simple upload function - upload all files to MinIO and create DB records
  async function uploadFilesToMinIOAndQueue(files: File[], batchId: string) {
    try {
  
      
      // Create FormData with all files
      const formData = new FormData();
      
      files.forEach(file => {
        formData.append('files', file);
      });
      
      if (selectedPositionId) {
        formData.append('position_id', selectedPositionId);
      }
      formData.append('batch_id', batchId);
      formData.append('source', 'bulk');

      // Upload all files in one request
      const uploadRes = await fetch('/api/upload-queue/upload-file', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadRes.ok) {
        let errorMsg = 'Failed to upload files';
        try {
          const errorData = await uploadRes.json();
          errorMsg = errorData.error || errorMsg;
        } catch (parseErr) {
          console.error('Upload error (non-JSON):', uploadRes);
        }
        throw new Error(errorMsg);
      }
      
      const result = await uploadRes.json();
      
      return { 
        success: true,
        data: result,
        successful: result.summary?.success || 0,
        failed: result.summary?.failed || 0,
        errors: result.results?.filter((r: any) => r.status === 'failed')?.map((r: any) => `${r.file_name}: ${r.error}`) || []
      };
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    }
  }

  const handleRefreshClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent('refreshCandidateQueue'));
    onUploadSuccess?.();
  }, [onUploadSuccess]);

  const handleModalClose = useCallback((open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setSelectedFiles([]);
      setSelectedPositionId("");
      setSelectedPositionIds(new Set());
      setSelectedFileIndex(0);
      
      // Force cleanup of any remaining modal elements
      setTimeout(() => {
        const { cleanupAllModals } = require('@/lib/modal-cleanup');
        cleanupAllModals();
      }, 100);
    }
  }, [onOpenChange]);

  const handleConfirmUpload = useCallback(async (e?: React.MouseEvent) => {

    // Prevent any default form submission behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setUploading(true);
    try {
      if (selectedFiles.length === 0) return;
      
      // Simple upload - all files in one request
      const batchId = uuidv4();
      const { success, successful, failed, errors } = await uploadFilesToMinIOAndQueue(selectedFiles, batchId);
      
      if (success) {
        // Show success message
        if (failed === 0) {
          successWithDescription(
            `✅ Upload Complete: ${successful} files uploaded and queued for processing`, 
            "Files are now in the processing queue and will be processed automatically."
          );
        } else {
          successWithDescription(
            `⚠️ Upload Complete: ${successful} files uploaded, ${failed} files failed`, 
            "Some files were uploaded successfully. Check the queue for details."
          );
        }
        
        // Close modal and reset
        setSelectedFiles([]);
        setSelectedPositionId("");
        setSelectedPositionIds(new Set());
        onOpenChange(false);
        
        // Refresh queue display
        if (onUploadSuccess) onUploadSuccess();
        window.dispatchEvent(new CustomEvent('refreshCandidateQueue'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      errorWithDescription(
        'Upload failed', 
        error instanceof Error ? error.message : 'Please try again'
      );
    } finally {
      setUploading(false);
    }
  }, [selectedFiles, selectedPositionId, onOpenChange, successWithDescription, errorWithDescription, onUploadSuccess]);
  const totalFiles = selectedFiles.length;
  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent 
        className="max-w-4xl w-full !z-[99999]" 
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
          {/* Position Selection */}
          <div>
            <Label htmlFor="position-select">Assign to Position</Label>
            <div className="mt-2">
              <PositionMultiSelectDropdown
                selectedIds={selectedPositionIds}
                onSelectionChange={handlePositionChange}
                placeholder="Select a position..."
                disabled={uploading}
                showOpenStatus={true}
                filterOpenOnly={false}
                singleSelect={true}
              />
            </div>
          </div>
          
          {/* Main Content Area */}
          <div className={`grid gap-6 ${totalFiles > 0 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {/* Upload Area - Full width when no files, 2/3 width when files exist */}
            <div className={`${totalFiles > 0 ? 'lg:col-span-2' : 'col-span-1'}`}>
              <FileUploadArea
                key="bulk-upload-area"
                accept="application/pdf"
                multiple={true}
                maxFileSize={MAX_FILE_SIZE}
                onFilesChange={handleFiles}
                dragActive={dragActive}
                setDragActive={handleDragActiveChange}
              />
            </div>
            
            {/* File List - Only show when files are selected */}
            {totalFiles > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({totalFiles})</Label>
                <div className="max-h-[400px] overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/20">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between bg-background rounded px-3 py-2 border cursor-pointer transition-colors ${
                        idx === selectedFileIndex
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        setFileViewerFile({
                          fileName: file.name,
                          url: previewUrl || URL.createObjectURL(file),
                          label: undefined,
                          updatedAt: undefined,
                          fileSize: file.size
                        });
                        setFileViewerOpen(true);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="truncate block text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-muted-foreground">ID: {fileBatchMap[file.name]}</span>
                      </div>
                      <Button type="button" size="icon" variant="ghost" onClick={e => { e.stopPropagation(); removeFile(file); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Upload Progress Indicator */}
        {uploading && (
          <div className="px-4 py-3 bg-muted/20 rounded-lg border">
            <div className="flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm font-medium">Uploading {totalFiles} files...</span>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <DialogClose asChild>
            <Button 
              type="button" 
              variant="outline" 
              disabled={uploading}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleConfirmUpload(e);
            }} 
            disabled={selectedFiles.length === 0 || uploading}
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {uploading ? 'Uploading...' : `Upload ${totalFiles} files`}
          </Button>
        </DialogFooter>
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