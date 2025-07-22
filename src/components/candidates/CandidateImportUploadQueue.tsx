"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, XCircle, CheckCircle, FileText, RotateCcw, ExternalLink, AlertCircle, Eye, FileUp, UploadCloud, X, Download, ChevronLeft, ChevronRight, MoreHorizontal, Play } from "lucide-react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { MINIO_PUBLIC_BASE_URL, MINIO_BUCKET } from '@/lib/minio-constants';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { addDays, format, isAfter, isBefore, parseISO, subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useSession } from 'next-auth/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CandidateJobType = "upload" | "import";

export interface CandidateJob {
  id: string;
  file_name: string;
  file_size: number;
  status: string;
  error?: string;
  error_details?: string;
  source: string;
  upload_date?: string;
  completed_date?: string;
  upload_id?: string;
  created_by?: string;
  updatedAt?: string;
  file_path?: string;
  file?: File;
  type: CandidateJobType;
  webhook_payload?: any;
  process_date?: string;
}

interface QueueContextType {
  jobs: CandidateJob[];
  addJob: (job: CandidateJob) => void;
  updateJob: (id: string, update: Partial<CandidateJob>) => void;
  removeJob: (id: string) => void;
}

const CandidateQueueContext = createContext<QueueContextType | undefined>(undefined);

export function useCandidateQueue() {
  const ctx = useContext(CandidateQueueContext);
  if (!ctx) throw new Error("useCandidateQueue must be used within CandidateQueueProvider");
  return ctx;
}

export const CandidateQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<CandidateJob[]>([]);

  const addJob = useCallback((job: CandidateJob) => {
    setJobs((prev) => [...prev, job]);
  }, []);

  const updateJob = useCallback((id: string, update: Partial<CandidateJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...update } : j)));
  }, []);

  const removeJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  return (
    <CandidateQueueContext.Provider value={{ jobs, addJob, updateJob, removeJob }}>
      {children}
    </CandidateQueueContext.Provider>
  );
};

export const CandidateImportUploadQueue: React.FC<{
  initialPage?: number;
  initialPageSize?: number;
  onPaginationChange?: (page: number, pageSize: number) => void;
}> = ({ initialPage = 1, initialPageSize = 20, onPaginationChange }) => {
  const [jobs, setJobs] = useState<CandidateJob[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showErrorLogId, setShowErrorLogId] = useState<string | null>(null);
  const [showCombinedDialogId, setShowCombinedDialogId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [showBulkRetryConfirm, setShowBulkRetryConfirm] = useState(false);
  const [bulkRetryLoading, setBulkRetryLoading] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [jumpToPage, setJumpToPage] = useState<string>("");
  const { success, error } = useToast();
  // Change: default dateRange is null (no filter)
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>(() => ({ start: null, end: null }));
  const { data: session } = useSession();
  const isFetchingRef = useRef(false);
  const [summary, setSummary] = useState<any>(null);

  // Fetch paginated jobs
  const fetchJobs = useCallback(async () => {
    if (isRealtimeActive) {
      // If SSE is active, do not set loading or fetch
      return;
    }
    if (isFetchingRef.current) {
      console.log('[fetchJobs] Skipped: already fetching');
      return;
    }
    isFetchingRef.current = true;
    console.log('[fetchJobs] Start');
    let isMounted = true;
    setIsLoading(true);
    setFetchError(null);
    
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });
      if (filter) params.set('file_name', filter);
      if (statusFilter) params.set('status', statusFilter);
      if (dateRange.start) params.set('date_start', format(dateRange.start, 'yyyy-MM-dd'));
      if (dateRange.end) params.set('date_end', format(dateRange.end, 'yyyy-MM-dd'));
      const res = await fetch(`/api/upload-queue?${params.toString()}`);
      if (!res.ok) {
        let errorMsg = `Failed to fetch jobs: ${res.status} ${res.statusText}`;
        try {
          const errorData = await res.json();
          if (errorData && errorData.error) {
            errorMsg += ` - ${errorData.error}`;
          }
        } catch {}
        throw new Error(errorMsg);
      }
      const { data, total, summary } = await res.json();
      if (isMounted) {
        setJobs(Array.isArray(data) ? data : []);
        setTotal(total);
        setSummary(summary || null);
      }
    } catch (err) {
      if (isMounted) {
        setFetchError((err as Error).message);
        error((err as Error).message);
      }
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
      isFetchingRef.current = false;
      console.log('[fetchJobs] End');
    }
  }, [page, pageSize, error, isRealtimeActive, filter, statusFilter, dateRange]);

  // Update browser title with current page
  useEffect(() => {
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages > 1) {
      document.title = `Upload Queue - Page ${page} of ${totalPages} | Studio`;
    } else {
      document.title = 'Upload Queue | Studio';
    }
  }, [page, total, pageSize]);

  // Keyboard shortcuts for pagination
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const totalPages = Math.ceil(total / pageSize);
      
      switch (e.key) {
        case 'ArrowLeft':
          if (page > 1) {
            e.preventDefault();
            handlePageChange(page - 1);
          }
          break;
        case 'ArrowRight':
          if (page < totalPages) {
            e.preventDefault();
            handlePageChange(page + 1);
          }
          break;
        case 'Home':
          if (page > 1) {
            e.preventDefault();
            handlePageChange(1);
          }
          break;
        case 'End':
          if (page < totalPages) {
            e.preventDefault();
            handlePageChange(totalPages);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [page, total, pageSize]);

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    await fetchJobs();
  }, [fetchJobs]);

  // Fallback polling (less frequent since we have SSE)
  useEffect(() => {
    if (isRealtimeActive) return;
    console.log('[Polling] Polling enabled');
    const interval = setInterval(() => {
      console.log('[Polling] Polling fetchJobs');
      fetchJobs();
    }, 30000); // Poll every 30 seconds as fallback
    return () => {
      clearInterval(interval);
      console.log('[Polling] Polling cleaned up');
    };
  }, [fetchJobs, isRealtimeActive]);

  useEffect(() => {
    console.log('[useEffect] fetchJobs on mount or fetchJobs change');
    fetchJobs();
    return () => {
      // No cleanup needed here
    };
  }, [fetchJobs]);

  useEffect(() => {
    function handleRefreshEvent() {
      console.log('[Event] refreshCandidateQueue');
      fetchJobs();
    }
    window.addEventListener('refreshCandidateQueue', handleRefreshEvent);
    return () => {
      window.removeEventListener('refreshCandidateQueue', handleRefreshEvent);
      console.log('[Event] refreshCandidateQueue cleaned up');
    };
  }, [fetchJobs]);

  // Server-Sent Events (SSE) for real-time updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const baseReconnectDelay = 2000;
    const maxReconnectDelay = 30000; // 30 seconds
    let debounceTimeout: NodeJS.Timeout | null = null;
    let latestSSEData: any = null;

    // Helper to format date as yyyy-MM-dd
    function formatDate(date: Date) {
      return date ? format(date, 'yyyy-MM-dd') : '';
    }

    const applySSEUpdate = () => {
      if (latestSSEData) {
        setJobs(latestSSEData.data);
        setTotal(latestSSEData.data.length);
        latestSSEData = null;
        setIsLoading(false); // Set isLoading to false when SSE update is applied
      }
    };

    const connectSSE = () => {
      try {
        const params = new URLSearchParams();
        if (filter) params.set('file_name', filter);
        if (statusFilter) params.set('status', statusFilter);
        if (dateRange.start) params.set('date_start', formatDate(dateRange.start));
        if (dateRange.end) params.set('date_end', formatDate(dateRange.end));
        params.set('limit', String(pageSize));
        params.set('offset', String((page - 1) * pageSize));
        const sseUrl = `/api/upload-queue/sse?${params.toString()}`;
        eventSource = new EventSource(sseUrl);
        console.log('[SSE] Connecting to', sseUrl);

        eventSource.onopen = () => {
          setIsRealtimeActive(true);
          setIsLoading(false); // Ensure loading is off as soon as SSE connects
          reconnectAttempts = 0; // Reset reconnect attempts on successful connection
          console.log('[SSE] Connected');
        };

        eventSource.onerror = (error) => {
          console.warn('[SSE] Connection error:', error);
          setIsRealtimeActive(false);

          // Attempt to reconnect if under max attempts
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(baseReconnectDelay * reconnectAttempts, maxReconnectDelay);
            console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
            setTimeout(() => {
              if (eventSource) {
                eventSource.close();
                connectSSE();
              }
            }, delay);
          } else {
            console.warn('[SSE] Max reconnect attempts reached');
          }
        };

        eventSource.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'queue') {
              // Debounce UI update
              latestSSEData = msg;
              if (debounceTimeout) clearTimeout(debounceTimeout);
              debounceTimeout = setTimeout(applySSEUpdate, 500);
              console.log('[SSE] Received queue update');
            } else if (msg.type === 'error') {
              console.error('[SSE] Error:', msg.message);
            }
          } catch (error) {
            console.warn('[SSE] Error parsing message:', error);
          }
        };
      } catch (error) {
        console.error('[SSE] Failed to create connection:', error);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
        console.log('[SSE] Connection closed');
      }
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, [filter, statusFilter, dateRange, page, pageSize]);

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Function to calculate and format duration
  function formatDuration(startDate: string, endDate?: string): string {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffMs = end.getTime() - start.getTime();
    
    if (diffMs < 1000) return "0s";
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Helper function to check if date is in range
  const isInRange = (dateString?: string) => {
    if (!dateString) return true;
    if (!dateRange.start && !dateRange.end) return true;
    const date = new Date(dateString);
    if (dateRange.start && date < dateRange.start) return false;
    if (dateRange.end && date > addDays(dateRange.end, 1)) return false;
    return true;
  };

  // Helper function to get display status for filtering
  const getDisplayStatus = (status: string) => {
    switch (status) {
      case 'inprogress':
      case 'inprocess':
        return 'inprogress';
      case 'error':
      case 'fail':
        return 'error';
      default:
        return status;
    }
  };

  // Helper function to get display label and color for status
  const getStatusDisplayLabelAndColor = (status: string) => {
    switch (status) {
      case 'queued':
        return { label: 'Queued', className: 'bg-blue-200 text-blue-900 border-blue-200' };
      case 'inprogress':
      case 'inprocess':
        return { label: 'In Progress', className: 'bg-yellow-200 text-yellow-900 border-yellow-200' };
      case 'success':
        return { label: 'Success', className: 'bg-green-200 text-green-900 border-green-200' };
      case 'error':
      case 'fail':
        return { label: 'Error', className: 'bg-red-200 text-red-900 border-red-200' };
      default:
        return { label: status.charAt(0).toUpperCase() + status.slice(1), className: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  // Real-time duration updates for in-progress jobs
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filtering logic (client-side for now)
  const filteredJobs = jobs.filter(job => {
    // Show all jobs, regardless of source
    const matchesName = job.file_name?.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter ? getDisplayStatus(job.status) === statusFilter : true;
    // Date range filter
    const inDateRange = isInRange(job.upload_date);
    return matchesName && matchesStatus && inDateRange;
  });

  // Status counts - Use summary if available, else fallback to filteredJobs
  const numQueued = summary ? Number(summary.queued) : filteredJobs.filter(j => j.status === 'queued').length;
  const numInProgress = summary ? Number(summary.inprogress) : filteredJobs.filter(j => j.status === 'inprogress' || j.status === 'inprocess').length;
  const numSuccess = summary ? Number(summary.success) : filteredJobs.filter(j => j.status === 'success').length;
  const numError = summary ? Number(summary.error) : filteredJobs.filter(j => j.status === 'error' || j.status === 'fail').length;
  const totalFilteredJobs = summary ? Number(summary.total) : filteredJobs.length;

  // Collect all unique statuses from jobs for the filter dropdown
  const allStatuses = Array.from(new Set(jobs.map(j => j.status))).sort();

  // Helper to get the selected job for the combined dialog:
  const selectedCombinedJob = jobs.find(j => j.id === showCombinedDialogId);

  // Enhanced pagination logic
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (page > 4) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (page < totalPages - 3) {
        pages.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
    onPaginationChange?.(1, newPageSize);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    onPaginationChange?.(newPage, pageSize);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      handlePageChange(pageNum);
      setJumpToPage("");
    }
  };

  // Helper function to get display label for status
  const getStatusDisplayLabel = (status: string) => {
    switch (status) {
      case 'queued':
        return 'Queued';
      case 'inprogress':
      case 'inprocess':
        return 'In Progress';
      case 'success':
        return 'Success';
      case 'error':
      case 'fail':
        return 'Error';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Bulk selection logic
  const allSelected = filteredJobs.length > 0 && bulkDeleteIds.length === filteredJobs.length;
  const someSelected = bulkDeleteIds.length > 0 && bulkDeleteIds.length < filteredJobs.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setBulkDeleteIds(filteredJobs.map(job => job.id));
    } else {
      setBulkDeleteIds([]);
    }
  };

  const handleCheckboxChange = (jobId: string, checked: boolean) => {
    if (checked) {
      setBulkDeleteIds(prev => [...prev, jobId]);
    } else {
      setBulkDeleteIds(prev => prev.filter(id => id !== jobId));
    }
  };

  const handleBulkDelete = useCallback(async () => {
    setShowBulkDeleteConfirm(true);
  }, []);

  return (
    <div className="mb-6">
      {/* Filters and Bulk Actions in Card */}
      <Card className="mb-4 p-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 shadow-none border">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Filters */}
          <Input
            placeholder="Filter by file name..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="min-w-[180px] max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-md px-2 py-2 text-sm bg-background text-foreground min-w-[130px] max-w-xs"
          >
            <option value="">All Statuses</option>
            {/* Dynamically render all statuses found in jobs */}
            {allStatuses.map(status => (
              <option key={status} value={status}>{getStatusDisplayLabel(status)}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Date:</span>
            <input
              type="date"
              value={dateRange.start ? format(dateRange.start, 'yyyy-MM-dd') : ''}
              onChange={e => setDateRange(r => ({ ...r, start: e.target.value ? new Date(e.target.value) : null }))}
              className="border rounded bg-background px-2 py-1 text-sm"
            />
            <span className="text-sm text-muted-foreground">-</span>
            <input
              type="date"
              value={dateRange.end ? format(dateRange.end, 'yyyy-MM-dd') : ''}
              onChange={e => setDateRange(r => ({ ...r, end: e.target.value ? new Date(e.target.value) : null }))}
              className="border rounded bg-background px-2 py-1 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            className=""
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilter("");
              setStatusFilter("");
              setDateRange({ start: null, end: null });
            }}
            className=""
          >
            Clear Filters
          </Button>
          {/* Bulk Actions */}
          <input
            type="checkbox"
            checked={allSelected}
            ref={el => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={e => handleSelectAll(e.target.checked)}
            aria-label="Select all filtered jobs"
            className="scale-110"
          />
          <span className="text-sm">Select All</span>
          {bulkDeleteIds.length > 0 && filteredJobs.filter(job => bulkDeleteIds.includes(job.id) && (job.status === "error" || job.status === "fail")).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={bulkRetryLoading}
              onClick={() => setShowBulkRetryConfirm(true)}
              aria-label="Retry selected jobs"
            >
              {bulkRetryLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              Retry Selected
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            disabled={bulkDeleteIds.length === 0 || bulkDeleteLoading}
            onClick={() => setShowBulkDeleteConfirm(true)}
            aria-label="Delete selected jobs"
          >
            {bulkDeleteLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
            Delete Selected
          </Button>
        </div>
      </Card>
      {/* Summary Status Cards */}
      <div className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          {/* All Upload Jobs Card - Black */}
          <Card
            className="group relative overflow-hidden border-2 border-gray-200 dark:border-gray-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/50 dark:to-gray-900/50 backdrop-blur-sm"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">All Jobs</p>
                  <p className="text-2xl font-bold text-foreground">{totalFilteredJobs}</p>
                </div>
                <div className="h-8 w-8 rounded-xl bg-gray-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                  <span className="text-white text-xs font-bold">A</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Queued Card - Blue */}
          <Card
            className="group relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 backdrop-blur-sm"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Queue</p>
                  <p className="text-2xl font-bold text-foreground">{numQueued}</p>
                </div>
                <div className="h-8 w-8 rounded-xl bg-blue-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                  <span className="text-white text-xs font-bold">Q</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* In Progress Card - Yellow */}
          <Card
            className="group relative overflow-hidden border-2 border-yellow-200 dark:border-yellow-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/50 backdrop-blur-sm"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Process</p>
                  <p className="text-2xl font-bold text-foreground">{numInProgress}</p>
                </div>
                <div className="h-8 w-8 rounded-xl bg-yellow-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                  <span className="text-white text-xs font-bold">P</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Success Card - Green */}
          <Card
            className="group relative overflow-hidden border-2 border-green-200 dark:border-green-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 backdrop-blur-sm"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success</p>
                  <p className="text-2xl font-bold text-foreground">{numSuccess}</p>
                </div>
                <div className="h-8 w-8 rounded-xl bg-green-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Error Card - Red */}
          <Card
            className="group relative overflow-hidden border-2 border-red-200 dark:border-red-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 backdrop-blur-sm"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Error</p>
                  <p className="text-2xl font-bold text-foreground">{numError}</p>
                </div>
                <div className="h-8 w-8 rounded-xl bg-red-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                  <XCircle className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Bulk Action Bar - show only when items are selected */}
      {bulkDeleteIds.length > 0 && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded border border-muted-foreground/10">
          <span className="text-sm">{bulkDeleteIds.length} selected</span>
          <button
            className="ml-2 px-3 py-1 rounded bg-destructive text-white hover:bg-destructive/90 text-sm font-medium shadow"
            onClick={handleBulkDelete}
          >
            Delete Selected
          </button>
        </div>
      )}
      {isLoading && jobs.length > 0 && !isRealtimeActive && (
        <div className="flex items-center gap-2 mb-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Refreshing...</span>
        </div>
      )}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Process Date</TableHead>
              <TableHead>Completed Date</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Loading upload queue...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : fetchError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-destructive">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                    <span>{fetchError.includes('401') ? 'You are not authorized to view the upload queue. Please sign in again.' : fetchError}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>Loading upload queue...</span>
                    </div>
                  ) : (
                    'No queue'
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((item) => (
                <React.Fragment key={item.id}>
                  <TableRow>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={bulkDeleteIds.includes(item.id)}
                        onChange={e => handleCheckboxChange(item.id, e.target.checked)}
                        aria-label={`Select job ${item.file_name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      {item.file_path ? (
                        <a
                          href={`${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${item.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:text-primary/80 truncate max-w-xs"
                          title={item.file_name}
                        >
                          {item.file_name}
                        </a>
                      ) : (
                        <span className="truncate max-w-xs" title={item.file_name}>{item.file_name}</span>
                      )}
                    </TableCell>
                    <TableCell>{formatBytes(item.file_size)}</TableCell>
                    <TableCell>
                      {(() => {
                        const status = item.status;
                        const { label, className } = getStatusDisplayLabelAndColor(status);
                        return (
                          <Badge className={`capitalize border ${className}`}>
                            {label}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{item.process_date ? format(new Date(item.process_date), 'yyyy-MM-dd HH:mm:ss') : '-'}</TableCell>
                    <TableCell>{item.completed_date ? new Date(item.completed_date).toLocaleString() : '-'}</TableCell>
                    <TableCell>{item.upload_date ? new Date(item.upload_date).toLocaleString() : '-'}</TableCell>
                    <TableCell className="flex gap-1">
                      {item.file_path && (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          title="Download CV"
                        >
                          <a
                            href={`${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${item.file_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={item.file_name}
                          >
                            <FileText className="h-4 w-4 text-primary" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Details & Webhook Log"
                        onClick={() => setShowCombinedDialogId(item.id)}
                      >
                        <Eye className="h-4 w-4 text-primary" />
                      </Button>
                      {(item.status === "error" || item.status === "fail") && (
                        <Button variant="ghost" size="icon" onClick={() => setShowErrorLogId(item.id)} title="View error log">
                          <Eye className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      {(item.status === "error" || item.status === "fail") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Retry"
                          onClick={async () => {
                            await fetch(`/api/upload-queue/${item.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'queued', error: null, error_details: null, completed_date: null })
                            });
                            fetchJobs();
                          }}
                        >
                          <RotateCcw className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      {(item.status === "queued") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Process Now (Send to Webhook)"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/upload-queue/${item.id}`, { method: 'POST' });
                              if (res.ok) {
                                success('Job sent to webhook!');
                              } else {
                                const data = await res.json();
                                error(data.error || 'Failed to process job');
                              }
                            } catch (err) {
                              error('Failed to process job');
                            }
                            fetchJobs();
                          }}
                        >
                          <Play className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {(item.status === "queued" || item.status === "uploading") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Cancel"
                          disabled={cancelLoading}
                          onClick={() => setCancelId(item.id)}
                        >
                          {cancelLoading && cancelId === item.id ? <Loader2 className="animate-spin h-4 w-4" /> : <X className="h-4 w-4 text-orange-500" />}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePageChange(1)}
            disabled={page === 1}
            aria-label="First page"
          >
            <ChevronLeft className="h-4 w-4" />
            <ChevronLeft className="h-4 w-4 -ml-2" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {page} of {Math.ceil(total / pageSize)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === Math.ceil(total / pageSize)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePageChange(Math.ceil(total / pageSize))}
            disabled={page === Math.ceil(total / pageSize)}
            aria-label="Last page"
          >
            <ChevronRight className="h-4 w-4" />
            <ChevronRight className="h-4 w-4 -ml-2" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Rows per page:</span>
          <select
            value={pageSize}
            onChange={e => handlePageSizeChange(Number(e.target.value))}
            className="border rounded-md px-2 py-1 text-sm bg-background text-foreground"
          >
            {[10, 20, 50, 100].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Dialog */}
      <Dialog open={!!showErrorLogId} onOpenChange={open => !open && setShowErrorLogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error Log</DialogTitle>
          </DialogHeader>
          <div className="max-h-60 overflow-auto text-sm text-destructive">
            {filteredJobs.find(j => j.id === showErrorLogId)?.error_details || 'No error details available.'}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirm Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={open => !open && setShowBulkDeleteConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>Confirm Bulk Delete</AlertDialogHeader>
          <div>Are you sure you want to delete the selected jobs?</div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowBulkDeleteConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkDeleteLoading}
              onClick={async () => {
                setBulkDeleteLoading(true);
                try {
                  await Promise.all(bulkDeleteIds.map(id => fetch(`/api/upload-queue/${id}`, { method: 'DELETE' })));
                  setBulkDeleteIds([]);
                  await fetchJobs();
                } catch (err) {
                  error('Failed to delete some jobs');
                } finally {
                  setBulkDeleteLoading(false);
                  setShowBulkDeleteConfirm(false);
                }
              }}
            >{bulkDeleteLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Retry Confirm Dialog */}
      <AlertDialog open={showBulkRetryConfirm} onOpenChange={open => !open && setShowBulkRetryConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>Confirm Bulk Retry</AlertDialogHeader>
          <div>Are you sure you want to retry the selected failed jobs? This will add them back to the queue for reprocessing.</div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowBulkRetryConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkRetryLoading}
              onClick={async () => {
                setBulkRetryLoading(true);
                try {
                  const jobsToRetry = filteredJobs.filter(job => 
                    bulkDeleteIds.includes(job.id) && (job.status === "error" || job.status === "fail")
                  );
                  await Promise.all(jobsToRetry.map(job => fetch(`/api/upload-queue/${job.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'queued', error: null, error_details: null, completed_date: null })
                  })));
                  setBulkDeleteIds([]);
                  await fetchJobs();
                } catch (err) {
                  error('Failed to retry some jobs');
                } finally {
                  setBulkRetryLoading(false);
                  setShowBulkRetryConfirm(false);
                }
              }}
            >{bulkRetryLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}Retry All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Job Confirm Dialog */}
      <AlertDialog open={!!cancelId} onOpenChange={open => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>Confirm Cancel</AlertDialogHeader>
          <div>Are you sure you want to cancel this job?</div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelId(null)}>No, Keep Running</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelLoading}
              onClick={async () => {
                if (cancelId) {
                  setCancelLoading(true);
                  try {
                    const res = await fetch(`/api/upload-queue/${cancelId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'cancelled', completed_date: new Date().toISOString() })
                    });
                    if (!res.ok) throw new Error('Cancel failed');
                    success('Job cancelled successfully');
                  } catch (err) {
                    error('Failed to cancel job');
                  } finally {
                    setCancelLoading(false);
                    setCancelId(null);
                  }
                }
              }}
            >{cancelLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}Yes, Cancel Job</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details & Webhook Log Dialog */}
      <Dialog open={!!showCombinedDialogId} onOpenChange={open => !open && setShowCombinedDialogId(null)}>
        <DialogContent className="max-w-6xl w-full max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Job Details & Webhook Log</DialogTitle>
          </DialogHeader>
          {selectedCombinedJob ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(90vh-120px)]">
              {/* Left Column - Job Details */}
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3 text-lg border-b pb-2">Job Information</h3>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">File Name:</span>
                        <span className="font-mono text-xs break-all">{selectedCombinedJob.file_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">File Size:</span>
                        <span>{formatBytes(selectedCombinedJob.file_size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Status:</span>
                        <Badge variant={selectedCombinedJob.status === 'success' ? 'default' : (selectedCombinedJob.status === 'error' || selectedCombinedJob.status === 'fail') ? 'destructive' : 'secondary'}>
                          {getStatusDisplayLabel(selectedCombinedJob.status)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Source:</span>
                        <span>{selectedCombinedJob.source || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Upload Date:</span>
                        <span>{selectedCombinedJob.upload_date ? format(new Date(selectedCombinedJob.upload_date), 'yyyy-MM-dd HH:mm:ss') : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Completed Date:</span>
                        <span>{selectedCombinedJob.completed_date ? format(new Date(selectedCombinedJob.completed_date), 'yyyy-MM-dd HH:mm:ss') : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Duration:</span>
                        <span>{selectedCombinedJob.upload_date ? formatDuration(selectedCombinedJob.upload_date, selectedCombinedJob.completed_date) : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Process Date:</span>
                        <span>{selectedCombinedJob.process_date ? format(new Date(selectedCombinedJob.process_date), 'yyyy-MM-dd HH:mm:ss') : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Job ID:</span>
                        <span className="font-mono text-xs">{selectedCombinedJob.id}</span>
                      </div>
                    </div>
                    {selectedCombinedJob.file_path && (
                      <div className="mt-4">
                        <Button asChild variant="outline" size="sm">
                          <a href={`${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${selectedCombinedJob.file_path}`} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            Download File
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* Right Column - Accordion with Error Details, Success Response & Webhook Log */}
              <ScrollArea className="h-full pr-4">
                <Accordion type="multiple" defaultValue={["webhook-log"]} className="w-full">
                  {/* Error Details Accordion */}
                  {selectedCombinedJob.error_details && (
                    <AccordionItem value="error-details" className="border rounded-lg mb-4">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-destructive/5">
                        <div className="flex items-center text-destructive">
                          <AlertCircle className="h-5 w-5 mr-2" />
                          <span className="font-semibold">Error Details</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <pre className="bg-destructive/10 border border-destructive/20 rounded p-3 text-xs text-destructive max-h-60 overflow-auto whitespace-pre-wrap">
                          {selectedCombinedJob.error_details}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Success Response Accordion */}
                  {selectedCombinedJob.status === 'success' && selectedCombinedJob.webhook_payload?.webhookResJson && (
                    <AccordionItem value="success-response" className="border rounded-lg mb-4">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-green-50 dark:hover:bg-green-950/20">
                        <div className="flex items-center text-green-600 dark:text-green-400">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          <span className="font-semibold">Success Response</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <pre className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded p-3 text-xs text-green-900 dark:text-green-100 max-h-60 overflow-auto whitespace-pre-wrap">
                          {JSON.stringify(selectedCombinedJob.webhook_payload.webhookResJson, null, 2)}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Webhook Log Accordion */}
                  <AccordionItem value="webhook-log" className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-blue-50 dark:hover:bg-blue-950/20">
                      <div className="flex items-center text-blue-600 dark:text-blue-400">
                        <ExternalLink className="h-5 w-5 mr-2" />
                        <span className="font-semibold">Webhook Log</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {selectedCombinedJob.webhook_payload ? (
                        <div className="space-y-4">
                          {/* Response Mode */}
                          {selectedCombinedJob.webhook_payload.responseMode && (
                            <div>
                              <div className="font-medium text-sm mb-2 text-blue-600 dark:text-blue-400">Response Mode:</div>
                              <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded p-2 text-sm">
                                <Badge variant="outline">
                                  {selectedCombinedJob.webhook_payload.responseMode}
                                </Badge>
                              </div>
                            </div>
                          )}

                          {/* Webhook Payload */}
                          <div>
                            <div className="font-medium text-sm mb-2 text-blue-600 dark:text-blue-400">Payload Sent to Webhook:</div>
                            <pre className="whitespace-pre-wrap break-all max-h-48 overflow-auto bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded p-3 text-xs text-blue-900 dark:text-blue-100">
                              {JSON.stringify(selectedCombinedJob.webhook_payload, null, 2)}
                            </pre>
                          </div>

                          {/* Webhook Response Status */}
                          {selectedCombinedJob.webhook_payload.webhookResStatus && (
                            <div>
                              <div className="font-medium text-sm mb-2 text-blue-600 dark:text-blue-400">Response Status:</div>
                              <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded p-2 text-sm">
                                <Badge variant={selectedCombinedJob.webhook_payload.webhookResStatus === 200 ? 'default' : 'destructive'}>
                                  {selectedCombinedJob.webhook_payload.webhookResStatus}
                                </Badge>
                              </div>
                            </div>
                          )}

                          {/* Webhook Response Text (for streaming) */}
                          {selectedCombinedJob.webhook_payload.webhookResponseText && (
                            <div>
                              <div className="font-medium text-sm mb-2 text-purple-600 dark:text-purple-400">Raw Response Text:</div>
                              <pre className="whitespace-pre-wrap break-all max-h-48 overflow-auto bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded p-3 text-xs text-purple-900 dark:text-purple-100">
                                {selectedCombinedJob.webhook_payload.webhookResponseText}
                              </pre>
                            </div>
                          )}

                          {/* Webhook Error */}
                          {selectedCombinedJob.webhook_payload.webhookError && (
                            <div>
                              <div className="font-medium text-sm mb-2 text-red-600 dark:text-red-400">Webhook Error:</div>
                              <pre className="whitespace-pre-wrap break-all max-h-32 overflow-auto bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded p-3 text-xs text-red-700 dark:text-red-300">
                                {selectedCombinedJob.webhook_payload.webhookError}
                              </pre>
                            </div>
                          )}

                          {/* Webhook Response JSON */}
                          {selectedCombinedJob.webhook_payload.webhookResJson && (
                            <div>
                              <div className="font-medium text-sm mb-2 text-green-600 dark:text-green-400">Webhook Response JSON:</div>
                              <pre className="whitespace-pre-wrap break-all max-h-48 overflow-auto bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded p-3 text-xs text-green-900 dark:text-green-100">
                                {JSON.stringify(selectedCombinedJob.webhook_payload.webhookResJson, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <ExternalLink className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No webhook data available</p>
                          <p className="text-xs">This job may not have been processed by a webhook</p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </ScrollArea>
            </div>
          ) : <div>Job not found.</div>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 