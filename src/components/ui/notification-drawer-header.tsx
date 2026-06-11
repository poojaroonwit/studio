"use client";

import { Bell, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function NotificationDrawerHeader({
  isMobile,
  onClose,
}: {
  isMobile: boolean;
  onClose: () => void;
}) {
  return (
    <div className={cn(
      '!flex !flex-row !items-center !justify-between border-b px-6 py-4 bg-card !text-left !space-y-0 rounded-t-lg',
      isMobile && 'px-4'
    )}>
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-foreground" />
        <h2 className={cn('text-lg font-semibold text-foreground', isMobile && 'text-base')}>
          Notifications
        </h2>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Close notifications"
        onClick={onClose}
        className="ml-2"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
