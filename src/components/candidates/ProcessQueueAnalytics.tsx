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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Clock, FileText, AlertTriangle, TrendingUp, Database, CalendarIcon, Filter, X, Download, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatFileSize, formatDate, calculateDuration, safeGetDateFromRange } from '@/lib/utils';
import { Line, Scatter } from 'react-chartjs-2';
import { useChartSetup } from '@/hooks/use-chart-setup';
import { isDataLabelsAvailable } from '@/lib/chartjs-setup';
import { DateRange } from 'react-day-picker';
import { useEnhancedSSE } from '@/hooks/use-enhanced-sse';
import { safeFetch } from '@/lib/safe-fetch';

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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    // Default to last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    return { from: thirtyDaysAgo, to: now };
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<AnalyticsData['scatterData'][0] | null>(null);
  const [isJobDetailsOpen, setIsJobDetailsOpen] = useState(false);
  const { chartReady, isLoading: chartLoading, error: chartError } = useChartSetup();

  // SSE hook for realtime updates
  const { isConnected: realtimeConnected } = useEnhancedSSE();

  // Refresh analytics on SSE connection changes
  useEffect(() => {
    if (realtimeConnected) {
      fetchAnalyticsData();
    }
  }, [realtimeConnected]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, statusFilter]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '1000' // Use 1000 as max limit for analytics
      });

      // Always add date range parameters - default to last 30 days if not set
      let fromDate = dateRange?.from;
      let toDate = dateRange?.to;
      
      if (!fromDate) {
        const now = new Date();
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      }
      if (!toDate) {
        toDate = new Date();
      }
      
      // For scatter plot analytics, we want to filter by process_date instead of upload_date
      // This ensures we see processing activity for the selected date range
      params.append('process_date_start', fromDate.toISOString());
      params.append('process_date_end', toDate.toISOString());

      // Add status filter if set
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const url = `/api/upload-queue?${params}`;
      const result = await safeFetch(url, { timeoutMs: 10000 });
      if (!result.ok) {
        console.warn('Skipping failed endpoint /api/upload-queue:', result.error || result.status);
        setData({
          scatterData: [],
          stats: {
            totalJobs: 0,
            avgDuration: 0,
            avgDurationByType: [],
            jobsByType: [],
            errorsByReason: [],
            fileSizeRanges: []
          }
        });
        return;
      }
      
      const responseData = result.data;
      const queueData: QueueItem[] = (responseData as any)?.data || [];
      
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
        const processDate = new Date(item.process_date);
        const completedDate = new Date(item.completed_date);
        
        // Check if dates are valid before calling getTime()
        if (isNaN(processDate.getTime()) || isNaN(completedDate.getTime())) {
          return; // Skip invalid dates
        }
        
        const processTime = processDate.getTime();
        const completedTime = completedDate.getTime();
        const duration = (completedTime - processTime) / (1000 * 60); // minutes
        
        scatterData.push({
          x: new Date(processTime).toISOString(),
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
        const processDate = new Date(item.process_date);
        const completedDate = new Date(item.completed_date);
        
        // Check if dates are valid before calling getTime()
        if (isNaN(processDate.getTime()) || isNaN(completedDate.getTime())) {
          return; // Skip invalid dates
        }
        
        const duration = (completedDate.getTime() - processDate.getTime()) / (1000 * 60);
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
      case 'fail':
      case 'failed':
      case 'error': return 'text-red-600';
      case 'inprocess': return 'text-yellow-600';
      case 'queued': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const handlePointClick = (event: any, elements: any[]) => {
    if (elements.length > 0 && elements[0] && typeof elements[0].dataIndex !== 'undefined') {
      const dataIndex = elements[0].dataIndex;
      const clickedJob = (data?.scatterData || [])[dataIndex];
      if (clickedJob) {
        setSelectedJob(clickedJob);
        setIsJobDetailsOpen(true);
      }
    }
  };

  const handleExportErrors = async () => {
    if (!data) return;

    try {
      // Build query parameters from current filters
      const params = new URLSearchParams();
      
      const fromDate = safeGetDateFromRange(dateRange, 'from');
      const toDate = safeGetDateFromRange(dateRange, 'to');
      
      if (fromDate) {
        params.append('date_start', fromDate.toISOString());
      }
      if (toDate) {
        params.append('date_end', toDate.toISOString());
      }
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      // Add format parameter (CSV by default)
      params.append('format', 'csv');
      
      const result = await safeFetch(`/api/upload-queue/error-analysis/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeoutMs: 15000
      });
      
      if (!result.ok) {
        console.warn('Skipping failed endpoint /api/upload-queue/error-analysis/export:', result.error || result.status);
        throw new Error(`Export failed: ${result.error}`);
      }
      
      const blob = new Blob([result.data as BlobPart], { type: 'text/csv' });
      
      if (blob.size === 0) {
        throw new Error('Export returned empty file');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `error-analysis-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting error analysis:', error);
      
             // Fallback to client-side export
       try {
         const exportData: Array<{
           'No.': number | string;
           'Error Reason': string;
           'Error Category': string;
           'Count': number;
           'Percentage': string;
           'Severity': 'high' | 'medium' | 'low';
           'Total Jobs': number;
           'Export Date': string;
         }> = data.stats.errorsByReason.map((item, index) => ({
           'No.': index + 1,
           'Error Reason': item.reason,
           'Error Category': getErrorCategory(item.reason),
           'Count': item.count,
           'Percentage': `${((item.count / data.stats.totalJobs) * 100).toFixed(1)}%`,
           'Severity': getErrorSeverity(item.count, data.stats.totalJobs),
           'Total Jobs': data.stats.totalJobs,
           'Export Date': new Date().toISOString().split('T')[0]
         }));

        const totalErrors = data.stats.errorsByReason.reduce((sum, item) => sum + item.count, 0);
        const errorRate = ((totalErrors / data.stats.totalJobs) * 100).toFixed(1);
        
                 exportData.push({
           'No.': '',
           'Error Reason': 'SUMMARY',
           'Error Category': '',
           'Count': totalErrors,
           'Percentage': `${errorRate}%`,
           'Severity': totalErrors > 0 ? 'high' : 'low',
           'Total Jobs': data.stats.totalJobs,
           'Export Date': new Date().toISOString().split('T')[0]
         });

        const headers = Object.keys(exportData[0]);
        const csvContent = [
          headers.join(','),
          ...exportData.map(row => 
            headers.map(header => {
              const value = row[header as keyof typeof row];
              const escapedValue = String(value).replace(/"/g, '""');
              return `"${escapedValue}"`;
            }).join(',')
          )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-analysis-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (fallbackError) {
        console.error('Fallback export also failed:', fallbackError);
        // Final fallback to JSON
        const errors = data.stats.errorsByReason.map(item => ({
          'Error Reason': item.reason,
          'Count': item.count,
          'Percentage': `${((item.count / data.stats.totalJobs) * 100).toFixed(1)}%`
        }));

        const blob = new Blob([JSON.stringify(errors, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-analysis-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  };

  const handleViewErrorDetails = (reason: string) => {
    const errorItem = data?.stats.errorsByReason.find(item => item.reason === reason);
    if (errorItem) {
      setSelectedJob({
        x: '', // No process date for errors
        y: 0, // No duration for errors
        status: 'Error',
        fileName: '', // No file name for errors
        fileSize: 0,
        uploadDate: '', // No upload date for errors
        processDate: null,
        completedDate: null,
        error: errorItem.reason,
        errorDetails: '', // No specific error details for errors
        positionTitle: null,
        source: null,
        id: '' // No job ID for errors
      });
      setIsJobDetailsOpen(true);
    }
  };

  const handleExportSingleError = async (reason: string) => {
    if (!data) return;

    try {
      // Build query parameters from current filters
      const params = new URLSearchParams();
      
      const fromDate = safeGetDateFromRange(dateRange, 'from');
      const toDate = safeGetDateFromRange(dateRange, 'to');
      
      if (fromDate) {
        params.append('date_start', fromDate.toISOString());
      }
      if (toDate) {
        params.append('date_end', toDate.toISOString());
      }
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      // Add error filter
      params.append('error_reason', encodeURIComponent(reason));
      params.append('format', 'csv');
      
      const result = await safeFetch(`/api/upload-queue/error-analysis/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeoutMs: 15000
      });
      
      if (!result.ok) {
        console.warn('Skipping failed endpoint /api/upload-queue/error-analysis/export (single):', result.error || result.status);
        throw new Error(`Export failed: ${result.error}`);
      }
      
      const blob = new Blob([result.data as BlobPart], { type: 'text/csv' });
      
      if (blob.size === 0) {
        throw new Error('Export returned empty file');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `error-${reason.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting single error:', error);
      
      // Fallback to client-side export for this specific error
      const errorItem = data.stats.errorsByReason.find(item => item.reason === reason);
      if (errorItem) {
        const exportData = [{
          'Error Reason': errorItem.reason,
          'Error Category': getErrorCategory(errorItem.reason),
          'Count': errorItem.count,
          'Percentage': `${((errorItem.count / data.stats.totalJobs) * 100).toFixed(1)}%`,
          'Severity': getErrorSeverity(errorItem.count, data.stats.totalJobs),
          'Total Jobs': data.stats.totalJobs,
          'Export Date': new Date().toISOString().split('T')[0]
        }];

        const headers = Object.keys(exportData[0]);
        const csvContent = [
          headers.join(','),
          ...exportData.map(row => 
            headers.map(header => {
              const value = row[header as keyof typeof row];
              const escapedValue = String(value).replace(/"/g, '""');
              return `"${escapedValue}"`;
            }).join(',')
          )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-${reason.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  };

  const getErrorSeverity = (count: number, totalJobs: number): 'high' | 'medium' | 'low' => {
    const errorRate = (count / totalJobs) * 100;
    if (errorRate > 10) return 'high';
    if (errorRate > 2) return 'medium';
    return 'low';
  };

  const getErrorCategory = (reason: string) => {
    if (reason.includes('timeout')) return 'Timeout Error';
    if (reason.includes('connection')) return 'Network Error';
    if (reason.includes('invalid')) return 'Invalid Data Error';
    if (reason.includes('parsing')) return 'Parsing Error';
    if (reason.includes('file')) return 'File Processing Error';
    if (reason.includes('api')) return 'API Error';
    if (reason.includes('database')) return 'Database Error';
    return 'Unknown Error';
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
        {(statusFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
            }}
            className="text-gray-600 hover:text-gray-800 h-7 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear Status Filter
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
                    {(() => {
                      const fromDate = safeGetDateFromRange(dateRange, 'from');
                      const toDate = safeGetDateFromRange(dateRange, 'to');
                      
                      if (fromDate && toDate) {
                        return (
                          <>
                            {format(fromDate, "MMM dd, yyyy")} - {format(toDate, "MMM dd, yyyy")}
                          </>
                        );
                      } else if (fromDate) {
                        return format(fromDate, "MMM dd, yyyy");
                      } else {
                        return <span>Last 30 days</span>;
                      }
                    })()}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
                  setDateRange({ from: thirtyDaysAgo, to: now });
                }}
                className="px-2 h-8"
                title="Reset to last 30 days"
              >
                30d
              </Button>
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
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="group relative overflow-hidden border-2 border-gray-200 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/50 dark:to-gray-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Total Jobs
              </CardTitle>
              <p className="text-xs text-muted-foreground/70">All processing jobs</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/50 dark:to-gray-900/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
              <Database className="h-6 w-6 text-gray-500 dark:text-gray-400 group-hover:drop-shadow-sm" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">{data!.stats.totalJobs}</div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-2 border-blue-200 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Avg Duration
              </CardTitle>
              <p className="text-xs text-muted-foreground/70">Average processing time</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
              <Clock className="h-6 w-6 text-blue-500 dark:text-blue-400 group-hover:drop-shadow-sm" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">{data!.stats.avgDuration.toFixed(1)}m</div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-2 border-emerald-200 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Completed Jobs
              </CardTitle>
              <p className="text-xs text-muted-foreground/70">Successfully processed</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
              <TrendingUp className="h-6 w-6 text-emerald-500 dark:text-emerald-400 group-hover:drop-shadow-sm" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-emerald-800 dark:text-emerald-200">
              {data!.stats.jobsByType.find(j => j.type === 'completed')?.count || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-2 border-red-200 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Failed Jobs
              </CardTitle>
              <p className="text-xs text-muted-foreground/70">Processing errors</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
              <AlertTriangle className="h-6 w-6 text-red-500 dark:text-red-400 group-hover:drop-shadow-sm" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-red-800 dark:text-red-200">
              {data!.stats.jobsByType.find(j => j.type === 'failed')?.count || 0}
            </div>
          </CardContent>
        </Card>
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
                Scatter plot showing the relationship between process date/time and processing duration. Each point represents a job, with x-axis showing when processing started and y-axis showing how long it took to complete.
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
              ) : !data || data.scatterData.length === 0 ? (
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
                          data: (data?.scatterData || []).map(item => ({
                            x: new Date(item.x),
                            y: item.y
                          })),
                          backgroundColor: (data?.scatterData || []).map(item => {
                            switch (item.status.toLowerCase()) {
                              case 'success': return 'rgba(34, 197, 94, 0.8)';
                              case 'failed': return 'rgba(239, 68, 68, 0.8)';
                              case 'inprocess': return 'rgba(234, 179, 8, 0.8)';
                              case 'queued': return 'rgba(59, 130, 246, 0.8)';
                              default: return 'rgba(107, 114, 128, 0.8)';
                            }
                          }),
                          borderColor: (data?.scatterData || []).map(item => {
                            switch (item.status.toLowerCase()) {
                              case 'success': return 'rgba(34, 197, 94, 1)';
                              case 'failed': return 'rgba(239, 68, 68, 1)';
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
                              if (!context || !context[0] || typeof context[0].dataIndex === 'undefined') {
                                return '';
                              }
                              const dataIndex = context[0].dataIndex;
                              const item = (data?.scatterData || [])[dataIndex];
                              if (!item) return '';
                              const date = new Date(item.x);
                              return `Date & Time: ${date.toLocaleString()}`;
                            },
                            label: function(context: any) {
                              if (!context || !context[0] || typeof context[0].dataIndex === 'undefined') {
                                return '';
                              }
                              const dataIndex = context[0].dataIndex;
                              const item = (data?.scatterData || [])[dataIndex];
                              if (!item) return '';
                              return [
                                `Duration: ${context[0].parsed.y.toFixed(2)} minutes`,
                                `Status: ${item.status}`,
                                `File: ${item.fileName}`
                              ];
                            }
                          }
                        },
                        ...(isDataLabelsAvailable() ? {
                          datalabels: {
                            display: false
                          }
                        } : {})
                      },
                      scales: {
                        x: {
                          type: 'time',
                          time: {
                            displayFormats: {
                              millisecond: 'HH:mm:ss.SSS',
                              second: 'HH:mm:ss',
                              minute: 'MMM dd, HH:mm',
                              hour: 'MMM dd, HH:mm',
                              day: 'MMM dd, yyyy',
                              week: 'MMM dd, yyyy',
                              month: 'MMM yyyy',
                              quarter: 'MMM yyyy',
                              year: 'yyyy'
                            },
                            tooltipFormat: 'MMM dd, yyyy HH:mm'
                          },
                          title: {
                            display: true,
                            text: 'Process Date & Time'
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Error Analysis</CardTitle>
                  <CardDescription>Breakdown of errors by reason with detailed information</CardDescription>
                </div>
                {data!.stats.errorsByReason.length > 0 && (
                  <Button 
                    onClick={handleExportErrors} 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {data!.stats.errorsByReason.length > 0 ? (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-700 dark:text-red-300">Total Errors</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {data!.stats.errorsByReason.reduce((sum, item) => sum + item.count, 0)}
                      </p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-orange-600" />
                        <span className="font-semibold text-orange-700 dark:text-orange-300">Error Types</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {data!.stats.errorsByReason.length}
                      </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-blue-700 dark:text-blue-300">Error Rate</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {((data!.stats.errorsByReason.reduce((sum, item) => sum + item.count, 0) / data!.stats.totalJobs) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Error Details Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Error Reason</TableHead>
                          <TableHead className="text-center">Count</TableHead>
                          <TableHead className="text-center">Percentage</TableHead>
                          <TableHead className="text-center">Severity</TableHead>
                          <TableHead className="text-center">Category</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data!.stats.errorsByReason.map((item, index) => {
                          const percentage = ((item.count / data!.stats.totalJobs) * 100).toFixed(1);
                          const severity = getErrorSeverity(item.count, data!.stats.totalJobs);
                          const category = getErrorCategory(item.reason);
                          
                          return (
                            <TableRow key={item.reason} className="hover:bg-muted/50">
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell>
                                <div className="max-w-md">
                                  <p className="font-medium truncate" title={item.reason}>
                                    {item.reason}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {item.reason.length > 80 ? `${item.reason.substring(0, 80)}...` : item.reason}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="destructive" className="text-sm">
                                  {item.count}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="text-sm font-medium">{percentage}%</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge 
                                  variant={severity === 'high' ? 'destructive' : severity === 'medium' ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {severity}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-xs">
                                  {category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewErrorDetails(item.reason)}
                                    className="h-8 w-8 p-0"
                                    title="View Details"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleExportSingleError(item.reason)}
                                    className="h-8 w-8 p-0"
                                    title="Export This Error"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
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
