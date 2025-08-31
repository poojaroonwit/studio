"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock, FileText, AlertTriangle, TrendingUp, Database, CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatFileSize, formatDate, calculateDuration } from '@/lib/utils';
import { Line, Scatter } from 'react-chartjs-2';
import { useChartSetup } from '@/hooks/use-chart-setup';
import { DateRange } from 'react-day-picker';

interface QueueItem {
  id: string;
  file_name: string;
  file_size: number;
  status: string;
  upload_date: string;
  process_date: string | null;
  completed_date: string | null;
  error: string | null;
  error_details: string | null;
  position_title: string | null;
  source: string | null;
}

interface AnalyticsData {
  scatterData: Array<{
    x: string; // process date (formatted)
    y: number; // duration (minutes)
    status: string;
    fileName: string;
    fileSize: number;
    uploadDate: string;
    processDate: string | null;
    completedDate: string | null;
    error: string | null;
    errorDetails: string | null;
    positionTitle: string | null;
    source: string | null;
    id: string;
  }>;
  stats: {
    totalJobs: number;
    avgDuration: number;
    avgDurationByType: Array<{ type: string; avgDuration: number; count: number }>;
    jobsByType: Array<{ type: string; count: number }>;
    errorsByReason: Array<{ reason: string; count: number }>;
    fileSizeRanges: Array<{ range: string; count: number; avgDuration: number }>;
  };
}

export default function ProcessQueueAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<AnalyticsData['scatterData'][0] | null>(null);
  const [isJobDetailsOpen, setIsJobDetailsOpen] = useState(false);
  const { chartReady, isLoading: chartLoading, error: chartError } = useChartSetup();

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, statusFilter]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '1000'
      });

      // Add date range parameters if set
      if (dateRange?.from) {
        params.append('date_start', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.append('date_end', dateRange.to.toISOString());
      }

      // Add status filter if set
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const url = `/api/upload-queue?${params}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch queue data');
      }
      
      const result = await response.json();
      const queueData: QueueItem[] = result.data || [];
      
      // Process data for analytics
      const processedData = processQueueData(queueData);
      setData(processedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const setDatePreset = (preset: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    let from: Date;
    let to: Date;

    switch (preset) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'yesterday':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        break;
      case 'last7days':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'last30days':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'thisMonth':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'lastMonth':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
    }

    setDateRange({ from, to });
  };

  const processQueueData = (queueData: QueueItem[]): AnalyticsData => {
    const scatterData: AnalyticsData['scatterData'] = [];
    const typeMap = new Map<string, { totalDuration: number; count: number }>();
    const errorMap = new Map<string, number>();
    const fileSizeRanges = new Map<string, { totalDuration: number; count: number }>();

    queueData.forEach(item => {
      if (item.process_date && item.completed_date) {
        const processTime = new Date(item.process_date).getTime();
        const completedTime = new Date(item.completed_date).getTime();
        const duration = (completedTime - processTime) / (1000 * 60); // minutes
        
        scatterData.push({
          x: new Date(processTime).toLocaleDateString(),
          y: duration,
          status: item.status,
          fileName: item.file_name,
          fileSize: item.file_size,
          uploadDate: item.upload_date,
          processDate: item.process_date,
          completedDate: item.completed_date,
          error: item.error,
          errorDetails: item.error_details,
          positionTitle: item.position_title,
          source: item.source,
          id: item.id
        });

        // Calculate file size range
        const sizeInMB = item.file_size / (1024 * 1024);
        let range = '';
        if (sizeInMB < 1) range = '< 1MB';
        else if (sizeInMB < 5) range = '1-5MB';
        else if (sizeInMB < 10) range = '5-10MB';
        else range = '> 10MB';

        const currentRange = fileSizeRanges.get(range) || { totalDuration: 0, count: 0 };
        fileSizeRanges.set(range, {
          totalDuration: currentRange.totalDuration + duration,
          count: currentRange.count + 1
        });
      }

      // Track by type (status)
      const currentType = typeMap.get(item.status) || { totalDuration: 0, count: 0 };
      if (item.process_date && item.completed_date) {
        const duration = (new Date(item.completed_date).getTime() - new Date(item.process_date).getTime()) / (1000 * 60);
        typeMap.set(item.status, {
          totalDuration: currentType.totalDuration + duration,
          count: currentType.count + 1
        });
      } else {
        typeMap.set(item.status, {
          totalDuration: currentType.totalDuration,
          count: currentType.count + 1
        });
      }

      // Track errors
      if (item.error) {
        const reason = item.error_details || item.error;
        errorMap.set(reason, (errorMap.get(reason) || 0) + 1);
      }
    });

    const avgDuration = scatterData.length > 0 
      ? scatterData.reduce((sum, item) => sum + item.y, 0) / scatterData.length 
      : 0;

    const avgDurationByType = Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      avgDuration: data.count > 0 ? data.totalDuration / data.count : 0,
      count: data.count
    }));

    const jobsByType = Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count
    }));

    const errorsByReason = Array.from(errorMap.entries()).map(([reason, count]) => ({
      reason,
      count
    }));

    const fileSizeRangesData = Array.from(fileSizeRanges.entries()).map(([range, data]) => ({
      range,
      count: data.count,
      avgDuration: data.count > 0 ? data.totalDuration / data.count : 0
    }));

    return {
      scatterData,
      stats: {
        totalJobs: queueData.length,
        avgDuration,
        avgDurationByType,
        jobsByType,
        errorsByReason,
        fileSizeRanges: fileSizeRangesData
      }
    };
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success': return 'text-green-600';
      case 'fail': return 'text-red-600';
      case 'error': return 'text-red-600';
      case 'inprocess': return 'text-yellow-600';
      case 'queued': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const handlePointClick = (event: any, elements: any[]) => {
    if (elements.length > 0) {
      const dataIndex = elements[0].dataIndex;
      const clickedJob = data!.scatterData[dataIndex];
      setSelectedJob(clickedJob);
      setIsJobDetailsOpen(true);
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        <AlertTriangle className="h-8 w-8 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
        <p className="text-muted-foreground">No queue data available for analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
            {/* Date Range Filter */}
      <div className="flex items-center justify-between">
        {(dateRange || statusFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDateRange(undefined);
              setStatusFilter('all');
            }}
            className="text-gray-600 hover:text-gray-800 h-7 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All Filters
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Range Filter */}
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <Label htmlFor="dateRange" className="text-xs text-muted-foreground">Date Range</Label>
            <div className="flex space-x-2 mt-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal h-8 text-sm",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM dd, yyyy")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                  />
                </PopoverContent>
              </Popover>
              {dateRange && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange(undefined)}
                  className="px-2 h-8"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDatePreset('today')}
                className="text-xs h-5 px-1"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDatePreset('yesterday')}
                className="text-xs h-5 px-1"
              >
                Yesterday
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDatePreset('last7days')}
                className="text-xs h-5 px-1"
              >
                Last 7 days
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDatePreset('last30days')}
                className="text-xs h-5 px-1"
              >
                Last 30 days
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDatePreset('thisMonth')}
                className="text-xs h-5 px-1"
              >
                This month
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDatePreset('lastMonth')}
                className="text-xs h-5 px-1"
              >
                Last month
              </Button>
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-1">
          <Label htmlFor="status" className="text-xs text-muted-foreground">Status Filter</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="inprocess">In Process</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="fail">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Total Jobs</h3>
            <Database className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{data!.stats.totalJobs}</div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Avg Duration</h3>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{data!.stats.avgDuration.toFixed(1)}m</div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Completed Jobs</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {data!.stats.jobsByType.find(j => j.type === 'completed')?.count || 0}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Failed Jobs</h3>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {data!.stats.jobsByType.find(j => j.type === 'failed')?.count || 0}
          </div>
        </div>
      </div>

      {/* Charts and Detailed Stats */}
      <Tabs defaultValue="scatter" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scatter">Scatter Chart</TabsTrigger>
          <TabsTrigger value="duration">Duration Analysis</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="files">File Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="scatter" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Process Time vs Duration</CardTitle>
              <CardDescription>
                Scatter plot showing the relationship between process date and duration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-muted-foreground">Loading chart...</p>
                  </div>
                </div>
              ) : chartError ? (
                <div className="flex items-center justify-center h-96 text-red-600">
                  <div className="text-center space-y-3">
                    <AlertTriangle className="h-8 w-8 mx-auto" />
                    <p>Chart error: {chartError}</p>
                  </div>
                </div>
              ) : !chartReady ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center space-y-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-muted-foreground">Initializing chart...</p>
                  </div>
                </div>
              ) : data!.scatterData.length === 0 ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center space-y-3">
                    <Database className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">No data available for scatter plot</p>
                  </div>
                </div>
              ) : (
                                <div className="h-96">
                  <Scatter
                    data={{
                      datasets: [
                        {
                          label: 'Duration (minutes)',
                          data: data!.scatterData.map(item => ({
                            x: new Date(item.x).getTime(),
                            y: item.y
                          })),
                          backgroundColor: data!.scatterData.map(item => {
                            switch (item.status.toLowerCase()) {
                              case 'success': return 'rgba(34, 197, 94, 0.8)';
                              case 'fail': return 'rgba(239, 68, 68, 0.8)';
                              case 'error': return 'rgba(239, 68, 68, 0.8)';
                              case 'inprocess': return 'rgba(234, 179, 8, 0.8)';
                              case 'queued': return 'rgba(59, 130, 246, 0.8)';
                              default: return 'rgba(107, 114, 128, 0.8)';
                            }
                          }),
                          borderColor: data!.scatterData.map(item => {
                            switch (item.status.toLowerCase()) {
                              case 'success': return 'rgba(34, 197, 94, 1)';
                              case 'fail': return 'rgba(239, 68, 68, 1)';
                              case 'error': return 'rgba(239, 68, 68, 1)';
                              case 'inprocess': return 'rgba(234, 179, 8, 1)';
                              case 'queued': return 'rgba(59, 130, 246, 1)';
                              default: return 'rgba(107, 114, 128, 1)';
                            }
                          }),
                          borderWidth: 2,
                          pointRadius: 6,
                          pointHoverRadius: 8,
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      onClick: handlePointClick,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            title: function(context: any) {
                              const dataIndex = context[0].dataIndex;
                              const item = data!.scatterData[dataIndex];
                              return `Date: ${new Date(item.x).toLocaleDateString()}`;
                            },
                            label: function(context: any) {
                              const dataIndex = context[0].dataIndex;
                              const item = data!.scatterData[dataIndex];
                              return [
                                `Duration: ${context[0].parsed.y.toFixed(2)} minutes`,
                                `Status: ${item.status}`,
                                `File: ${item.fileName}`
                              ];
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: 'Process Date'
                          },
                          grid: { color: 'rgba(100,116,139,0.1)' },
                          ticks: { 
                            color: 'rgb(100, 116, 139)', 
                            font: { size: 12 },
                            maxRotation: 45
                          },
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Duration (minutes)'
                          },
                          beginAtZero: true,
                          grid: { color: 'rgba(100,116,139,0.1)' },
                          ticks: { 
                            color: 'rgb(100, 116, 139)', 
                            font: { size: 12 },
                            callback: function(value) {
                              return Number(value).toFixed(2);
                            }
                          },
                        },
                      },
                    }}
                  />
                  
                  {/* Custom Legend */}
                  <div className="mt-4 flex flex-wrap gap-4 justify-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">Success</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm">Failed/Error</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm">In Process</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm">Queued</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duration" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Average Duration by Type</CardTitle>
                <CardDescription>Average processing duration for each job type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data!.stats.avgDurationByType.map((item) => (
                    <div key={item.type} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{item.type}</Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{item.avgDuration.toFixed(1)}m</div>
                        <div className="text-sm text-muted-foreground">{item.count} jobs</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Jobs by Type</CardTitle>
                <CardDescription>Number of jobs in each status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data!.stats.jobsByType.map((item) => (
                    <div key={item.type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{item.type}</Badge>
                      </div>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Error Analysis</CardTitle>
              <CardDescription>Breakdown of errors by reason</CardDescription>
            </CardHeader>
            <CardContent>
              {data!.stats.errorsByReason.length > 0 ? (
                <div className="space-y-4">
                  {data!.stats.errorsByReason.map((item) => (
                    <div key={item.reason} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.reason}</p>
                      </div>
                      <Badge variant="destructive">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No errors found in the data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>File Size Analysis</CardTitle>
              <CardDescription>Performance metrics by file size range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data!.stats.fileSizeRanges.map((item) => (
                  <div key={item.range} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{item.range}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.count} files
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.avgDuration.toFixed(1)}m avg</p>
                      <p className="text-sm text-muted-foreground">duration</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Job Details Dialog */}
      <Dialog open={isJobDetailsOpen} onOpenChange={setIsJobDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected process job
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Job ID</Label>
                  <p className="text-sm">{selectedJob.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge className={getStatusColor(selectedJob.status)}>
                    {selectedJob.status}
                  </Badge>
                </div>
              </div>

              {/* File Information */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">File Information</Label>
                <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">File Name</p>
                    <p className="text-sm text-muted-foreground">{selectedJob.fileName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">File Size</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(selectedJob.fileSize)}</p>
                  </div>
                </div>
              </div>

              {/* Timing Information */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">Timing Information</Label>
                <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Upload Date</p>
                    <p className="text-sm text-muted-foreground">{new Date(selectedJob.uploadDate).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Process Date</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedJob.processDate ? new Date(selectedJob.processDate).toLocaleString() : 'Not started'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Completed Date</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedJob.completedDate ? new Date(selectedJob.completedDate).toLocaleString() : 'Not completed'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">{selectedJob.y.toFixed(2)} minutes</p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {(selectedJob.positionTitle || selectedJob.source) && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">Additional Information</Label>
                  <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg">
                    {selectedJob.positionTitle && (
                      <div>
                        <p className="text-sm font-medium">Position Title</p>
                        <p className="text-sm text-muted-foreground">{selectedJob.positionTitle}</p>
                      </div>
                    )}
                    {selectedJob.source && (
                      <div>
                        <p className="text-sm font-medium">Source</p>
                        <p className="text-sm text-muted-foreground">{selectedJob.source}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Information */}
              {selectedJob.error && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">Error Information</Label>
                  <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                    <div>
                      <p className="text-sm font-medium text-red-800">Error</p>
                      <p className="text-sm text-red-700">{selectedJob.error}</p>
                    </div>
                    {selectedJob.errorDetails && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-red-800">Error Details</p>
                        <p className="text-sm text-red-700">{selectedJob.errorDetails}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
