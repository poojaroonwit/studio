"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useUnifiedRealtime } from '@/hooks/use-unified-realtime';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Users, Circle } from 'lucide-react';
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
  maxVisible?: number;
  className?: string;
}

export function UserPresenceIndicator({ maxVisible = 5, className }: UserPresenceIndicatorProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Use refs to prevent stale closures and track mounted state
  const mountedRef = useRef(true);
  const sessionRef = useRef(session);

  // Update session ref when session changes
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
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

  // Memoized event handlers to prevent recreation
  const handlePresenceUpdate = useCallback((presence: any) => {
    if (!mountedRef.current) return;
    
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
  }, []);

  const handleUserListUpdate = useCallback((users: UserPresence[]) => {
    if (!mountedRef.current) return;
    setOnlineUsers(users);
  }, []);

  // Unified realtime hook with memoized handlers
  const { isConnected: realtimeConnected } = useUnifiedRealtime({
    onPresenceUpdate: handlePresenceUpdate,
    onUserListUpdate: handleUserListUpdate,
    showNotifications: false, // Disable notifications
    showErrorNotifications: false // Disable error notifications
  });

  // Fetch initial presence data - only once on mount
  useEffect(() => {
    const fetchPresence = async () => {
      if (!sessionRef.current?.user?.id || !mountedRef.current) return;

      setIsLoading(true);
      setError(null);
      
      try {
        // Note: Initial presence data is now handled by the unified SSE system
        // The useUnifiedRealtime hook will automatically fetch and maintain presence data
        // No need to manually fetch from the old endpoint
        if (mountedRef.current) {
          setOnlineUsers([]);
        }
      } catch (error) {
        if (mountedRef.current) {
          console.error('Failed to fetch presence:', error);
          setError((error as Error).message);
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchPresence();
  }, []); // Empty dependency array - only run once on mount

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
  }, [onlineUsers, pathname]); // Add pathname dependency

  const onlineCount = useMemo(() => 
    filteredUsers.filter(user => user.isOnline).length, 
    [filteredUsers]
  );
  
  const totalCount = useMemo(() => 
    filteredUsers.length, 
    [filteredUsers]
  );

  // Get users to display
  const displayUsers = useMemo(() => 
    filteredUsers.slice(0, maxVisible), 
    [filteredUsers, maxVisible]
  );
  
  const hasMoreUsers = useMemo(() => 
    filteredUsers.length > maxVisible, 
    [filteredUsers.length, maxVisible]
  );

  // Memoized handlers for expand/collapse
  const handleExpand = useCallback(() => {
    if (!mountedRef.current) return;
    setIsExpanded(true);
  }, []);

  const handleCollapse = useCallback(() => {
    if (!mountedRef.current) return;
    setIsExpanded(false);
  }, []);

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div className="flex -space-x-2">
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  // Don't show anything when there are no other users
  if (totalCount === 0) {
    // Show current user's avatar when alone
    return (
      <TooltipProvider>
        <div className={cn("flex items-center gap-2", className)}>
          {/* Online count badge */}
          <Badge variant="secondary" className="text-xs px-2 py-1 h-6">
            <Users className="w-3 h-3 mr-1" />
            You're online
          </Badge>

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

  if (error) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant="secondary" className="text-xs px-2 py-1 h-6">
          <Users className="w-3 h-3 mr-1" />
          Error loading users
        </Badge>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        {/* Online count badge */}
        <Badge variant="secondary" className="text-xs px-2 py-1 h-6">
          <Users className="w-3 h-3 mr-1" />
          {`${onlineCount} online`}
        </Badge>

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

              {/* Show more indicator */}
              {hasMoreUsers && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleExpand}
                      className="w-8 h-8 rounded-full bg-muted border-2 border-background text-xs font-medium hover:bg-muted/80 transition-colors flex items-center justify-center"
                    >
                      +{filteredUsers.length - maxVisible}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <div className="text-xs">
                      Click to see all {filteredUsers.length} users
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Collapse button when expanded */}
              {isExpanded && hasMoreUsers && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleCollapse}
                      className="w-8 h-8 rounded-full bg-muted border-2 border-background text-xs font-medium hover:bg-muted/80 transition-colors flex items-center justify-center"
                    >
                      −
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <div className="text-xs">
                      Show less
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
