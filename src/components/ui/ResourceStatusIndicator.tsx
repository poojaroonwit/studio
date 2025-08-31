"use client";

import React from 'react';
import { useDynamicConfig } from '@/hooks/use-dynamic-config';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Zap
} from 'lucide-react';

interface ResourceStatusIndicatorProps {
  showDetails?: boolean;
  showRecommendations?: boolean;
  className?: string;
}

export function ResourceStatusIndicator({ 
  showDetails = false, 
  showRecommendations = true,
  className = "" 
}: ResourceStatusIndicatorProps) {
  const { 
    pressure, 
    healthScore, 
    getConfigFor, 
    getRecommendations, 
    isHealthy, 
    isUnderPressure 
  } = useDynamicConfig();

  const uiConfig = getConfigFor('ui');
  const processingConfig = getConfigFor('processing');
  const recommendations = getRecommendations();

  const getPressureColor = (pressure: string) => {
    switch (pressure) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPressureIcon = (pressure: string) => {
    switch (pressure) {
      case 'low': return <CheckCircle className="h-4 w-4" />;
      case 'medium': return <Activity className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5" />
            System Resource Status
          </CardTitle>
          <CardDescription>
            Dynamic configuration based on available system resources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Health Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">System Health</span>
              <span className={`text-sm font-bold ${getHealthColor(healthScore)}`}>
                {healthScore.toFixed(0)}%
              </span>
            </div>
            <Progress value={healthScore} className="h-2" />
          </div>

          {/* Pressure Level */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Resource Pressure</span>
            <Badge 
              variant="outline" 
              className={`flex items-center gap-1 ${getPressureColor(pressure)} text-white`}
            >
              {getPressureIcon(pressure)}
              {pressure.toUpperCase()}
            </Badge>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            {isHealthy ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            )}
            <span className="text-sm">
              {isHealthy ? 'System performing well' : 'System under pressure'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Configuration */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Processing Configuration */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Processing Settings
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Interval: {processingConfig.interval}ms</div>
                <div>Batch Size: {processingConfig.batchSize}</div>
                <div>Max Concurrent: {processingConfig.maxConcurrent}</div>
                <div>Timeout: {processingConfig.timeout}ms</div>
              </div>
            </div>

            {/* UI Configuration */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                UI Settings
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Debounce: {uiConfig.debounceDelay}ms</div>
                <div>Update Interval: {uiConfig.updateInterval}ms</div>
                <div>Max Renders: {uiConfig.maxRenders}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <Alert className={isUnderPressure ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <div className="font-medium">Performance Recommendations:</div>
            <ul className="text-sm space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Performance Tips */}
      <Card className="bg-gray-50">
        <CardContent className="pt-4">
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>Configuration updates automatically every 30 seconds</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-3 w-3" />
              <span>Database connections and CPU usage are monitored</span>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="h-3 w-3" />
              <span>Memory usage and system load are tracked</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
