'use client';

import React from 'react';
import { useEnhancedSSE } from '@/hooks/use-enhanced-sse';
import { EnhancedSSEStatus } from '@/components/ui/enhanced-sse-status';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Settings,
  Bug
} from 'lucide-react';

export function EnhancedSSEExample() {
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
    getEndpointDetails,
    error
  } = useEnhancedSSE();

  const handleToggleEndpoint = (endpointId: string) => {
    const endpoint = getEndpointDetails(endpointId);
    if (endpoint) {
      toggleEndpoint(endpointId, !endpoint.enabled);
    }
  };

  const handleReconnectEndpoint = (endpointId: string) => {
    reconnectEndpoint(endpointId);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Enhanced SSE Example
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          This example demonstrates the enhanced SSE system that loads endpoints one by one, 
          handles errors gracefully, and prevents application freezing.
        </p>
      </div>

      {/* Connection Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-6 w-6 text-green-500" />
            ) : (
              <WifiOff className="h-6 w-6 text-red-500" />
            )}
            Connection Overview
          </CardTitle>
          <CardDescription>
            Real-time status of all SSE endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Card className="group relative overflow-hidden border-2 border-blue-200 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="relative p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalEndpoints}</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Total Endpoints</div>
              </CardContent>
            </Card>
            <Card className="group relative overflow-hidden border-2 border-green-200 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="relative p-4 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{connectedEndpoints}</div>
                <div className="text-sm text-green-600 dark:text-green-400">Connected</div>
              </CardContent>
            </Card>
            <Card className="group relative overflow-hidden border-2 border-red-200 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="relative p-4 text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{failedEndpoints}</div>
                <div className="text-sm text-red-600 dark:text-red-400">Failed</div>
              </CardContent>
            </Card>
            <Card className="group relative overflow-hidden border-2 border-gray-200 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/50 dark:to-gray-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="relative p-4 text-center">
                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{disabledEndpoints}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Disabled</div>
              </CardContent>
            </Card>
          </div>

          {/* Overall Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isFullyConnected ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  All endpoints connected
                </Badge>
              ) : hasFailures ? (
                <Badge variant="destructive">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Some endpoints failed
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Connecting...
                </Badge>
              )}
            </div>
            
            <Button
              onClick={reconnect}
              disabled={isConnecting}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isConnecting ? 'animate-spin' : ''}`} />
              {isConnecting ? 'Connecting...' : 'Reconnect All'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Connection Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
            <div className="mt-3">
              <Button
                onClick={reconnect}
                disabled={isConnecting}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isConnecting ? 'animate-spin' : ''}`} />
                Retry Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Endpoint Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Endpoint Controls
          </CardTitle>
          <CardDescription>
            Manage individual SSE endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {connectionStatus.endpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {endpoint.isConnected ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : endpoint.lastError ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : (
                    <RefreshCw className="h-5 w-5 text-yellow-500" />
                  )}
                  
                  <div>
                    <h4 className="font-medium">{endpoint.name}</h4>
                    <p className="text-sm text-gray-600">{endpoint.url}</p>
                    {endpoint.lastError && (
                      <p className="text-xs text-red-600 mt-1">
                        Error: {endpoint.lastError.substring(0, 50)}...
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge 
                    variant={endpoint.isConnected ? "default" : endpoint.lastError ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {endpoint.isConnected ? 'Connected' : endpoint.lastError ? 'Failed' : 'Disconnected'}
                  </Badge>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleEndpoint(endpoint.id)}
                    className="h-8 px-2"
                  >
                    {endpoint.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  
                  {endpoint.enabled && !endpoint.isConnected && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReconnectEndpoint(endpoint.id)}
                      className="h-8 px-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Debug Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Debug Information
          </CardTitle>
          <CardDescription>
            Technical details for debugging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Connection State:</span>
                <span className="ml-2 text-gray-600">
                  {isConnecting ? 'Connecting' : isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div>
                <span className="font-medium">Full Connection:</span>
                <span className="ml-2 text-gray-600">
                  {isFullyConnected ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="font-medium">Has Failures:</span>
                <span className="ml-2 text-gray-600">
                  {hasFailures ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="font-medium">Total Endpoints:</span>
                <span className="ml-2 text-gray-600">{totalEndpoints}</span>
              </div>
            </div>
            
            <div className="pt-3 border-t">
              <p className="text-gray-600">
                <strong>Note:</strong> Check the browser console for detailed connection logs. 
                Look for messages starting with <code>[Enhanced SSE Manager]</code> and <code>[SSE Debug]</code>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced SSE Status Component */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Status Component</CardTitle>
          <CardDescription>
            The full enhanced SSE status component with all features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnhancedSSEStatus />
        </CardContent>
      </Card>
    </div>
  );
}
