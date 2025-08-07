"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Calendar, User, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Position } from '@/lib/types';

interface ReprocessModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  candidatePositionId?: string | null;
  attachments: Array<{
    id: string;
    fileName: string;
    filePath: string;
    uploadedAt: string;
    fileSize: number;
    type: string;
  }>;
  positions: Position[];
}

export default function ReprocessModal({
  isOpen,
  onOpenChange,
  candidateId,
  candidateName,
  candidatePositionId,
  attachments,
  positions
}: ReprocessModalProps) {
  const [selectedAttachment, setSelectedAttachment] = useState<string>('');
  const [selectedPositionId, setSelectedPositionId] = useState<string>(candidatePositionId || '');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAttachment('');
      setSelectedPositionId(candidatePositionId || '');
    }
  }, [isOpen, candidatePositionId]);

  const handleReprocess = async () => {
    if (!selectedAttachment) {
      toast.error('Please select an attachment to re-process');
      return;
    }

    if (!selectedPositionId) {
      toast.error('Please select a position to apply for');
      return;
    }

    // Check if candidate has no applied position and warn user
    if (!candidatePositionId && !selectedPositionId) {
      toast.error('Please select a position to apply for. The candidate currently has no applied position.');
      return;
    }

    const attachment = attachments.find(att => att.id === selectedAttachment);
    if (!attachment) {
      toast.error('Selected attachment not found');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/upload-queue/blocking-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: attachment.filePath,
          file_name: attachment.fileName,
          file_size: attachment.fileSize,
          position_id: selectedPositionId,
          candidate_id: candidateId,
          request_type: 'update',
          source: 'reprocess'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to re-process attachment');
      }

      const result = await response.json();
      
      if (result.job?.status === 'success') {
        toast.success('Attachment re-processed successfully');
        onOpenChange(false);
      } else {
        toast.error(`Re-processing failed: ${result.job?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Re-process error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to re-process attachment');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Re-process Attachment
          </DialogTitle>
          <DialogDescription>
            Select an attachment to re-process with updated data. This will send the file to the webhook with request_type "update".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Candidate Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Candidate Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{candidateName}</span>
                <Badge variant="outline" className="text-xs">ID: {candidateId}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Attachment Selection */}
          <div className="space-y-3">
            <Label htmlFor="attachment-select">Select Attachment</Label>
            <Select value={selectedAttachment} onValueChange={setSelectedAttachment}>
              <SelectTrigger id="attachment-select">
                <SelectValue placeholder="Choose an attachment to re-process..." />
              </SelectTrigger>
              <SelectContent>
                {attachments.map((attachment) => (
                  <SelectItem key={attachment.id} value={attachment.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{attachment.fileName}</span>
                      <Badge variant="outline" className="text-xs">
                        {formatFileSize(attachment.fileSize)}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedAttachment && (
              <Card className="mt-3">
                <CardContent className="pt-4">
                  {(() => {
                    const attachment = attachments.find(att => att.id === selectedAttachment);
                    if (!attachment) return null;
                    
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{attachment.fileName}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-4">
                              <span>{formatFileSize(attachment.fileSize)}</span>
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
                            // Download the file
                            const link = document.createElement('a');
                            link.href = attachment.filePath;
                            link.download = attachment.fileName;
                            link.click();
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
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
            {!candidatePositionId && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">No Applied Position</p>
                  <p>This candidate currently has no applied position. Please select a position to apply for.</p>
                </div>
              </div>
            )}
            <Select value={selectedPositionId} onValueChange={setSelectedPositionId}>
              <SelectTrigger id="position-select">
                <SelectValue placeholder="Select position to apply for..." />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => (
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
              </SelectContent>
            </Select>

            {selectedPositionId && (
              <Card className="mt-3">
                <CardContent className="pt-4">
                  {(() => {
                    const position = positions.find(pos => pos.id === selectedPositionId);
                    if (!position) return null;
                    
                    return (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{position.title}</div>
                          {position.department && (
                            <div className="text-sm text-muted-foreground">{position.department}</div>
                          )}
                        </div>
                        <Badge variant="secondary">Selected</Badge>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Re-processing will:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Send the selected attachment to the webhook with request_type "update"</li>
                <li>Update the candidate's information based on the new processing</li>
                <li>This may overwrite existing parsed data</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={handleReprocess} 
            disabled={!selectedAttachment || !selectedPositionId || isProcessing}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-process Attachment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
