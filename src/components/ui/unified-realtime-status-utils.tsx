import {
  Activity,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import type { ConnectionHealth, UnifiedRealtimeStatusProps } from './unified-realtime-status-types';

export function getRealtimeConnectionIcon({
  isConnected,
  isReconnecting,
}: Pick<UnifiedRealtimeStatusProps, 'isConnected' | 'isReconnecting'>) {
  if (isReconnecting) return <RefreshCw className="h-4 w-4 animate-spin" />;
  if (isConnected) return <Wifi className="h-4 w-4" />;
  return <WifiOff className="h-4 w-4" />;
}

export function getRealtimeConnectionColor({
  isConnected,
  isReconnecting,
}: Pick<UnifiedRealtimeStatusProps, 'isConnected' | 'isReconnecting'>) {
  if (isReconnecting) return 'text-yellow-600';
  if (isConnected) return 'text-green-600';
  return 'text-red-600';
}

export function getRealtimeConnectionLabel({
  isConnected,
  isReconnecting,
}: Pick<UnifiedRealtimeStatusProps, 'isConnected' | 'isReconnecting'>) {
  if (isReconnecting) return 'Reconnecting';
  if (isConnected) return 'Connected';
  return 'Disconnected';
}

export function getRealtimeHealthIcon(connectionHealth: ConnectionHealth) {
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
}

export function getRealtimeHealthColor(connectionHealth: ConnectionHealth) {
  switch (connectionHealth) {
    case 'excellent':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'good':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'poor':
    case 'disconnected':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getRealtimeErrorRateColor(errorRate: number) {
  if (errorRate === 0) return 'text-green-600';
  if (errorRate < 0.05) return 'text-yellow-600';
  return 'text-red-600';
}

export function formatRealtimeLastUpdate(date: Date | null) {
  if (!date) return 'Never';
  const diff = new Date().getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function getRealtimeSummaryIcon({
  isConnected,
  isReconnecting,
}: Pick<UnifiedRealtimeStatusProps, 'isConnected' | 'isReconnecting'>) {
  if (isConnected) return <CheckCircle className="h-4 w-4 text-green-600" />;
  if (isReconnecting) return <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />;
  return <AlertCircle className="h-4 w-4 text-red-600" />;
}

export function getRealtimeSummaryText({
  connectedUsers,
  isConnected,
  isReconnecting,
  reconnectAttempts,
}: Pick<UnifiedRealtimeStatusProps, 'connectedUsers' | 'isConnected' | 'isReconnecting' | 'reconnectAttempts'>) {
  if (isConnected) {
    return `Updates active with ${connectedUsers} users online`;
  }

  if (isReconnecting) {
    return `Attempting to reconnect (attempt ${reconnectAttempts})`;
  }

  return 'Real-time connection lost';
}
