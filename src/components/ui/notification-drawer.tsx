"use client";

import { useEffect, useState } from 'react';
import { X, Check, Trash2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/contexts/NotificationContext';
import { useToastManager } from '@/hooks/use-toast-manager';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationRead: () => void;
}

export function NotificationDrawer({ isOpen, onClose, onNotificationRead }: NotificationDrawerProps) {
  const { data: session } = useSession();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const { success: showSuccessToast, error: showErrorToast } = useToastManager();
  const [activeTab, setActiveTab] = useState('unread');
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  // Debug logging
  console.log('🔍 NotificationDrawer: Total notifications:', notifications.length);
  console.log('🔍 NotificationDrawer: Unread notifications:', unreadNotifications.length);
  console.log('🔍 NotificationDrawer: Read notifications:', readNotifications.length);
  console.log('🔍 NotificationDrawer: Sample notification:', notifications[0]);

  const handleMarkAsRead = async (notificationId: string) => {
    console.log('🔍 Mark as read clicked for notification:', notificationId);
    setMarkingAsRead(notificationId);
    try {
      await markAsRead(notificationId);
      console.log('✅ Mark as read completed for notification:', notificationId);
      showSuccessToast('Notification marked as read');
      // Call the onNotificationRead callback if provided
      if (onNotificationRead) {
        onNotificationRead();
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      showErrorToast('Failed to mark notification as read');
    } finally {
      setMarkingAsRead(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    console.log('🔍 Mark all as read clicked');
    setMarkingAllAsRead(true);
    try {
      await markAllAsRead();
      console.log('✅ Mark all as read completed');
      showSuccessToast('All notifications marked as read');
      // Call the onNotificationRead callback if provided
      if (onNotificationRead) {
        onNotificationRead();
      }
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      showErrorToast('Failed to mark all notifications as read');
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full max-w-md p-0 flex flex-col [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <SheetHeader className="!flex !flex-row !items-center !justify-between border-b px-6 py-4 bg-card !text-left !space-y-0">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-foreground" />
            <SheetTitle className="text-lg font-semibold text-foreground">Notifications</SheetTitle>
            
           
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        {/* Content */}
        <ScrollArea className="flex-1 bg-background">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No notifications
                </h3>
                <p className="text-sm text-muted-foreground">
                  You're all caught up! New notifications will appear here.
                </p>
              </div>
            ) : (
              <div className="w-full">
                <div className="flex w-full border-b border-border/50 mb-2">
                  <div
                    onClick={() => setActiveTab('unread')}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                      activeTab === 'unread'
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    <Bell className="h-4 w-4" />
                    Unread
                    {unreadNotifications.length > 0 && (
                      <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center ml-1">
                        {unreadNotifications.length}
                      </Badge>
                    )}
                  </div>
                  <div
                    onClick={() => setActiveTab('read')}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                      activeTab === 'read'
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    <Check className="h-4 w-4" />
                    Read
                    {readNotifications.length > 0 && (
                      <Badge variant="secondary" className="h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center ml-1">
                        {readNotifications.length}
                      </Badge>
                    )}
                  </div>
                </div>

                {activeTab === 'unread' && (
                  unreadNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">
                        No unread notifications
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        You're all caught up!
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-end mb-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleMarkAllAsRead}
                          className="text-xs mr-2"
                          disabled={markingAllAsRead}
                        >
                          {markingAllAsRead ? (
                            <div className="animate-spin h-4 w-4 mr-1" />
                          ) : (
                            "Mark all read"
                          )}
                        </Button>
                      </div>
                      {unreadNotifications.map((notification, index) => (
                        <div
                          key={notification.id}
                          className="notification-item flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-300 mb-2"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="flex-shrink-0 mt-1">
                            <Bell className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-medium leading-tight text-foreground">
                                {notification.title}
                              </h4>
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1 unread-notification-pulse" />
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
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
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )
                )}

                 {activeTab === 'read' && (
                  readNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">
                        No read notifications
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Read notifications will appear here.
                      </p>
                    </div>
                  ) : (
                    readNotifications.map((notification, index) => (
                      <div
                        key={notification.id}
                        className="notification-item flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md bg-card opacity-60 border-border"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex-shrink-0 mt-1">
                          <Bell className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium leading-tight text-foreground">
                              {notification.title}
                            </h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                )}
               </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
