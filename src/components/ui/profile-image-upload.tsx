import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  ImageUp, 
  Trash2, 
  Camera, 
  Loader2, 
  X,
  Check,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Upload
} from 'lucide-react';
import { UserAvatar } from './user-avatar';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { getCacheBustedImageUrl, refreshImage } from '@/lib/imageUtils';

interface ProfileImageUploadProps {
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
}

export function ProfileImageUpload({ 
  user, 
  onImageUpload, 
  onImageRemove, 
  className,
  disabled = false 
}: ProfileImageUploadProps) {
  
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    
    // Immediately create preview URL for instant feedback
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Upload immediately
    await handleUpload(file);
  };

  const handleUpload = async (file: File) => {
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
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      
      // Force refresh to ensure new image is displayed
      setForceRefresh(true);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image. Please try again.');
      // Clear preview on error
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
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
      toast.error('Failed to remove image. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  // Use preview URL if available, otherwise use user's avatar URL with cache busting
  const displayImageUrl = previewUrl || getCacheBustedImageUrl(user, forceRefresh);
  const hasImage = displayImageUrl || user.avatarUrl || user.image;

  return (
    <div className={cn('space-y-4', className)}>
      
      <div className="flex items-center gap-4">
        <UserAvatar 
          user={{
            ...user,
            avatarUrl: displayImageUrl || undefined
          }}
          forceRefresh={forceRefresh}
        />
        
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="flex items-center gap-2"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {hasImage ? 'Change Photo' : 'Upload Photo'}
            </Button>
            
            {hasImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={disabled || isRemoving}
                className="flex items-center gap-2 text-destructive hover:text-destructive"
              >
                {isRemoving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Remove
              </Button>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground">
            JPG, PNG or GIF. Max size 5MB.
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}

// Compact version for forms and modals
export function ProfileImageUploadCompact({ 
  user, 
  onImageUpload, 
  onImageRemove, 
  className,
  disabled = false 
}: ProfileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL and update avatar immediately
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Upload immediately
    await handleUpload(file);
  };

  const handleUpload = async (file: File) => {
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
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      
      // Force refresh to ensure new image is displayed
      setForceRefresh(true);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image. Please try again.');
      // Clear preview on error
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
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
      toast.error('Failed to remove image. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  // Use preview URL if available, otherwise use user's avatar URL with cache busting
  const displayImageUrl = previewUrl || getCacheBustedImageUrl(user, forceRefresh);
  const hasImage = displayImageUrl || user.avatarUrl || user.image;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <UserAvatar 
        user={{
          ...user,
          avatarUrl: displayImageUrl || undefined
        }} 
        size="lg"
        forceRefresh={forceRefresh}
      />
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="flex items-center gap-2"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageUp className="h-4 w-4" />
            )}
            {hasImage ? 'Change' : 'Upload'}
          </Button>
          
          {hasImage && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || isRemoving}
              className="flex items-center gap-2 text-destructive hover:text-destructive"
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Remove
            </Button>
          )}
        </div>
        
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
