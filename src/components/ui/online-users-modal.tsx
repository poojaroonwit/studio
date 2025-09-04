"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Circle, MapPin, Clock, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { UserPresence } from '@/hooks/use-user-presence';

interface OnlineUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onlineUsers: UserPresence[];
}

export function OnlineUsersModal({ isOpen, onClose, onlineUsers }: OnlineUsersModalProps) {
  const router = useRouter();

  const handleNavigateToUser = (user: UserPresence) => {
    // Navigate to the page where the user is currently located
    router.push(user.currentPage);
    onClose();
  };

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date();
    
    // Ensure lastSeen is a valid Date object
    const lastSeenDate = lastSeen instanceof Date ? lastSeen : new Date(lastSeen);
    if (isNaN(lastSeenDate.getTime())) {
      return 'Unknown';
    }
    
    const diffInSeconds = Math.floor((now.getTime() - lastSeenDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  const getPageDisplayName = (pathname: string) => {
    const pathMap: Record<string, string> = {
      '/': 'Dashboard',
      '/candidates': 'Candidates',
      '/positions': 'Positions',
      '/my-tasks': 'My Tasks',
      '/settings': 'Settings',
      '/settings/users': 'User Management',
      '/settings/user-groups': 'User Groups',
      '/settings/candidate-sources': 'Candidate Sources',
      '/settings/recruitment-stages': 'Recruitment Stages',
      '/settings/system': 'System Settings',
    };

    // Check for exact matches first
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

    // Fallback to formatted pathname
    return pathname
      .split('/')
      .filter(Boolean)
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' / ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Circle className="w-5 h-5 text-green-500 fill-green-500" />
            Online Users ({onlineUsers.filter(user => user.isOnline).length})
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3">
            {onlineUsers
              .filter(user => user.isOnline)
              .map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  {/* User Avatar */}
                  <div className="relative">
                    <Avatar className="w-12 h-12 rounded-full">
                      <AvatarImage 
                        src={user.avatarUrl || undefined} 
                        alt={user.userName}
                        className="rounded-full"
                      />
                      <AvatarFallback 
                        className="text-sm rounded-full"
                        style={{ 
                          backgroundColor: user.personalColor || undefined,
                          color: user.personalColor ? 'white' : undefined
                        }}
                      >
                        {user.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full flex items-center justify-center">
                      <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm truncate">{user.userName}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {user.userRole}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{getPageDisplayName(user.currentPage)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatLastSeen(user.lastSeen)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigateToUser(user)}
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Go to Page
                  </Button>
                </div>
              ))}
            
            {onlineUsers.filter(user => user.isOnline).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Circle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No users are currently online</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
