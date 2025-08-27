"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle, XCircle, Loader2, AlertCircle, BarChart3, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUploadQueueSSE } from '@/hooks/use-upload-queue-sse';

interface QueueItem {
  id: string;
  file_name: string;
  file_size: number;
  status: string;
  upload_date: string;
  process_date?: string;
  completed_date?: string;
  error?: string;
  error_details?: string;
  webhook_payload?: any;
  position_title?: string;
  source?: string;
}

interface QueueStatus {
  total: number;
  queued: number;
  inprocess: number;
  success: number;
  error: number;
}

interface AnalyticsData {
  scatterData: Array<{
    x: string; // time
    y: number; // duration in seconds
    size: number; // file size in MB
    status: string;
    fileName: string;
  }>;
  averageTimes: Array<{
    status: string;
    averageDuration: number;
    count: number;
  }>;
  errorCounts: Array<{
    error: string;
    count: number;
  }>;
  reprocessCounts: Array<{
    source: string;
    count: number;
  }>;
  durationMetrics: {
    waitingQueue: number;
    createToComplete: number;
    processToComplete: number;
  };
}

export function UploadQueueStatistics() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    total: 0,
    queued: 0,
    inprocess: 0,
    success: 0,
    error: 0
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    scatterData: [],
    averageTimes: [],
    errorCounts: [],
    reprocessCounts: [],
    durationMetrics: {
      waitingQueue: 0,
      createToComplete: 0,
      processToComplete: 0
    }
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Use shared SSE connection
  const { isConnected: isRealtimeActive, lastMessage } = useUploadQueueSSE();

  const fetchQueueData = async () => {
    setLoading(true);
    try {
      // Fetch all queue items for analytics (no pagination for stats)
      const response = await fetch('/api/upload-queue?limit=1000&offset=0');
      if (!response.ok) {
        const text = await response.text();
        setErrorMessage(response.status === 401 ? 'Unauthorized. Please sign in to view the upload queue.' : (text || 'Failed to load upload queue.'));
        return;
      }

      const data = await response.json();
      setErrorMessage(null);
      const items = Array.isArray(data.data) ? data.data : [];
      setQueueItems(items);
      
      setQueueStatus({
        total: parseInt(data.summary?.total) || 0,
        queued: parseInt(data.summary?.queued) || 0,
        inprocess: parseInt(data.summary?.inprocess) || 0,
        success: parseInt(data.summary?.success) || 0,
        error: parseInt(data.summary?.error) || 0
      });

      // Process analytics data
      processAnalyticsData(items);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch queue:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (items: QueueItem[]) => {
    const scatterData: AnalyticsData['scatterData'] = [];
    const statusDurations: { [key: string]: number[] } = {};
    const errorCounts: { [key: string]: number } = {};
    const reprocessCounts: { [key: string]: number } = {};
    let totalWaitingTime = 0;
    let totalCreateToComplete = 0;
    let totalProcessToComplete = 0;
    let completedCount = 0;

    items.forEach(item => {
      // Calculate durations
      const uploadTime = new Date(item.upload_date).getTime();
      const processTime = item.process_date ? new Date(item.process_date).getTime() : null;
      const completedTime = item.completed_date ? new Date(item.completed_date).getTime() : null;

      // Scatter plot data (only for completed jobs)
      if (completedTime && processTime) {
        const duration = (completedTime - processTime) / 1000; // seconds
        const fileSizeMB = item.file_size / (1024 * 1024); // Convert to MB
        
        scatterData.push({
          x: new Date(item.completed_date!).toISOString(),
          y: duration,
          size: fileSizeMB,
          status: item.status,
          fileName: item.file_name
        });
      }

      // Average times by status
      if (completedTime && processTime) {
        const duration = (completedTime - processTime) / 1000;
        if (!statusDurations[item.status]) {
          statusDurations[item.status] = [];
        }
        statusDurations[item.status].push(duration);
      }

      // Error counts
      if (item.error) {
        errorCounts[item.error] = (errorCounts[item.error] || 0) + 1;
      }

      // Reprocess counts
      if (item.source) {
        reprocessCounts[item.source] = (reprocessCounts[item.source] || 0) + 1;
      }

      // Duration metrics (only for completed jobs)
      if (completedTime) {
        completedCount++;
        if (processTime) {
          totalWaitingTime += (processTime - uploadTime) / 1000;
          totalProcessToComplete += (completedTime - processTime) / 1000;
        }
        totalCreateToComplete += (completedTime - uploadTime) / 1000;
      }
    });

    // Calculate averages
    const averageTimes = Object.entries(statusDurations).map(([status, durations]) => ({
      status,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      count: durations.length
    }));

    const errorCountsArray = Object.entries(errorCounts).map(([error, count]) => ({
      error,
      count
    }));

    const reprocessCountsArray = Object.entries(reprocessCounts).map(([source, count]) => ({
      source,
      count
    }));

    setAnalyticsData({
      scatterData,
      averageTimes,
      errorCounts: errorCountsArray,
      reprocessCounts: reprocessCountsArray,
      durationMetrics: {
        waitingQueue: completedCount > 0 ? totalWaitingTime / completedCount : 0,
        createToComplete: completedCount > 0 ? totalCreateToComplete / completedCount : 0,
        processToComplete: completedCount > 0 ? totalProcessToComplete / completedCount : 0
      }
    });
  };

  useEffect(() => {
    fetchQueueData();
  }, []);

  // Listen for SSE updates
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'queue') {
      fetchQueueData();
    }
  }, [lastMessage]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'inprocess': return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'inprocess': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
      case 'fail': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Upload Queue Statistics</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchQueueData} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
          <div className="flex items-center gap-2">
            {isRealtimeActive ? (
              <div className="flex items-center gap-1 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs">Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-gray-500">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-xs">Offline</span>
              </div>
            )}
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                Last update: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="text-center py-4 text-red-600 bg-red-50 border border-red-200 rounded">
          {errorMessage}
        </div>
      )}

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="status" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Current Status
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          {/* Status Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{queueStatus.total}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-gray-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">T</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Queued</p>
                    <p className="text-2xl font-bold text-blue-600">{queueStatus.queued}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Processing</p>
                    <p className="text-2xl font-bold text-yellow-600">{queueStatus.inprocess}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Success</p>
                    <p className="text-2xl font-bold text-green-600">{queueStatus.success}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Error</p>
                    <p className="text-2xl font-bold text-red-600">{queueStatus.error}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Queue Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Queue Items</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {queueItems.slice(0, 20).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className="font-medium truncate max-w-48">{item.file_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(item.file_size)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {queueItems.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No items in queue
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Duration Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Waiting Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">
                  {formatDuration(analyticsData.durationMetrics.waitingQueue)}
                </p>
                <p className="text-xs text-muted-foreground">Upload to Process</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Total Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatDuration(analyticsData.durationMetrics.createToComplete)}
                </p>
                <p className="text-xs text-muted-foreground">Upload to Complete</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Process Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatDuration(analyticsData.durationMetrics.processToComplete)}
                </p>
                <p className="text-xs text-muted-foreground">Process to Complete</p>
              </CardContent>
            </Card>
          </div>

                     {/* Scatter Chart */}
           <Card>
             <CardHeader>
               <CardTitle>Processing Time vs File Size</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="h-64 border rounded p-4 bg-gray-50">
                 {analyticsData.scatterData.length > 0 ? (
                   <div className="relative w-full h-full">
                     <svg width="100%" height="100%" className="absolute inset-0">
                       {/* Grid lines */}
                       {[...Array(5)].map((_, i) => (
                         <g key={i}>
                           <line
                             x1="0"
                             y1={((i + 1) * 100) / 5}
                             x2="100%"
                             y2={((i + 1) * 100) / 5}
                             stroke="#e5e7eb"
                             strokeWidth="1"
                           />
                           <line
                             x1={((i + 1) * 100) / 5}
                             y1="0"
                             x2={((i + 1) * 100) / 5}
                             y2="100%"
                             stroke="#e5e7eb"
                             strokeWidth="1"
                           />
                         </g>
                       ))}
                       
                       {/* Data points */}
                       {analyticsData.scatterData.map((point, index) => {
                         const x = ((index / (analyticsData.scatterData.length - 1)) * 80) + 10; // 10% margin
                         const maxDuration = Math.max(...analyticsData.scatterData.map(p => p.y));
                         const y = 90 - ((point.y / maxDuration) * 70); // 10% margin, 70% height
                         const radius = Math.max(3, Math.min(8, point.size * 2)); // Scale file size to radius
                         
                                                   // Get color based on status
                          const getStatusColor = (status: string) => {
                            switch (status) {
                              case 'success': return '#10b981'; // green
                              case 'error':
                              case 'fail': return '#ef4444'; // red
                              case 'queued': return '#6b7280'; // gray
                              case 'inprocess': return '#f59e0b'; // yellow
                              default: return '#6b7280'; // gray
                            }
                          };

                          return (
                            <circle
                              key={index}
                              cx={`${x}%`}
                              cy={`${y}%`}
                              r={radius}
                              fill={getStatusColor(point.status)}
                              opacity="0.7"
                              className="hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <title>{`${point.fileName}: ${formatDuration(point.y)} (${point.size.toFixed(1)}MB) - ${point.status}`}</title>
                            </circle>
                          );
                       })}
                       
                       {/* Axis labels */}
                       <text x="50%" y="95%" textAnchor="middle" className="text-xs fill-gray-600">
                         Time
                       </text>
                       <text x="5%" y="50%" textAnchor="middle" className="text-xs fill-gray-600" transform="rotate(-90, 5%, 50%)">
                         Duration (seconds)
                       </text>
                     </svg>
                     
                                           {/* Legend */}
                      <div className="absolute bottom-2 right-2 text-xs text-gray-600">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span>Success</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span>Error/Fail</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span>In Process</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                            <span>Queued</span>
                          </div>
                        </div>
                      </div>
                   </div>
                 ) : (
                   <div className="text-center text-muted-foreground">
                     <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                     <p>No completed jobs to display</p>
                     <p className="text-xs mt-2">
                       X: Time | Y: Duration (seconds) | Point Size: File Size (MB)
                     </p>
                   </div>
                 )}
                 
                 <div className="mt-4 text-xs text-muted-foreground">
                   <p>Data points: {analyticsData.scatterData.length}</p>
                   {analyticsData.scatterData.length > 0 && (
                     <>
                       <p>Time range: {new Date(analyticsData.scatterData[0]?.x).toLocaleDateString()} - {new Date(analyticsData.scatterData[analyticsData.scatterData.length - 1]?.x).toLocaleDateString()}</p>
                       <p>Max duration: {formatDuration(Math.max(...analyticsData.scatterData.map(p => p.y)))}</p>
                       <p>Max file size: {Math.max(...analyticsData.scatterData.map(p => p.size)).toFixed(1)} MB</p>
                     </>
                   )}
                 </div>
               </div>
             </CardContent>
           </Card>

          {/* Analytics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {/* Average Times by Status */}
             <Card>
               <CardHeader>
                 <CardTitle className="text-sm">Average Processing Time by Status</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="space-y-2">
                   {analyticsData.averageTimes.length > 0 ? (
                     <>
                       {/* Bar chart visualization */}
                       <div className="h-32 mb-4 relative">
                         <svg width="100%" height="100%" className="absolute inset-0">
                           {analyticsData.averageTimes.map((item, index) => {
                             const maxDuration = Math.max(...analyticsData.averageTimes.map(t => t.averageDuration));
                             const barHeight = (item.averageDuration / maxDuration) * 100;
                             const barWidth = 100 / analyticsData.averageTimes.length;
                             const x = (index * barWidth) + (barWidth * 0.1);
                             const y = 100 - barHeight;
                             
                             return (
                               <g key={item.status}>
                                 <rect
                                   x={`${x}%`}
                                   y={`${y}%`}
                                   width={`${barWidth * 0.8}%`}
                                   height={`${barHeight}%`}
                                   fill={item.status === 'success' ? '#10b981' : 
                                         item.status === 'error' ? '#ef4444' : 
                                         item.status === 'inprocess' ? '#f59e0b' : '#3b82f6'}
                                   opacity="0.8"
                                   className="hover:opacity-100 transition-opacity"
                                 />
                                 <text
                                   x={`${x + (barWidth * 0.4)}%`}
                                   y="98%"
                                   textAnchor="middle"
                                   className="text-xs fill-gray-600"
                                   fontSize="10"
                                 >
                                   {item.status}
                                 </text>
                                 <text
                                   x={`${x + (barWidth * 0.4)}%`}
                                   y={`${y - 2}%`}
                                   textAnchor="middle"
                                   className="text-xs fill-gray-800"
                                   fontSize="10"
                                 >
                                   {formatDuration(item.averageDuration)}
                                 </text>
                               </g>
                             );
                           })}
                         </svg>
                       </div>
                       
                       {/* Detailed list */}
                       <div className="space-y-2">
                         {analyticsData.averageTimes.map((item) => (
                           <div key={item.status} className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               {getStatusIcon(item.status)}
                               <span className="text-sm font-medium">{item.status}</span>
                             </div>
                             <div className="text-right">
                               <p className="text-sm font-bold">{formatDuration(item.averageDuration)}</p>
                               <p className="text-xs text-muted-foreground">{item.count} jobs</p>
                             </div>
                           </div>
                         ))}
                       </div>
                     </>
                   ) : (
                     <p className="text-sm text-muted-foreground">No completed jobs</p>
                   )}
                 </div>
               </CardContent>
             </Card>

                         {/* Error Counts */}
             <Card>
               <CardHeader>
                 <CardTitle className="text-sm">Error Distribution</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="space-y-2">
                   {analyticsData.errorCounts.length > 0 ? (
                     <>
                       {/* Pie chart visualization */}
                       <div className="h-32 mb-4 relative">
                         <svg width="100%" height="100%" className="absolute inset-0">
                           {(() => {
                             const total = analyticsData.errorCounts.reduce((sum, item) => sum + item.count, 0);
                             const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'];
                             
                             let currentAngle = 0;
                             return analyticsData.errorCounts.map((item, index) => {
                               const sliceAngle = (item.count / total) * 360;
                               const radius = 40;
                               const centerX = 50;
                               const centerY = 50;
                               
                               const startAngle = currentAngle;
                               const endAngle = currentAngle + sliceAngle;
                               
                               const x1 = centerX + radius * Math.cos((startAngle - 90) * Math.PI / 180);
                               const y1 = centerY + radius * Math.sin((startAngle - 90) * Math.PI / 180);
                               const x2 = centerX + radius * Math.cos((endAngle - 90) * Math.PI / 180);
                               const y2 = centerY + radius * Math.sin((endAngle - 90) * Math.PI / 180);
                               
                               const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                               
                               const pathData = [
                                 `M ${centerX} ${centerY}`,
                                 `L ${x1} ${y1}`,
                                 `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                 'Z'
                               ].join(' ');
                               
                               currentAngle += sliceAngle;
                               
                               return (
                                 <path
                                   key={item.error}
                                   d={pathData}
                                   fill={colors[index % colors.length]}
                                   opacity="0.8"
                                   className="hover:opacity-100 transition-opacity"
                                 >
                                   <title>{`${item.error}: ${item.count} (${((item.count / total) * 100).toFixed(1)}%)`}</title>
                                 </path>
                               );
                             });
                           })()}
                         </svg>
                       </div>
                       
                       {/* Detailed list */}
                       <div className="space-y-2">
                         {analyticsData.errorCounts.map((item, index) => {
                           const total = analyticsData.errorCounts.reduce((sum, e) => sum + e.count, 0);
                           const percentage = ((item.count / total) * 100).toFixed(1);
                           const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'];
                           
                           return (
                             <div key={item.error} className="flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                 <div 
                                   className="w-3 h-3 rounded-full" 
                                   style={{ backgroundColor: colors[index % colors.length] }}
                                 ></div>
                                 <span className="text-sm truncate max-w-32">{item.error}</span>
                               </div>
                               <div className="text-right">
                                 <Badge variant="destructive">{item.count}</Badge>
                                 <span className="text-xs text-muted-foreground ml-1">({percentage}%)</span>
                               </div>
                             </div>
                           );
                         })}
                       </div>
                     </>
                   ) : (
                     <p className="text-sm text-muted-foreground">No errors recorded</p>
                   )}
                 </div>
               </CardContent>
             </Card>

                         {/* Reprocess Counts */}
             <Card>
               <CardHeader>
                 <CardTitle className="text-sm">Source Distribution</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="space-y-2">
                   {analyticsData.reprocessCounts.length > 0 ? (
                     <>
                       {/* Bar chart visualization */}
                       <div className="h-32 mb-4 relative">
                         <svg width="100%" height="100%" className="absolute inset-0">
                           {analyticsData.reprocessCounts.map((item, index) => {
                             const maxCount = Math.max(...analyticsData.reprocessCounts.map(s => s.count));
                             const barHeight = (item.count / maxCount) * 100;
                             const barWidth = 100 / analyticsData.reprocessCounts.length;
                             const x = (index * barWidth) + (barWidth * 0.1);
                             const y = 100 - barHeight;
                             const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f97316'];
                             
                             return (
                               <g key={item.source}>
                                 <rect
                                   x={`${x}%`}
                                   y={`${y}%`}
                                   width={`${barWidth * 0.8}%`}
                                   height={`${barHeight}%`}
                                   fill={colors[index % colors.length]}
                                   opacity="0.8"
                                   className="hover:opacity-100 transition-opacity"
                                 />
                                 <text
                                   x={`${x + (barWidth * 0.4)}%`}
                                   y="98%"
                                   textAnchor="middle"
                                   className="text-xs fill-gray-600"
                                   fontSize="10"
                                 >
                                   {item.source || 'Unknown'}
                                 </text>
                                 <text
                                   x={`${x + (barWidth * 0.4)}%`}
                                   y={`${y - 2}%`}
                                   textAnchor="middle"
                                   className="text-xs fill-gray-800"
                                   fontSize="10"
                                 >
                                   {item.count}
                                 </text>
                               </g>
                             );
                           })}
                         </svg>
                       </div>
                       
                       {/* Detailed list */}
                       <div className="space-y-2">
                         {analyticsData.reprocessCounts.map((item, index) => {
                           const total = analyticsData.reprocessCounts.reduce((sum, s) => sum + s.count, 0);
                           const percentage = ((item.count / total) * 100).toFixed(1);
                           const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f97316'];
                           
                           return (
                             <div key={item.source} className="flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                 <div 
                                   className="w-3 h-3 rounded-full" 
                                   style={{ backgroundColor: colors[index % colors.length] }}
                                 ></div>
                                 <span className="text-sm font-medium">{item.source || 'Unknown'}</span>
                               </div>
                               <div className="text-right">
                                 <Badge variant="outline">{item.count}</Badge>
                                 <span className="text-xs text-muted-foreground ml-1">({percentage}%)</span>
                               </div>
                             </div>
                           );
                         })}
                       </div>
                     </>
                   ) : (
                     <p className="text-sm text-muted-foreground">No source data</p>
                   )}
                 </div>
               </CardContent>
             </Card>

                         {/* File Size Distribution */}
             <Card>
               <CardHeader>
                 <CardTitle className="text-sm">File Size Summary</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="space-y-2">
                   {(() => {
                     const sizeRanges = {
                       'Small (< 1MB)': 0,
                       'Medium (1-5MB)': 0,
                       'Large (5-10MB)': 0,
                       'Very Large (> 10MB)': 0
                     };

                     queueItems.forEach(item => {
                       const sizeMB = item.file_size / (1024 * 1024);
                       if (sizeMB < 1) sizeRanges['Small (< 1MB)']++;
                       else if (sizeMB < 5) sizeRanges['Medium (1-5MB)']++;
                       else if (sizeMB < 10) sizeRanges['Large (5-10MB)']++;
                       else sizeRanges['Very Large (> 10MB)']++;
                     });

                     const totalFiles = Object.values(sizeRanges).reduce((sum, count) => sum + count, 0);
                     const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

                     return (
                       <>
                         {/* Bar chart visualization */}
                         <div className="h-32 mb-4 relative">
                           <svg width="100%" height="100%" className="absolute inset-0">
                             {Object.entries(sizeRanges).map(([range, count], index) => {
                               const maxCount = Math.max(...Object.values(sizeRanges));
                               const barHeight = maxCount > 0 ? (count / maxCount) * 100 : 0;
                               const barWidth = 100 / Object.keys(sizeRanges).length;
                               const x = (index * barWidth) + (barWidth * 0.1);
                               const y = 100 - barHeight;
                               
                               return (
                                 <g key={range}>
                                   <rect
                                     x={`${x}%`}
                                     y={`${y}%`}
                                     width={`${barWidth * 0.8}%`}
                                     height={`${barHeight}%`}
                                     fill={colors[index % colors.length]}
                                     opacity="0.8"
                                     className="hover:opacity-100 transition-opacity"
                                   />
                                   <text
                                     x={`${x + (barWidth * 0.4)}%`}
                                     y="98%"
                                     textAnchor="middle"
                                     className="text-xs fill-gray-600"
                                     fontSize="10"
                                   >
                                     {range.split(' ')[0]}
                                   </text>
                                   <text
                                     x={`${x + (barWidth * 0.4)}%`}
                                     y={`${y - 2}%`}
                                     textAnchor="middle"
                                     className="text-xs fill-gray-800"
                                     fontSize="10"
                                   >
                                     {count}
                                   </text>
                                 </g>
                               );
                             })}
                           </svg>
                         </div>
                         
                         {/* Detailed list */}
                         <div className="space-y-2">
                           {Object.entries(sizeRanges).map(([range, count], index) => {
                             const percentage = totalFiles > 0 ? ((count / totalFiles) * 100).toFixed(1) : '0';
                             
                             return (
                               <div key={range} className="flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                   <div 
                                     className="w-3 h-3 rounded-full" 
                                     style={{ backgroundColor: colors[index % colors.length] }}
                                   ></div>
                                   <span className="text-sm">{range}</span>
                                 </div>
                                 <div className="text-right">
                                   <Badge variant="secondary">{count}</Badge>
                                   <span className="text-xs text-muted-foreground ml-1">({percentage}%)</span>
                                 </div>
                               </div>
                             );
                           })}
                         </div>
                       </>
                     );
                   })()}
                 </div>
               </CardContent>
             </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
