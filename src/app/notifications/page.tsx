"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

import { HrisUnifiedTaskInbox } from "@/components/hris/HrisUnifiedTaskInbox";
import {
  ReadNotificationsPanel,
  UnreadNotificationsPanel,
} from "@/components/ui/notification-drawer-items";
import {
  NotificationEmptyState,
  NotificationLoadingState,
} from "@/components/ui/notification-drawer-states";
import { NotificationTabs } from "@/components/ui/notification-drawer-tabs";
import type { NotificationDrawerTab } from "@/components/ui/notification-drawer-types";
import { getNotificationBuckets, hasNotificationItems } from "@/components/ui/notification-utils";
import { useNotifications } from "@/contexts/NotificationContext";
import { useToastManager } from "@/hooks/use-toast-manager";

export default function NotificationsPage() {
  const { notifications, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const { success: showSuccessToast, error: showErrorToast } = useToastManager();
  const [activeTab, setActiveTab] = useState<NotificationDrawerTab>("unread");
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

  const { unreadNotifications, readNotifications } = getNotificationBuckets(notifications);
  const hasNotifications = hasNotificationItems(unreadNotifications, readNotifications);

  const handleMarkAsRead = async (notificationId: string) => {
    setMarkingAsRead(notificationId);
    try {
      await markAsRead(notificationId);
      showSuccessToast("Notification marked as read");
    } catch {
      showErrorToast("Failed to mark notification as read");
    } finally {
      setMarkingAsRead(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAllAsRead(true);
    try {
      await markAllAsRead();
      showSuccessToast("All notifications marked as read");
    } catch {
      showErrorToast("Failed to mark all notifications as read");
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-2 sm:px-6 sm:pt-4">
      <section className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Updates, approvals, requests, and activity that need your attention.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <div className="px-4 pb-5 pt-4 sm:px-5">
          {isLoading ? (
            <NotificationLoadingState />
          ) : !hasNotifications ? (
            <NotificationEmptyState
              title="No notifications"
              description="You're all caught up! New notifications will appear here."
            />
          ) : (
            <div className="w-full">
              <NotificationTabs
                activeTab={activeTab}
                readCount={readNotifications.length}
                unreadCount={unreadNotifications.length}
                onTabChange={setActiveTab}
              />
              {activeTab === "unread" ? (
                <UnreadNotificationsPanel
                  notifications={unreadNotifications}
                  markingAllAsRead={markingAllAsRead}
                  markingAsRead={markingAsRead}
                  onMarkAllAsRead={handleMarkAllAsRead}
                  onMarkAsRead={handleMarkAsRead}
                />
              ) : (
                <ReadNotificationsPanel notifications={readNotifications} />
              )}
            </div>
          )}

          <HrisUnifiedTaskInbox />
        </div>
      </section>
    </main>
  );
}
