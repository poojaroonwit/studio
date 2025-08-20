"use client";

import { useState, useEffect } from 'react';
import { X, Bell, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

interface FloatingNotificationProps {
  onNavigate?: () => void;
}

export function FloatingNotification({ onNavigate }: FloatingNotificationProps) {
  const { notifications, unreadCount } = useNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [latestNotification, setLatestNotification] = useState<any>(null);

  useEffect(() => {
    if (notifications.length > 0 && unreadCount > 0) {
      const latest = notifications.find(n => !n.isRead);
      if (latest && latest !== latestNotification) {
        setLatestNotification(latest);
        setIsVisible(true);
        
        // Auto-hide after 8 seconds
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, 8000);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [notifications, unreadCount, latestNotification]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleClick = () => {
    if (onNavigate) {
      onNavigate();
    }
    setIsVisible(false);
  };

  if (!isVisible || !latestNotification) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[1001] animate-in slide-in-from-bottom-2 duration-300">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm w-80 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">New Notification</span>
            <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center unread-notification-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Content */}
        <div 
          className="cursor-pointer group"
          onClick={handleClick}
        >
          <h4 className="text-sm font-medium text-foreground mb-1 group-hover:text-primary transition-colors">
            {latestNotification.title}
          </h4>
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {latestNotification.message}
          </p>
          
          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(latestNotification.createdAt), { addSuffix: true })}
            </span>
            <div className="flex items-center gap-1 text-xs text-primary group-hover:gap-2 transition-all">
              <span>View</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
