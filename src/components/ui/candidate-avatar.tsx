import React, { useEffect, useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Handle avatar loading with caching
  useEffect(() => {
    let isMounted = true;

    const loadAvatar = async () => {
      if (!user.avatarUrl && !user.image) {
        if (isMounted) {
          setImageUrl(null);
          setIsLoading(false);
          setImageLoaded(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setImageLoaded(false);
        const cachedUrl = await getCachedAvatarUrl(user, forceRefresh);
        if (isMounted) {
          setImageUrl(cachedUrl);
          // Don't set isLoading to false here - wait for onLoad event
        }
      } catch (error) {
        console.warn('Failed to load avatar:', error);
        if (isMounted) {
          setImageUrl(null);
          setIsLoading(false);
          setImageLoaded(false);
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
