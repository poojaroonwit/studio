"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle, XCircle, Loader2, AlertCircle, BarChart3, TrendingUp, Calendar, Filter } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUnifiedRealtime } from '@/hooks/use-unified-realtime';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

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
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    data: any;
  } | null>(null);
  
  // Date range filters
  const [uploadDateFrom, setUploadDateFrom] = useState<Date | undefined>(undefined);
  const [uploadDateTo, setUploadDateTo] = useState<Date | undefined>(undefined);
  const [completionDateFrom, setCompletionDateFrom] = useState<Date | undefined>(undefined);
  const [completionDateTo, setCompletionDateTo] = useState<Date | undefined>(undefined);
  
  // Use centralized realtime connection
  const { isConnected: isRealtimeActive, lastUpdate } = useUnifiedRealtime({
    onUploadQueueUpdate: (queueData: any) => {
      // Refresh data when we receive realtime updates
      fetchQueueData();
    }
  });

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
    // Filter items based on date ranges
    const filteredItems = items.filter(item => {
      const uploadDate = new Date(item.upload_date);
      const completionDate = item.completed_date ? new Date(item.completed_date) : null;
      
      // Upload date filter
      if (uploadDateFrom && uploadDate < uploadDateFrom) return false;
      if (uploadDateTo && uploadDate > uploadDateTo) return false;
      
      // Completion date filter (only apply if item has completion date)
      if (completionDate) {
        if (completionDateFrom && completionDate < completionDateFrom) return false;
        if (completionDateTo && completionDate > completionDateTo) return false;
      }
      
      return true;
    });

    const scatterData: AnalyticsData['scatterData'] = [];
    const statusDurations: { [key: string]: number[] } = {};
    const errorCounts: { [key: string]: number } = {};
    const reprocessCounts: { [key: string]: number } = {};
    let totalWaitingTime = 0;
    let totalCreateToComplete = 0;
    let totalProcessToComplete = 0;
    let completedCount = 0;

    filteredItems.forEach(item => {
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

  // Reprocess analytics when date filters change
  useEffect(() => {
    if (queueItems.length > 0) {
      processAnalyticsData(queueItems);
    }
  }, [uploadDateFrom, uploadDateTo, completionDateFrom, completionDateTo, queueItems]);

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

  const clearDateFilters = () => {
    setUploadDateFrom(undefined);
    setUploadDateTo(undefined);
    setCompletionDateFrom(undefined);
    setCompletionDateTo(undefined);
  };

  const hasActiveFilters = () => {
    return uploadDateFrom || uploadDateTo || completionDateFrom || completionDateTo;
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

       <div className="space-y-4">
                                         {/* Date Range Filters */}
                     <Card>
                       <CardHeader className="pb-3">
                         <CardTitle className="flex items-center gap-2 text-sm">
                           <Filter className="h-4 w-4" />
                           Date Range Filters
                         </CardTitle>
                       </CardHeader>
                       <CardContent className="pt-0">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                     {/* Upload Date Range */}
                           <div className="space-y-2">
                             <Label className="text-sm font-medium">Upload Date Range</Label>
                             <div className="grid grid-cols-2 gap-2">
                               <div className="space-y-1">
                                 <Label className="text-xs text-muted-foreground">From</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !uploadDateFrom && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {uploadDateFrom ? format(uploadDateFrom, "PPP") : "Select date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <CalendarComponent
                                      mode="single"
                                      selected={uploadDateFrom}
                                      onSelect={setUploadDateFrom}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">To</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !uploadDateTo && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {uploadDateTo ? format(uploadDateTo, "PPP") : "Select date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <CalendarComponent
                                      mode="single"
                                      selected={uploadDateTo}
                                      onSelect={setUploadDateTo}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          </div>

                          {/* Completion Date Range */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Completion Date Range</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">From</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !completionDateFrom && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {completionDateFrom ? format(completionDateFrom, "PPP") : "Select date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <CalendarComponent
                                      mode="single"
                                      selected={completionDateFrom}
                                      onSelect={setCompletionDateFrom}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">To</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !completionDateTo && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {completionDateTo ? format(completionDateTo, "PPP") : "Select date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <CalendarComponent
                                      mode="single"
                                      selected={completionDateTo}
                                      onSelect={setCompletionDateTo}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Filter Actions */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <div className="flex items-center gap-2">
                            {hasActiveFilters() && (
                              <Badge variant="secondary" className="text-xs">
                                {analyticsData.scatterData.length} items filtered
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {hasActiveFilters() && (
                              <Button variant="outline" size="sm" onClick={clearDateFilters}>
                                Clear Filters
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Processing Time vs File Size Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Processing Time vs File Size Analysis
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Visualize the relationship between file sizes and processing times
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Chart Container */}
                  <div className="h-80 border rounded-lg p-6 bg-white dark:bg-gray-900/50 relative">
                    {analyticsData.scatterData.length > 0 ? (
                      <div className="relative w-full h-full">
                        {/* Enhanced Tooltip */}
                        {hoveredPoint && (
                          <div
                            className="absolute z-20 px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 pointer-events-none"
                            style={{
                              left: `${hoveredPoint.x}px`,
                              top: `${hoveredPoint.y - 80}px`,
                              transform: 'translateX(-50%)',
                              minWidth: '200px'
                            }}
                          >
                            <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">
                              {hoveredPoint.data.fileName}
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Processing Time:</span>
                                <span className="font-medium">{formatDuration(hoveredPoint.data.y)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">File Size:</span>
                                <span className="font-medium">{hoveredPoint.data.size.toFixed(1)} MB</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                <Badge className={`text-xs ${hoveredPoint.data.status === 'success' ? 'bg-green-100 text-green-800' : 
                                  hoveredPoint.data.status === 'error' ? 'bg-red-100 text-red-800' : 
                                  hoveredPoint.data.status === 'inprocess' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {hoveredPoint.data.status}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Date:</span>
                                <span className="font-medium">{new Date(hoveredPoint.data.x).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-gray-800"></div>
                          </div>
                        )}

                                                 {/* Chart SVG */}
                         <svg width="100%" height="100%" className="absolute inset-0">
                           {/* Background Grid */}
                           <defs>
                             <pattern id="grid" width="20%" height="20%" patternUnits="userSpaceOnUse">
                               <path d="M 20% 0 L 0 0 0 20%" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-100 dark:text-gray-800"/>
                             </pattern>
                           </defs>
                           <rect width="100%" height="100%" fill="url(#grid)" />

                           {/* Grid Lines */}
                           {[...Array(5)].map((_, i) => (
                             <g key={`grid-${i}`}>
                               {/* Vertical grid lines */}
                               <line
                                 x1={`${15 + (i * 17.5)}%`}
                                 y1="15%"
                                 x2={`${15 + (i * 17.5)}%`}
                                 y2="85%"
                                 stroke="currentColor"
                                 strokeWidth="0.5"
                                 className="text-gray-200 dark:text-gray-700"
                                 opacity="0.6"
                               />
                               {/* Horizontal grid lines */}
                               <line
                                 x1="15%"
                                 y1={`${15 + (i * 13)}%`}
                                 x2="85%"
                                 y2={`${15 + (i * 13)}%`}
                                 stroke="currentColor"
                                 strokeWidth="0.5"
                                 className="text-gray-200 dark:text-gray-700"
                                 opacity="0.6"
                               />
                             </g>
                           ))}

                           {/* Axis Lines */}
                           <line x1="15%" y1="15%" x2="15%" y2="85%" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-600" />
                           <line x1="15%" y1="85%" x2="85%" y2="85%" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-600" />

                          {/* Data Points */}
                          {analyticsData.scatterData.map((point, index) => {
                            const x = ((index / (analyticsData.scatterData.length - 1)) * 70) + 15; // 15% margin
                            const maxDuration = Math.max(...analyticsData.scatterData.map(p => p.y));
                            const y = 85 - ((point.y / maxDuration) * 65); // 15% margin, 65% height
                            const radius = Math.max(4, Math.min(12, point.size * 3)); // Better size scaling
                            
                            const getStatusColor = (status: string) => {
                              switch (status) {
                                case 'success': return '#10b981';
                                case 'error':
                                case 'fail': return '#ef4444';
                                case 'queued': return '#6b7280';
                                case 'inprocess': return '#f59e0b';
                                default: return '#6b7280';
                              }
                            };

                                                         return (
                               <circle
                                 key={index}
                                 cx={`${x}%`}
                                 cy={`${y}%`}
                                 r={radius}
                                 fill={getStatusColor(point.status)}
                                 opacity="0.8"
                                 className="hover:opacity-100 hover:r-6 transition-all duration-300 cursor-pointer"
                                 style={{
                                   filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))'
                                 }}
                                 onMouseEnter={(e) => {
                                   const rect = e.currentTarget.getBoundingClientRect();
                                   const chartRect = e.currentTarget.closest('.relative')?.getBoundingClientRect();
                                   if (chartRect) {
                                     setHoveredPoint({
                                       x: rect.left - chartRect.left + rect.width / 2,
                                       y: rect.top - chartRect.top + rect.height / 2,
                                       data: point
                                     });
                                   }
                                 }}
                                 onMouseLeave={() => setHoveredPoint(null)}
                               />
                             );
                          })}

                                                     {/* Axis Labels */}
                           <text x="50%" y="95%" textAnchor="middle" className="text-sm font-semibold fill-current text-gray-700 dark:text-gray-300">
                             Upload Date
                           </text>
                           <text x="5%" y="50%" textAnchor="middle" className="text-sm font-semibold fill-current text-gray-700 dark:text-gray-300" transform="rotate(-45, 5%, 50%)">
                             Processing Time (seconds)
                           </text>

                                                     {/* Y-axis Values */}
                           {analyticsData.scatterData.length > 0 && [...Array(6)].map((_, i) => {
                             const maxDuration = Math.max(...analyticsData.scatterData.map(p => p.y));
                             const value = (maxDuration * (6 - i)) / 6;
                             return (
                               <g key={`y-tick-${i}`}>
                                 <line
                                   x1="14%"
                                   y1={`${15 + (i * 13)}%`}
                                   x2="15%"
                                   y2={`${15 + (i * 13)}%`}
                                   stroke="currentColor"
                                   strokeWidth="1"
                                   className="text-gray-300 dark:text-gray-600"
                                 />
                                 <text
                                   x="13%"
                                   y={`${15 + (i * 13)}%`}
                                   textAnchor="end"
                                   className="text-xs fill-current text-gray-500 dark:text-gray-400"
                                   dominantBaseline="middle"
                                 >
                                   {formatDuration(value)}
                                 </text>
                               </g>
                             );
                           })}

                                                     {/* X-axis Values */}
                           {analyticsData.scatterData.length > 0 && [...Array(5)].map((_, i) => {
                             const index = Math.floor((i / 4) * (analyticsData.scatterData.length - 1));
                             const date = new Date(analyticsData.scatterData[index]?.x);
                             return (
                               <g key={`x-tick-${i}`}>
                                 <line
                                   x1={`${15 + (i * 17.5)}%`}
                                   y1="85%"
                                   x2={`${15 + (i * 17.5)}%`}
                                   y2="86%"
                                   stroke="currentColor"
                                   strokeWidth="1"
                                   className="text-gray-300 dark:text-gray-600"
                                 />
                                 <text
                                   x={`${15 + (i * 17.5)}%`}
                                   y="89%"
                                   textAnchor="middle"
                                   className="text-xs fill-current text-gray-500 dark:text-gray-400"
                                 >
                                   {date.toLocaleDateString()}
                                 </text>
                               </g>
                             );
                           })}
                        </svg>

                        {/* Enhanced Legend */}
                        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg border border-gray-200 dark:border-gray-700">
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Status Legend</div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span className="text-xs text-gray-600 dark:text-gray-400">Success</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <span className="text-xs text-gray-600 dark:text-gray-400">Error/Fail</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                              <span className="text-xs text-gray-600 dark:text-gray-400">In Process</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                              <span className="text-xs text-gray-600 dark:text-gray-400">Queued</span>
                            </div>
                          </div>
                          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Point size = File size
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                          No Data Available
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                          No completed jobs found to display. The chart will show processing times vs file sizes once jobs are completed.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Chart Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Data Points</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{analyticsData.scatterData.length}</div>
                    </div>
                    {analyticsData.scatterData.length > 0 && (
                      <>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Avg Duration</div>
                          <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                            {formatDuration(analyticsData.scatterData.reduce((sum, p) => sum + p.y, 0) / analyticsData.scatterData.length)}
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Avg File Size</div>
                          <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                            {(analyticsData.scatterData.reduce((sum, p) => sum + p.size, 0) / analyticsData.scatterData.length).toFixed(1)} MB
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Max Duration</div>
                          <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                            {formatDuration(Math.max(...analyticsData.scatterData.map(p => p.y)))}
                          </div>
                        </div>
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
                                   className="text-xs fill-current text-gray-600 dark:text-gray-400"
                                   fontSize="10"
                                 >
                                   {item.status}
                                 </text>
                                 <text
                                   x={`${x + (barWidth * 0.4)}%`}
                                   y={`${y - 2}%`}
                                   textAnchor="middle"
                                   className="text-xs fill-current text-gray-800 dark:text-gray-200"
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
                                   className="text-xs fill-current text-gray-600 dark:text-gray-400"
                                   fontSize="10"
                                 >
                                   {item.source || 'Unknown'}
                                 </text>
                                 <text
                                   x={`${x + (barWidth * 0.4)}%`}
                                   y={`${y - 2}%`}
                                   textAnchor="middle"
                                   className="text-xs fill-current text-gray-800 dark:text-gray-200"
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
                                     className="text-xs fill-current text-gray-600 dark:text-gray-400"
                                     fontSize="10"
                                   >
                                     {range.split(' ')[0]}
                                   </text>
                                   <text
                                     x={`${x + (barWidth * 0.4)}%`}
                                     y={`${y - 2}%`}
                                     textAnchor="middle"
                                     className="text-xs fill-current text-gray-800 dark:text-gray-200"
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
       </div>
     </div>
   );
 }
