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
    const files = event.target.files;
    if (!files || files.length === 0 || !headcount) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('headcountId', headcount.id);
        formData.append('label', file.name);

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload file');
        }
      }

      toast.success('Files uploaded successfully');
      onUpdate();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    setDeleting(attachmentId);
    try {
      const response = await fetch(`/api/upload-image?attachmentId=${attachmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete attachment');
      }

      toast.success('Attachment deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
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
                    <Input
                      id="file-upload"
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    You can select multiple files to upload
                  </p>
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
