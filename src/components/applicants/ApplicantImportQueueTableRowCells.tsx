"use client";

import {
  PhotoIcon as ImageIcon,
} from '@heroicons/react/24/outline';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { convertMinIOUrlToSecureUrl } from '@/lib/imageUtils';
import {
  getUploadQueueStatusBadgeVariant,
  getUploadQueueStatusDisplayText,
} from './applicant-import-queue-utils';
import type { QueueItem } from './applicant-import-queue-types';

export function ApplicantImportQueueSourceCell({ item }: { item: QueueItem }) {
  return (
    <div className="flex items-center gap-2">
      {item.source_logo ? (
        <img
          src={convertMinIOUrlToSecureUrl(item.source_logo) || item.source_logo}
          alt={`${item.source_name} logo`}
          className="h-5 w-5 object-contain rounded-full flex-shrink-0"
        />
      ) : (
        <div className="h-5 w-5 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
          <ImageIcon className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground truncate">
          {item.source_name || '-'}
        </div>
        {item.sub_source && (
          <div className="text-xs text-muted-foreground">
            {item.sub_source}
          </div>
        )}
      </div>
    </div>
  );
}

export function ApplicantImportQueueStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={getUploadQueueStatusBadgeVariant(status)}
      className={cn(
        "font-medium",
        status === 'queued' && "bg-blue-100 text-blue-800 border-blue-200",
        status === 'inprocess' && "bg-yellow-100 text-yellow-800 border-yellow-200",
        status === 'success' && "bg-green-100 text-green-800 border-green-200",
        status === 'failed' && "bg-red-100 text-red-800 border-red-200",
      )}
    >
      {getUploadQueueStatusDisplayText(status)}
    </Badge>
  );
}
