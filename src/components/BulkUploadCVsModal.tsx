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
import { FileUploadArea } from "@/components/ui/FileUploadArea";
import { toast } from "react-hot-toast";
import { PositionSelectDropdown } from "@/components/candidates/PositionSelectDropdown";

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
  const [uploading, setUploading] = useState(false);
  const { data: session } = useSession();
  const [fileBatchMap, setFileBatchMap] = useState<{ [fileName: string]: string }>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const { successWithDescription, errorWithDescription, error } = useToast();
  
  // Memoize the permission check to prevent unnecessary re-renders
  const canBulkUpload = useMemo(() => {
    return session?.user?.role === 'Admin' || 
      session?.user?.modulePermissions?.includes('BULK_UPLOAD');
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

  const handlePositionChange = useCallback((value: string) => {
    setSelectedPositionId(value);
  }, []);

  // Helper to add a file to the upload queue and handle errors
  async function addToUploadQueueNonBlocking(queueData: any, fileName: string) {
    try {
      const queueRes = await fetch('/api/upload-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queueData)
      });
      if (!queueRes.ok) {
        let errorMsg = 'Failed to add file to upload queue';
        try {
          const errorData = await queueRes.json();
          errorMsg = errorData.error || errorMsg;
          console.error('Upload queue POST error:', errorData);
        } catch (parseErr) {
          console.error('Upload queue POST error (non-JSON):', queueRes);
        }
        errorWithDescription(`${fileName}: ${errorMsg}`, "The file could not be added to the processing queue.");
        return { success: false, error: errorMsg };
      }
      return { success: true };
    } catch (err) {
      console.error('Network or unexpected error during upload queue POST:', err);
              errorWithDescription(`${fileName}: Unexpected error adding to upload queue`, "Please try again or contact support if the issue persists.");
      return { success: false, error: 'Unexpected error' };
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
      setSelectedFileIndex(0);
    }
  }, [onOpenChange]);

  const handleConfirmUpload = useCallback(async () => {
    setUploading(true);
    const now = new Date().toISOString();
    try {
      if (selectedFiles.length === 0) return;
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
      const uploadRes = await fetch('/api/upload-queue/upload-file', {
        method: 'POST',
        body: formData
      });
      if (!uploadRes.ok) {
        let errorMsg = 'File upload failed';
        try {
          const errorData = await uploadRes.json();
          errorMsg = errorData.error || errorMsg;
          console.error('File upload error:', errorData);
        } catch (parseErr) {
          console.error('File upload error (non-JSON):', uploadRes);
        }
        errorWithDescription(errorMsg, "Please check your connection and try again.");
        return;
      }
      const { results } = await uploadRes.json();
      // Close modal immediately after upload to MinIO
      setSelectedFiles([]);
      setSelectedPositionId("");
      setFileBatchMap({});
      setSelectedFileIndex(0);
      onOpenChange(false);
      successWithDescription('Files uploaded! Now adding to processing queue...', 'Your files are being queued for processing.');
      // Continue queueing in the background
      let queueResults: any[] = [];
      await Promise.all(results.map(async (result: any, idx: number) => {
        if (result.status === 'success') {
          const file = selectedFiles[idx];
          const batchId = fileBatchMap[file?.name] || uuidv4();
          const queueData = {
            file_name: result.file_name,
            file_size: file?.size || 0,
            status: 'queued',
            source: 'bulk',
            upload_id: batchId,
            upload_date: now,
            file_path: result.file_path,
            webhook_payload: {
              targetPositionId: selectedPositionId || null,
              uploadBatch: batchId
            },
          };
          const { success, error } = await addToUploadQueueNonBlocking(queueData, result.file_name);
          queueResults.push({ file: result.file_name, success, error });
        } else {
          queueResults.push({ file: result.file_name, success: false, error: result.error || 'Upload failed' });
        }
      }));
      // Show summary to user (optional, can be removed if not needed)
      const numSuccess = queueResults.filter(r => r.success).length;
      const numError = queueResults.length - numSuccess;
      if (numError === 0) {
        successWithDescription(`Bulk upload: ${numSuccess} file(s) queued for processing.`, "Your files have been successfully uploaded and are being processed.");
      } else {
        errorWithDescription(`Bulk upload: ${numError} failed, ${numSuccess} queued.`, "Some files could not be processed. Check the console for details.");
        console.table(queueResults);
      }
      if (onUploadSuccess) onUploadSuccess();
      // Remove automatic refresh - let the user decide when to refresh
      // window.dispatchEvent(new CustomEvent('refreshCandidateQueue'));
    } catch (error) {
      console.error('Bulk upload error:', error);
      errorWithDescription('Bulk upload failed (unexpected error)', "Please try again or contact support if the issue persists.");
    } finally {
      setUploading(false);
    }
  }, [selectedFiles, selectedPositionId, fileBatchMap, onOpenChange, successWithDescription, errorWithDescription, onUploadSuccess]);
  const totalFiles = selectedFiles.length;
  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle>Bulk Upload Candidate CVs</DialogTitle>
          <DialogDescription>
            Upload multiple PDF resumes and (optionally) assign them to a position.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2 p-4 pb-6">
          {/* Left Column - Position Selection and File Upload Area */}
          <div className="space-y-4">
                          <div>
                <Label htmlFor="position-select">Assign to Position (optional)</Label>
                <div className="mt-2">
                  <PositionSelectDropdown
                    value={selectedPositionId}
                    onValueChange={handlePositionChange}
                    placeholder="Select a position..."
                    showOpenStatus={true}
                    filterOpenOnly={false}
                    showNoneOption={true}
                  />
                </div>
              </div>
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
          {/* Right Column - Uploaded Files List, Preview, and Static Upload Queue Card */}
          <div className="space-y-4">
            {/* Uploaded Files List - Show selected files in right column */}
            {totalFiles > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({totalFiles})</Label>
                <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/20">
                  {selectedFiles.map((file, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between bg-background rounded px-3 py-2 border cursor-pointer transition-colors ${
                        idx === selectedFileIndex 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleFileIndexChange(idx)}
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
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={uploading}>Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleConfirmUpload} disabled={selectedFiles.length === 0 || uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BulkUploadCVsModal; 