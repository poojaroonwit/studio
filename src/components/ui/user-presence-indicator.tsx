"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useUserPresence } from '@/hooks/use-user-presence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Circle } from 'lucide-react';
import { OnlineUsersModal } from './online-users-modal';
import { useDynamicZIndex } from '@/contexts/ZIndexContext';
import { getBestImageUrl } from '@/lib/imageUtils';

interface UserPresenceIndicatorProps {
  className?: string;
  maxVisible?: number;
}

export function UserPresenceIndicator({ className, maxVisible = 3 }: UserPresenceIndicatorProps) {
  const { onlineUsers, isLoading, error } = useUserPresence();
  const [mounted, setMounted] = useState(false);
  const [previousUsers, setPreviousUsers] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { contentZIndex } = useDynamicZIndex('user-presence-tooltip', 'dropdown');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoize the visible users to prevent unnecessary re-renders
  const visibleUsers = useMemo(() => {
    if (!onlineUsers || onlineUsers.length === 0) return [];
    
    return onlineUsers
      .filter(user => user.isOnline)
      .slice(0, maxVisible);
  }, [onlineUsers, maxVisible]);

  const remainingCount = useMemo(() => {
    if (!onlineUsers) return 0;
    return Math.max(0, onlineUsers.filter(user => user.isOnline).length - maxVisible);
  }, [onlineUsers, maxVisible]);

  // Create a stable key for comparison to detect actual changes
  const currentUsersKey = useMemo(() => {
    return visibleUsers.map(user => `${user.userId}-${user.isOnline}`).join(',');
  }, [visibleUsers]);

  // Only update if the user list actually changed
  useEffect(() => {
    if (currentUsersKey !== previousUsers) {
      setPreviousUsers(currentUsersKey);
    }
  }, [currentUsersKey, previousUsers]);

  // Memoize the user avatar component to prevent unnecessary re-renders
  const UserAvatar = useCallback(({ user }: { user: any }) => {
    const avatarImageUrl = getBestImageUrl({ avatarUrl: user.avatarUrl });
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsModalOpen(true)}
              className="relative transition-all duration-200 ease-in-out hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
              aria-label={`View ${user.userName} details`}
            >
              <Avatar className="w-8 h-8 border-2 border-background rounded-full cursor-pointer hover:shadow-lg transition-shadow">
                <AvatarImage 
                  src={avatarImageUrl || undefined} 
                  alt={user.userName}
                  className="rounded-full"
                />
                <AvatarFallback 
                  className="text-xs rounded-full"
                  style={{ 
                    backgroundColor: user.personalColor || undefined,
                    color: user.personalColor ? 'white' : undefined
                  }}
                >
                  {user.userName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </TooltipTrigger>
          <TooltipContent style={{ zIndex: contentZIndex }}>
            <div className="text-center">
              <div className="font-medium">{user.userName}</div>
              <div className="text-xs text-muted-foreground">{user.currentPage}</div>
              <div className="text-xs text-muted-foreground mt-1">Click to view details</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }, [contentZIndex]);


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
    return null;
  }

  if (!onlineUsers || onlineUsers.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn("flex items-center transition-all duration-300 ease-in-out", className)}>
        <div className="flex -space-x-2">
          {visibleUsers.map((user) => (
            <div 
              key={`${user.userId}-${user.isOnline}`}
              className="transition-all duration-200 ease-in-out hover:scale-105"
            >
              <UserAvatar user={user} />
            </div>
          ))}
          
          {remainingCount > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-8 h-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center transition-all duration-200 ease-in-out hover:scale-105 hover:bg-primary/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-sm hover:shadow-md"
                    aria-label={`View ${remainingCount} more online users`}
                  >
                    <span className="text-xs font-semibold text-primary">
                      +{remainingCount}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent style={{ zIndex: contentZIndex }}>
                  <div className="text-center">
                    <div className="font-medium">{remainingCount} more online</div>
                    <div className="text-xs text-muted-foreground">Click to view all</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Online Users Modal */}
      <OnlineUsersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onlineUsers={onlineUsers || []}
      />
    </>
  );
}
