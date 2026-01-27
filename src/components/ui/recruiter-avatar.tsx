import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  xs: 'w-6 h-6',
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
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Refs to track previous values and prevent unnecessary reloads
  const isMountedRef = useRef(true);
  const lastUserIdRef = useRef<string | null>(null);
  const lastAvatarUrlRef = useRef<string | null | undefined>(null);
  const lastImageRef = useRef<string | null | undefined>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const userId = user.id;
  const avatarUrl = user.avatarUrl;
  const image = user.image;

  // Handle avatar loading with caching and optimization to prevent unnecessary reloads
  const loadAvatar = useCallback(async () => {
    // Skip if nothing changed
    if (lastUserIdRef.current === userId && 
        lastAvatarUrlRef.current === avatarUrl && 
        lastImageRef.current === image && 
        !forceRefresh) {
      return;
    }

    // Update refs
    lastUserIdRef.current = userId;
    lastAvatarUrlRef.current = avatarUrl;
    lastImageRef.current = image;

    if (!avatarUrl && !image) {
      if (isMountedRef.current) {
        setImageUrl(null);
        setIsLoading(false);
        setImageLoaded(false);
      }
      return;
    }

    try {
      if (isMountedRef.current) {
        setIsLoading(true);
        setImageLoaded(false);
      }

      // Set timeout to prevent infinite loading
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error('Avatar loading timeout'));
        }, 10000); // 10 second timeout
      });

      const avatarPromise = getCachedAvatarUrl({ id: userId, avatarUrl, image }, forceRefresh, { size });
      
      const cachedUrl = await Promise.race([avatarPromise, timeoutPromise]);
      
      if (isMountedRef.current) {
        setImageUrl(cachedUrl);
        // Don't set isLoading to false here - wait for onLoad event
      }
    } catch (error) {
      console.warn('[RECRUITER_AVATAR] Failed to load avatar:', error);
      if (isMountedRef.current) {
        setImageUrl(null);
        setIsLoading(false);
        setImageLoaded(false);
      }
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [userId, avatarUrl, image, forceRefresh]);

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
          className={`object-cover object-top rounded-full image-fade-in ${imageLoaded ? 'loaded' : ''}`}
          onLoad={() => {
            setImageLoaded(true);
            setIsLoading(false);
          }}
          onError={() => {
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
  
  // Refs to track previous values and prevent unnecessary reloads
  const isMountedRef = useRef(true);
  const lastUserIdRef = useRef<string | null>(null);
  const lastAvatarUrlRef = useRef<string | null | undefined>(null);
  const lastImageRef = useRef<string | null | undefined>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const userId = user.id;
  const avatarUrl = user.avatarUrl;
  const image = user.image;

  // Handle avatar loading with caching and optimization to prevent unnecessary reloads
  const loadAvatar = useCallback(async () => {
    // Skip if nothing changed
    if (lastUserIdRef.current === userId && 
        lastAvatarUrlRef.current === avatarUrl && 
        lastImageRef.current === image) {
      return;
    }

    // Update refs
    lastUserIdRef.current = userId;
    lastAvatarUrlRef.current = avatarUrl;
    lastImageRef.current = image;

    if (!avatarUrl && !image) {
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

      const avatarPromise = getCachedAvatarUrl({ id: userId, avatarUrl, image }, false);
      
      const cachedUrl = await Promise.race([avatarPromise, timeoutPromise]);
      
      if (isMountedRef.current) {
        setImageUrl(cachedUrl);
        setIsLoading(false);
      }
    } catch (error) {
      console.warn('[RECRUITER_AVATAR_LARGE] Failed to load avatar:', error);
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
  }, [userId, avatarUrl, image]);

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
          onLoad={() => {
            setIsLoading(false);
          }}
          onError={() => {
            setImageUrl(null);
            setIsLoading(false);
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
  );
}
