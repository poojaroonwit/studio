"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, XCircle, FileText, Plus, Trash2, UploadCloud } from "lucide-react";
import { CandidateQueueProvider, CandidateImportUploadQueue } from "@/components/candidates/CandidateImportUploadQueue";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import type { Position } from '@/lib/types';
import { useSession } from 'next-auth/react';
import BulkUploadCVsModal from "@/components/BulkUploadCVsModal";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function UploadPageContent() {
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [uploading, setUploading] = useState(false);
  const { data: session } = useSession();

  // Fetch available positions
  useEffect(() => {
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
        toast.error("Could not load positions for selection.");
      }
    };
    fetchPositions();
  }, []);

  // Handle file selection
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles: File[] = [];
    const invalidFiles: { name: string; reason: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== "application/pdf") {
        invalidFiles.push({ name: file.name, reason: "Invalid file type" });
        toast.error(`${file.name}: Invalid file type`);
      } else if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push({ name: file.name, reason: `File too large (max ${MAX_FILE_SIZE / (1024*1024)}MB)` });
        toast.error(`${file.name}: File too large (max ${MAX_FILE_SIZE / (1024*1024)}MB)`);
      } else {
        newFiles.push(file);
      }
    }
    setSelectedFiles(prev => [...prev, ...newFiles]);
    if (invalidFiles.length > 0) {
      toast.error(`${invalidFiles.length} file(s) were invalid and not added.`);
    }
  };

  // Drag-and-drop handlers
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
  // Remove file
  const removeFile = (file: File) => {
    setSelectedFiles(prev => prev.filter(f => f !== file));
  };
  // Confirm upload
  const handleConfirmUpload = async () => {
    setUploading(true);
    const batchId = uuidv4();
    const now = new Date().toISOString();
    try {
      if (selectedFiles.length === 0) return;
      // Upload files
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
      const uploadRes = await fetch('/api/upload-queue/upload-file', {
        method: 'POST',
        body: formData
      });
      if (!uploadRes.ok) {
        throw new Error(`File upload failed`);
      }
      const { results } = await uploadRes.json();
      // Non-blocking upload: process each file via non-blocking endpoint
      const queueResults: any[] = [];
      await Promise.all(results.map(async (result: any, idx: number) => {
        if (result.status === 'success') {
          const queueData = {
            file_name: result.file_name,
            file_size: selectedFiles[idx]?.size || 0,
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
          const queueRes = await fetch('/api/upload-queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queueData)
          });
          let error = undefined;
          if (!queueRes.ok) {
            try {
              const errorData = await queueRes.json();
              error = errorData.error || 'Failed to add file to upload queue';
            } catch {
              error = 'Failed to add file to upload queue';
            }
          }
          queueResults.push({ file: result.file_name, success: queueRes.ok, error });
        } else {
          queueResults.push({ file: result.file_name, success: false, error: result.error || 'Upload failed' });
        }
      }));
      setSelectedFiles([]);
      setSelectedPositionId("");
      setIsBulkUploadModalOpen(false);
      // Show summary to user
      const numSuccess = queueResults.filter(r => r.success).length;
      const numError = queueResults.length - numSuccess;
      if (numError === 0) {
        toast.success(`Bulk upload: ${numSuccess} file(s) queued for processing.`);
      } else {
        toast.error(`Bulk upload: ${numError} failed, ${numSuccess} queued.`);
        console.table(queueResults);
      }
      handleUploadSuccess();
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error('Bulk upload failed');
    } finally {
      setUploading(false);
    }
  };
  const totalFiles = selectedFiles.length;

  // Function to refresh the queue after upload
  const handleUploadSuccess = () => {
    window.dispatchEvent(new CustomEvent('refreshCandidateQueue'));
  };

  return (
    <div className="mx-auto py-3 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bulk Upload Candidate CVs</h1>
        <Button onClick={() => setIsBulkUploadModalOpen(true)}>
          <UploadCloud className="mr-2 h-4 w-4" />
          Upload CVs
        </Button>
      </div>
      <BulkUploadCVsModal
        isOpen={isBulkUploadModalOpen}
        onOpenChange={setIsBulkUploadModalOpen}
        onUploadSuccess={handleUploadSuccess}
      />
      <CandidateImportUploadQueue />
    </div>
  );
}

export default function MultiCandidateUploadPage() {
  return (
    <CandidateQueueProvider>
      <UploadPageContent />
    </CandidateQueueProvider>
  );
} 