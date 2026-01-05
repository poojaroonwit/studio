"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  FileText,
  Image as ImageIcon,
  FileIcon,
  Download,
  Eye,
  Trash2,
  Upload,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';

interface Attachment {
  id: string;
  fileName: string;
  filePath: string;
  uploadedAt: string;
  uploadedBy?: {
    id: string;
    name: string | null;
    email: string | null;
  };
  url?: string;
  label?: string;
  isPrimary?: boolean;
}

interface AttachmentsTabProps {
  candidateId: string;
  attachments: Attachment[];
  onRefresh?: () => void;
  canUpload?: boolean;
  canDelete?: boolean;
}

export function AttachmentsTab({
  candidateId,
  attachments,
  onRefresh,
  canUpload = false,
  canDelete = false
}: AttachmentsTabProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);

  // Helper function to infer MIME type from filename
  const getFileTypeFromName = (fileName: string | null | undefined): string => {
    if (!fileName) return 'application/octet-stream';

    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'txt': 'text/plain',
      'csv': 'text/csv',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  };

  const getFileIcon = (fileName: string | null | undefined) => {
    const fileType = getFileTypeFromName(fileName);

    if (fileType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    } else if (fileType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <FileIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes || bytes === 0) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}/resumes/${attachment.id}/download`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('File downloaded successfully');
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const handleView = (attachment: Attachment) => {
    setSelectedFile({
      fileName: attachment.fileName,
      url: attachment.url || '',
      label: attachment.label,
      updatedAt: attachment.uploadedAt,
      filePath: attachment.filePath,
      candidateId: candidateId
    });
    setIsFileViewerOpen(true);
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    setDeletingId(attachmentId);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/resumes/${attachmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      toast.success('File deleted successfully');
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await fetch(`/api/candidates/${candidateId}/resumes`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      toast.success(`${files.length} file(s) uploaded successfully`);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
      event.target.value = ''; // Reset input
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Upload Section */}
      {canUpload && (
        <Card className="p-4">
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors">
              {isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm text-muted-foreground">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Tap to upload files
                  </span>
                </>
              )}
            </div>
          </label>
          <input
            id="file-upload"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleUpload}
            className="hidden"
            disabled={isUploading}
          />
        </Card>
      )}

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="text-center py-12">
          <FileIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No attachments yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <Card key={attachment.id} className="p-4">
              <div className="flex items-start gap-3">
                {/* File Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getFileIcon(attachment.fileName)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">
                    {attachment.fileName}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{format(new Date(attachment.uploadedAt), 'MMM d, yyyy')}</span>
                  </div>
                  {attachment.uploadedBy && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Uploaded by {attachment.uploadedBy.name || attachment.uploadedBy.email || 'Unknown'}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleView(attachment)}
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(attachment)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(attachment.id)}
                      disabled={deletingId === attachment.id}
                      title="Delete"
                    >
                      {deletingId === attachment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* File Viewer Modal */}
      <FileViewerModal
        isOpen={isFileViewerOpen}
        onOpenChange={setIsFileViewerOpen}
        file={selectedFile}
      />
    </div>
  );
}
