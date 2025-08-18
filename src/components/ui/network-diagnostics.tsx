// src/components/ui/network-diagnostics.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, Clock, RefreshCw, X } from 'lucide-react';
import { checkNetworkHealth, checkApiHealth, NetworkHealthResult, ApiHealthResult } from '@/lib/networkUtils';

interface NetworkDiagnosticsProps {
  className?: string;
  onClose?: () => void;
}

export function NetworkDiagnostics({ className, onClose }: NetworkDiagnosticsProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    network: NetworkHealthResult | null;
    api: ApiHealthResult | null;
  }>({ network: null, api: null });

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults({ network: null, api: null });

    try {
      // Check basic network connectivity
      const networkResult = await checkNetworkHealth('/api/health', 5000);
      
      // Check API endpoints
      const apiEndpoints = [
        '/api/health',
        '/api/candidates',
        '/api/positions',
        '/api/stages'
      ];
      const apiResult = await checkApiHealth(apiEndpoints);

      setResults({ network: networkResult, api: apiResult });
    } catch (error) {
      console.error('Diagnostics failed:', error);
      setResults({
        network: {
          isHealthy: false,
          latency: 0,
          error: 'Diagnostics failed to run',
        },
        api: {
          isHealthy: false,
          endpoints: {},
        },
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (isHealthy: boolean) => {
    if (isHealthy) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  const getStatusBadge = (isHealthy: boolean) => {
    return (
      <Badge variant={isHealthy ? 'default' : 'destructive'}>
        {isHealthy ? 'Healthy' : 'Unhealthy'}
      </Badge>
    );
  };

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Check your network connectivity and API endpoints
        </p>
        <Button
          onClick={runDiagnostics}
          disabled={isRunning}
          size="sm"
          variant="outline"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Diagnostics
            </>
          )}
        </Button>
      </div>

      {results.network && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(results.network.isHealthy)}
              <span className="font-medium">Network Connectivity</span>
            </div>
            {getStatusBadge(results.network.isHealthy)}
          </div>
          
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Latency:</span>
              <span className="font-mono">{results.network.latency}ms</span>
            </div>
            {results.network.error && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{results.network.error}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )}

      {results.api && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(results.api.isHealthy)}
              <span className="font-medium">API Endpoints</span>
            </div>
            {getStatusBadge(results.api.isHealthy)}
          </div>
          
          <div className="space-y-2">
            {Object.entries(results.api.endpoints).map(([endpoint, status]) => (
              <div key={endpoint} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs">{endpoint}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs">{status.responseTime}ms</span>
                  <Badge variant={status.status === 'healthy' ? 'secondary' : 'destructive'} className="text-xs">
                    {status.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.network && !results.network.isHealthy && (
        <Alert>
          <WifiOff className="w-4 h-4" />
          <AlertDescription>
            Network connectivity issues detected. This may be causing the "Failed to update candidate status" error. 
            Try refreshing the page or checking your internet connection.
          </AlertDescription>
        </Alert>
      )}

      {results.api && !results.api.isHealthy && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Some API endpoints are not responding correctly. This may indicate server issues. 
            Please try again later or contact support if the problem persists.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  // If onClose is provided, render as modal
  if (onClose) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Network Diagnostics
            </DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise render as card
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="w-5 h-5" />
          Network Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
