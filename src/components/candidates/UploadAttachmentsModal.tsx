"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, Loader2, X, FileText, Image, File, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Candidate } from '@/lib/types';

interface FileWithTag {
  file: File;
  tag: string;
}

interface UploadAttachmentsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate | null;
  onUploadSuccess: () => void;
}

const PREDEFINED_TAGS = [
  { value: 'resume', label: 'Resume' },
  { value: 'cover-letter', label: 'Cover Letter' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'reference-letter', label: 'Reference Letter' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'other', label: 'Other' }
];

const UploadAttachmentsModal = ({ isOpen, onOpenChange, candidate, onUploadSuccess }: UploadAttachmentsModalProps) => {
  const [filesWithTags, setFilesWithTags] = useState<FileWithTag[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length > 0) {
      // Validate file types
      const allowedTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
        'text/plain'
      ];
      
      const validFiles = selectedFiles.filter(file => {
        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name} is not a supported file type`);
          return false;
        }
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          return false;
        }
        return true;
      });

  

      // Add new files with empty tags
      const newFilesWithTags = validFiles.map(file => ({
        file,
        tag: ''
      }));

      setFilesWithTags(prev => [...prev, ...newFilesWithTags]);
  
    }
  };

  const removeFile = (index: number) => {
    setFilesWithTags(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileTag = (index: number, tag: string) => {
    setFilesWithTags(prev => prev.map((item, i) => 
      i === index ? { ...item, tag } : item
    ));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />;
    if (file.type === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />;
    return <File className="w-4 h-4 text-gray-500" />;
  };

  const handleUpload = async () => {
    if (filesWithTags.length === 0) {
      toast.error('Please select files to upload');
      return;
    }
    if (!candidate) {
      toast.error('Candidate information not available');
      return;
    }

    setIsUploading(true);
    try {
      const uploadPromises = filesWithTags.map(async ({ file, tag }) => {
        const formData = new FormData();
        formData.append('attachments', file);
        if (tag.trim()) {
          formData.append('label', tag.trim());
        }
        
        const response = await fetch(`/api/candidates/${candidate.id}/resumes`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
        
        return response.json();
      });

      await Promise.all(uploadPromises);
      
      toast.success(`${filesWithTags.length} attachment(s) uploaded successfully`);
      setFilesWithTags([]);
      if (typeof onUploadSuccess === 'function') {
        onUploadSuccess();
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload some files');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFilesWithTags([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md !z-[99999]">
        <DialogHeader>
          <DialogTitle>Upload Attachments</DialogTitle>
          <DialogDescription>
            Upload files for {candidate?.name || 'this candidate'}. Supported formats: PDF, DOC, DOCX, Images, TXT (max 10MB each).
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="attachments-file">Select Files</Label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="attachments-file"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted hover:bg-accent transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, Images, TXT (max 10MB each)</p>
                </div>
                <Input
                  id="attachments-file"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
                  multiple
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          {/* Selected Files List with Tags */}
          {filesWithTags.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files ({filesWithTags.length})</Label>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {filesWithTags.map(({ file, tag }, index) => (
                  <div key={index} className="p-3 bg-muted rounded-md text-sm border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getFileIcon(file)}
                        <span className="truncate font-medium">{file.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <Select value={tag} onValueChange={(value) => updateFileTag(index, value)} disabled={isUploading}>
                        <SelectTrigger className="h-8 text-sm w-full bg-background border border-border hover:bg-accent hover:text-accent-foreground">
                          <SelectValue placeholder="Select file type" />
                        </SelectTrigger>
                        <SelectContent className="z-[100003]">
                          {PREDEFINED_TAGS.map((tagOption) => (
                            <SelectItem key={tagOption.value} value={tagOption.value}>
                              {tagOption.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Debug: Show dropdown even when no files to make it visible */}
          {filesWithTags.length === 0 && (
            <div className="space-y-2">
              <Label>File Tags (select files first)</Label>
              <div className="p-3 bg-muted/50 rounded-md text-sm border border-dashed border-border">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <Select disabled>
                    <SelectTrigger className="h-8 text-sm w-full bg-background border border-border">
                      <SelectValue placeholder="Select files to add tags" />
                    </SelectTrigger>
                    <SelectContent className="z-[100003]">
                      {PREDEFINED_TAGS.map((tagOption) => (
                        <SelectItem key={tagOption.value} value={tagOption.value}>
                          {tagOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

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
              disabled={filesWithTags.length === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                `Upload ${filesWithTags.length} File${filesWithTags.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadAttachmentsModal; 