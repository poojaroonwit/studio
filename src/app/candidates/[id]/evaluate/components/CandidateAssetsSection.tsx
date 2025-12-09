"use client";

import React from 'react';
import { Folder, GripVertical, FileX, FileText, ImageIcon, FileIcon } from 'lucide-react';
import { isImageFile, isPdfFile } from '../utils';

interface CandidateAssetsSectionProps {
  attachments: any[];
  candidateId: string;
  canEditAttachments: boolean;
  onFileSelect: (file: any) => void;
  onDeleteAttachment: (attachmentId: string) => void;
}

// Helper function to get attachment display name
function getAttachmentName(att: any): string {
  return att.label || att.fileName || 'Attachment';
}

// Helper function to get file type badge
function getFileTypeBadge(fileName: string): string {
  if (isPdfFile(fileName)) return 'PDF';
  if (isImageFile(fileName)) return 'Image';
  const ext = fileName.split('.').pop()?.toUpperCase() || 'File';
  return ext;
}

// Helper function to get file icon with color
function getFileIcon(fileName: string): { icon: React.ReactNode; bgColor: string; textColor: string } {
  if (isPdfFile(fileName)) {
    return {
      icon: <FileText className="h-5 w-5" />,
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      textColor: 'text-red-500'
    };
  }
  if (isImageFile(fileName)) {
    return {
      icon: <ImageIcon className="h-5 w-5" />,
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      textColor: 'text-blue-500'
    };
  }
  return {
    icon: <FileIcon className="h-5 w-5" />,
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    textColor: 'text-gray-500'
  };
}

export function CandidateAssetsSection({
  attachments,
  candidateId,
  canEditAttachments,
  onFileSelect,
  onDeleteAttachment,
}: CandidateAssetsSectionProps) {
  return (
    <div>
      <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
        <GripVertical className="h-4 w-4 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" />
        <Folder className="h-4 w-4" />
        Candidate Asset
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
        {(attachments && attachments.length > 0 ? attachments : []).map((att: any) => {
          const fileInfo = getFileIcon(att.fileName);

          return (
            <div
              key={att.id}
              className="flex items-center gap-3 bg-background border border-border/50 rounded-xl p-3 pr-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow min-w-[220px] sm:min-w-[280px] flex-shrink-0"
              onClick={() => {
                onFileSelect({
                  fileName: att.fileName,
                  url: att.url,
                  filePath: att.filePath,
                  candidateId,
                  label: att.label,
                  updatedAt: att.updatedAt,
                  fileSize: att.fileSize
                });
              }}
            >
              <div className={`h-10 w-10 ${fileInfo.bgColor} rounded-lg flex items-center justify-center ${fileInfo.textColor} flex-shrink-0`}>
                {fileInfo.icon}
              </div>
              <div className="flex flex-col overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground truncate max-w-[120px] sm:max-w-[150px]">{getAttachmentName(att)}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground w-fit mt-1">
                  {getFileTypeBadge(att.fileName)}
                </span>
              </div>
            </div>
          );
        })}
        {(!attachments || attachments.length === 0) && (
          <div className="w-full">
            <div className="h-20 rounded-xl border-dashed border-2 bg-muted/20 flex flex-col items-center justify-center gap-1">
              <FileX className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">No attachment files available for this candidate</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

