"use client";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import {
  formatUploadQueueDate,
  getUploadQueueApplicantProgressText,
  getUploadQueueProgressText,
  getUploadQueueStatusColor,
  getUploadQueueStatusDisplayText,
} from "./applicants/applicant-import-queue-utils";
import type { QueueItem } from "./applicants/applicant-import-queue-types";
import { UploadQueueStatusIcon } from "./UploadQueueStatusIcon";

interface UploadQueueDetailsDialogProps {
  item: QueueItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadQueueDetailsDialog({
  item,
  open,
  onOpenChange,
}: UploadQueueDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dialogId="upload-queue-details-modal">
        <DialogHeader>
          <DialogTitle>Queue Item Details</DialogTitle>
          <DialogDescription>Detailed information about the selected queue item</DialogDescription>
        </DialogHeader>

        {item && (
          <div className="space-y-4">
            <UploadQueueDetailGrid item={item} />
            <UploadQueueProgress item={item} />
            <UploadQueueApplicantProgress item={item} />
            <UploadQueueError item={item} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function UploadQueueDetailGrid({ item }: { item: QueueItem }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label className="text-sm font-medium">File Name</Label>
        <p className="text-sm">{item.file_name}</p>
      </div>
      <div>
        <Label className="text-sm font-medium">Status</Label>
        <div className="flex items-center space-x-2">
          <UploadQueueStatusIcon status={item.status} />
          <Badge className={getUploadQueueStatusColor(item.status)}>
            {getUploadQueueStatusDisplayText(item.status)}
          </Badge>
        </div>
      </div>
      <div>
        <Label className="text-sm font-medium">Upload Date</Label>
        <p className="text-sm">{formatUploadQueueDate(item.upload_date)}</p>
      </div>
      {item.process_date && (
        <div>
          <Label className="text-sm font-medium">Process Date</Label>
          <p className="text-sm">{formatUploadQueueDate(item.process_date)}</p>
        </div>
      )}
      {item.completed_date && (
        <div>
          <Label className="text-sm font-medium">Completed Date</Label>
          <p className="text-sm">{formatUploadQueueDate(item.completed_date)}</p>
        </div>
      )}
      {item.user_email && (
        <div>
          <Label className="text-sm font-medium">Uploaded By</Label>
          <p className="text-sm">{item.user_email}</p>
        </div>
      )}
    </div>
  );
}

function UploadQueueProgress({ item }: { item: QueueItem }) {
  if (item.progress === undefined) {
    return null;
  }

  return (
    <div>
      <Label className="text-sm font-medium">Progress</Label>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${item.progress}%` }}
        />
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        {getUploadQueueProgressText(item.progress)}
      </p>
    </div>
  );
}

function UploadQueueApplicantProgress({ item }: { item: QueueItem }) {
  if (item.processed_applicants === undefined || item.total_applicants === undefined) {
    return null;
  }

  return (
    <div>
      <Label className="text-sm font-medium">Applicants Processed</Label>
      <p className="text-sm">
        {getUploadQueueApplicantProgressText(item)}
      </p>
    </div>
  );
}

function UploadQueueError({ item }: { item: QueueItem }) {
  if (!item.error) {
    return null;
  }

  return (
    <div>
      <Label className="text-sm font-medium text-red-700">Error</Label>
      <p className="text-sm text-red-700 mt-1">{item.error}</p>
      {item.error_details && (
        <div className="mt-2">
          <Label className="text-sm font-medium text-red-700">Error Details</Label>
          <pre className="text-xs text-red-700 mt-1 p-2 bg-red-50 rounded overflow-auto">
            {item.error_details}
          </pre>
        </div>
      )}
    </div>
  );
}
