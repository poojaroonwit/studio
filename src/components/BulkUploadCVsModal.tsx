"use client";

import React, { useState, useEffect } from "react";
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

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

interface BulkUploadCVsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void;
}

export function BulkUploadCVsModal({ isOpen, onOpenChange, onUploadSuccess }: BulkUploadCVsModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [uploading, setUploading] = useState(false);
  const { data: session } = useSession();
  const [fileBatchMap, setFileBatchMap] = useState<{ [fileName: string]: string }>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { successWithDescription, errorWithDescription, error } = useToast();

  // Check permissions
  const canBulkUpload = session?.user?.role === 'Admin' || 
    session?.user?.modulePermissions?.includes('BULK_UPLOAD');
  
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
    if (!isOpen) return;
    const fetchPositions = async () => {
      try {
        const response = await fetch('/api/positions');
        if (!response.ok) {
          throw new Error('Failed to fetch positions');
        }
        const result = await response.json();
        const data = Array.isArray(result) ? result : (result.data || []);
        setAvailablePositions(Array.isArray(data) ? data : []);
              } catch (error) {
          console.error("Error fetching positions:", error);
          errorWithDescription("Could not load positions for selection.", "Please try refreshing the page or contact support if the issue persists.");
        }
    };
    fetchPositions();
  }, [isOpen]);

  useEffect(() => {
    if (selectedFiles.length > 0) {
      const url = URL.createObjectURL(selectedFiles[0]);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFiles]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles: File[] = [];
    const invalidFiles: { name: string; reason: string }[] = [];
    const newBatchMap: { [fileName: string]: string } = {};
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== "application/pdf") {
        invalidFiles.push({ name: file.name, reason: "Invalid file type" });
        errorWithDescription(`${file.name}: Invalid file type`, "Only PDF files are supported for resume uploads.");
      } else if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push({ name: file.name, reason: `File too large (max ${MAX_FILE_SIZE / (1024*1024)}MB)` });
        errorWithDescription(`${file.name}: File too large (max ${MAX_FILE_SIZE / (1024*1024)}MB)`, "Please compress the file or split it into smaller parts.");
      } else {
        newFiles.push(file);
        newBatchMap[file.name] = uuidv4();
      }
    }
    setSelectedFiles((prev: File[]) => [...prev, ...newFiles]);
    setFileBatchMap((prev: { [fileName: string]: string }) => ({ ...prev, ...newBatchMap }));
          if (invalidFiles.length > 0) {
        errorWithDescription(`${invalidFiles.length} file(s) were invalid and not added.`, "Please check the file format and size requirements.");
      }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };
  const removeFile = (file: File) => {
    setSelectedFiles((prev: File[]) => prev.filter((f: File) => f !== file));
    setFileBatchMap((prev: { [fileName: string]: string }) => {
      const newMap = { ...prev };
      delete newMap[file.name];
      return newMap;
    });
  };

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

  const handleConfirmUpload = async () => {
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
      let queueResults: any[] = [];
      await Promise.all(results.map(async (result: any, idx: number) => {
        if (result.status === 'success') {
          const file = selectedFiles[idx];
          const batchId = fileBatchMap[file.name] || uuidv4();
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
      setSelectedFiles([]);
      setSelectedPositionId("");
      setFileBatchMap({});
      onOpenChange(false);
      // Show summary to user
      const numSuccess = queueResults.filter(r => r.success).length;
      const numError = queueResults.length - numSuccess;
      if (numError === 0) {
        successWithDescription(`Bulk upload: ${numSuccess} file(s) queued for processing.`, "Your files have been successfully uploaded and are being processed.");
      } else {
        errorWithDescription(`Bulk upload: ${numError} failed, ${numSuccess} queued.`, "Some files could not be processed. Check the console for details.");
        console.table(queueResults);
      }
      if (onUploadSuccess) onUploadSuccess();
      window.dispatchEvent(new CustomEvent('refreshCandidateQueue'));
    } catch (error) {
      console.error('Bulk upload error:', error);
      errorWithDescription('Bulk upload failed (unexpected error)', "Please try again or contact support if the issue persists.");
    } finally {
      setUploading(false);
    }
  };
  const totalFiles = selectedFiles.length;
  return (
    <Dialog open={isOpen} onOpenChange={open => {
      onOpenChange(open);
      if (!open) {
        setSelectedFiles([]);
        setSelectedPositionId("");
      }
    }}>
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
              <Select value={(selectedPositionId === "" ? "__NONE__" : selectedPositionId) || ''} onValueChange={value => setSelectedPositionId(value === "__NONE__" ? "" : value)}>
                <SelectTrigger id="position-select" className="mt-2">
                  <SelectValue placeholder="Select a position..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NONE__">None (General Application)</SelectItem>
                  {availablePositions.map(pos => (
                    <SelectItem key={pos.id} value={pos.id}>{pos.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FileUploadArea
              accept="application/pdf"
              multiple={true}
              maxFileSize={MAX_FILE_SIZE}
              onFilesChange={handleFiles}
              dragActive={dragActive}
              setDragActive={setDragActive}
            />
          </div>
          {/* Right Column - Uploaded Files List and Preview */}
          <div className="space-y-4">
            {/* Uploaded Files List - Show selected files in right column */}
            {totalFiles > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({totalFiles})</Label>
                <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/20">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-background rounded px-3 py-2 border border-border">
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
            {/* PDF Preview */}
            <div className="mt-4">
              <Label>Preview</Label>
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  title="PDF Preview"
                  className="w-full h-64 border rounded"
                  style={{ minHeight: '16rem' }}
                />
              ) : (
                <div className="text-muted-foreground italic">No file selected for preview.</div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={uploading}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleConfirmUpload} disabled={selectedFiles.length === 0 || uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BulkUploadCVsModal; 