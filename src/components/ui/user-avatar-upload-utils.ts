export type UserAvatarUploadSize = 'sm' | 'md' | 'lg' | 'xl';

export interface UserAvatarUploadUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  image?: string | null;
  email?: string;
}

export const USER_AVATAR_UPLOAD_SIZE_CLASSES: Record<UserAvatarUploadSize, string> = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
  xl: 'w-24 h-24',
};

export const USER_AVATAR_UPLOAD_FONT_SIZE_CLASSES: Record<UserAvatarUploadSize, string> = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

export function getUserAvatarUploadInitials(user: UserAvatarUploadUser) {
  return user.name?.charAt(0)?.toUpperCase()
    || user.email?.charAt(0)?.toUpperCase()
    || '?';
}

export function hasPersistentUserAvatarImage(user: UserAvatarUploadUser) {
  return Boolean(user.avatarUrl || user.image);
}
