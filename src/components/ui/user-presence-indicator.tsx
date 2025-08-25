"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useUnifiedRealtime } from '@/hooks/use-unified-realtime';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';

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
import { Users, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserPresenceIndicatorProps {
  maxVisible?: number;
  className?: string;
}

export function UserPresenceIndicator({ maxVisible = 5, className }: UserPresenceIndicatorProps) {
  const { data: session } = useSession();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Unified realtime hook
  const { isConnected: realtimeConnected } = useUnifiedRealtime({
    onPresenceUpdate: (presence) => {
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
    },
    onUserListUpdate: (users) => {
      setOnlineUsers(users);
    },
    showNotifications: false, // Disable notifications
    showErrorNotifications: false // Disable error notifications
  });

  // Fetch initial presence data
  useEffect(() => {
    const fetchPresence = async () => {
      if (!session?.user?.id) return;

      setIsLoading(true);
      setError(null);
      
      try {
        // Note: Initial presence data is now handled by the unified SSE system
        // The useUnifiedRealtime hook will automatically fetch and maintain presence data
        // No need to manually fetch from the old endpoint
        setOnlineUsers([]);
      } catch (error) {
        console.error('Failed to fetch presence:', error);
        setError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPresence();
  }, [session?.user?.id]);

  // Filter out current user and sort by online status and last seen
  const filteredUsers = useMemo(() => {
    if (!session?.user?.id) return [];
    
    return onlineUsers
      .filter(user => user.userId !== session.user.id)
      .sort((a, b) => {
        // Online users first
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        
        // Then by last seen (most recent first)
        return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
      });
  }, [onlineUsers, session?.user?.id]);

  const onlineCount = filteredUsers.filter(user => user.isOnline).length;
  const totalCount = filteredUsers.length;

  // Get users to display
  const displayUsers = filteredUsers.slice(0, maxVisible);
  const hasMoreUsers = filteredUsers.length > maxVisible;

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
          <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
          <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  // Don't show anything when there are no other users
  if (totalCount === 0) {
    return null;
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

  const getPageDisplayName = (pathname: string) => {
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
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
                      "w-6 h-6 border-2 border-background transition-all duration-200 hover:scale-110 rounded-full",
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
          </div>

                     {/* Show more indicator */}
           {hasMoreUsers && (
             <Tooltip>
               <TooltipTrigger asChild>
                 <button
                   onClick={() => setIsExpanded(true)}
                   className="w-6 h-6 rounded-full bg-muted border-2 border-background text-xs font-medium hover:bg-muted/80 transition-colors flex items-center justify-center"
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
                   onClick={() => setIsExpanded(false)}
                   className="w-6 h-6 rounded-full bg-muted border-2 border-background text-xs font-medium hover:bg-muted/80 transition-colors flex items-center justify-center"
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
       )}
     </div>
   </TooltipProvider>
 );
 }
