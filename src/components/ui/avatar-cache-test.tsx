import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from './user-avatar';
import { addCacheBuster, getCacheBustedImageUrl } from '@/lib/imageUtils';

interface AvatarCacheTestProps {
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    image?: string | null;
    email?: string;
  };
}

export function AvatarCacheTest({ user }: AvatarCacheTestProps) {
  const [forceRefresh, setForceRefresh] = useState(false);
  const [testUrl, setTestUrl] = useState('https://example.com/test-image.jpg');

  const handleForceRefresh = () => {
    setForceRefresh(prev => !prev);
  };

  const handleTestCacheBuster = () => {
    const originalUrl = user.avatarUrl || testUrl;
    const cacheBustedUrl = addCacheBuster(originalUrl, true);
    console.log('Original URL:', originalUrl);
    console.log('Cache-busted URL:', cacheBustedUrl);
    alert(`Cache-busted URL: ${cacheBustedUrl}`);
  };

  const handleTestGetCacheBustedUrl = () => {
    const cacheBustedUrl = getCacheBustedImageUrl(user, true);
    console.log('User:', user);
    console.log('Cache-busted URL:', cacheBustedUrl);
    alert(`Cache-busted URL: ${cacheBustedUrl}`);
  };

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <h3 className="text-lg font-semibold">Avatar Cache Test</h3>
      
      <div className="flex items-center gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Original Avatar:</p>
          <UserAvatar user={user} />
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground mb-2">With Force Refresh:</p>
          <UserAvatar user={user} forceRefresh={forceRefresh} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleForceRefresh} variant="outline" size="sm">
          Toggle Force Refresh
        </Button>
        
        <Button onClick={handleTestCacheBuster} variant="outline" size="sm">
          Test Cache Buster
        </Button>
        
        <Button onClick={handleTestGetCacheBustedUrl} variant="outline" size="sm">
          Test Get Cache Busted URL
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>Force Refresh State: {forceRefresh ? 'true' : 'false'}</p>
        <p>User Avatar URL: {user.avatarUrl || 'None'}</p>
        <p>User Image URL: {user.image || 'None'}</p>
      </div>
    </div>
  );
}
