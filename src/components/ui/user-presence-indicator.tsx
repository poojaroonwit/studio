"use client";

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useUserPresence } from '@/hooks/use-user-presence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Circle } from 'lucide-react';

interface UserPresenceIndicatorProps {
  className?: string;
  maxVisible?: number;
}

export function UserPresenceIndicator({ className, maxVisible = 3 }: UserPresenceIndicatorProps) {
  const { onlineUsers, isLoading, error } = useUserPresence();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug logging
  useEffect(() => {
    if (mounted) {
      console.log('[UserPresenceIndicator] State:', { 
        onlineUsers: onlineUsers?.length || 0, 
        isLoading, 
        error,
        users: onlineUsers?.map(u => ({ name: u.userName, online: u.isOnline }))
      });
    }
  }, [mounted, onlineUsers, isLoading, error]);

  if (!mounted) {
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

  if (error) {
    console.error('[UserPresenceIndicator] Error:', error);
    return null;
  }

  if (!onlineUsers || onlineUsers.length === 0) {
    console.log('[UserPresenceIndicator] No online users found');
    return null;
  }

  // Filter to only show online users and limit the number displayed
  const visibleUsers = onlineUsers
    .filter(user => user.isOnline)
    .slice(0, maxVisible);

  const remainingCount = Math.max(0, onlineUsers.filter(user => user.isOnline).length - maxVisible);

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <TooltipProvider key={user.userId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="w-8 h-8 border-2 border-background">
                    <AvatarImage 
                      src={user.avatarUrl || undefined} 
                      alt={user.userName}
                    />
                    <AvatarFallback 
                      className="text-xs"
                      style={{ 
                        backgroundColor: user.personalColor || undefined,
                        color: user.personalColor ? 'white' : undefined
                      }}
                    >
                      {user.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full flex items-center justify-center">
                    <Circle className="w-1.5 h-1.5 fill-green-500 text-green-500" />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-medium">{user.userName}</div>
                  <div className="text-xs text-muted-foreground">{user.currentPage}</div>
                  <div className="text-xs text-green-600">Online</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        
        {remainingCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    +{remainingCount}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-medium">{remainingCount} more online</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
