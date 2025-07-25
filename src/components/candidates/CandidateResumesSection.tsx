import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import DragDropUpload, { UploadFile } from '../ui/drag-drop-upload';
import { toast } from 'react-hot-toast';
import { FileTextIcon, FileIcon, ImageIcon } from 'lucide-react';
import { FileViewerModal } from '../ui/file-viewer-modal';

interface Attachment {
  id: string;
  fileName: string;
  url: string;
  updatedAt: string;
  isPrimary: boolean;
  label: string;
}

interface Candidate {
  id: string;
  attachments: Attachment[];
}

interface CandidateResumesSectionProps {
  candidateId: string;
  resumes: Attachment[];
  isEditing: boolean;
  onResumesChange: () => void;
}

// Helper to render file icon based on extension
function getFileIcon(fileOrUrl: { fileName: string }) {
  const name = fileOrUrl.fileName;
  if (name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (name.match(/\.pdf$/i)) return <FileTextIcon className="w-5 h-5 text-red-500" />;
  return <FileIcon className="w-5 h-5 text-gray-500" />;
}

const CandidateResumesSection: React.FC<CandidateResumesSectionProps> = ({ candidateId, resumes, isEditing, onResumesChange }) => {
  const [sortDesc, setSortDesc] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    fileName: string;
    url: string;
    label?: string;
    updatedAt?: string;
    fileSize?: number;
  } | null>(null);
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);
  
  // Note: This component relies on parent for data updates (no automatic polling)
  // onResumesChange callback is used to trigger manual refresh after user actions

  const sortedAttachments = Array.isArray(resumes) ? [...resumes].sort((a, b) => {
    const dateA = new Date(a.updatedAt).getTime();
    const dateB = new Date(b.updatedAt).getTime();
    return sortDesc ? dateB - dateA : dateA - dateB;
  }) : [];

  const handleFileClick = (attachment: Attachment) => {
    setSelectedFile({
      fileName: attachment.fileName,
      url: attachment.url,
      label: attachment.label,
      updatedAt: attachment.updatedAt,
      fileSize: undefined // Could be added to attachment interface if available
    });
    setIsFileViewerOpen(true);
  };

  const handleSetPrimary = async (attachmentId: string) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/resumes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentId }),
      });
      if (!res.ok) throw new Error('Failed to set primary');
      onResumesChange(); // Trigger manual refresh after user action
      toast.success('Primary resume updated');
    } catch (err: any) {
      console.error('Error setting primary:', err);
      toast.error('Failed to set primary resume');
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/resumes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentId }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      onResumesChange(); // Trigger manual refresh after user action
      toast.success('Resume deleted');
    } catch (err: any) {
      console.error('Error deleting attachment:', err);
      toast.error('Failed to delete resume');
    }
  };

  const handleUpload = async (files: File[], onProgress?: (fileId: string, progress: number) => void) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    setUploadError(null);
    
    try {
      // Upload files one by one with progress tracking
      for (const file of files) {
        const formData = new FormData();
        formData.append('attachments', file);

        // Create a promise that resolves with upload progress
        const uploadPromise = new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              const fileId = `${Date.now()}-${file.name}`;
              onProgress?.(fileId, progress);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
          });

          xhr.open('POST', `/api/candidates/${candidateId}/resumes`);
          xhr.send(formData);
        });

        await uploadPromise;
      }

      // Trigger manual refresh after upload
      onResumesChange();
      toast.success(`Successfully uploaded ${files.length} file(s)`);
      
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'Upload failed');
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold">Attachments</span>
        <Button size="sm" variant="outline" onClick={() => setSortDesc(!sortDesc)}>
          Sort by Date {sortDesc ? '↓' : '↑'}
        </Button>
      </div>

      {/* Drag and Drop Upload Area */}
      <div className="mb-6">
        <DragDropUpload
          onUpload={handleUpload}
          accept="application/pdf,.doc,.docx,.rtf"
          multiple={true}
          maxFiles={10}
          maxFileSize={10 * 1024 * 1024} // 10MB
          disabled={uploading}
          className="w-full"
        />
        {uploadError && (
          <p className="text-sm text-red-500 mt-2">{uploadError}</p>
        )}
      </div>

      {/* Existing Attachments List */}
      <div className="space-y-3">
        {sortedAttachments.length === 0 && (
          <div className="text-muted-foreground text-sm text-center py-8">
            No attachments uploaded yet.
            {!isEditing && (
              <p className="text-xs mt-2">Enable edit mode to upload attachments</p>
            )}
          </div>
        )}
        
        {(Array.isArray(sortedAttachments) ? sortedAttachments : []).map(attachment => (
          <div key={attachment.id} className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getFileIcon(attachment)}
                  <button
                    type="button"
                    onClick={() => handleFileClick(attachment)}
                    className="font-medium hover:underline text-primary truncate text-left"
                  >
                    {attachment.fileName}
                  </button>
                  {attachment.label && (
                    <Badge variant="secondary" className="text-xs ml-2">{attachment.label}</Badge>
                  )}
                  {attachment.isPrimary && (
                    <Badge variant="default" className="text-xs">Primary</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Updated: {new Date(attachment.updatedAt).toLocaleString()}
                </div>
              </div>
              
              {isEditing && (
                <div className="flex gap-2 flex-shrink-0">
                  {!attachment.isPrimary && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleSetPrimary(attachment.id)}
                    >
                      Set Primary
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => handleDelete(attachment.id)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* File Viewer Modal */}
      <FileViewerModal
        isOpen={isFileViewerOpen}
        onOpenChange={setIsFileViewerOpen}
        file={selectedFile}
      />
    </div>
  );
};

export default CandidateResumesSection; 