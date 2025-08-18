"use client";

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
import { NotificationDrawer } from './notification-drawer';
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

  if (!session?.user) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNotificationClick}
        className="relative bg-transparent hover:bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        disabled={isLoading}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center animate-pulse bg-destructive text-destructive-foreground"
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
    </>
  );
}
