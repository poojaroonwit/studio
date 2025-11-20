import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCachedAvatarUrl } from '@/lib/imageUtils';

interface UserAvatarProps {
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
}

const sizeClasses = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16'
};

const fontSizeClasses = {
  xs: 'text-xs',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg'
};

export function UserAvatar({ 
  user, 
  size = 'md', 
  className, 
  showTooltip = false,
  forceRefresh = false 
}: UserAvatarProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Handle avatar loading with caching and timeout protection
  const loadAvatar = useCallback(async () => {
    if (!user.avatarUrl && !user.image) {
      if (isMountedRef.current) {
        setImageUrl(null);
        setIsLoading(false);
      }
      return;
    }

    try {
      if (isMountedRef.current) {
        setIsLoading(true);
      }

      // Set timeout to prevent infinite loading
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error('Avatar loading timeout'));
        }, 10000); // 10 second timeout
      });

      const avatarPromise = getCachedAvatarUrl(user, forceRefresh);
      
      const cachedUrl = await Promise.race([avatarPromise, timeoutPromise]);
      
      if (isMountedRef.current) {
        setImageUrl(cachedUrl);
        setIsLoading(false);
      }
    } catch (error) {
      console.warn('[USER_AVATAR] Failed to load avatar:', error);
      if (isMountedRef.current) {
        setImageUrl(null);
        setIsLoading(false);
      }
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [user.id, user.avatarUrl, user.image, forceRefresh]);

  useEffect(() => {
    isMountedRef.current = true;
    loadAvatar();

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [loadAvatar]);
  
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
          'relative ring-4 shadow-xl bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-800/30',
          'group-hover:shadow-2xl transition-all duration-300 rounded-full',
          isLoading && 'animate-pulse',
          className
        )}
        style={{
          '--tw-ring-color': personalColor + '80',
          '--tw-ring-opacity': '0.8'
        } as React.CSSProperties}
        title={tooltipText}
      >
        {imageUrl ? (
          <AvatarImage 
            src={imageUrl} 
            alt={user.name}
            className={`object-cover object-top rounded-full image-fade-in ${imageLoaded ? 'loaded' : ''}`}
            onLoad={() => {
              setImageLoaded(true);
              setIsLoading(false);
            }}
            onError={() => {
              console.warn('[USER_AVATAR] Image failed to load:', imageUrl);
              setImageUrl(null);
              setIsLoading(false);
              setImageLoaded(false);
            }}
          />
        ) : null}
        <AvatarFallback 
          className={cn(
            "bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-700 dark:text-blue-300 font-bold rounded-full",
            fontSizeClasses[size]
          )}
          style={{ 
            backgroundColor: personalColor + '20',
            color: personalColor
          }}
        >
          {initials || <UserCircle className={cn(size === 'xs' ? 'h-2.5 w-2.5' : size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : size === 'lg' ? 'h-5 w-5' : 'h-6 w-6')} />}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

// Compact version for lists and tables
export function UserAvatarCompact({ user, size = 'sm', className, forceRefresh }: UserAvatarProps) {
  return (
    <UserAvatar 
      user={user} 
      size={size} 
      className={className}
      forceRefresh={forceRefresh}
    />
  );
}

// Large version for profile pages
export function UserAvatarLarge({ user, className }: UserAvatarProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Handle avatar loading with caching and timeout protection
  const loadAvatar = useCallback(async () => {
    if (!user.avatarUrl && !user.image) {
      if (isMountedRef.current) {
        setImageUrl(null);
        setIsLoading(false);
      }
      return;
    }

    try {
      if (isMountedRef.current) {
        setIsLoading(true);
      }

      // Set timeout to prevent infinite loading
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error('Avatar loading timeout'));
        }, 10000); // 10 second timeout
      });

      const avatarPromise = getCachedAvatarUrl(user, false);
      
      const cachedUrl = await Promise.race([avatarPromise, timeoutPromise]);
      
      if (isMountedRef.current) {
        setImageUrl(cachedUrl);
        setIsLoading(false);
      }
    } catch (error) {
      console.warn('[USER_AVATAR_LARGE] Failed to load avatar:', error);
      if (isMountedRef.current) {
        setImageUrl(null);
        setIsLoading(false);
      }
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [user.id, user.avatarUrl, user.image]);

  useEffect(() => {
    isMountedRef.current = true;
    loadAvatar();

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [loadAvatar]);
  
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
          'relative ring-4 shadow-xl bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-800/30',
          'group-hover:shadow-2xl transition-all duration-300 rounded-full',
          isLoading && 'animate-pulse',
          className
        )}
        style={{
          '--tw-ring-color': personalColor + '80',
          '--tw-ring-opacity': '0.8'
        } as React.CSSProperties}
        title={tooltipText}
      >
        {imageUrl ? (
          <AvatarImage 
            src={imageUrl} 
            alt={user.name}
            className="object-cover object-top rounded-full"
            onError={() => {
              console.warn('[USER_AVATAR_LARGE] Image failed to load:', imageUrl);
              setImageUrl(null);
            }}
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
    </div>
  );
}
