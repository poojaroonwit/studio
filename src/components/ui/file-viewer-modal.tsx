import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileIcon, FileTextIcon, ImageIcon, ExternalLink, Download, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileViewerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    fileName: string;
    url: string;
    label?: string;
    updatedAt?: string;
    fileSize?: number;
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
function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  isOpen,
  onOpenChange,
  file
}) => {
  if (!file) return null;

  const canPreview = canPreviewFile(file.fileName);
  const isImage = file.fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
  const isPdf = file.fileName.match(/\.pdf$/i);

  const handleViewInNewTab = () => {
    window.open(file.url, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[95vh] flex flex-col">
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
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {canPreview ? (
            <div className="h-full bg-muted/30 rounded-lg overflow-hidden">
              {isImage ? (
                <div className="h-full flex items-center justify-center p-4">
                  <img
                    src={file.url}
                    alt={file.fileName}
                    className="max-w-full max-h-[calc(95vh-200px)] object-contain rounded-lg shadow-lg"
                    style={{ maxHeight: 'calc(95vh - 200px)' }}
                  />
                </div>
              ) : isPdf ? (
                <iframe
                  src={file.url}
                  className="w-full h-full border-0 rounded-lg"
                  title={file.fileName}
                  style={{ minHeight: '400px', height: 'calc(95vh - 200px)' }}
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
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 