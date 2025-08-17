import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { getCacheBustedImageUrl, refreshImage } from '@/lib/imageUtils';

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

  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-xl',
    lg: 'w-20 h-20 text-2xl',
    xl: 'w-24 h-24 text-3xl'
  };

  const handleAvatarClick = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select a valid image file');
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image size must be less than 5MB');
      toast.error('Image size must be less than 5MB');
      return;
    }

    setAvatarError(null);
    
    // Immediately show preview for instant feedback
    const previewUrl = URL.createObjectURL(file);
    setPreviewUrl(previewUrl);
    
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
      
      // Force refresh to ensure new image is displayed
      setForceRefresh(true);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      setAvatarError('Failed to upload image. Please try again.');
      toast.error('Failed to upload image. Please try again.');
      // Clear preview on error
      setPreviewUrl(null);
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
    } catch (error) {
      console.error('Remove error:', error);
      setAvatarError('Failed to remove image. Please try again.');
      toast.error('Failed to remove image. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  // Use cache-busted URL for display
  const displayImageUrl = getCacheBustedImageUrl(user, forceRefresh);
  const hasImage = displayImageUrl || user.avatarUrl || user.image;
  const initials = user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* Avatar with upload functionality */}
      <div className="flex-shrink-0 relative">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <Avatar 
            className={cn(
              'relative ring-4 ring-background/80 shadow-xl bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-800/30 cursor-pointer',
              sizeClasses[size]
            )}
            onClick={handleAvatarClick}
            style={{ pointerEvents: disabled || isUploading ? 'none' : 'auto' }}
          >
            {hasImage ? (
              <AvatarImage src={displayImageUrl} alt={user.name} className="object-cover" />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-700 dark:text-blue-300 font-bold">
                {initials}
              </AvatarFallback>
            )}
            
            {/* Pencil icon button for avatar upload */}
            <div
              role="button"
              tabIndex={0}
              className="absolute -bottom-1 -right-1 p-2 bg-background/95 backdrop-blur-sm border border-border/50 rounded-full hover:bg-primary/10 hover:scale-110 transition-all duration-200 z-10 flex items-center justify-center shadow-lg"
              title="Change profile picture"
              onClick={(e) => {
                e.stopPropagation();
                if (fileInputRef?.current) fileInputRef.current.click();
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  if (fileInputRef?.current) fileInputRef.current.click();
                }
              }}
              aria-disabled={disabled || isUploading}
              style={{ pointerEvents: disabled || isUploading ? 'none' : 'auto' }}
            >
              <Edit className="w-4 h-4 text-primary" />
            </div>
            
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
        </div>
      </div>

      {/* Error message */}
      {avatarError && (
        <div className="text-xs text-destructive text-center bg-destructive/10 px-2 py-1 rounded-md max-w-full">
          {avatarError}
        </div>
      )}

      {/* Delete button */}
      {hasImage && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRemove}
          disabled={disabled || isRemoving}
          className="flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          {isRemoving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Remove Image
        </Button>
      )}
    </div>
  );
}
