"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FileUploadArea from "@/components/ui/FileUploadArea";
import { Loader2, UploadCloud, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import type { Position } from '@/lib/types';
import { PositionSelectDropdown } from "@/components/candidates/PositionSelectDropdown";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

interface AutomationUploadModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void;
}

export const AutomationUploadModal: React.FC<AutomationUploadModalProps> = ({ isOpen, onOpenChange, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { data: session } = useSession();

  // Check permissions
  const canAutomationUpload = session?.user?.role === 'Admin' || 
    session?.user?.modulePermissions?.includes('AUTOMATION_UPLOAD');
  
  if (!canAutomationUpload) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access Denied</DialogTitle>
            <DialogDescription>
              You don't have permission to use automation upload. Please contact your administrator.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type !== "application/pdf") {
      toast.error(`${file.name}: Invalid file type (PDF only)`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name}: File too large (max ${MAX_FILE_SIZE / (1024*1024)}MB)`);
      return;
    }
    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const handlePositionChange = (value: string) => {
    setSelectedPositionId(value);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      // Step 1: Upload file to MinIO
      const formData = new FormData();
      formData.append('files', selectedFile);
      formData.append('file', selectedFile); // fallback for server compatibility
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
        toast.error(errorMsg);
        return;
      }
      const { results } = await uploadRes.json();
      const result = results[0];
      if (!result || result.status !== 'success') {
        toast.error(result?.error || 'File upload failed');
        return;
      }
      // Step 2: Add to upload queue with automation source
      const now = new Date().toISOString();
      const queueData = {
        file_name: result.file_name,
        file_size: selectedFile.size,
        status: 'queued',
        source: 'automation',
        upload_id: result.file_name + '-' + now,
        upload_date: now,
        file_path: result.file_path,
        webhook_payload: {
          targetPositionId: selectedPositionId || null,
          automation: true
        },
      };
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
        toast.error(errorMsg);
        return;
      }
      toast.success('Resume sent for automated candidate creation!');
      setSelectedFile(null);
      setSelectedPositionId("");
      onOpenChange(false);
      if (onUploadSuccess) onUploadSuccess();
      window.dispatchEvent(new CustomEvent('refreshCandidateQueue'));
    } catch (error) {
      console.error('Automation upload error:', error);
      toast.error('Automation upload failed (unexpected error)');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => {
      onOpenChange(open);
      if (!open) {
        setSelectedFile(null);
        setSelectedPositionId("");
      }
    }}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>Automated Resume Upload</DialogTitle>
          <DialogDescription>
            Upload a PDF resume to trigger automated candidate creation. Optionally, assign to a position.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
                      <div>
              <Label htmlFor="position-select">Assign to Position </Label>
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
            accept="application/pdf"
            multiple={false}
            maxFileSize={MAX_FILE_SIZE}
            onFilesChange={handleFiles}
            dragActive={dragActive}
            setDragActive={setDragActive}
          />
          {selectedFile && (
            <div className="flex items-center justify-between bg-background rounded px-3 py-2 border border-border">
              <div className="flex-1 min-w-0">
                <span className="truncate block text-sm font-medium">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">{(selectedFile.size / (1024*1024)).toFixed(2)} MB</span>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={e => { e.stopPropagation(); removeFile(); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={uploading}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleConfirmUpload} disabled={!selectedFile || uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AutomationUploadModal; 