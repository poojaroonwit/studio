"use client";

import React, { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useUserPresence, type UserPresence } from '@/hooks/use-user-presence';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { Users, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserPresenceIndicatorProps {
  maxVisible?: number;
  className?: string;
}

export function UserPresenceIndicator({ maxVisible = 5, className }: UserPresenceIndicatorProps) {
  const { data: session } = useSession();
  const { onlineUsers, isLoading, error } = useUserPresence();
  const [isExpanded, setIsExpanded] = useState(false);

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
  const displayUsers = isExpanded ? filteredUsers : filteredUsers.slice(0, maxVisible);
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

  // Don't show anything if there are no users or if there's an error
  if (totalCount === 0 || error) {
    return null;
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
          {onlineCount} online
        </Badge>

        {/* User avatars */}
        <div className="flex items-center">
          <div className="flex -space-x-2">
            {displayUsers.map((user, index) => (
              <Tooltip key={user.userId}>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Avatar className={cn(
                      "w-6 h-6 border-2 border-background transition-all duration-200 hover:scale-110",
                      !user.isOnline && "opacity-50 grayscale"
                    )}>
                      <AvatarImage 
                        src={user.avatarUrl || undefined} 
                        alt={user.userName}
                      />
                      <AvatarFallback 
                        className={cn(
                          "text-xs font-medium",
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
          {hasMoreUsers && !isExpanded && (
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
      </div>
    </TooltipProvider>
  );
}
