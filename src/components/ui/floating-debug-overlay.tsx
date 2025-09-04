"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Move, Activity, Database, HardDrive, Cpu, MemoryStick, Wifi, WifiOff, RefreshCw, Minimize2, Maximize2, Pin, PinOff, Copy, Check, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SystemMetrics {
  connections: {
    total: number;
    active: number;
    idle: number;
    waiting: number;
    usagePercent: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
  };
  cpu: {
    load: number;
    cores: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  sse: {
    status: 'connected' | 'disconnected';
    lastUpdate: string;
    eventCount: number;
  };
  system: {
    platform: string;
    uptime: number;
    nodeVersion: string;
  };
  containers?: {
    total: number;
    running: number;
    containers: Array<{
      name: string;
      status: string;
      ports: string;
    }>;
  } | {
    error: string;
  };
}

interface FloatingDebugOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

export function FloatingDebugOverlay({ isVisible, onClose }: FloatingDebugOverlayProps) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDetailedContainers, setShowDetailedContainers] = useState(false);
  const [detailedContainerMetrics, setDetailedContainerMetrics] = useState<any>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Fetch detailed container metrics
  const fetchDetailedContainerMetrics = async () => {
    try {
      const res = await fetch('/api/system/container-metrics');
      const data = await res.json();
      setDetailedContainerMetrics(data);
    } catch (error) {
      console.error('Failed to fetch detailed container metrics:', error);
    }
  };

  // Fetch system metrics
  const fetchMetrics = async () => {
    if (!isVisible) return;
    
    setIsLoading(true);
    try {
      // Fetch comprehensive system metrics
      const metricsRes = await fetch('/api/system/metrics');
      const metricsData = await metricsRes.json();
      
      // Fetch SSE status
      const sseRes = await fetch('/api/sse/status');
      let sseData: { status: 'connected' | 'disconnected'; lastUpdate: string; eventCount: number } = { status: 'disconnected', lastUpdate: 'Never', eventCount: 0 };
      try {
        const sseResponse = await sseRes.json();
        sseData = {
          status: sseResponse.status === 'connected' ? 'connected' : 'disconnected',
          lastUpdate: sseResponse.lastUpdate || 'Never',
          eventCount: sseResponse.eventCount || 0
        };
      } catch {
        // SSE endpoint might not exist yet
      }

      const newMetrics: SystemMetrics = {
        connections: {
          total: metricsData.database?.connections?.total || 0,
          active: metricsData.database?.connections?.active || 0,
          idle: metricsData.database?.connections?.idle || 0,
          waiting: metricsData.database?.connections?.waiting || 0,
          usagePercent: metricsData.database?.connections?.usagePercent || 0
        },
        memory: {
          used: Math.round(metricsData.memory?.heap?.used / 1024 / 1024) || 0, // Convert to MB
          total: Math.round(metricsData.memory?.heap?.total / 1024 / 1024) || 0, // Convert to MB
          percentage: metricsData.memory?.percentage || 0,
          heapUsed: Math.round(metricsData.memory?.heap?.used / 1024 / 1024) || 0,
          heapTotal: Math.round(metricsData.memory?.heap?.total / 1024 / 1024) || 0
        },
        cpu: {
          load: metricsData.cpu?.loadAverage?.[0] || 0,
          cores: metricsData.cpu?.cores || 0
        },
        disk: {
          used: Math.round(metricsData.disk?.used / 1024 / 1024 / 1024) || 0, // Convert to GB
          total: Math.round(metricsData.disk?.total / 1024 / 1024 / 1024) || 0, // Convert to GB
          percentage: metricsData.disk?.percentage || 0
        },
        sse: sseData,
        system: {
          platform: metricsData.system?.platform || 'Unknown',
          uptime: metricsData.system?.uptime || 0,
          nodeVersion: metricsData.system?.nodeVersion || 'Unknown'
        },
        containers: metricsData.containers
      };

      setMetrics(newMetrics);
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh metrics every 5 seconds
  useEffect(() => {
    if (!isVisible) return;
    
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // 30 seconds to reduce events
    
    return () => clearInterval(interval);
  }, [isVisible]);

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow dragging from anywhere on the header, not just the drag icon
    const target = e.target as HTMLElement;
    const isHeaderElement = target.closest('[data-draggable="true"]');
    
    if (isHeaderElement) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
    }
  };

  // Handle drag
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && dragStartRef.current) {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      
      // Ensure the overlay stays within viewport bounds
      const maxX = window.innerWidth - 320; // 320px is the overlay width
      const maxY = window.innerHeight - 400; // 400px is approximate overlay height
      
      const boundedX = Math.min(Math.max(20, newX), maxX);
      const boundedY = Math.min(Math.max(20, newY), maxY);
      
      setPosition({
        x: boundedX,
        y: boundedY
      });
    }
  };

  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Add/remove global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Add keyboard shortcut (Ctrl+Shift+D) to toggle debug overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        // This will be handled by the parent component
        // We'll emit a custom event that the Header can listen to
        window.dispatchEvent(new CustomEvent('toggleDebugOverlay'));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Ensure overlay stays within viewport bounds
  useEffect(() => {
    const handleResize = () => {
      const maxX = window.innerWidth - 320; // 320px is the overlay width
      const maxY = window.innerHeight - 400; // 400px is approximate overlay height
      
      setPosition(prev => ({
        x: Math.min(Math.max(20, prev.x), maxX),
        y: Math.min(Math.max(20, prev.y), maxY)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Copy metrics to clipboard
  const copyMetrics = async () => {
    if (!metrics) return;
    
    try {
      const metricsText = `System Debug Metrics - ${new Date().toLocaleString()}
Database Connections: ${metrics.connections.total} total, ${metrics.connections.active} active, ${metrics.connections.idle} idle (${metrics.connections.usagePercent}%)
Memory: ${metrics.memory.used}MB / ${metrics.memory.total}MB (${metrics.memory.percentage}%)
CPU: ${metrics.cpu.load.toFixed(2)} load on ${metrics.cpu.cores} cores
Disk: ${metrics.disk.used}GB / ${metrics.disk.total}GB (${metrics.disk.percentage}%)
SSE: ${metrics.sse.status}, ${metrics.sse.eventCount} events
Platform: ${metrics.system.platform}, Uptime: ${Math.round(metrics.system.uptime / 3600)}h, Node: ${metrics.system.nodeVersion}`;
      
      await navigator.clipboard.writeText(metricsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy metrics:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed select-none animate-in fade-in-0 slide-in-from-top-2 duration-300 ${isPinned ? 'z-[9999]' : 'z-50'}`}
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      <Card className={`w-80 bg-background/95 backdrop-blur-sm border transition-all duration-300 ${
        isPinned 
          ? 'border-blue-500/50 shadow-2xl shadow-blue-500/20' 
          : 'border-border/50 shadow-2xl hover:shadow-3xl'
      }`}>
        <CardHeader className={`pb-2 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} hover:bg-accent/5 hover:shadow-sm transition-all duration-200`} data-draggable="true">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2" title="Press Ctrl+Shift+D to toggle">
              <Activity className="h-4 w-4 text-blue-500" />
              System Debug
              <span className="text-xs text-muted-foreground ml-1">(drag to move)</span>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-accent/20"
                onClick={fetchMetrics}
                disabled={isLoading}
                title="Refresh metrics"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-accent/20"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? (
                  <Maximize2 className="h-3 w-3" />
                ) : (
                  <Minimize2 className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 hover:bg-accent/20 ${isPinned ? 'text-blue-500' : ''}`}
                onClick={() => setIsPinned(!isPinned)}
                title={isPinned ? "Unpin" : "Pin to top"}
              >
                {isPinned ? (
                  <PinOff className="h-3 w-3" />
                ) : (
                  <Pin className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 hover:bg-accent/20 ${copied ? 'text-green-500' : ''}`}
                onClick={copyMetrics}
                disabled={!metrics}
                title="Copy metrics to clipboard"
              >
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              <div
                ref={dragRef}
                className="p-1 cursor-grab hover:bg-accent/20 rounded transition-colors hover:scale-110 transition-transform"
                onMouseDown={handleMouseDown}
                title="Drag to move (or drag anywhere on the header)"
              >
                <Move className="h-3 w-3 text-muted-foreground" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                onClick={onClose}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-3">
          {!isMinimized && (
            <>
              {/* Timestamp */}
              {metrics && (
                <div className="text-xs text-muted-foreground text-center pb-2 border-b border-border/20">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              )}
              
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : metrics ? (
                <>
                  {/* Database Connections */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Database className="h-3 w-3" />
                        Connections
                      </span>
                      <Badge 
                        variant={metrics.connections.usagePercent > 80 ? 'destructive' : 
                               metrics.connections.usagePercent > 60 ? 'secondary' : 'default'}
                        className="text-xs"
                      >
                        {metrics.connections.usagePercent}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-1 rounded bg-blue-50 dark:bg-blue-950/20">
                        <div className="font-semibold text-blue-700 dark:text-blue-300">{metrics.connections.total}</div>
                        <div className="text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center p-1 rounded bg-green-50 dark:bg-green-950/20">
                        <div className="font-semibold text-green-700 dark:text-green-300">{metrics.connections.active}</div>
                        <div className="text-muted-foreground">Active</div>
                      </div>
                      <div className="text-center p-1 rounded bg-yellow-50 dark:bg-yellow-950/20">
                        <div className="font-semibold text-yellow-700 dark:text-yellow-300">{metrics.connections.idle}</div>
                        <div className="text-muted-foreground">Idle</div>
                      </div>
                    </div>
                  </div>

                  {/* Memory Usage */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MemoryStick className="h-3 w-3" />
                        Memory
                      </span>
                      <Badge 
                        variant={metrics.memory.percentage > 80 ? 'destructive' : 
                               metrics.memory.percentage > 60 ? 'secondary' : 'default'}
                        className="text-xs"
                      >
                        {metrics.memory.percentage}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-center p-1 rounded bg-orange-50 dark:bg-orange-950/20">
                        <div className="font-semibold text-orange-700 dark:text-orange-300">{metrics.memory.used}MB</div>
                        <div className="text-muted-foreground">Used</div>
                      </div>
                      <div className="text-center p-1 rounded bg-blue-50 dark:bg-blue-950/20">
                        <div className="font-semibold text-blue-700 dark:text-blue-300">{metrics.memory.total}MB</div>
                        <div className="text-muted-foreground">Total</div>
                      </div>
                    </div>
                  </div>

                  {/* CPU Usage */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Cpu className="h-3 w-3" />
                        CPU Load
                      </span>
                      <Badge 
                        variant={metrics.cpu.load > 2 ? 'destructive' : 
                               metrics.cpu.load > 1 ? 'secondary' : 'default'}
                        className="text-xs"
                      >
                        {metrics.cpu.load.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="text-xs text-center text-muted-foreground">
                      {metrics.cpu.cores} cores
                    </div>
                  </div>

                  {/* SSE Status */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        {metrics.sse.status === 'connected' ? 
                          <Wifi className="h-3 w-3 text-green-500" /> : 
                          <WifiOff className="h-3 w-3 text-red-500" />
                        }
                        SSE Status
                      </span>
                      <Badge 
                        variant={metrics.sse.status === 'connected' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {metrics.sse.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-center p-1 rounded bg-purple-50 dark:bg-purple-950/20">
                        <div className="font-semibold text-purple-700 dark:text-purple-300">{metrics.sse.eventCount}</div>
                        <div className="text-muted-foreground">Events</div>
                      </div>
                      <div className="text-center p-1 rounded bg-gray-50 dark:bg-gray-950/20">
                        <div className="font-semibold text-gray-700 dark:text-gray-300">{metrics.sse.lastUpdate}</div>
                        <div className="text-muted-foreground">Last Update</div>
                      </div>
                    </div>
                  </div>

                  {/* Disk Usage */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <HardDrive className="h-3 w-3" />
                        Disk
                      </span>
                      <Badge 
                        variant={metrics.disk.percentage > 80 ? 'destructive' : 
                               metrics.disk.percentage > 60 ? 'secondary' : 'default'}
                        className="text-xs"
                      >
                        {metrics.disk.percentage}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-center p-1 rounded bg-red-50 dark:bg-red-950/20">
                        <div className="font-semibold text-red-700 dark:text-red-300">{metrics.disk.used}GB</div>
                        <div className="text-muted-foreground">Used</div>
                      </div>
                      <div className="text-center p-1 rounded bg-blue-50 dark:bg-blue-950/20">
                        <div className="font-semibold text-blue-700 dark:text-blue-300">{metrics.disk.total}GB</div>
                        <div className="text-muted-foreground">Total</div>
                      </div>
                    </div>
                  </div>

                  {/* System Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Activity className="h-3 w-3" />
                        System
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Platform:</span>
                        <span className="font-mono">{metrics.system.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Uptime:</span>
                        <span className="font-mono">{Math.round(metrics.system.uptime / 3600)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Node:</span>
                        <span className="font-mono">{metrics.system.nodeVersion}</span>
                      </div>
                    </div>
                  </div>

                  {/* Container Info */}
                  {metrics.containers && !('error' in metrics.containers) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Box className="h-3 w-3" />
                          Containers
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={metrics.containers.running > 0 ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {metrics.containers.running}/{metrics.containers.total}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-xs hover:bg-accent/20"
                            onClick={() => {
                              setShowDetailedContainers(!showDetailedContainers);
                              if (!showDetailedContainers && !detailedContainerMetrics) {
                                fetchDetailedContainerMetrics();
                              }
                            }}
                            title="Toggle detailed view"
                          >
                            {showDetailedContainers ? '−' : '+'}
                          </Button>
                        </div>
                      </div>
                                              {metrics.containers.containers.length > 0 && (
                          <div className="space-y-1 text-xs max-h-20 overflow-y-auto">
                            {metrics.containers.containers.map((container, index) => (
                              <div key={index} className="flex justify-between items-center p-1 rounded bg-gray-50 dark:bg-gray-950/20">
                                <span className="font-medium truncate max-w-24" title={container.name}>
                                  {container.name}
                                </span>
                                <Badge 
                                  variant={container.status.includes('Up') ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {container.status.split(' ')[0]}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Detailed Container Metrics */}
                        {showDetailedContainers && detailedContainerMetrics && (
                          <div className="space-y-2 pt-2 border-t border-border/20">
                            <div className="text-xs font-medium text-muted-foreground">Detailed Metrics</div>
                            {detailedContainerMetrics.containers?.map((container: any, index: number) => (
                              <div key={index} className="space-y-1 p-2 rounded bg-blue-50 dark:bg-blue-950/20 text-xs">
                                <div className="font-medium text-blue-700 dark:text-blue-300">{container.name}</div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-muted-foreground">Status:</span>
                                    <Badge 
                                      variant={container.status === 'running' ? 'default' : 'secondary'}
                                      className="ml-1 text-xs"
                                    >
                                      {container.status}
                                    </Badge>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Image:</span>
                                    <span className="ml-1 font-mono text-xs truncate max-w-20" title={container.image}>
                                      {container.image}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">CPU:</span>
                                    <span className="ml-1 font-mono">{container.cpu?.usage || '0%'}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Memory:</span>
                                    <span className="ml-1 font-mono">{container.memory?.usage || '0B'}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Network:</span>
                                    <span className="ml-1 font-mono text-xs">
                                      ↓{container.network?.rx || '0B'} ↑{container.network?.tx || '0B'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Processes:</span>
                                    <span className="ml-1 font-mono">{container.processes || 0}</span>
                                  </div>
                                </div>
                                {container.ports && container.ports !== 'No ports' && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Ports:</span>
                                    <span className="ml-1 font-mono">{container.ports}</span>
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* Docker System Info */}
                            {detailedContainerMetrics.dockerInfo && !detailedContainerMetrics.dockerInfo.error && (
                              <div className="space-y-1 p-2 rounded bg-green-50 dark:bg-green-950/20 text-xs">
                                <div className="font-medium text-green-700 dark:text-green-300">Docker System</div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-muted-foreground">Version:</span>
                                    <span className="ml-1 font-mono">{detailedContainerMetrics.dockerInfo.version}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Containers:</span>
                                    <span className="ml-1 font-mono">{detailedContainerMetrics.dockerInfo.containers}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Images:</span>
                                    <span className="ml-1 font-mono">{detailedContainerMetrics.dockerInfo.images}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Total Memory:</span>
                                    <span className="ml-1 font-mono">{detailedContainerMetrics.dockerInfo.system?.totalMemory || 'Unknown'}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Failed to load metrics
                </div>
              )}
            </>
          )}
          
          {/* Minimized view - show key metrics only */}
          {isMinimized && metrics && (
            <div className="py-2 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-1 rounded bg-blue-50 dark:bg-blue-950/20">
                  <div className="font-semibold text-blue-700 dark:text-blue-300">{metrics.connections.usagePercent}%</div>
                  <div className="text-muted-foreground">DB</div>
                </div>
                <div className="text-center p-1 rounded bg-orange-50 dark:bg-orange-950/20">
                  <div className="font-semibold text-orange-700 dark:text-orange-300">{metrics.memory.percentage}%</div>
                  <div className="text-muted-foreground">RAM</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-1 rounded bg-green-50 dark:bg-green-950/20">
                  <div className="font-semibold text-green-700 dark:text-green-300">{metrics.cpu.load.toFixed(1)}</div>
                  <div className="text-muted-foreground">CPU</div>
                </div>
                <div className="text-center p-1 rounded bg-red-50 dark:bg-red-950/20">
                  <div className="font-semibold text-red-700 dark:text-red-300">{metrics.disk.percentage}%</div>
                  <div className="text-muted-foreground">Disk</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
