"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DocumentTextIcon as FileText, ArrowDownTrayIcon as Download, CalendarIcon as Calendar, UserIcon as User, ArrowPathIcon as Loader2, ArrowPathIcon as RefreshCw, ExclamationCircleIcon as AlertCircle, MagnifyingGlassIcon as Search, EyeIcon as Eye, XMarkIcon as X, ArrowsPointingOutIcon as Maximize2 } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import type { Position } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeUrl } from '@/lib/utils';

interface ReprocessModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  applicantId: string;
  applicantName: string;
  applicantPositionId?: string | null;
  applicantSourceId?: string | null;
  attachments: Array<{
    id: string;
    fileName: string;
    filePath: string;
    uploadedAt: string;
    label?: string;
    isPrimary?: boolean;
    url: string;
  }>;
  positions: Position[];
}

export default function ReprocessModal({
  isOpen,
  onOpenChange,
  applicantId,
  applicantName,
  applicantPositionId,
  applicantSourceId,
  attachments,
  positions
}: ReprocessModalProps) {
  const [selectedAttachment, setSelectedAttachment] = useState<string>('');
  const [selectedPositionId, setSelectedPositionId] = useState<string>(applicantPositionId || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [positionSearchTerm, setPositionSearchTerm] = useState('');
  const [previewMode, setPreviewMode] = useState<'thumbnail' | 'fullscreen'>('thumbnail');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchFocusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const modalIsolationRef = useRef<boolean>(false);

  // Helper function to check if file is PDF
  const isPDFFile = (fileName: string) => {
    return fileName.toLowerCase().endsWith('.pdf');
  };

  // Filter valid attachments (must have required fields)
  const validAttachments = attachments.filter(att => {
    // Check if attachment has the required fields
    const hasRequiredFields = att.id && att.fileName && att.filePath;



    return hasRequiredFields;
  });



  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAttachment('');
      setSelectedPositionId(applicantPositionId || '');
      setIsProcessing(false); // Reset processing state when modal opens
      setPositionSearchTerm(''); // Reset search term when modal opens
      setPreviewMode('thumbnail'); // Reset preview mode when modal opens
      setIsPreviewLoading(false); // Reset loading state when modal opens
    }
  }, [isOpen, applicantPositionId, positions, isProcessing]);

  // Prevent parent component refreshes from affecting modal content
  useEffect(() => {
    if (isOpen) {
      modalIsolationRef.current = true;

      // Prevent any external refresh mechanisms from affecting the modal
      const preventRefresh = (e: Event) => {
        if (modalIsolationRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };

      // Add event listeners to prevent refresh events
      document.addEventListener('visibilitychange', preventRefresh);
      document.addEventListener('beforeunload', preventRefresh);

      // Disable any parent component refresh mechanisms while modal is open
      const originalConsoleLog = console.log;
      console.log = (...args) => {
        // Filter out SSE refresh logs that might cause re-renders
        if (args[0] && typeof args[0] === 'string' &&
          (args[0].includes('SSE refresh') || args[0].includes('periodic refresh'))) {
          return; // Suppress these logs to prevent re-renders
        }
        originalConsoleLog(...args);
      };

      return () => {
        modalIsolationRef.current = false;
        document.removeEventListener('visibilitychange', preventRefresh);
        document.removeEventListener('beforeunload', preventRefresh);
        console.log = originalConsoleLog;
      };
    }
  }, [isOpen]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (searchFocusTimeoutRef.current) {
        clearTimeout(searchFocusTimeoutRef.current);
      }
    };
  }, []);

  const handleReprocess = async () => {
    if (!selectedAttachment) {
      toast.error('Please select an attachment to re-process');
      return;
    }

    if (!selectedPositionId) {
      toast.error('Please select a position to apply for');
      return;
    }

    // Check if applicant has no applied position and warn user
    if (!applicantPositionId && !selectedPositionId) {
      toast.error('Please select a position to apply for. The applicant currently has no applied position.');
      return;
    }

    const attachment = validAttachments.find(att => att.id === selectedAttachment);
    if (!attachment) {
      toast.error('Selected attachment not found');
      return;
    }


    setIsProcessing(true);
    try {
      // Add file to upload queue instead of processing immediately
      const response = await fetch('/api/upload-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: attachment.filePath,
          file_name: attachment.fileName,
          file_size: 0, // Send as number for proper display
          status: 'queued',
          source: 'reprocess',
          upload_id: uuidv4(), // Generate a unique upload ID
          position_id: selectedPositionId,
          source_id: applicantSourceId, // Include applicant's source ID
          webhook_payload: {
            Applicant_id: applicantId,
            request_type: 'update',
            source: 'reprocess',
            attachment_id: attachment.id,
            sourceId: applicantSourceId // Include sourceId in webhook payload
          }
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to add file to processing queue';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (jsonError) {
          // If JSON parsing fails, try to get text response
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            // If both JSON and text parsing fail, use status text
            errorMessage = `${errorMessage} (Status: ${response.status} ${response.statusText})`;
          }
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.warn('Response is not JSON, treating as success:', jsonError);
        result = { success: true };
      }

      toast.success('File added to processing queue successfully');

      onOpenChange(false);
    } catch (error) {
      console.error('Re-process error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add file to processing queue');
    } finally {

      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dialogId="reprocess-modal">
        <DialogHeader>
          <DialogTitle>Re-process Attachment</DialogTitle>
          <DialogDescription>
            Re-process an attachment for applicant: <strong>{applicantName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Attachment Selection */}
          <div className="space-y-3">
            <Label htmlFor="attachment-select">Select Attachment</Label>
            <Select
              value={selectedAttachment}
              onValueChange={(value) => {
                setSelectedAttachment(value);
                // Automatically show preview for PDF files
                if (value) {
                  const attachment = validAttachments.find(att => att.id === value);
                  if (attachment && isPDFFile(attachment.fileName)) {
                    setPreviewMode('thumbnail');
                    setIsPreviewLoading(true); // Show loading state when switching attachments
                  }
                }
              }}
              disabled={false}
            >
              <SelectTrigger
                className="w-full"
                onClick={() => {

                }}
              >
                <SelectValue placeholder="Select an attachment to re-process..." />
              </SelectTrigger>
              <SelectContent>
                {validAttachments.map((attachment) => (
                  <SelectItem key={attachment.id} value={attachment.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{attachment.fileName}</span>
                      {attachment.isPrimary && (
                        <Badge variant="secondary" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedAttachment && (
              <Card className="mt-3">
                <CardContent className="pt-4">
                  {(() => {
                    const attachment = validAttachments.find(att => att.id === selectedAttachment);
                    if (!attachment) return null;

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{attachment.fileName}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-4">
                                {attachment.label && (
                                  <span className="text-xs bg-muted px-2 py-1 rounded">
                                    {attachment.label}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(attachment.uploadedAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const safeUrl = sanitizeUrl(attachment.url);
                              if (safeUrl) {
                                const link = document.createElement('a');
                                link.href = safeUrl;
                                link.download = attachment.fileName;
                                link.click();
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>

                        {/* PDF Preview */}
                        {isPDFFile(attachment.fileName) && (
                          <div className="border rounded-lg overflow-hidden bg-white">
                            <div className="h-96 relative">
                              {isPreviewLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm text-muted-foreground">Loading preview...</span>
                                  </div>
                                </div>
                              )}
                              <iframe
                                ref={iframeRef}
                                key={`thumbnail-${attachment.id}`} // Stable key to prevent re-renders
                                src={sanitizeUrl(attachment.url.includes('/api/secure-file/stream')
                                  ? attachment.url.replace('/api/secure-file/stream', '/api/secure-file/preview')
                                  : attachment.url.includes('/api/secure-file/preview')
                                    ? attachment.url
                                    : attachment.url)}
                                className="w-full h-full"
                                title="PDF Preview"
                                loading="lazy"
                                sandbox="allow-same-origin allow-scripts"
                                onLoad={() => {
                                  setIsPreviewLoading(false);
                                  modalIsolationRef.current = true; // Mark modal as isolated
                                }}
                                onError={() => {
                                  console.warn('Failed to load PDF preview');
                                  setIsPreviewLoading(false);
                                }}
                                style={{
                                  border: 'none',
                                  outline: 'none',
                                  pointerEvents: 'auto', // Ensure iframe is interactive
                                  isolation: 'isolate' // CSS isolation to prevent parent updates
                                }}
                                data-modal-isolated="true" // Custom attribute for identification
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Position Selection */}
          <div className="space-y-3">
            <Label htmlFor="position-select">Applied Position</Label>

            <Select
              value={selectedPositionId}
              onValueChange={(value) => {

                setSelectedPositionId(value);
              }}
              disabled={false}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select position to apply for..." />
              </SelectTrigger>
              <SelectContent selectId="reprocess-position-select">
                <div className="flex items-center px-3 pb-2 border-b">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search positions..."
                    value={positionSearchTerm}
                    onChange={(e) => {
                      e.stopPropagation();
                      setPositionSearchTerm(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                    }}
                    onFocus={(e) => {
                      e.stopPropagation();
                    }}
                    onBlur={(e) => {
                      e.stopPropagation();
                      // Prevent the Select from closing when search input loses focus
                      const timeoutId = setTimeout(() => {
                        if (searchInputRef.current) {
                          searchInputRef.current.focus();
                        }
                      }, 0);

                      // Store timeout ID for cleanup
                      if (searchFocusTimeoutRef.current) {
                        clearTimeout(searchFocusTimeoutRef.current);
                      }
                      searchFocusTimeoutRef.current = timeoutId;
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {positions
                    .filter(position => {
                      if (!positionSearchTerm) return true;
                      const searchTerm = positionSearchTerm.toLowerCase();
                      return position.title.toLowerCase().includes(searchTerm) ||
                        (position.department && position.department.toLowerCase().includes(searchTerm));
                    })
                    .map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        <div className="flex items-center gap-2">
                          <span>{position.title}</span>
                          {position.department && (
                            <Badge variant="outline" className="text-xs">
                              {position.department}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </div>
              </SelectContent>
            </Select>
          </div>


        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleReprocess}
            disabled={!selectedAttachment || !selectedPositionId || isProcessing || validAttachments.length === 0}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding to Queue...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Add to Processing Queue
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* PDF Preview Fullscreen Modal */}
      {selectedAttachment && previewMode === 'fullscreen' && (() => {
        const attachment = validAttachments.find(att => att.id === selectedAttachment);
        if (!attachment || !isPDFFile(attachment.fileName)) return null;

        return (
          <Dialog open={previewMode === 'fullscreen'} onOpenChange={() => setPreviewMode('thumbnail')}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0" dialogId="reprocess-preview-modal">
              <DialogHeader className="sr-only">
                <DialogTitle>{attachment.fileName}</DialogTitle>
                <DialogDescription>PDF Preview</DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-red-500" />
                  <div>
                    <h3 className="font-medium">{attachment.fileName}</h3>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Use application preview URL instead of direct S3/MinIO URLs
                      let previewUrl = attachment.url;
                      if (attachment.filePath) {
                        // Build preview URL from filePath (preferred method)
                        const params = new URLSearchParams({ filePath: attachment.filePath });
                        if (attachment.fileName) params.set('fileName', attachment.fileName);
                        if (applicantId) params.set('applicantId', applicantId);
                        previewUrl = `/api/secure-file/preview?${params.toString()}`;
                      } else if (attachment.url.includes('/api/secure-file/stream')) {
                        // Convert stream URL to preview URL
                        previewUrl = attachment.url.replace('/api/secure-file/stream', '/api/secure-file/preview');
                      } else if (attachment.url.includes('/api/secure-file/preview')) {
                        // Already a preview URL, use as is
                        previewUrl = attachment.url;
                      }
                      // If it's a direct S3/MinIO URL, we'll use it as fallback (attachment.url)
                      const safePreviewUrl = sanitizeUrl(previewUrl);
                      if (safePreviewUrl) {
                        window.open(safePreviewUrl, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Open in Browser
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewMode('thumbnail')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <iframe
                  key={`fullscreen-${attachment.id}`}
                  src={sanitizeUrl(attachment.url.includes('/api/secure-file/stream')
                    ? attachment.url.replace('/api/secure-file/stream', '/api/secure-file/preview')
                    : attachment.url.includes('/api/secure-file/preview')
                      ? attachment.url
                      : attachment.url)}
                  className="w-full h-[calc(90vh-80px)]"
                  title="PDF Preview"
                  allow="fullscreen"
                  onLoad={() => {
                    modalIsolationRef.current = true;
                  }}
                  onError={() => {
                    console.warn('Failed to load PDF preview in fullscreen');
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </Dialog>
  );
}
