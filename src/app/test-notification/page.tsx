"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications } from '@/contexts/NotificationContext';
import { useNotificationManager } from '@/hooks/use-notification-manager';
import { NotificationDrawer } from '@/components/ui/notification-drawer';
import { Bell } from 'lucide-react';

export default function TestNotificationPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { notifyCustom } = useNotificationManager();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const createTestNotification = () => {
    notifyCustom(
      'test_notification',
      'Test Notification',
      'This is a test notification to debug the mark read functionality.',
      { testData: 'debug', timestamp: Date.now() }
    );
  };

  const handleMarkAsRead = async (notificationId: string) => {
    console.log('🔍 Test page: Marking notification as read:', notificationId);
    try {
      await markAsRead(notificationId);
      console.log('✅ Test page: Notification marked as read successfully');
    } catch (error) {
      console.error('❌ Test page: Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    console.log('🔍 Test page: Marking all notifications as read');
    try {
      await markAllAsRead();
      console.log('✅ Test page: All notifications marked as read successfully');
    } catch (error) {
      console.error('❌ Test page: Error marking all notifications as read:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Debug Page
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Statistics</h3>
              <p>Total notifications: {notifications.length}</p>
              <p>Unread notifications: {unreadCount}</p>
              <p>Read notifications: {notifications.filter(n => n.isRead).length}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Actions</h3>
              <div className="space-y-2">
                <Button onClick={createTestNotification} className="w-full">
                  Create Test Notification
                </Button>
                <Button onClick={handleMarkAllAsRead} className="w-full" variant="outline">
                  Mark All as Read
                </Button>
                <Button onClick={() => setIsDrawerOpen(true)} className="w-full" variant="outline">
                  Open Notification Drawer
                </Button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">All Notifications</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-muted-foreground">No notifications</p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border rounded-lg ${
                      notification.isRead ? 'bg-muted/50' : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ID: {notification.id} | Type: {notification.type} | 
                          Read: {notification.isRead ? 'Yes' : 'No'} | 
                          Created: {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="ml-2"
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNotificationRead={() => {}}
      />
    </div>
  );
}
