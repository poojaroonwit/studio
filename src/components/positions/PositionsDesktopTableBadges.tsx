import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { PositionHeadcount } from './PositionsDesktopTableTypes';

export function PositionHeadcountBadge({
  headcount,
  isLoading,
}: {
  headcount?: PositionHeadcount;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!headcount) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <div className="flex items-center justify-center">
      <Badge
        className={cn(
          'text-xs px-2 py-0.5',
          headcount.filled === 0 && headcount.total === 0
            ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
            : headcount.filled >= headcount.total
              ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
              : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
        )}
      >
        {headcount.filled}/{headcount.total}
      </Badge>
    </div>
  );
}

export function ApplicantStatBadge({
  count,
  activeClassName,
}: {
  count: number;
  activeClassName: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center px-2 py-1 text-sm font-medium rounded-md',
        count > 0 ? activeClassName : 'bg-muted text-muted-foreground'
      )}
    >
      {count}
    </span>
  );
}
