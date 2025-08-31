"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useDynamicPerformance, usePerformanceStatus, usePerformanceRecommendations } from '@/hooks/use-dynamic-performance';
import { Activity, Cpu, Memory, Wifi, Battery, Smartphone, Tablet, Monitor } from 'lucide-react';

interface PerformanceMonitorProps {
  showDetails?: boolean;
  className?: string;
}

export function PerformanceMonitor({ showDetails = false, className = '' }: PerformanceMonitorProps) {
  const { settings, metrics, isOptimizing } = useDynamicPerformance();
  const { status, statusColor, isOptimizing: statusOptimizing } = usePerformanceStatus();
  const recommendations = usePerformanceRecommendations();

  if (!settings || !metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Performance Monitor
          </CardTitle>
          <CardDescription>Loading performance data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'critical':
        return <Activity className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <Activity className="h-4 w-4 text-yellow-500" />;
      case 'slow':
        return <Activity className="h-4 w-4 text-orange-500" />;
      case 'optimizing':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'optimal':
        return <Activity className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getDeviceIcon = () => {
    switch (metrics.deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getNetworkIcon = () => {
    switch (metrics.networkSpeed) {
      case 'slow':
        return <Wifi className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Wifi className="h-4 w-4 text-yellow-500" />;
      case 'fast':
        return <Wifi className="h-4 w-4 text-green-500" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Performance Monitor
          {(isOptimizing || statusOptimizing) && (
            <Badge variant="secondary" className="ml-auto">
              Optimizing
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          System performance status: <Badge variant="outline" className={`text-${statusColor}-600`}>{status}</Badge>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* System Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Cpu className="h-3 w-3" />
              CPU Usage
            </div>
            <Progress value={metrics.cpuUsage} className="h-2" />
            <div className="text-xs text-muted-foreground">{metrics.cpuUsage}%</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Memory className="h-3 w-3" />
              Memory Usage
            </div>
            <Progress value={metrics.memoryUsage} className="h-2" />
            <div className="text-xs text-muted-foreground">{metrics.memoryUsage}% ({metrics.availableMemory}MB available)</div>
          </div>
        </div>

        {/* Device & Network Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            {getDeviceIcon()}
            <span className="capitalize">{metrics.deviceType}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {getNetworkIcon()}
            <span className="capitalize">{metrics.networkSpeed} network</span>
          </div>
          
          {metrics.batteryLevel !== undefined && (
            <div className="flex items-center gap-2">
              <Battery className="h-3 w-3" />
              <span>{metrics.batteryLevel}% battery</span>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Recommendations:</div>
            <ul className="text-xs space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index} className="text-muted-foreground">• {rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Detailed Settings (if showDetails is true) */}
        {showDetails && (
          <div className="space-y-3 pt-4 border-t">
            <div className="text-sm font-medium">Current Settings:</div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-medium">Upload Queue:</div>
                <div className="text-muted-foreground">{settings.uploadQueueInterval}ms interval</div>
                <div className="text-muted-foreground">Batch size: {settings.batchSize}</div>
              </div>
              
              <div>
                <div className="font-medium">Session Validation:</div>
                <div className="text-muted-foreground">{Math.round(settings.sessionValidationInterval / 1000 / 60)}min interval</div>
              </div>
              
              <div>
                <div className="font-medium">UI Responsiveness:</div>
                <div className="text-muted-foreground">{settings.animationFrameRate}fps</div>
                <div className="text-muted-foreground">{settings.debounceDelay}ms debounce</div>
              </div>
              
              <div>
                <div className="font-medium">Monitoring:</div>
                <div className="text-muted-foreground">{settings.infiniteLoopMaxRuns} max runs</div>
                <div className="text-muted-foreground">{settings.renderMonitorThreshold} render threshold</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PerformanceMonitor;
