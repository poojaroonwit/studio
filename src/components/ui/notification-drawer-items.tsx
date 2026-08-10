"use client";

import { Bell, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { UnreadNotificationsPanelProps } from './notification-drawer-types';
import { NotificationEmptyState } from './notification-drawer-states';
import {
  formatNotificationRelativeTime,
  getNotificationAnimationDelay,
  type NotificationDisplayItem,
} from './notification-utils';

export function UnreadNotificationsPanel({
  notifications,
  markingAllAsRead,
  markingAsRead,
  onMarkAllAsRead,
  onMarkAsRead,
}: UnreadNotificationsPanelProps) {
  if (notifications.length === 0) {
    return (
      <NotificationEmptyState
        title="No unread notifications"
        description="You're all caught up!"
      />
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMarkAllAsRead}
          className="text-xs mr-2"
          disabled={markingAllAsRead}
        >
          {markingAllAsRead ? <div className="animate-spin h-4 w-4 mr-1" /> : 'Mark all read'}
        </Button>
      </div>
      {notifications.map((notification, index) => (
        <NotificationRow
          key={notification.id}
          notification={notification}
          index={index}
          isUnread
          markingAsRead={markingAsRead}
          onMarkAsRead={onMarkAsRead}
        />
      ))}
    </>
  );
}

export function ReadNotificationsPanel({ notifications }: { notifications: NotificationDisplayItem[] }) {
  if (notifications.length === 0) {
    return (
      <NotificationEmptyState
        title="No read notifications"
        description="Read notifications will appear here."
      />
    );
  }

  return (
    <>
      {notifications.map((notification, index) => (
        <NotificationRow
          key={notification.id}
          notification={notification}
          index={index}
          isUnread={false}
        />
      ))}
    </>
  );
}

function NotificationRow({
  notification,
  index,
  isUnread,
  markingAsRead,
  onMarkAsRead,
}: {
  notification: NotificationDisplayItem;
  index: number;
  isUnread: boolean;
  markingAsRead?: string | null;
  onMarkAsRead?: (notificationId: string) => void;
}) {
  return (
    <div
      className={cn(
        'notification-item flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md mb-2',
        isUnread
          ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-300'
          : 'bg-card opacity-60 border-border'
      )}
      style={{ animationDelay: getNotificationAnimationDelay(index) }}
    >
      <div className="flex-shrink-0 mt-1">
        <Bell className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium leading-tight text-foreground">
            {notification.title}
          </h4>
          {isUnread && <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1 unread-notification-pulse" />}
        </div>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          {notification.message}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {formatNotificationRelativeTime(notification.createdAt)}
          </span>
          {isUnread && onMarkAsRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              className="h-6 px-3 text-xs hover:bg-primary/10 ml-2"
              disabled={markingAsRead === notification.id}
            >
              {markingAsRead === notification.id ? (
                <div className="animate-spin h-3 w-3 mr-1" />
              ) : (
                <Check className="h-3 w-3 mr-1" />
              )}
              Mark read
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
