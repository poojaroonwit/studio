"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Candidate } from '@/lib/types';

interface UploadResumeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate | null;
  onUploadSuccess: (updatedCandidate: Candidate) => void;
}

const UploadResumeModal = ({ isOpen, onOpenChange, candidate, onUploadSuccess }: UploadResumeModalProps) => {
  const { error: toastError } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTriggered, setUploadTriggered] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toastError('Please select a PDF or Word document');
        return;
      }
      // Validate file size (5MB limit)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toastError('File size must be less than 5MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !candidate) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!candidate.positionId) {
      toast.error('Cannot upload resume: Candidate is not applied to any position. Please assign a position first.');
      return;
    }
    setIsUploading(true);
    setUploadTriggered(false);
    try {
  
      const formData = new FormData();
      formData.append('resume', file); // must be 'resume'
      formData.append('position_id', candidate.positionId); // must be 'position_id', ensure not empty
      // Include source_id if available
      if (candidate.sourceId) {
        formData.append('source_id', candidate.sourceId);
      }
      const url = `/api/resumes/upload?candidateId=${candidate.id}`; // candidateId as query param
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      const result = await response.json();
      toast.success('Resume uploaded successfully');
      setUploadTriggered(true);
      if (typeof onUploadSuccess === 'function' && result.candidate) {
        onUploadSuccess(result.candidate);
      }
      onOpenChange(false);
      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload resume');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFile(null);
      setUploadTriggered(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dialogId="upload-resume-modal">
        <DialogHeader>
          <DialogTitle>Upload Resume</DialogTitle>
          <DialogDescription>
            Upload a new resume for {candidate?.name || 'this candidate'}. Supported formats: PDF, DOC, DOCX (max 5MB).
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resume-file">Select File</Label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="resume-file"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-8 h-8 mb-4 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PDF, DOC, or DOCX (max 5MB)</p>
                </div>
                <Input
                  id="resume-file"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </label>
            </div>
            {file && (
              <p className="text-sm text-green-600">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Resume'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadResumeModal; 