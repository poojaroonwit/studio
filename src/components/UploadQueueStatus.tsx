"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Clock, Loader2, CheckCircle, XCircle, Search, Filter, RefreshCw, AlertCircle, Info, Circle } from 'lucide-react';
import { useSharedSSE } from '@/hooks/use-shared-sse';
import { safeFetch } from '@/lib/safe-fetch';
import { SkeletonCard } from '@/components/ui/loading-overlay';

interface QueueItem {
  id: string;
  file_name: string;
  file_size: number;
  status: 'queued' | 'inprocess' | 'success' | 'failed';
  error?: string;
  error_details?: string;
  source?: string;
  source_id?: string;
  sub_source?: string;
  source_name?: string;
  upload_date: string;
  completed_date?: string;
  upload_id?: string;
  created_by?: string;
  updated_at: string;
  file_path: string;
  webhook_payload?: any;
  position_id?: string;
  position_title?: string;
  process_date?: string;
  url?: string;
  progress?: number;
  total_candidates?: number;
  processed_candidates?: number;
  user_id: string;
  user_email?: string;
}

interface QueueResponse {
  data: QueueItem[];
  total: number;
  summary?: {
    total: number;
    queued: number;
    inprocess: number;
    success: number;
    error: number;
  };
}

export function UploadQueueStatus() {
  const [queueData, setQueueData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Use shared SSE hook for realtime updates
  const { isConnected: realtimeConnected, subscribeToEvents } = useSharedSSE();

  const fetchQueue = useCallback(async (currentPage = 1, currentPageSize = 10) => {
    setLoading(true);
    setErrorMessage(null);
    
    const params = new URLSearchParams({
      page: currentPage.toString(),
      pageSize: currentPageSize.toString(),
      ...(searchTerm && { search: searchTerm }),
      ...(statusFilter !== 'all' && { status: statusFilter })
    });

    const result = await safeFetch<QueueResponse>(`/api/upload-queue?${params}`, { timeoutMs: 12000 });

    if (result.ok && result.data) {
      setQueueData(result.data);
      setLastUpdate(new Date());
    } else {
      console.warn('Skipping failed endpoint /api/upload-queue:', result.error || result.status);
      setErrorMessage('Some data failed to load. Showing last known values.');
    }

    setLoading(false);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchQueue(page, pageSize);
  }, [fetchQueue, page, pageSize]);

  // Subscribe to SSE events for realtime updates
  useEffect(() => {
    let mounted = true;
    let refreshTimeout: NodeJS.Timeout;
    let lastUpdateTime = 0;
    const MIN_UPDATE_INTERVAL = 500; // Minimum 500ms between updates
    
    // Subscribe to shared SSE events
    const unsubscribe = subscribeToEvents((event) => {
      if (!mounted) return;
      
      if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
        // console.log('[UploadQueueStatus] SSE event received:', event);
      }
      
      // Handle upload queue updates
      if (event.type === 'upload_queue_update' || event.type === 'queue') {
        const now = Date.now();
        
        // Rate limit updates to prevent excessive reloading
        if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) {
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
            // console.log('[UploadQueueStatus] Update rate limited, skipping');
          }
          return;
        }
        
        if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
          // console.log('[UploadQueueStatus] Processing upload queue update event');
        }
        
        // Clear existing timeout and set new one to prevent rapid successive calls
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
        
        refreshTimeout = setTimeout(() => {
          if (mounted) {
            // Check if SSE event contains actual queue data
            if (event.data?.data && Array.isArray(event.data.data)) {
              // Update queue data directly from SSE (immediate update)
              // console.log('[UploadQueueStatus] Updating queue data from SSE event');
              setQueueData({
                data: event.data.data,
                total: event.data.total || 0,
                summary: event.data.summary || { queued: 0, inprocess: 0, success: 0, error: 0 }
              });
              setLastUpdate(new Date());
              lastUpdateTime = now;
            } else {
              // Fallback: fetch queue data if SSE doesn't contain data
              fetchQueue(page, pageSize);
              setLastUpdate(new Date());
              lastUpdateTime = now;
            }
          }
        }, 100); // Small delay to batch rapid updates
      }
    });

    return () => {
      mounted = false;
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      unsubscribe();
    };
  }, [subscribeToEvents, fetchQueue, page, pageSize]);

  // Listen for custom refresh events (fallback for upload completion)
  useEffect(() => {
    const handleRefreshEvent = () => {
      // console.log('[UploadQueueStatus] Received refreshCandidateQueue event, refreshing queue');
      fetchQueue(page, pageSize);
      setLastUpdate(new Date());
    };

    window.addEventListener('refreshCandidateQueue', handleRefreshEvent);
    
    return () => {
      window.removeEventListener('refreshCandidateQueue', handleRefreshEvent);
    };
  }, [fetchQueue, page, pageSize]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued': return <Clock className="h-5 w-5 text-blue-500 dark:text-blue-400" />;
      case 'inprocess': return <Loader2 className="h-5 w-5 text-yellow-500 dark:text-yellow-400 animate-spin" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />;
      case 'failed':
      case 'fail':
      case 'error': return <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />;
      default: return <Circle className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'queued': return 'In Queue';
      case 'inprocess': return 'Processing';
      case 'success': return 'Success';
      case 'failed':
      case 'fail':
      case 'error': return 'Failed';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'inprocess': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
      case 'success': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'failed':
      case 'fail':
      case 'error': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleItemClick = (item: QueueItem) => {
    setSelectedItem(item);
    setShowDetails(true);
  };

  const handleSearch = () => {
    setPage(1);
    fetchQueue(1, pageSize);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    fetchQueue(1, pageSize);
  };

  const handleRefresh = () => {
    fetchQueue(page, pageSize);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Upload Queue Status</h2>
          <p className="text-muted-foreground">
            Monitor the status of your CV uploads in real-time
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>{realtimeConnected ? 'Live' : 'Offline'}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Files</Label>
              <div className="flex space-x-2">
                <Input
                  id="search"
                  placeholder="Search by filename..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status Filter</Label>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="inprocess">Processing</SelectItem>
                  <SelectItem value="success">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pageSize">Items per Page</Label>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Queue Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Queue Items</CardTitle>
              <CardDescription>
                {queueData ? `${queueData.total} total items` : 'Loading...'}
                {lastUpdate && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Last updated: {formatDate(lastUpdate.toISOString())}
                  </span>
                )}
              </CardDescription>
            </div>
            {/* {realtimeConnected && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Live Updates</span>
              </Badge>
            )} */}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4 stagger-fade-in">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={`skeleton-${i}`} />
              ))}
            </div>
          ) : !queueData?.data || queueData.data?.length === 0 ? (
            <div className="text-center py-8">
              <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No queue items found</p>
            </div>
          ) : (
            <div className="space-y-4 stagger-fade-in">
              {queueData?.data.map((item, index) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors content-fade-in"
                  style={{ animationDelay: `${index * 20}ms` }}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(item.status)}
                      <div>
                        <h3 className="font-medium">{item.file_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Uploaded: {formatDate(item.upload_date)}
                        </p>
                        {(item.source_name || item.sub_source) && (
                          <p className="text-xs text-muted-foreground">
                            Source: {item.source_name || 'Unknown'}
                            {item.sub_source && ` - ${item.sub_source}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(item.status)}>
                        {getStatusDisplayText(item.status)}
                      </Badge>
                      {item.progress !== undefined && (
                        <span className="text-sm text-muted-foreground">
                          {item.progress}%
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {item.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <strong>Error:</strong> {item.error}
                    </div>
                  )}
                  
                  {item.processed_candidates !== undefined && item.total_candidates !== undefined && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Processed: {item.processed_candidates} / {item.total_candidates} candidates
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {queueData && (() => {
            const totalPages = Math.ceil(queueData.total / pageSize);
            return totalPages > 1;
          })() && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(queueData.total / pageSize)}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(Math.ceil(queueData.total / pageSize), page + 1))}
                  disabled={page === Math.ceil(queueData.total / pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl" dialogId="upload-queue-details-modal">
          <DialogHeader>
            <DialogTitle>Queue Item Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected queue item
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">File Name</Label>
                  <p className="text-sm">{selectedItem.file_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedItem.status)}
                    <Badge className={getStatusColor(selectedItem.status)}>
                      {getStatusDisplayText(selectedItem.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Upload Date</Label>
                  <p className="text-sm">{formatDate(selectedItem.upload_date)}</p>
                </div>
                {selectedItem.process_date && (
                  <div>
                    <Label className="text-sm font-medium">Process Date</Label>
                    <p className="text-sm">{formatDate(selectedItem.process_date)}</p>
                  </div>
                )}
                {selectedItem.completed_date && (
                  <div>
                    <Label className="text-sm font-medium">Completed Date</Label>
                    <p className="text-sm">{formatDate(selectedItem.completed_date)}</p>
                  </div>
                )}
                {selectedItem.user_email && (
                  <div>
                    <Label className="text-sm font-medium">Uploaded By</Label>
                    <p className="text-sm">{selectedItem.user_email}</p>
                  </div>
                )}
              </div>
              
              {selectedItem.progress !== undefined && (
                <div>
                  <Label className="text-sm font-medium">Progress</Label>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${selectedItem.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedItem.progress}% complete
                  </p>
                </div>
              )}
              
              {selectedItem.processed_candidates !== undefined && selectedItem.total_candidates !== undefined && (
                <div>
                  <Label className="text-sm font-medium">Candidates Processed</Label>
                  <p className="text-sm">
                    {selectedItem.processed_candidates} of {selectedItem.total_candidates} candidates
                  </p>
                </div>
              )}
              
              {selectedItem.error && (
                <div>
                  <Label className="text-sm font-medium text-red-700">Error</Label>
                  <p className="text-sm text-red-700 mt-1">{selectedItem.error}</p>
                  {selectedItem.error_details && (
                    <div className="mt-2">
                      <Label className="text-sm font-medium text-red-700">Error Details</Label>
                      <pre className="text-xs text-red-700 mt-1 p-2 bg-red-50 rounded overflow-auto">
                        {selectedItem.error_details}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 