'use client';

import { useSimpleSSE, useCandidateUpdates, useNotifications } from '@/hooks/use-simple-sse';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff, Bell } from 'lucide-react';

export function SimpleSSEStatus() {
  const { isConnected, error, reconnect, disconnect } = useSimpleSSE();
  const { candidateUpdates, latestUpdate } = useCandidateUpdates();
  const { notifications, latestNotification } = useNotifications();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
          SSE Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span>Connection:</span>
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        {/* Error Display */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
            Error: {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Candidate Updates:</span>
            <div className="font-semibold">{candidateUpdates.length}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Notifications:</span>
            <div className="font-semibold">{notifications.length}</div>
          </div>
        </div>

        {/* Latest Updates */}
        {latestUpdate && (
          <div className="text-sm">
            <span className="text-muted-foreground">Latest Candidate Update:</span>
            <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1">
              {JSON.stringify(latestUpdate, null, 2)}
            </div>
          </div>
        )}

        {latestNotification && (
          <div className="text-sm">
            <span className="text-muted-foreground">Latest Notification:</span>
            <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1">
              {JSON.stringify(latestNotification, null, 2)}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={reconnect} 
            size="sm" 
            variant="outline"
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Reconnect
          </Button>
          <Button 
            onClick={disconnect} 
            size="sm" 
            variant="outline"
            className="flex items-center gap-1"
          >
            <WifiOff className="h-3 w-3" />
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
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
