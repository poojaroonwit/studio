"use client";

import React from 'react';
import { UploadQueueStatus } from '@/components/UploadQueueStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function TestRealtimePage() {
  const [testQueue, setTestQueue] = React.useState([
    { id: '1', file_name: 'test1.pdf', status: 'queued', upload_date: new Date().toISOString() },
    { id: '2', file_name: 'test2.pdf', status: 'inprocess', upload_date: new Date().toISOString() },
    { id: '3', file_name: 'test3.pdf', status: 'success', upload_date: new Date().toISOString() },
    { id: '4', file_name: 'test4.pdf', status: 'error', upload_date: new Date().toISOString() },
  ]);

  const [isRealtimeActive, setIsRealtimeActive] = React.useState(false);
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);

  // Simulate real-time updates
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTestQueue(prev => prev.map(item => {
        if (item.status === 'queued') {
          return { ...item, status: 'inprocess' };
        } else if (item.status === 'inprocess') {
          return { ...item, status: Math.random() > 0.3 ? 'success' : 'error' };
        }
        return item;
      }));
      setLastUpdate(new Date());
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Simulate SSE connection
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsRealtimeActive(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'inprocess': return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'inprocess': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const addTestItem = () => {
    const newItem = {
      id: Date.now().toString(),
      file_name: `test${Date.now()}.pdf`,
      status: 'queued' as const,
      upload_date: new Date().toISOString()
    };
    setTestQueue(prev => [newItem, ...prev]);
  };

  const resetQueue = () => {
    setTestQueue([
      { id: '1', file_name: 'test1.pdf', status: 'queued', upload_date: new Date().toISOString() },
      { id: '2', file_name: 'test2.pdf', status: 'inprocess', upload_date: new Date().toISOString() },
      { id: '3', file_name: 'test3.pdf', status: 'success', upload_date: new Date().toISOString() },
      { id: '4', file_name: 'test4.pdf', status: 'error', upload_date: new Date().toISOString() },
    ]);
  };

  const statusCounts = {
    total: testQueue.length,
    queued: testQueue.filter(item => item.status === 'queued').length,
    inprocess: testQueue.filter(item => item.status === 'inprocess').length,
    success: testQueue.filter(item => item.status === 'success').length,
    error: testQueue.filter(item => item.status === 'error').length,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Real-time Upload Queue Test</h1>
        <div className="flex items-center gap-4">
          <Button onClick={addTestItem} variant="outline">
            Add Test Item
          </Button>
          <Button onClick={resetQueue} variant="outline">
            Reset Queue
          </Button>
        </div>
      </div>

      {/* Real-time Status Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Real-time Status
            <div className="flex items-center gap-2">
              {isRealtimeActive ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm font-medium">Live Updates Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-sm font-medium">Connecting...</span>
                </div>
              )}
              {lastUpdate && (
                <span className="text-xs text-muted-foreground">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page demonstrates the real-time functionality. The queue items will automatically update every 3 seconds,
            simulating the behavior of the actual upload queue system.
          </p>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{statusCounts.total}</p>
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
                <p className="text-2xl font-bold text-blue-600">{statusCounts.queued}</p>
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
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.inprocess}</p>
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
                <p className="text-2xl font-bold text-green-600">{statusCounts.success}</p>
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
                <p className="text-2xl font-bold text-red-600">{statusCounts.error}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Items */}
      <Card>
        <CardHeader>
          <CardTitle>Test Queue Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {testQueue.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <p className="font-medium">{item.file_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.upload_date).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge className={getStatusColor(item.status)}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actual Upload Queue Status Component */}
      <Card>
        <CardHeader>
          <CardTitle>Actual Upload Queue Status Component</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadQueueStatus />
        </CardContent>
      </Card>
    </div>
  );
}
