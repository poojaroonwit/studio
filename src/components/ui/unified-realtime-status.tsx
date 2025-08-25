import React from 'react';
import { Badge } from './badge';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Users, 
  Activity, 
  Signal, 
  SignalHigh, 
  SignalMedium, 
  SignalLow,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UnifiedRealtimeStatusProps {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastUpdate: Date | null;
  connectionHealth: 'excellent' | 'good' | 'poor' | 'disconnected';
  connectedUsers: number;
  totalConnections: number;
  messageCount: number;
  errorCount: number;
  errorRate: number;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function UnifiedRealtimeStatus({
  isConnected,
  isReconnecting,
  reconnectAttempts,
  lastUpdate,
  connectionHealth,
  connectedUsers,
  totalConnections,
  messageCount,
  errorCount,
  errorRate,
  className,
  showDetails = false,
  compact = false
}: UnifiedRealtimeStatusProps) {
  const getConnectionIcon = () => {
    if (isReconnecting) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (isConnected) return <Wifi className="h-4 w-4" />;
    return <WifiOff className="h-4 w-4" />;
  };

  const getConnectionColor = () => {
    if (isReconnecting) return 'text-yellow-600';
    if (isConnected) return 'text-green-600';
    return 'text-red-600';
  };

  const getHealthIcon = () => {
    switch (connectionHealth) {
      case 'excellent':
        return <SignalHigh className="h-4 w-4 text-green-600" />;
      case 'good':
        return <SignalMedium className="h-4 w-4 text-yellow-600" />;
      case 'poor':
        return <SignalLow className="h-4 w-4 text-red-600" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getHealthColor = () => {
    switch (connectionHealth) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'good':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'disconnected':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getErrorRateColor = () => {
    if (errorRate === 0) return 'text-green-600';
    if (errorRate < 0.05) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatLastUpdate = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn("flex items-center gap-1", getConnectionColor())}>
          {getConnectionIcon()}
          <span className="text-sm font-medium">
            {isReconnecting ? 'Reconnecting' : isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
        
        {isConnected && (
          <div className="flex items-center gap-1">
            {getHealthIcon()}
            <span className="text-xs text-gray-600">
              {connectedUsers} users
            </span>
          </div>
        )}
        
        {isReconnecting && reconnectAttempts > 0 && (
          <Badge variant="secondary" className="text-xs">
            Attempt {reconnectAttempts}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Real-time Status
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getConnectionIcon()}
            <span className="font-medium">Connection</span>
          </div>
          <Badge 
            variant={isConnected ? "default" : isReconnecting ? "secondary" : "destructive"}
            className={cn("flex items-center gap-1", getConnectionColor())}
          >
            {isReconnecting ? 'Reconnecting' : isConnected ? 'Connected' : 'Disconnected'}
            {isReconnecting && reconnectAttempts > 0 && ` (${reconnectAttempts})`}
          </Badge>
        </div>

        {/* Connection Health */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getHealthIcon()}
            <span className="font-medium">Health</span>
          </div>
          <Badge 
            variant="outline" 
            className={cn("capitalize", getHealthColor())}
          >
            {connectionHealth}
          </Badge>
        </div>

        {/* Last Update */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-600" />
            <span className="font-medium">Last Update</span>
          </div>
          <span className="text-sm text-gray-600">
            {formatLastUpdate(lastUpdate)}
          </span>
        </div>

        {/* Connected Users */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-600" />
            <span className="font-medium">Active Users</span>
          </div>
          <span className="text-sm font-medium">
            {connectedUsers}
          </span>
        </div>

        {showDetails && (
          <>
            {/* Total Connections */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Connections</span>
              <span className="text-sm font-medium">{totalConnections}</span>
            </div>

            {/* Message Statistics */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Messages Sent</span>
                <span className="text-sm font-medium">{messageCount.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Errors</span>
                <span className={cn("text-sm font-medium", getErrorRateColor())}>
                  {errorCount.toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Error Rate</span>
                <span className={cn("text-sm font-medium", getErrorRateColor())}>
                  {(errorRate * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </>
        )}

        {/* Status Summary */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : isReconnecting ? (
              <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm text-gray-600">
              {isConnected 
                ? `Real-time updates active with ${connectedUsers} users online`
                : isReconnecting 
                ? `Attempting to reconnect (attempt ${reconnectAttempts})`
                : 'Real-time connection lost'
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
