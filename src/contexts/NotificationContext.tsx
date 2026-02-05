"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

import { useSession } from 'next-auth/react';
import { useToastManager } from '@/hooks/use-toast-manager';
import { Bell } from 'lucide-react';
import { useEnhancedSSE } from '@/hooks/use-enhanced-sse';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
  clearNotifications: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  notificationsEnabled: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { success: showToast } = useToastManager({ deduplicationWindowMs: 2000 });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Set client flag to prevent SSR issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/realtime/notifications?limit=50');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount((() => {
          try {
            // Defensive check to prevent filter errors
            if (!Array.isArray(data)) {
              console.warn('NotificationContext: data is not an array:', data);
              return 0;
            }
            
            return data.filter((n: Notification) => {
              try {
                return n && !n.isRead;
              } catch (error) {
                console.warn('NotificationContext: Error filtering notification:', error, n);
                return false;
              }
            }).length;
          } catch (error) {
            console.error('NotificationContext: Error counting unread notifications:', error);
            return 0;
          }
        })());
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    // Check if this is a frontend-generated notification (has timestamp-like ID)
    const isFrontendNotification = /^\d{13,}$/.test(notificationId);
    
    if (isFrontendNotification) {
      // For frontend-generated notifications, just update the local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      return;
    }
    
    // For database notifications, call the API
    try {
      const response = await fetch(`/api/realtime/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        const errorData = await response.json();
        console.error('❌ API error response:', errorData);
        throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/realtime/notifications/mark-all-read', {
        method: 'POST',
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show toast notification with theme-aware styling (only if enabled)
    if (notificationsEnabled) {
      showToast(`${notification.title}: ${notification.message}`, {
        duration: 5000,
        icon: <Bell className="h-4 w-4" />,
        style: {
          background: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          border: '1px solid hsl(var(--border))',
        },
      });
    }
  }, [notificationsEnabled, showToast]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const handleSetNotificationsEnabled = useCallback((enabled: boolean) => {
    setNotificationsEnabled(enabled);
  }, []);

  // FIXED: Stabilize callback functions to prevent infinite loops
  const handleNotificationUpdate = useCallback((data: any) => {
    if (data.type === 'new_notification') {
      // Only show notifications meant for the current user
      if (data.targetUserId && data.targetUserId !== session?.user?.id) {
        return; // Skip notifications not meant for this user
      }
      
      // Prevent self-notifications: don't show notifications about user's own actions
      if (data.notification.data?.actingUserId && data.notification.data.actingUserId === session?.user?.id) {
        return; // Skip notifications about user's own actions
      }
      
      addNotification({
        type: data.notification.type,
        title: data.notification.title,
        message: data.notification.message,
        data: data.notification.data || {},
      });
    }
  }, [session?.user?.id, addNotification]);

  const handleApplicantUpdate = useCallback((data: any) => {
    if (data.type === 'Applicant_update' && data.Applicant) {
      // Prevent self-notifications: don't show notifications about user's own actions
      if (data.actingUserId && data.actingUserId === session?.user?.id) {
        return; // Skip notifications about user's own actions
      }
      
      addNotification({
        type: 'Applicant_update',
        title: 'Applicant Updated',
        message: `Applicant ${data.applicant.name || data.applicant.email} has been updated`,
        data: { candidateId: data.applicant.id, ...data },
      });
    }
  }, [session?.user?.id, addNotification]);

  const handlePositionUpdate = useCallback((data: any) => {
    if (data.type === 'position_update' && data.position) {
      // Prevent self-notifications: don't show notifications about user's own actions
      if (data.actingUserId && data.actingUserId === session?.user?.id) {
        return; // Skip notifications about user's own actions
      }
      
      addNotification({
        type: 'position_update',
        title: 'Position Updated',
        message: `Position "${data.position.title}" has been updated`,
        data: { positionId: data.position.id, ...data },
      });
    }
  }, [session?.user?.id, addNotification]);

  // Use simple SSE hook instead of complex unified realtime
  const { isConnected } = useEnhancedSSE();

  // Fetch notifications on mount and when session changes (only on client)
  useEffect(() => {
    if (isClient) {
      fetchNotifications();
    }
  }, [fetchNotifications, isClient]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    clearNotifications,
    setNotificationsEnabled: handleSetNotificationsEnabled,
    notificationsEnabled,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
