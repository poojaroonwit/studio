"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEnhancedSSE } from '@/hooks/use-enhanced-sse';
import { 
  Users, 
  Bell, 
  Activity, 
  Circle, 
  MessageSquare, 
  Eye,
  EyeOff,
  RefreshCw,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealtimeCollaborationProps {
  className?: string;
  showOnlineUsers?: boolean;
  showCollaborationEvents?: boolean;
  showNotifications?: boolean;
  maxItems?: number;
}

export function RealtimeCollaboration({
  className,
  showOnlineUsers = true,
  showCollaborationEvents = true,
  showNotifications = true,
  maxItems = 10,
}: RealtimeCollaborationProps) {
  const { data: session } = useSession();
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [collaborationEvents, setCollaborationEvents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch notifications on mount
  useEffect(() => {
    if (!session?.user?.id) return;
    
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/realtime/notifications');
        if (response.ok) {
          const notificationsData = await response.json();
          // Ensure notifications have required properties
          const validNotifications = (() => {
            try {
              // Defensive check to prevent filter errors
              if (!Array.isArray(notificationsData)) {
                console.warn('RealtimeCollaboration: notificationsData is not an array:', notificationsData);
                return [];
              }
              
              return notificationsData.filter((n: any) => {
                try {
                  return n && typeof n === 'object' && n.id;
                } catch (error) {
                  console.warn('RealtimeCollaboration: Error filtering notification data:', error, n);
                  return false;
                }
              }).map((n: any) => ({
                id: n.id,
                title: n.title || 'Untitled Notification',
                message: n.message || 'No message',
                timestamp: n.timestamp || n.createdAt || Date.now(),
                read: n.read || false,
                ...n
              }));
            } catch (error) {
              console.error('RealtimeCollaboration: Error processing notifications data:', error);
              return [];
            }
          })();
          setNotifications(validNotifications);
        }
      } catch (error) {
        // Error fetching notifications
      }
    };

    fetchNotifications();
  }, [session?.user?.id]);

  // FIXED: Stabilize callback functions to prevent infinite loops
  const handleApplicantUpdate = useCallback((data: any) => {
    // Handle Applicant updates as collaboration events
    setCollaborationEvents((prev) => [data, ...prev].slice(0, maxItems));
    setLastUpdate(new Date());
  }, [maxItems]);

  const handlePositionUpdate = useCallback((data: any) => {
    // Handle position updates as collaboration events
    setCollaborationEvents((prev) => [data, ...prev].slice(0, maxItems));
    setLastUpdate(new Date());
  }, [maxItems]);

  const handleNotificationUpdate = useCallback((data: any) => {
    // Handle notification updates
    if (data.type === 'new_notification') {
      setCollaborationEvents((prev) => [data, ...prev].slice(0, maxItems));
      setLastUpdate(new Date());
    }
  }, [maxItems]);

  // Use simple SSE hook for real-time updates
  const { isConnected } = useEnhancedSSE();

  // Mark notification as read (still uses API)
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    if (!session?.user?.id || !notificationId) return;
    try {
      await fetch(`/api/realtime/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      setNotifications(prev =>
        prev.map(notification =>
          notification && notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        ).filter(Boolean) // Remove any null/undefined notifications
      );
    } catch (error) {
      // Error marking notification as read
    }
  }, [session?.user?.id]);

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Get user initials
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get event icon
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'Applicant_update':
        return <Users className="w-4 h-4" />;
      case 'position_update':
        return <Activity className="w-4 h-4" />;
      case 'status_change':
        return <Circle className="w-4 h-4" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4" />;
      case 'assignment':
        return <Users className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  if (!isVisible) {
    return (
      <div className={cn("fixed bottom-4 right-4 z-50", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="rounded-md w-12 h-12 p-0"
        >
          <Eye className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("fixed bottom-4 right-4 z-50 w-80", className)}>
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Real-time Collaboration</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated: {formatTimestamp(lastUpdate.getTime())}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Online Users */}
          {showOnlineUsers && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Online Users</span>
                <Badge variant="secondary" className="text-xs">
                  {onlineUsers.length}
                </Badge>
              </div>
              <ScrollArea className="h-24">
                <div className="space-y-2">
                  {onlineUsers.map((user) => (
                    <TooltipProvider key={user.userId}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                            <div className="border border-border rounded-full h-6 w-6 flex items-center justify-center bg-muted">
                              <span className="text-xs font-medium">
                                {getUserInitials(user.userName)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">
                                {user.userName}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {user.currentPage}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Circle className="w-2 h-2 text-green-500 fill-current" />
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(user.lastActivity)}
                              </span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <div><strong>{user.userName}</strong></div>
                            <div>Role: {user.userRole}</div>
                            <div>Page: {user.currentPage}</div>
                            <div>Last active: {formatTimestamp(user.lastActivity)}</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Collaboration Events */}
          {showCollaborationEvents && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">Recent Activity</span>
                <Badge variant="secondary" className="text-xs">
                  {collaborationEvents.length}
                </Badge>
              </div>
              <ScrollArea className="h-24">
                <div className="space-y-2">
                  {collaborationEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50">
                      <div className="mt-1">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {event.userName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {event.type.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(event.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Notifications */}
          {showNotifications && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4" />
                <span className="text-sm font-medium">Notifications</span>
                <Badge variant="secondary" className="text-xs">
                  {(() => {
                    try {
                      // Defensive check to prevent filter errors
                      if (!Array.isArray(notifications)) {
                        console.warn('RealtimeCollaboration: notifications is not an array:', notifications);
                        return 0;
                      }
                      
                                              return notifications.filter(n => {
                          try {
                            return n && n.id && !n.read;
                          } catch (error) {
                            console.warn('RealtimeCollaboration: Error filtering notification:', error, n);
                            return false;
                          }
                        }).length;
                      } catch (error) {
                        console.error('RealtimeCollaboration: Error counting unread notifications:', error);
                        return 0;
                      }
                  })()}
                </Badge>
              </div>
              <ScrollArea className="h-24">
                <div className="space-y-2">
                  {(() => {
                    try {
                      // Defensive check to prevent filter errors
                      if (!Array.isArray(notifications)) {
                        console.warn('RealtimeCollaboration: notifications is not an array:', notifications);
                        return [];
                      }
                      
                      return notifications.filter(n => {
                        try {
                          return n && n.id;
                        } catch (error) {
                          console.warn('RealtimeCollaboration: Error filtering notification for display:', error, n);
                          return false;
                        }
                      });
                    } catch (error) {
                      console.error('RealtimeCollaboration: Error filtering notifications for display:', error);
                      return [];
                    }
                  })().map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-md cursor-pointer transition-colors",
                        notification.read ? "opacity-60" : "bg-muted/50",
                        "hover:bg-muted"
                      )}
                      onClick={() => !notification.read && markNotificationAsRead(notification.id)}
                     role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
                      <div className="mt-1">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {notification?.title || 'Untitled Notification'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {notification?.message || 'No message'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {notification?.timestamp ? formatTimestamp(notification.timestamp) : 'Unknown time'}
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-md mt-1" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 