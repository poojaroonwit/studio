import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function DetailsFieldRow({
  children,
  label,
  fieldId,
  isLast = false,
}: {
  children: ReactNode;
  label: string;
  fieldId: string;
  isLast?: boolean;
}) {
  return (
    <div className={cn(
      'flex flex-col md:flex-row md:items-center gap-2 md:gap-6 py-2',
      !isLast && 'border-b border-border/30',
    )}>
      <Label htmlFor={fieldId} className="md:w-1/3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      <div className="flex-1">{children}</div>
    </div>
  );
}
