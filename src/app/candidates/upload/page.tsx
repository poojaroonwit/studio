"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, XCircle, FileText, Plus, Trash2, UploadCloud } from "lucide-react";
import { CandidateQueueProvider } from "@/components/candidates/CandidateImportUploadQueue";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import type { Position } from '@/lib/types';
import { useSession } from 'next-auth/react';
import BulkUploadCVsModal from "@/components/BulkUploadCVsModal";
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const CandidateImportUploadQueue = dynamic(
  () => import('@/components/candidates/CandidateImportUploadQueue').then(mod => mod.CandidateImportUploadQueue),
  { ssr: false }
);

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
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial pagination state from URL
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialPageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  // Update URL when pagination changes
  const updateURL = (page: number, pageSize: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());
    if (pageSize !== 20) params.set('pageSize', pageSize.toString());
    
    const newURL = params.toString() ? `?${params.toString()}` : '';
    router.replace(`/candidates/upload${newURL}`, { scroll: false });
  };

  // Fetch available positions
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const response = await fetch('/api/positions/all');
        if (!response.ok) {
          throw new Error('Failed to fetch positions');
        }
        const result = await response.json();
        setAvailablePositions(result.data || []);
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
    try {
      if (selectedFiles.length === 0) return;
      
      // Step 1: Upload files to MinIO
      console.log(`Starting upload of ${selectedFiles.length} files...`);
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
      
      const uploadRes = await fetch('/api/upload-queue/upload-file', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadRes.ok) {
        throw new Error(`File upload failed: ${uploadRes.statusText}`);
      }
      
      const { results } = await uploadRes.json();
      console.log(`File upload completed. ${results.length} files uploaded.`);
      
      // Step 2: Queue all files at once using bulk endpoint
      const successfulUploads = results.filter((result: any) => result.status === 'success');
      
      if (successfulUploads.length === 0) {
        throw new Error('No files were successfully uploaded');
      }
      
      const filesToQueue = successfulUploads.map((result: any, idx: number) => ({
        file_name: result.file_name,
        file_size: selectedFiles[idx]?.size || 0,
        file_path: result.file_path,
        webhook_payload: {
          targetPositionId: selectedPositionId || null,
          uploadBatch: batchId
        }
      }));
      
      console.log(`Queueing ${filesToQueue.length} files...`);
      const queueRes = await fetch('/api/upload-queue/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesToQueue,
          batchId,
          positionId: selectedPositionId || null
        })
      });
      
      if (!queueRes.ok) {
        const errorData = await queueRes.json();
        throw new Error(errorData.error || 'Failed to queue files');
      }
      
      const queueResult = await queueRes.json();
      console.log(`Queueing completed: ${queueResult.successCount} queued, ${queueResult.errorCount} failed`);
      
      setSelectedFiles([]);
      setSelectedPositionId("");
      setIsBulkUploadModalOpen(false);
      
      // Show summary to user
      if (queueResult.errorCount === 0) {
        toast.success(`Bulk upload: ${queueResult.successCount} file(s) queued successfully!`);
      } else {
        toast.error(`Bulk upload: ${queueResult.errorCount} failed, ${queueResult.successCount} queued.`);
        console.table(queueResult.results);
      }
      
      handleUploadSuccess();
      
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error(`Bulk upload failed: ${(error as Error).message}`);
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
        <div>
          <h1 className="text-2xl font-bold">Bulk Upload Candidate CVs</h1>
          {initialPage > 1 && (
            <p className="text-sm text-muted-foreground mt-1">
              Page {initialPage} • {initialPageSize} items per page
            </p>
          )}
        </div>
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
      <CandidateImportUploadQueue 
        initialPage={initialPage}
        initialPageSize={initialPageSize}
        onPaginationChange={updateURL}
      />
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