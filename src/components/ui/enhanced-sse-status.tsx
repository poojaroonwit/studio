'use client';

import React from 'react';
import { useEnhancedSSE } from '@/hooks/use-enhanced-sse';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Power,
  PowerOff
} from 'lucide-react';

export function EnhancedSSEStatus() {
  const {
    isConnected,
    isFullyConnected,
    hasFailures,
    isConnecting,
    connectionStatus,
    totalEndpoints,
    connectedEndpoints,
    failedEndpoints,
    disabledEndpoints,
    reconnect,
    reconnectEndpoint,
    toggleEndpoint,
    getEndpointDetails
  } = useEnhancedSSE();

  const getStatusIcon = (endpoint: any) => {
    if (endpoint.isConnected) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (endpoint.lastError) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else if (!endpoint.enabled) {
      return <PowerOff className="h-4 w-4 text-gray-400" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (endpoint: any) => {
    if (endpoint.isConnected) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (endpoint.lastError) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else if (!endpoint.enabled) {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    } else {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusText = (endpoint: any) => {
    if (endpoint.isConnected) {
      return 'Connected';
    } else if (endpoint.lastError) {
      return 'Failed';
    } else if (!endpoint.enabled) {
      return 'Disabled';
    } else {
      return 'Disconnected';
    }
  };

  const formatError = (error: string) => {
    if (error.length > 50) {
      return error.substring(0, 50) + '...';
    }
    return error;
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              Enhanced SSE Status
            </CardTitle>
            <CardDescription>
              Real-time connection status for all SSE endpoints
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={isFullyConnected ? "default" : hasFailures ? "destructive" : "secondary"}
              className="text-xs"
            >
              {connectedEndpoints}/{totalEndpoints} Connected
            </Badge>
            <Button
              size="sm"
              onClick={reconnect}
              disabled={isConnecting}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isConnecting ? 'animate-spin' : ''}`} />
              {isConnecting ? 'Connecting...' : 'Reconnect All'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{totalEndpoints}</div>
            <div className="text-sm text-blue-600">Total Endpoints</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{connectedEndpoints}</div>
            <div className="text-sm text-green-600">Connected</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{failedEndpoints}</div>
            <div className="text-sm text-red-600">Failed</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{disabledEndpoints}</div>
            <div className="text-sm text-gray-600">Disabled</div>
          </div>
        </div>

        {/* Endpoint Details */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Endpoint Details</h3>
          {connectionStatus.endpoints.map((endpoint) => {
            const details = getEndpointDetails(endpoint.id);
            return (
              <div
                key={endpoint.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(endpoint)}
                    <div>
                      <h4 className="font-medium">{endpoint.name}</h4>
                      <p className="text-sm text-gray-600">{endpoint.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(endpoint)}>
                      {getStatusText(endpoint)}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleEndpoint(endpoint.id, !endpoint.enabled)}
                        className="h-8 px-2"
                      >
                        {endpoint.enabled ? (
                          <PowerOff className="h-3 w-3" />
                        ) : (
                          <Power className="h-3 w-3" />
                        )}
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
                </div>

                {/* Endpoint Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Priority:</span>
                    <span className="ml-2 font-medium">{endpoint.priority}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Attempts:</span>
                    <span className="ml-2 font-medium">{endpoint.connectionAttempts}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Retries:</span>
                    <span className="ml-2 font-medium">{endpoint.retryCount}/{endpoint.maxRetries}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 font-medium">
                      {endpoint.isConnected ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Error Details */}
                {endpoint.lastError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Last Error:</span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                      {formatError(endpoint.lastError)}
                    </p>
                    {endpoint.lastErrorTime && (
                      <p className="text-xs text-red-600 mt-1">
                        {new Date(endpoint.lastErrorTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Connection Info */}
                {endpoint.isConnected && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Connection Active</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Connected since {new Date().toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Connection Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            {isConnecting ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Establishing connections...
              </span>
            ) : (
              <span>
                Last updated: {new Date().toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                connectionStatus.endpoints.forEach(endpoint => {
                  if (!endpoint.enabled) {
                    toggleEndpoint(endpoint.id, true);
                  }
                });
              }}
            >
              Enable All
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                connectionStatus.endpoints.forEach(endpoint => {
                  if (endpoint.enabled) {
                    toggleEndpoint(endpoint.id, false);
                  }
                });
              }}
            >
              Disable All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
