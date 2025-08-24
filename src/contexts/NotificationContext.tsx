"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useToastManager } from '@/hooks/use-toast-manager';
import { Bell } from 'lucide-react';

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
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/realtime/notifications?limit=50');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
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
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
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
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const handleSetNotificationsEnabled = useCallback((enabled: boolean) => {
    setNotificationsEnabled(enabled);
  }, []);

  // Set up real-time notifications via SSE
  useEffect(() => {
    if (!session?.user) {
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      return;
    }

    const connectSSE = () => {
      try {
        const es = new EventSource('/api/candidates/sse');
        setEventSource(es);

        es.onopen = () => {
          console.log('Real-time notifications connected');
        };

        es.onerror = (error) => {
          console.error('❌ Real-time notifications error:', error);
          es.close();
          setEventSource(null);
          
          // Attempt to reconnect after 5 seconds
          setTimeout(() => {
            if (session?.user) {
              connectSSE();
            }
          }, 5000);
        };

        // Listen for notification events
        es.addEventListener('notification', (event) => {
          try {
            const data = JSON.parse(event.data);
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
          } catch (error) {
            console.error('Error parsing notification event:', error);
          }
        });

        // Listen for general updates that should trigger notifications
        es.addEventListener('candidate', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'candidate_update' && data.candidate) {
              // Prevent self-notifications: don't show notifications about user's own actions
              if (data.actingUserId && data.actingUserId === session?.user?.id) {
                return; // Skip notifications about user's own actions
              }
              
              addNotification({
                type: 'candidate_update',
                title: 'Candidate Updated',
                message: `Candidate ${data.candidate.name || data.candidate.email} has been updated`,
                data: { candidateId: data.candidate.id, ...data },
              });
            }
          } catch (error) {
            console.error('Error parsing candidate event:', error);
          }
        });

        es.addEventListener('position', (event) => {
          try {
            const data = JSON.parse(event.data);
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
          } catch (error) {
            console.error('Error parsing position event:', error);
          }
        });

        es.addEventListener('comment', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'new_comment') {
              // Prevent self-notifications: don't show notifications about user's own actions
              if (data.actingUserId && data.actingUserId === session?.user?.id) {
                return; // Skip notifications about user's own actions
              }
              
              addNotification({
                type: 'new_comment',
                title: 'New Comment',
                message: `New comment added by ${data.comment.authorName || 'Team member'}`,
                data: { commentId: data.comment.id, ...data },
              });
            }
          } catch (error) {
            console.error('Error parsing comment event:', error);
          }
        });

        es.addEventListener('transition', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'candidate_transition') {
              // Prevent self-notifications: don't show notifications about user's own actions
              if (data.actingUserId && data.actingUserId === session?.user?.id) {
                return; // Skip notifications about user's own actions
              }
              
              addNotification({
                type: 'candidate_transition',
                title: 'Candidate Moved',
                message: `Candidate moved to ${data.toStage || 'new stage'}`,
                data: { candidateId: data.candidateId, ...data },
              });
            }
          } catch (error) {
            console.error('Error parsing transition event:', error);
          }
        });

      } catch (error) {
        console.error('Error setting up SSE connection:', error);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
    };
  }, [session?.user, addNotification]);

  // Fetch notifications on mount and when session changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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
