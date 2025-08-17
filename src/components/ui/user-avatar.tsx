import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCacheBustedImageUrl } from '@/lib/imageUtils';

interface UserAvatarProps {
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    image?: string | null;
    email?: string;
    personalColor?: string | null;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTooltip?: boolean;
  forceRefresh?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16'
};

export function UserAvatar({ 
  user, 
  size = 'md', 
  className, 
  showTooltip = false,
  forceRefresh = false 
}: UserAvatarProps) {
  // Get cache-busted image URL to prevent browser caching issues
  const cacheBustedImageUrl = getCacheBustedImageUrl(user, forceRefresh);
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('UserAvatar Debug:', {
      user: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        image: user.image,
        personalColor: user.personalColor
      },
      cacheBustedImageUrl,
      forceRefresh
    });
  }
  
  // Generate initials from name
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(user.name);
  const tooltipText = showTooltip ? `${user.name}${user.email ? ` (${user.email})` : ''}` : undefined;

  // Use personal color for styling if available
  const personalColor = user.personalColor || '#3b82f6'; // Default blue

  return (
    <div className="relative group">
      {/* Gradient background blur effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
      
      {/* Main avatar with enhanced styling */}
      <Avatar 
        className={cn(
          sizeClasses[size],
          'relative ring-4 ring-background/80 shadow-xl bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-800/30',
          'group-hover:shadow-2xl group-hover:ring-primary/20 transition-all duration-300',
          className
        )}
        title={tooltipText}
      >
        {cacheBustedImageUrl ? (
          <AvatarImage 
            src={cacheBustedImageUrl} 
            alt={user.name}
            className="object-cover"
          />
        ) : null}
        <AvatarFallback 
          className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-700 dark:text-blue-300 font-bold"
          style={{ 
            backgroundColor: personalColor + '20',
            color: personalColor
          }}
        >
          {initials || <UserCircle className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

// Compact version for lists and tables
export function UserAvatarCompact({ user, size = 'sm', className }: UserAvatarProps) {
  return (
    <UserAvatar 
      user={user} 
      size={size} 
      className={className}
    />
  );
}

// Large version for profile pages
export function UserAvatarLarge({ user, className }: UserAvatarProps) {
  // Get cache-busted image URL to prevent browser caching issues
  const cacheBustedImageUrl = getCacheBustedImageUrl(user, false);
  
  // Generate initials from name
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(user.name);
  const tooltipText = `${user.name}${user.email ? ` (${user.email})` : ''}`;
  const personalColor = user.personalColor || '#3b82f6'; // Default blue

  return (
    <div className="relative group">
      {/* Gradient background blur effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
      
      {/* Main avatar with enhanced styling */}
      <Avatar 
        className={cn(
          'h-16 w-16',
          'relative ring-4 ring-background/80 shadow-xl bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-800/30',
          'group-hover:shadow-2xl group-hover:ring-primary/20 transition-all duration-300',
          className
        )}
        title={tooltipText}
      >
        {cacheBustedImageUrl ? (
          <AvatarImage 
            src={cacheBustedImageUrl} 
            alt={user.name}
            className="object-cover"
          />
        ) : null}
        <AvatarFallback 
          className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-700 dark:text-blue-300 font-bold text-lg"
          style={{ 
            backgroundColor: personalColor + '20',
            color: personalColor
          }}
        >
          {initials || <UserCircle className="h-6 w-6" />}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
