"use client";

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeftIcon as ChevronLeft, ChevronRightIcon as ChevronRight } from '@heroicons/react/24/outline';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface ApplicantImportQueuePaginationProps {
  total: number;
  page: number;
  pageSize: number;
  openSelect: string | null;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setOpenSelect: (select: string | null) => void;
  fetchQueue: (page: number, pageSize: number) => void;
}

function getRangeLabel(total: number, page: number, pageSize: number) {
  if (total === 0) {
    return 'No queue items found';
  }

  const startItem = ((page - 1) * pageSize) + 1;
  const endItem = Math.min(page * pageSize, total);

  return `Showing ${startItem} to ${endItem} of ${total} queue items`;
}

function getPageLabel(total: number, page: number, pageSize: number) {
  if (total === 0) {
    return 'No pages';
  }

  return `Page ${page} of ${Math.ceil(total / pageSize)}`;
}

export function ApplicantImportQueuePagination({
  total,
  page,
  pageSize,
  openSelect,
  setPage,
  setPageSize,
  setOpenSelect,
  fetchQueue,
}: ApplicantImportQueuePaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const canGoPrevious = page > 1 && total > 0;
  const canGoNext = page < totalPages && total > 0;

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    fetchQueue(nextPage, pageSize);
  };

  return (
    <div className="p-4 border-t">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {getRangeLabel(total, page, pageSize)}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Items per page:</span>
            <Select
              value={pageSize.toString()}
              open={openSelect === 'pageSize'}
              onOpenChange={(open) => setOpenSelect(open ? 'pageSize' : null)}
              onValueChange={(value: string) => {
                const nextPageSize = parseInt(value, 10);
                setPageSize(nextPageSize);
                setPage(1);
                fetchQueue(1, nextPageSize);
              }}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={() => goToPage(Math.max(1, page - 1))}
            disabled={!canGoPrevious}
            variant="ghost"
            size="sm"
            className="h-8 px-3 hover:bg-muted/50 transition-colors duration-200"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground mr-2" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground min-w-[80px] text-center">
            {getPageLabel(total, page, pageSize)}
          </span>

          <Button
            onClick={() => goToPage(Math.min(totalPages, page + 1))}
            disabled={!canGoNext}
            variant="ghost"
            size="sm"
            className="h-8 px-3 hover:bg-muted/50 transition-colors duration-200"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
