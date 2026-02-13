"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ClockIcon as Clock, ArrowPathIcon as Loader2, CheckCircleIcon as CheckCircle, XCircleIcon as XCircle, MagnifyingGlassIcon as Search, FunnelIcon as Filter, ExclamationCircleIcon as AlertCircle, InformationCircleIcon as Info, ArrowUpTrayIcon as Upload, DocumentTextIcon as FileText, UsersIcon as Users, CalendarIcon as CalendarIcon, EllipsisHorizontalIcon as MoreHorizontal, EllipsisVerticalIcon as MoreVertical, PlayIcon as Play, XMarkIcon as X, TrashIcon as Trash2, EyeIcon as Eye, ArrowUturnLeftIcon as RotateCcw, CheckBadgeIcon as CheckSquare, Square2StackIcon as Square, ChevronLeftIcon as ChevronLeft, ChevronRightIcon as ChevronRight, ChevronUpIcon as ChevronUp, ChevronDownIcon as ChevronDown, ArrowPathIcon as RefreshCw, PhotoIcon as ImageIcon } from '@heroicons/react/24/outline';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';
import { ExpandablePayload } from '@/components/ui/ExpandablePayload';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { useSharedSSE } from '@/hooks/use-shared-sse';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { safeGetDateFromRange } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { convertMinIOUrlToSecureUrl } from '@/lib/imageUtils';

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
  source_logo?: string;
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
  total_applicants?: number;
  processed_applicants?: number;
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

export default function ApplicantImportUploadQueue() {
  const [queueData, setQueueData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [dateFilterType, setDateFilterType] = useState<'create' | 'process' | 'complete'>('create');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [positions, setPositions] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'none' | 'partial' | 'all'>('none');
  const [selectedFile, setSelectedFile] = useState<{
    fileName: string;
    url: string;
    label?: string;
    updatedAt?: string;
    fileSize?: number | string;
  } | null>(null);
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);
  const [sortField, setSortField] = useState<string>('upload_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [positionSearchTerm, setPositionSearchTerm] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sourceSearchTerm, setSourceSearchTerm] = useState<string>('');
  const [availableSources, setAvailableSources] = useState<Array<{ id: string; name: string; logo?: string }>>([]);
  const [openSelect, setOpenSelect] = useState<string | null>(null);

  // Use shared SSE hook for realtime updates
  const { isConnected: realtimeConnected, subscribeToEvents } = useSharedSSE();

  // SSE connection status display

  const fetchPositions = useCallback(async () => {
    try {
      const response = await fetch('/api/positions?limit=1000');
      if (response.ok) {
        const data = await response.json();
        setPositions(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const response = await fetch('/api/Applicant-sources');
      if (response.ok) {
        const data = await response.json();
        // The API returns an array directly, not wrapped in a data property
        setAvailableSources(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    }
  }, []);

  const fetchQueue = useCallback(async (currentPage = 1, currentPageSize = 10) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        limit: currentPageSize.toString(),
        offset: ((currentPage - 1) * currentPageSize).toString(),
        ...(searchTerm && { file_name: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(positionFilter !== 'all' && { position_id: positionFilter }),
        ...(sourceFilter !== 'all' && { source_id: sourceFilter }),
        sort_field: sortField,
        sort_direction: sortDirection || ''
      });

      // Handle dateRange based on selected filter type
      const fromDate = safeGetDateFromRange(dateRange, 'from');
      const toDate = safeGetDateFromRange(dateRange, 'to');

      if (fromDate) {
        if (dateFilterType === 'create') {
          params.append('date_start', fromDate.toISOString());
        } else if (dateFilterType === 'process') {
          params.append('process_date_start', fromDate.toISOString());
        } else if (dateFilterType === 'complete') {
          params.append('completed_date_start', fromDate.toISOString());
        }
      }
      if (toDate) {
        if (dateFilterType === 'create') {
          params.append('date_end', toDate.toISOString());
        } else if (dateFilterType === 'process') {
          params.append('process_date_end', toDate.toISOString());
        } else if (dateFilterType === 'complete') {
          params.append('completed_date_end', toDate.toISOString());
        }
      }

      const response = await fetch(`/api/upload-queue?${params}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ProcessQueue] API Error ${response.status}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
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
  }, [searchTerm, statusFilter, positionFilter, sourceFilter, dateRange, dateFilterType, sortField, sortDirection]);

  useEffect(() => {
    fetchPositions();
    fetchSources();
  }, [fetchPositions, fetchSources]);

  useEffect(() => {
    fetchQueue(page, pageSize);
  }, [fetchQueue, page, pageSize, sortField, sortDirection]);

  // Update selection mode based on selected items
  useEffect(() => {
    if (!queueData?.data) {
      setSelectionMode('none');
      return;
    }

    const totalItems = queueData.data.length;
    const selectedCount = selectedItems.size;

    if (selectedCount === 0) {
      setSelectionMode('none');
    } else if (selectedCount === totalItems) {
      setSelectionMode('all');
    } else {
      setSelectionMode('partial');
    }
  }, [selectedItems, queueData?.data]);

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

      }

      // Handle upload queue updates
      if (event.type === 'upload_queue_update' || event.type === 'queue') {
        const now = Date.now();

        // Rate limit updates to prevent excessive reloading
        if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) {
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {

          }
          return;
        }

        if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {

        }

        // Clear existing timeout and set new one to prevent rapid successive calls
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }

        refreshTimeout = setTimeout(() => {
          if (mounted) {
            lastUpdateTime = Date.now();

            // Check if SSE event contains actual queue data
            if (event.data?.data && Array.isArray(event.data.data)) {
              // Update queue data directly from SSE (immediate update)

              setQueueData({
                data: event.data.data,
                total: event.data.total || 0,
                summary: event.data.summary || { queued: 0, inprocess: 0, success: 0, error: 0 }
              });
              setLastUpdate(new Date());

              // Show toast notification
              const summary = event.data.summary;
              if (summary) {
                const { queued, inprocess, success, error } = summary;
                toast.success(`Queue updated: ${queued} queued, ${inprocess} processing, ${success} completed, ${error} errors`, {
                  duration: 2000,
                  position: 'top-right',
                  style: {
                    background: '#10b981',
                    color: 'white',
                    fontSize: '12px',
                  }
                });
              }
            } else {
              // Fallback: fetch queue data if SSE doesn't contain data
              if (!loading) {
                fetchQueue(page, pageSize);
                setLastUpdate(new Date());

                // Show toast notification if summary is available
                const summary = event.data?.summary;
                if (summary) {
                  const { queued, inprocess, success, error } = summary;
                  toast.success(`Queue updated: ${queued} queued, ${inprocess} processing, ${success} completed, ${error} errors`, {
                    duration: 2000,
                    position: 'top-right',
                    style: {
                      background: '#10b981',
                      color: 'white',
                      fontSize: '12px',
                    }
                  });
                }
              }
            }
          }
        }, 200); // 200ms debounce for better performance
      }
    });

    return () => {
      mounted = false;
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      unsubscribe();
    };
  }, [subscribeToEvents, loading, page, pageSize, fetchQueue]);

  // Listen for custom refresh events (fallback for upload completion)
  useEffect(() => {
    const handleRefreshEvent = () => {

      fetchQueue(page, pageSize);
      setLastUpdate(new Date());
    };

    window.addEventListener('refreshApplicantQueue', handleRefreshEvent);

    return () => {
      window.removeEventListener('refreshApplicantQueue', handleRefreshEvent);
    };
  }, [fetchQueue, page, pageSize]);

  // Fallback polling when SSE is not connected
  useEffect(() => {
    if (!realtimeConnected) {
      const interval = setInterval(() => {
        fetchQueue(page, pageSize);
        setLastUpdate(new Date());
      }, 10000); // Poll every 10 seconds when SSE is down

      return () => clearInterval(interval);
    }
  }, [realtimeConnected, fetchQueue, page, pageSize]);


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'inprocess': return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'inprocess': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    // Handle null, undefined, NaN, or negative values
    if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) {
      return 'Unknown size';
    }

    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    // Ensure i is within bounds
    const sizeIndex = Math.max(0, Math.min(i, sizes.length - 1));

    return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(2)) + ' ' + sizes[sizeIndex];
  };

  const calculateDuration = (processDate?: string, completedDate?: string) => {
    if (!processDate) return '-';
    const start = new Date(processDate);
    const end = completedDate ? new Date(completedDate) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes % 60}m`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds % 60}s`;
    } else {
      return `${diffSeconds}s`;
    }
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

  const handlePositionFilterChange = (value: string) => {
    setPositionFilter(value);
    setPositionSearchTerm(''); // Clear search when position is selected
    setPage(1);
    fetchQueue(1, pageSize);
  };

  const handleSourceFilterChange = (value: string) => {
    setSourceFilter(value);
    setSourceSearchTerm(''); // Clear search when source is selected
    setPage(1);
    fetchQueue(1, pageSize);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setPage(1);
    fetchQueue(1, pageSize);
  };

  const handleDateFilterTypeChange = (type: 'create' | 'process' | 'complete') => {
    setDateFilterType(type);
    setPage(1);
    fetchQueue(1, pageSize);
  };

  const clearDateRange = () => {
    setDateRange(undefined);
    setPage(1);
    fetchQueue(1, pageSize);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPositionFilter('all');
    setPositionSearchTerm('');
    setSourceFilter('all');
    setSourceSearchTerm('');
    setDateRange(undefined);
    setDateFilterType('create');
    setPage(1);
    fetchQueue(1, pageSize);
  };

  const handleRefresh = () => {
    fetchQueue(page, pageSize);
    setLastUpdate(new Date());
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
    setPage(1);
    fetchQueue(1, pageSize);
  };

  // Queue item actions
  const handleProcess = async (item: QueueItem) => {
    try {
      const response = await fetch(`/api/upload-queue/${item.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      if (response.ok) {
        toast.success('Job queued for processing');
        // Optimistic update
        setQueueData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            data: prev.data.map(i => i.id === item.id ? { ...i, status: 'inprocess' } : i)
          };
        });
        fetchQueue(page, pageSize);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to process job');
      }
    } catch (error) {
      toast.error('Failed to process job');
    }
  };

  const handleRetry = async (item: QueueItem) => {
    try {
      const response = await fetch(`/api/upload-queue/${item.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      if (response.ok) {
        toast.success('Job queued for retry');
        // Optimistic update
        setQueueData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            data: prev.data.map(i => i.id === item.id ? {
              ...i,
              status: 'queued',
              error: undefined,
              error_details: undefined,
              process_date: undefined,
              completed_date: undefined
            } : i)
          };
        });

        // Also update selected item if it's the one being retried
        if (selectedItem && selectedItem.id === item.id) {
          setSelectedItem({
            ...selectedItem,
            status: 'queued',
            error: undefined,
            error_details: undefined,
            process_date: undefined,
            completed_date: undefined
          });
        }

        fetchQueue(page, pageSize);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to retry job');
      }
    } catch (error) {
      toast.error('Failed to retry job');
    }
  };

  const handleCancel = async (item: QueueItem) => {
    try {
      const response = await fetch(`/api/upload-queue/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
        cache: 'no-store'
      });

      if (response.ok) {
        toast.success('Job cancelled');
        // Optimistic update
        setQueueData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            data: prev.data.map(i => i.id === item.id ? { ...i, status: 'failed' } : i) // Usually cancelled shows as failed or cancelled depending on backend, assuming failed/cancelled here based on logic
          };
        });
        fetchQueue(page, pageSize);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to cancel job');
      }
    } catch (error) {
      toast.error('Failed to cancel job');
    }
  };

  const handleDelete = async (item: QueueItem) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      const response = await fetch(`/api/upload-queue/${item.id}`, {
        method: 'DELETE',
        cache: 'no-store'
      });

      if (response.ok) {
        toast.success('Job deleted');
        // Optimistic update
        setQueueData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            data: prev.data.filter(i => i.id !== item.id),
            total: prev.total - 1
          };
        });
        if (selectedItem && selectedItem.id === item.id) {
          setShowDetails(false);
          setSelectedItem(null);
        }
        fetchQueue(page, pageSize);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete job');
      }
    } catch (error) {
      toast.error('Failed to delete job');
    }
  };

  // Enhanced selection handlers
  const handleSelectAll = () => {
    if (!queueData?.data) return;

    if (selectionMode === 'all') {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(queueData.data.map(item => item.id)));
    }
  };

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectByStatus = (status: string) => {
    if (!queueData?.data) return;

    const itemsWithStatus = queueData.data
      .filter(item => item.status === status)
      .map(item => item.id);

    setSelectedItems(new Set(itemsWithStatus));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const performBulkAction = async () => {
    if (!bulkAction || selectedItems.size === 0) return;

    try {
      setBulkLoading(true);
      const itemIds = Array.from(selectedItems);

      const response = await fetch('/api/upload-queue/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: bulkAction, itemIds })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setSelectedItems(new Set());
        setBulkAction('');
        fetchQueue(page, pageSize);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to perform bulk action');
      }
    } catch (error) {
      toast.error('Failed to perform bulk action');
    } finally {
      setBulkLoading(false);
    }
  };

  const canRetry = (item: QueueItem) => ['failed', 'success'].includes(item.status);
  const canCancel = (item: QueueItem) => ['queued', 'inprocess'].includes(item.status);
  const canDelete = (item: QueueItem) => ['success', 'failed', 'cancelled'].includes(item.status);
  const canProcess = (item: QueueItem) => ['queued'].includes(item.status);

  const getSelectionIcon = () => {
    switch (selectionMode) {
      case 'all':
        return <CheckSquare className="h-4 w-4" />;
      case 'partial':
        return <Square className="h-4 w-4" />;
      default:
        return <Square className="h-4 w-4" />;
    }
  };

  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'queued': return 'In Queue';
      case 'inprocess': return 'Processing';
      case 'success': return 'Success';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'queued': return 'secondary';
      case 'inprocess': return 'outline';
      case 'success': return 'success';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => {
    const isActive = sortField === field;
    return (
      <TableHead
        className="font-medium cursor-pointer hover:bg-muted/50 transition-colors select-none group"
        onClick={() => { handleSort(field); setOpenMenu(null); }}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          <DropdownMenu open={openMenu === field} onOpenChange={handleOpenChange(field)}>
            <DropdownMenuTrigger asChild>
              {isActive ? (
                <button
                  type="button"
                  className="text-primary font-bold p-1 rounded hover:bg-muted h-auto w-auto"
                  onClick={() => handleMenuClick(field)}
                  aria-label="Sort options"
                >
                  {sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : sortDirection === 'desc' ? <ChevronDown className="h-4 w-4" /> : <MoreVertical className="h-4 w-4" />}
                </button>
              ) : (
                <button
                  type="button"
                  className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted h-auto w-auto"
                  onClick={() => handleMenuClick(field)}
                  aria-label="Sort options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { handleSort(field, 'asc'); setOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { handleSort(field, 'desc'); setOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { handleSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </TableHead>
    );
  };

  const handleRetryItem = async (itemId: string) => {
    try {


      // Add debugging to check the request
      const response = await fetch(`/api/upload-queue/${itemId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        cache: 'no-store'
      });



      if (response.ok) {
        const result = await response.json();

        toast.success('Job queued for retry');

        // Optimistic update
        setQueueData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            data: prev.data.map(i => i.id === itemId ? {
              ...i,
              status: 'queued',
              error: undefined,
              error_details: undefined,
              process_date: undefined,
              completed_date: undefined
            } : i)
          };
        });

        fetchQueue(page, pageSize);
      } else {
        const error = await response.json();
        console.error(`Retry failed for job ${itemId}:`, error);

        // Show more specific error messages
        if (error.error && error.error.includes('already a queued job with the same file path')) {
          toast.error('Cannot retry: there is already a queued job with the same file. Please wait for the existing job to complete or delete it first.');
        } else if (error.error && error.error.includes('Forbidden')) {
          toast.error('No permission');
        } else {
          toast.error(error.error || 'Failed to retry job');
        }
      }
    } catch (error) {
      console.error(`Retry error for job ${itemId}:`, error);
      toast.error('Failed to retry job');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    try {
      const response = await fetch(`/api/upload-queue/${itemId}`, {
        method: 'DELETE',
        cache: 'no-store'
      });
      if (response.ok) {
        toast.success('Job deleted');
        // Optimistic update
        setQueueData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            data: prev.data.filter(i => i.id !== itemId),
            total: prev.total - 1
          };
        });
        fetchQueue(page, pageSize);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete job');
      }
    } catch (error) {
      toast.error('Failed to delete job');
    }
  };

  const handleFilePreview = (item: QueueItem) => {
    // Use the URL provided by the API (MinIO URL) instead of constructing our own
    const fileUrl = item.url || `/api/upload-queue/${item.id}/file`;

    setSelectedFile({
      fileName: item.file_name,
      url: fileUrl,
      label: 'Upload Queue File',
      updatedAt: item.upload_date,
      fileSize: item.file_size
    });
    setIsFileViewerOpen(true);
  };

  const handleSort = (column: string | null, direction?: 'asc' | 'desc' | null) => {
    if (column === sortField && (direction === null || direction === undefined)) {
      // 3-state toggle: unsorted -> asc -> desc -> unsorted
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        // Clear sort - go back to unsorted (default)
        setSortDirection(null);
      } else {
        // From unsorted (null) to asc
        setSortDirection('asc');
      }
    } else {
      // Set new column and direction (always update even if same values)
      setSortField(column || 'upload_date');
      setSortDirection(direction || 'desc');
    }
    setPage(1);
    // Trigger fetchQueue with updated sort parameters
    fetchQueue(1, pageSize);
  };

  const handleMenuClick = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const handleOpenChange = (menu: string) => (open: boolean) => {
    setOpenMenu(open ? menu : null);
  };

  const handleBulkDelete = async (itemIds: string[]) => {
    if (!confirm('Are you sure you want to delete these jobs?')) return;
    try {
      const response = await fetch('/api/upload-queue/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', itemIds })
      });
      if (response.ok) {
        toast.success('Jobs deleted');
        setSelectedItems(new Set());
        fetchQueue(page, pageSize);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete jobs');
      }
    } catch (error) {
      toast.error('Failed to delete jobs');
    }
  };

  const handleBulkRetry = async (itemIds: string[]) => {
    try {
      const response = await fetch('/api/upload-queue/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', itemIds })
      });
      if (response.ok) {
        const result = await response.json();


        // Show detailed results if available
        if (result.failedDetails && result.failedDetails.length > 0) {
          const failedCount = result.failedDetails.length;
          const successCount = result.successCount || 0;

          if (successCount > 0) {
            toast.success(`${successCount} jobs queued for retry`);
          }

          if (failedCount > 0) {
            const errorMessage = failedCount === 1
              ? `1 job failed to retry: ${result.failedDetails[0].reason}`
              : `${failedCount} jobs failed to retry. Check console for details.`;
            toast.error(errorMessage);
            console.error('Bulk retry failed details:', result.failedDetails);
          }
        } else {
          toast.success('Jobs queued for retry');
        }

        setSelectedItems(new Set());
        fetchQueue(page, pageSize);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to retry jobs');
      }
    } catch (error) {
      console.error('Bulk retry error:', error);
      toast.error('Failed to retry jobs');
    }
  };

  return (
    <div className="h-full flex flex-col">


      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">


          <div className="flex-1 overflow-y-auto space-y-4">

            {/* Summary Cards */}
            {queueData?.summary ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="group relative overflow-hidden border-2 border-gray-200 dark:border-gray-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/50 dark:to-gray-900/50 opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="relative p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{queueData.summary.total}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-500 dark:bg-gray-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                        <span className="text-white text-xs font-bold">T</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="relative p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Queued</p>
                        <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{queueData.summary.queued}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-blue-500 dark:bg-blue-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group relative overflow-hidden border-2 border-yellow-200 dark:border-yellow-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/50 opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="relative p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">Processing</p>
                        <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{queueData.summary.inprocess}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-yellow-500 dark:bg-yellow-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group relative overflow-hidden border-2 border-green-200 dark:border-green-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="relative p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Success</p>
                        <p className="text-2xl font-bold text-green-800 dark:text-green-200">{queueData.summary.success}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-green-500 dark:bg-green-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group relative overflow-hidden border-2 border-red-200 dark:border-red-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="relative p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Error</p>
                        <p className="text-2xl font-bold text-red-800 dark:text-red-200">{queueData.summary.error}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-red-500 dark:bg-red-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                        <XCircle className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="group relative overflow-hidden border-2 border-gray-200 dark:border-gray-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/50 dark:to-gray-900/50 opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="relative p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">0</p>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-500 dark:bg-gray-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                        <span className="text-white text-xs font-bold">T</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="relative p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Queued</p>
                        <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">0</p>
                      </div>
                      <div className="p-2 rounded-lg bg-blue-500 dark:bg-blue-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group relative overflow-hidden border-2 border-yellow-200 dark:border-yellow-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/50 opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="relative p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">Processing</p>
                        <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">0</p>
                      </div>
                      <div className="p-2 rounded-lg bg-yellow-500 dark:bg-yellow-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group relative overflow-hidden border-2 border-green-200 dark:border-green-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="relative p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Success</p>
                        <p className="text-2xl font-bold text-green-800 dark:text-green-200">0</p>
                      </div>
                      <div className="p-2 rounded-lg bg-green-500 dark:bg-green-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group relative overflow-hidden border-2 border-red-200 dark:border-red-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="relative p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Error</p>
                        <p className="text-2xl font-bold text-red-800 dark:text-red-200">0</p>
                      </div>
                      <div className="p-2 rounded-lg bg-red-500 dark:bg-red-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                        <XCircle className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}


            {/* Filters */}
            <div className="p-3 border-b border-border/50">
              <div className="flex items-center justify-end">
                {(searchTerm || statusFilter !== 'all' || positionFilter !== 'all' || positionSearchTerm || sourceFilter !== 'all' || sourceSearchTerm || dateRange || dateFilterType !== 'create') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-gray-600 hover:text-gray-800 h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-8 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="search" className="text-xs text-muted-foreground">Search</Label>
                  <div className="flex space-x-1">
                    <Input
                      id="search"
                      placeholder="Filename..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="h-7 text-xs"
                    />
                    <Button onClick={handleSearch} size="sm" variant="secondary" className="h-7 px-2">
                      <Search className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="status" className="text-xs text-muted-foreground">Status</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={handleStatusFilterChange}
                    open={openSelect === 'status'}
                    onOpenChange={(open) => setOpenSelect(open ? 'status' : null)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="All" />
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

                <div className="space-y-1">
                  <Label htmlFor="position" className="text-xs text-muted-foreground">Position</Label>
                  <Select
                    value={positionFilter}
                    onValueChange={handlePositionFilterChange}
                    open={openSelect === 'position'}
                    onOpenChange={(open) => setOpenSelect(open ? 'position' : null)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Search positions..."
                          value={positionSearchTerm}
                          onChange={(e) => setPositionSearchTerm(e.target.value)}
                          className="h-7 text-xs mb-2"
                        />
                      </div>
                      <SelectItem value="all">All Positions</SelectItem>
                      {positions
                        .filter((position) =>
                          position.title.toLowerCase().includes(positionSearchTerm.toLowerCase())
                        )
                        .map((position) => (
                          <SelectItem key={position.id} value={position.id}>
                            {position.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="source" className="text-xs text-muted-foreground">Source</Label>
                  <Select
                    value={sourceFilter}
                    onValueChange={handleSourceFilterChange}
                    open={openSelect === 'source'}
                    onOpenChange={(open) => setOpenSelect(open ? 'source' : null)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Search sources..."
                          value={sourceSearchTerm}
                          onChange={(e) => setSourceSearchTerm(e.target.value)}
                          className="h-7 text-xs mb-2"
                        />
                      </div>
                      <SelectItem value="all">All Sources</SelectItem>
                      {availableSources
                        .filter((source) =>
                          source.name.toLowerCase().includes(sourceSearchTerm.toLowerCase())
                        )
                        .map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            <div className="flex items-center gap-2">
                              {source.logo && (
                                <img
                                  src={source.logo}
                                  alt={`${source.name} logo`}
                                  className="h-4 w-4 object-contain rounded-full"
                                />
                              )}
                              {source.name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="dateFilterType" className="text-xs text-muted-foreground">Date Type</Label>
                  <Select
                    value={dateFilterType}
                    onValueChange={handleDateFilterTypeChange}
                    open={openSelect === 'dateFilterType'}
                    onOpenChange={(open) => setOpenSelect(open ? 'dateFilterType' : null)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create">Create Date</SelectItem>
                      <SelectItem value="process">Process Date</SelectItem>
                      <SelectItem value="complete">Complete Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="dateRange" className="text-xs text-muted-foreground">
                    {dateFilterType === 'create' ? 'Create Date' :
                      dateFilterType === 'process' ? 'Process Date' : 'Complete Date'}
                  </Label>
                  <div className="flex space-x-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal h-7 text-xs",
                            !dateRange && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {(() => {
                            const fromDate = safeGetDateFromRange(dateRange, 'from');
                            const toDate = safeGetDateFromRange(dateRange, 'to');

                            if (fromDate && toDate) {
                              return (
                                <>
                                  {format(fromDate, "MMM dd")} - {format(toDate, "MMM dd")}
                                </>
                              );
                            } else if (fromDate) {
                              return format(fromDate, "MMM dd");
                            } else {
                              return <span>Date</span>;
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
                          onSelect={handleDateRangeChange}
                          numberOfMonths={2}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                        />
                      </PopoverContent>
                    </Popover>
                    {dateRange && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearDateRange}
                        className="px-1 h-7"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>



                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Quick Dates</Label>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDatePreset('today')}
                      className="text-xs h-6 px-1"
                    >
                      Today
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDatePreset('last7days')}
                      className="text-xs h-6 px-1"
                    >
                      7d
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDatePreset('last30days')}
                      className="text-xs h-6 px-1"
                    >
                      30d
                    </Button>
                  </div>
                </div>


              </div>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Queue Table */}
            <div className="border rounded-lg shadow-lg overflow-hidden relative bg-card/50 backdrop-blur-sm">
              {/* Table Loading Overlay */}
              {loading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading queue...</span>
                  </div>
                </div>
              )}

              {/* Bulk Action Bar */}
              {selectedItems.size > 0 && (
                <div className="flex items-center gap-3 p-2 bg-muted/30 border-b border-border">
                  <span className="text-sm text-muted-foreground">{selectedItems.size} selected</span>
                  {(() => {
                    const hasRetryableItems = queueData?.data?.some(item =>
                      selectedItems.has(item.id) && ['failed', 'success'].includes(item.status)
                    );
                    return hasRetryableItems ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBulkRetry(Array.from(selectedItems))}
                        className="h-7 px-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" /> Retry
                      </Button>
                    ) : null;
                  })()}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBulkDelete(Array.from(selectedItems))}
                    className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedItems(new Set())}
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                </div>
              )}

              {/* Scrollable Table Container */}
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectionMode === 'all'}
                          ref={null} // Indeterminate state is not directly supported by Checkbox component
                          onCheckedChange={handleSelectAll}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </TableHead>
                      <SortableHeader field="id">ID</SortableHeader>
                      <SortableHeader field="file_name">File Name</SortableHeader>
                      <SortableHeader field="position_title">Position</SortableHeader>
                      <SortableHeader field="source_name">Source</SortableHeader>
                      <SortableHeader field="file_size">File Size</SortableHeader>
                      <SortableHeader field="status">Status</SortableHeader>
                      <SortableHeader field="upload_date">Create Date</SortableHeader>
                      <SortableHeader field="process_date">Process Date</SortableHeader>
                      <SortableHeader field="completed_date">Complete Date</SortableHeader>
                      <SortableHeader field="duration">Duration</SortableHeader>
                      <TableHead className="text-right">Actions</TableHead>

                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!queueData?.data || queueData.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Info className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No queue items found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      queueData.data.map((item) => (
                        <TableRow
                          key={item.id}
                          className={cn(
                            "transition-colors hover:bg-muted/50",
                            selectedItems.has(item.id) && "bg-muted/30"
                          )}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={() => handleSelectItem(item.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{item.id.slice(0, 8)}...</TableCell>
                          <TableCell className="font-medium">{item.file_name}</TableCell>
                          <TableCell>{item.position_title || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {item.source_logo ? (
                                <img
                                  src={convertMinIOUrlToSecureUrl(item.source_logo) || item.source_logo}
                                  alt={`${item.source_name} logo`}
                                  className="h-5 w-5 object-contain rounded-full flex-shrink-0"
                                />
                              ) : (
                                <div className="h-5 w-5 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                                  <ImageIcon className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-foreground truncate">
                                  {item.source_name || '-'}
                                </div>
                                {item.sub_source && (
                                  <div className="text-xs text-muted-foreground">
                                    {item.sub_source}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatFileSize(item.file_size)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={getStatusBadgeVariant(item.status)}
                              className={cn(
                                "font-medium",
                                item.status === 'queued' && "bg-blue-100 text-blue-800 border-blue-200",
                                item.status === 'inprocess' && "bg-yellow-100 text-yellow-800 border-yellow-200",
                                item.status === 'success' && "bg-green-100 text-green-800 border-green-200",
                                item.status === 'failed' && "bg-red-100 text-red-800 border-red-200"
                              )}
                            >
                              {getStatusDisplayText(item.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(item.upload_date)}</TableCell>
                          <TableCell>{item.process_date ? formatDate(item.process_date) : '-'}</TableCell>
                          <TableCell>{item.completed_date ? formatDate(item.completed_date) : '-'}</TableCell>
                          <TableCell>{calculateDuration(item.process_date, item.completed_date)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFilePreview(item)}
                                className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200"
                                title="Preview File"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 hover:bg-muted/50 transition-colors duration-200"
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />

                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onSelect={() => { setSelectedItem(item); setShowDetails(true); }}
                                    className="text-sm py-2"
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => handleFilePreview(item)}
                                    className="text-sm py-2"
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Preview File
                                  </DropdownMenuItem>
                                  {['failed', 'success'].includes(item.status) && (
                                    <DropdownMenuItem
                                      onSelect={() => {

                                        handleRetryItem(item.id);
                                      }}
                                      className="text-sm py-2"
                                    >
                                      <RotateCcw className="mr-2 h-4 w-4" />
                                      Retry
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onSelect={() => handleDeleteItem(item.id)}
                                    className="text-destructive hover:!bg-destructive/10 focus:!bg-destructive/10 focus:!text-destructive text-sm py-2"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            {queueData && (
              <div className="p-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      {(() => {
                        const currentTotal = queueData.total;
                        const currentPageSize = pageSize;
                        const startItem = ((page - 1) * currentPageSize) + 1;
                        const endItem = Math.min(page * currentPageSize, currentTotal);

                        if (currentTotal === 0) {
                          return 'No queue items found';
                        }

                        return `Showing ${startItem} to ${endItem} of ${currentTotal} queue items`;
                      })()}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Items per page:</span>
                      <Select
                        value={pageSize.toString()}
                        open={openSelect === 'pageSize'}
                        onOpenChange={(open) => setOpenSelect(open ? 'pageSize' : null)}
                        onValueChange={(value: string) => {
                          const newPageSize = parseInt(value);
                          setPageSize(newPageSize);
                          setPage(1); // Reset to first page when changing page size
                          fetchQueue(1, newPageSize);
                        }}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={() => {
                        setPage(Math.max(1, page - 1));
                        fetchQueue(Math.max(1, page - 1), pageSize);
                      }}
                      disabled={page <= 1 || queueData.total === 0}
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 hover:bg-muted/50 transition-colors duration-200"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground mr-2" />
                      Previous
                    </Button>

                    <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                      {(() => {
                        const totalPages = Math.ceil(queueData.total / pageSize);
                        if (queueData.total === 0) {
                          return 'No pages';
                        }
                        return `Page ${page} of ${totalPages}`;
                      })()}
                    </span>

                    <Button
                      onClick={() => {
                        const totalPages = Math.ceil(queueData.total / pageSize);
                        setPage(Math.min(totalPages, page + 1));
                        fetchQueue(Math.min(totalPages, page + 1), pageSize);
                      }}
                      disabled={(() => {
                        const totalPages = Math.ceil(queueData.total / pageSize);
                        return page >= totalPages || queueData.total === 0;
                      })()}
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 hover:bg-muted/50 transition-colors duration-200"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            )}



            {/* Details Dialog */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
              <DialogContent className="max-w-3xl w-full max-h-[80vh] overflow-y-auto" dialogId="Applicant-import-upload-queue-modal">
                <DialogHeader>
                  <DialogTitle>Queue Item Details</DialogTitle>
                  <DialogDescription>
                    Detailed information about the selected queue item
                  </DialogDescription>
                </DialogHeader>

                {selectedItem && (
                  <div className="space-y-4">
                    <Tabs defaultValue="details">
                      <TabsList>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="webhook">Webhook Send</TabsTrigger>
                        {selectedItem.error ? (
                          <TabsTrigger value="errors">Error Logs</TabsTrigger>
                        ) : null}
                      </TabsList>

                      <TabsContent value="details" className="mt-4">
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">File Name</Label>
                              <p className="text-sm">{selectedItem.file_name}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">File Size</Label>
                              <p className="text-sm">{formatFileSize(selectedItem.file_size)}</p>
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
                              <Label className="text-sm font-medium">Position</Label>
                              <p className="text-sm">{selectedItem.position_title || 'Not assigned'}</p>
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
                            <div>
                              <Label className="text-sm font-medium">Duration</Label>
                              <p className="text-sm">{calculateDuration(selectedItem.process_date, selectedItem.completed_date)}</p>
                            </div>
                            {selectedItem.user_email && (
                              <div>
                                <Label className="text-sm font-medium">Uploaded By</Label>
                                <p className="text-sm">{selectedItem.user_email}</p>
                              </div>
                            )}
                            {selectedItem.source && (
                              <div>
                                <Label className="text-sm font-medium">Source</Label>
                                <p className="text-sm">{selectedItem.source}</p>
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

                          {selectedItem.processed_applicants !== undefined && selectedItem.total_applicants !== undefined && (
                            <div>
                              <Label className="text-sm font-medium">Applicants Processed</Label>
                              <p className="text-sm">
                                {selectedItem.processed_applicants} of {selectedItem.total_applicants} applicants
                              </p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="webhook" className="mt-4">
                        {selectedItem.webhook_payload ? (
                          <ExpandablePayload
                            data={selectedItem.webhook_payload}
                            title="Webhook Payload"
                            maxHeight="max-h-40"
                            compact={true}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">No webhook payload available.</p>
                        )}
                      </TabsContent>

                      {selectedItem.error ? (
                        <TabsContent value="errors" className="mt-4">
                          <div>
                            <Label className="text-sm font-medium text-red-700">Error</Label>
                            <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap break-words">{selectedItem.error}</p>
                            {selectedItem.error_details && (
                              <details className="mt-2">
                                <summary className="text-sm text-red-600 cursor-pointer">View Error Details</summary>
                                <pre className="text-xs text-red-700 mt-2 p-2 bg-red-50 rounded overflow-auto max-h-40 whitespace-pre-wrap break-words">
                                  {selectedItem.error_details}
                                </pre>
                              </details>
                            )}
                          </div>
                        </TabsContent>
                      ) : null}
                    </Tabs>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* File Viewer Modal */}
            <FileViewerModal
              isOpen={isFileViewerOpen}
              onOpenChange={setIsFileViewerOpen}
              file={selectedFile}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 