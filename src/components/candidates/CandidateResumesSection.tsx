import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'react-hot-toast';
import { FileTextIcon, FileIcon, ImageIcon, UploadCloud, X } from 'lucide-react';
import { FileViewerModal } from '../ui/file-viewer-modal';
import UploadAttachmentsModal from './UploadAttachmentsModal';

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
  if (name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) return <ImageIcon className="w-6 h-6 text-blue-500" />;
  if (name.match(/\.pdf$/i)) return <FileTextIcon className="w-6 h-6 text-red-500" />;
  return <FileIcon className="w-6 h-6 text-gray-500" />;
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
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
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
        credentials: 'include'
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
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete');
      onResumesChange(); // Trigger manual refresh after user action
      toast.success('Resume deleted');
    } catch (err: any) {
      console.error('Error deleting attachment:', err);
      toast.error('Failed to delete resume');
    }
  };



  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-2 flex-shrink-0">
        <span className="font-semibold">Attachments</span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            disabled={uploading}
          >
            <UploadCloud className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSortDesc(!sortDesc)}>
            Sort by Date {sortDesc ? '↓' : '↑'}
          </Button>
        </div>
      </div>

      {uploadError && (
        <p className="text-sm text-red-500 flex-shrink-0">{uploadError}</p>
      )}

      {/* Existing Attachments List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {sortedAttachments.length === 0 && (
          <div className="text-muted-foreground text-sm text-center py-8">
            No attachments uploaded yet.
            <p className="text-xs mt-2">Click the upload button above to add attachments</p>
          </div>
        )}
        
        {(Array.isArray(sortedAttachments) ? sortedAttachments : []).map(attachment => (
          <div key={attachment.id} className="flex items-center gap-2 border rounded px-3 py-2 bg-muted/50 hover:bg-muted/70 transition-colors">
            {attachment.fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
              <img src={attachment.url} alt={attachment.fileName} className="w-6 h-6 object-cover rounded" />
            ) : (
              getFileIcon(attachment)
            )}
            <button
              type="button"
              onClick={() => handleFileClick(attachment)}
              className="font-medium text-xs hover:underline text-left flex-1 min-w-0 truncate"
            >
              {attachment.fileName}
            </button>
            {attachment.label && (
              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border">{attachment.label}</span>
            )}
            {attachment.isPrimary && (
              <Badge variant="default" className="text-xs">Primary</Badge>
            )}
            {isEditing && (
              <div className="flex gap-1 flex-shrink-0">
                {!attachment.isPrimary && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => handleSetPrimary(attachment.id)}
                  >
                    <span className="text-xs">★</span>
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(attachment.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* File Viewer Modal */}
      <FileViewerModal
        isOpen={isFileViewerOpen}
        onOpenChange={setIsFileViewerOpen}
        file={selectedFile}
      />

      {/* Upload Attachments Modal */}
      <UploadAttachmentsModal
        isOpen={isUploadModalOpen}
        onOpenChange={(open) => {
          if (!open && isUploadModalOpen) {
            setIsUploadModalOpen(false);
          }
        }}
        candidate={{ id: candidateId } as any}
        onUploadSuccess={onResumesChange}
      />
    </div>
  );
};

export default CandidateResumesSection; 