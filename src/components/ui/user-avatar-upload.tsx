import React, { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { addCacheBuster, getCacheBustedImageUrl, refreshImage } from '@/lib/imageUtils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface UserAvatarUploadProps {
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    image?: string | null;
    email?: string;
  };
  onImageUpload: (imageUrl: string) => Promise<void>;
  onImageRemove: () => Promise<void>;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function UserAvatarUpload({ 
  user, 
  onImageUpload, 
  onImageRemove, 
  className,
  disabled = false,
  size = 'lg'
}: UserAvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const lastObjectUrlRef = useRef<string | null>(null);

  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-xl',
    lg: 'w-20 h-20 text-2xl',
    xl: 'w-24 h-24 text-3xl'
  };

  // Avatar click shows dropdown via DropdownMenuTrigger

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      await onImageUpload(data.file.url);
      
      // Refresh the image to ensure it's properly loaded
      await refreshImage(data.file.url);
      
      toast.success('Profile image updated successfully');
      
      // Display uploaded URL immediately with cache buster
      setPreviewUrl(addCacheBuster(data.file.url, true));
      // Force refresh so cache-busted URLs are generated even if user prop hasn't updated yet
      setForceRefresh(true);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      setAvatarError('Failed to upload image. Please try again.');
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    setAvatarError(null);
    
    try {
      // Clear cache for current image if it exists
      if (user.avatarUrl) {
        refreshImage(user.avatarUrl);
      }
      
      await onImageRemove();
      toast.success('Profile image removed successfully');
      // Force refresh to ensure image is cleared
      setForceRefresh(true);
      // Clear any local preview
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }
      setPreviewUrl(null);
    } catch (error) {
      console.error('Remove error:', error);
      setAvatarError('Failed to remove image. Please try again.');
      toast.error('Failed to remove image. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  // Use cache-busted URL for display
  const displayImageUrl = previewUrl || getCacheBustedImageUrl(user, forceRefresh);
  const hasPersistentImage = Boolean(user.avatarUrl || user.image);
  const initials = user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?';

  // Cleanup object URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }
    };
  }, []);

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* Avatar with dropdown actions */}
      <div className="flex-shrink-0 relative">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar 
                className={cn(
                  'relative ring-4 ring-background/80 shadow-xl bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-800/30 cursor-pointer',
                  sizeClasses[size]
                )}
                style={{ pointerEvents: disabled || isUploading ? 'none' : 'auto' }}
              >
                {displayImageUrl ? (
                  <AvatarImage src={displayImageUrl || undefined} alt={user.name} className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-700 dark:text-blue-300 font-bold">
                    {initials}
                  </AvatarFallback>
                )}
                {/* Pencil edit affordance */}
                {!disabled && !isUploading && (
                  <div className="absolute -bottom-1 -right-1 p-1.5 bg-background/95 backdrop-blur-sm border border-border/50 rounded-full shadow-sm pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity duration-200">
                    <Edit className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                {/* Hidden file input for avatar upload */}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  tabIndex={-1}
                  aria-hidden="true"
                />
                {/* Loading spinner */}
                {isUploading && (
                  <div className="animate-spin text-primary h-7 w-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 border-2 border-current border-t-transparent rounded-full" />
                )}
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onSelect={() => {
                  if (disabled || isUploading) return;
                  setTimeout(() => fileInputRef.current?.click(), 0);
                }}
              >
                <Edit className="h-4 w-4" /> Upload new image
              </DropdownMenuItem>
              {hasPersistentImage && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      if (!disabled && !isRemoving) {
                        handleRemove();
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

      {/* Error message */}
      {avatarError && (
        <div className="text-xs text-destructive text-center bg-destructive/10 px-2 py-1 rounded-md max-w-full">
          {avatarError}
        </div>
      )}

      {/* Inline remove button removed: actions moved to dropdown */}
    </div>
  );
}
