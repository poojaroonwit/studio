import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useUserAvatarUpload } from './use-user-avatar-upload';
import {
  UserAvatarUploadError,
  UserAvatarUploadMenu,
} from './user-avatar-upload-parts';
import {
  hasPersistentUserAvatarImage,
  type UserAvatarUploadSize,
  type UserAvatarUploadUser,
} from './user-avatar-upload-utils';

interface UserAvatarUploadProps {
  user: UserAvatarUploadUser;
  onImageUpload: (imageUrl: string) => Promise<void>;
  onImageRemove: () => Promise<void>;
  className?: string;
  disabled?: boolean;
  size?: UserAvatarUploadSize;
}

export function UserAvatarUpload({
  user,
  onImageUpload,
  onImageRemove,
  className,
  disabled = false,
  size = 'lg',
}: UserAvatarUploadProps) {
  const upload = useUserAvatarUpload({
    onImageRemove,
    onImageUpload,
    user,
  });
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  const handleUploadMenuSelect = () => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => upload.fileInputRef.current?.click(), 0);
  };

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <UserAvatarUploadMenu
        disabled={disabled}
        displayImageUrl={upload.displayImageUrl}
        fileInputRef={upload.fileInputRef}
        hasPersistentImage={hasPersistentUserAvatarImage(user)}
        isRemoving={upload.isRemoving}
        isUploading={upload.isUploading}
        onFileSelect={upload.handleFileSelect}
        onRemove={upload.handleRemove}
        onUploadMenuSelect={handleUploadMenuSelect}
        size={size}
        user={user}
      />

      <UserAvatarUploadError message={upload.avatarError} />
    </div>
  );
}
