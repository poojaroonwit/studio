"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface QueueItem {
  id: string;
  file_name: string;
  status: string;
  upload_date: string;
  completed_date?: string;
  error?: string;
  error_details?: string;
  webhook_payload?: any;
  position_title?: string;
}

interface QueueStatus {
  total: number;
  queued: number;
  inprocess: number;
  success: number;
  error: number;
}

export function UploadQueueStatus() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    total: 0,
    queued: 0,
    inprocess: 0,
    success: 0,
    error: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchQueue = async (currentPage = page, currentPageSize = pageSize) => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * currentPageSize;
      const response = await fetch(`/api/upload-queue?limit=${currentPageSize}&offset=${offset}`);
      if (response.ok) {
        const data = await response.json();
        setQueueItems(data.data || []);
        setTotal(data.total || 0);
        setQueueStatus({
          total: data.summary?.total || 0,
          queued: data.summary?.queued || 0,
          inprocess: data.summary?.inprocess || 0,
          success: data.summary?.success || 0,
          error: data.summary?.error || 0
        });
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    
    // Set up real-time updates
    const eventSource = new EventSource('/api/upload-queue/sse');
    
    eventSource.onopen = () => {
      setIsRealtimeActive(true);
      // console.log('SSE connection established');
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'queue') {
          // For real-time updates, we'll refresh the current page
          fetchQueue(page, pageSize);
          setIsRealtimeActive(true);
        }
      } catch (error) {
        console.error('Failed to parse SSE data:', error);
      }
    };
    
    eventSource.onerror = () => {
      setIsRealtimeActive(false);
      // console.log('SSE connection error, falling back to polling');
    };

    return () => eventSource.close();
  }, [page, pageSize]); // Add pagination dependencies

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

  return (
    <div className="space-y-4">
      {/* Real-time Status Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Upload Queue Status</h3>
        <div className="flex items-center gap-2">
       
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

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

      {/* Recent Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Queue Items
            <Button variant="outline" size="sm" onClick={() => fetchQueue()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {queueItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(item.status)}
                  <span className="font-medium">{item.file_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(item.status)}>
                    {item.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.upload_date).toLocaleDateString()}
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
          
          {/* Pagination Controls */}
          {total > pageSize && (
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} of {total}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1 || loading}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {Math.ceil(total / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(prev => Math.min(Math.ceil(total / pageSize), prev + 1))}
                  disabled={page >= Math.ceil(total / pageSize) || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Queue Item Details</DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">File Information</h4>
                <p><strong>Name:</strong> {selectedItem.file_name}</p>
                <p><strong>Status:</strong> 
                  <Badge className={`ml-2 ${getStatusColor(selectedItem.status)}`}>
                    {selectedItem.status}
                  </Badge>
                </p>
                <p><strong>Upload Date:</strong> {formatDate(selectedItem.upload_date)}</p>
                {selectedItem.completed_date && (
                  <p><strong>Completed Date:</strong> {formatDate(selectedItem.completed_date)}</p>
                )}
                {selectedItem.position_title && (
                  <p><strong>Position:</strong> {selectedItem.position_title}</p>
                )}
              </div>

              {selectedItem.error && (
                <div>
                  <h4 className="font-medium text-red-600">Error</h4>
                  <p className="text-sm text-red-600">{selectedItem.error}</p>
                </div>
              )}

              {selectedItem.webhook_payload && (
                <div>
                  <h4 className="font-medium">Webhook Response</h4>
                  <ScrollArea className="h-32 border rounded p-2">
                    <pre className="text-xs">
                      {JSON.stringify(selectedItem.webhook_payload, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 