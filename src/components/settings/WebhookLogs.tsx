'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, Eye, Calendar, Filter, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExpandablePayload } from '@/components/ui/ExpandablePayload';

interface WebhookLog {
  id: string;
  event_type: string;
  payload: any;
  response_status: number | null;
  response_body: string | null;
  success: boolean;
  error_message: string | null;
  duration_ms: number;
  createdAt: string;
}

interface WebhookLogsProps {
  webhookId: string;
  webhookName: string;
}

export default function WebhookLogs({ webhookId, webhookName }: WebhookLogsProps) {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    event_type: '',
    success: '',
    start_date: '',
    end_date: ''
  });
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const { error: showError } = useToast();

  useEffect(() => {
    if (webhookId && webhookName) {
      fetchLogs();
    }
  }, [webhookId, webhookName, pagination.page, pagination.limit, filters]);

  const fetchLogs = async () => {
    if (!webhookId) {
      setError('Webhook ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.event_type && { event_type: filters.event_type }),
        ...(filters.success && { success: filters.success }),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date })
      });

      const response = await fetch(`/api/settings/webhooks/${webhookId}/logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        // Ensure logs are properly sanitized
        const sanitizedLogs = data.logs?.map((log: any) => ({
          id: log.id || '',
          event_type: log.event_type || '',
          payload: log.payload || {},
          response_status: log.response_status || null,
          response_body: log.response_body || null,
          success: Boolean(log.success),
          error_message: log.error_message || null,
          duration_ms: log.duration_ms || 0,
          createdAt: log.createdAt || new Date().toISOString()
        })) || [];
        
        setLogs(sanitizedLogs);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0
        }));
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Failed to fetch webhook logs');
        showError('Failed to fetch webhook logs');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch webhook logs';
      setError(errorMessage);
      showError('Failed to fetch webhook logs');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      event_type: '',
      success: '',
      start_date: '',
      end_date: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (success: boolean, status: number | null) => {
    if (success) return 'bg-green-100 text-green-800';
    if (status && status >= 400 && status < 500) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusText = (success: boolean, status: number | null) => {
    if (success) return 'Success';
    if (status && status >= 400 && status < 500) return `Client Error (${status})`;
    return 'Failed';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Delivery Logs</h3>
          <p className="text-sm text-muted-foreground">
            View webhook delivery history for {webhookName}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type</Label>
              <Select
                value={filters.event_type || 'all'}
                onValueChange={(value) => handleFilterChange('event_type', value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  <SelectItem value="candidate.created">Candidate Created</SelectItem>
                  <SelectItem value="candidate.updated">Candidate Updated</SelectItem>
                  <SelectItem value="candidate.deleted">Candidate Deleted</SelectItem>
                  <SelectItem value="candidate.stage_changed">Stage Changed</SelectItem>
                  <SelectItem value="position.created">Position Created</SelectItem>
                  <SelectItem value="position.updated">Position Updated</SelectItem>
                  <SelectItem value="position.deleted">Position Deleted</SelectItem>
                  <SelectItem value="user.created">User Created</SelectItem>
                  <SelectItem value="user.updated">User Updated</SelectItem>
                  <SelectItem value="user.deleted">User Deleted</SelectItem>
                  <SelectItem value="resume.uploaded">Resume Uploaded</SelectItem>
                  <SelectItem value="resume.processed">Resume Processed</SelectItem>
                  <SelectItem value="comment.created">Comment Created</SelectItem>
                  <SelectItem value="comment.updated">Comment Updated</SelectItem>
                  <SelectItem value="comment.deleted">Comment Deleted</SelectItem>
                  <SelectItem value="webhook.test">Webhook Test</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="success">Status</Label>
              <Select
                value={filters.success || 'all'}
                onValueChange={(value) => handleFilterChange('success', value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="true">Success</SelectItem>
                  <SelectItem value="false">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery History</CardTitle>
          <CardDescription>
            Showing {logs.length} of {pagination.total} logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="animate-spin h-6 w-6 mr-2" />
              Loading logs...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No logs found for the selected filters.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {log.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${getStatusColor(log.success, log.response_status)}`}>
                          {getStatusText(log.success, log.response_status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDuration(log.duration_ms)}
                      </TableCell>
                      <TableCell>
                        {log.response_status ? (
                          <span className="text-sm font-mono">
                            {log.response_status}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Webhook Log Details</DialogTitle>
                              <DialogDescription>
                                Event: {log.event_type} • {formatDate(log.createdAt)}
                              </DialogDescription>
                            </DialogHeader>
                            
                            <Tabs defaultValue="payload" className="w-full">
                              <TabsList>
                                <TabsTrigger value="payload">Payload</TabsTrigger>
                                <TabsTrigger value="response">Response</TabsTrigger>
                                <TabsTrigger value="details">Details</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="payload" className="space-y-4">
                                <ExpandablePayload
                                  data={log.payload}
                                  title="Request Payload"
                                  maxHeight="max-h-60"
                                />
                              </TabsContent>
                              
                              <TabsContent value="response" className="space-y-4">
                                <div>
                                  <Label className="text-sm font-medium">Response Status</Label>
                                  <div className="mt-2 p-2 bg-muted rounded-md">
                                    {log.response_status || 'No response'}
                                  </div>
                                </div>
                                
                                {log.response_body && (
                                  <ExpandablePayload
                                    data={log.response_body}
                                    title="Response Body"
                                    maxHeight="max-h-60"
                                  />
                                )}
                                
                                {log.error_message && (
                                  <div>
                                    <Label className="text-sm font-medium">Error Message</Label>
                                    <div className="mt-2 p-2 bg-red-50 text-red-700 rounded-md">
                                      {log.error_message}
                                    </div>
                                  </div>
                                )}
                              </TabsContent>
                              
                              <TabsContent value="details" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Event Type</Label>
                                    <div className="mt-1 text-sm">{log.event_type}</div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Success</Label>
                                    <div className="mt-1 text-sm">{log.success ? 'Yes' : 'No'}</div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Duration</Label>
                                    <div className="mt-1 text-sm">{formatDuration(log.duration_ms)}</div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Response Status</Label>
                                    <div className="mt-1 text-sm">{log.response_status || 'N/A'}</div>
                                  </div>
                                </div>
                                
                                <Separator />
                                
                                <div>
                                  <Label className="text-sm font-medium">Timestamp</Label>
                                  <div className="mt-1 text-sm">{formatDate(log.createdAt)}</div>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 