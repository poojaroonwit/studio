import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DocumentIcon as FileIcon, DocumentTextIcon as FileTextIcon, PhotoIcon as ImageIcon, ArrowTopRightOnSquareIcon as ExternalLink, ExclamationCircleIcon as AlertCircle, ArrowPathIcon as Loader2, ChevronLeftIcon as ChevronLeft, XMarkIcon as X } from '@heroicons/react/24/outline';
import { ScrollArea } from '@/components/ui/scroll-area';
import { convertMinIOUrlToSecureUrl } from '@/lib/imageUtils';
import { cn, sanitizeUrl } from '@/lib/utils';

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
    applicantId?: string; // For permission checking
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
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Always call hooks before any early returns
  const canPreview = useMemo(() => (file ? canPreviewFile(file.fileName) : false), [file]);
  const isImage = useMemo(() => (file ? /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.fileName) : false), [file]);
  const isPdf = useMemo(() => (file ? /\.pdf$/i.test(file.fileName) : false), [file]);

  // Reset PDF loading state when file changes
  useEffect(() => {
    if (file && isPdf) {
      setPdfLoadError(false);
      setPdfLoading(true);
    }
  }, [file?.fileName, isPdf]);

  // Build preview URL properly
  const previewUrl = useMemo(() => {
    if (!file) return '';
    if (file.filePath) {
      // Use filePath to build preview URL
      const params = new URLSearchParams({ filePath: file.filePath });
      if (file.fileName) params.set('fileName', file.fileName);
      if (file.applicantId) params.set('applicantId', file.applicantId);
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

  const handleViewInNewTab = () => {
    // Use the application's preview URL instead of direct S3/MinIO URLs
    if (previewUrl) {
      const safeUrl = sanitizeUrl(previewUrl);
      if (safeUrl) {
        window.open(safeUrl, '_blank', 'noopener,noreferrer');
      } else {
        console.error('Invalid preview URL');
      }
    } else if (file?.url) {
      // Fallback: try to convert stream URL to preview URL
      const url = file.url.includes('/api/secure-file/stream')
        ? file.url.replace('/api/secure-file/stream', '/api/secure-file/preview')
        : file.url.includes('/api/secure-file/preview')
          ? file.url
          : file.url;
      const safeUrl = sanitizeUrl(url);
      if (safeUrl) {
        window.open(safeUrl, '_blank', 'noopener,noreferrer');
      } else {
        console.error('Invalid fallback URL');
      }
    } else {
      console.error('No URL available to open in new tab');
    }
  };

  if (isMobile && isOpen) {
    if (!file) return null;

    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col w-full h-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="-ml-2 border-none shadow-none hover:bg-transparent focus:ring-0">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="min-w-0">
              <h3 className="font-semibold truncate text-sm">{file.fileName}</h3>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleViewInNewTab}>
            <ExternalLink className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto bg-muted/10 p-2">
          {canPreview ? (
            <div className="h-full rounded-lg overflow-hidden flex flex-col">
              {isImage ? (
                <div className="flex-1 flex items-center justify-center p-4">
                  <img
                    src={sanitizeUrl(previewUrl)}
                    alt={file.fileName}
                    className="max-w-full max-h-full object-contain"
                    onClick={handleViewInNewTab}
                  />
                </div>
              ) : isPdf ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-background">
                  <FileTextIcon className="w-16 h-16 text-red-500 mb-4" />
                  <h4 className="text-lg font-semibold mb-2">PDF Document</h4>
                  <p className="text-muted-foreground mb-6">PDF preview is optimized for desktop. Please open the file to view it.</p>
                  <Button onClick={handleViewInNewTab} size="lg" className="w-full max-w-xs">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open PDF
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <p>Preview not available</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <FileIcon className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">This file type cannot be previewed.</p>
              <Button onClick={handleViewInNewTab} className="mt-4">Download / View</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!file) return null;


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col p-0 gap-0",
          isMobile
            ? "fixed inset-0 w-screen h-[100dvh] max-w-none m-0 rounded-none border-0"
            : "max-w-[95vw] w-[95vw] h-[95vh] max-h-[95vh] rounded-xl"
        )}
        dialogId="file-viewer-modal"
      >
        <DialogHeader className={cn(
          "flex-shrink-0 border-b relative",
          isMobile ? "p-4" : "p-6 pb-2 border-none"
        )}>
          {/* Close button for desktop - positioned top right */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-muted"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          )}
          <DialogTitle className="flex items-center gap-3 pr-12">
            {getFileIcon(file.fileName)}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate text-left">{file.fileName}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
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
          <DialogDescription className="text-left sr-only">
            Preview {file.fileName}
          </DialogDescription>
        </DialogHeader>

        <div className={cn(
          "flex-1 min-h-0 overflow-hidden bg-muted/10",
          isMobile ? "p-0" : "px-6"
        )}>
          {canPreview ? (
            <div className="h-full overflow-hidden flex flex-col">
              {isImage ? (
                <div className="h-full flex items-center justify-center p-4">
                  <img
                    src={sanitizeUrl(previewUrl)}
                    alt={file.fileName}
                    className="max-w-full max-h-full object-contain shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={handleViewInNewTab}
                    onError={(e) => {
                      console.error('Failed to load image preview:', previewUrl);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                    title="Click to open in new tab"
                  />
                </div>
              ) : isPdf ? (
                <div className="relative w-full h-full">
                  {pdfLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  )}
                  {pdfLoadError ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                      <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                      <p>Unable to load PDF</p>
                      <Button variant="link" onClick={handleViewInNewTab}>Open externally</Button>
                    </div>
                  ) : (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full border-0"
                      title={file.fileName}
                      onLoad={() => setPdfLoading(false)}
                      onError={() => {
                        setPdfLoading(false);
                        setPdfLoadError(true);
                      }}
                    />
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <FileIcon className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">This file type cannot be previewed.</p>
              <Button onClick={handleViewInNewTab} className="mt-4">Download / View</Button>
            </div>
          )}
        </div>

        <DialogFooter className={cn(
          "flex-shrink-0 flex items-center justify-between border-t bg-background",
          isMobile ? "p-4" : "p-6 pt-2 border-none"
        )}>
          <div className="text-xs text-muted-foreground hidden sm:block">
            {file.updatedAt && (
              <span>Updated: {new Date(file.updatedAt).toLocaleString()}</span>
            )}
          </div>
          <div className={cn("flex gap-2 w-full sm:w-auto", isMobile ? "justify-between" : "")}>
            <Button
              variant="outline"
              onClick={handleViewInNewTab}
              className="flex items-center gap-2 flex-1 sm:flex-none justify-center"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="truncate">Open In New Tab</span>
            </Button>
            {isMobile && (
              <Button onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">Close</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 