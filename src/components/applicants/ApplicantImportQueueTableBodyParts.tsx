"use client";

import { Checkbox } from '@/components/ui/checkbox';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import {
  InformationCircleIcon as Info,
} from '@heroicons/react/24/outline';

import { cn } from '@/lib/utils';
import {
  calculateUploadQueueDuration,
  formatUploadQueueDate,
  formatUploadQueueFileSize,
} from './applicant-import-queue-utils';
import type { QueueItem } from './applicant-import-queue-types';
import { ApplicantImportQueueRowActionMenu } from './ApplicantImportQueueRowActionMenu';
import type { ApplicantImportQueueRowActions } from './ApplicantImportQueueTableBodyTypes';
import {
  ApplicantImportQueueSourceCell,
  ApplicantImportQueueStatusBadge,
} from './ApplicantImportQueueTableRowCells';

interface ApplicantImportQueueTableRowProps extends ApplicantImportQueueRowActions {
  item: QueueItem;
  isSelected: boolean;
}

export function ApplicantImportQueueEmptyTableBody() {
  return (
    <TableBody>
      <TableRow>
        <TableCell colSpan={12} className="text-center py-8">
          <div className="flex flex-col items-center gap-2">
            <Info className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No queue items found</p>
          </div>
        </TableCell>
      </TableRow>
    </TableBody>
  );
}

export function ApplicantImportQueueTableRow({
  item,
  isSelected,
  onDeleteItem,
  onPreviewFile,
  onRetryItem,
  onSelectItem,
  onShowDetails,
}: ApplicantImportQueueTableRowProps) {
  return (
    <TableRow
      className={cn(
        "transition-colors hover:bg-muted/50",
        isSelected && "bg-muted/30",
      )}
    >
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelectItem(item.id)}
        />
      </TableCell>
      <TableCell className="font-mono text-xs">{item.id.slice(0, 8)}...</TableCell>
      <TableCell className="font-medium">{item.file_name}</TableCell>
      <TableCell>{item.position_title || '-'}</TableCell>
      <TableCell>
        <ApplicantImportQueueSourceCell item={item} />
      </TableCell>
      <TableCell>{formatUploadQueueFileSize(item.file_size)}</TableCell>
      <TableCell>
        <ApplicantImportQueueStatusBadge status={item.status} />
      </TableCell>
      <TableCell>{formatUploadQueueDate(item.upload_date)}</TableCell>
      <TableCell>{item.process_date ? formatUploadQueueDate(item.process_date) : '-'}</TableCell>
      <TableCell>{item.completed_date ? formatUploadQueueDate(item.completed_date) : '-'}</TableCell>
      <TableCell>{calculateUploadQueueDuration(item.process_date, item.completed_date)}</TableCell>
      <TableCell className="text-right">
        <ApplicantImportQueueRowActionMenu
          item={item}
          onDeleteItem={onDeleteItem}
          onPreviewFile={onPreviewFile}
          onRetryItem={onRetryItem}
          onShowDetails={onShowDetails}
        />
      </TableCell>
    </TableRow>
  );
}
