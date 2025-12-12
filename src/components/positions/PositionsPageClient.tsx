"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Briefcase, Edit, Trash2, Search, Filter, Loader2, X, MoreVertical, ChevronUp, ChevronDown, Users, Eye, Download, Upload, ChevronRight } from "lucide-react";
import type { Position } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddPositionModal, type AddPositionFormValues } from '@/components/positions/AddPositionModal';
import { AddPositionMobileDrawer } from '@/components/positions/AddPositionMobileDrawer';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import { useSession } from 'next-auth/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { TableWrapper } from "@/components/ui/responsive-table";
import { ImportPositionsModal } from '@/components/positions/ImportPositionsModal';
import { RecruiterFilterSidebar } from '@/components/positions/RecruiterFilterSidebar';
import { RecruiterCell } from '@/components/positions/RecruiterCell';
import { BulkMatchCriteriaModal } from '@/components/positions/BulkMatchCriteriaModal';
import { SkeletonTableRows } from '@/components/ui/loading-overlay';
import { useRouter, useSearchParams } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { ChevronsUpDown, Check, UserX, User, RotateCcw } from 'lucide-react';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useEnhancedSSE } from '@/hooks/use-enhanced-sse';
import { formatSLAMessage } from '@/lib/slaUtils';
import { SLABadge } from './SLABadge';
import { Pagination } from '@/components/ui/pagination';
import { useJobMatchFeature } from '@/hooks/useJobMatchFeature';
import { useSharedSSE } from '@/hooks/use-shared-sse';
import { safeFetch, safeAll } from '@/lib/safe-fetch';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { PositionsMobileListView } from './PositionsMobileListView';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh-indicator';
import { useAutoScrollToInput } from '@/hooks/use-auto-scroll-to-input';


export default function PositionsPageClient() {
  const isMobile = useIsMobile();

  // Auto-scroll to focused inputs on mobile
  useAutoScrollToInput();

  // Use persistent user preferences
  const {
    positions: preferences,
    updatePositionsPreferences,
    resetPositionsPreferences,
    isLoaded
  } = useUserPreferences();

  // Check if job match feature is enabled
  const { isJobMatchEnabled } = useJobMatchFeature();

  // All useState hooks first
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState(preferences.searchTerm);
  const [departmentFilter, setDepartmentFilter] = useState(preferences.departmentFilter);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNewDrawerOpen, setIsNewDrawerOpen] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [positionToDelete, setPositionToDelete] = useState<Position | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkMatchCriteriaModalOpen, setIsBulkMatchCriteriaModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize page from URL or default to 1
  const [page, setPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const pageParam = urlParams.get('page');
      return pageParam ? parseInt(pageParam, 10) : 1;
    }
    return 1;
  });

  const [pageSize, setPageSize] = useState(preferences.pageSize);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState({ total: 0, open: 0, closed: 0 });
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string | null>(preferences.selectedRecruiterId);
  const [recruiterStats, setRecruiterStats] = useState<{ [key: string]: number }>({});
  const [availableRecruiter, setAvailableRecruiter] = useState<{ id: string, name: string, avatarUrl?: string }[]>([]);
  const [assigningRecruiter, setAssigningRecruiter] = useState<string | null>(null);
  const [headcountData, setHeadcountData] = useState<{ [positionId: string]: { total: number; vacant: number; filled: number } }>({});
  const [isLoadingHeadcount, setIsLoadingHeadcount] = useState(false);
  const [vacantFromOpenPositions, setVacantFromOpenPositions] = useState({ vacant: 0, totalOpen: 0 });
  const [mobileDisplayCount, setMobileDisplayCount] = useState(20); // For infinite scroll on mobile

  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isMobileFilterModalOpen, setIsMobileFilterModalOpen] = useState(false);
  const { data: session, status } = useSession();

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (departmentFilter && departmentFilter !== 'all') count++;
    if (selectedRecruiterId) count++;
    // status filter is derived from preferences or searchParams in this implementation;
    // we treat non-default statistics as covered by other filters.
    return count;
  }, [searchTerm, departmentFilter, selectedRecruiterId]);

  // Placeholder for realtime collaboration hook - will be moved after function definitions

  // FIXED: Stabilize callback functions to prevent infinite loops
  const handlePositionUpdate = useCallback((updatedPosition: any) => {
    setPositions(prevPositions => {
      const existingIndex = prevPositions.findIndex(p => p.id === updatedPosition.id);
      if (existingIndex !== -1) {
        const updated = [...prevPositions];
        updated[existingIndex] = { ...updated[existingIndex], ...updatedPosition };
        return updated;
      } else {
        return [...prevPositions, updatedPosition];
      }
    });
  }, []);

  const handleNotificationUpdate = useCallback((notification: any) => {
    // Handle position-related notifications
  }, []);

  // Debounce/search refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchStuckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track if we should update preferences (prevent circular updates)
  const shouldUpdatePreferencesRef = useRef(true);
  // Track if this is the initial load
  const isInitialLoadRef = useRef(true);
  // Track if we've initialized from preferences to prevent circular updates
  const hasInitializedFromPreferencesRef = useRef(false);
  // Track if initial data load has been completed
  const hasInitialLoadRef = useRef(false);
  // Ref for preferences timeout cleanup
  const preferencesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Refs to track loading states without causing re-renders in SSE effect
  const isLoadingRef = useRef(false);
  const isTableLoadingRef = useRef(false);
  const isSearchingRef = useRef(false);
  // Refs to store latest function versions for SSE effect
  const fetchPositionsRef = useRef<((isSearch?: boolean, customPage?: number) => Promise<void>) | null>(null);
  const fetchRecruiterStatsRef = useRef<(() => Promise<void>) | null>(null);
  // Ref to track if we're updating URL programmatically to prevent circular updates
  const isUpdatingURLRef = useRef(false);

  // Pull-to-refresh for mobile
  const handleRefreshPositions = useCallback(async () => {
    if (fetchPositionsRef.current) {
      await fetchPositionsRef.current(false);
    }
  }, []);

  const {
    elementRef: pullToRefreshRef,
    isPulling,
    isRefreshing,
    pullProgress,
  } = usePullToRefresh({
    onRefresh: handleRefreshPositions,
    enabled: isMobile,
  });
  // Refs to track authentication status for SSE effect to avoid stale closures
  const statusRef = useRef(status);
  const sessionUserIdRef = useRef(session?.user?.id);

  // statusFilter: initialize from preferences or URL
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>(() => {
    // First check URL parameters (for navigation from dashboard)
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const statusParam = searchParams.get('status');
      const queryParam = searchParams.get('query');
      if (statusParam && statusParam.toLowerCase() === 'open') return 'open';
      if (statusParam && statusParam.toLowerCase() === 'closed') return 'closed';
      if (queryParam) {
        // Try to extract status:Open or status:Closed from the query string
        const match = queryParam.match(/status:(open|closed)/i);
        if (match) {
          if (match[1].toLowerCase() === 'open') return 'open';
          if (match[1].toLowerCase() === 'closed') return 'closed';
        }
      }
    }
    // Fall back to preferences
    return preferences.statusFilter as 'all' | 'open' | 'closed';
  });

  // Sync statusFilter with URL changes (for navigation from dashboard)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const statusParam = searchParams.get('status');
      const queryParam = searchParams.get('query');
      let newStatus: 'all' | 'open' | 'closed' = 'all';
      if (statusParam && statusParam.toLowerCase() === 'open') newStatus = 'open';
      if (statusParam && statusParam.toLowerCase() === 'closed') newStatus = 'closed';
      if (queryParam) {
        const match = queryParam.match(/status:(open|closed)/i);
        if (match) {
          if (match[1].toLowerCase() === 'open') newStatus = 'open';
          if (match[1].toLowerCase() === 'closed') newStatus = 'closed';
        }
      }
      // Only update if the value actually changed to prevent unnecessary re-renders
      // Use functional update to avoid dependency on statusFilter
      setStatusFilter(prevStatus => {
        if (prevStatus !== newStatus) {
          return newStatus;
        }
        return prevStatus;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Remove statusFilter from dependencies to prevent infinite loop

  // Update local state when preferences are loaded (only once on initial load)
  useEffect(() => {
    if (isLoaded && !hasInitializedFromPreferencesRef.current) {
      // Mark as initialized to prevent re-running
      hasInitializedFromPreferencesRef.current = true;

      // Temporarily disable preference updates to prevent circular dependency
      shouldUpdatePreferencesRef.current = false;

      const initialSearchTerm = preferences.searchTerm || '';
      const initialDepartmentFilter = preferences.departmentFilter || 'all';
      const initialPageSize = preferences.pageSize || 20;
      const initialSelectedRecruiterId = preferences.selectedRecruiterId || null;
      const initialStatusFilter = preferences.statusFilter || 'all';

      setSearchTerm(initialSearchTerm);
      setDepartmentFilter(initialDepartmentFilter);
      setPageSize(initialPageSize);
      setSelectedRecruiterId(initialSelectedRecruiterId);

      // Update last saved preferences to match initial values
      lastSavedPreferencesRef.current = {
        searchTerm: initialSearchTerm,
        departmentFilter: initialDepartmentFilter,
        statusFilter: initialStatusFilter as 'all' | 'open' | 'closed',
        selectedRecruiterId: initialSelectedRecruiterId,
        pageSize: initialPageSize,
      };

      // Only update statusFilter if no URL parameters are present
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const statusParam = searchParams.get('status');
        const queryParam = searchParams.get('query');
        if (!statusParam && !queryParam) {
          setStatusFilter(initialStatusFilter as 'all' | 'open' | 'closed');
        }
      }

      // Re-enable preference updates after state is set with a longer delay
      // Clear any existing timeout
      if (preferencesTimeoutRef.current) {
        clearTimeout(preferencesTimeoutRef.current);
      }
      preferencesTimeoutRef.current = setTimeout(() => {
        shouldUpdatePreferencesRef.current = true;
      }, 500); // Increased delay to ensure state is fully set
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]); // Only depend on isLoaded, not individual preference values

  // Store last saved preferences to prevent unnecessary updates
  const lastSavedPreferencesRef = useRef({
    searchTerm: '',
    departmentFilter: 'all',
    statusFilter: 'all' as 'all' | 'open' | 'closed',
    selectedRecruiterId: null as string | null,
    pageSize: 20,
  });

  // Update preferences when local state changes (only if user made changes, not during initialization)
  useEffect(() => {
    // Skip if preferences haven't loaded yet or if we're initializing from preferences
    if (!isLoaded || !shouldUpdatePreferencesRef.current || !hasInitializedFromPreferencesRef.current) {
      return;
    }

    // Compare with last saved values, not current preferences (which might be stale)
    const hasChanges =
      searchTerm !== lastSavedPreferencesRef.current.searchTerm ||
      departmentFilter !== lastSavedPreferencesRef.current.departmentFilter ||
      statusFilter !== lastSavedPreferencesRef.current.statusFilter ||
      selectedRecruiterId !== lastSavedPreferencesRef.current.selectedRecruiterId ||
      pageSize !== lastSavedPreferencesRef.current.pageSize;

    if (hasChanges) {
      // Update last saved values immediately to prevent duplicate calls
      lastSavedPreferencesRef.current = {
        searchTerm,
        departmentFilter,
        statusFilter,
        selectedRecruiterId,
        pageSize,
      };

      updatePositionsPreferences({
        searchTerm,
        departmentFilter,
        statusFilter,
        selectedRecruiterId,
        pageSize,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, departmentFilter, statusFilter, selectedRecruiterId, pageSize, isLoaded]); // Remove updatePositionsPreferences from deps

  // Cleanup timeouts on component unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts to prevent memory leaks
      if (preferencesTimeoutRef.current) {
        clearTimeout(preferencesTimeoutRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (searchBlurTimeoutRef.current) {
        clearTimeout(searchBlurTimeoutRef.current);
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (searchStuckTimeoutRef.current) {
        clearTimeout(searchStuckTimeoutRef.current);
      }

      // Reset all loading states to prevent stuck UI
      setIsLoading(false);
      setIsTableLoading(false);
      setIsSearching(false);
      setAssigningRecruiter(null);
    };
  }, []);

  // Manual reset function for debugging
  const resetAssigningRecruiter = useCallback(() => {
    setAssigningRecruiter(null);
  }, []);



  // Department filter popover state
  const [departmentPopoverOpen, setDepartmentPopoverOpen] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState('');

  // Robust handler for department selection
  const handleDepartmentSelect = (dept: string) => {
    setDepartmentFilter(dept);
    setDepartmentPopoverOpen(false);
    setDepartmentSearch('');
  };

  // Handler for recruiter selection
  const handleRecruiterSelect = (recruiterId: string | null) => {
    setSelectedRecruiterId(recruiterId);
    // Mark that we're updating URL to prevent pagination effect from running
    isUpdatingURLRef.current = true;
    setPage(1); // Reset to first page when changing recruiter filter
    updateURL(1); // Update URL to reflect page reset
    // Reset flag after a delay
    setTimeout(() => {
      isUpdatingURLRef.current = false;
    }, 200);
  };

  // Handler for assigning/unassigning recruiter to position
  const handleAssignRecruiterToPosition = async (positionId: string, recruiterId: string | null) => {
    // Prevent multiple simultaneous assignments for the same position
    if (assigningRecruiter === positionId) {
      return;
    }

    setAssigningRecruiter(positionId);

    // Store previous state for rollback
    const prevPositions = [...positions];
    let recruiterName = null;

    if (recruiterId) {
      // Find the recruiter name from available recruiters
      const foundRecruiter = availableRecruiter.find(r => r.id === recruiterId);
      recruiterName = foundRecruiter?.name || null;

      // If not found in availableRecruiter, try to fetch it to ensure we have the latest data
      if (!foundRecruiter) {
        // Recruiter not found in availableRecruiter, this might cause display issues
      }
    }

    // Optimistically update the UI
    setPositions(prev => prev.map(p =>
      p.id === positionId
        ? {
          ...p,
          recruiterId: recruiterId,
          recruiterName: recruiterName
        }
        : p
    ));

    try {
      const result = await safeFetch(`/api/positions/${positionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recruiterId }),
        credentials: 'include',
        timeoutMs: 8000
      });

      if (!result.ok) {
        console.warn('Skipping failed endpoint /api/positions/[id] (PUT):', result.error || result.status);
        throw new Error(`Failed to update recruiter assignment: ${result.error}`);
      }

      const responseData = result.data;

      // Update the position with the actual API response data to ensure consistency
      const updatedPosition = (responseData as any)?.position;

      if (updatedPosition) {
        // Verify that the updated position has recruiterName when recruiterId is set
        if (updatedPosition.recruiterId && !updatedPosition.recruiterName) {
          // Use a more targeted approach instead of full refresh
          const enrichedPosition = {
            ...updatedPosition,
            recruiterName: recruiterName || null
          };
          setPositions(prev => prev.map(p =>
            p.id === positionId
              ? enrichedPosition
              : p
          ));
        } else {
          // Ensure the updated position has all the necessary fields
          setPositions(prev => prev.map(p =>
            p.id === positionId
              ? {
                ...p,
                ...updatedPosition,
                // Ensure custom_attributes is properly handled
                custom_attributes: updatedPosition.custom_attributes || updatedPosition.customAttributes || {},
                // Ensure recruiterName is properly handled
                recruiterName: updatedPosition.recruiterName || recruiterName || null
              }
              : p
          ));
        }
      } else {
        // If no position data in response, revert to previous state
        setPositions(prevPositions);
        throw new Error('Invalid response from server');
      }

      // Check if recruiter sync happened
      if (responseData && typeof responseData === 'object' && 'recruiterSync' in responseData) {
        const sync = (responseData as any).recruiterSync;
        if (sync.candidatesUpdated > 0) {
          toast.success(
            `Recruiter assigned successfully. ${sync.candidatesUpdated} candidate${sync.candidatesUpdated > 1 ? 's' : ''} automatically assigned.`
          );
        } else {
          toast.success(recruiterId ? 'Recruiter assigned successfully' : 'Recruiter unassigned successfully');
        }
      } else {
        toast.success(recruiterId ? 'Recruiter assigned successfully' : 'Recruiter unassigned successfully');
      }

      // Refresh recruiter stats (this also refreshes availableRecruiter)
      // Use a debounced approach to prevent excessive API calls
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        fetchRecruiterStats().catch(error => {
          // Failed to refresh recruiter stats
        });
      }, 1000);

    } catch (error) {
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast.error('Request timed out. Please try again.');
        } else {
          toast.error(`Failed to update recruiter assignment: ${error.message}`);
        }
      } else {
        toast.error('Failed to update recruiter assignment');
      }

      // Revert optimistic update
      setPositions(prevPositions);
    } finally {
      // Always ensure the assigning state is reset
      setAssigningRecruiter(null);
    }
  };

  const modulePermissions = session?.user?.modulePermissions || [];
  const canManagePositions = modulePermissions.includes('POSITIONS_EDIT_BASIC') || false;
  const canCreatePositions = modulePermissions.includes('POSITIONS_CREATE') || false;
  const canEditPositions = modulePermissions.includes('POSITIONS_EDIT_BASIC') || false;
  const canDeletePositions = modulePermissions.includes('POSITIONS_DELETE') || false;
  const canImportPositions = modulePermissions.includes('POSITIONS_IMPORT') || false;
  const canExportPositions = modulePermissions.includes('POSITIONS_EXPORT') || false;
  const canAssignPositionRecruiter = modulePermissions.includes('POSITIONS_RECRUITER_ASSIGN') || false;



  // Calculate total pages for pagination
  const totalPages = Math.ceil(total / pageSize);

  // Use refs to store current values to avoid dependency issues
  const currentFiltersRef = useRef({ searchTerm, statusFilter, departmentFilter, selectedRecruiterId, page, pageSize });

  // Update refs when values change
  useEffect(() => {
    currentFiltersRef.current = { searchTerm, statusFilter, departmentFilter, selectedRecruiterId, page, pageSize };
  }, [searchTerm, statusFilter, departmentFilter, selectedRecruiterId, page, pageSize]);

  // Fetch recruiter statistics for all positions (regardless of current filter)
  const fetchRecruiterStats = useCallback(async () => {
    try {
      // Get recruiter headcount statistics
      const result = await safeFetch('/api/users/recruiter-headcount-stats', { timeoutMs: 8000 });

      if (!result.ok) {
        console.warn('Skipping failed endpoint /api/users/recruiter-headcount-stats:', result.error || result.status);
        setAvailableRecruiter([]);
        return;
      }

      const recruiterStatsData = result.data as any;

      // Set available recruiters with headcount data
      const availableRecruiterData = recruiterStatsData.recruiters.map((r: any) => ({
        id: r.id,
        name: r.name,
        avatarUrl: r.avatarUrl,
        vacantHeadcount: r.vacantHeadcount
      }));
      setAvailableRecruiter(availableRecruiterData);

      // Create stats object for backward compatibility
      const stats: { [key: string]: number } = {};
      recruiterStatsData.recruiters.forEach((recruiter: any) => {
        stats[recruiter.id] = recruiter.totalPositions;
      });
      stats.unassigned = recruiterStatsData.unassigned.totalPositions;
      stats.unassignedVacant = recruiterStatsData.unassigned.vacantHeadcount;

      setRecruiterStats(stats);
    } catch (error) {
      // Error fetching recruiter statistics
    }
  }, []);

  // Fetch positions with pagination and statistics
  const fetchPositions = useCallback(async (isSearch = false, customPage?: number) => {

    if (isSearch) {
      setIsSearching(true);
    } else if (isInitialLoadRef.current) {
      // Use full loading for initial load
      setIsLoading(true);
      isInitialLoadRef.current = false;
    } else {
      // Use table loading for subsequent loads (pagination, filters, etc.)
      setIsTableLoading(true);
    }

    try {
      const filters = currentFiltersRef.current;
      const query = new URLSearchParams();
      if (filters.searchTerm) query.append('title', filters.searchTerm);
      if (filters.statusFilter !== 'all') query.append('isOpen', filters.statusFilter === 'open' ? 'true' : 'false');
      if (filters.departmentFilter !== 'all') query.append('department', filters.departmentFilter);
      if (filters.selectedRecruiterId === 'unassigned') {
        query.append('recruiterId', 'null');
      } else if (filters.selectedRecruiterId) {
        query.append('recruiterId', filters.selectedRecruiterId);
      }
      query.append('limit', String(filters.pageSize));
      query.append('offset', String(((customPage ?? filters.page) - 1) * filters.pageSize));
      query.append('includeStats', 'true'); // Include statistics in the same call
      query.append('includeCandidateStats', 'true'); // Include candidate statistics for each position
      query.append('includeHeadcount', 'true'); // Include headcount data in the same call

      const url = `/api/positions?${query.toString()}`;


      const result = await safeFetch(url, { timeoutMs: 12000 });
      if (!result.ok) {
        console.warn('Skipping failed endpoint /api/positions:', result.error || result.status);
        setPositions([]);
        setTotal(0);
        return;
      }

      const data = result.data as any;
      const positionsData = data.data || [];



      setPositions(positionsData);
      setTotal(data.total || 0);

      // Process headcount data from the API response
      if (positionsData.length > 0) {
        const headcountMap: { [positionId: string]: { total: number; vacant: number; filled: number } } = {};
        positionsData.forEach((position: Position & { headcountData?: any }) => {
          if (position.headcountData) {
            headcountMap[position.id] = {
              total: position.headcountData.total || 0,
              vacant: position.headcountData.vacant || 0,
              filled: position.headcountData.filled || 0
            };
          }
        });
        setHeadcountData(headcountMap);
      }

      // Update statistics if included in response
      if (data.statistics) {
        setStatistics(data.statistics);
      }
    } catch (error) {
      toast.error('Failed to load positions');
    } finally {
      // Always ensure search state is reset
      setIsSearching(false);
      if (isSearch) {
        // Search loading handled above
      } else {
        // Clear the appropriate loading state
        setIsTableLoading(false);
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // No dependencies - use refs to access current values

  // Update loading state refs whenever they change
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    isTableLoadingRef.current = isTableLoading;
  }, [isTableLoading]);

  useEffect(() => {
    isSearchingRef.current = isSearching;
  }, [isSearching]);

  // Update function refs whenever they change
  useEffect(() => {
    fetchPositionsRef.current = fetchPositions;
  }, [fetchPositions]);

  useEffect(() => {
    fetchRecruiterStatsRef.current = fetchRecruiterStats;
  }, [fetchRecruiterStats]);

  // Auto-reset search state if stuck for too long
  useEffect(() => {
    if (isSearching) {
      // Set a timeout to auto-reset search state after 10 seconds
      searchStuckTimeoutRef.current = setTimeout(() => {
        setIsSearching(false);
      }, 5000); // 5 seconds
    } else {
      // Clear timeout if search is not stuck
      if (searchStuckTimeoutRef.current) {
        clearTimeout(searchStuckTimeoutRef.current);
        searchStuckTimeoutRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (searchStuckTimeoutRef.current) {
        clearTimeout(searchStuckTimeoutRef.current);
      }
    };
  }, [isSearching]);

  // Auto-reset assigningRecruiter state if stuck for too long
  useEffect(() => {
    if (assigningRecruiter) {
      const timeout = setTimeout(() => {
        setAssigningRecruiter(null);
      }, 3000); // Reduced from 5 seconds to 3 seconds

      return () => clearTimeout(timeout);
    }
  }, [assigningRecruiter]);

  // Global safety timeout to prevent page from getting stuck
  useEffect(() => {
    const globalTimeout = setTimeout(() => {
      // If any loading state is stuck for more than 30 seconds, reset it
      if (isLoading || isTableLoading || isSearching || isLoadingDepartments) {
        console.warn('Positions page loading states stuck for 30+ seconds, resetting...');
        setIsLoading(false);
        setIsTableLoading(false);
        setIsSearching(false);
        setIsLoadingDepartments(false);
        setAssigningRecruiter(null);
      }
    }, 5000); // 5 seconds

    return () => clearTimeout(globalTimeout);
  }, [isLoading, isTableLoading, isSearching, isLoadingDepartments]);

  // Fetch all departments for the filter dropdown
  const fetchAllDepartments = useCallback(async () => {
    setIsLoadingDepartments(true);
    try {
      const result = await safeFetch('/api/positions/all', { timeoutMs: 8000 });

      if (!result.ok) {
        console.warn('Skipping failed endpoint /api/positions/all:', result.error || result.status);
        throw new Error(`Failed to fetch departments: ${result.error}`);
      }

      const data = result.data as any;

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format');
      }

      const departments = Array.from(new Set(data.data.map((p: any) => p.department)))
        .filter((d): d is string => typeof d === 'string' && !!d)
        .sort();

      setAllDepartments(departments);
    } catch (error) {
      // If the main API fails, try the fallback endpoint
      try {
        const fallbackResult = await safeFetch('/api/positions?limit=1000', { timeoutMs: 8000 });
        if (fallbackResult.ok && fallbackResult.data) {
          const fallbackDepts = Array.from(new Set((fallbackResult.data as any)?.data?.map((p: any) => p.department) || []))
            .filter((d): d is string => typeof d === 'string' && !!d)
            .sort();
          setAllDepartments(fallbackDepts);
        } else {
          console.warn('Skipping failed fallback endpoint /api/positions:', fallbackResult.error || fallbackResult.status);
          setAllDepartments([]);
        }
      } catch (fallbackError) {
        setAllDepartments([]);
      }
    } finally {
      setIsLoadingDepartments(false);
    }
  }, []); // Remove dependency on positions

  // Dashboard update handler - defined after fetchPositions to avoid temporal dead zone
  const handleDashboardUpdate = useCallback((dashboardData: any) => {
    // Refresh the entire position list when dashboard updates
    if (dashboardData.type === 'position_list_update') {
      fetchPositions();
    }
  }, [fetchPositions]);

  // Simple SSE hook
  const { isConnected: enhancedSSEConnected } = useEnhancedSSE();

  // Calculate vacant headcount from open positions
  useEffect(() => {
    let totalVacant = 0;
    let totalOpenPositions = 0;

    positions.forEach(position => {
      if (position.isOpen && headcountData[position.id]) {
        totalVacant += headcountData[position.id].vacant;
        totalOpenPositions += 1;
      }
    });

    setVacantFromOpenPositions({ vacant: totalVacant, totalOpen: totalOpenPositions });
  }, [positions, headcountData]);

  // Update URL with current pagination state
  const updateURL = useCallback((newPage: number, newPageSize?: number) => {
    isUpdatingURLRef.current = true;
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.set('page', newPage.toString());
    if (newPageSize) {
      currentParams.set('pageSize', newPageSize.toString());
    }

    // Update URL without page refresh
    const newURL = `${window.location.pathname}?${currentParams.toString()}`;
    router.replace(newURL, { scroll: false });

    // Reset flag after a short delay to allow URL listener to skip the update
    setTimeout(() => {
      isUpdatingURLRef.current = false;
    }, 100);
  }, [router]);

  // Calculate recruiter statistics from positions data
  const calculateRecruiterStats = useCallback((positionsData: Position[]) => {
    const stats: { [key: string]: number } = {};

    positionsData.forEach(position => {
      if (position.recruiterId) {
        stats[position.recruiterId] = (stats[position.recruiterId] || 0) + 1;
      } else {
        stats.unassigned = (stats.unassigned || 0) + 1;
      }
    });

    setRecruiterStats(stats);
  }, []);

  // Remove the separate fetchStatistics function since it's now combined
  // const fetchStatistics = useCallback(async () => { ... }, [searchTerm, statusFilter, departmentFilter]);

  // Initial load - only run once when session is available
  useEffect(() => {
    // Prevent multiple initial loads
    if (hasInitialLoadRef.current) {
      return;
    }

    // Only run if session is available and preferences are loaded
    if (!session?.user?.id || !isLoaded) {
      return;
    }

    // Mark as loaded to prevent re-running
    hasInitialLoadRef.current = true;

    // Use ref to get latest function
    const fetchFn = fetchPositionsRef.current;
    if (fetchFn) {
      fetchFn(false);
    }
    fetchAllDepartments();
    fetchRecruiterStats(); // Fetch recruiter stats independently
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, isLoaded]); // Depend on both session and isLoaded

  // Fetch recruiter stats when session becomes available
  useEffect(() => {
    if (session?.user?.id && availableRecruiter.length === 0) {
      fetchRecruiterStats();
    }
  }, [session?.user?.id, availableRecruiter.length, fetchRecruiterStats]);

  // Effect for pagination changes only
  useEffect(() => {
    // Skip if initial load hasn't completed yet
    if (!hasInitialLoadRef.current) {
      return;
    }

    // Skip initial render and skip if search is in progress
    if (searchTimeoutRef.current || isUpdatingURLRef.current) {
      return;
    }

    // Use ref to get latest function to avoid dependency issues
    const fetchFn = fetchPositionsRef.current;
    if (fetchFn) {
      fetchFn(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]); // Only depend on page and pageSize, use ref for fetchPositions

  // Listen for URL changes and update page state
  useEffect(() => {
    // Skip if initial load hasn't completed yet
    if (!hasInitialLoadRef.current) {
      return;
    }

    // Skip if we're updating URL programmatically to prevent circular updates
    if (isUpdatingURLRef.current) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    const pageSizeParam = urlParams.get('pageSize');

    let shouldUpdatePage = false;
    let shouldUpdatePageSize = false;

    if (pageParam) {
      const newPage = parseInt(pageParam, 10);
      if (newPage !== page && !isNaN(newPage) && newPage > 0) {
        shouldUpdatePage = true;
      }
    }

    if (pageSizeParam) {
      const newPageSize = parseInt(pageSizeParam, 10);
      if (newPageSize !== pageSize && !isNaN(newPageSize) && newPageSize > 0) {
        shouldUpdatePageSize = true;
      }
    }

    // Only update if values actually changed to prevent unnecessary re-renders
    if (shouldUpdatePage || shouldUpdatePageSize) {
      // Mark that we're updating to prevent pagination effect from running immediately
      isUpdatingURLRef.current = true;

      if (shouldUpdatePage) {
        setPage(parseInt(pageParam!, 10));
      }
      if (shouldUpdatePageSize) {
        setPageSize(parseInt(pageSizeParam!, 10));
      }

      // Reset flag after a delay to allow pagination effect to run if needed
      setTimeout(() => {
        isUpdatingURLRef.current = false;
      }, 200); // Increased delay to prevent rapid cycles
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only listen to searchParams changes, not page/pageSize to prevent circular updates

  // Improved debounced search effect with better performance and error handling
  useEffect(() => {
    // Skip if initial load hasn't completed yet
    if (!hasInitialLoadRef.current) {
      return;
    }

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search with longer delay for better performance
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Mark that we're updating URL to prevent pagination effect from running
        isUpdatingURLRef.current = true;

        // Reset to first page and fetch with page 1
        setPage(1);
        updateURL(1); // Update URL to reflect page reset

        // Use ref to get latest function
        const fetchFn = fetchPositionsRef.current;
        if (fetchFn) {
          await fetchFn(true, 1); // Pass custom page 1 to avoid race condition
        }

        // Reset flag after a delay to allow URL sync to skip
        setTimeout(() => {
          isUpdatingURLRef.current = false;
        }, 300); // Increased delay to prevent rapid cycles
      } catch (error) {
        setIsSearching(false);
        isUpdatingURLRef.current = false;
      } finally {
        // Clear the timeout ref after execution
        searchTimeoutRef.current = null;
      }
    }, 500);

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, departmentFilter, selectedRecruiterId]); // Remove updateURL and fetchPositions from dependencies

  // Handle search input focus and blur
  const handleSearchFocus = () => {
    // Ensure search input stays responsive
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Handle clear search with focus management
  const handleClearSearch = () => {
    setSearchTerm('');
    // Focus back to search input after clearing
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  };

  // Handle search input change with better state management
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setSearchTerm(value);

    // If search is stuck, force reset the search state
    if (isSearching && value === '') {
      setIsSearching(false);
    }
  };

  // Handle keyboard events to ensure search stays responsive
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow all keyboard input even during search
    if (e.key === 'Escape') {
      setSearchTerm('');
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }
    }

    // If search seems stuck, force a reset
    if (isSearching && e.key !== 'Escape') {
      // Allow the key press to continue
    }
  };

  // Handle search input blur to ensure proper state management
  const handleSearchBlur = () => {
    // Don't reset search state on blur, just ensure input is still functional
    // Clear any existing timeout
    if (searchBlurTimeoutRef.current) {
      clearTimeout(searchBlurTimeoutRef.current);
    }
    searchBlurTimeoutRef.current = setTimeout(() => {
      if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
        // Input lost focus, but don't disable it
      }
    }, 100);
  };

  // Use positions directly since filtering is now done server-side
  const filteredPositions = useMemo(() => positions, [positions]);

  // Memoize computed values for better performance
  const totalPositions = useMemo(() => statistics.total, [statistics.total]);
  const openPositions = useMemo(() => statistics.open, [statistics.open]);
  const closedPositions = useMemo(() => statistics.closed, [statistics.closed]);

  // Get selected recruiter name
  const selectedRecruiterName = useMemo(() => {
    if (!selectedRecruiterId || selectedRecruiterId === 'unassigned') return null;
    const recruiter = availableRecruiter.find(r => r.id === selectedRecruiterId);
    return recruiter?.name || null;
  }, [selectedRecruiterId, availableRecruiter]);

  const allSelected = useMemo(() =>
    selectedIds.length > 0 && selectedIds.length === filteredPositions.length,
    [selectedIds.length, filteredPositions.length]
  );

  const someSelected = useMemo(() =>
    selectedIds.length > 0 && selectedIds.length < filteredPositions.length,
    [selectedIds.length, filteredPositions.length]
  );

  // Add sort state and handler at the top of the component
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleSort = (column: string | null, direction?: 'asc' | 'desc' | null) => {
    if (!column) {
      setSortColumn(null);
      setSortDirection('asc');
      return;
    }
    if (sortColumn === column && (direction === null || direction === undefined)) {
      // 3-state toggle: unsorted -> asc -> desc -> unsorted
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        // Clear sort - go back to unsorted
        setSortDirection(null);
      } else {
        // From unsorted (null) to asc
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection(direction || 'desc');
    }
  };

  const getSortableValue = (position: Position, column: string) => {
    switch (column) {
      case 'title': return position.title?.toLowerCase() || '';
      case 'department': return position.department?.toLowerCase() || '';
      case 'status': return position.isOpen ? 'open' : 'closed';
      case 'recruiter': return position.recruiterName?.toLowerCase() || '';
      default: return '';
    }
  };

  const sortedPositions = useMemo(() => {
    if (!sortColumn) return filteredPositions;
    return [...filteredPositions].sort((a, b) => {
      const aValue = getSortableValue(a, sortColumn);
      const bValue = getSortableValue(b, sortColumn);
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPositions, sortColumn, sortDirection]);

  // Handle add position
  const handleAddPosition = async (formData: AddPositionFormValues) => {
    try {
      const result = await safeFetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        timeoutMs: 10000
      });

      if (!result.ok) {
        console.warn('Skipping failed endpoint /api/positions (POST):', result.error || result.status);
        throw new Error(`Failed to add position: ${result.error}`);
      }

      const newPosition = result.data as any;
      setPositions(prev => [...prev, newPosition]);
      setIsAddModalOpen(false);
      toast.success('Position added successfully');
      // Refresh departments and recruiter stats in case a new department was added
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        fetchAllDepartments();
        fetchRecruiterStats();
      }, 500);
    } catch (error) {
      toast.error('Failed to add position');
    }
  };

  // Use shared SSE connection for realtime updates (aligned with candidate page and dashboard)
  const { isConnected: realtimeConnected, subscribeToEvents } = useSharedSSE();

  // Update refs to track authentication status to avoid stale closures in SSE effect
  useEffect(() => {
    statusRef.current = status;
    sessionUserIdRef.current = session?.user?.id;
  }, [status, session?.user?.id]);

  useEffect(() => {
    let mounted = true;
    let refreshTimeout: NodeJS.Timeout | null = null;
    let lastUpdateTime = 0;
    const MIN_UPDATE_INTERVAL = 500; // Minimum 500ms between updates

    // Only subscribe to events if user is authenticated
    if (statusRef.current !== 'authenticated' || !sessionUserIdRef.current) {
      return;
    }

    // Subscribe to shared SSE events
    const unsubscribe = subscribeToEvents((event) => {
      if (!mounted) return;

      if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
        console.log('[PositionsPage] SSE event received via shared connection:', event);
      }

      // Handle different event types with improved debouncing and rate limiting
      if (event.type === 'position_update' || event.type === 'dashboard_update' || event.type === 'candidate_update') {
        const now = Date.now();

        // Rate limit updates to prevent excessive reloading
        if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) {
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
            console.log('[PositionsPage] Update rate limited, skipping');
          }
          return;
        }

        if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
          console.log('[PositionsPage] Processing update event:', event.type);
        }

        // Clear existing timeout and set new one to prevent rapid successive calls
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }

        refreshTimeout = setTimeout(() => {
          // Use refs to check current authentication status
          if (mounted && statusRef.current === 'authenticated' && sessionUserIdRef.current) {
            lastUpdateTime = Date.now();
            // Use refs instead of state to avoid dependency issues
            const tableLoading = isTableLoadingRef.current;
            const searching = isSearchingRef.current;
            const fetchPositionsFn = fetchPositionsRef.current;
            const fetchRecruiterStatsFn = fetchRecruiterStatsRef.current;
            console.log('[PositionsPage] SSE refresh triggered - isTableLoading:', tableLoading, 'isSearching:', searching);
            // Only fetch if not currently in table loading state (allow during initial load)
            if (!tableLoading && !searching && fetchPositionsFn && fetchRecruiterStatsFn) {
              console.log('[PositionsPage] Calling fetchPositions and fetchRecruiterStats');
              fetchPositionsFn(false);
              fetchRecruiterStatsFn();
            } else {
              console.log('[PositionsPage] Skipping refresh due to loading state or missing functions');
            }
          }
        }, 500); // 500ms debounce for better responsiveness
      }
    });

    return () => {
      mounted = false;
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribeToEvents]); // Only depend on subscribeToEvents which is stable



  // Handle delete position
  const handleDeletePosition = async () => {
    if (!positionToDelete) return;

    try {
      const result = await safeFetch(`/api/positions/${positionToDelete.id}`, {
        method: 'DELETE',
        timeoutMs: 8000
      });

      if (!result.ok) {
        console.warn('Skipping failed endpoint /api/positions/[id] (DELETE):', result.error || result.status);
        throw new Error(`Failed to delete position: ${result.error}`);
      }

      setPositions(prev => prev.filter(p => p.id !== positionToDelete.id));
      setPositionToDelete(null);
      toast.success('Position deleted successfully');
      // Refresh recruiter stats after deletion
      fetchRecruiterStats();
    } catch (error) {
      toast.error('Failed to delete position');
    }
  };

  // Bulk selection logic
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredPositions.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };
  const handleRowSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };
  // Bulk delete handler
  const handleBulkDelete = async () => {
    setShowBulkDeleteConfirm(false);
    try {
      const deletePromises = selectedIds.map(id =>
        safeFetch(`/api/positions/${id}`, { method: 'DELETE', timeoutMs: 8000 })
      );
      const results = await safeAll(deletePromises);

      // Check if any deletions failed
      const failedDeletions = results.filter(result => !result.ok);
      if (failedDeletions.length > 0) {
        console.warn('Some position deletions failed:', failedDeletions.map(r => r.error));
        throw new Error('Failed to delete some positions');
      }
      setPositions(prev => prev.filter(p => !selectedIds.includes(p.id)));
      setSelectedIds([]);
      toast.success('Selected positions deleted successfully');
      // Refresh recruiter stats after bulk deletion
      fetchRecruiterStats();
    } catch (error) {
      toast.error('Failed to delete some positions');
    }
  };

  // Bulk match criteria update handler
  const handleBulkMatchCriteriaUpdate = async (matchCriteria: string) => {
    try {
      const response = await safeFetch('/api/positions/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_match_criteria',
          positionIds: selectedIds,
          matchCriteria: matchCriteria
        }),
        timeoutMs: 10000
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to update match criteria');
      }

      // Update local state
      setPositions(prev => prev.map(position =>
        selectedIds.includes(position.id)
          ? { ...position, matchCriteria }
          : position
      ));

      setSelectedIds([]);
      toast.success(`Match criteria updated for ${selectedIds.length} position${selectedIds.length !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Failed to update match criteria:', error);
      toast.error('Failed to update match criteria');
      throw error;
    }
  };

  const handleExportPositions = async () => {
    try {
      const result = await safeFetch('/api/positions/export', {
        method: 'GET',
        timeoutMs: 15000
      });

      if (!result.ok) {
        console.warn('Skipping failed endpoint /api/positions/export:', result.error || result.status);
        throw new Error(`Failed to export positions: ${result.error}`);
      }

      // Create a blob from the response
      const blob = new Blob([result.data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'positions-export.xlsx';
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Positions exported successfully as Excel file');
    } catch (error) {
      toast.error('Failed to export positions');
    }
  };

  // Add refs for content
  const contentRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    // Calculate column count based on job match feature
    const columnCount = isJobMatchEnabled ? 9 : 8;
    return (
      <div className="w-full h-screen positions-page-container">
        <div className="flex h-full overflow-hidden">
          <div className="flex-1 positions-content-area h-full">
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 flex-shrink-0">
                <div className="h-10 bg-muted rounded animate-pulse w-64" />
              </div>
              <div className="flex-1 overflow-auto p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hide-on-mobile">Headcount</TableHead>
                      <TableHead className="hide-on-mobile">Recruiter</TableHead>
                      <TableHead className="hide-on-mobile">Applied</TableHead>
                      {isJobMatchEnabled && <TableHead className="hide-on-mobile">Potential Matched</TableHead>}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SkeletonTableRows rows={10} columns={columnCount} />
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-screen positions-page-container", isMobile && "bg-secondary/50")}>
      <div className="flex h-full overflow-hidden">
        {/* Recruiter Filter Sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-screen overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted/20 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/50">
          <RecruiterFilterSidebar
            selectedRecruiterId={selectedRecruiterId}
            onRecruiterSelect={handleRecruiterSelect}
            recruiterStats={recruiterStats}
            recruiters={availableRecruiter}
          />
        </aside>

        {/* Main Content */}
        <div className="flex-1 positions-content-area h-full">
          <div ref={contentRef} className="flex flex-col h-full overflow-hidden">
            {/* Mobile Search Input */}
            {isMobile && (
              <div className="p-4 pb-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search positions..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={handleSearchFocus}
                    onKeyDown={handleSearchKeyDown}
                    onBlur={handleSearchBlur}
                    className="pl-10 pr-10 h-10 transition-all duration-200"
                    ref={searchInputRef}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={handleClearSearch}
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Filters and Vacant Headcount in same row */}
            <div className="hidden md:flex p-4 flex-col lg:flex-row lg:items-center lg:justify-between gap-4 flex-shrink-0">
              {/* Left side: Vacant Headcount + Filters */}
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                {/* Vacant Headcount - Left side (hidden on mobile) */}
                <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-primary/5 dark:bg-primary/10 rounded-lg border">
                  <Users className="h-4 w-4 text-primary" />
                  <div className="text-sm">
                    <span className="font-semibold text-primary">
                      {isLoadingHeadcount ? (
                        <Loader2 className="h-4 w-4 animate-spin inline" />
                      ) : (
                        vacantFromOpenPositions.vacant
                      )}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      vacant from {vacantFromOpenPositions.totalOpen} open position{vacantFromOpenPositions.totalOpen !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Filters - Hidden on mobile */}
                <div className="hidden md:flex flex-col sm:flex-row gap-3 flex-1">
                  <div className="relative w-[180px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search positions..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      onFocus={handleSearchFocus}
                      onKeyDown={handleSearchKeyDown}
                      onBlur={handleSearchBlur}
                      className="pl-10 pr-10 transition-all duration-200"
                      ref={searchInputRef}
                      autoComplete="off"
                      spellCheck="false"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={handleClearSearch}
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Select
                    value={statusFilter || ''}
                    onValueChange={(value: 'all' | 'open' | 'closed') => setStatusFilter(value)}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  {isLoadingDepartments ? (
                    <div className="w-[160px] px-3 py-2 text-xs text-muted-foreground bg-muted/50 rounded-md border border-dashed flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </div>
                  ) : allDepartments.length > 0 ? (
                    <Popover open={departmentPopoverOpen} onOpenChange={setDepartmentPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={departmentPopoverOpen} className="w-[160px] justify-between text-xs font-normal">
                          {departmentFilter === 'all' ? 'All Departments' : departmentFilter}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0" align="start">
                        <Command>
                          <div className="flex items-center border-b px-3">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <input
                              placeholder="Search departments..."
                              value={departmentSearch}
                              onChange={(e) => setDepartmentSearch(e.target.value)}
                              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>
                          <CommandList>
                            <div className="max-h-[200px] p-1">
                              <div
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                onClick={() => handleDepartmentSelect('all')}
                              >
                                <Check className={`mr-2 h-4 w-4 ${departmentFilter === 'all' ? 'opacity-100' : 'opacity-0'}`} />
                                All Departments
                              </div>
                              {allDepartments
                                .filter(dept => dept.toLowerCase().includes(departmentSearch.toLowerCase()))
                                .map(dept => (
                                  <div
                                    key={dept}
                                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                    onClick={() => handleDepartmentSelect(dept)}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${departmentFilter === dept ? 'opacity-100' : 'opacity-0'}`} />
                                    {dept}
                                  </div>
                                ))}
                            </div>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="w-[160px] px-3 py-2 text-xs text-muted-foreground bg-muted/50 rounded-md border border-dashed">
                      <div className="flex items-center gap-2">
                        <span>No departments</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 text-xs"
                          onClick={() => fetchAllDepartments()}
                          title="Retry loading departments"
                        >
                          <Loader2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side: Action buttons - Hide export/import on mobile */}
              {true && (
                <div className="flex gap-2">
                  {!isMobile && (
                    <>
                      <Button onClick={() => setIsAddModalOpen(true)} className="btn-primary-gradient whitespace-nowrap">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Position
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setIsImportModalOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Import Positions
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleExportPositions}>
                            <Download className="mr-2 h-4 w-4" />
                            Export to Excel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              )}
            </div>



            {/* Search Status Indicator */}
            {(searchTerm || statusFilter !== 'all' || departmentFilter !== 'all') && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md flex-shrink-0">
                <Filter className="h-4 w-4" />
                <span>Active filters:</span>
                {searchTerm && (
                  <Badge variant="secondary" className="text-xs">
                    Title: "{searchTerm}"
                  </Badge>
                )}
                {statusFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Status: {statusFilter === 'open' ? 'Open' : 'Closed'}
                  </Badge>
                )}
                {departmentFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Department: {departmentFilter}
                  </Badge>
                )}
                {selectedRecruiterId && (
                  <Badge variant="secondary" className="text-xs">
                    Recruiter: {selectedRecruiterId === 'unassigned'
                      ? 'Unassigned'
                      : selectedRecruiterName || 'Selected'
                    }
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 px-2 text-xs"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setDepartmentFilter('all');
                    setSelectedRecruiterId(null);
                  }}
                >
                  Clear all
                </Button>
              </div>
            )}



            {/* Positions List */}
            <div className="positions-table-container border-t  flex-1 overflow-hidden flex flex-col">
              {filteredPositions.length === 0 ? (
                <div className="text-center py-12 empty-state">
                  <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No positions found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' || selectedRecruiterId
                      ? 'Try adjusting your filters'
                      : 'Get started by adding your first position'}
                  </p>
                  {canCreatePositions && !searchTerm && statusFilter === 'all' && departmentFilter === 'all' && !selectedRecruiterId && (
                    <Button onClick={() => setIsAddModalOpen(true)} className="btn-primary-gradient">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add First Position
                    </Button>
                  )}
                </div>
              ) : isMobile ? (
                /* Mobile list view */
                <div className="flex-1 overflow-hidden relative flex flex-col">
                  {/* Pull to Refresh Indicator */}
                  <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
                    <PullToRefreshIndicator
                      pullProgress={pullProgress}
                      isRefreshing={isRefreshing}
                    />
                  </div>
                  <div
                    ref={pullToRefreshRef as React.RefObject<HTMLDivElement>}
                    className="flex-1 overflow-auto pb-24"
                    onScroll={(e) => {
                      const target = e.target as HTMLDivElement;
                      const scrollPercentage = (target.scrollTop + target.clientHeight) / target.scrollHeight;
                      // Load more when 80% scrolled
                      if (scrollPercentage > 0.8 && mobileDisplayCount < sortedPositions.length) {
                        setMobileDisplayCount(prev => Math.min(prev + 20, sortedPositions.length));
                      }
                    }}
                  >
                    <PositionsMobileListView
                      positions={sortedPositions.slice(0, mobileDisplayCount)}
                      headcountData={headcountData}
                      isLoadingHeadcount={isLoadingHeadcount}
                      isJobMatchEnabled={isJobMatchEnabled}
                      page={page}
                      pageSize={pageSize}
                      onPositionClick={(positionId) => {
                        // On mobile, navigate to full page view
                        if (isMobile) {
                          router.push(`/positions/${positionId}`);
                        } else {
                          setSelectedPositionId(positionId);
                          setIsNewDrawerOpen(true);
                        }
                      }}
                      onEditClick={(positionId, e) => {
                        e.stopPropagation();
                        if (isMobile) {
                          router.push(`/positions/${positionId}?edit=true`);
                        } else {
                          setEditingPositionId(positionId);
                          setIsEditDrawerOpen(true);
                        }
                      }}
                      onDeleteClick={(position, e) => {
                        e.stopPropagation();
                        setPositionToDelete(position);
                      }}
                    />
                    {/* Loading indicator when more items available */}
                    {mobileDisplayCount < sortedPositions.length && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-lg shadow overflow-hidden relative table-container-responsive flex-1 flex flex-col"

                >


                  {/* Bulk Action Bar */}
                  {selectedIds.length > 0 && (
                    <div className="flex items-center gap-3 p-2 bg-muted/30 border-b border-border">
                      <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
                      <Button variant="ghost" size="sm" onClick={() => setIsBulkMatchCriteriaModalOpen(true)} className="h-7 px-2 text-primary hover:bg-primary/10 hover:text-primary">
                        <Edit className="h-3 w-3 mr-1" /> Update Match Criteria
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowBulkDeleteConfirm(true)} className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="h-7 px-2 text-muted-foreground hover:text-foreground">
                        Clear
                      </Button>
                    </div>
                  )}

                  {/* Scrollable Table Container */}
                  <div className="positions-table-scroll table-scrollbar flex-1 overflow-auto">
                    <Table className="min-w-full table-content-expandable">
                      <TableHeader className="table-sticky-header">
                        <TableRow>
                          <TableHead key="row-number" className="w-8 min-w-[32px] text-center">#</TableHead>
                          <TableHead key="select-all" className="w-12 min-w-[48px]">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={handleSelectAll}
                              aria-label="Select all positions"
                            />
                          </TableHead>
                          <TableHead className="group cursor-pointer select-none" onClick={() => { handleSort('title'); setOpenMenu(null); }}>
                            <span className="inline-flex items-center gap-1">
                              Title
                              <DropdownMenu open={openMenu === 'title'} onOpenChange={open => setOpenMenu(open ? 'title' : null)}>
                                <DropdownMenuTrigger asChild>
                                  {sortColumn === 'title' ? (
                                    <button type="button" className="text-primary font-bold p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('title'); }} aria-label="Sort options">
                                      {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                  ) : (
                                    <button type="button" className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('title'); }} aria-label="Sort options">
                                      <MoreVertical size={16} />
                                    </button>
                                  )}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { handleSort('title', 'asc'); setOpenMenu(null); }}>Sort Ascending <ChevronUp size={16} className="ml-1 inline" /></DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { handleSort('title', 'desc'); setOpenMenu(null); }}>Sort Descending <ChevronDown size={16} className="ml-1 inline" /></DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { handleSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </span>
                          </TableHead>


                          <TableHead className="group cursor-pointer select-none" onClick={() => { handleSort('status'); setOpenMenu(null); }}>
                            <span className="inline-flex items-center gap-1">
                              Status
                              <DropdownMenu open={openMenu === 'status'} onOpenChange={open => setOpenMenu(open ? 'status' : null)}>
                                <DropdownMenuTrigger asChild>
                                  {sortColumn === 'status' ? (
                                    <button type="button" className="text-primary font-bold p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('status'); }} aria-label="Sort options">
                                      {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                  ) : (
                                    <button type="button" className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('status'); }} aria-label="Sort options">
                                      <MoreVertical size={16} />
                                    </button>
                                  )}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { handleSort('status', 'asc'); setOpenMenu(null); }}>Sort Ascending <ChevronUp size={16} className="ml-1 inline" /></DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { handleSort('status', 'desc'); setOpenMenu(null); }}>Sort Descending <ChevronDown size={16} className="ml-1 inline" /></DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { handleSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </span>
                          </TableHead>
                          <TableHead className="text-center">
                            <span className="inline-flex items-center gap-1">
                              Headcount
                            </span>
                          </TableHead>
                          <TableHead className="group cursor-pointer select-none hide-on-mobile" onClick={() => { handleSort('recruiter'); setOpenMenu(null); }}>
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              Recruiter
                              <DropdownMenu open={openMenu === 'recruiter'} onOpenChange={open => setOpenMenu(open ? 'recruiter' : null)}>
                                <DropdownMenuTrigger asChild>
                                  {sortColumn === 'recruiter' ? (
                                    <button type="button" className="text-primary font-bold p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('recruiter'); }} aria-label="Sort options">
                                      {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                  ) : (
                                    <button type="button" className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('recruiter'); }} aria-label="Sort options">
                                      <MoreVertical size={16} />
                                    </button>
                                  )}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { handleSort('recruiter', 'asc'); setOpenMenu(null); }}>Sort Ascending <ChevronUp size={16} className="ml-1 inline" /></DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { handleSort('recruiter', 'desc'); setOpenMenu(null); }}>Sort Descending <ChevronDown size={16} className="ml-1 inline" /></DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { handleSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </span>
                          </TableHead>

                          <TableHead className="hide-on-mobile">Applied</TableHead>
                          {isJobMatchEnabled && (
                            <TableHead className="hide-on-mobile">Potential Matched</TableHead>
                          )}
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="h-full">
                        {isTableLoading ? (
                          <SkeletonTableRows rows={10} columns={isJobMatchEnabled ? 9 : 8} />
                        ) : (
                          sortedPositions.map((position, index) => {
                            const rowNumber = (page - 1) * pageSize + index + 1;
                            return (
                              <TableRow
                                key={position.id}
                                className="hover:bg-muted/50 transition-all duration-500 ease-in-out hover:scale-[1.015] hover:shadow-2xl hover:z-10 relative border-b border-border content-fade-in"
                                style={{
                                  animationDelay: `${index * 20}ms`,
                                  willChange: 'transform, box-shadow'
                                }}
                              >
                                <TableCell key={`${position.id}-row-number`} className="text-center font-mono text-xs text-muted-foreground">
                                  {rowNumber}
                                </TableCell>
                                <TableCell key={`${position.id}-select`}>
                                  <Checkbox
                                    checked={selectedIds.includes(position.id)}
                                    onCheckedChange={(checked) => handleRowSelect(position.id, checked === true)}
                                    aria-label={`Select position ${position.title}`}
                                  />
                                </TableCell>
                                <TableCell className="font-medium min-w-[150px]">
                                  <div className="flex flex-col">
                                    <button
                                      onClick={() => {
                                        setSelectedPositionId(position.id);
                                        setIsNewDrawerOpen(true);
                                      }}
                                      className="text-primary hover:underline font-medium text-left cursor-pointer hover:text-primary/80 transition-colors flex items-start gap-1 group"
                                      title="Click to view position details"
                                    >
                                      {position.title}
                                      {/* SLA badges inline with title */}
                                      <SLABadge position={position} />
                                      {position.grade && position.grade.color && (
                                        <span
                                          className="inline text-xs px-1.5 py-0.5 rounded-full border ml-1"
                                          style={{
                                            borderColor: position.grade.color,
                                            color: position.grade.color,
                                            backgroundColor: 'transparent'
                                          }}
                                        >
                                          {position.grade.name}
                                        </span>
                                      )}
                                      {position.grade && !position.grade.color && (
                                        <span className="inline text-xs text-muted-foreground ml-1">
                                          {position.grade.name}
                                        </span>
                                      )}
                                      <Eye className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                                    </button>
                                    <span className="text-xs text-muted-foreground mt-0.5">
                                      {position.positionLevel && `${position.positionLevel} • `}
                                      {position.department}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {position.isOpen ? (
                                    <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">Open</Badge>
                                  ) : (
                                    <Badge className="bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800">Closed</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {isLoadingHeadcount ? (
                                    <div className="flex justify-center">
                                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                  ) : headcountData[position.id] ? (
                                    <div className="flex items-center justify-center">
                                      <Badge
                                        className={cn(
                                          "text-xs px-2 py-0.5",
                                          headcountData[position.id].filled === 0 && headcountData[position.id].total === 0
                                            ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                                            : headcountData[position.id].filled >= headcountData[position.id].total
                                              ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                                              : "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                                        )}
                                      >
                                        {headcountData[position.id].filled}/{headcountData[position.id].total}
                                      </Badge>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="hide-on-mobile">
                                  <RecruiterCell
                                    position={position}
                                    availableRecruiter={availableRecruiter}
                                    canManagePositions={canAssignPositionRecruiter}
                                    isAssigning={assigningRecruiter === position.id}
                                    onAssignRecruiter={handleAssignRecruiterToPosition}
                                    onResetAssigning={resetAssigningRecruiter}
                                  />
                                </TableCell>

                                <TableCell className="text-center hide-on-mobile">
                                  {(position.candidateStats?.appliedStatusCount ?? 0) > 0 ? (
                                    <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-medium bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 rounded-md">
                                      {position.candidateStats?.appliedStatusCount}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-medium bg-muted text-muted-foreground rounded-md">
                                      0
                                    </span>
                                  )}
                                </TableCell>
                                {isJobMatchEnabled && (
                                  <TableCell className="text-center hide-on-mobile">
                                    {(position.candidateStats?.totalMatching ?? 0) > 0 ? (
                                      <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 rounded-md">
                                        {position.candidateStats?.totalMatching}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-medium bg-muted text-muted-foreground rounded-md">
                                        0
                                      </span>
                                    )}
                                  </TableCell>
                                )}
                                <TableCell>
                                  <div className="flex items-center gap-2 action-buttons">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingPositionId(position.id);
                                        setIsEditDrawerOpen(true);
                                      }}
                                      title="Edit position"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    {true && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setPositionToDelete(position)}
                                          className="text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Controls - Inside table container at bottom */}
                  {(total > 0 || totalPages > 0) && (
                    <div className="p-2 border-t bg-background flex-shrink-0">
                      {isMobile ? (
                        /* Mobile: See More Button */
                        <div className="p-4">
                          {page < totalPages ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="text-sm text-muted-foreground text-center">
                                Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of {total} positions
                              </div>
                              <Button
                                onClick={() => {
                                  const newPage = page + 1;
                                  setPage(newPage);
                                  updateURL(newPage);
                                }}
                                variant="outline"
                                className="w-full max-w-xs h-12 text-base font-medium active:scale-95 touch-manipulation"
                              >
                                See More
                                <ChevronDown className="h-5 w-5 ml-2" />
                              </Button>
                            </div>
                          ) : (
                            <div className="text-center text-sm text-muted-foreground py-2">
                              Showing all {total} positions
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Desktop: Full Pagination */
                        <Pagination
                          currentPage={page}
                          totalPages={Math.max(1, totalPages)}
                          pageSize={pageSize}
                          total={total}
                          onPageChange={(newPage) => {
                            setPage(newPage);
                            updateURL(newPage);
                          }}
                          onPageSizeChange={(newPageSize) => {
                            setPageSize(newPageSize);
                            setPage(1);
                            updateURL(1, newPageSize);
                          }}
                          pageSizeOptions={[10, 20, 50, 100]}
                          showPageSizeSelector={true}
                          className="mt-4"
                        />
                      )}
                    </div>
                  )}
                </div>

              )}
            </div>

          </div>
        </div>
      </div>


      {/* Desktop: Modal, Mobile: Drawer */}
      {isMobile ? (
        <AddPositionMobileDrawer
          isOpen={isAddModalOpen}
          onOpenChange={setIsAddModalOpen}
          onAddPosition={handleAddPosition}
        />
      ) : (
        <AddPositionModal
          isOpen={isAddModalOpen}
          onOpenChange={setIsAddModalOpen}
          onAddPosition={handleAddPosition}
        />
      )}
      {true && (
        <ImportPositionsModal
          isOpen={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
          onImportSuccess={() => {
            fetchPositions();
            fetchRecruiterStats();
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!positionToDelete} onOpenChange={() => setPositionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Position</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{positionToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePosition} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Delete Positions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} selected position(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Match Criteria Update Modal */}
      <BulkMatchCriteriaModal
        isOpen={isBulkMatchCriteriaModalOpen}
        onClose={() => setIsBulkMatchCriteriaModalOpen(false)}
        onConfirm={handleBulkMatchCriteriaUpdate}
        selectedCount={selectedIds.length}
      />

      {/* Position Detail Drawer */}
      <PositionDetailDrawer
        isOpen={isNewDrawerOpen}
        onOpenChange={(open) => {
          setIsNewDrawerOpen(open);
          if (!open) {
            setSelectedPositionId(null);
            // Refresh position data when drawer closes to get updated headcount data
            console.log('[PositionsPage] Drawer closed, refreshing position data');
            fetchPositions(false);
          }
        }}
        positionId={selectedPositionId}
      />

      {/* Position Edit Drawer */}
      <PositionDetailDrawer
        isOpen={isEditDrawerOpen}
        onOpenChange={(open) => {
          setIsEditDrawerOpen(open);
          if (!open) {
            setEditingPositionId(null);
            // Refresh position data when drawer closes to get updated headcount data
            console.log('[PositionsPage] Edit drawer closed, refreshing position data');
            fetchPositions(false);
          }
        }}
        positionId={editingPositionId}
        initialEditMode={false}
      />

      {/* Mobile Filter Floating Button Group */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 md:hidden flex flex-row gap-3 items-center">
        {/* Filter Button */}
        <Button
          size="lg"
          className="h-12 px-6 rounded-full shadow-xl bg-background hover:bg-muted text-foreground border border-border transition-all duration-200 hover:scale-105 active:scale-95 text-sm"
          style={{
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
          onClick={() => setIsMobileFilterModalOpen(true)}
          aria-label="Open filters"
        >
          <Filter className="h-4 w-4 mr-2" />
          <span className="flex items-center gap-1">
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold">
                {activeFilterCount}
              </span>
            )}
          </span>
        </Button>
        {/* Add Position Button */}
        <Button
          size="lg"
          className="h-12 w-12 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground border-0 transition-all duration-200 hover:scale-105 active:scale-95 p-0 flex items-center justify-center"
          style={{
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
          onClick={() => setIsAddModalOpen(true)}
          aria-label="Add Position"
        >
          <PlusCircle className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Filter Modal - match candidate mobile filter design */}
      <Dialog open={isMobileFilterModalOpen} onOpenChange={setIsMobileFilterModalOpen}>
        <DialogContent
          className="fixed bottom-0 left-1/2 top-auto translate-x-[-50%] translate-y-0 w-screen max-w-none h-[90vh] p-0 overflow-hidden rounded-t-3xl rounded-b-none border-0 shadow-2xl bg-background"
          dialogId="position-filter-modal"
        >
          <DialogHeader className="px-4 pt-6 pb-6 flex-shrink-0 border-b">
            <DialogTitle>Filter Positions</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search positions..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 pr-10"
                autoComplete="off"
                spellCheck="false"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={statusFilter || ''}
                onValueChange={(value: 'all' | 'open' | 'closed') => setStatusFilter(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            {isLoadingDepartments ? (
              <div className="w-full px-3 py-2 text-xs text-muted-foreground bg-muted/50 rounded-md border border-dashed flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </div>
            ) : allDepartments.length > 0 ? (
              <div>
                <label className="text-sm font-medium mb-2 block">Department</label>
                <Select
                  value={departmentFilter || 'all'}
                  onValueChange={(value: string) => handleDepartmentSelect(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {allDepartments.map(dept => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="w-full px-3 py-2 text-xs text-muted-foreground bg-muted/50 rounded-md border border-dashed">
                <div className="flex items-center gap-2">
                  <span>No departments</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 text-xs"
                    onClick={() => fetchAllDepartments()}
                    title="Retry loading departments"
                  >
                    <Loader2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 