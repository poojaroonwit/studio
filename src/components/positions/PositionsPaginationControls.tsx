import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';

interface PositionsPaginationControlsProps {
  isMobile: boolean;
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function PositionsPaginationControls({
  isMobile,
  page,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PositionsPaginationControlsProps) {
  if (total <= 0 && totalPages <= 0) return null;

  return (
    <div className="p-4 border-t bg-background flex-shrink-0">
      {isMobile ? (
        <div className="flex flex-col items-center gap-2">
          {page < totalPages ? (
            <>
              <div className="text-sm text-muted-foreground text-center">
                Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of {total} positions
              </div>
              <Button
                onClick={() => onPageChange(page + 1)}
                variant="outline"
                className="w-full max-w-xs h-12 text-base font-medium active:scale-95 touch-manipulation"
              >
                See More
                <ChevronDown className="h-5 w-5 ml-2" />
              </Button>
            </>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-2">
              Showing all {total} positions
            </div>
          )}
        </div>
      ) : (
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, totalPages)}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={[10, 20, 50, 100]}
          showPageSizeSelector={true}
        />
      )}
    </div>
  );
}
