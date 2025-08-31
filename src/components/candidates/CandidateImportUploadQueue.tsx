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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Clock, Loader2, CheckCircle, XCircle, Search, Filter, AlertCircle, Info, Upload, FileText, Users, Calendar as CalendarIcon, MoreHorizontal, Play, X, Trash2, Eye, RotateCcw, CheckSquare, Square, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';

import { useUnifiedRealtime } from '@/hooks/use-unified-realtime';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

interface QueueItem {
  id: string;
  file_name: string;
  file_size: number;
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
  position_title?: string;
  position_id?: string;
  webhook_payload?: any;
  source?: string;
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

export default function CandidateImportUploadQueue() {
  const [queueData, setQueueData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
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
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [positionSearchTerm, setPositionSearchTerm] = useState<string>('');

  // Centralized realtime hook
  const { isConnected: isRealtimeActive, lastUpdate: realtimeLastUpdate } = useUnifiedRealtime({
    onUploadQueueUpdate: (queueData: any) => {
      // Refresh the queue data when we receive realtime updates
      fetchQueue(page, pageSize);
      setLastUpdate(new Date());
    }
  });

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
        sort_field: sortField,
        sort_direction: sortDirection
      });

      // Handle dateRange separately since it's an object
      if (dateRange?.from) {
        params.append('date_start', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.append('date_end', dateRange.to.toISOString());
      }

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
  }, [searchTerm, statusFilter, positionFilter, dateRange]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
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
    setDateRange(undefined);
    setPage(1);
    fetchQueue(1, pageSize);
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
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        toast.success('Job queued for processing');
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
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        toast.success('Job queued for retry');
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
        body: JSON.stringify({ status: 'cancelled' })
      });
      
      if (response.ok) {
        toast.success('Job cancelled');
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
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.success('Job deleted');
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

  const canRetry = (item: QueueItem) => ['error', 'fail'].includes(item.status);
  const canCancel = (item: QueueItem) => ['queued', 'inprocess'].includes(item.status);
  const canDelete = (item: QueueItem) => ['success', 'error', 'fail', 'cancelled'].includes(item.status);
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'queued': return 'secondary';
      case 'inprocess': return 'outline';
      case 'success': return 'success';
      case 'error':
      case 'fail': return 'destructive';
      default: return 'secondary';
    }
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => {
    const isActive = sortField === field;
    return (
      <TableHead 
        className="font-medium cursor-pointer hover:bg-muted/50 transition-colors select-none"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          <div className="flex flex-col">
            <ChevronUp className={`h-3 w-3 ${isActive && sortDirection === 'asc' ? 'text-primary' : 'text-muted-foreground'}`} />
            <ChevronDown className={`h-3 w-3 ${isActive && sortDirection === 'desc' ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
        </div>
      </TableHead>
    );
  };

  const handleRetryItem = async (itemId: string) => {
    try {
      console.log(`Retrying job ${itemId}...`);
      const response = await fetch(`/api/upload-queue/${itemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Retry successful for job ${itemId}:`, result);
        toast.success('Job queued for retry');
        fetchQueue(page, pageSize);
      } else {
        const error = await response.json();
        console.error(`Retry failed for job ${itemId}:`, error);
        
        // Show more specific error messages
        if (error.error && error.error.includes('already a queued job with the same file path')) {
          toast.error('Cannot retry: there is already a queued job with the same file. Please wait for the existing job to complete or delete it first.');
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
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success('Job deleted');
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
    // Construct the file URL - you may need to adjust this based on your file storage setup
    const fileUrl = `/api/upload-queue/${item.id}/file`;
    
    setSelectedFile({
      fileName: item.file_name,
      url: fileUrl,
      label: 'Upload Queue File',
      updatedAt: item.upload_date,
      fileSize: item.file_size
    });
    setIsFileViewerOpen(true);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
    fetchQueue(1, pageSize);
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
        console.log('Bulk retry result:', result);
        
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
      {queueData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="group relative overflow-hidden border-2 border-gray-200 hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total</p>
                  <p className="text-3xl font-bold text-gray-800">{queueData.summary.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-500 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                  <span className="text-white text-sm font-bold">T</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-2 border-blue-200 hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Queued</p>
                  <p className="text-3xl font-bold text-blue-800">{queueData.summary.queued}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                  <Clock className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-2 border-yellow-200 hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-yellow-100 opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-yellow-600 uppercase tracking-wide">Processing</p>
                  <p className="text-3xl font-bold text-yellow-800">{queueData.summary.inprocess}</p>
                </div>
                <div className="p-3 rounded-xl bg-yellow-500 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-2 border-green-200 hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-green-600 uppercase tracking-wide">Success</p>
                  <p className="text-3xl font-bold text-green-800">{queueData.summary.success}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-500 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-2 border-red-200 hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-red-600 uppercase tracking-wide">Error</p>
                  <p className="text-3xl font-bold text-red-800">{queueData.summary.error}</p>
                </div>
                <div className="p-3 rounded-xl bg-red-500 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                  <XCircle className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Filters */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-end mb-3">
                      {(searchTerm || statusFilter !== 'all' || positionFilter !== 'all' || positionSearchTerm || dateRange) && (
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
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
                <Button onClick={handleSearch} size="sm" className="h-7 px-2">
                  <Search className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="All" />
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

            <div className="space-y-1">
              <Label htmlFor="position" className="text-xs text-muted-foreground">Position</Label>
              <Select value={positionFilter} onValueChange={handlePositionFilterChange}>
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
              <Label htmlFor="dateRange" className="text-xs text-muted-foreground">Date</Label>
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
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM dd")
                        )
                      ) : (
                        <span>Date</span>
                      )}
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
              <Label htmlFor="pageSize" className="text-xs text-muted-foreground">Per Page</Label>
              <Select value={pageSize.toString()} onValueChange={(value: string) => setPageSize(Number(value))}>
                <SelectTrigger className="h-7 text-xs">
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
                selectedItems.has(item.id) && ['error', 'fail'].includes(item.status)
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
                <SortableHeader field="file_size">File Size</SortableHeader>
                <SortableHeader field="status">Status</SortableHeader>
                <SortableHeader field="upload_date">Create Date</SortableHeader>
                <SortableHeader field="process_date">Process Date</SortableHeader>
                <SortableHeader field="completed_date">Complete Date</SortableHeader>
                <SortableHeader field="duration">Duration</SortableHeader>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!queueData?.data || queueData.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
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
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.id.slice(0, 8)}...</TableCell>
                    <TableCell className="font-medium">{item.file_name}</TableCell>
                    <TableCell>{item.position_title || '-'}</TableCell>
                    <TableCell>{formatFileSize(item.file_size)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={getStatusBadgeVariant(item.status)}
                        className={cn(
                          "font-medium",
                          item.status === 'queued' && "bg-blue-100 text-blue-800 border-blue-200",
                          item.status === 'inprocess' && "bg-yellow-100 text-yellow-800 border-yellow-200",
                          item.status === 'success' && "bg-green-100 text-green-800 border-green-200",
                          (item.status === 'error' || item.status === 'fail') && "bg-red-100 text-red-800 border-red-200"
                        )}
                      >
                        {item.status}
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
                            <span className="sr-only">Actions</span>
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
                          {['error', 'fail'].includes(item.status) && (
                            <DropdownMenuItem 
                              onSelect={() => handleRetryItem(item.id)}
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Queue Item Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected queue item
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-6">
              {/* Basic Information */}
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

              <Separator />
              
              {/* Progress Information */}
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

              <Separator />
              
              {/* Webhook Payload */}
              {selectedItem.webhook_payload && (
                <div>
                  <Label className="text-sm font-medium">Webhook Payload</Label>
                  <pre className="text-xs bg-gray-50 p-3 rounded mt-1 overflow-auto max-h-40">
                    {JSON.stringify(selectedItem.webhook_payload, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Error Information */}
              {selectedItem.error && (
                <div>
                  <Label className="text-sm font-medium text-red-700">Error</Label>
                  <p className="text-sm text-red-700 mt-1">{selectedItem.error}</p>
                  {selectedItem.error_details && (
                    <details className="mt-2">
                      <summary className="text-sm text-red-600 cursor-pointer">View Error Details</summary>
                      <pre className="text-xs text-red-700 mt-2 p-2 bg-red-50 rounded overflow-auto max-h-40">
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