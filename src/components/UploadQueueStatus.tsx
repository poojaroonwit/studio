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
import { Clock, Loader2, CheckCircle, XCircle, Search, Filter, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { useUnifiedRealtime } from '@/hooks/use-unified-realtime';

interface QueueItem {
  id: string;
  file_name: string;
  status: 'queued' | 'inprocess' | 'success' | 'error' | 'fail';
  upload_date: string;
  process_date?: string;
  completed_date?: string;
  error?: string;
  error_details?: string;
  progress?: number;
  total_candidates?: number;
  processed_candidates?: number;
  user_id: string;
  user_email?: string;
}

interface QueueResponse {
  items: QueueItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function UploadQueueStatus() {
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

  // Centralized realtime hook
  const { isConnected: isRealtimeActive, lastUpdate: realtimeLastUpdate } = useUnifiedRealtime({
    onUploadQueueUpdate: (queueData: any) => {
      // Refresh the queue data when we receive realtime updates
      fetchQueue(page, pageSize);
      setLastUpdate(new Date());
    }
  });

  const fetchQueue = useCallback(async (currentPage = 1, currentPageSize = 10) => {
    setLoading(true);
    setErrorMessage(null);
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: currentPageSize.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`/api/upload-queue?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: QueueResponse = await response.json();
      setQueueData(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch queue:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchQueue(page, pageSize);
  }, [fetchQueue, page, pageSize]);

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
            <div className={`w-2 h-2 rounded-full ${isRealtimeActive ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{isRealtimeActive ? 'Live' : 'Offline'}</span>
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
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="fail">Failed</SelectItem>
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
            {isRealtimeActive && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Live Updates</span>
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading queue...</span>
            </div>
          ) : queueData?.items.length === 0 ? (
            <div className="text-center py-8">
              <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No queue items found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queueData?.items.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
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
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
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
          {queueData && queueData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Page {page} of {queueData.totalPages}
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
                  onClick={() => setPage(Math.min(queueData.totalPages, page + 1))}
                  disabled={page === queueData.totalPages}
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
        <DialogContent className="max-w-2xl">
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
                      {selectedItem.status}
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
                    <details className="mt-2">
                      <summary className="text-sm text-red-600 cursor-pointer">View Error Details</summary>
                      <pre className="text-xs text-red-700 mt-2 p-2 bg-red-50 rounded overflow-auto">
                        {selectedItem.error_details}
                      </pre>
                    </details>
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