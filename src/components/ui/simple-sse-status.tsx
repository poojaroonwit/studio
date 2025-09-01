'use client';

import React from 'react';
import { useSimpleSSE } from '@/hooks/use-simple-sse';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';

export function SimpleSSEStatus() {
  const { isConnected, error, connectionAttempts, reconnect, disconnect } = useSimpleSSE();

  const getStatusColor = () => {
    if (error) return 'destructive';
    if (isConnected) return 'default';
    return 'secondary';
  };

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="h-3 w-3" />;
    if (isConnected) return <Wifi className="h-3 w-3" />;
    return <WifiOff className="h-3 w-3" />;
  };

  const getStatusText = () => {
    if (error) return `Error: ${error}`;
    if (isConnected) return 'Connected';
    return 'Disconnected';
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getStatusColor()} className="flex items-center gap-1">
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
      
      {connectionAttempts > 0 && (
        <span className="text-xs text-muted-foreground">
          Attempts: {connectionAttempts}
        </span>
      )}
      
      <div className="flex gap-1">
        {isConnected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={disconnect}
            className="h-6 px-2 text-xs"
          >
            Disconnect
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={reconnect}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reconnect
          </Button>
        )}
      </div>
    </div>
  );
}

// Example of how to use SSE in a component
export function CandidateListWithSSE() {
  const { candidateUpdates, latestUpdate } = useCandidateUpdates();

  return (
    <div>
      <h3>Candidate Updates ({candidateUpdates.length})</h3>
      {latestUpdate && (
        <div className="text-sm text-green-600">
          Latest: {latestUpdate.action} - {latestUpdate.candidate?.name}
        </div>
      )}
      {/* Your candidate list component here */}
    </div>
  );
}

// Example of how to use notifications
export function NotificationCenter() {
  const { notifications, latestNotification } = useNotifications();

  return (
    <div className="relative">
      <Button variant="outline" size="sm" className="relative">
        <Bell className="h-4 w-4" />
        {notifications.length > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
            {notifications.length}
          </Badge>
        )}
      </Button>
      
      {latestNotification && (
        <div className="absolute top-full right-0 mt-2 p-2 bg-white border rounded shadow-lg text-sm">
          {latestNotification.message}
        </div>
      )}
    </div>
  );
}
