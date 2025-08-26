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
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import type { Headcount, Attachment } from '@/lib/types';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent any default form submission behavior
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.target.files;
    if (!files || files.length === 0 || !headcount) return;

    // console.log('Starting file upload for headcount:', headcount.id, 'Files:', files.length);
    setUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // console.log('Uploading file:', file.name, 'Size:', file.size);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('label', file.name);

        // Test the API endpoint first
        // console.log('Testing API endpoint:', `/api/headcount/${headcount.id}/attachments`);
        
        const response = await fetch(`/api/headcount/${headcount.id}/attachments`, {
          method: 'POST',
          body: formData,
        });

        // console.log('Upload response status:', response.status);
        // console.log('Upload response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Upload failed:', errorData);
          throw new Error(errorData.error || `Failed to upload file: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Upload successful:', result);
      }

      toast.success('Files uploaded successfully');
      onUpdate();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Test function to verify API endpoint without file upload
  const testApiEndpoint = async () => {
    if (!headcount) return;
    
    try {
      console.log('Testing API endpoint without file upload');
      const response = await fetch(`/api/headcount/${headcount.id}/attachments`, {
        method: 'GET',
      });
      
      console.log('Test response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Test response data:', data);
        toast.success('API endpoint is working');
      } else {
        toast.error(`API test failed: ${response.status}`);
      }
    } catch (error) {
      console.error('API test error:', error);
      toast.error('API test failed');
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
      const response = await fetch(`/api/download?filePath=${encodeURIComponent(attachment.filePath)}`);
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

  if (!headcount) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <Label htmlFor="file-upload">Upload Files</Label>
                  <div className="mt-2">
                    {/* Wrap in div to prevent form submission issues */}
                    <div onClick={(e) => e.preventDefault()}>
                      <Input
                        id="file-upload"
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="cursor-pointer"
                        // Prevent form submission
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                          }
                        }}
                        onClick={(e) => {
                          // Prevent any click events from bubbling up
                          e.stopPropagation();
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    You can select multiple files to upload
                  </p>
                  
                  {/* Test button for debugging */}
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={testApiEndpoint}
                      className="text-xs"
                    >
                      Test API Endpoint
                    </Button>
                  </div>
                </div>
                
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading files...
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
                          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
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
  );
}
