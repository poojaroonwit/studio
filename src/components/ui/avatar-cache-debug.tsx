import React, { useState, useEffect } from 'react';
import { getAvatarCacheStats, clearAvatarCache } from '@/lib/imageUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Debug component for monitoring avatar cache performance
 * Only renders in development mode
 */
export function AvatarCacheDebug() {
  const [stats, setStats] = useState(getAvatarCacheStats());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const interval = setInterval(() => {
      setStats(getAvatarCacheStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleClearCache = () => {
    clearAvatarCache();
    setStats(getAvatarCacheStats());
  };

  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isVisible ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsVisible(true)}
          className="bg-background/80 backdrop-blur-sm"
        >
          Cache Debug
        </Button>
      ) : (
        <Card className="w-64 bg-background/80 backdrop-blur-sm border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Avatar Cache Stats
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Cache Size:</span>
              <Badge variant="secondary" className="text-xs">
                {stats.size}/{stats.maxSize}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Cache Duration:</span>
              <span>{Math.round(stats.duration / 1000)}s</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Usage:</span>
              <span>{Math.round((stats.size / stats.maxSize) * 100)}%</span>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleClearCache}
              className="w-full text-xs"
            >
              Clear Cache
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
