import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileIcon, FileTextIcon, ImageIcon, ExternalLink, Download, AlertCircle, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { convertMinIOUrlToSecureUrl } from '@/lib/imageUtils';

interface FileViewerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    fileName: string;
    url: string;
    label?: string;
    updatedAt?: string;
    fileSize?: number | string;
    filePath?: string; // For secure file access
    candidateId?: string; // For permission checking
    headcountId?: string; // For permission checking
  } | null;
}

// Helper to get file icon based on extension
function getFileIcon(fileName: string, size = 'w-8 h-8') {
  if (fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
    return <ImageIcon className={`${size} text-blue-500`} />;
  }
  if (fileName.match(/\.pdf$/i)) {
    return <FileTextIcon className={`${size} text-red-500`} />;
  }
  return <FileIcon className={`${size} text-gray-500`} />;
}

// Helper to determine if file can be previewed
function canPreviewFile(fileName: string): boolean {
  return fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp|pdf)$/i) !== null;
}

// Helper to get file type for display
function getFileType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
      return 'Image';
    case 'pdf':
      return 'PDF Document';
    case 'doc':
    case 'docx':
      return 'Word Document';
    case 'xls':
    case 'xlsx':
      return 'Excel Spreadsheet';
    case 'rtf':
      return 'Rich Text Format';
    default:
      return 'Document';
  }
}

// Helper to format file size
function formatFileSize(bytes?: number | string): string {
  // Handle string values (from reprocess jobs)
  if (typeof bytes === 'string') {
    bytes = parseInt(bytes, 10) || 0;
  }
  
  if (bytes === undefined || bytes === null || bytes === 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  isOpen,
  onOpenChange,
  file
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  // Always call hooks before any early returns
  const canPreview = useMemo(() => (file ? canPreviewFile(file.fileName) : false), [file]);
  const isImage = useMemo(() => (file ? /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.fileName) : false), [file]);
  const isPdf = useMemo(() => (file ? /\.pdf$/i.test(file.fileName) : false), [file]);

  // Build preview URL properly
  const previewUrl = useMemo(() => {
    if (!file) return '';
    if (file.filePath) {
      // Use filePath to build preview URL
      const params = new URLSearchParams({ filePath: file.filePath });
      if (file.fileName) params.set('fileName', file.fileName);
      if (file.candidateId) params.set('candidateId', file.candidateId);
      if (file.headcountId) params.set('headcountId', file.headcountId);
      return `/api/secure-file/preview?${params.toString()}`;
    } else {
      // Legacy URL handling - try to convert stream to preview
      if (file.url.includes('/api/secure-file/stream')) {
        return file.url.replace('/api/secure-file/stream', '/api/secure-file/preview');
      }
      // If it's already a preview URL, use it as is
      if (file.url.includes('/api/secure-file/preview')) {
        return file.url;
      }
      // For other URLs (MinIO direct URLs, etc.), convert to secure endpoint
      return convertMinIOUrlToSecureUrl(file.url) || file.url;
    }
  }, [file]);

  if (!file) return null;

  const handleViewInNewTab = async () => {
    if (file.filePath) {
      // Use secure file access for new tab
      try {
        const params = new URLSearchParams({
          filePath: file.filePath,
          expiresIn: '3600' // 1 hour
        });
        
        if (file.candidateId) {
          params.append('candidateId', file.candidateId);
        }
        if (file.headcountId) {
          params.append('headcountId', file.headcountId);
        }
        
        const response = await fetch(`/api/secure-file?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        } else {
          console.error('Failed to get secure file URL');
          // Fallback to direct URL (for backward compatibility)
          window.open(file.url, '_blank', 'noopener,noreferrer');
        }
      } catch (error) {
        console.error('Error getting secure file URL:', error);
        // Fallback to direct URL (for backward compatibility)
        window.open(file.url, '_blank', 'noopener,noreferrer');
      }
    } else {
      // Legacy direct URL access
      window.open(file.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      let downloadUrl: string;
      
      if (file.filePath) {
        // Use secure file access
        const params = new URLSearchParams({
          filePath: file.filePath,
          fileName: file.fileName
        });
        
        if (file.candidateId) {
          params.append('candidateId', file.candidateId);
        }
        if (file.headcountId) {
          params.append('headcountId', file.headcountId);
        }
        
        downloadUrl = `/api/download?${params.toString()}`;
      } else {
        // Legacy URL-based access
        downloadUrl = `/api/download?url=${encodeURIComponent(file.url)}&fileName=${encodeURIComponent(file.fileName)}`;
      }
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.fileName;
      link.target = '_blank';
      link.style.display = 'none';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to original method if API fails
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col" dialogId="file-viewer-modal">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            {getFileIcon(file.fileName)}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{file.fileName}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span>{getFileType(file.fileName)}</span>
                {file.fileSize && (
                  <>
                    <span>•</span>
                    <span>{formatFileSize(file.fileSize)}</span>
                  </>
                )}
                {file.label && (
                  <>
                    <span>•</span>
                    <Badge variant="secondary" className="text-xs">
                      {file.label}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Preview and download {file.fileName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {canPreview ? (
            <div className="h-full bg-muted/30 rounded-lg overflow-hidden">
              {isImage ? (
                <div className="h-full flex items-center justify-center p-4">
                  <img
                    src={previewUrl}
                    alt={file.fileName}
                    className="max-w-full max-h-[calc(90vh-200px)] object-contain rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ maxHeight: 'calc(90vh - 200px)' }}
                    onClick={handleViewInNewTab}
                    onError={(e) => {
                      // If preview fails, show error message
                      console.error('Failed to load image preview:', previewUrl);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                    title="Click to open in new tab"
                  />
                </div>
              ) : isPdf ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0 rounded-lg"
                  title={file.fileName}
                  style={{ minHeight: '400px', height: 'calc(90vh - 200px)' }}
                />
              ) : null}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg">
              <div className="flex flex-col items-center gap-4 text-center">
                {getFileIcon(file.fileName, 'w-16 h-16')}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Preview not available</h3>
                  <p className="text-muted-foreground mb-4">
                    This file type cannot be previewed in the browser.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="w-4 h-4" />
                    <span>Use the buttons below to view or download the file</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {file.updatedAt && (
              <span>Updated: {new Date(file.updatedAt).toLocaleString()}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleViewInNewTab}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View in New Tab
            </Button>
            <Button
              variant="default"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isDownloading ? 'Downloading...' : 'Download'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 