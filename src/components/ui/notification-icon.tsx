"use client";

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
import { NotificationDrawer } from './notification-drawer';
import { FloatingNotification } from './floating-notification';
import { useNotifications } from '@/contexts/NotificationContext';

export function NotificationIcon() {
  const { data: session } = useSession();
  const { unreadCount, isLoading } = useNotifications();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleNotificationClick = () => {
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
  };

  const handleFloatingNotificationClick = () => {
    setIsDrawerOpen(true);
  };

  if (!session?.user) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNotificationClick}
        className="relative bg-transparent hover:bg-accent/50 border-0 shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95"
        disabled={isLoading}
      >
        <Bell className="h-5 w-5 transition-transform duration-200 ease-in-out group-hover:rotate-12" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center unread-notification-pulse bg-destructive text-destructive-foreground shadow-lg transition-all duration-300 ease-in-out hover:scale-110"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
      
      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        onNotificationRead={() => {}} // Handled by context
      />
      
      <FloatingNotification onNavigate={handleFloatingNotificationClick} />
    </>
  );
}
