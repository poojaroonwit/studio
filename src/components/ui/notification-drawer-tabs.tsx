"use client";

import type { ReactNode } from 'react';
import { Bell, Check } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getUnderlineNavTriggerClassName } from '@/components/ui/underline-nav';

import type { NotificationDrawerTab, NotificationTabsProps } from './notification-drawer-types';
import { formatNotificationBadgeCount } from './notification-utils';

export function NotificationTabs({
  activeTab,
  readCount,
  unreadCount,
  onTabChange,
}: NotificationTabsProps) {
  return (
    <div className="flex w-full border-b border-border/50 mb-2">
      <NotificationTabButton
        active={activeTab === 'unread'}
        count={unreadCount}
        icon={<Bell className="h-4 w-4" />}
        label="Unread"
        tab="unread"
        variant="destructive"
        onTabChange={onTabChange}
      />
      <NotificationTabButton
        active={activeTab === 'read'}
        count={readCount}
        icon={<Check className="h-4 w-4" />}
        label="Read"
        tab="read"
        variant="secondary"
        onTabChange={onTabChange}
      />
    </div>
  );
}

function NotificationTabButton({
  active,
  count,
  icon,
  label,
  tab,
  variant,
  onTabChange,
}: {
  active: boolean;
  count: number;
  icon: ReactNode;
  label: string;
  tab: NotificationDrawerTab;
  variant: 'destructive' | 'secondary';
  onTabChange: (tab: NotificationDrawerTab) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onTabChange(tab)}
      className={cn(
        getUnderlineNavTriggerClassName(active),
        'px-6 py-3',
      )}
    >
      {icon}
      {label}
      {count > 0 && (
        <Badge variant={variant} className="h-5 min-w-5 rounded-full px-1.5 text-xs flex items-center justify-center ml-1">
          {formatNotificationBadgeCount(count)}
        </Badge>
      )}
    </button>
  );
}
