import React, { useEffect, useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCachedAvatarUrl } from '@/lib/imageUtils';

interface CandidateAvatarProps {
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
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-12 w-12'
};

const fontSizeClasses = {
  sm: 'text-xs',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-base'
};

export function CandidateAvatar({
  user,
  size = 'md',
  className,
  showTooltip = false,
  forceRefresh = false
}: CandidateAvatarProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => !!(user.avatarUrl || user.image));
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
  useEffect(() => {
    // Skip if nothing changed
    if (lastUserIdRef.current === userId &&
      lastAvatarUrlRef.current === avatarUrl &&
      lastImageRef.current === image &&
      !forceRefresh) {
      return;
    }

    // Check if we should show loading spinner/skeleton
    // We only show loading if the actual cached resource path changes, 
    // ignoring query parameters (like SAS signatures that change frequently)
    const getPath = (u: string | null | undefined) => {
      if (!u) return '';
      try { return new URL(u, 'http://d').pathname; } catch { return u; }
    };

    const isSameResource =
      lastUserIdRef.current === userId &&
      getPath(lastAvatarUrlRef.current) === getPath(avatarUrl);

    // Update refs
    lastUserIdRef.current = userId;
    lastAvatarUrlRef.current = avatarUrl;
    lastImageRef.current = image;

    isMountedRef.current = true;

    // Cleanup function
    const cleanup = () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    if (!avatarUrl && !image) {
      if (isMountedRef.current) {
        setImageUrl(null);
        setIsLoading(false);
        setImageLoaded(false);
      }
      return cleanup;
    }

    // Load avatar asynchronously
    let isCancelled = false;

    const loadAvatar = async () => {
      try {
        if (isMountedRef.current && !isCancelled) {
          // Only trigger loading state if the resource actually changed
          if (!isSameResource) {
            setIsLoading(true);
            setImageLoaded(false);
          }
        }
        // Set timeout to prevent infinite loading
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutRef.current = setTimeout(() => {
            reject(new Error('Avatar loading timeout'));
          }, 10000); // 10 second timeout
        });

        const avatarPromise = getCachedAvatarUrl({ id: userId, avatarUrl, image }, forceRefresh);

        const cachedUrl = await Promise.race([avatarPromise, timeoutPromise]);

        if (isMountedRef.current && !isCancelled) {
          setImageUrl(cachedUrl);
          // Don't set isLoading to false here - wait for onLoad event
        }
      } catch (error) {
        console.warn('[CANDIDATE_AVATAR] Failed to load avatar:', error);
        if (isMountedRef.current && !isCancelled) {
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
    };

    loadAvatar();

    return () => {
      isCancelled = true;
      cleanup();
    };
  }, [userId, avatarUrl, image, forceRefresh]);

  // Generate initials from name
  const getInitials = (name: string) => {
    if (!name) return 'C';
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
        'transition-all duration-300 rounded-md',
        isLoading && 'animate-pulse',
        className
      )}
      title={tooltipText}
    >
      {imageUrl ? (
        <AvatarImage
          src={imageUrl}
          alt={user.name}
          className={`object-cover object-top rounded-md image-fade-in ${imageLoaded ? 'loaded' : ''}`}
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
          "bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-700 dark:text-blue-300 font-bold rounded-md",
          fontSizeClasses[size]
        )}
        style={{
          backgroundColor: personalColor + '20',
          color: personalColor
        }}
      >
        {initials || <UserCircle className={cn(size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-5 w-5')} />}
      </AvatarFallback>
    </Avatar>
  );
}

// Compact version for lists and tables
export function CandidateAvatarCompact({ user, size = 'sm', className, forceRefresh }: CandidateAvatarProps) {
  return (
    <CandidateAvatar
      user={user}
      size={size}
      className={className}
      forceRefresh={forceRefresh}
    />
  );
}

// Large version for profile pages
export function CandidateAvatarLarge({ user, className }: CandidateAvatarProps) {
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
  useEffect(() => {
    // Skip if nothing changed
    if (lastUserIdRef.current === userId &&
      lastAvatarUrlRef.current === avatarUrl &&
      lastImageRef.current === image) {
      return;
    }

    // Check if we should show loading spinner/skeleton
    // We only show loading if the actual cached resource path changes, 
    // ignoring query parameters (like SAS signatures that change frequently)
    const getPath = (u: string | null | undefined) => {
      if (!u) return '';
      try { return new URL(u, 'http://d').pathname; } catch { return u; }
    };

    const isSameResource =
      lastUserIdRef.current === userId &&
      getPath(lastAvatarUrlRef.current) === getPath(avatarUrl);

    // Update refs
    lastUserIdRef.current = userId;
    lastAvatarUrlRef.current = avatarUrl;
    lastImageRef.current = image;

    isMountedRef.current = true;

    // Cleanup function
    const cleanup = () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    if (!avatarUrl && !image) {
      if (isMountedRef.current) {
        setImageUrl(null);
        setIsLoading(false);
      }
      return cleanup;
    }

    // Load avatar asynchronously
    let isCancelled = false;

    const loadAvatar = async () => {
      try {
        if (isMountedRef.current && !isCancelled) {
          // Only trigger loading state if the resource actually changed
          if (!isSameResource) {
            setIsLoading(true);
          }
        }

        // Set timeout to prevent infinite loading
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutRef.current = setTimeout(() => {
            reject(new Error('Avatar loading timeout'));
          }, 10000); // 10 second timeout
        });

        const avatarPromise = getCachedAvatarUrl({ id: userId, avatarUrl, image }, false);

        const cachedUrl = await Promise.race([avatarPromise, timeoutPromise]);

        if (isMountedRef.current && !isCancelled) {
          setImageUrl(cachedUrl);
          setIsLoading(false);
        }
      } catch (error) {
        console.warn('[CANDIDATE_AVATAR_LARGE] Failed to load avatar:', error);
        if (isMountedRef.current && !isCancelled) {
          setImageUrl(null);
          setIsLoading(false);
        }
      } finally {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    };

    loadAvatar();

    return () => {
      isCancelled = true;
      cleanup();
    };
  }, [userId, avatarUrl, image]);

  // Generate initials from name
  const getInitials = (name: string) => {
    if (!name) return 'C';
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
        'h-12 w-12',
        'relative bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-800/30',
        'transition-all duration-300 rounded-md',
        isLoading && 'animate-pulse',
        className
      )}
      title={tooltipText}
    >
      {imageUrl ? (
        <AvatarImage
          src={imageUrl}
          alt={user.name}
          className="object-cover object-top rounded-md"
        />
      ) : null}
      <AvatarFallback
        className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-700 dark:text-blue-300 font-bold text-base rounded-md"
        style={{
          backgroundColor: personalColor + '20',
          color: personalColor
        }}
      >
        {initials || <UserCircle className="h-5 w-5" />}
      </AvatarFallback>
    </Avatar>
  );
}
