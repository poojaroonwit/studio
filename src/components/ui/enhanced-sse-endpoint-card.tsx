'use client';

import type { EnhancedSSEEndpointStatus } from '@/hooks/use-enhanced-sse';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle,
  Power,
  PowerOff,
  RefreshCw,
} from 'lucide-react';
import {
  formatEnhancedSseError,
  getEnhancedSseStatusColor,
  getEnhancedSseStatusIcon,
  getEnhancedSseStatusText,
} from './enhanced-sse-status-utils';

interface EnhancedSseEndpointCardProps {
  endpoint: EnhancedSSEEndpointStatus;
  reconnectEndpoint: (endpointId: string) => void;
  toggleEndpoint: (endpointId: string, enabled: boolean) => void;
}

export function EnhancedSseEndpointCard({
  endpoint,
  reconnectEndpoint,
  toggleEndpoint,
}: EnhancedSseEndpointCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getEnhancedSseStatusIcon(endpoint)}
          <div>
            <h4 className="font-medium">{endpoint.name}</h4>
            <p className="text-sm text-gray-600">{endpoint.url}</p>
          </div>
        </div>
        <EndpointActions
          endpoint={endpoint}
          reconnectEndpoint={reconnectEndpoint}
          toggleEndpoint={toggleEndpoint}
        />
      </div>

      <EndpointStats endpoint={endpoint} />
      <EndpointError endpoint={endpoint} />
      <EndpointConnectedInfo endpoint={endpoint} />
    </div>
  );
}

function EndpointActions({
  endpoint,
  reconnectEndpoint,
  toggleEndpoint,
}: EnhancedSseEndpointCardProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge className={getEnhancedSseStatusColor(endpoint)}>
        {getEnhancedSseStatusText(endpoint)}
      </Badge>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => toggleEndpoint(endpoint.id, !endpoint.enabled)}
          className="h-8 px-2"
        >
          {endpoint.enabled ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
        </Button>
        {endpoint.enabled && !endpoint.isConnected && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => reconnectEndpoint(endpoint.id)}
            className="h-8 px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function EndpointStats({ endpoint }: { endpoint: EnhancedSSEEndpointStatus }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <div><span className="text-gray-600">Priority:</span><span className="ml-2 font-medium">{endpoint.priority}</span></div>
      <div><span className="text-gray-600">Attempts:</span><span className="ml-2 font-medium">{endpoint.connectionAttempts}</span></div>
      <div><span className="text-gray-600">Retries:</span><span className="ml-2 font-medium">{endpoint.retryCount}/{endpoint.maxRetries}</span></div>
      <div><span className="text-gray-600">Status:</span><span className="ml-2 font-medium">{endpoint.isConnected ? 'Active' : 'Inactive'}</span></div>
    </div>
  );
}

function EndpointError({ endpoint }: { endpoint: EnhancedSSEEndpointStatus }) {
  if (!endpoint.lastError) {
    return null;
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
      <div className="flex items-center gap-2 text-red-800">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium">Last Error:</span>
      </div>
      <p className="text-sm text-red-700 mt-1">
        {formatEnhancedSseError(endpoint.lastError)}
      </p>
      {endpoint.lastErrorTime && (
        <p className="text-xs text-red-600 mt-1">
          {new Date(endpoint.lastErrorTime).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function EndpointConnectedInfo({ endpoint }: { endpoint: EnhancedSSEEndpointStatus }) {
  if (!endpoint.isConnected) {
    return null;
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
      <div className="flex items-center gap-2 text-green-800">
        <CheckCircle className="h-4 w-4" />
        <span className="font-medium">Connection Active</span>
      </div>
      <p className="text-sm text-green-700 mt-1">
        Connected since {new Date().toLocaleString()}
      </p>
    </div>
  );
}
