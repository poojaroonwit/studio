"use client";

import { ArrowPathIcon as Loader2 } from "@heroicons/react/24/outline";

import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApplicantImportQueueBulkActionBar } from "./ApplicantImportQueueBulkActionBar";
import { ApplicantImportQueueSortableHeader } from "./ApplicantImportQueueSortableHeader";
import { ApplicantImportQueueTableBody } from "./ApplicantImportQueueTableBody";
import type { QueueItem } from "./applicant-import-queue-types";

type SortDirection = "asc" | "desc" | null;

interface SortControls {
  sortField: string;
  sortDirection: SortDirection;
  openMenu: string | null;
  onSort: (column: string | null, direction?: SortDirection) => void;
  onMenuClick: (menu: string) => void;
  onMenuClose: () => void;
  onOpenChange: (menu: string) => (open: boolean) => void;
}

interface ApplicantImportUploadQueueTableProps {
  items?: QueueItem[];
  loading: boolean;
  selectedItems: Set<string>;
  selectionMode: "none" | "partial" | "all";
  sortControls: SortControls;
  onBulkDelete: (itemIds: string[]) => void;
  onBulkRetry: (itemIds: string[]) => void;
  onClearSelection: () => void;
  onDeleteItem: (itemId: string) => void;
  onPreviewFile: (item: QueueItem) => void;
  onRetryItem: (itemId: string) => void;
  onSelectAll: () => void;
  onSelectItem: (itemId: string) => void;
  onShowDetails: (item: QueueItem) => void;
}

const QUEUE_TABLE_HEADERS = [
  { field: "id", label: "ID" },
  { field: "file_name", label: "File Name" },
  { field: "position_title", label: "Position" },
  { field: "source_name", label: "Source" },
  { field: "file_size", label: "File Size" },
  { field: "status", label: "Status" },
  { field: "upload_date", label: "Create Date" },
  { field: "process_date", label: "Process Date" },
  { field: "completed_date", label: "Complete Date" },
  { field: "duration", label: "Duration" },
];

export function ApplicantImportUploadQueueTable({
  items,
  loading,
  selectedItems,
  selectionMode,
  sortControls,
  onBulkDelete,
  onBulkRetry,
  onClearSelection,
  onDeleteItem,
  onPreviewFile,
  onRetryItem,
  onSelectAll,
  onSelectItem,
  onShowDetails,
}: ApplicantImportUploadQueueTableProps) {
  return (
    <div className="border rounded-lg shadow-lg overflow-hidden relative bg-card/50 backdrop-blur-sm">
      {loading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading queue...</span>
          </div>
        </div>
      )}

      <ApplicantImportQueueBulkActionBar
        items={items}
        selectedItems={selectedItems}
        onRetry={onBulkRetry}
        onDelete={onBulkDelete}
        onClear={onClearSelection}
      />

      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectionMode === "all"}
                  ref={null}
                  onCheckedChange={onSelectAll}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </TableHead>
              {QUEUE_TABLE_HEADERS.map(({ field, label }) => (
                <ApplicantImportQueueSortableHeader
                  key={field}
                  field={field}
                  {...sortControls}
                >
                  {label}
                </ApplicantImportQueueSortableHeader>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <ApplicantImportQueueTableBody
            items={items}
            selectedItems={selectedItems}
            onSelectItem={onSelectItem}
            onPreviewFile={onPreviewFile}
            onShowDetails={onShowDetails}
            onRetryItem={onRetryItem}
            onDeleteItem={onDeleteItem}
          />
        </Table>
      </div>
    </div>
  );
}
