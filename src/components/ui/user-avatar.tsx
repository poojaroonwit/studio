import type { CSSProperties } from 'react';
import { UserCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  getAvatarFallbackIconClass,
  getAvatarInitials,
  getAvatarTooltip,
  useCachedAvatarImage,
  type AvatarSize,
  type CachedAvatarUser,
} from './use-cached-avatar-image';

interface UserAvatarProps {
  user: CachedAvatarUser;
  size?: AvatarSize;
  className?: string;
  showTooltip?: boolean;
  forceRefresh?: boolean;
}

const sizeClasses = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const fontSizeClasses = {
  xs: 'text-xs',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

export function UserAvatar({
  user,
  size = 'md',
  className,
  showTooltip = false,
  forceRefresh = false,
}: UserAvatarProps) {
  const personalColor = user.personalColor || '#3b82f6';
  const initials = getAvatarInitials(user.name, 'U');
  const { imageUrl, isLoading, imageLoaded, handleImageLoad, handleImageError } = useCachedAvatarImage(user, {
    forceRefresh,
    size,
    warningLabel: 'USER_AVATAR',
  });

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300" />
      <Avatar
        className={cn(
          sizeClasses[size],
          'relative ring-4 shadow-xl bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-800/30',
          'group-hover:shadow-2xl transition-all duration-300 rounded-full',
          isLoading && (user.avatarUrl || user.image) && 'animate-pulse',
          className
        )}
        style={{
          '--tw-ring-color': `${personalColor}80`,
          '--tw-ring-opacity': '0.8',
        } as CSSProperties}
        title={getAvatarTooltip(user, showTooltip)}
      >
        {imageUrl ? (
          <AvatarImage
            src={imageUrl}
            alt={user.name || 'User'}
            className={`object-cover object-top rounded-full image-fade-in ${imageLoaded ? 'loaded' : ''}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : null}
        <AvatarFallback
          className={cn(
            "bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-700 dark:text-blue-300 font-bold rounded-full",
            fontSizeClasses[size]
          )}
          style={{
            backgroundColor: `${personalColor}20`,
            color: personalColor,
          }}
        >
          {initials || <UserCircle className={getAvatarFallbackIconClass(size)} />}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

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

export function UserAvatarLarge({ user, className }: UserAvatarProps) {
  return <UserAvatar user={user} size="xl" className={className} showTooltip />;
}
