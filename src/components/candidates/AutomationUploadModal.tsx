"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadArea } from "@/components/ui/FileUploadArea";
import { Loader2, UploadCloud, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import type { Position } from '@/lib/types';

interface AutomationUploadModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const AutomationUploadModal: React.FC<AutomationUploadModalProps> = ({ isOpen, onOpenChange, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
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
        toast.error("Could not load positions for selection.");
      }
    };
    fetchPositions();
  }, [isOpen]);

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

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      // Step 1: Upload file to MinIO
      const formData = new FormData();
      formData.append('files', selectedFile);
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