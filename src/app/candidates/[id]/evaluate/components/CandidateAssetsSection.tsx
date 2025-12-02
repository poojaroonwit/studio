"use client";

import React from 'react';
import { Folder, GripVertical, FileX } from 'lucide-react';
import { AttachmentThumbnailButton } from './AttachmentThumbnailButton';
import { isImageFile, buildPreviewUrl } from '../utils';

interface CandidateAssetsSectionProps {
  attachments: any[];
  candidateId: string;
  canEditAttachments: boolean;
  onFileSelect: (file: any) => void;
  onDeleteAttachment: (attachmentId: string) => void;
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
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 sm:gap-1.5">
        {(attachments && attachments.length > 0 ? attachments : []).map((att: any) => {
          const isImage = isImageFile(att.fileName);
          const thumbnailUrl = isImage ? buildPreviewUrl(att, candidateId, true) : null;
          
          return (
            <AttachmentThumbnailButton
              key={att.id}
              attachment={att}
              thumbnailUrl={thumbnailUrl}
              isImage={isImage}
              candidateId={candidateId}
              onSelect={() => {
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
              onDelete={onDeleteAttachment}
              canDelete={canEditAttachments}
            />
          );
        })}
        {(!attachments || attachments.length === 0) && (
          <div className="col-span-full">
            <div className="h-20 rounded-md border-dashed border-2 bg-muted/20 flex flex-col items-center justify-center gap-1">
              <FileX className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">No attachment files available for this candidate</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

