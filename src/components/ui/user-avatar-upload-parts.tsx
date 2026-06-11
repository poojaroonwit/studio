import type { CSSProperties, ChangeEventHandler, Ref } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getUserAvatarUploadInitials,
  USER_AVATAR_UPLOAD_FONT_SIZE_CLASSES,
  USER_AVATAR_UPLOAD_SIZE_CLASSES,
  type UserAvatarUploadSize,
  type UserAvatarUploadUser,
} from './user-avatar-upload-utils';

interface UserAvatarUploadMenuProps {
  disabled: boolean;
  displayImageUrl: string | null;
  fileInputRef: Ref<HTMLInputElement>;
  hasPersistentImage: boolean;
  isRemoving: boolean;
  isUploading: boolean;
  onFileSelect: ChangeEventHandler<HTMLInputElement>;
  onRemove: () => void;
  onUploadMenuSelect: () => void;
  size: UserAvatarUploadSize;
  user: UserAvatarUploadUser;
}

export function UserAvatarUploadMenu({
  disabled,
  displayImageUrl,
  fileInputRef,
  hasPersistentImage,
  isRemoving,
  isUploading,
  onFileSelect,
  onRemove,
  onUploadMenuSelect,
  size,
  user,
}: UserAvatarUploadMenuProps) {
  return (
    <div className="flex-shrink-0 relative">
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar
              className={cn(
                'relative ring-4 shadow-xl bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-800/30 cursor-pointer rounded-lg',
                USER_AVATAR_UPLOAD_SIZE_CLASSES[size]
              )}
              style={{
                pointerEvents: disabled || isUploading ? 'none' : 'auto',
                '--tw-ring-color': '#3b82f680',
                '--tw-ring-opacity': '0.8',
              } as CSSProperties}
            >
              {displayImageUrl ? (
                <AvatarImage src={displayImageUrl || undefined} alt={user.name} className="object-cover object-top rounded-lg" />
              ) : (
                <AvatarFallback className={cn(
                  "bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-700 dark:text-blue-300 font-bold rounded-lg",
                  USER_AVATAR_UPLOAD_FONT_SIZE_CLASSES[size]
                )}>
                  {getUserAvatarUploadInitials(user)}
                </AvatarFallback>
              )}

              {!disabled && !isUploading && (
                <div className="absolute -bottom-1 -right-1 p-1.5 bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-sm pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity duration-200">
                  <Edit className="w-3.5 h-3.5 text-primary" />
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={onFileSelect}
                tabIndex={-1}
                aria-hidden="true"
              />

              {isUploading && <UserAvatarUploadOverlay />}
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onSelect={() => {
                if (disabled || isUploading) return;
                onUploadMenuSelect();
              }}
            >
              <Edit className="h-4 w-4" /> Upload new image
            </DropdownMenuItem>
            {hasPersistentImage && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(event) => {
                    event.preventDefault();
                    if (!disabled && !isRemoving) {
                      onRemove();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Remove image
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function UserAvatarUploadOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
      <div className="flex flex-col items-center justify-center space-y-2 p-3">
        <div className="relative">
          <div className="w-8 h-8 border-2 border-primary/20 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <Upload className="absolute inset-0 w-8 h-8 text-primary/60 animate-bounce" />
        </div>
        <div className="text-xs text-muted-foreground font-medium">Uploading...</div>
      </div>
    </div>
  );
}

export function UserAvatarUploadError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div className="text-xs text-destructive text-center bg-destructive/10 px-2 py-1 rounded-md max-w-full">
      {message}
    </div>
  );
}
