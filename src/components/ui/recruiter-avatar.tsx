import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCachedAvatarUrl, preloadImage } from '@/lib/imageUtils';

interface RecruiterAvatarProps {
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    image?: string | null;
    email?: string;
    personalColor?: string | null;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTooltip?: boolean;
  forceRefresh?: boolean;
  showBorder?: boolean;
}

const sizeClasses = {
  xs: 'h-4 w-4',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16'
};

export function RecruiterAvatar({
  user,
  size = 'md',
  className,
  showTooltip = false,
  forceRefresh = false,
  showBorder = true
}: RecruiterAvatarProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Handle avatar loading with caching
  useEffect(() => {
    let isMounted = true;

    const loadAvatar = async () => {
      if (!user.avatarUrl && !user.image) {
        if (isMounted) {
          setImageUrl(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        const cachedUrl = await getCachedAvatarUrl(user, forceRefresh);
        if (isMounted) {
          setImageUrl(cachedUrl);
          setIsLoading(false);
        }
      } catch (error) {
        console.warn('Failed to load avatar:', error);
        if (isMounted) {
          setImageUrl(null);
          setIsLoading(false);
        }
      }
    };

    loadAvatar();

    return () => {
      isMounted = false;
    };
  }, [user.id, user.avatarUrl, user.image, forceRefresh]);

  // Generate initials from name
  const getInitials = (name: string) => {
    if (!name) return 'R';
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
    <Avatar
      className={cn(
        sizeClasses[size],
        'relative bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-800/30',
        'transition-all duration-300 rounded-full',
        showBorder && 'ring-2 ring-offset-2 ring-offset-background',
        isLoading && 'animate-pulse',
        className
      )}
      style={showBorder ? {
        '--tw-ring-color': personalColor,
        '--tw-ring-opacity': '0.8'
      } as React.CSSProperties : undefined}
      title={tooltipText}
    >
      {imageUrl ? (
        <AvatarImage
          src={imageUrl}
          alt={user.name}
          className="object-cover object-top rounded-full"
        />
      ) : null}
      <AvatarFallback
        className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-700 dark:text-blue-300 font-bold rounded-full"
        style={{
          backgroundColor: personalColor + '20',
          color: personalColor
        }}
      >
        {initials || <UserCircle className={size === 'xs' ? 'h-2 w-2' : 'h-4 w-4'} />}
      </AvatarFallback>
    </Avatar>
  );
}

// Compact version for lists and tables
export function RecruiterAvatarCompact({ user, size = 'xs', className, forceRefresh, showBorder = true }: RecruiterAvatarProps) {
  return (
    <RecruiterAvatar
      user={user}
      size={size}
      className={className}
      forceRefresh={forceRefresh}
      showBorder={showBorder}
    />
  );
}

// Large version for profile pages
export function RecruiterAvatarLarge({ user, className, showBorder = true }: RecruiterAvatarProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Handle avatar loading with caching
  useEffect(() => {
    let isMounted = true;

    const loadAvatar = async () => {
      if (!user.avatarUrl && !user.image) {
        if (isMounted) {
          setImageUrl(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        const cachedUrl = await getCachedAvatarUrl(user, false);
        if (isMounted) {
          setImageUrl(cachedUrl);
          setIsLoading(false);
        }
      } catch (error) {
        console.warn('Failed to load avatar:', error);
        if (isMounted) {
          setImageUrl(null);
          setIsLoading(false);
        }
      }
    };

    loadAvatar();

    return () => {
      isMounted = false;
    };
  }, [user.id, user.avatarUrl, user.image]);

  // Generate initials from name
  const getInitials = (name: string) => {
    if (!name) return 'R';
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
    <Avatar
      className={cn(
        'h-16 w-16',
        'relative bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-800/30',
        'transition-all duration-300 rounded-full',
        showBorder && 'ring-2 ring-offset-2 ring-offset-background',
        isLoading && 'animate-pulse',
        className
      )}
      style={showBorder ? {
        '--tw-ring-color': personalColor,
        '--tw-ring-opacity': '0.8'
      } as React.CSSProperties : undefined}
      title={tooltipText}
    >
      {imageUrl ? (
        <AvatarImage
          src={imageUrl}
          alt={user.name}
          className="object-cover object-top rounded-full"
        />
      ) : null}
      <AvatarFallback
        className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-700 dark:text-blue-300 font-bold text-lg rounded-full"
        style={{
          backgroundColor: personalColor + '20',
          color: personalColor
        }}
      >
        {initials || <UserCircle className="h-6 w-6" />}
      </AvatarFallback>
    </Avatar>
  );
}
