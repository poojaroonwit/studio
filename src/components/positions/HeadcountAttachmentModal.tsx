"use client";

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Upload, 
  Download, 
  Trash2, 
  FileText, 
  Paperclip,
  Loader2,
  X,
  Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import type { Headcount, Attachment } from '@/lib/types';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';

interface HeadcountAttachmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headcount: Headcount | null;
  onClose: () => void;
  onUpdate: () => void;
}

export function HeadcountAttachmentModal({ 
  open, 
  onOpenChange, 
  headcount, 
  onClose, 
  onUpdate 
}: HeadcountAttachmentModalProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileViewerFile, setFileViewerFile] = useState<{
    fileName: string;
    url: string;
    label?: string;
    updatedAt?: string;
    fileSize?: number;
  } | null>(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to get file icon
  const getFileIcon = (fileName: string) => {
    if (fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
      return <FileText className="h-5 w-5 text-primary" />;
    }
    if (fileName.match(/\.pdf$/i)) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number | null | undefined): string => {
    // Handle null, undefined, NaN, or negative values
    if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) {
      return 'Unknown size';
    }
    
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    // Ensure i is within bounds
    const sizeIndex = Math.max(0, Math.min(i, sizes.length - 1));
    
    return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(2)) + ' ' + sizes[sizeIndex];
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
  };

  const handleFilePreview = (file: File) => {
    const url = URL.createObjectURL(file);
    setFileViewerFile({
      fileName: file.name,
      url: url,
      fileSize: file.size
    });
    setFileViewerOpen(true);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async () => {
    if (!selectedFiles.length || !headcount) return;

    setUploading(true);
    
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('label', file.name);
        

        
        const response = await fetch(`/api/headcount/${headcount.id}/attachments`, {
          method: 'POST',
          body: formData,
        });
        

        
        if (!response.ok) {
          let errorData: { error?: string } = {};
          let responseText = '';
          
          try {
            // First, get the raw response text
            responseText = await response.text();
            console.error('[UPLOAD] Raw response text:', responseText);
            
            // Try to parse as JSON
            if (responseText.trim()) {
              errorData = JSON.parse(responseText);
            }
            console.error('[UPLOAD] Upload failed with error data:', errorData);
            console.error('[UPLOAD] Response headers:', Object.fromEntries(response.headers.entries()));
          } catch (parseError) {
            console.error('[UPLOAD] Failed to parse error response:', parseError);
            console.error('[UPLOAD] Raw response text was:', responseText);
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
          
          throw new Error(errorData.error || `Failed to upload file: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();

      }

      toast.success('Files uploaded successfully');
      setSelectedFiles([]);
      onUpdate();
    } catch (error) {
      console.error('[UPLOAD] Error uploading files:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload files';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?') || !headcount) {
      return;
    }

    setDeleting(attachmentId);
    try {
      const response = await fetch(`/api/headcount/${headcount.id}/attachments?attachmentId=${attachmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete attachment');
      }

      toast.success('Attachment deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete attachment');
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      if (!headcount) {
        toast.error('Headcount not available for download');
        return;
      }
      const params = new URLSearchParams({
        filePath: attachment.filePath,
        fileName: attachment.fileName,
        headcountId: headcount.id
      });
      
      const response = await fetch(`/api/download?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleAttachmentPreview = (attachment: Attachment) => {
    const params = new URLSearchParams({
      filePath: attachment.filePath,
      fileName: attachment.fileName,
      ...(headcount ? { headcountId: headcount.id } : {}),
    })
    setFileViewerFile({
      fileName: attachment.fileName,
      url: `/api/secure-file/stream?${params.toString()}`,
      label: attachment.label,
      updatedAt: attachment.uploadedAt,
      fileSize: undefined
    });
    setFileViewerOpen(true);
  };

  if (!headcount) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dialogId="headcount-attachment-modal">
          <DialogHeader>
            <DialogTitle>Manage Attachments</DialogTitle>
            <DialogDescription>
              Upload and manage files for headcount: {headcount.type} - {headcount.status}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Upload Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file-upload">Select Files</Label>
                    <div className="mt-2">
                      <Input
                        id="file-upload"
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        disabled={uploading}
                        className="cursor-pointer"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      You can select multiple files to upload
                    </p>
                  </div>

                  {/* Selected Files Preview */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-3">
                      <Label>Selected Files ({selectedFiles.length})</Label>
                      <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/20">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-background rounded px-3 py-2 border"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {getFileIcon(file.name)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => handleFilePreview(file)}
                                className="h-6 w-6"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveFile(index)}
                                className="h-6 w-6"
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <Button
                        onClick={handleFileUpload}
                        disabled={uploading}
                        className="w-full"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Attachments List */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    <h3 className="font-medium">Attachments ({headcount.attachments?.length || 0})</h3>
                  </div>

                  {!headcount.attachments || headcount.attachments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No attachments uploaded yet</p>
                      <p className="text-sm">Upload files using the form above</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {headcount.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {getFileIcon(attachment.fileName)}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{attachment.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {attachment.label} • {format(new Date(attachment.uploadedAt), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAttachmentPreview(attachment)}
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(attachment)}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAttachment(attachment.id)}
                              disabled={deleting === attachment.id}
                              title="Delete"
                            >
                              {deleting === attachment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end">
              <Button onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Viewer Modal */}
      <FileViewerModal
        isOpen={fileViewerOpen}
        onOpenChange={setFileViewerOpen}
        file={fileViewerFile}
      />
    </>
  );
}
