"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUnifiedRealtime } from '@/hooks/use-unified-realtime';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

// UserPresence type definition
interface UserPresence {
  userId: string;
  userName: string;
  userRole: string;
  avatarUrl?: string | null;
  personalColor?: string | null;
  currentPage: string;
  lastSeen: string;
  isOnline: boolean;
}

interface UserPresenceIndicatorProps {
  className?: string;
}

export function UserPresenceIndicator({ className }: UserPresenceIndicatorProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to prevent stale closures and track mounted state
  const mountedRef = useRef(true);
  const sessionRef = useRef(session);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Update session ref when session changes
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
    };
  }, []);

  // Helper functions - memoized to prevent recreation on every render
  const getPageDisplayName = useCallback((pathname: string) => {
    const pathMap: Record<string, string> = {
      '/': 'Dashboard',
      '/candidates': 'Candidates',
      '/positions': 'Positions',
      '/my-tasks': 'My Tasks',
      '/dashboard': 'Dashboard',
      '/settings': 'Settings',
      '/users': 'Users',
      '/logs': 'Logs',
    };

    // Check exact matches first
    if (pathMap[pathname]) {
      return pathMap[pathname];
    }

    // Check for dynamic routes
    if (pathname.startsWith('/candidates/')) {
      return 'Candidate Details';
    }
    if (pathname.startsWith('/positions/')) {
      return 'Position Details';
    }
    if (pathname.startsWith('/settings/')) {
      return 'Settings';
    }

    // Default to pathname
    return pathname;
  }, []);

  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  // Update current user's presence with error handling
  const updatePresence = useCallback(async () => {
    if (!sessionRef.current?.user?.id || isUpdatingRef.current || !mountedRef.current) return;

    isUpdatingRef.current = true;
    try {
      const response = await fetch('/api/realtime/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: sessionRef.current.user.id,
          userName: sessionRef.current.user.name || sessionRef.current.user.email || 'User',
          userRole: sessionRef.current.user.role || 'User',
          avatarUrl: (sessionRef.current.user as any).avatarUrl,
          personalColor: (sessionRef.current.user as any).personalColor,
          currentPage: pathname,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Reset retry count on success
      retryCountRef.current = 0;
    } catch (error) {
      console.error('Failed to update presence:', error);
      retryCountRef.current++;
      
      // Stop retrying after max retries
      if (retryCountRef.current >= maxRetries) {
        console.error('Max retries reached for presence update');
        if (mountedRef.current) {
          setError('Failed to update presence after multiple attempts');
        }
      }
    } finally {
      if (mountedRef.current) {
        isUpdatingRef.current = false;
      }
    }
  }, [pathname]);

  // Fetch all users' presence with error handling
  const fetchPresence = useCallback(async () => {
    if (!sessionRef.current?.user?.id || !mountedRef.current) return;

    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }
    
    try {
      const response = await fetch('/api/realtime/presence');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (mountedRef.current) {
        setOnlineUsers(data.users || []);
        setError(null); // Clear any previous errors
      }
    } catch (error) {
      console.error('Failed to fetch presence:', error);
      if (mountedRef.current) {
        setError((error as Error).message);
        // Don't clear onlineUsers on error to maintain last known state
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Memoized event handlers to prevent recreation
  const handlePresenceUpdate = useCallback((presence: any) => {
    if (!mountedRef.current) return;
    
    try {
      // Handle presence updates
      if (presence.action === 'joined') {
        setOnlineUsers(prev => {
          const existing = prev.find(u => u.userId === presence.userId);
          if (existing) {
            return prev.map(u => u.userId === presence.userId ? { ...u, ...presence.userData } : u);
          } else {
            return [...prev, presence.userData];
          }
        });
      } else if (presence.action === 'left') {
        setOnlineUsers(prev => prev.filter(u => u.userId !== presence.userId));
      }
    } catch (error) {
      console.error('Error handling presence update:', error);
    }
  }, []);

  const handleUserListUpdate = useCallback((users: UserPresence[]) => {
    if (!mountedRef.current) return;
    
    try {
      setOnlineUsers(users);
    } catch (error) {
      console.error('Error handling user list update:', error);
    }
  }, []);

  // Unified realtime hook with memoized handlers
  const { isConnected: realtimeConnected } = useUnifiedRealtime({
    onPresenceUpdate: handlePresenceUpdate,
    onUserListUpdate: handleUserListUpdate,
    showNotifications: false, // Disable notifications
    showErrorNotifications: false // Disable error notifications
  });

  // Set up periodic presence updates and fetching with proper cleanup
  useEffect(() => {
    if (!sessionRef.current?.user?.id) return;

    // Clear any existing intervals
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    if (presenceIntervalRef.current) {
      clearInterval(presenceIntervalRef.current);
      presenceIntervalRef.current = null;
    }

    // Initial presence update
    updatePresence();
    
    // Fetch initial presence data
    fetchPresence();

    // Update presence every 30 seconds
    presenceIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        updatePresence();
      }
    }, 30000);
    
    // Fetch presence data every 10 seconds
    updateIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        fetchPresence();
      }
    }, 10000);

    // Cleanup on unmount or dependency change
    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [session?.user?.id]); // Only depend on user ID, not the functions

  // Update presence when pathname changes
  useEffect(() => {
    if (sessionRef.current?.user?.id && mountedRef.current) {
      updatePresence();
    }
  }, [pathname]); // Only depend on pathname

  // Include current user in the list and sort by online status and last seen
  const filteredUsers = useMemo(() => {
    const currentUserId = sessionRef.current?.user?.id;
    if (!currentUserId) return [];
    
    // Include current user in the list
    const currentUser: UserPresence = {
      userId: currentUserId,
      userName: sessionRef.current?.user?.name || sessionRef.current?.user?.email || 'You',
      userRole: sessionRef.current?.user?.role || 'User',
      avatarUrl: sessionRef.current?.user?.image || (sessionRef.current?.user as any)?.avatarUrl,
      personalColor: (sessionRef.current?.user as any)?.personalColor,
      currentPage: pathname,
      lastSeen: new Date().toISOString(),
      isOnline: true
    };
    
    // Combine current user with other users
    const allUsers = [currentUser, ...onlineUsers.filter(user => user.userId !== currentUserId)];
    
    return allUsers.sort((a, b) => {
      // Online users first
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      
      // Then by last seen (most recent first)
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
    });
  }, [onlineUsers, pathname]);

  const onlineCount = useMemo(() => 
    filteredUsers.filter(user => user.isOnline).length, 
    [filteredUsers]
  );
  
  const totalCount = useMemo(() => 
    filteredUsers.length, 
    [filteredUsers]
  );

  // Get users to display - limit to 5 maximum
  const displayUsers = useMemo(() => 
    filteredUsers.slice(0, 5), 
    [filteredUsers]
  );
  
  const hasMoreUsers = useMemo(() => 
    filteredUsers.length > 5, 
    [filteredUsers.length]
  );

  const moreUsersCount = useMemo(() => 
    filteredUsers.length - 5, 
    [filteredUsers.length]
  );

  if (isLoading) {
    return (
      <div className={cn("flex items-center", className)}>
        <div className="flex -space-x-2">
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={cn("flex items-center", className)}>
        <div className="flex items-center">
          <div className="flex -space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="w-8 h-8 border-2 border-background transition-all duration-200 hover:scale-110 rounded-full">
                    <AvatarImage 
                      src={sessionRef.current?.user?.image || sessionRef.current?.user?.avatarUrl || undefined} 
                      alt={sessionRef.current?.user?.name || 'You'}
                      className="rounded-full"
                    />
                    <AvatarFallback 
                      className="text-xs font-medium rounded-full bg-red-500/20 text-red-700 dark:text-red-300"
                    >
                      {sessionRef.current?.user?.name ? getInitials(sessionRef.current.user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Error indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <div className="font-medium">{sessionRef.current?.user?.name || 'You'}</div>
                  <div className="text-xs text-muted-foreground">
                    {sessionRef.current?.user?.role || 'User'}
                  </div>
                  <div className="text-xs text-red-600 flex items-center gap-1">
                    <Circle className="w-2 h-2 fill-current" />
                    Connection Error
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {error}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  }

  // Don't show anything when there are no other users
  if (totalCount === 0) {
    // Show current user's avatar when alone
    return (
      <TooltipProvider>
        <div className={cn("flex items-center", className)}>
          {/* Current user avatar */}
          <div className="flex items-center">
            <div className="flex -space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Avatar className="w-8 h-8 border-2 border-background transition-all duration-200 hover:scale-110 rounded-full">
                      <AvatarImage 
                        src={sessionRef.current?.user?.image || sessionRef.current?.user?.avatarUrl || undefined} 
                        alt={sessionRef.current?.user?.name || 'You'}
                        className="rounded-full"
                      />
                      <AvatarFallback 
                        className="text-xs font-medium rounded-full bg-green-500/20 text-green-700 dark:text-green-300"
                      >
                        {sessionRef.current?.user?.name ? getInitials(sessionRef.current.user.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-1">
                    <div className="font-medium">{sessionRef.current?.user?.name || 'You'}</div>
                    <div className="text-xs text-muted-foreground">
                      {sessionRef.current?.user?.role || 'User'}
                    </div>
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <Circle className="w-2 h-2 fill-current" />
                      Online - {getPageDisplayName(pathname)}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("flex items-center", className)}>
        {/* User avatars - only show if there are users */}
        {totalCount > 0 && (
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {displayUsers.map((user, index) => (
                <Tooltip key={user.userId}>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Avatar className={cn(
                        "w-8 h-8 border-2 border-background transition-all duration-200 hover:scale-110 rounded-full",
                        !user.isOnline && "opacity-50 grayscale"
                      )}>
                        <AvatarImage 
                          src={user.avatarUrl || undefined} 
                          alt={user.userName}
                          className="rounded-full"
                        />
                        <AvatarFallback 
                          className={cn(
                            "text-xs font-medium rounded-full",
                            user.personalColor && `bg-[${user.personalColor}] text-white`
                          )}
                        >
                          {getInitials(user.userName)}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Online indicator */}
                      {user.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <div className="font-medium">{user.userName}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.userRole}
                      </div>
                      {user.isOnline ? (
                        <div className="text-xs text-green-600 flex items-center gap-1">
                          <Circle className="w-2 h-2 fill-current" />
                          Online - {getPageDisplayName(user.currentPage)}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Last seen {formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}

              {/* Show more indicator - simplified */}
              {hasMoreUsers && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-8 h-8 rounded-full bg-muted border-2 border-background text-xs font-medium flex items-center justify-center">
                      +{moreUsersCount}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <div className="text-xs">
                      {moreUsersCount} more online users
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
