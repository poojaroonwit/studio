import React from 'react';
import { usePreloadAvatarsLazy } from '@/hooks/use-avatar-cache';

interface User {
  id: string;
  avatarUrl?: string | null;
  image?: string | null;
}

interface AvatarPreloaderProps {
  users: User[];
  delay?: number;
  children?: React.ReactNode;
}

/**
 * Component for preloading avatars in the background
 * This component doesn't render anything visible but preloads avatars for better performance
 */
export function AvatarPreloader({ users, delay = 100, children }: AvatarPreloaderProps) {
  usePreloadAvatarsLazy(users, delay);

  // This component doesn't render anything visible
  return <>{children}</>;
}

/**
 * Higher-order component for preloading avatars
 */
export function withAvatarPreloader<P extends object>(
  Component: React.ComponentType<P>,
  usersExtractor: (props: P) => User[]
) {
  return function WithAvatarPreloader(props: P) {
    const users = usersExtractor(props);
    
    return (
      <>
        <AvatarPreloader users={users} />
        <Component {...props} />
      </>
    );
  };
}
