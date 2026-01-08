"use client";

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface LoadingMonitorProps {
  isLoading: boolean;
  error: string | null;
  startTime?: number;
  candidateId?: string;
  onRetry?: () => void;
}

export const LoadingMonitor: React.FC<LoadingMonitorProps> = ({
  isLoading,
  error,
  startTime,
  candidateId,
  onRetry
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isLoading || !startTime) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading, startTime]);

  if (!isLoading && !error) {
    return null;
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Card className="w-full max-w-md mx-auto mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Loading Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {candidateId && (
          <div className="text-xs text-muted-foreground">
            Candidate ID: <code className="bg-muted px-1 rounded">{candidateId}</code>
          </div>
        )}
        
        {isLoading && (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm">Loading candidate details...</span>
            <Badge variant="secondary" className="ml-auto">
              {formatTime(elapsedTime)}
            </Badge>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        )}

        {elapsedTime > 5000 && isLoading && (
          <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-warning">Slow Loading</p>
              <p className="text-xs text-muted-foreground mt-1">
                This is taking longer than expected. Consider refreshing the page.
              </p>
            </div>
          </div>
        )}

        {onRetry && error && (
          <Button 
            onClick={onRetry} 
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            Retry Loading
          </Button>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>💡 Debug Tips:</p>
                     <ul className="list-disc list-inside mt-1 space-y-1">
             <li>Check browser console for errors</li>
             <li>Check network tab for failed requests</li>
             <li>Ensure you have proper permissions</li>
           </ul>
        </div>
      </CardContent>
    </Card>
  );
};
