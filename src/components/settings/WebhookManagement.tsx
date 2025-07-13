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
import { Plus, Edit, Trash2, TestTube, ExternalLink, Copy, Check, History, Activity, CheckCircle, Clock, Send, MoreHorizontal } from 'lucide-react';
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

const AVAILABLE_EVENTS = [
  // Candidate Events
  'candidate.created',
  'candidate.updated',
  'candidate.deleted',
  'candidate.stage_changed',
  'candidate.assigned',
  'candidate.unassigned',
  'candidate.imported',
  'candidate.exported',
  'candidate.bulk_updated',
  'candidate.bulk_deleted',
  'candidate.comment_added',
  'candidate.comment_updated',
  'candidate.comment_deleted',
  'candidate.resume_uploaded',
  'candidate.resume_processed',
  'candidate.resume_deleted',
  'candidate.avatar_uploaded',
  'candidate.avatar_deleted',
  'candidate.job_applied',
  'candidate.job_matched',
  'candidate.job_unmatched',
  'candidate.transition_created',
  'candidate.transition_updated',
  'candidate.transition_deleted',
  
  // Position Events
  'position.created',
  'position.updated',
  'position.deleted',
  'position.assigned',
  'position.unassigned',
  'position.imported',
  'position.exported',
  'position.bulk_updated',
  'position.bulk_deleted',
  'position.candidate_added',
  'position.candidate_removed',
  'position.stage_created',
  'position.stage_updated',
  'position.stage_deleted',
  'position.stage_reordered',
  
  // User Events
  'user.created',
  'user.updated',
  'user.deleted',
  'user.logged_in',
  'user.logged_out',
  'user.password_changed',
  'user.password_reset',
  'user.api_key_generated',
  'user.api_key_revoked',
  'user.group_assigned',
  'user.group_removed',
  'user.permission_granted',
  'user.permission_revoked',
  'user.preferences_updated',
  
  // Resume Events
  'resume.uploaded',
  'resume.processed',
  'resume.deleted',
  'resume.parsed',
  'resume.analysis_completed',
  'resume.extraction_failed',
  'resume.conversion_failed',
  'resume.storage_updated',
  
  // Comment Events
  'comment.created',
  'comment.updated',
  'comment.deleted',
  'comment.replied_to',
  'comment.mentioned_user',
  
  // Upload Queue Events
  'upload_queue.created',
  'upload_queue.processing',
  'upload_queue.completed',
  'upload_queue.failed',
  'upload_queue.retry',
  'upload_queue.cancelled',
  'upload_queue.paused',
  'upload_queue.resumed',
  'upload_queue.bulk_upload_started',
  'upload_queue.bulk_upload_completed',
  
  // File Events
  'file.uploaded',
  'file.downloaded',
  'file.deleted',
  'file.processed',
  'file.conversion_started',
  'file.conversion_completed',
  'file.conversion_failed',
  
  // System Events
  'system.startup',
  'system.shutdown',
  'system.maintenance_started',
  'system.maintenance_completed',
  'system.backup_started',
  'system.backup_completed',
  'system.backup_failed',
  'system.alert',
  'system.warning',
  'system.error',
  'system.info',
  'system.audit_log_created',
  'system.settings_updated',
  'system.database_migrated',
  'system.cache_cleared',
  
  // Authentication Events
  'auth.login_success',
  'auth.login_failed',
  'auth.logout',
  'auth.session_expired',
  'auth.password_reset_requested',
  'auth.password_reset_completed',
  'auth.account_locked',
  'auth.account_unlocked',
  'auth.mfa_enabled',
  'auth.mfa_disabled',
  'auth.mfa_challenge',
  'auth.mfa_success',
  'auth.mfa_failed',
  
  // Webhook Events
  'webhook.created',
  'webhook.updated',
  'webhook.deleted',
  'webhook.test',
  'webhook.dispatched',
  'webhook.success',
  'webhook.failed',
  'webhook.retry',
  'webhook.rate_limited',
  'webhook.timeout',
  
  // Notification Events (for webhook-based notifications)
  'notification.created',
  'notification.sent',
  'notification.delivered',
  'notification.failed',
  'notification.read',
  'notification.bulk_sent',
  
  // Data Model Events
  'data_model.created',
  'data_model.updated',
  'data_model.deleted',
  'data_model.field_added',
  'data_model.field_updated',
  'data_model.field_deleted',
  'data_model.field_reordered',
  
  // Custom Field Events
  'custom_field.created',
  'custom_field.updated',
  'custom_field.deleted',
  'custom_field.value_set',
  'custom_field.value_updated',
  'custom_field.value_deleted',
  
  // User Group Events
  'user_group.created',
  'user_group.updated',
  'user_group.deleted',
  'user_group.user_added',
  'user_group.user_removed',
  'user_group.permission_granted',
  'user_group.permission_revoked',
  
  // API Events
  'api.request',
  'api.response',
  'api.error',
  'api.rate_limited',
  'api.key_generated',
  'api.key_revoked',
  'api.key_used',
  'api.endpoint_hit',
  
  // Real-time Events
  'realtime.connection_established',
  'realtime.connection_closed',
  'realtime.message_sent',
  'realtime.presence_updated',
  'realtime.collaboration_started',
  'realtime.collaboration_ended',
  'realtime.typing_started',
  'realtime.typing_stopped',
  
  // Task Events
  'task.created',
  'task.updated',
  'task.deleted',
  'task.assigned',
  'task.unassigned',
  'task.completed',
  'task.reopened',
  'task.due_date_changed',
  'task.priority_changed',
  'task.bulk_created',
  'task.bulk_updated',
  'task.bulk_deleted',
  
  // Log Events
  'log.created',
  'log.updated',
  'log.deleted',
  'log.exported',
  'log.archived',
  'log.retention_policy_applied',
  
  // Export/Import Events
  'export.started',
  'export.completed',
  'export.failed',
  'export.downloaded',
  'import.started',
  'import.completed',
  'import.failed',
  'import.validation_error',
  'import.duplicate_found',
  
  // Search Events
  'search.performed',
  'search.filter_applied',
  'search.sort_changed',
  'search.advanced_search',
  'search.saved',
  'search.loaded',
  'search.exported',
  
  // Analytics Events
  'analytics.page_viewed',
  'analytics.feature_used',
  'analytics.report_generated',
  'analytics.dashboard_viewed',
  'analytics.metric_calculated',
  'analytics.insight_discovered'
];

const EVENT_CATEGORIES = {
  'Candidates': [
    'candidate.created', 'candidate.updated', 'candidate.deleted', 'candidate.stage_changed',
    'candidate.assigned', 'candidate.unassigned', 'candidate.imported', 'candidate.exported',
    'candidate.bulk_updated', 'candidate.bulk_deleted', 'candidate.comment_added',
    'candidate.comment_updated', 'candidate.comment_deleted', 'candidate.resume_uploaded',
    'candidate.resume_processed', 'candidate.resume_deleted', 'candidate.avatar_uploaded',
    'candidate.avatar_deleted', 'candidate.job_applied', 'candidate.job_matched',
    'candidate.job_unmatched', 'candidate.transition_created', 'candidate.transition_updated',
    'candidate.transition_deleted'
  ],
  'Positions': [
    'position.created', 'position.updated', 'position.deleted', 'position.assigned',
    'position.unassigned', 'position.imported', 'position.exported', 'position.bulk_updated',
    'position.bulk_deleted', 'position.candidate_added', 'position.candidate_removed',
    'position.stage_created', 'position.stage_updated', 'position.stage_deleted',
    'position.stage_reordered'
  ],
  'Users': [
    'user.created', 'user.updated', 'user.deleted', 'user.logged_in', 'user.logged_out',
    'user.password_changed', 'user.password_reset', 'user.api_key_generated',
    'user.api_key_revoked', 'user.group_assigned', 'user.group_removed',
    'user.permission_granted', 'user.permission_revoked', 'user.preferences_updated'
  ],
  'Resumes': [
    'resume.uploaded', 'resume.processed', 'resume.deleted', 'resume.parsed',
    'resume.analysis_completed', 'resume.extraction_failed', 'resume.conversion_failed',
    'resume.storage_updated'
  ],
  'Comments': [
    'comment.created', 'comment.updated', 'comment.deleted', 'comment.replied_to',
    'comment.mentioned_user'
  ],
  'Upload Queue': [
    'upload_queue.created', 'upload_queue.processing', 'upload_queue.completed',
    'upload_queue.failed', 'upload_queue.retry', 'upload_queue.cancelled',
    'upload_queue.paused', 'upload_queue.resumed', 'upload_queue.bulk_upload_started',
    'upload_queue.bulk_upload_completed'
  ],
  'Files': [
    'file.uploaded', 'file.downloaded', 'file.deleted', 'file.processed',
    'file.conversion_started', 'file.conversion_completed', 'file.conversion_failed'
  ],
  'System': [
    'system.startup', 'system.shutdown', 'system.maintenance_started',
    'system.maintenance_completed', 'system.backup_started', 'system.backup_completed',
    'system.backup_failed', 'system.alert', 'system.warning', 'system.error',
    'system.info', 'system.audit_log_created', 'system.settings_updated',
    'system.database_migrated', 'system.cache_cleared'
  ],
  'Authentication': [
    'auth.login_success', 'auth.login_failed', 'auth.logout', 'auth.session_expired',
    'auth.password_reset_requested', 'auth.password_reset_completed', 'auth.account_locked',
    'auth.account_unlocked', 'auth.mfa_enabled', 'auth.mfa_disabled', 'auth.mfa_challenge',
    'auth.mfa_success', 'auth.mfa_failed'
  ],
  'Webhooks': [
    'webhook.created', 'webhook.updated', 'webhook.deleted', 'webhook.test',
    'webhook.dispatched', 'webhook.success', 'webhook.failed', 'webhook.retry',
    'webhook.rate_limited', 'webhook.timeout'
  ],
  'Notifications': [
    'notification.created', 'notification.sent', 'notification.delivered',
    'notification.failed', 'notification.read', 'notification.bulk_sent'
  ],
  'Data Models': [
    'data_model.created', 'data_model.updated', 'data_model.deleted',
    'data_model.field_added', 'data_model.field_updated', 'data_model.field_deleted',
    'data_model.field_reordered'
  ],
  'Custom Fields': [
    'custom_field.created', 'custom_field.updated', 'custom_field.deleted',
    'custom_field.value_set', 'custom_field.value_updated', 'custom_field.value_deleted'
  ],
  'User Groups': [
    'user_group.created', 'user_group.updated', 'user_group.deleted',
    'user_group.user_added', 'user_group.user_removed', 'user_group.permission_granted',
    'user_group.permission_revoked'
  ],
  'API': [
    'api.request', 'api.response', 'api.error', 'api.rate_limited',
    'api.key_generated', 'api.key_revoked', 'api.key_used', 'api.endpoint_hit'
  ],
  'Real-time': [
    'realtime.connection_established', 'realtime.connection_closed', 'realtime.message_sent',
    'realtime.presence_updated', 'realtime.collaboration_started', 'realtime.collaboration_ended',
    'realtime.typing_started', 'realtime.typing_stopped'
  ],
  'Tasks': [
    'task.created', 'task.updated', 'task.deleted', 'task.assigned', 'task.unassigned',
    'task.completed', 'task.reopened', 'task.due_date_changed', 'task.priority_changed',
    'task.bulk_created', 'task.bulk_updated', 'task.bulk_deleted'
  ],
  'Logs': [
    'log.created', 'log.updated', 'log.deleted', 'log.exported', 'log.archived',
    'log.retention_policy_applied'
  ],
  'Export/Import': [
    'export.started', 'export.completed', 'export.failed', 'export.downloaded',
    'import.started', 'import.completed', 'import.failed', 'import.validation_error',
    'import.duplicate_found'
  ],
  'Search': [
    'search.performed', 'search.filter_applied', 'search.sort_changed',
    'search.advanced_search', 'search.saved', 'search.loaded', 'search.exported'
  ],
  'Analytics': [
    'analytics.page_viewed', 'analytics.feature_used', 'analytics.report_generated',
    'analytics.dashboard_viewed', 'analytics.metric_calculated', 'analytics.insight_discovered'
  ]
};

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

  // Ensure all state is properly initialized
  useEffect(() => {
    try {
      // Initialize with empty arrays/objects to prevent undefined values
      setWebhooks([]);
      setCustomHeaders([]);
      fetchWebhooks();
    } catch (err) {
      console.error('Error initializing WebhookManagement:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize component');
      setLoading(false);
    }
  }, []);

  // If there's an error, show error UI
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

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/settings/webhooks');
      if (response.ok) {
        const data = await response.json();
        // Ensure webhooks are properly sanitized
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
    
    // Convert headers object to array for editing
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
      showSuccess('Webhook ID copied to clipboard');
    } catch (error) {
      showError('Failed to copy to clipboard');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchWebhookLogs = async (webhookId: string, page: number = 1, filter: string = 'all', search: string = '') => {
    try {
      setLogsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
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
      console.error('Error fetching webhook logs:', error);
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
      fetchWebhookLogs(webhook.id);
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
      const response = await fetch(`/api/settings/webhooks/${selectedWebhookForLogs.id}/logs/export`);
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
        showSuccess('Logs exported successfully');
      } else {
        showError('Failed to export logs');
      }
    } catch (error) {
      console.error('Error exporting logs:', error);
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
        showError('Failed to fetch webhook analytics');
      }
    } catch (error) {
      console.error('Error fetching webhook analytics:', error);
      showError('Failed to fetch webhook analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch analytics on component mount
  useEffect(() => {
    fetchWebhookAnalytics();
  }, []);

  const testWebhook = async () => {
    if (!selectedWebhookForTest) return;
    
    try {
      setTestLoading(true);
      setTestResult(null);
      
      let payload;
      try {
        payload = JSON.parse(testPayload);
      } catch (error) {
        showError('Invalid JSON payload');
        return;
      }

      const response = await fetch(`/api/settings/webhooks/${selectedWebhookForTest.id}/health`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testPayload: payload })
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult(result);
        showSuccess('Webhook test completed');
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to test webhook');
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      showError('Failed to test webhook');
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestDialogOpen = (webhook: Webhook | null) => {
    setSelectedWebhookForTest(webhook);
    setTestResult(null);
    if (webhook) {
      setTestPayload('{\n  "test": true,\n  "timestamp": "' + new Date().toISOString() + '",\n  "webhook_name": "' + webhook.name + '"\n}');
    }
  };

  const handleWebhookSelection = (webhookId: string, selected: boolean) => {
    // Ensure selectedWebhooks is always a Set
    const currentSelection = selectedWebhooks instanceof Set ? selectedWebhooks : new Set();
    const newSelection = new Set(currentSelection);
    
    if (selected) {
      newSelection.add(webhookId);
    } else {
      newSelection.delete(webhookId);
    }
    setSelectedWebhooks(newSelection);
  };

  const handleSelectAll = () => {
    // Ensure selectedWebhooks is always a Set
    const currentSelection = selectedWebhooks instanceof Set ? selectedWebhooks : new Set();
    
    if (currentSelection.size === webhooks.length) {
      setSelectedWebhooks(new Set());
    } else {
      setSelectedWebhooks(new Set(webhooks.map(w => w.id)));
    }
  };

  const performBulkAction = async () => {
    // Ensure selectedWebhooks is always a Set
    const currentSelection = selectedWebhooks instanceof Set ? selectedWebhooks : new Set();
    
    if (!bulkAction || currentSelection.size === 0) return;

    try {
      setBulkLoading(true);
      const webhookIds = Array.from(currentSelection);

      let endpoint = '';
      let method = 'POST';
      let body = { webhook_ids: webhookIds };

      switch (bulkAction) {
        case 'enable':
          endpoint = '/api/settings/webhooks/bulk-action';
          body = { ...body, action: 'enable' };
          break;
        case 'disable':
          endpoint = '/api/settings/webhooks/bulk-action';
          body = { ...body, action: 'disable' };
          break;
        case 'delete':
          endpoint = '/api/settings/webhooks/bulk-action';
          body = { ...body, action: 'delete' };
          method = 'DELETE';
          break;
        case 'test':
          endpoint = '/api/settings/webhooks/bulk-test';
          break;
        default:
          return;
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const result = await response.json();
        showSuccess(`Bulk action completed: ${result.message}`);
        setSelectedWebhooks(new Set());
        setBulkAction('');
        fetchWebhooks(); // Refresh the list
      } else {
        const error = await response.json();
        showError(error.error || 'Bulk action failed');
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      showError('Bulk action failed');
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
        a.download = `webhooks-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccess('Webhooks exported successfully');
      } else {
        showError('Failed to export webhooks');
      }
    } catch (error) {
      console.error('Error exporting webhooks:', error);
      showError('Failed to export webhooks');
    }
  };

  // Helper functions to safely access Set properties
  const getSelectedCount = () => {
    return selectedWebhooks instanceof Set ? selectedWebhooks.size : 0;
  };

  const isSelected = (webhookId: string) => {
    return selectedWebhooks instanceof Set ? selectedWebhooks.has(webhookId) : false;
  };

  const isAllSelected = () => {
    return selectedWebhooks instanceof Set ? selectedWebhooks.size === webhooks.length && webhooks.length > 0 : false;
  };

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
              // Test all active webhooks
              const activeWebhooks = webhooks.filter(w => w.is_active);
              if (activeWebhooks.length === 0) {
                showError('No active webhooks to test');
                return;
              }
              // Use the first active webhook for testing
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
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ExternalLink className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold">
                    {editingWebhook ? 'Edit Webhook' : 'Create New Webhook'}
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    Configure webhook settings to receive real-time notifications about application events.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Webhook Name - Moved to Top */}
              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-4 bg-muted/30 border-b">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span>Webhook Name</span>
                  </CardTitle>
                  <CardDescription>
                    Give your webhook a descriptive name to identify it in your dashboard.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-medium text-foreground">
                      Webhook Name
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Slack Notifications, CRM Integration, Email Alerts"
                      className="h-12 bg-background border-border text-lg"
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Choose a descriptive name that helps you identify this webhook's purpose.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Side-by-side Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side - Events Section */}
                <Card className="border border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                      <span>Event Selection</span>
                    </CardTitle>
                    <CardDescription>
                      Choose which application events should trigger this webhook notification.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Quick Selection Controls */}
                    <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allEvents = Object.values(EVENT_CATEGORIES).flat();
                            setFormData(prev => ({ ...prev, events: allEvents }));
                          }}
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
                      <Badge variant="secondary" className="text-xs">
                        {formData.events.length} selected
                      </Badge>
                    </div>

                    {/* Search Input */}
                    <div className="p-4 border-b">
                      <div className="relative">
                        <Input
                          placeholder="Search events..."
                          className="pr-8"
                          onChange={(e) => {
                            // Filter logic can be added here if needed
                          }}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable Event Groups */}
                    <div className="h-[400px] overflow-y-auto">
                      {Object.entries(EVENT_CATEGORIES).map(([category, events]) => (
                        <div key={category} className="border-b border-border last:border-b-0">
                          {/* Category Header */}
                          <div className="sticky top-0 bg-background border-b border-border/50 px-4 py-2 z-10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-semibold text-foreground capitalize">
                                  {category.toLowerCase()}
                                </h4>
                                <Badge variant="outline" className="text-xs">
                                  {events.length}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-muted-foreground">
                                  {formData.events.filter(e => events.includes(e)).length}/{events.length}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const categoryEvents = formData.events.filter(e => !events.includes(e));
                                    const newEvents = [...categoryEvents, ...events];
                                    setFormData(prev => ({ ...prev, events: newEvents }));
                                  }}
                                  className="h-5 px-1 text-xs"
                                >
                                  All
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const categoryEvents = formData.events.filter(e => !events.includes(e));
                                    setFormData(prev => ({ ...prev, events: categoryEvents }));
                                  }}
                                  className="h-5 px-1 text-xs"
                                >
                                  Clear
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Event Options */}
                          <div className="divide-y divide-border/50">
                            {events.map(event => (
                              <div key={event} className="group">
                                <label className="flex items-center space-x-3 p-3 hover:bg-muted/30 transition-colors cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.events.includes(event)}
                                    onChange={() => toggleEvent(event)}
                                    className="rounded border-2 border-primary/30 focus:ring-2 focus:ring-primary text-green-500 checked:bg-green-500 checked:border-green-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-foreground">
                                        {event.replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                      </span>
                                      <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                                        {event.split('.')[0]}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Triggered when {event.split('.')[0]} {event.split('.')[1]}
                                    </p>
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Selected Events Summary */}
                    {formData.events.length > 0 && (
                      <div className="p-4 border-t bg-muted/20">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            Selected Events ({formData.events.length})
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {formData.events.slice(0, 5).map(event => (
                            <Badge key={event} variant="secondary" className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                              {event}
                            </Badge>
                          ))}
                          {formData.events.length > 5 && (
                            <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-500/30">
                              +{formData.events.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Right Side - Postman-like Interface */}
                <Card className="border border-border shadow-sm">
                  <CardHeader className="pb-4 bg-muted/30 border-b">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <ExternalLink className="h-5 w-5 text-orange-500" />
                      <span>Webhook Configuration</span>
                    </CardTitle>
                    <CardDescription>
                      Configure your webhook endpoint with a Postman-like interface
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Request Line */}
                    <div className="flex items-center space-x-2 p-4 border-b bg-card">
                      <Select
                        value={formData.method}
                        onValueChange={(value: 'GET' | 'POST' | 'PUT' | 'PATCH') => 
                          setFormData(prev => ({ ...prev, method: value }))
                        }
                      >
                        <SelectTrigger className="w-24 h-10 bg-muted border-border">
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
                        value={formData.url}
                        onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="https://your-domain.com/webhook-endpoint"
                        className="flex-1 h-10 bg-background border-border"
                        required
                      />
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                        />
                        <Label htmlFor="is_active" className="text-sm font-medium">Active</Label>
                      </div>
                    </div>

                    {/* Postman Tabs */}
                    <Tabs defaultValue="headers" className="w-full">
                      <TabsList className="w-full h-12 bg-muted border-b rounded-none">
                        <TabsTrigger value="headers" className="flex-1 data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-orange-500">Headers</TabsTrigger>
                        <TabsTrigger value="auth" className="flex-1 data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-orange-500">Auth</TabsTrigger>
                        <TabsTrigger value="settings" className="flex-1 data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-orange-500">Settings</TabsTrigger>
                      </TabsList>

                      {/* Headers Tab */}
                      <TabsContent value="headers" className="p-6 space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-foreground">Custom Headers</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addCustomHeader} className="h-8">
                              <Plus className="mr-2 h-3 w-3" />
                              Add Header
                            </Button>
                          </div>
                          
                          {customHeaders.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-muted/30">
                              <p className="text-sm">No custom headers added</p>
                              <p className="text-xs">Click "Add Header" to include custom HTTP headers</p>
                            </div>
                          )}
                          
                          {customHeaders.map((header, index) => (
                            <div key={index} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border border-border">
                              <Input
                                placeholder="Header name (e.g., X-Custom-Header)"
                                value={header.key}
                                onChange={(e) => updateCustomHeader(index, 'key', e.target.value)}
                                className="flex-1 h-10 bg-background border-border"
                              />
                              <Input
                                placeholder="Header value"
                                value={header.value}
                                onChange={(e) => updateCustomHeader(index, 'value', e.target.value)}
                                className="flex-1 h-10 bg-background border-border"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeCustomHeader(index)}
                                className="h-10 w-10 p-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      {/* Auth Tab */}
                      <TabsContent value="auth" className="p-6 space-y-6">
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-foreground">Authentication Type</Label>
                            <Select
                              value={formData.auth_type}
                              onValueChange={(value: 'none' | 'basic' | 'bearer' | 'header') => 
                                setFormData(prev => ({ ...prev, auth_type: value }))
                              }
                            >
                              <SelectTrigger className="h-11 bg-background border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Authentication</SelectItem>
                                <SelectItem value="basic">Basic Authentication</SelectItem>
                                <SelectItem value="bearer">Bearer Token</SelectItem>
                                <SelectItem value="header">Custom Header</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Choose the authentication method that matches your endpoint's security requirements.
                            </p>
                          </div>

                          {formData.auth_type === 'basic' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                              <div className="space-y-3">
                                <Label htmlFor="auth_username" className="text-sm font-medium text-foreground">Username</Label>
                                <Input
                                  id="auth_username"
                                  value={formData.auth_username || ''}
                                  onChange={(e) => setFormData(prev => ({ ...prev, auth_username: e.target.value }))}
                                  placeholder="Enter username"
                                  className="h-11 bg-background border-border"
                                />
                              </div>
                              <div className="space-y-3">
                                <Label htmlFor="auth_password" className="text-sm font-medium text-foreground">Password</Label>
                                <Input
                                  id="auth_password"
                                  type="password"
                                  value={formData.auth_password || ''}
                                  onChange={(e) => setFormData(prev => ({ ...prev, auth_password: e.target.value }))}
                                  placeholder="Enter password"
                                  className="h-11 bg-background border-border"
                                />
                              </div>
                            </div>
                          )}

                          {formData.auth_type === 'bearer' && (
                            <div className="space-y-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                              <Label htmlFor="auth_token" className="text-sm font-medium text-foreground">Bearer Token</Label>
                              <Input
                                id="auth_token"
                                type="password"
                                value={formData.auth_token || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, auth_token: e.target.value }))}
                                placeholder="Enter bearer token"
                                className="h-11 bg-background border-border"
                              />
                              <p className="text-xs text-muted-foreground">
                                The token will be sent in the Authorization header as "Bearer [your-token]".
                              </p>
                            </div>
                          )}

                          {formData.auth_type === 'header' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                              <div className="space-y-3">
                                <Label htmlFor="auth_header_name" className="text-sm font-medium text-foreground">Header Name</Label>
                                <Input
                                  id="auth_header_name"
                                  value={formData.auth_header_name || ''}
                                  onChange={(e) => setFormData(prev => ({ ...prev, auth_header_name: e.target.value }))}
                                  placeholder="X-API-Key"
                                  className="h-11 bg-background border-border"
                                />
                              </div>
                              <div className="space-y-3">
                                <Label htmlFor="auth_header_value" className="text-sm font-medium text-foreground">Header Value</Label>
                                <Input
                                  id="auth_header_value"
                                  type="password"
                                  value={formData.auth_header_value || ''}
                                  onChange={(e) => setFormData(prev => ({ ...prev, auth_header_value: e.target.value }))}
                                  placeholder="Enter header value"
                                  className="h-11 bg-background border-border"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* Settings Tab */}
                      <TabsContent value="settings" className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label htmlFor="retry_count" className="text-sm font-medium text-foreground">Retry Attempts</Label>
                            <Input
                              id="retry_count"
                              type="number"
                              min="0"
                              max="10"
                              value={formData.retry_count}
                              onChange={(e) => setFormData(prev => ({ ...prev, retry_count: parseInt(e.target.value) }))}
                              className="h-11 bg-background border-border"
                            />
                            <p className="text-xs text-muted-foreground">
                              Number of retry attempts if delivery fails (0-10).
                            </p>
                          </div>

                          <div className="space-y-3">
                            <Label htmlFor="timeout" className="text-sm font-medium text-foreground">Timeout (seconds)</Label>
                            <Input
                              id="timeout"
                              type="number"
                              min="5"
                              max="300"
                              value={formData.timeout}
                              onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                              className="h-11 bg-background border-border"
                            />
                            <p className="text-xs text-muted-foreground">
                              Request timeout in seconds (5-300).
                            </p>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter className="pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => handleDialogOpen(false)} className="h-11 px-6">
                  Cancel
                </Button>
                <Button type="submit" className="h-11 px-6">
                  {editingWebhook ? 'Update Webhook' : 'Create Webhook'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Analytics Section */}
      {webhookAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{webhookAnalytics.totalWebhooks}</div>
              <p className="text-xs text-muted-foreground">
                {webhookAnalytics.activeWebhooks} active
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {webhookAnalytics.successRate ? `${webhookAnalytics.successRate.toFixed(1)}%` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 24 hours
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {webhookAnalytics.avgResponseTime ? `${webhookAnalytics.avgResponseTime.toFixed(0)}ms` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 24 hours
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{webhookAnalytics.totalDeliveries}</div>
              <p className="text-xs text-muted-foreground">
                Last 24 hours
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Webhooks Table */}
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
          {/* Bulk Actions */}
          {selectedWebhooks.size > 0 && (
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">
                    {getSelectedCount()} webhook{getSelectedCount() !== 1 ? 's' : ''} selected
                  </span>
                  <Select value={bulkAction} onValueChange={setBulkAction}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enable">Enable</SelectItem>
                      <SelectItem value="disable">Disable</SelectItem>
                      <SelectItem value="test">Test All</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={performBulkAction} 
                    disabled={!bulkAction || bulkLoading}
                    size="sm"
                  >
                    {bulkLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedWebhooks(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected()}
                    onCheckedChange={handleSelectAll}
                    className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 data-[state=checked]:text-white"
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
                      className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 data-[state=checked]:text-white"
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

      {/* Webhook Logs Dialog */}
      {selectedWebhookForLogs && selectedWebhookForLogs.id && selectedWebhookForLogs.name && (
        <Dialog open={!!selectedWebhookForLogs} onOpenChange={() => handleLogsDialogOpen(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Webhook Logs - {selectedWebhookForLogs.name}</span>
                <Button onClick={exportLogs} variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </DialogTitle>
              <DialogDescription>
                View delivery history and response details for this webhook.
              </DialogDescription>
            </DialogHeader>
            
            {/* Logs Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="logs-filter" className="text-sm font-medium">Filter:</Label>
                    <Select value={logsFilter} onValueChange={(value: 'all' | 'success' | 'failed') => handleLogsFilterChange(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="logs-search" className="text-sm font-medium">Search:</Label>
                    <Input
                      id="logs-search"
                      placeholder="Search logs..."
                      value={logsSearch}
                      onChange={(e) => handleLogsSearch(e.target.value)}
                      className="w-64"
                    />
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {logsTotal} total logs
                </div>
              </div>

              {/* Logs Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span>Loading logs...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : webhookLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      webhookLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {formatDate(log.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {log.event_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.success ? 'default' : 'destructive'} className="text-xs">
                              {log.success ? 'Success' : 'Failed'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.response_status ? (
                              <span className={`text-sm ${log.response_status >= 200 && log.response_status < 300 ? 'text-green-600' : 'text-red-600'}`}>
                                {log.response_status}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {log.duration_ms}ms
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {log.error_message ? (
                              <span className="text-sm text-red-600 truncate block" title={log.error_message}>
                                {log.error_message}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const payload = JSON.stringify(log.payload, null, 2);
                                navigator.clipboard.writeText(payload);
                                showSuccess('Payload copied to clipboard');
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {logsTotal > 20 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((logsPage - 1) * 20) + 1} to {Math.min(logsPage * 20, logsTotal)} of {logsTotal} logs
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLogsPageChange(logsPage - 1)}
                      disabled={logsPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {logsPage} of {Math.ceil(logsTotal / 20)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLogsPageChange(logsPage + 1)}
                      disabled={logsPage >= Math.ceil(logsTotal / 20)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Webhook Test Dialog */}
      {selectedWebhookForTest && (
        <Dialog open={!!selectedWebhookForTest} onOpenChange={() => handleTestDialogOpen(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Test Webhook - {selectedWebhookForTest.name}</DialogTitle>
              <DialogDescription>
                Send a test payload to verify your webhook configuration and see detailed results.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Test Payload Editor */}
              <div className="space-y-2">
                <Label htmlFor="test-payload">Test Payload (JSON)</Label>
                <Textarea
                  id="test-payload"
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  placeholder="Enter JSON payload..."
                  className="font-mono text-sm h-32"
                />
                <p className="text-xs text-muted-foreground">
                  This payload will be sent to your webhook URL for testing.
                </p>
              </div>

              {/* Test Button */}
              <Button 
                onClick={testWebhook} 
                disabled={testLoading}
                className="w-full"
              >
                {testLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Testing Webhook...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Test Webhook
                  </>
                )}
              </Button>

              {/* Test Results */}
              {testResult && (
                <div className="space-y-4">
                  <Separator />
                  <h3 className="text-lg font-semibold">Test Results</h3>
                  
                  {/* Health Check Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Health Check</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Status:</span>
                          <Badge variant={testResult.health_check.success ? 'default' : 'destructive'}>
                            {testResult.health_check.success ? 'Success' : 'Failed'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Response Code:</span>
                          <span className="text-sm font-mono">
                            {testResult.health_check.status || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Duration:</span>
                          <span className="text-sm">
                            {testResult.health_check.duration_ms}ms
                          </span>
                        </div>
                        {testResult.health_check.error_message && (
                          <div className="text-sm text-red-600">
                            Error: {testResult.health_check.error_message}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">24h Statistics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Success Rate:</span>
                          <span className="text-sm font-semibold">
                            {testResult.statistics.success_rate_24h.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total Attempts:</span>
                          <span className="text-sm">
                            {testResult.statistics.total_attempts_24h}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Avg Response Time:</span>
                          <span className="text-sm">
                            {testResult.statistics.avg_response_time_24h.toFixed(0)}ms
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Response Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Response Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Response Headers */}
                      <div>
                        <Label className="text-sm font-medium">Response Headers</Label>
                        <div className="mt-2 p-3 bg-muted rounded-md">
                          <pre className="text-xs overflow-x-auto">
                            {Object.entries(testResult.health_check.response_headers || {})
                              .map(([key, value]) => `${key}: ${value}`)
                              .join('\n') || 'No headers received'}
                          </pre>
                        </div>
                      </div>

                      {/* Response Body */}
                      <div>
                        <Label className="text-sm font-medium">Response Body</Label>
                        <div className="mt-2 p-3 bg-muted rounded-md">
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                            {testResult.health_check.response_body || 'No response body'}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Configuration Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Method:</span>
                          <div className="font-mono">{testResult.configuration.method}</div>
                        </div>
                        <div>
                          <span className="font-medium">Timeout:</span>
                          <div>{testResult.configuration.timeout}s</div>
                        </div>
                        <div>
                          <span className="font-medium">Retry Count:</span>
                          <div>{testResult.configuration.retry_count}</div>
                        </div>
                        <div>
                          <span className="font-medium">Auth Type:</span>
                          <div className="capitalize">{testResult.configuration.auth_type || 'None'}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 