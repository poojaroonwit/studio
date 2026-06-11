"use client";

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FitScoreSmoothCount } from './FitScoreSmoothCount';

interface FitScoreFilterTabButtonProps {
  active: boolean;
  activeClassName: string;
  count: number;
  inactiveClassName: string;
  label: string;
  onClick: () => void;
}

export function FitScoreFilterTabButton({
  active,
  activeClassName,
  count,
  inactiveClassName,
  label,
  onClick,
}: FitScoreFilterTabButtonProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-1.5 py-2 text-xs font-medium transition-all duration-200 relative cursor-pointer rounded-t-lg',
        active ? activeClassName : inactiveClassName,
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
    >
      {label}
      <Badge
        variant="secondary"
        className="ml-1 text-xs px-1 py-0.5 h-4 min-w-4 flex items-center justify-center text-foreground transition-all duration-200"
      >
        <FitScoreSmoothCount count={count} />
      </Badge>
    </div>
  );
}
