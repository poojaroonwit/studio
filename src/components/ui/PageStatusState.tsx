import type { ComponentType, ReactNode, SVGProps } from 'react';

import { cn } from '@/lib/utils';

type PageStatusStateSize = 'page' | 'embedded';

interface PageStatusStateProps {
  action?: ReactNode;
  className?: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  role?: 'alert' | 'status';
  size?: PageStatusStateSize;
  title: string;
}

export function PageStatusState({
  action,
  className,
  description,
  icon: Icon,
  role = 'status',
  size = 'page',
  title,
}: PageStatusStateProps) {
  const isEmbedded = size === 'embedded';

  return (
    <div
      className={cn(
        'flex h-full flex-col items-center justify-center text-center',
        isEmbedded ? 'min-h-[8rem] p-5' : 'min-h-[18rem] p-8',
        className,
      )}
      role={role}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          'text-muted-foreground',
          isEmbedded ? 'mb-3 h-10 w-10' : 'mb-5 h-[4.5rem] w-[4.5rem]',
        )}
        strokeWidth={1.5}
      />
      <h2 className={cn('font-semibold text-foreground', isEmbedded ? 'mb-1 text-sm' : 'mb-2 text-lg')}>
        {title}
      </h2>
      <p className={cn('max-w-md text-muted-foreground', isEmbedded && 'text-sm')}>
        {description}
      </p>
      {action && <div className={isEmbedded ? 'mt-3' : 'mt-5'}>{action}</div>}
    </div>
  );
}
