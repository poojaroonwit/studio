"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Clock, Play, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface QueueItem {
  id: string;
  file_name: string;
  status: 'queued' | 'inprocess' | 'success' | 'error' | 'fail';
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

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/upload-queue?limit=50');
      if (response.ok) {
        const data = await response.json();
        setQueueItems(data.data || []);
        setQueueStatus({
          total: data.summary?.total || 0,
          queued: data.summary?.queued || 0,
          inprocess: data.summary?.inprocess || 0,
          success: data.summary?.success || 0,
          error: data.summary?.error || 0
        });
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
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'queue_update') {
        fetchQueue();
      }
    };

    return () => eventSource.close();
  }, []);

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
      case 'queued': return 'bg-blue-100 text-blue-800';
      case 'inprocess': return 'bg-yellow-100 text-yellow-800';
      case 'success': return 'bg-green-100 text-green-800';
      case 'error':
      case 'fail': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
      {/* Queue Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{queueStatus.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Queued</p>
                <p className="text-2xl font-bold text-blue-600">{queueStatus.queued}</p>
              </div>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-yellow-600">{queueStatus.inprocess}</p>
              </div>
              <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success</p>
                <p className="text-2xl font-bold text-green-600">{queueStatus.success}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Errors</p>
                <p className="text-2xl font-bold text-red-600">{queueStatus.error}</p>
              </div>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Items List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Upload Queue</CardTitle>
            <Button onClick={fetchQueue} disabled={loading} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {queueItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No files in queue
                </div>
              ) : (
                queueItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(item.status)}
                      <div>
                        <p className="font-medium">{item.file_name}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(item.upload_date)}
                          {item.position_title && ` • ${item.position_title}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
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