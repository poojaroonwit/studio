import { Loader2 } from 'lucide-react';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface PageLoadingStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  message: string;
  spinnerClassName?: string;
}

export function PageLoadingState({
  className,
  message,
  spinnerClassName,
  ...props
}: PageLoadingStateProps) {
  return (
    <div
      {...props}
      className={cn(
        'flex h-full min-h-[12rem] flex-col items-center justify-center gap-4 text-center',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        aria-hidden="true"
        className={cn('h-8 w-8 animate-spin text-primary', spinnerClassName)}
      />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
