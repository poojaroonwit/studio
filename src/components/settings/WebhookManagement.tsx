'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, Trash2, TestTube, ExternalLink, Copy, Check, History, Activity, CheckCircle, Clock, Send, MoreHorizontal, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  is_active: boolean;
  auth_type: 'none' | 'basic' | 'bearer' | 'header';
  auth_username?: string;
  auth_password?: string;
  auth_token?: string;
  auth_header_name?: string;
  auth_header_value?: string;
  headers: Record<string, string>;
  retry_count: number;
  timeout: number;
  created_at: string;
  updated_at: string;
}

interface WebhookFormData {
  name: string;
  url: string;
  events: string[];
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  is_active: boolean;
  auth_type: 'none' | 'basic' | 'bearer' | 'header';
  auth_username?: string;
  auth_password?: string;
  auth_token?: string;
  auth_header_name?: string;
  auth_header_value?: string;
  headers: Record<string, string>;
  retry_count: number;
  timeout: number;
}

export default function WebhookManagement() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [formData, setFormData] = useState<WebhookFormData>({
    name: '',
    url: '',
    events: [],
    method: 'POST',
    is_active: true,
    auth_type: 'none',
    headers: {},
    retry_count: 3,
    timeout: 30
  });
  const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string }>>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedWebhookForLogs, setSelectedWebhookForLogs] = useState<Webhook | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFilter, setLogsFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [logsSearch, setLogsSearch] = useState('');
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [webhookAnalytics, setWebhookAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedWebhookForTest, setSelectedWebhookForTest] = useState<Webhook | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testPayload, setTestPayload] = useState('{\n  "test": true,\n  "timestamp": "' + new Date().toISOString() + '"\n}');
  const [selectedWebhooks, setSelectedWebhooks] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const { error: showError, success: showSuccess } = useToast();

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/settings/webhooks');
      if (response.ok) {
        const data = await response.json();
        const sanitizedWebhooks = Array.isArray(data) ? data.map((webhook: any) => ({
          id: webhook.id || '',
          name: webhook.name || '',
          url: webhook.url || '',
          events: Array.isArray(webhook.events) ? webhook.events : [],
          method: webhook.method || 'POST',
          is_active: Boolean(webhook.is_active),
          auth_type: webhook.auth_type || 'none',
          auth_username: webhook.auth_username || undefined,
          auth_password: webhook.auth_password || undefined,
          auth_token: webhook.auth_token || undefined,
          auth_header_name: webhook.auth_header_name || undefined,
          auth_header_value: webhook.auth_header_value || undefined,
          headers: webhook.headers || {},
          retry_count: webhook.retry_count || 3,
          timeout: webhook.timeout || 30,
          created_at: webhook.created_at || new Date().toISOString(),
          updated_at: webhook.updated_at || new Date().toISOString()
        })) : [];
        setWebhooks(sanitizedWebhooks);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || 'Failed to fetch webhooks';
        setError(errorMessage);
        showError(errorMessage);
        setWebhooks([]);
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch webhooks';
      setError(errorMessage);
      showError('Failed to fetch webhooks');
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const headers = { ...formData.headers };
      customHeaders.forEach(header => {
        if (header.key && header.value) {
          headers[header.key] = header.value;
        }
      });

      const payload = {
        ...formData,
        headers
      };

      const url = editingWebhook 
        ? `/api/settings/webhooks/${editingWebhook.id}`
        : '/api/settings/webhooks';
      
      const method = editingWebhook ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showSuccess(editingWebhook ? 'Webhook updated successfully' : 'Webhook created successfully');
        setIsDialogOpen(false);
        resetForm();
        fetchWebhooks();
      } else {
        const error = await response.json();
        showError(error.message || 'Failed to save webhook');
      }
    } catch (error) {
      showError('Failed to save webhook');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/settings/webhooks/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showSuccess('Webhook deleted successfully');
        fetchWebhooks();
      } else {
        showError('Failed to delete webhook');
      }
    } catch (error) {
      showError('Failed to delete webhook');
    }
  };

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      method: webhook.method,
      is_active: webhook.is_active,
      auth_type: webhook.auth_type,
      auth_username: webhook.auth_username,
      auth_password: webhook.auth_password,
      auth_token: webhook.auth_token,
      auth_header_name: webhook.auth_header_name,
      auth_header_value: webhook.auth_header_value,
      headers: webhook.headers,
      retry_count: webhook.retry_count,
      timeout: webhook.timeout
    });
    
    const headerArray = Object.entries(webhook.headers).map(([key, value]) => ({ key, value }));
    setCustomHeaders(headerArray);
    
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      events: [],
      method: 'POST',
      is_active: true,
      auth_type: 'none',
      headers: {},
      retry_count: 3,
      timeout: 30
    });
    setCustomHeaders([]);
    setEditingWebhook(null);
  };

  const handleDialogOpen = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const addCustomHeader = () => {
    setCustomHeaders(prev => [...prev, { key: '', value: '' }]);
  };

  const removeCustomHeader = (index: number) => {
    setCustomHeaders(prev => prev.filter((_, i) => i !== index));
  };

  const updateCustomHeader = (index: number, field: 'key' | 'value', value: string) => {
    setCustomHeaders(prev => prev.map((header, i) => 
      i === index ? { ...header, [field]: value } : header
    ));
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const fetchWebhookLogs = async (webhookId: string, page: number = 1, filter: string = 'all', search: string = '') => {
    try {
      setLogsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        filter,
        search
      });
      
      const response = await fetch(`/api/settings/webhooks/${webhookId}/logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setWebhookLogs(data.logs || []);
        setLogsTotal(data.total || 0);
      } else {
        showError('Failed to fetch webhook logs');
      }
    } catch (error) {
      showError('Failed to fetch webhook logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleLogsDialogOpen = (webhook: Webhook | null) => {
    setSelectedWebhookForLogs(webhook);
    if (webhook) {
      setLogsPage(1);
      setLogsFilter('all');
      setLogsSearch('');
      fetchWebhookLogs(webhook.id, 1, 'all', '');
    }
  };

  const handleLogsFilterChange = (filter: 'all' | 'success' | 'failed') => {
    setLogsFilter(filter);
    setLogsPage(1);
    if (selectedWebhookForLogs) {
      fetchWebhookLogs(selectedWebhookForLogs.id, 1, filter, logsSearch);
    }
  };

  const handleLogsSearch = (search: string) => {
    setLogsSearch(search);
    setLogsPage(1);
    if (selectedWebhookForLogs) {
      fetchWebhookLogs(selectedWebhookForLogs.id, 1, logsFilter, search);
    }
  };

  const handleLogsPageChange = (page: number) => {
    setLogsPage(page);
    if (selectedWebhookForLogs) {
      fetchWebhookLogs(selectedWebhookForLogs.id, page, logsFilter, logsSearch);
    }
  };

  const exportLogs = async () => {
    if (!selectedWebhookForLogs) return;
    
    try {
      const params = new URLSearchParams({
        filter: logsFilter,
        search: logsSearch
      });
      
      const response = await fetch(`/api/settings/webhooks/${selectedWebhookForLogs.id}/logs/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `webhook-logs-${selectedWebhookForLogs.name}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        showError('Failed to export logs');
      }
    } catch (error) {
      showError('Failed to export logs');
    }
  };

  const fetchWebhookAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await fetch('/api/settings/webhooks/analytics');
      if (response.ok) {
        const data = await response.json();
        setWebhookAnalytics(data);
      } else {
        console.error('Failed to fetch webhook analytics');
      }
    } catch (error) {
      console.error('Error fetching webhook analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const testWebhook = async () => {
    if (!selectedWebhookForTest) return;
    
    try {
      setTestLoading(true);
      const response = await fetch(`/api/settings/webhooks/${selectedWebhookForTest.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: testPayload
      });
      
      if (response.ok) {
        const result = await response.json();
        setTestResult(result);
        showSuccess('Webhook test completed');
      } else {
        const error = await response.json();
        showError(error.message || 'Webhook test failed');
      }
    } catch (error) {
      showError('Webhook test failed');
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestDialogOpen = (webhook: Webhook | null) => {
    setSelectedWebhookForTest(webhook);
    if (webhook) {
      setTestResult(null);
      setTestPayload('{\n  "test": true,\n  "timestamp": "' + new Date().toISOString() + '"\n}');
    }
  };

  const handleWebhookSelection = (webhookId: string, selected: boolean) => {
    setSelectedWebhooks(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(webhookId);
      } else {
        newSet.delete(webhookId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (isAllSelected()) {
      setSelectedWebhooks(new Set());
    } else {
      setSelectedWebhooks(new Set(webhooks.map(w => w.id)));
    }
  };

  const performBulkAction = async () => {
    if (!bulkAction || selectedWebhooks.size === 0) return;
    
    try {
      setBulkLoading(true);
      const webhookIds = Array.from(selectedWebhooks);
      
      let url = '/api/settings/webhooks/bulk-action';
      let method = 'POST';
      let body = { action: bulkAction, webhookIds };
      
      if (bulkAction === 'delete') {
        const deletePromises = webhookIds.map(id => 
          fetch(`/api/settings/webhooks/${id}`, { method: 'DELETE' })
        );
        
        const results = await Promise.allSettled(deletePromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
        
        if (successCount > 0) {
          showSuccess(`Successfully deleted ${successCount} webhook${successCount !== 1 ? 's' : ''}`);
          setSelectedWebhooks(new Set());
          setBulkAction('');
          fetchWebhooks();
        } else {
          showError('Failed to delete webhooks');
        }
        return;
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        const actionText = bulkAction === 'enable' ? 'enabled' : 
                          bulkAction === 'disable' ? 'disabled' : 
                          bulkAction === 'test' ? 'tested' : 'processed';
        showSuccess(`Successfully ${actionText} ${selectedWebhooks.size} webhook${selectedWebhooks.size !== 1 ? 's' : ''}`);
        setSelectedWebhooks(new Set());
        setBulkAction('');
        fetchWebhooks();
      } else {
        showError('Failed to perform bulk action');
      }
    } catch (error) {
      showError('Failed to perform bulk action');
    } finally {
      setBulkLoading(false);
    }
  };

  const exportWebhooks = async () => {
    try {
      const response = await fetch('/api/settings/webhooks/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `webhooks-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        showError('Failed to export webhooks');
      }
    } catch (error) {
      showError('Failed to export webhooks');
    }
  };

  const getSelectedCount = () => {
    return selectedWebhooks instanceof Set ? selectedWebhooks.size : 0;
  };

  const isSelected = (webhookId: string) => {
    return selectedWebhooks instanceof Set ? selectedWebhooks.has(webhookId) : false;
  };

  const isAllSelected = () => {
    return selectedWebhooks instanceof Set ? selectedWebhooks.size === webhooks.length && webhooks.length > 0 : false;
  };

  useEffect(() => {
    try {
      setWebhooks([]);
      setCustomHeaders([]);
      fetchWebhooks();
    } catch (err) {
      console.error('Error initializing WebhookManagement:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize component');
      setLoading(false);
    }
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              An error occurred while loading the webhook management interface.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Webhook Management</h2>
          <p className="text-muted-foreground">
            Configure webhooks to receive real-time notifications about application events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (webhooks.length === 0) {
                showError('No webhooks available to test');
                return;
              }
              const activeWebhooks = webhooks.filter(w => w.is_active);
              if (activeWebhooks.length === 0) {
                showError('No active webhooks to test');
                return;
              }
              handleTestDialogOpen(activeWebhooks[0]);
            }}
            disabled={webhooks.length === 0}
          >
            <TestTube className="mr-2 h-4 w-4" />
            Test Send Webhook
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 overflow-hidden">
              <div className="flex flex-col md:flex-row h-full">
                {/* Left: Event Selection */}
                <div className="w-full md:w-1/2 bg-muted p-6 border-r border-border flex flex-col">
                  <h3 className="font-semibold text-lg mb-4">Select Events</h3>
                  <div className="flex flex-col gap-2 overflow-y-auto">
                    {/* Example event categories, replace with your actual event list and categories */}
                    <div>
                      <div className="font-medium text-sm mb-2">Candidate Events</div>
                      {['candidate.created', 'candidate.updated', 'candidate.deleted', 'candidate.stage_changed'].map(event => (
                        <label key={event} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.events.includes(event)}
                            onChange={e => {
                              setFormData(prev => ({
                                ...prev,
                                events: e.target.checked
                                  ? [...prev.events, event]
                                  : prev.events.filter(ev => ev !== event)
                              }));
                            }}
                          />
                          <span className="text-sm">{event.replace('candidate.', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        </label>
                      ))}
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-2 mt-4">Position Events</div>
                      {['position.created', 'position.updated', 'position.deleted'].map(event => (
                        <label key={event} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.events.includes(event)}
                            onChange={e => {
                              setFormData(prev => ({
                                ...prev,
                                events: e.target.checked
                                  ? [...prev.events, event]
                                  : prev.events.filter(ev => ev !== event)
                              }));
                            }}
                          />
                          <span className="text-sm">{event.replace('position.', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        </label>
                      ))}
                    </div>
                    {/* Add more event categories as needed */}
                  </div>
                </div>
                {/* Right: Postman-style Webhook Config */}
                <div className="w-full md:w-1/2 p-6 flex flex-col gap-4">
                  <div className="bg-background border rounded-lg shadow-sm p-4 flex flex-col gap-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn("px-2 py-1 rounded text-xs font-bold", formData.method === 'POST' ? 'bg-green-100 text-green-700' : formData.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700')}>{formData.method}</span>
                      <input
                        type="url"
                        className="flex-1 bg-transparent border-none outline-none font-mono text-sm px-2 py-1"
                        value={formData.url}
                        onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                        required
                        placeholder="https://your-endpoint.com/webhook"
                        style={{ minWidth: 0 }}
                      />
                    </div>
                    <div className="flex gap-2 items-center mb-2">
                      <label className="font-medium text-xs">Timeout (s)</label>
                      <input
                        type="number"
                        min={5}
                        max={300}
                        className="input input-bordered w-20 text-xs"
                        value={formData.timeout}
                        onChange={e => setFormData(prev => ({ ...prev, timeout: Number(e.target.value) }))}
                      />
                      <label className="font-medium text-xs ml-4">Retry</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        className="input input-bordered w-16 text-xs"
                        value={formData.retry_count}
                        onChange={e => setFormData(prev => ({ ...prev, retry_count: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="border-t pt-3 mt-2">
                      <div className="font-semibold text-sm mb-1">Headers</div>
                      <div className="flex flex-col gap-1">
                        {customHeaders.map((header, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              className="input input-bordered text-xs font-mono"
                              placeholder="Key"
                              value={header.key}
                              onChange={e => updateCustomHeader(idx, 'key', e.target.value)}
                            />
                            <input
                              type="text"
                              className="input input-bordered text-xs font-mono"
                              placeholder="Value"
                              value={header.value}
                              onChange={e => updateCustomHeader(idx, 'value', e.target.value)}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomHeader(idx)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addCustomHeader} className="mt-1 w-fit">
                          + Add Header
                        </Button>
                      </div>
                    </div>
                    <div className="border-t pt-3 mt-2">
                      <div className="font-semibold text-sm mb-1">Authentication</div>
                      <select
                        className="input input-bordered w-40 text-xs"
                        value={formData.auth_type}
                        onChange={e => setFormData(prev => ({ ...prev, auth_type: e.target.value as any }))}
                      >
                        <option value="none">None</option>
                        <option value="basic">Basic</option>
                        <option value="bearer">Bearer</option>
                        <option value="header">Custom Header</option>
                      </select>
                      {formData.auth_type === 'basic' && (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            className="input input-bordered text-xs font-mono"
                            placeholder="Username"
                            value={formData.auth_username || ''}
                            onChange={e => setFormData(prev => ({ ...prev, auth_username: e.target.value }))}
                          />
                          <input
                            type="password"
                            className="input input-bordered text-xs font-mono"
                            placeholder="Password"
                            value={formData.auth_password || ''}
                            onChange={e => setFormData(prev => ({ ...prev, auth_password: e.target.value }))}
                          />
                        </div>
                      )}
                      {formData.auth_type === 'bearer' && (
                        <input
                          type="text"
                          className="input input-bordered text-xs font-mono mt-2"
                          placeholder="Bearer Token"
                          value={formData.auth_token || ''}
                          onChange={e => setFormData(prev => ({ ...prev, auth_token: e.target.value }))}
                        />
                      )}
                      {formData.auth_type === 'header' && (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            className="input input-bordered text-xs font-mono"
                            placeholder="Header Name"
                            value={formData.auth_header_name || ''}
                            onChange={e => setFormData(prev => ({ ...prev, auth_header_name: e.target.value }))}
                          />
                          <input
                            type="text"
                            className="input input-bordered text-xs font-mono"
                            placeholder="Header Value"
                            value={formData.auth_header_value || ''}
                            onChange={e => setFormData(prev => ({ ...prev, auth_header_value: e.target.value }))}
                          />
                        </div>
                      )}
                    </div>
                    <div className="border-t pt-3 mt-2">
                      <div className="font-semibold text-sm mb-1">Request Body Preview</div>
                      <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto max-h-40">
{JSON.stringify({
  event: formData.events[0] || 'webhook.test',
  timestamp: new Date().toISOString(),
  data: { example: '...' }
}, null, 2)}
                      </pre>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button type="button" variant="outline" onClick={() => handleDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="btn-primary-gradient">
                        {editingWebhook ? 'Update Webhook' : 'Create Webhook'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>
                Manage your webhook configurations and monitor their performance.
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={exportWebhooks} variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected()}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Delivery</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span>Loading webhooks...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : webhooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No webhooks configured. Create your first webhook to start receiving notifications.
                  </TableCell>
                </TableRow>
              ) : (
                webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected(webhook.id)}
                      onCheckedChange={(checked) => 
                        handleWebhookSelection(webhook.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{webhook.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="truncate max-w-[200px]">{webhook.url}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(webhook.url, `url-${webhook.id}`)}
                      >
                        {copiedId === `url-${webhook.id}` ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 2).map(event => (
                        <Badge key={event} variant="secondary" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                      {webhook.events.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{webhook.events.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                      {webhook.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(webhook.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => copyToClipboard(webhook.id, webhook.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy ID
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleLogsDialogOpen(webhook)}>
                          <History className="mr-2 h-4 w-4" />
                          View Logs
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTestDialogOpen(webhook)}>
                          <TestTube className="mr-2 h-4 w-4" />
                          Test Webhook
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(webhook)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{webhook.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(webhook.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {selectedWebhookForTest && (
  <Dialog open={!!selectedWebhookForTest} onOpenChange={() => setSelectedWebhookForTest(null)}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Test Webhook Result</DialogTitle>
        <DialogDescription>
          {testLoading ? 'Testing webhook...' : `Result for: ${selectedWebhookForTest.name}`}
        </DialogDescription>
      </DialogHeader>
      {testLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Sending test request...</span>
        </div>
      ) : testResult ? (
        <div className="space-y-2">
          {testResult.message && <div className="text-green-600 font-medium">{testResult.message}</div>}
          {testResult.error && <div className="text-red-600 font-medium">{testResult.error}</div>}
          {testResult.status && <div>Status: <span className="font-mono">{testResult.status}</span></div>}
          {testResult.webhook_id && <div>Webhook ID: <span className="font-mono">{testResult.webhook_id}</span></div>}
          {testResult.response && (
            <div>
              <div className="font-semibold">Response Body:</div>
              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-h-40">{typeof testResult.response === 'string' ? testResult.response : JSON.stringify(testResult.response, null, 2)}</pre>
            </div>
          )}
        </div>
      ) : (
        <div className="text-muted-foreground">No result yet.</div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => setSelectedWebhookForTest(null)}>Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}
    </div>
  );
} 