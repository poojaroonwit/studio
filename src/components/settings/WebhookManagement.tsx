'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus, Edit, Trash2, TestTube, ExternalLink, Copy, Check, History, Activity,
  CheckCircle, Clock, Send, MoreHorizontal, X, Code, Settings, Zap, Globe,
  Shield, Database, BarChart3, Filter, Search, Download, Upload, RefreshCw,
  AlertTriangle, Info, Play, Pause, Eye, EyeOff, GitBranch, Layers, Palette
} from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import WebhookBodyCustomization from './WebhookBodyCustomization';

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
  body_template?: string;
  field_mappings?: any[];
  include_metadata?: boolean;
  custom_payload?: boolean;
  body_configs?: any[];
  createdAt: string;
  updatedAt: string;
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

// Enhanced event categories with better organization
const WEBHOOK_EVENT_CATEGORIES = [
  {
    category: 'Candidate Management',
    icon: <Database className="h-4 w-4" />,
    color: 'bg-blue-500',
    events: [
      { id: 'candidate.created', label: 'Candidate Created', description: 'When a new candidate is added to the system' },
      { id: 'candidate.updated', label: 'Candidate Updated', description: 'When candidate information is modified' },
      { id: 'candidate.deleted', label: 'Candidate Deleted', description: 'When a candidate is removed from the system' },
      { id: 'candidate.stage_changed', label: 'Stage Changed', description: 'When a candidate moves to a different stage' },
    ],
  },
  {
    category: 'Position Management',
    icon: <Globe className="h-4 w-4" />,
    color: 'bg-green-500',
    events: [
      { id: 'position.created', label: 'Position Created', description: 'When a new job position is created' },
      { id: 'position.updated', label: 'Position Updated', description: 'When position details are modified' },
      { id: 'position.deleted', label: 'Position Deleted', description: 'When a position is removed' },
    ],
  },
  {
    category: 'User Management',
    icon: <Shield className="h-4 w-4" />,
    color: 'bg-purple-500',
    events: [
      { id: 'user.created', label: 'User Created', description: 'When a new user account is created' },
      { id: 'user.updated', label: 'User Updated', description: 'When user information is modified' },
      { id: 'user.deleted', label: 'User Deleted', description: 'When a user account is removed' },
    ],
  },
  {
    category: 'Document Processing',
    icon: <Upload className="h-4 w-4" />,
    color: 'bg-orange-500',
    events: [
      { id: 'resume.uploaded', label: 'Resume Uploaded', description: 'When a resume file is uploaded' },
      { id: 'resume.processed', label: 'Resume Processed', description: 'When resume parsing is completed' },
    ],
  },
  {
    category: 'Communication',
    icon: <Send className="h-4 w-4" />,
    color: 'bg-pink-500',
    events: [
      { id: 'comment.created', label: 'Comment Created', description: 'When a new comment is added' },
      { id: 'comment.updated', label: 'Comment Updated', description: 'When a comment is modified' },
      { id: 'comment.deleted', label: 'Comment Deleted', description: 'When a comment is removed' },
    ],
  },
  {
    category: 'System Events',
    icon: <Settings className="h-4 w-4" />,
    color: 'bg-gray-500',
    events: [
      { id: 'upload_queue.created', label: 'Upload Queue Created', description: 'When a file upload is queued' },
      { id: 'upload_queue.inprocess', label: 'Upload Queue Processing', description: 'When file processing begins' },
      { id: 'upload_queue.completed', label: 'Upload Queue Completed', description: 'When file processing finishes' },
      { id: 'upload_queue.failed', label: 'Upload Queue Failed', description: 'When file processing fails' },
      { id: 'upload_queue.retry', label: 'Upload Queue Retry', description: 'When file processing is retried' },
    ],
  },
];

export default function WebhookManagement() {
  // Custom scrollbar styles
  const scrollbarStyles = `
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgb(203 213 225);
      border-radius: 3px;
      transition: background 0.2s ease;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgb(148 163 184);
    }
    .custom-scrollbar.dark::-webkit-scrollbar-thumb {
      background: rgb(71 85 105);
    }
    .custom-scrollbar.dark::-webkit-scrollbar-thumb:hover {
      background: rgb(100 116 139);
    }
  `;
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
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
  const [customizingWebhook, setCustomizingWebhook] = useState<Webhook | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const { error: showError, success: showSuccess } = useToast();
  const [globalWebhookLogs, setGlobalWebhookLogs] = useState<any[]>([]);
  const [globalLogsLoading, setGlobalLogsLoading] = useState(false);
  const [globalLogsFilter, setGlobalLogsFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [globalLogsSearch, setGlobalLogsSearch] = useState('');
  const [globalLogsPage, setGlobalLogsPage] = useState(1);
  const [globalLogsTotal, setGlobalLogsTotal] = useState(0);

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
          // Body customization fields
          body_template: webhook.body_template || null,
          field_mappings: webhook.field_mappings || null,
          include_metadata: Boolean(webhook.include_metadata),
          custom_payload: Boolean(webhook.custom_payload),
          body_configs: webhook.body_configs || [],
          createdAt: webhook.createdAt || new Date().toISOString(),
          updatedAt: webhook.updatedAt || new Date().toISOString()
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
      // Clear any existing timeout
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
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

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

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
        // SECURITY: Safe appendChild for file download - href is a blob URL, not user HTML
        // deepcode ignore DOMXSS: Safe pattern using blob URL for file download
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

  const fetchGlobalWebhookLogs = async (page: number = 1, filter: 'all' | 'success' | 'failed' = 'all', search: string = '') => {
    try {
      setGlobalLogsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        filter,
        search
      });
      const response = await fetch(`/api/settings/webhooks/logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setGlobalWebhookLogs(Array.isArray(data.logs) ? data.logs : []);
        setGlobalLogsTotal(Number(data.total || 0));
      } else {
        showError('Failed to fetch webhook logs');
      }
    } catch (error) {
      showError('Failed to fetch webhook logs');
    } finally {
      setGlobalLogsLoading(false);
    }
  };

  const handleGlobalLogsFilterChange = (value: 'all' | 'success' | 'failed') => {
    setGlobalLogsFilter(value);
    setGlobalLogsPage(1);
    fetchGlobalWebhookLogs(1, value, globalLogsSearch);
  };

  const handleGlobalLogsSearch = (value: string) => {
    setGlobalLogsSearch(value);
    setGlobalLogsPage(1);
    fetchGlobalWebhookLogs(1, globalLogsFilter, value);
  };

  const handleGlobalLogsPageChange = (nextPage: number) => {
    setGlobalLogsPage(nextPage);
    fetchGlobalWebhookLogs(nextPage, globalLogsFilter, globalLogsSearch);
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

  const handleBodyConfigSave = async (webhookId: string, config: any) => {
    try {
      const response = await fetch(`/api/settings/webhooks/${webhookId}/body-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        showSuccess('Webhook body configuration updated successfully');
        fetchWebhooks(); // Refresh the webhooks list
      } else {
        const error = await response.json();
        showError(error.message || 'Failed to update webhook body configuration');
      }
    } catch (error) {
      showError('Failed to update webhook body configuration');
    }
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
        // SECURITY: Safe appendChild for file download - href is a blob URL, not user HTML
        // deepcode ignore DOMXSS: Safe pattern using blob URL for file download
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
      fetchWebhookAnalytics();
      fetchGlobalWebhookLogs();
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
    <>
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      <TooltipProvider>
        <div className="h-full flex flex-col p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Webhook Management</h1>
              <p className="text-muted-foreground">Configure real-time notifications and integrations for your recruitment system</p>
            </div>
            <div className="flex gap-2">
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
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                Quick Test
              </Button>

              <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
                  <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
                    <DialogTitle className="text-xl font-semibold">
                      {editingWebhook ? 'Edit Webhook' : 'Create New Webhook'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure your webhook endpoint and select the events you want to receive notifications for.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex flex-col lg:flex-row flex-1 min-h-0">
                    {/* Left Panel: Event Selection */}
                    <div className="w-full lg:w-2/5 bg-muted/30 px-6 pb-6 pt-0 border-r border-border flex flex-col min-h-0">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Layers className="h-5 w-5 text-blue-600" />
                          Event Selection
                        </h3>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              events: WEBHOOK_EVENT_CATEGORIES.flatMap(cat => cat.events.map(e => e.id))
                            }))}
                            className="h-7 px-2 text-xs"
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData(prev => ({ ...prev, events: [] }))}
                            className="h-7 px-2 text-xs"
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {formData.events.length} events selected
                        </Badge>
                      </div>

                      {/* Event Categories */}
                      <div
                        className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar"
                        style={{ minHeight: 0 }}
                      >
                        {WEBHOOK_EVENT_CATEGORIES.map(({ category, events, icon, color }) => (
                          <div key={category} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {/* Category Header */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-md ${color} text-white`}>
                                  {icon}
                                </div>
                                <span className="font-semibold text-sm">{category}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    events: Array.from(new Set([...prev.events, ...events.map(e => e.id)])),
                                  }))}
                                  className="h-6 px-2 text-xs"
                                >
                                  All
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    events: prev.events.filter(eid => !events.some(e => e.id === eid)),
                                  }))}
                                  className="h-6 px-2 text-xs"
                                >
                                  Clear
                                </Button>
                                <Badge variant="outline" className="text-xs">
                                  {formData.events.filter(eid => events.some(e => e.id === eid)).length}/{events.length}
                                </Badge>
                              </div>
                            </div>

                            {/* Events List */}
                            <div className="divide-y divide-slate-200 dark:divide-slate-700">
                              {events.map(event => (
                                <label key={event.id} className="flex items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer">
                                  <Checkbox
                                    checked={formData.events.includes(event.id)}
                                    onCheckedChange={() => toggleEvent(event.id)}
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-medium text-foreground">{event.label}</span>
                                      <Badge variant="outline" className="text-xs font-mono">
                                        {event.id}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Selected Events Summary */}
                      {formData.events.length > 0 && (
                        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                              Selected Events ({formData.events.length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {formData.events.slice(0, 4).map(eventId => {
                              const event = WEBHOOK_EVENT_CATEGORIES.flatMap(cat => cat.events).find(e => e.id === eventId);
                              return (
                                <Badge key={eventId} variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                  {event?.label || eventId}
                                </Badge>
                              );
                            })}
                            {formData.events.length > 4 && (
                              <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400">
                                +{formData.events.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Panel: Webhook Configuration */}
                    <div className="w-full lg:w-3/5 flex flex-col min-h-0">
                      <form onSubmit={handleSubmit} className="flex flex-col h-full px-6 pb-6 pt-0">
                        <div
                          className="space-y-6 overflow-y-auto flex-1 pr-2 custom-scrollbar"
                          style={{ scrollbarWidth: 'thin' }}
                        >
                          {/* Basic Configuration */}
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="webhook-name" className="text-sm font-semibold">Webhook Name</Label>
                              <Input
                                id="webhook-name"
                                type="text"
                                placeholder="e.g., Candidate Notifications"
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                required
                                className="mt-1"
                              />
                            </div>

                            {/* HTTP Method and URL */}
                            <div>
                              <Label className="text-sm font-semibold">Endpoint URL</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Select value={formData.method} onValueChange={(value) => setFormData(prev => ({ ...prev, method: value as any }))}>
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="POST">POST</SelectItem>
                                    <SelectItem value="GET">GET</SelectItem>
                                    <SelectItem value="PUT">PUT</SelectItem>
                                    <SelectItem value="PATCH">PATCH</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="url"
                                  placeholder="https://your-endpoint.com/webhook"
                                  value={formData.url}
                                  onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                  required
                                  className="flex-1 font-mono text-sm"
                                />
                              </div>
                            </div>

                            {/* Status Toggle */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                              <div>
                                <Label className="text-sm font-semibold">Webhook Status</Label>
                                <p className="text-xs text-muted-foreground">Enable or disable this webhook</p>
                              </div>
                              <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                              />
                            </div>
                          </div>

                          {/* Advanced Configuration */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Advanced Settings
                            </h4>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="timeout" className="text-xs font-medium">Timeout (seconds)</Label>
                                <Input
                                  id="timeout"
                                  type="number"
                                  min={5}
                                  max={300}
                                  value={formData.timeout}
                                  onChange={e => setFormData(prev => ({ ...prev, timeout: Number(e.target.value) }))}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor="retry-count" className="text-xs font-medium">Retry Attempts</Label>
                                <Input
                                  id="retry-count"
                                  type="number"
                                  min={0}
                                  max={10}
                                  value={formData.retry_count}
                                  onChange={e => setFormData(prev => ({ ...prev, retry_count: Number(e.target.value) }))}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Authentication */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Authentication
                            </h4>

                            <Select value={formData.auth_type} onValueChange={(value) => setFormData(prev => ({ ...prev, auth_type: value as any }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select authentication type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Authentication</SelectItem>
                                <SelectItem value="basic">Basic Auth</SelectItem>
                                <SelectItem value="bearer">Bearer Token</SelectItem>
                                <SelectItem value="header">Custom Header</SelectItem>
                              </SelectContent>
                            </Select>

                            {formData.auth_type === 'basic' && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="auth-username" className="text-xs font-medium">Username</Label>
                                  <Input
                                    id="auth-username"
                                    type="text"
                                    placeholder="Username"
                                    value={formData.auth_username || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, auth_username: e.target.value }))}
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="auth-password" className="text-xs font-medium">Password</Label>
                                  <Input
                                    id="auth-password"
                                    type="password"
                                    placeholder="Password"
                                    value={formData.auth_password || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, auth_password: e.target.value }))}
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            )}

                            {formData.auth_type === 'bearer' && (
                              <div>
                                <Label htmlFor="auth-token" className="text-xs font-medium">Bearer Token</Label>
                                <Input
                                  id="auth-token"
                                  type="text"
                                  placeholder="Bearer token"
                                  value={formData.auth_token || ''}
                                  onChange={e => setFormData(prev => ({ ...prev, auth_token: e.target.value }))}
                                  className="mt-1"
                                />
                              </div>
                            )}

                            {formData.auth_type === 'header' && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="auth-header-name" className="text-xs font-medium">Header Name</Label>
                                  <Input
                                    id="auth-header-name"
                                    type="text"
                                    placeholder="X-API-Key"
                                    value={formData.auth_header_name || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, auth_header_name: e.target.value }))}
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="auth-header-value" className="text-xs font-medium">Header Value</Label>
                                  <Input
                                    id="auth-header-value"
                                    type="text"
                                    placeholder="Your API key"
                                    value={formData.auth_header_value || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, auth_header_value: e.target.value }))}
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Custom Headers */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm flex items-center gap-2">
                                <Palette className="h-4 w-4" />
                                Custom Headers
                              </h4>
                              <Button type="button" variant="outline" size="sm" onClick={addCustomHeader}>
                                <Plus className="h-3 w-3 mr-1" />
                                Add Header
                              </Button>
                            </div>

                            <div className="space-y-2">
                              {customHeaders.map((header, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <Input
                                    type="text"
                                    placeholder="Header name"
                                    value={header.key}
                                    onChange={e => updateCustomHeader(idx, 'key', e.target.value)}
                                    className="flex-1"
                                  />
                                  <Input
                                    type="text"
                                    placeholder="Header value"
                                    value={header.value}
                                    onChange={e => updateCustomHeader(idx, 'value', e.target.value)}
                                    className="flex-1"
                                  />
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomHeader(idx)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Request Preview */}
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Request Preview
                            </h4>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                              <pre className="text-xs font-mono overflow-x-auto">
                                {JSON.stringify({
                                  event: formData.events[0] || 'webhook.test',
                                  timestamp: new Date().toISOString(),
                                  data: { example: 'Sample data will be sent here' }
                                }, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t flex-shrink-0 mt-6">
                          <Button type="button" variant="outline" onClick={() => handleDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">
                            {editingWebhook ? 'Update Webhook' : 'Create Webhook'}
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Standard Tab Design */}
              <div className="flex w-full border-b border-border/50 mb-6">
                <div
                  onClick={() => setActiveTab('overview')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                    activeTab === 'overview'
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <BarChart3 className="h-4 w-4" />
                  Overview
                </div>
                <div
                  onClick={() => setActiveTab('webhooks')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                    activeTab === 'webhooks'
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <Zap className="h-4 w-4" />
                  Webhooks
                </div>
                <div
                  onClick={() => setActiveTab('analytics')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                    activeTab === 'analytics'
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <Activity className="h-4 w-4" />
                  Analytics
                </div>
                <div
                  onClick={() => setActiveTab('logs')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                    activeTab === 'logs'
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <History className="h-4 w-4" />
                  Logs
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                {activeTab === 'overview' && (
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-6">
                      {/* Overview Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Webhooks</p>
                                <p className="text-2xl font-bold">{webhooks.length}</p>
                              </div>
                              <div className="p-2 bg-muted rounded-lg">
                                <Zap className="h-6 w-6 text-primary" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Active Webhooks</p>
                                <p className="text-2xl font-bold">
                                  {webhooks.filter(w => w.is_active).length}
                                </p>
                              </div>
                              <div className="p-2 bg-muted rounded-lg">
                                <CheckCircle className="h-6 w-6 text-primary" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                                <p className="text-2xl font-bold">
                                  {webhooks.reduce((acc, w) => acc + w.events.length, 0)}
                                </p>
                              </div>
                              <div className="p-2 bg-muted rounded-lg">
                                <Database className="h-6 w-6 text-primary" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                                <p className="text-2xl font-bold">
                                  {webhookAnalytics?.successRate !== undefined
                                    ? `${webhookAnalytics.successRate.toFixed(1)}%`
                                    : analyticsLoading
                                      ? '...'
                                      : 'N/A'}
                                </p>
                              </div>
                              <div className="p-2 bg-muted rounded-lg">
                                <Activity className="h-6 w-6 text-primary" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>


                    </div>
                  </ScrollArea>
                )}

                {activeTab === 'webhooks' && (
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5" />
                                Webhook Configurations
                              </CardTitle>
                              <CardDescription>
                                Manage your webhook endpoints and configurations
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button onClick={exportWebhooks} variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" />
                                Export
                              </Button>
                              <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Refresh
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* Filters and Search */}
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search webhooks..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="pl-10 w-64"
                                />
                              </div>
                              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Status</SelectItem>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setViewMode('grid')}
                                >
                                  <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                                    <div className="bg-current rounded-sm"></div>
                                    <div className="bg-current rounded-sm"></div>
                                    <div className="bg-current rounded-sm"></div>
                                    <div className="bg-current rounded-sm"></div>
                                  </div>
                                </Button>
                                <Button
                                  variant={viewMode === 'list' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setViewMode('list')}
                                >
                                  <div className="flex flex-col gap-0.5 w-4 h-4">
                                    <div className="bg-current rounded-sm h-0.5"></div>
                                    <div className="bg-current rounded-sm h-0.5"></div>
                                    <div className="bg-current rounded-sm h-0.5"></div>
                                  </div>
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Bulk Actions Bar */}
                          {getSelectedCount() > 0 && (
                            <div className="mb-4 p-2 bg-muted/30 rounded border">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-primary" />
                                  <span className="text-sm text-muted-foreground">
                                    {getSelectedCount()} webhook{getSelectedCount() !== 1 ? 's' : ''} selected
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Select value={bulkAction} onValueChange={setBulkAction}>
                                    <SelectTrigger className="w-32 h-7 text-xs">
                                      <SelectValue placeholder="Action" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="enable">Enable Selected</SelectItem>
                                      <SelectItem value="disable">Disable Selected</SelectItem>
                                      <SelectItem value="delete">Delete Selected</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={performBulkAction}
                                    disabled={!bulkAction || bulkLoading}
                                    className="h-7 px-2"
                                  >
                                    {bulkLoading ? (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                    ) : (
                                      'Apply'
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedWebhooks(new Set())}
                                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                  >
                                    Clear
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Webhooks Display */}
                          {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {loading ? (
                                <div className="col-span-full flex items-center justify-center py-12">
                                  <div className="flex items-center gap-3">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                    <span className="text-muted-foreground">Loading webhooks...</span>
                                  </div>
                                </div>
                              ) : webhooks.length === 0 ? (
                                <div className="col-span-full text-center py-12">
                                  <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                                    <Zap className="h-12 w-12 text-muted-foreground" />
                                  </div>
                                  <h3 className="text-lg font-semibold mb-2">No webhooks configured</h3>
                                  <p className="text-muted-foreground mb-4">
                                    Create your first webhook to start receiving real-time notifications.
                                  </p>
                                  <Button onClick={() => setIsDialogOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Webhook
                                  </Button>
                                </div>
                              ) : (
                                webhooks
                                  .filter(webhook =>
                                    (statusFilter === 'all' ||
                                      (statusFilter === 'active' && webhook.is_active) ||
                                      (statusFilter === 'inactive' && !webhook.is_active)) &&
                                    (searchTerm === '' ||
                                      webhook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                      webhook.url.toLowerCase().includes(searchTerm.toLowerCase()))
                                  )
                                  .map((webhook) => (
                                    <Card key={webhook.id} className="group hover:shadow-lg transition-all duration-200">
                                      <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1 min-w-0">
                                            <CardTitle className="text-lg truncate">{webhook.name}</CardTitle>
                                            <CardDescription className="truncate font-mono text-xs">
                                              {webhook.url}
                                            </CardDescription>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Checkbox
                                              checked={isSelected(webhook.id)}
                                              onCheckedChange={(checked) =>
                                                handleWebhookSelection(webhook.id, checked as boolean)
                                              }
                                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            />
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                  <MoreHorizontal className="h-4 w-4" />
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
                                                <DropdownMenuItem onClick={() => setCustomizingWebhook(webhook)}>
                                                  <Code className="mr-2 h-4 w-4" />
                                                  Customize Body
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
                                          </div>
                                        </div>
                                      </CardHeader>
                                      <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between">
                                          <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                                            {webhook.is_active ? 'Active' : 'Inactive'}
                                          </Badge>
                                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {formatDate(webhook.createdAt)}
                                          </div>
                                        </div>

                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground mb-2">Events ({webhook.events.length})</p>
                                          <div className="flex flex-wrap gap-1">
                                            {webhook.events.slice(0, 3).map(event => (
                                              <Badge key={event} variant="outline" className="text-xs">
                                                {event}
                                              </Badge>
                                            ))}
                                            {webhook.events.length > 3 && (
                                              <Badge variant="outline" className="text-xs">
                                                +{webhook.events.length - 3} more
                                              </Badge>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t">
                                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span>{webhook.method}</span>
                                            <span>{webhook.timeout}s timeout</span>
                                            <span>{webhook.retry_count} retries</span>
                                          </div>
                                          <Button variant="outline" size="sm" onClick={() => handleEdit(webhook)}>
                                            <Edit className="h-3 w-3 mr-1" />
                                            Edit
                                          </Button>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))
                              )}
                            </div>
                          ) : (
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
                                  webhooks
                                    .filter(webhook =>
                                      (statusFilter === 'all' ||
                                        (statusFilter === 'active' && webhook.is_active) ||
                                        (statusFilter === 'inactive' && !webhook.is_active)) &&
                                      (searchTerm === '' ||
                                        webhook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        webhook.url.toLowerCase().includes(searchTerm.toLowerCase()))
                                    )
                                    .map((webhook) => (
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
                                        <TableCell>{formatDate(webhook.createdAt)}</TableCell>
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
                                              <DropdownMenuItem onClick={() => setCustomizingWebhook(webhook)}>
                                                <Code className="mr-2 h-4 w-4" />
                                                Customize Body
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
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                )}

                {activeTab === 'analytics' && (
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Webhook Analytics
                          </CardTitle>
                          <CardDescription>
                            Monitor webhook performance and delivery statistics (last 24 hours)
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {analyticsLoading ? (
                            <div className="text-center py-12">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                              <p className="text-muted-foreground">Loading analytics...</p>
                            </div>
                          ) : webhookAnalytics ? (
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                  <CardContent className="p-4">
                                    <div className="flex items-center space-x-2">
                                      <Zap className="h-4 w-4 text-blue-500" />
                                      <span className="text-sm text-muted-foreground">Total Webhooks</span>
                                    </div>
                                    <p className="text-2xl font-bold">{webhookAnalytics.totalWebhooks}</p>
                                    <p className="text-xs text-muted-foreground">{webhookAnalytics.activeWebhooks} active</p>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className="p-4">
                                    <div className="flex items-center space-x-2">
                                      <Send className="h-4 w-4 text-green-500" />
                                      <span className="text-sm text-muted-foreground">Total Deliveries</span>
                                    </div>
                                    <p className="text-2xl font-bold">{webhookAnalytics.totalDeliveries}</p>
                                    <p className="text-xs text-muted-foreground">Last 24 hours</p>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className="p-4">
                                    <div className="flex items-center space-x-2">
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                      <span className="text-sm text-muted-foreground">Success Rate</span>
                                    </div>
                                    <p className="text-2xl font-bold">{webhookAnalytics.successRate?.toFixed ? webhookAnalytics.successRate.toFixed(1) : webhookAnalytics.successRate}%</p>
                                    <p className="text-xs text-muted-foreground">Success percentage</p>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className="p-4">
                                    <div className="flex items-center space-x-2">
                                      <Clock className="h-4 w-4 text-orange-500" />
                                      <span className="text-sm text-muted-foreground">Avg Response</span>
                                    </div>
                                    <p className="text-2xl font-bold">{Math.round(webhookAnalytics.avgResponseTime || 0)}ms</p>
                                    <p className="text-xs text-muted-foreground">Average duration</p>
                                  </CardContent>
                                </Card>
                              </div>

                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                                  <CardDescription>Latest webhook delivery attempts</CardDescription>
                                </CardHeader>
                                <CardContent>
                                  {Array.isArray(webhookAnalytics.recentActivity) && webhookAnalytics.recentActivity.length > 0 ? (
                                    <div className="space-y-3">
                                      {webhookAnalytics.recentActivity.map((item: any) => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                          <div className="flex items-center gap-3">
                                            <Badge variant={item.success ? 'default' : 'destructive'} className="text-xs">
                                              {item.success ? 'Success' : 'Failed'}
                                            </Badge>
                                            <div>
                                              <div className="text-sm font-medium">{item.webhook?.name || 'Unknown'}</div>
                                              <div className="text-xs text-muted-foreground">{item.event_type}</div>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleTimeString()}</div>
                                            {item.response_status && (
                                              <div className="text-xs font-mono">{item.response_status}</div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-6 text-muted-foreground">No recent activity</div>
                                  )}
                                </CardContent>
                              </Card>

                              {Array.isArray(webhookAnalytics.topFailingWebhooks) && webhookAnalytics.topFailingWebhooks.length > 0 && (
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg">Top Failing Webhooks</CardTitle>
                                    <CardDescription>Most failures in the last 24 hours</CardDescription>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-3">
                                      {webhookAnalytics.topFailingWebhooks.map((w: any) => (
                                        <div key={w.webhook_id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                                          <div className="flex items-center gap-3">
                                            <AlertTriangle className="h-4 w-4 text-red-500" />
                                            <div>
                                              <div className="text-sm font-medium">{w.name}</div>
                                              <div className="text-xs text-muted-foreground">{w.failure_count} failures</div>
                                            </div>
                                          </div>
                                          <Button variant="outline" size="sm" onClick={() => {
                                            const found = webhooks.find(x => x.id === w.webhook_id);
                                            if (found) handleLogsDialogOpen(found);
                                          }}>View Logs</Button>
                                        </div>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-12 text-muted-foreground">
                              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No analytics data available</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                )}

                {activeTab === 'logs' && (
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Recent Webhook Logs
                          </CardTitle>
                          <CardDescription>
                            View recent webhook delivery attempts and responses across all webhooks
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Select value={globalLogsFilter} onValueChange={(v) => handleGlobalLogsFilterChange(v as any)}>
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Logs</SelectItem>
                                  <SelectItem value="success">Success</SelectItem>
                                  <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search logs..."
                                  value={globalLogsSearch}
                                  onChange={(e) => handleGlobalLogsSearch(e.target.value)}
                                  className="pl-10 w-64"
                                />
                              </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => fetchGlobalWebhookLogs(globalLogsPage, globalLogsFilter, globalLogsSearch)} disabled={globalLogsLoading}>
                              {globalLogsLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Webhook</TableHead>
                                  <TableHead>Event</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Response</TableHead>
                                  <TableHead>Duration</TableHead>
                                  <TableHead>Time</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {globalLogsLoading ? (
                                  <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                      <div className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                        <span className="text-muted-foreground">Loading logs...</span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ) : globalWebhookLogs.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                      No webhook logs found
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  globalWebhookLogs.map((log: any) => (
                                    <TableRow key={log.id}>
                                      <TableCell>
                                        <div className="text-sm font-medium">{log.webhook_name}</div>
                                        <div className="text-xs text-muted-foreground truncate max-w-[240px]">{log.webhook_url}</div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-xs">{log.event_type}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={log.success ? 'default' : 'destructive'}>{log.success ? 'Success' : 'Failed'}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        <div className="text-xs">
                                          {log.response_status && <span className="font-mono mr-2">{log.response_status}</span>}
                                          {log.response_message && <span className="text-muted-foreground truncate inline-block max-w-[200px] align-bottom">{log.response_message}</span>}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-sm">{log.duration_ms ? `${log.duration_ms}ms` : '-'}</TableCell>
                                      <TableCell className="text-sm">{new Date(log.created_at || log.createdAt).toLocaleString()}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>

                          {globalLogsTotal > 20 && (
                            <div className="flex items-center justify-between mt-4">
                              <div className="text-sm text-muted-foreground">
                                Showing {((globalLogsPage - 1) * 20) + 1} to {Math.min(globalLogsPage * 20, globalLogsTotal)} of {globalLogsTotal} logs
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleGlobalLogsPageChange(globalLogsPage - 1)}
                                  disabled={globalLogsPage <= 1}
                                >
                                  Previous
                                </Button>
                                <span className="text-sm">Page {globalLogsPage}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleGlobalLogsPageChange(globalLogsPage + 1)}
                                  disabled={globalLogsPage >= Math.ceil(globalLogsTotal / 20)}
                                >
                                  Next
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </div>

          {/* Test Webhook Dialog */}
          {selectedWebhookForTest && (
            <Dialog open={!!selectedWebhookForTest} onOpenChange={() => setSelectedWebhookForTest(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <TestTube className="h-5 w-5" />
                    Test Webhook
                  </DialogTitle>
                  <DialogDescription>
                    {testLoading ? 'Testing webhook...' : `Test webhook: ${selectedWebhookForTest.name}`}
                  </DialogDescription>
                </DialogHeader>

                {testLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="text-lg">Sending test request...</span>
                    </div>
                  </div>
                ) : testResult ? (
                  <div className="space-y-4">
                    {testResult.message && (
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">{testResult.message}</span>
                        </div>
                      </div>
                    )}
                    {testResult.error && (
                      <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                          <AlertTriangle className="h-5 w-5" />
                          <span className="font-medium">{testResult.error}</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {testResult.status && (
                        <div>
                          <Label className="text-sm font-medium">Status Code</Label>
                          <div className="mt-1 p-2 bg-muted rounded font-mono text-sm">{testResult.status}</div>
                        </div>
                      )}
                      {testResult.webhook_id && (
                        <div>
                          <Label className="text-sm font-medium">Webhook ID</Label>
                          <div className="mt-1 p-2 bg-muted rounded font-mono text-sm">{testResult.webhook_id}</div>
                        </div>
                      )}
                    </div>

                    {testResult.response && (
                      <div>
                        <Label className="text-sm font-medium">Response Body</Label>
                        <div className="mt-1 p-3 bg-muted rounded-lg">
                          <pre className="text-xs font-mono overflow-x-auto max-h-40">
                            {typeof testResult.response === 'string' ? testResult.response : JSON.stringify(testResult.response, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Click "Send Test" to test the webhook</p>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedWebhookForTest(null)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Webhook Logs Dialog */}
          {selectedWebhookForLogs && (
            <Dialog open={!!selectedWebhookForLogs} onOpenChange={() => setSelectedWebhookForLogs(null)}>
              <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Webhook Logs - {selectedWebhookForLogs.name}
                  </DialogTitle>
                  <DialogDescription>
                    View delivery logs and response details for this webhook.
                  </DialogDescription>
                </DialogHeader>

                {/* Filters and Search */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Select value={logsFilter} onValueChange={(value) => handleLogsFilterChange(value as any)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Logs</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search logs..."
                        value={logsSearch}
                        onChange={(e) => handleLogsSearch(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>
                  <Button onClick={exportLogs} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export Logs
                  </Button>
                </div>

                {/* Logs Table */}
                <div className="overflow-y-auto max-h-96 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Response</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                              <span>Loading logs...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : webhookLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <History className="h-8 w-8 opacity-50" />
                              <p>No logs found for this webhook.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        webhookLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs">
                              {new Date(log.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="outline">{log.event_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={log.success ? 'default' : 'destructive'}>
                                {log.success ? 'Success' : 'Failed'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {log.response_status ? (
                                <span className="font-mono">{log.response_status}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {log.duration_ms}ms
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {logsTotal > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((logsPage - 1) * 20) + 1} to {Math.min(logsPage * 20, logsTotal)} of {logsTotal} logs
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLogsPageChange(logsPage - 1)}
                        disabled={logsPage <= 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm">Page {logsPage}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLogsPageChange(logsPage + 1)}
                        disabled={logsPage >= Math.ceil(logsTotal / 20)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedWebhookForLogs(null)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Webhook Body Customization Dialog */}
          {customizingWebhook && (
            <WebhookBodyCustomization
              webhookId={customizingWebhook.id}
              webhookEvents={customizingWebhook.events}
              initialConfig={{
                body_template: customizingWebhook.body_template,
                field_mappings: customizingWebhook.field_mappings,
                include_metadata: customizingWebhook.include_metadata,
                custom_payload: customizingWebhook.custom_payload,
                body_configs: customizingWebhook.body_configs
              }}
              onSave={async (config) => {
                await handleBodyConfigSave(customizingWebhook.id, config);
                setCustomizingWebhook(null);
              }}
              onClose={() => setCustomizingWebhook(null)}
            />
          )}
        </div>
      </TooltipProvider>
    </>
  );
}