"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ApplicantFilters } from '@/components/applicants/ApplicantFilters';
import { sanitizeUrl } from '@/lib/security';
import { ApplicantTable } from '@/components/applicants/ApplicantTable';
import type { Applicant, ApplicantFilterValues, Position, RecruitmentStage } from '@/lib/types';
import { getScoreRangesForChart } from '@/lib/scoreUtils';
import { Button } from '@/components/ui/button';
import { PlusCircleIcon as PlusCircle, UsersIcon as Users, ExclamationTriangleIcon as ServerCrash, BoltIcon as Zap, ArrowPathIcon as Loader2, ArrowDownTrayIcon as FileDown, ArrowUpTrayIcon as FileUp, ChevronDownIcon as ChevronDown, TableCellsIcon as FileSpreadsheet, ShieldExclamationIcon as ShieldAlert, CpuChipIcon as Brain, TrashIcon as BulkTrashIcon, PencilSquareIcon as BulkEditIcon, ChevronLeftIcon as ChevronLeft, ChevronRightIcon as ChevronRight, ChevronUpDownIcon as ChevronsUpDown, CheckIcon as Check, BriefcaseIcon as Briefcase, XMarkIcon as X, FunnelIcon as Filter, MagnifyingGlassIcon as Search, Cog6ToothIcon as Settings, EllipsisVerticalIcon as MoreVertical, TrashIcon as Trash2, PencilSquareIcon as FileEdit, UsersIcon as UsersIcon, ArrowPathIcon as RefreshCw } from '@heroicons/react/24/outline';
import { toast } from "react-hot-toast";
import { getErrorMessage } from '@/lib/networkUtils';
import { AddApplicantModal } from '@/components/applicants/AddApplicantModal';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import BulkUploadCVsModal from '@/components/BulkUploadCVsModal';
import ApplicantImportModal from '@/components/applicants/ApplicantImportModal';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from 'framer-motion';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { StageSelect } from './StageSelect';

import { Badge } from '@/components/ui/badge';
import { UserMinusIcon as UserX } from '@heroicons/react/24/outline';
import { FitScoreFilterBadges } from './FitScoreFilterBadges';
import { FitScoreFilterTabs } from './FitScoreFilterTabs';
import { ApplicantSettingsDrawer } from './ApplicantSettingsDrawer';
import { ApplicantsPageHeader } from './ApplicantsPageHeader';
// import { ApplicantsPageSidebar } from './ApplicantsPageSidebar'; // Sidebar removed in favor of popover
import { ApplicantsPageTableArea } from './ApplicantsPageTableArea';
import { ApplicantsPageModals } from './ApplicantsPageModals';
import { ApplicantsPageMobileFilter } from './ApplicantsPageMobileFilter';
import { ApplicantsPageMobileSearch } from './ApplicantsPageMobileSearch';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { ApplicantsMobileListView } from './ApplicantsMobileListView';
import ApplicantDetailModal from './ApplicantDetailModal';
import { useStageColors } from '@/hooks/use-stage-colors';
import { ApplicantsPageMobileFitScoreFilter } from './ApplicantsPageMobileFitScoreFilter';
import { useDynamicHeight } from '@/hooks/use-dynamic-height';
import { useApplicantSettings } from '@/hooks/use-applicant-settings';
import { useSharedSSE } from '@/hooks/use-shared-sse';
import { safeFetch, safeAll } from '@/lib/safe-fetch';


// Import our new hooks
import { useApplicantFilters } from './hooks/use-applicant-filters';
import { useApplicantData } from './hooks/use-applicant-data';
import { useApplicantFetching } from './hooks/use-applicant-fetching';
import { useApplicantActions } from './hooks/use-applicant-actions';
import { useApplicantAiSearch } from './hooks/use-applicant-ai-search';
import { useApplicantFiltersData } from '@/hooks/use-applicant-filters-data';
import { useIsMobile } from '@/hooks/use-mobile';

// Import safe effect hooks
// Removed complex emergency render monitor - using simple useEffect instead


interface ApplicantsPageClientProps {
  initialApplicants: Applicant[];
  initialAvailablePositions: Position[];
  initialAvailableStages: RecruitmentStage[];
  authError?: boolean;
  permissionError?: boolean;
  initialFetchError?: string;
  initialFilters?: ApplicantFilterValues;
}

export function ApplicantsPageClient({
  initialApplicants,
  initialAvailablePositions,
  initialAvailableStages,
  authError: serverAuthError = false,
  permissionError: serverPermissionError = false,
  initialFetchError,
  initialFilters,
}: ApplicantsPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();

  // Export/Import feature toggle state
  const [exportImportFeatureEnabled, setExportImportFeatureEnabled] = useState(true);

  // Filter sidebar pinned state - persisted in localStorage
  const [isFilterPinned, setIsFilterPinned] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('applicant-filter-pinned') === 'true';
    }
    return false;
  });

  // Add refs for height calculation
  const contentRef = useRef<HTMLDivElement>(null);
  const sidebarFilterRef = useRef<HTMLElement>(null);
  const activeFiltersBarRef = useRef<HTMLDivElement>(null);

  // Use dynamic height hook for responsive calculations
  const { height: tableHeight, elementRef: dynamicContentRef, addFilterRef, removeFilterRef } = useDynamicHeight({
    minHeight: 300,
    maxHeight: 800,
    buffer: 20,
    debounceMs: 150
  });

  // Settings
  const { settings: applicantSettings, setSettings: setApplicantSettings, isLoading: settingsLoading, error: settingsError, clearError: clearSettingsError } = useApplicantSettings();

  // Local state for pagination and UI
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  // Get pagination and sorting from settings
  const pageSize = applicantSettings?.pageSize || 20;
  const sortColumn = applicantSettings?.sortColumn || 'applicationDate';
  const sortDirection = applicantSettings?.sortDirection !== undefined ? applicantSettings.sortDirection : 'desc';


  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [isClearingFilters, setIsClearingFilters] = useState(false);
  const clearingFiltersTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Refs for SSE effect to avoid stale closures and unnecessary re-subscriptions
  const statusRef = useRef(sessionStatus);
  const sessionUserIdRef = useRef(session?.user?.id);
  const filtersRef = useRef<ApplicantFilterValues>({});
  const pageRef = useRef(page);
  const pageSizeRef = useRef(pageSize);

  // AI Search state
  const [aiSearchReasoning, setAiSearchReasoning] = useState<string | null>(null);
  const [aiMatchedApplicantIds, setAiMatchedApplicantIds] = useState<string[] | null>(null);
  const [aiRecordCount, setAiRecordCount] = useState<number>(0);
  const [isAiSearchActive, setIsAiSearchActive] = useState(false);

  // Search Drawer state
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [selectedApplicantForDetail, setSelectedApplicantForDetail] = useState<{ id: string, name: string } | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Performance Monitor state


  // Initial data fetch state
  const [hasInitialDataFetch, setHasInitialDataFetch] = useState<boolean>(false);

  // Stabilize setter functions to prevent unnecessary re-renders
  const stableSetAiMatchedApplicantIds = useCallback((ids: string[] | null) => {
    setAiMatchedApplicantIds(ids);
  }, []);

  const stableSetAiSearchReasoning = useCallback((reasoning: string | null) => {
    setAiSearchReasoning(reasoning);
  }, []);

  const stableSetAiRecordCount = useCallback((count: number) => {
    setAiRecordCount(count);
  }, []);

  const stableSetIsAiSearchActive = useCallback((active: boolean) => {
    setIsAiSearchActive(active);
  }, []);

  // Initialize filters from searchParams if not provided via props
  const computedInitialFilters = React.useMemo(() => {
    if (initialFilters) return initialFilters;
    
    const params: ApplicantFilterValues = {
      selectedPositionIds: [],
      selectedStatuses: [],
      selectedRecruiterIds: []
    };

    if (searchParams) {
      const statusParam = searchParams.get('status');
      if (statusParam) {
        params.selectedStatuses = statusParam.split(',').filter(Boolean);
      }

      const positionParam = searchParams.get('positionId');
      if (positionParam) {
        params.selectedPositionIds = positionParam.split(',').filter(Boolean);
      }

      const recruiterParam = searchParams.get('recruiterId');
      if (recruiterParam) {
        params.selectedRecruiterIds = recruiterParam.split(',').filter(Boolean);
      }
      
      const queryParam = searchParams.get('query');
      if (queryParam) {
        params.name = queryParam; // Use query as name filter fallback or handled by useApplicantFetching
      }
    }

    return params;
  }, [initialFilters, searchParams]);

  // Use our custom hooks
  const {
    filters: filtersFromHook,
    setFilters,
    horizontalSelectedFitScoreGrades,
    setHorizontalSelectedFitScoreGrades,
    horizontalSelectedMatchingFitScoreGrades,
    setHorizontalSelectedMatchingFitScoreGrades,
    handleHorizontalFitScoreGradeToggle,
    handleHorizontalMatchingFitScoreGradeToggle,
    applyHorizontalFitScoreFilters,
    handleFilterChange,
    clearAllFilters,
    clearAllHorizontalFitScoreFilters,
    filterChangeTimeoutRef,
    lastAppliedFiltersRef,
    optimisticUpdateRef
  } = useApplicantFilters(computedInitialFilters);

  // Listen for global search events from Header
  useEffect(() => {
    const handleGlobalSearch = (event: any) => {
      const query = event.detail;
      if (query !== undefined) {
        handleFilterChange({ name: query });
      }
    };

    window.addEventListener('global:search', (handleGlobalSearch as EventListener));
    return () => window.removeEventListener('global:search', (handleGlobalSearch as EventListener));
  }, [handleFilterChange]);

  // Use optimized filter data fetching
  const {
    filterData,
    isLoading: isFilterDataLoading,
    error: filterDataError,
    refetch: refetchFilterData
  } = useApplicantFiltersData();

  // Ensure filters is always defined to prevent "filters is not defined" errors
  const filters = filtersFromHook || {};

  // Add ref to track current filters
  const currentFiltersRef = useRef(filters);

  // Update ref when filters change - FIXED: Use regular useEffect instead of useEmergencySafeEffect
  useEffect(() => {
    currentFiltersRef.current = filters;
  }, [filters]);

  // Add emergency render monitoring
  // Removed complex emergency render monitor - using simple useEffect instead

  const {
    filteredApplicants,
    setFilteredApplicants,
    allApplicantsForCounts,
    setAllApplicantsForCounts,
    availablePositions,
    setAvailablePositions,
    availableStages,
    setAvailableStages,
    availableRecruiter,
    setAvailableRecruiter,
    availableSources,
    setAvailableSources,
    isLoading,
    setIsLoading,
    isFetching,
    setIsFetching,
    hasInitialFetch,
    setHasInitialFetch,
    fetchError,
    setFetchError,
    authError,
    setAuthError,
    permissionError,
    setPermissionError,

    currentRequestRef,
    latestRequestIdRef,
    normalizeFitScore,
    getBestMatchingFitScore,
    fetchRecruiter,
    fetchSources,
    fetchAllApplicantsForCounts,
    fetchApplicantById,
    refreshApplicantInList,
    applyOptimisticUpdate,
    revertOptimisticUpdate,
    databaseFitScoreCounts,
    isFitScoreCountsLoading,
    fetchFitScoreCounts,
    debouncedFetchFitScoreCounts,
    forceRefreshFitScoreCounts
  } = useApplicantData({
    initialApplicants,
    initialAvailablePositions,
    initialAvailableStages,
    sessionStatus,
    serverAuthError,
    serverPermissionError,
    initialFetchError,
    filters
  });

  // Use optimized filter data when available (always normalize to arrays)
  const effectivePositions = Array.isArray(filterData?.positions)
    ? filterData.positions
    : (Array.isArray(availablePositions) ? availablePositions : []);
  const effectiveStages = filterData?.stages && Array.isArray(filterData.stages)
    ? filterData.stages.map(stage => ({
      id: stage.id,
      name: stage.name,
      description: stage.description,
      isSystem: false, // Default value since it's not provided in filterData
      sortOrder: stage.sort_order,
      createdAt: undefined,
      updatedAt: undefined,
      color_complete: stage.color,
      color_badge: stage.color
    }))
    : (Array.isArray(availableStages) ? availableStages : []);
  const effectiveRecruiter = Array.isArray(filterData?.recruiters)
    ? filterData.recruiters
    : (Array.isArray(availableRecruiter) ? availableRecruiter : []);
  const effectiveSources = filterData?.sources && Array.isArray(filterData.sources)
    ? filterData.sources.map(source => ({
      id: source.id,
      name: source.name,
      description: source.description ?? null,
      email: null,
      logo: source.logo ?? null,
      allowSubSource: false,
      sortOrder: 0,
      isActive: true,
      createdAt: undefined,
      updatedAt: undefined,
    }))
    : (Array.isArray(availableSources) ? availableSources : []);

  // Stage Names map for mobile list view
  const stageNames = useMemo(() => {
    const map: Record<string, string> = {};
    effectiveStages.forEach((s) => {
      if (s.id && s.name) map[s.id] = s.name;
    });
    return map;
  }, [effectiveStages]);

  const uniqueStageIds = useMemo(() => {
    const ids = new Set<string>();
    filteredApplicants.forEach(a => {
      if (a.statusId) ids.add(a.statusId);
    });
    return Array.from(ids);
  }, [filteredApplicants]);

  const { stageColors } = useStageColors(uniqueStageIds);

  // Define useApplicantFetching first with dynamic showPinSection
  const {
    fetchTableData,
    debouncedFetchTableData,
    currentRequestRef: currentRequestRefFromHook,
    latestRequestIdRef: latestRequestIdRefFromHook
  } = useApplicantFetching({
    sessionStatus,
    serverAuthError,
    serverPermissionError,
    isClearingFilters,
    hasInitialDataFetch,
    searchParams,
    sortColumn,
    sortDirection,
    setFilteredApplicants,
    setTotal,
    setTableError,
    setTableLoading,
    setIsFetching,
    setAuthError,
    setPermissionError,
    setFetchError,
    setIsLoading,
    getShowPinSection: () => {
      // If settings are still loading, return false to avoid showing pinned applicants
      // until we know the user's actual preference
      if (settingsLoading) {
        return false;
      }
      return applicantSettings?.showPinSection || false;
    }
  });

  // Refs that depend on hook values - must be declared after hooks
  const isLoadingRef = useRef(isLoading);
  const fetchTableDataRef = useRef(fetchTableData);
  const fetchAllApplicantsForCountsRef = useRef(fetchAllApplicantsForCounts);
  const forceRefreshFitScoreCountsRef = useRef(forceRefreshFitScoreCounts);

  const {
    updateApplicantStatus,
    handleDeleteApplicant,
    handleAssignRecruiter,
    handleAssignSource
  } = useApplicantActions({
    setFilteredApplicants,
    setAllApplicantsForCounts,
    fetchTableData,
    filters,
    page,
    pageSize,
    aiMatchedApplicantIds
  });

  // FIXED: Stabilize callback functions to prevent infinite loops
  const handleApplicantUpdate = useCallback((updatedApplicant: any) => {
    setFilteredApplicants(prevApplicants => {
      const safePrevApplicants = Array.isArray(prevApplicants) ? prevApplicants : [];
      const existingIndex = safePrevApplicants.findIndex(c => c.id === updatedApplicant.id);
      if (existingIndex !== -1) {
        const updated = [...safePrevApplicants];
        updated[existingIndex] = { ...updated[existingIndex], ...updatedApplicant };
        return updated;
      } else {
        return [...safePrevApplicants, updatedApplicant];
      }
    });

    setAllApplicantsForCounts(prevApplicants => {
      const safePrevApplicants = Array.isArray(prevApplicants) ? prevApplicants : [];
      const existingIndex = safePrevApplicants.findIndex(c => c.id === updatedApplicant.id);
      if (existingIndex !== -1) {
        const updated = [...safePrevApplicants];
        updated[existingIndex] = { ...updated[existingIndex], ...updatedApplicant };
        return updated;
      } else {
        return [...safePrevApplicants, updatedApplicant];
      }
    });
  }, []);

  const handlePositionUpdate = useCallback((updatedPosition: any) => {
    setAvailablePositions(prevPositions => {
      const safePrevPositions = Array.isArray(prevPositions) ? prevPositions : [];
      const existingIndex = safePrevPositions.findIndex(p => p.id === updatedPosition.id);
      if (existingIndex !== -1) {
        const updated = [...safePrevPositions];
        updated[existingIndex] = { ...updated[existingIndex], ...updatedPosition };
        return updated;
      } else {
        return [...safePrevPositions, updatedPosition];
      }
    });
  }, []);

  const handlePresenceUpdate = useCallback((presence: any) => {
    // Handle presence updates if needed
  }, []);

  const handleUserListUpdate = useCallback((users: any[]) => {
    // Handle user list updates if needed
  }, []);

  const handleNotificationUpdate = useCallback((notification: any) => {
    // Handle notifications if needed
  }, []);

  // Update refs when values change to avoid stale closures
  // Consolidate ref updates to single effect
  useEffect(() => {
    statusRef.current = sessionStatus;
    sessionUserIdRef.current = session?.user?.id;
    isLoadingRef.current = isLoading;
    filtersRef.current = filters;
    pageRef.current = page;
    pageSizeRef.current = pageSize;
    fetchTableDataRef.current = fetchTableData;
    fetchAllApplicantsForCountsRef.current = fetchAllApplicantsForCounts;
    forceRefreshFitScoreCountsRef.current = forceRefreshFitScoreCounts;
  }, [sessionStatus, session?.user?.id, isLoading, filters, page, pageSize, fetchTableData, fetchAllApplicantsForCounts, forceRefreshFitScoreCounts]);

  // Use shared SSE connection for realtime updates (aligned with dashboard, position page, position sidebar, and taskboard)
  const { isConnected: realtimeConnected, subscribeToEvents } = useSharedSSE();

  useEffect(() => {
    let mounted = true;
    let refreshTimeout: NodeJS.Timeout | null = null;
    let lastUpdateTime = 0;
    const MIN_UPDATE_INTERVAL = 1000; // Minimum 1 second between updates

    // Only subscribe to events if user is authenticated
    if (statusRef.current !== 'authenticated' || !sessionUserIdRef.current) {
      return;
    }

    // Subscribe to shared SSE events
    const unsubscribe = subscribeToEvents((event) => {
      if (!mounted) return;

      if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
        // console.log('[ApplicantsPage] SSE event received via shared connection:', event);
      }

      // Handle different event types with improved debouncing and rate limiting
      if (event.type === 'Applicant_update' || event.type === 'position_update' || event.type === 'dashboard_update') {
        const now = Date.now();

        // Handle Applicant deletion events differently to avoid 404 errors
        if (event.type === 'Applicant_update' && event.data?.action === 'deleted') {
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
            // console.log('[ApplicantsPage] Applicant deletion event received, removing from local state');
          }

          // For deletion events, just remove the Applicant from local state without fetching
          const deletedApplicantId = event.data.applicantId;
          if (deletedApplicantId) {
            setFilteredApplicants(prev => Array.isArray(prev) ? prev.filter(c => c.id !== deletedApplicantId) : []);
            setAllApplicantsForCounts(prev => Array.isArray(prev) ? prev.filter(c => c.id !== deletedApplicantId) : []);
            // Update total count
            setTotal(prev => Math.max(0, prev - 1));
          }
          return; // Don't trigger full refresh for deletion events
        }

        // Handle individual applicant updates (like pin/unpin) without full refresh
        if (event.type === 'Applicant_update' && event.data && !event.data.action) {
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
            // console.log('[ApplicantsPage] Individual applicant update event received, updating specific applicant');
          }

          // Update the specific applicant in local state
          const updatedApplicant = event.data;
          if (updatedApplicant && updatedApplicant.id) {
            setFilteredApplicants(prev => Array.isArray(prev) ? prev.map(c => c.id === updatedApplicant.id ? updatedApplicant : c) : []);
            setAllApplicantsForCounts(prev => Array.isArray(prev) ? prev.map(c => c.id === updatedApplicant.id ? updatedApplicant : c) : []);
          }
          return; // Don't trigger full refresh for individual applicant updates
        }

        // Rate limit updates to prevent excessive reloading
        if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) {
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
            // console.log('[ApplicantsPage] Update rate limited, skipping');
          }
          return;
        }

        if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
          // console.log('[ApplicantsPage] Processing update event:', event.type);
        }

        // Clear existing timeout and set new one to prevent rapid successive calls
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }

        refreshTimeout = setTimeout(() => {
          // Use refs to check current values to avoid stale closures
          if (mounted && statusRef.current === 'authenticated' && sessionUserIdRef.current) {
            lastUpdateTime = Date.now();
            // Only fetch if not currently loading
            if (!isLoadingRef.current) {
              // Trigger a refresh by calling the existing fetch functions using refs
              const currentFilters = filtersRef.current;
              const currentPage = pageRef.current;
              const currentPageSize = pageSizeRef.current;
              const fetchTableDataFn = fetchTableDataRef.current;
              const fetchAllApplicantsForCountsFn = fetchAllApplicantsForCountsRef.current;
              const forceRefreshFitScoreCountsFn = forceRefreshFitScoreCountsRef.current;

              if (currentFilters && fetchTableDataFn) {
                fetchTableDataFn(currentFilters, currentPage, currentPageSize);
              }
              if (fetchAllApplicantsForCountsFn) {
                fetchAllApplicantsForCountsFn();
              }
              // Also refresh fit score counts when SSE events occur
              if (forceRefreshFitScoreCountsFn) {
                forceRefreshFitScoreCountsFn();
              }
            }
          }
        }, 1000); // 1 second debounce for better performance
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

  // Bulk action handlers
  const handleBulkDelete = useCallback(async (applicantIds: string[]) => {
    try {
      const response = await fetch('/api/applicants/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          applicantIds: applicantIds
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Bulk delete failed');
      }

      const result = await response.json();
      toast.success(`${result.successCount} Applicant(s) deleted successfully`);

      // Clear selection and refresh data
      setSelectedApplicantIds(new Set());
      if (filters) {
        fetchTableData(filters, page, pageSize);
      }
      fetchAllApplicantsForCounts();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [fetchTableData, filters, page, pageSize, fetchAllApplicantsForCounts]);

  const handleBulkChangeStatus = useCallback(async (applicantIds: string[], newStatus: string, notes?: string) => {
    try {
      const response = await fetch('/api/applicants/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_status',
          applicantIds: applicantIds,
          newStatus: newStatus,
          transitionNotes: notes
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Bulk status change failed');
      }

      const result = await response.json();

      // Check for rejected Applicants due to headcount constraints
      if (result.rejectedApplicants && result.rejectedApplicants.length > 0) {
        const rejectedCount = result.rejectedApplicants.length;
        const successCount = result.updatedCount || 0;

        if (successCount > 0) {
          toast.success(`${successCount} Applicant(s) status updated to ${newStatus}`);
        }

        if (rejectedCount > 0) {
          // Don't show toast for headcount constraints - they should be handled by warning modals
          // The error details will be shown in the UI through other means
          // console.log(`${rejectedCount} Applicant(s) failed due to headcount constraints:`, result.rejectedApplicants);
        }
      } else {
        toast.success(`${result.updatedCount || applicantIds.length} Applicant(s) status updated to ${newStatus}`);
      }

      // Clear selection and refresh data
      setSelectedApplicantIds(new Set());
      if (filters) {
        fetchTableData(filters, page, pageSize);
      }
      fetchAllApplicantsForCounts();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [fetchTableData, filters, page, pageSize, fetchAllApplicantsForCounts]);

  const handleBulkAssignRecruiter = useCallback(async (applicantIds: string[], recruiterId: string | null) => {
    try {
      const response = await fetch('/api/applicants/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_recruiter',
          applicantIds: applicantIds,
          newRecruiterId: recruiterId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Bulk recruiter assignment failed');
      }

      const result = await response.json();
      const recruiterName = Array.isArray(availableRecruiter) ? availableRecruiter.find(r => r.id === recruiterId)?.name || 'No Recruiter' : 'No Recruiter';
      toast.success(`${result.successCount} Applicant(s) assigned to ${recruiterName}`);

      // Clear selection and refresh data
      setSelectedApplicantIds(new Set());
      if (filters) {
        fetchTableData(filters, page, pageSize);
      }
      fetchAllApplicantsForCounts();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [fetchTableData, filters, page, pageSize, fetchAllApplicantsForCounts, availableRecruiter]);

  const handleBulkReprocess = useCallback(async (applicantIds: string[]) => {
    try {
      const response = await fetch('/api/applicants/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reprocess',
          applicantIds: applicantIds
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Bulk re-process failed');
      }

      const result = await response.json();

      if (result.reprocessErrors && result.reprocessErrors.length > 0) {
        const errorCount = result.reprocessErrors.length;
        const successCount = result.reprocessedCount || 0;

        if (successCount > 0) {
          toast.success(`${successCount} Applicant(s) queued for re-processing`);
        }

        if (errorCount > 0) {
          const safeReprocessErrors = Array.isArray(result.reprocessErrors) ? result.reprocessErrors : [];
          const errorMessages = safeReprocessErrors.map((error: any) =>
            `${error.ApplicantName}: ${error.error}`
          ).join(', ');
          toast.error(`${errorCount} Applicant(s) failed: ${errorMessages}`);
        }
      } else {
        toast.success(`${result.reprocessedCount || applicantIds.length} Applicant(s) queued for re-processing`);
      }

      // Clear selection and refresh data
      setSelectedApplicantIds(new Set());
      if (filters) {
        fetchTableData(filters, page, pageSize);
      }
      fetchAllApplicantsForCounts();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [fetchTableData, filters, page, pageSize, fetchAllApplicantsForCounts]);

  const {
    isAiSearching,
    handleAiSearch,
    cancelAiSearch
  } = useApplicantAiSearch({
    setFilteredApplicants,
    setAiMatchedApplicantIds: stableSetAiMatchedApplicantIds,
    setAiSearchReasoning: stableSetAiSearchReasoning,
    setAiRecordCount: stableSetAiRecordCount,
    setIsAiSearchActive: stableSetIsAiSearchActive,
    filteredApplicants
  });

  // UI state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreateViaAutomationModalOpen, setIsCreateViaAutomationModalOpen] = useState(false);
  const [isPositionDrawerOpen, setIsPositionDrawerOpen] = useState(false);
  const [selectedPositionForEdit, setSelectedPositionForEdit] = useState<Position | null>(null);
  const [selectedApplicantIds, setSelectedApplicantIds] = useState<Set<string>>(new Set());
  const [isBulkActionConfirmOpen, setIsBulkActionConfirmOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'delete' | 'change_status' | 'assign_recruiter' | 'reprocess' | null>(null);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [showFilters, setShowFilters] = useState(true);
  const [isMobileFilterModalOpen, setIsMobileFilterModalOpen] = useState(false);
  const isMobile = useIsMobile();

  const activeFilterCount = useMemo(() => {
    if (!filters) return 0;
    let count = 0;
    const {
      name,
      email,
      phone,
      selectedPositionIds,
      selectedStatuses,
      selectedRecruiterIds,
      selectedSourceIds,
      skills,
      location,
      minExperienceYears,
      maxExperienceYears,
      applicationDateStart,
      applicationDateEnd,
      minAppliedJobFitScore,
      maxAppliedJobFitScore,
      minMatchingJobFitScore,
      maxMatchingJobFitScore,
      aiSearchQuery,
      customFieldFilters,
    } = filters;

    if (name) count++;
    if (email) count++;
    if (phone) count++;
    if (location) count++;
    if (skills) count++;
    if (Array.isArray(selectedPositionIds) && selectedPositionIds.length) count++;
    if (Array.isArray(selectedStatuses) && selectedStatuses.length) count++;
    if (Array.isArray(selectedRecruiterIds) && selectedRecruiterIds.length) count++;
    if (Array.isArray(selectedSourceIds) && selectedSourceIds.length) count++;
    if (typeof minExperienceYears === 'number') count++;
    if (typeof maxExperienceYears === 'number') count++;
    if (applicationDateStart || applicationDateEnd) count++;
    if (typeof minAppliedJobFitScore === 'number' || typeof maxAppliedJobFitScore === 'number') count++;
    if (typeof minMatchingJobFitScore === 'number' || typeof maxMatchingJobFitScore === 'number') count++;
    if (aiSearchQuery) count++;
    if (customFieldFilters && Object.keys(customFieldFilters).length) count++;

    return count;
  }, [filters]);
  const [missingPositions, setMissingPositions] = useState<string[]>([]);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [advancedQueryFromUrl, setAdvancedQueryFromUrl] = useState<string>('');

  // Bulk action modal states
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [isBulkRecruiterModalOpen, setIsBulkRecruiterModalOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState<string>('');
  const [bulkNewRecruiterId, setBulkNewRecruiterId] = useState<string | null>(null);
  const [bulkTransitionNotes, setBulkTransitionNotes] = useState<string>('');

  // PageSize is now managed locally, no longer tied to settings

  // Stable callback for settings change
  const handleSettingsChange = useCallback(async (settings: any) => {
    setApplicantSettings(settings);
  }, [setApplicantSettings]);

  // Callback for page size change
  const handlePageSizeChange = useCallback(async (newPageSize: number) => {
    const updatedSettings = { ...applicantSettings, pageSize: newPageSize };
    await setApplicantSettings(updatedSettings);
    setPage(1); // Reset to first page when page size changes
  }, [applicantSettings, setApplicantSettings]);

  // Callback for sort change
  const handleSortChange = useCallback(async (column: string | null, direction?: 'asc' | 'desc' | null) => {
    const updatedSettings = {
      ...applicantSettings,
      sortColumn: column || 'applicationDate',
      sortDirection: direction !== undefined ? direction : 'desc'
    };
    await setApplicantSettings(updatedSettings);
  }, [applicantSettings, setApplicantSettings]);

  // Stable callback for settings drawer open/close
  const handleSettingsDrawerOpenChange = useCallback((open: boolean) => {
    setIsSettingsDrawerOpen(open);
  }, []);

  // Permissions
  const modulePermissions = session?.user?.modulePermissions || [];
  const canExportApplicants = modulePermissions.includes('applicantS_EXPORT') || false;
  const canCreateApplicants = modulePermissions.includes('applicantS_CREATE') || false;
  const canEditApplicants = modulePermissions.includes('applicantS_EDIT_BASIC') || modulePermissions.includes('applicantS_EDIT_BASIC_OWN') || modulePermissions.includes('applicantS_EDIT_BASIC_ALL') || false;
  const canDeleteApplicants = modulePermissions.includes('applicantS_DELETE') || false;
  const canChangeStatus = modulePermissions.includes('applicantS_PIPELINE_STAGE_UPDATE') || modulePermissions.includes('applicantS_PIPELINE_STAGE_UPDATE_OWN') || modulePermissions.includes('applicantS_PIPELINE_STAGE_UPDATE_ALL') || false;
  const canBulkChangeStatus = modulePermissions.includes('applicantS_PIPELINE_STAGE_BULK_UPDATE') || modulePermissions.includes('applicantS_PIPELINE_STAGE_UPDATE_OWN') || modulePermissions.includes('applicantS_PIPELINE_STAGE_UPDATE_ALL') || false;
  const canViewDetailed = modulePermissions.includes('applicantS_VIEW_DETAILED') || false;
  const canAssignSource = modulePermissions.includes('applicantS_SOURCE_ASSIGN') || false;
  const canAssignRecruiter = modulePermissions.includes('applicantS_RECRUITER_ASSIGN') || modulePermissions.includes('applicantS_RECRUITER_ASSIGN_OWN') || modulePermissions.includes('applicantS_RECRUITER_ASSIGN_ALL') || false;

  // Calculate total pages for pagination
  const totalPages = useMemo(() => {
    if (isAiSearchActive && aiMatchedApplicantIds) {
      return Math.max(1, Math.ceil(aiRecordCount / pageSize));
    }
    return Math.max(1, Math.ceil(total / pageSize));
  }, [isAiSearchActive, aiMatchedApplicantIds, aiRecordCount, pageSize, total]);

  // Get applicants for fit score counts
  // Note: Use allApplicantsForCounts for fit score calculation to get accurate counts for all applicants
  // This allows the fitscore horizon filter to show counts for unlimited applicants
  const applicantsForFitScoreCounts = useMemo(() => {
    // Use allApplicantsForCounts for fit score badge calculations
    // This provides accurate counts for all applicants, not just the current page
    return allApplicantsForCounts;
  }, [allApplicantsForCounts]);

  // Update total count when allApplicantsForCounts changes
  // Only update if we don't have a valid total from the main table fetch
  // This useEffect is now disabled to prevent conflicts with the main table fetch total
  /*
  useEffect(() => {
    // Only update total from allApplicantsForCounts if:
    // 1. We have Applicants in allApplicantsForCounts
    // 2. The current total is 0 (meaning no valid total from main table fetch)
    // 3. We're not currently clearing filters (to avoid race conditions)
    if (allApplicantsForCounts.length > 0 && total === 0 && !isClearingFilters) {
      setTotal(allApplicantsForCounts.length);
    }
  }, [allApplicantsForCounts, total, isClearingFilters]);
  */

  // Use database-level fit score counts for accurate badge display
  const applicantScoreCounts = useMemo(() => {
    // If AI search is active, calculate counts based on AI-matched applicants only
    if (isAiSearchActive && aiMatchedApplicantIds && aiMatchedApplicantIds.length > 0) {
      const scoreRanges = getScoreRangesForChart();
      const appliedScoreRangeCounts: { [key: string]: number } = {};
      const matchingScoreRangeCounts: { [key: string]: number } = {};

      // Get AI-matched applicants from the full applicant list
      const applicantsArray = Array.isArray(allApplicantsForCounts) ? allApplicantsForCounts : [];
      const aiMatchedApplicants = applicantsArray.filter(app =>
        aiMatchedApplicantIds.includes(app.id)
      );

      aiMatchedApplicants.forEach((applicant: Applicant) => {
        // Applied fit score - count each applied position record separately
        const appliedScores = [];

        // Add main fit score if available
        if (applicant.fitScore !== null && applicant.fitScore !== undefined) {
          const normalizedScore = normalizeFitScore(applicant.fitScore);
          appliedScores.push(normalizedScore);
        }

        // Add fit scores from parsedData.job_applied if available
        if (applicant.parsedData && typeof applicant.parsedData === 'object') {
          const parsedData = applicant.parsedData as any;
          if (parsedData.job_applied && parsedData.job_applied.fitScore) {
            appliedScores.push(normalizeFitScore(parsedData.job_applied.fitScore));
          }
        }

        if (appliedScores.length > 0) {
          // Count each applicant once based on their best applied score
          const bestAppliedScore = Math.max(...appliedScores);
          scoreRanges.forEach(range => {
            if (bestAppliedScore >= range.min && bestAppliedScore <= range.max) {
              appliedScoreRangeCounts[range.letter] = (appliedScoreRangeCounts[range.letter] || 0) + 1;
            }
          });
        } else {
          // Count applicants with no applied fit score
          appliedScoreRangeCounts['no-score'] = (appliedScoreRangeCounts['no-score'] || 0) + 1;
        }

        // Matching fit score - count each job match record separately
        const jobMatches = applicant.jobMatches || [];
        const parsedJobMatches = applicant.parsedData && typeof applicant.parsedData === 'object'
          ? (applicant.parsedData as any).job_matches || []
          : [];

        // Combine both sources of job matches
        const safeJobMatches = Array.isArray(jobMatches) ? jobMatches : [];
        const safeParsedJobMatches = Array.isArray(parsedJobMatches) ? parsedJobMatches : [];
        const allJobMatches = [
          ...safeJobMatches.map(match => ({ fitScore: match.fitScore })),
          ...safeParsedJobMatches.map((match: any) => ({ fitScore: match.fitScore }))
        ];

        if (allJobMatches.length > 0) {
          // Count each applicant once based on their best matching score
          const matchScores = allJobMatches.map(match => normalizeFitScore(match.fitScore));
          const bestMatchScore = Math.max(...matchScores);
          scoreRanges.forEach(range => {
            if (bestMatchScore >= range.min && bestMatchScore <= range.max) {
              matchingScoreRangeCounts[range.letter] = (matchingScoreRangeCounts[range.letter] || 0) + 1;
            }
          });
        } else {
          // Count applicants with no matching fit score
          matchingScoreRangeCounts['no-score'] = (matchingScoreRangeCounts['no-score'] || 0) + 1;
        }
      });

      const result = {
        applied: [
          ...scoreRanges.map(range => ({
            letter: range.letter,
            count: appliedScoreRangeCounts[range.letter] || 0
          })),
          {
            letter: 'no-score',
            count: appliedScoreRangeCounts['no-score'] || 0
          }
        ],
        matching: [
          ...scoreRanges.map(range => ({
            letter: range.letter,
            count: matchingScoreRangeCounts[range.letter] || 0
          })),
          {
            letter: 'no-score',
            count: matchingScoreRangeCounts['no-score'] || 0
          }
        ]
      };

      return result;
    }

    // For regular filtered results, use database fit score counts from API
    if (databaseFitScoreCounts) {
      return databaseFitScoreCounts;
    }


    // If we have no applicants to process, return empty counts
    if (applicantsForFitScoreCounts.length === 0) {
      const scoreRanges = getScoreRangesForChart();
      return {
        applied: [
          ...scoreRanges.map(range => ({ letter: range.letter, count: 0 })),
          { letter: 'no-score', count: 0 }
        ],
        matching: [
          ...scoreRanges.map(range => ({ letter: range.letter, count: 0 })),
          { letter: 'no-score', count: 0 }
        ]
      };
    }

    // Fallback to client-side calculation if database counts not available
    const scoreRanges = getScoreRangesForChart();

    const appliedScoreRangeCounts: { [key: string]: number } = {};
    const matchingScoreRangeCounts: { [key: string]: number } = {};

    const applicantsToProcess = Array.isArray(applicantsForFitScoreCounts) ? applicantsForFitScoreCounts : [];

    // Only calculate if we have applicants to process
    if (applicantsToProcess.length > 0) {
      applicantsToProcess.forEach((applicant: Applicant) => {
        // Applied fit score - count each applied position record separately
        const appliedScores = [];

        // Add main fit score if available
        if (applicant.fitScore !== null && applicant.fitScore !== undefined) {
          const normalizedScore = normalizeFitScore(applicant.fitScore);
          appliedScores.push(normalizedScore);
        }

        // Add fit scores from parsedData.job_applied if available
        if (applicant.parsedData && typeof applicant.parsedData === 'object') {
          const parsedData = applicant.parsedData as any;
          if (parsedData.job_applied && parsedData.job_applied.fitScore) {
            appliedScores.push(normalizeFitScore(parsedData.job_applied.fitScore));
          }
        }

        if (appliedScores.length > 0) {
          // Count each applicant once based on their best applied score
          const bestAppliedScore = Math.max(...appliedScores);
          scoreRanges.forEach(range => {
            if (bestAppliedScore >= range.min && bestAppliedScore <= range.max) {
              appliedScoreRangeCounts[range.letter] = (appliedScoreRangeCounts[range.letter] || 0) + 1;
            }
          });
        } else {
          // Count applicants with no applied fit score
          appliedScoreRangeCounts['no-score'] = (appliedScoreRangeCounts['no-score'] || 0) + 1;
        }

        // Matching fit score - count each job match record separately
        const jobMatches = applicant.jobMatches || [];
        const parsedJobMatches = applicant.parsedData && typeof applicant.parsedData === 'object'
          ? (applicant.parsedData as any).job_matches || []
          : [];

        // Combine both sources of job matches
        const safeJobMatches = Array.isArray(jobMatches) ? jobMatches : [];
        const safeParsedJobMatches = Array.isArray(parsedJobMatches) ? parsedJobMatches : [];
        const allJobMatches = [
          ...safeJobMatches.map(match => ({ fitScore: match.fitScore })),
          ...safeParsedJobMatches.map((match: any) => ({ fitScore: match.fitScore }))
        ];

        if (allJobMatches.length > 0) {
          // Count each applicant once based on their best matching score
          const matchScores = allJobMatches.map(match => normalizeFitScore(match.fitScore));
          const bestMatchScore = Math.max(...matchScores);
          scoreRanges.forEach(range => {
            if (bestMatchScore >= range.min && bestMatchScore <= range.max) {
              matchingScoreRangeCounts[range.letter] = (matchingScoreRangeCounts[range.letter] || 0) + 1;
            }
          });
        } else {
          // Count applicants with no matching fit score
          matchingScoreRangeCounts['no-score'] = (matchingScoreRangeCounts['no-score'] || 0) + 1;
        }
      });
    }

    const result = {
      applied: [
        ...scoreRanges.map(range => ({
          letter: range.letter,
          count: appliedScoreRangeCounts[range.letter] || 0
        })),
        {
          letter: 'no-score',
          count: appliedScoreRangeCounts['no-score'] || 0
        }
      ],
      matching: [
        ...scoreRanges.map(range => ({
          letter: range.letter,
          count: matchingScoreRangeCounts[range.letter] || 0
        })),
        {
          letter: 'no-score',
          count: matchingScoreRangeCounts['no-score'] || 0
        }
      ]
    };


    return result;
  }, [applicantsForFitScoreCounts, normalizeFitScore, getBestMatchingFitScore, isAiSearchActive, aiMatchedApplicantIds, allApplicantsForCounts, databaseFitScoreCounts]);

  // Calculate loading state for fit score counts
  const isFitScoreCountsLoadingState = useMemo(() => {
    // Show loading if we're in initial loading state or if fit score counts are loading
    if (isLoading || tableLoading || isFitScoreCountsLoading) {
      return true;
    }

    return false;
  }, [isLoading, tableLoading, isFitScoreCountsLoading]);

  // Calculate applicant counts by stage for the pipeline stage filter
  const applicantCountsByStage = useMemo(() => {
    const stageCounts: { [stageName: string]: number } = {};

    // Ensure applicantsForFitScoreCounts is always an array
    const applicantsArray = Array.isArray(applicantsForFitScoreCounts) ? applicantsForFitScoreCounts : [];

    applicantsArray.forEach((app: Applicant) => {
      const status = app.statusId || app.status || 'unknown';
      stageCounts[status] = (stageCounts[status] || 0) + 1;
    });

    return stageCounts;
  }, [applicantsForFitScoreCounts]);

  const memoizedApplicantScoreCounts = useMemo(() => applicantScoreCounts, [applicantScoreCounts]);

  // Map applicants for display
  const mappedApplicants = useMemo(() => {
    // Ensure filteredApplicants is always an array
    const applicantsArray = Array.isArray(filteredApplicants) ? filteredApplicants : [];

    const processedApplicants = applicantsArray.map((applicant: Applicant) => {
      const position = Array.isArray(availablePositions) ? availablePositions.find(p => p.id === applicant.positionId) : undefined;
      const recruiter = Array.isArray(availableRecruiter) ? availableRecruiter.find(r => r.id === applicant.recruiterId) : undefined;
      const source = Array.isArray(availableSources) ? availableSources.find(s => s.id === applicant.sourceId) : undefined;

      return {
        ...applicant,
        position,
        recruiter,
        source
      };
    });

    return processedApplicants;
  }, [filteredApplicants, availablePositions, availableRecruiter, availableSources, isAiSearchActive, aiMatchedApplicantIds]);

  // Paginate Applicants for display
  const paginatedApplicants = useMemo(() => {
    if (isAiSearchActive && aiMatchedApplicantIds) {
      // Filter Applicants to only show AI-matched ones
      const safeMappedApplicants = Array.isArray(mappedApplicants) ? mappedApplicants : [];
      const aiMatchedApplicants = safeMappedApplicants.filter(applicant =>
        aiMatchedApplicantIds.includes(applicant.id)
      );

      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      return aiMatchedApplicants.slice(startIndex, endIndex);
    }
    // Server already returns a single page of applicants. Do not slice again.
    return mappedApplicants;
  }, [isAiSearchActive, aiMatchedApplicantIds, mappedApplicants, page, pageSize]);

  // for row numbering in table
  const displayedApplicants = useMemo(() => {
    if (isAiSearchActive && aiMatchedApplicantIds) {
      return paginatedApplicants;
    }


    // But we need to ensure we're not returning an empty array when there are applicants
    const safeMappedApplicants = Array.isArray(mappedApplicants) ? mappedApplicants : [];
    const safeFilteredApplicants = Array.isArray(filteredApplicants) ? filteredApplicants : [];
    if (safeMappedApplicants.length === 0 && safeFilteredApplicants.length > 0) {
      // If mappedApplicants is empty but filteredApplicants has data, there might be a filtering issue
      // Return the first page of filteredApplicants as a fallback
      const safePageSize = pageSize > 0 ? pageSize : 20;
      const safePage = page > 0 ? page : 1;
      const startIndex = (safePage - 1) * safePageSize;
      const endIndex = startIndex + safePageSize;
      const fallbackApplicants = safeFilteredApplicants.slice(startIndex, endIndex);
      return fallbackApplicants;
    }

    return paginatedApplicants;
  }, [isAiSearchActive, aiMatchedApplicantIds, mappedApplicants, filteredApplicants, page, pageSize, total, paginatedApplicants, isLoading, tableLoading, filters.minAppliedJobFitScore, filters.maxAppliedJobFitScore, filters.includeNoScoreInApplied]);

  // Keep last non-empty Applicants to avoid empty flicker on transient errors/refetches
  const lastNonEmptyApplicantsRef = useRef<Applicant[]>(Array.isArray(initialApplicants) && initialApplicants.length > 0 ? initialApplicants : []);
  useEffect(() => {
    const current = Array.isArray(displayedApplicants) ? displayedApplicants : [];
    if (current.length > 0) {
      lastNonEmptyApplicantsRef.current = current;
    }
  }, [displayedApplicants]);

  const applicantsToRender = useMemo(() => {
    const current = Array.isArray(displayedApplicants) ? displayedApplicants : [];
    // If current is empty but we are loading/fetching or have a transient table error,
    // keep showing the last non-empty list to prevent UI flashing to empty state.
    const hasTransientState = !!tableLoading || !!isLoading || !!isFetching || !!tableError || !!fetchError;
    if (current.length === 0 && hasTransientState && lastNonEmptyApplicantsRef.current.length > 0) {
      return lastNonEmptyApplicantsRef.current;
    }
    return current;
  }, [displayedApplicants, tableLoading, isLoading, isFetching, tableError, fetchError]);

  // State for all pinned Applicants across all pages
  const [allPinnedApplicants, setAllPinnedApplicants] = useState<Applicant[]>([]);

  // Fetch all pinned Applicants separately
  const fetchAllPinnedApplicants = useCallback(async () => {
    try {
      const query = new URLSearchParams();

      // Apply the same filters as the main query
      if (filters.aiSearchQuery) query.append('search', filters.aiSearchQuery);
      if (filters.selectedPositionIds && filters.selectedPositionIds.length > 0) {
        query.append('positionId', filters.selectedPositionIds.join(','));
      }
      if (filters.selectedStatuses && filters.selectedStatuses.length > 0) {
        query.append('statusId', filters.selectedStatuses.join(','));
      }
      if (filters.selectedRecruiterIds && filters.selectedRecruiterIds.length > 0) {
        query.append('recruiterId', filters.selectedRecruiterIds.join(','));
      }
      if (filters.selectedSourceIds && filters.selectedSourceIds.length > 0) {
        query.append('sourceId', filters.selectedSourceIds.join(','));
      }

      // Only fetch pinned Applicants
      query.append('pinnedOnly', 'true');
      query.append('limit', '1000'); // Get all pinned Applicants

      const apiUrl = `/api/applicants?${query.toString()}`;

      const result = await safeFetch<Applicant[]>(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache'
        },
        timeoutMs: 10000
      });

      if (result.ok && result.data) {
        setAllPinnedApplicants(result.data);
      }
    } catch (error) {
      console.error('Error fetching pinned Applicants:', error);
      setAllPinnedApplicants([]);
    }
  }, [filters]);

  // Fetch pinned Applicants when filters change
  useEffect(() => {
    if (hasInitialDataFetch && !isClearingFilters) {
      fetchAllPinnedApplicants();
    }
  }, [fetchAllPinnedApplicants, hasInitialDataFetch, isClearingFilters]);

  // Apply horizontal filters when selections change (SIMPLIFIED)
  useEffect(() => {
    // Skip if we're currently clearing filters to prevent conflicts
    if (isClearingFilters) {
      return;
    }

    // Skip if we haven't completed initial data fetch yet
    if (!hasInitialDataFetch) {
      return;
    }

    // Clear any existing timeout to prevent multiple filter applications
    if (filterChangeTimeoutRef.current) {
      clearTimeout(filterChangeTimeoutRef.current);
    }

    // Simple debounced filter application
    filterChangeTimeoutRef.current = setTimeout(() => {
      // Check if there are any horizontal fitscore selections
      const hasAppliedSelections = horizontalSelectedFitScoreGrades.size > 0;
      const hasMatchingSelections = horizontalSelectedMatchingFitScoreGrades.size > 0;

      if (hasAppliedSelections || hasMatchingSelections) {
        // Apply horizontal filters when selections exist
        const horizontalFilters = applyHorizontalFitScoreFilters();

        // Check if horizontal filters have any actual values
        const hasValidFilters = Object.values(horizontalFilters).some(value => value !== undefined);

        if (hasValidFilters) {
          // Apply the filters
          setFilters(prev => ({ ...prev, ...horizontalFilters }));
        }
      } else {
        // Clear fitscore filters when no selections (All is selected)
        setFilters(prev => ({
          ...prev,
          minAppliedJobFitScore: undefined,
          maxAppliedJobFitScore: undefined,
          minMatchingJobFitScore: undefined,
          maxMatchingJobFitScore: undefined,
          includeNoScoreInApplied: undefined,
          includeNoScoreInMatching: undefined
        }));
      }
    }, 300);

    return () => {
      if (filterChangeTimeoutRef.current) {
        clearTimeout(filterChangeTimeoutRef.current);
      }
    };
  }, [horizontalSelectedFitScoreGrades, horizontalSelectedMatchingFitScoreGrades, isClearingFilters, hasInitialDataFetch]);

  // Handle filter changes (OPTIMIZED to prevent infinite loops)
  const onFilterChange = useCallback((newFilters: ApplicantFilterValues) => {
    // Skip if we're currently clearing filters to prevent conflicts
    if (isClearingFilters) {
      return;
    }

    // Check if this is a significant filter change (not just pagination/sorting)
    const hasSignificantFilterChange =
      filters?.name !== newFilters.name ||
      filters?.email !== newFilters.email ||
      filters?.phone !== newFilters.phone ||
      filters?.selectedPositionIds !== newFilters.selectedPositionIds ||
      filters?.selectedStatuses !== newFilters.selectedStatuses ||
      filters?.selectedRecruiterIds !== newFilters.selectedRecruiterIds ||
      filters?.selectedSourceIds !== newFilters.selectedSourceIds ||
      filters?.location !== newFilters.location ||
      filters?.skills !== newFilters.skills ||
      filters?.education !== newFilters.education ||
      filters?.minExperienceYears !== newFilters.minExperienceYears ||
      filters?.maxExperienceYears !== newFilters.maxExperienceYears ||
      filters?.applicationDateStart !== newFilters.applicationDateStart ||
      filters?.applicationDateEnd !== newFilters.applicationDateEnd;

    // Reset page to 1 when filters change
    setPage(1);

    // Apply filters with increased debounce to prevent infinite loops
    handleFilterChange(newFilters, (filters) => {
      setTableLoading(true);

      // REDUNDANT FETCH REMOVED: The useEffect hook watching 'filters' will handle the data fetching.
      // This prevents double fetching (once via callback, once via effect).
      
      // We still update fit score counts here because they have their own logic/debounce 
      // and aren't automatically triggered by the main useEffect
      
      const batchTimeout = setTimeout(() => {
        // Create a copy of filters without fit score filters to prevent circular dependency
        const filtersForCounts = { ...filters };

        // Remove fit score filters to prevent circular dependency
        delete filtersForCounts.minAppliedJobFitScore;
        delete filtersForCounts.maxAppliedJobFitScore;
        delete filtersForCounts.minMatchingJobFitScore;
        delete filtersForCounts.maxMatchingJobFitScore;
        delete filtersForCounts.includeNoScoreInApplied;
        delete filtersForCounts.includeNoScoreInMatching;

        // Only update fit score counts for significant filter changes
        // Skip for minor changes like pagination or sorting
        if (hasSignificantFilterChange) {
          debouncedFetchFitScoreCounts(); // Update fit score counts when filters change (debounced)
        }
      }, 300); // Increased delay to prevent infinite loops and reduce API calls

      // Store timeout for cleanup
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      batchTimeoutRef.current = batchTimeout;
    });
  }, [handleFilterChange, pageSize, /* fetchTableData removed */ isClearingFilters, debouncedFetchFitScoreCounts]);

  // Update total count for AI search only (server sets total for regular search)
  useEffect(() => {
    if (!isLoading && !tableLoading && !isClearingFilters) {
      // For AI search, use aiRecordCount
      if (isAiSearchActive && aiMatchedApplicantIds) {
        setTotal(aiRecordCount);
      }
      // Note: For regular search, total is correctly set by the fetchTableData API response
      // We should NOT override it with filteredApplicants.length as that's only the current page
    }
  }, [isAiSearchActive, aiMatchedApplicantIds, aiRecordCount, isLoading, tableLoading, isClearingFilters]);

  // Update fit score counts when filteredApplicants changes
  useEffect(() => {
    if (!isLoading && !tableLoading && !isClearingFilters) {
      // The ApplicantscoreCounts will be recalculated automatically via useMemo
      // when filteredApplicants changes, so we don't need to do anything here
    }
  }, [filteredApplicants, isLoading, tableLoading, isClearingFilters]);

  // Update fit score counts when database fit score counts change
  useEffect(() => {
    if (!isLoading && !tableLoading && !isClearingFilters) {
      // The ApplicantscoreCounts will be recalculated automatically via useMemo
      // when filters change, so we don't need to do anything here
    }
  }, [isLoading, tableLoading, isClearingFilters]);

  // Reset clearing filters flag when fitscore counts loading completes
  useEffect(() => {
    if (isClearingFilters && !isFitScoreCountsLoadingState) {
      // Reset the clearing flag when fitscore counts have finished loading
      setIsClearingFilters(false);
    }
  }, [isClearingFilters, isFitScoreCountsLoadingState]);

  // Handle clear all filters
  const handleClearAllFilters = useCallback(() => {
    setIsClearingFilters(true);

    // Clear AI search state
    setAiMatchedApplicantIds(null);
    setAiSearchReasoning(null);
    setAiRecordCount(0);
    setIsAiSearchActive(false);

    const defaultFilters = clearAllFilters();
    setPage(1);

    // Clear any existing filter change timeout to prevent conflicts
    if (filterChangeTimeoutRef.current) {
      clearTimeout(filterChangeTimeoutRef.current);
      filterChangeTimeoutRef.current = null;
    }

    // Clear URL parameters by navigating to the base Applicants page
    const currentSearchParams = new URLSearchParams(searchParams);
    currentSearchParams.delete('query'); // Remove the advanced query parameter
    const newUrl = `${pathname}${currentSearchParams.toString() ? `?${currentSearchParams.toString()}` : ''}`;
    router.replace(newUrl, { scroll: false });

    // Fetch Applicants with default filters to restore original state
    // Use a small delay to ensure state updates are processed
    const clearTimeoutId = setTimeout(() => {
      fetchTableData(defaultFilters, 1, pageSize);
      forceRefreshFitScoreCounts(); // Update fit score counts when clearing all filters (force refresh)
      // Don't reset isClearingFilters here - let the useEffect handle it when fitscore counts finish loading
    }, 100);

    return () => {
      clearTimeout(clearTimeoutId);
    };
  }, [clearAllFilters, pageSize, fetchTableData, fetchFitScoreCounts, filterChangeTimeoutRef, searchParams, pathname, router]);

  // Handle toggling filter pin state
  const handleToggleFilterPin = useCallback((pinned: boolean) => {
    setIsFilterPinned(pinned);
    if (typeof window !== 'undefined') {
      localStorage.setItem('applicant-filter-pinned', pinned ? 'true' : 'false');
    }
  }, []);

  // Handle export Applicants
  const handleExportApplicants = useCallback(async () => {
    try {
      setTableLoading(true);

      // Safety check: ensure filters is defined
      if (!filters) {
        toast.error('Filters not available for export');
        return;
      }

      // Build query parameters from current filters
      const params = new URLSearchParams();
      if (filters.name) params.append('name', filters.name);
      if (filters.email) params.append('email', filters.email);
      if (filters.phone) params.append('phone', filters.phone);
      if (filters.location) params.append('location', filters.location);
      if (filters.selectedPositionIds) params.append('positionIds', filters.selectedPositionIds.join(','));
      if (filters.selectedStatuses) params.append('status', filters.selectedStatuses.join(','));
      if (filters.selectedSourceIds) params.append('sourceIds', filters.selectedSourceIds.join(','));
      if (filters.selectedRecruiterIds) params.append('recruiterIds', filters.selectedRecruiterIds.join(','));
      if (filters.skills) params.append('skills', filters.skills);
      if (filters.minExperienceYears) params.append('minExperienceYears', filters.minExperienceYears.toString());
      if (filters.maxExperienceYears) params.append('maxExperienceYears', filters.maxExperienceYears.toString());
      if (filters.minAppliedJobFitScore) params.append('minAppliedJobFitScore', filters.minAppliedJobFitScore.toString());
      if (filters.maxAppliedJobFitScore) params.append('maxAppliedJobFitScore', filters.maxAppliedJobFitScore.toString());
      if (filters.minMatchingJobFitScore) params.append('minMatchingJobFitScore', filters.minMatchingJobFitScore.toString());
      if (filters.maxMatchingJobFitScore) params.append('maxMatchingJobFitScore', filters.maxMatchingJobFitScore.toString());
      if (filters.applicationDateStart) params.append('applicationDateStart', filters.applicationDateStart.toString());
      if (filters.applicationDateEnd) params.append('applicationDateEnd', filters.applicationDateEnd.toString());

      // Add format parameter (XLSX by default)
      params.append('format', 'excel');



      const response = await fetch(`/api/applicants/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });



      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export failed with status:', response.status, 'Error:', errorText);

        let errorMessage = 'Export failed. Please try again.';

        if (response.status === 401) {
          errorMessage = 'Authentication required. Please refresh the page and try again.';
        } else if (response.status === 403) {
          errorMessage = 'No permission';
        } else if (response.status === 500) {
          errorMessage = 'Server error. Please try again or contact support if the problem persists.';
        } else if (response.status === 504) {
          errorMessage = 'Request timed out. The export may be too large. Please try with fewer filters.';
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('Export returned empty file. Please check your filters and try again.');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Applicants-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      // SECURITY: Safe appendChild for file download - href is a blob URL, not user HTML
      const safeUrl = sanitizeUrl(url);
      if (safeUrl) {
        a.href = safeUrl;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      toast.success(`Export completed successfully! File size: ${(blob.size / 1024).toFixed(1)} KB`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(getErrorMessage(error));
    } finally {
      setTableLoading(false);
    }
  }, [filters, toast]);

  // Handle import Applicants
  const handleImportApplicants = useCallback(() => {
    setIsImportModalOpen(true);
  }, []);

  // Fetch export/import feature setting
  useEffect(() => {
    const fetchExportImportSetting = async () => {
      try {
        const response = await fetch('/api/settings/system-settings');
        if (response.ok) {
          const data = await response.json();
          const settings = Array.isArray(data.settings)
            ? Object.fromEntries(data.settings.map((s: any) => [s.key, s.value]))
            : data;
          setExportImportFeatureEnabled(settings.exportImportFeatureEnabled !== 'false');
        }
      } catch (error) {
        console.error('Failed to fetch export/import setting:', error);
        // Default to enabled if fetch fails
        setExportImportFeatureEnabled(true);
      }
    };
    fetchExportImportSetting();
  }, []);

  // Add filter refs to the dynamic height hook
  useEffect(() => {
    if (sidebarFilterRef.current) {
      addFilterRef(sidebarFilterRef.current);
    }
    if (activeFiltersBarRef.current) {
      addFilterRef(activeFiltersBarRef.current);
    }

    return () => {
      if (sidebarFilterRef.current) {
        removeFilterRef(sidebarFilterRef.current);
      }
      if (activeFiltersBarRef.current) {
        removeFilterRef(activeFiltersBarRef.current);
      }
    };
  }, [addFilterRef, removeFilterRef]);

  // Fetch missing positions if any Applicant has a positionId not in availablePositions
  useEffect(() => {
    try {
      // Defensive check to prevent filter errors
      if (!Array.isArray(filteredApplicants)) {
        console.warn('ApplicantsPageClient: filteredApplicants is not an array:', filteredApplicants);
        setMissingPositions([]);
        return;
      }

      const missing = filteredApplicants
        .filter(c => {
          try {
            return c && c.positionId && !(Array.isArray(availablePositions) ? availablePositions.some(p => p && p.id === c.positionId) : false);
          } catch (error) {
            console.warn('ApplicantsPageClient: Error filtering Applicant for missing positions:', error, c);
            return false;
          }
        })
        .map(c => c.positionId)
        .filter((id, idx, arr): id is string => typeof id === 'string' && arr.indexOf(id) === idx);

      setMissingPositions(missing);
      if (missing.length > 0) {
        // Fetch missing positions from API
        fetch(`/api/positions/all`)
          .then(res => res.json())
          .then(data => {
            if (data && Array.isArray(data.data)) {
              setAvailablePositions(prev => {
                // Merge new positions with existing, avoiding duplicates
                const safePrev = Array.isArray(prev) ? prev : [];
                const newPositions = data.data.filter((p: any) => !safePrev.some((q: any) => q.id === p.id));
                return [...safePrev, ...newPositions];
              });
            }
          });
      }
    } catch (error) {
      console.error('ApplicantsPageClient: Error processing missing positions:', error);
      setMissingPositions([]);
    }
  }, [filteredApplicants, availablePositions]);

  // Handle initial loading state
  useEffect(() => {
    if (sessionStatus === 'loading') {
      setIsLoading(true);
    } else if (sessionStatus === 'authenticated') {
      if (initialApplicants.length > 0) {
        setIsLoading(false);
      } else if (!initialFetchError && !serverAuthError && !serverPermissionError) {
        setIsLoading(true);
      } else {
        setIsLoading(false);
      }

      if (filteredApplicants.length > 0) {
        setIsLoading(false);
      }

      // Fetch recruiters and sources with a delay to give server time to start up
      const timeoutId = setTimeout(() => {
        fetchRecruiter();
        fetchSources();
      }, 1000);

      return () => clearTimeout(timeoutId);
    } else {
      setIsLoading(false);
      setTableLoading(false);
    }
  }, [sessionStatus, serverAuthError, serverPermissionError, fetchRecruiter, fetchSources, initialFetchError]);

  // Single client-side fetch - no server-side initial data
  useEffect(() => {
    if (
      sessionStatus === 'authenticated' &&
      !serverAuthError &&
      !serverPermissionError &&
      !hasInitialDataFetch &&
      initialApplicants.length === 0 &&
      !settingsLoading // Wait for settings to be loaded before making API calls
    ) {
      setHasInitialDataFetch(true);
      setIsLoading(true);
      setTableLoading(true);

      // Fetch both table data and full dataset for counts in parallel
      fetchTableData(filters, page, pageSize);
      fetchAllApplicantsForCounts(); // Don't pass filters to get all Applicants for counts
    } else {
      // If we have initial data from server, mark as fetched
      if (initialApplicants.length > 0 && !hasInitialDataFetch) {
        setHasInitialDataFetch(true);
        // Ensure loading states are reset when we have initial data
        setIsLoading(false);
        setTableLoading(false);
        // Don't fetch data immediately if we have initial Applicants
        // The initial Applicants are already loaded and will be used
      }
    }
  }, [sessionStatus, serverAuthError, serverPermissionError, hasInitialDataFetch, fetchTableData, fetchAllApplicantsForCounts, initialApplicants.length, filters, settingsLoading]);

  // SIMPLIFIED: Main filter change handler - reduced dependencies to prevent resource leaks  
  useEffect(() => {
    if (sessionStatus !== 'authenticated' || serverAuthError || serverPermissionError) {
      return;
    }

    if (isClearingFilters) {
      return;
    }

    if (!hasInitialDataFetch) {
      return;
    }

    // Safety check: ensure filters is defined
    if (!filters) {
      return;
    }

    // Check if we have an advanced query from URL that's being processed
    const advancedQueryFromUrl = searchParams.get('query');
    if (advancedQueryFromUrl) {
      // If there's an advanced query from URL, we should fetch data to process it
      // Don't skip the fetch - let the API handle the advanced query
    }

    // If we have initial Applicants and no filters are applied, don't fetch immediately
    // This prevents overwriting the initial data unnecessarily
    const hasActiveFilters = Object.values(filters).some(value =>
      value !== undefined &&
      value !== null &&
      (Array.isArray(value) ? value.length > 0 : true)
    );

    // Only skip fetch if we have initial Applicants, no active filters, page is 1, and sort is default
    // FIXED: Allow page changes to trigger fetch even when no filters are active
    if (initialApplicants.length > 0 && !hasActiveFilters && page === 1 && sortColumn === 'applicationDate' && sortDirection === 'desc') {
      return;
    }

    // Skip if filters haven't actually changed to prevent unnecessary requests
    const requestId = JSON.stringify({ filters, page, pageSize, sortColumn, sortDirection });
    if (currentRequestRefFromHook?.current === requestId) {
      return;
    }

    // Add a small delay to prevent rapid successive requests
    const timeoutId = setTimeout(() => {
      if (currentRequestRefFromHook?.current !== undefined) {
        currentRequestRefFromHook.current = requestId;
      }
      fetchTableData(filters, page, pageSize);
    }, 300); // Increased delay to prevent resource leaks

    return () => clearTimeout(timeoutId);
  }, [filters, page, pageSize, sortColumn, sortDirection, sessionStatus, serverAuthError, serverPermissionError, isClearingFilters, hasInitialDataFetch, initialApplicants.length, searchParams]);

  // Refresh data periodically when SSE is connected
  useEffect(() => {
    if (realtimeConnected && sessionStatus === 'authenticated' && hasInitialDataFetch) {
      // Refresh data periodically when SSE is connected
      const interval = setInterval(() => {
        if (filters) {
          fetchTableData(filters, page, pageSize);
        }
        fetchAllApplicantsForCounts();
      }, 30000); // Refresh every 30 seconds when SSE is connected

      return () => clearInterval(interval);
    }
  }, [realtimeConnected, sessionStatus, hasInitialDataFetch, filters, page, pageSize, fetchTableData, fetchAllApplicantsForCounts]);

  // Show error as toast popup if present
  useEffect(() => {
    if (initialFetchError) {
      toast.error(initialFetchError);
    }
  }, [initialFetchError]);

  // Store current filters in a ref to avoid dependency issues
  filtersRef.current = filters;

  // Fetch fit score counts on mount and when session changes - FIXED: Use regular useEffect with proper conditions
  useEffect(() => {
    if (sessionStatus === 'authenticated' && hasInitialDataFetch && initialApplicants.length > 0 && filtersRef.current) {
      // Create a copy of filters without fit score filters to prevent circular dependency
      const filtersForCounts = { ...filtersRef.current };

      // Remove fit score filters to prevent circular dependency
      delete filtersForCounts.minAppliedJobFitScore;
      delete filtersForCounts.maxAppliedJobFitScore;
      delete filtersForCounts.minMatchingJobFitScore;
      delete filtersForCounts.maxMatchingJobFitScore;
      delete filtersForCounts.includeNoScoreInApplied;
      delete filtersForCounts.includeNoScoreInMatching;

      forceRefreshFitScoreCounts();
    }
  }, [sessionStatus, hasInitialDataFetch, initialApplicants.length]);

  // Listen for mobile search drawer toggle
  useEffect(() => {
    const handleOpenSearch = () => setIsSearchDrawerOpen(true);
    window.addEventListener('applicants:toggle-mobile-search', handleOpenSearch);
    return () => window.removeEventListener('applicants:toggle-mobile-search', handleOpenSearch);
  }, []);

  // Cleanup timeout on component unmount - FIXED: Use regular useEffect instead of useEmergencySafeEffect
  useEffect(() => {
    return () => {
      if (clearingFiltersTimeoutRef?.current) {
        clearTimeout(clearingFiltersTimeoutRef.current);
      }
      if (filterChangeTimeoutRef?.current) {
        clearTimeout(filterChangeTimeoutRef.current);
      }

      if (batchTimeoutRef?.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);



  // Memoized horizontal filter handlers to prevent re-renders
  const memoizedHandleHorizontalFitScoreGradeToggle = useCallback((grade: string) => {
    setHorizontalSelectedFitScoreGrades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(grade)) {
        newSet.delete(grade);
      } else {
        newSet.add(grade);
      }
      return newSet;
    });
    // Reset to first page when fit score filter changes
    setPage(1);
  }, []);

  const memoizedHandleHorizontalMatchingFitScoreGradeToggle = useCallback((grade: string) => {
    setHorizontalSelectedMatchingFitScoreGrades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(grade)) {
        newSet.delete(grade);
      } else {
        newSet.add(grade);
      }
      return newSet;
    });
    // Reset to first page when matching fit score filter changes
    setPage(1);
  }, []);

  const memoizedClearAllHorizontalFitScoreFilters = useCallback(() => {
    setHorizontalSelectedFitScoreGrades(new Set());
    setHorizontalSelectedMatchingFitScoreGrades(new Set());
    // Reset to first page when clearing all fit score filters
    setPage(1);
  }, []);

  // Handle authentication
  if (sessionStatus === 'loading') {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (sessionStatus === 'unauthenticated') {
    // Check if we're already on the signin page or if a logout is in progress
    const isOnSigninPage = typeof window !== 'undefined' && window.location.pathname === '/auth/signin';
    const isLogoutInProgress = typeof window !== 'undefined' && window.location.search.includes('signout=true');

    if (!isOnSigninPage && !isLogoutInProgress) {
      // Redirect to signin page instead of showing error message
      router.replace('/auth/signin');
    }

    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground text-sm">Redirecting to sign in...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render the component
  return (
    <>
      <div className={cn("flex flex-col h-full", isMobile && "bg-secondary/50")}>
        {/* Mobile Search Input removed - now in Header Drawer */}

        {/* Mobile Fit Score Filter */}
        {isMobile && applicantSettings?.showHorizontalFitScoreFilters && (
          <>
            {applicantSettings.fitScoreType === 'applied' && (
              <ApplicantsPageMobileFitScoreFilter
                selectedGrades={horizontalSelectedFitScoreGrades}
                onGradeToggle={memoizedHandleHorizontalFitScoreGradeToggle}
                applicantCounts={memoizedApplicantScoreCounts?.applied || []}
                filterMode={applicantSettings.fitScoreFilterMode}
                onClearAll={memoizedClearAllHorizontalFitScoreFilters}
                aiMatchedCount={aiRecordCount}
                isAiSearchActive={isAiSearchActive}
                fitScoreType="applied"
              />
            )}
            {applicantSettings.fitScoreType === 'matching' && (
              <ApplicantsPageMobileFitScoreFilter
                selectedGrades={horizontalSelectedMatchingFitScoreGrades}
                onGradeToggle={memoizedHandleHorizontalMatchingFitScoreGradeToggle}
                applicantCounts={memoizedApplicantScoreCounts?.matching || []}
                filterMode={applicantSettings.fitScoreFilterMode}
                onClearAll={memoizedClearAllHorizontalFitScoreFilters}
                aiMatchedCount={aiRecordCount}
                isAiSearchActive={isAiSearchActive}
                fitScoreType="matching"
              />
            )}
          </>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Filters Sidebar - shown when pinned */}
          {!isMobile && isFilterPinned && (
            <div
              ref={sidebarFilterRef as React.RefObject<HTMLDivElement>}
              className="w-[320px] min-w-[320px] border-r bg-background flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-3 border-b">
                <div className="font-semibold text-sm">Filters</div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleToggleFilterPin(false)}
                    title="Unpin sidebar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ApplicantFilters
                  initialFilters={filters}
                  onFilterChange={onFilterChange}
                  onAiSearch={handleAiSearch}
                  onCancelAiSearch={cancelAiSearch}
                  onClearAllFilters={handleClearAllFilters}
                  availablePositions={effectivePositions}
                  availableStages={effectiveStages}
                  availableRecruiter={effectiveRecruiter}
                  availableSources={effectiveSources}
                  isLoading={isLoading || isFilterDataLoading}
                  isAiSearching={isAiSearchActive}
                  advancedQuery={searchParams.get('query') || undefined}
                  applicantScoreCounts={memoizedApplicantScoreCounts || undefined}
                  applicantCounts={applicantCountsByStage}
                  autoApply={true}
                  showActionButtons={false}
                  className="border-none shadow-none p-0"
                />
              </div>
            </div>
          )}

          {/* Table Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Fit Score Filters with Action Buttons - hidden on mobile */}
            <ApplicantsPageHeader
              applicantSettings={applicantSettings}
              isMobile={isMobile}
              isLoading={isLoading}
              tableLoading={tableLoading}
              horizontalSelectedFitScoreGrades={horizontalSelectedFitScoreGrades}
              horizontalSelectedMatchingFitScoreGrades={horizontalSelectedMatchingFitScoreGrades}
              onGradeToggle={memoizedHandleHorizontalFitScoreGradeToggle}
              onMatchingGradeToggle={memoizedHandleHorizontalMatchingFitScoreGradeToggle}
              onClearAllHorizontalFitScoreFilters={memoizedClearAllHorizontalFitScoreFilters}
              applicantScoreCounts={applicantScoreCounts}
              aiSearchReasoning={aiSearchReasoning}
              aiRecordCount={aiRecordCount}
              isAiSearchActive={isAiSearchActive}
              exportImportFeatureEnabled={exportImportFeatureEnabled}
              onAddApplicant={() => setIsAddModalOpen(true)}
              onBulkUpload={() => setIsBulkUploadModalOpen(true)}
              onExport={handleExportApplicants}
              onImport={handleImportApplicants}
              onSettings={() => setIsSettingsDrawerOpen(true)}
              // New Filter Props passed to Header for Popover
              filters={filters}
              onFilterChange={onFilterChange}
              onAiSearch={handleAiSearch}
              onCancelAiSearch={cancelAiSearch}
              onClearAllFilters={handleClearAllFilters}
              availablePositions={effectivePositions}
              availableStages={effectiveStages}
              availableRecruiter={effectiveRecruiter}
              availableSources={effectiveSources}
              isFilterDataLoading={isFilterDataLoading}
              advancedQuery={searchParams.get('query') || undefined}
              applicantCounts={applicantCountsByStage}
              activeFilterCount={activeFilterCount}
              isFilterPinned={isFilterPinned}
              onToggleFilterPin={handleToggleFilterPin}
            />

            {/* Table Area */}
            <ApplicantsPageTableArea
              applicantsToRender={applicantsToRender}
              allPinnedApplicants={allPinnedApplicants}
              displayedApplicants={displayedApplicants}
              isLoading={isLoading}
              tableLoading={tableLoading}
              updateApplicantStatus={updateApplicantStatus}
              handleDeleteApplicant={handleDeleteApplicant}
              handleAssignRecruiter={handleAssignRecruiter}
              handleAssignSource={handleAssignSource}
              availablePositions={effectivePositions}
              availableStages={effectiveStages}
              availableRecruiter={effectiveRecruiter}
              availableSources={effectiveSources}
              canEditApplicants={canEditApplicants}
              canDeleteApplicants={canDeleteApplicants}
              canChangeStatus={canChangeStatus}
              canBulkChangeStatus={canBulkChangeStatus}
              canViewDetailed={canViewDetailed}
              canAssignSource={canAssignSource}
              canAssignRecruiter={canAssignRecruiter}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              handleSortChange={handleSortChange}
              setSelectedPositionForEdit={setSelectedPositionForEdit}
              refreshApplicantInList={refreshApplicantInList}
              fetchAllPinnedApplicants={fetchAllPinnedApplicants}
              selectedApplicantIds={selectedApplicantIds}
              setSelectedApplicantIds={setSelectedApplicantIds}
              handleBulkDelete={handleBulkDelete}
              handleBulkChangeStatus={handleBulkChangeStatus}
              handleBulkAssignRecruiter={handleBulkAssignRecruiter}
              handleBulkReprocess={handleBulkReprocess}
              setBulkNewStatus={setBulkNewStatus}
              setBulkTransitionNotes={setBulkTransitionNotes}
              setIsBulkStatusModalOpen={setIsBulkStatusModalOpen}
              setBulkNewRecruiterId={setBulkNewRecruiterId}
              setIsBulkRecruiterModalOpen={setIsBulkRecruiterModalOpen}
              applicantSettings={applicantSettings}
              tableHeight={tableHeight}
              page={page}
              setPage={setPage}
              pageSize={pageSize}
              handlePageSizeChange={handlePageSizeChange}
              total={total}
              totalPages={totalPages}
              isAiSearchActive={isAiSearchActive}
              aiMatchedApplicantIds={aiMatchedApplicantIds}
              aiRecordCount={aiRecordCount}
              filters={filters}
              fetchTableData={fetchTableData}
              aiMatchedApplicantIdsForRefresh={aiMatchedApplicantIds}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <ApplicantsPageModals
        isAddModalOpen={isAddModalOpen}
        setIsAddModalOpen={setIsAddModalOpen}
        availableStages={availableStages}
        onAddApplicantSuccess={async () => {
          if (filters) {
            fetchTableData(filters, page, pageSize);
          }
        }}
        isBulkUploadModalOpen={isBulkUploadModalOpen}
        setIsBulkUploadModalOpen={setIsBulkUploadModalOpen}
        onBulkUploadSuccess={async () => {
          if (filters) {
            await fetchTableData(filters, page, pageSize);
          }
        }}
        isImportModalOpen={isImportModalOpen}
        setIsImportModalOpen={setIsImportModalOpen}
        onImportSuccess={async () => {
          if (filters) {
            await fetchTableData(filters, page, pageSize);
          }
        }}
        isPositionDrawerOpen={isPositionDrawerOpen}
        setIsPositionDrawerOpen={setIsPositionDrawerOpen}
        selectedPositionForEdit={selectedPositionForEdit}
        isSettingsDrawerOpen={isSettingsDrawerOpen}
        setIsSettingsDrawerOpen={setIsSettingsDrawerOpen}
        applicantSettings={applicantSettings}
        onSettingsChange={handleSettingsChange}
        settingsLoading={settingsLoading}
        settingsError={settingsError}
        clearSettingsError={clearSettingsError}
        isBulkStatusModalOpen={isBulkStatusModalOpen}
        setIsBulkStatusModalOpen={setIsBulkStatusModalOpen}
        bulkNewStatus={bulkNewStatus}
        setBulkNewStatus={setBulkNewStatus}
        bulkTransitionNotes={bulkTransitionNotes}
        setBulkTransitionNotes={setBulkTransitionNotes}
        selectedApplicantIds={selectedApplicantIds}
        handleBulkChangeStatus={handleBulkChangeStatus}
        availableStagesForBulk={availableStages}
        isBulkRecruiterModalOpen={isBulkRecruiterModalOpen}
        setIsBulkRecruiterModalOpen={setIsBulkRecruiterModalOpen}
        bulkNewRecruiterId={bulkNewRecruiterId}
        setBulkNewRecruiterId={setBulkNewRecruiterId}
        handleBulkAssignRecruiter={handleBulkAssignRecruiter}
        availableRecruiter={effectiveRecruiter}
      />

      {/* Mobile Filter */}
      <ApplicantsPageMobileFilter
        isMobileFilterModalOpen={isMobileFilterModalOpen}
        setIsMobileFilterModalOpen={setIsMobileFilterModalOpen}
        activeFilterCount={activeFilterCount}
        filters={filters}
        onFilterChange={onFilterChange}
        onAiSearch={handleAiSearch}
        onCancelAiSearch={cancelAiSearch}
        availablePositions={effectivePositions}
        availableStages={effectiveStages}
        availableRecruiter={effectiveRecruiter}
        availableSources={effectiveSources}
        applicantCounts={applicantCountsByStage}
        onClearAllFilters={handleClearAllFilters}
        isLoading={isLoading}
        isFilterDataLoading={isFilterDataLoading}
        isAiSearching={isAiSearching}
        applicantScoreCounts={memoizedApplicantScoreCounts}
        advancedQuery={searchParams.get('query') || undefined}
      />

      {/* Mobile Search Drawer */}
      <Drawer open={isSearchDrawerOpen} onOpenChange={setIsSearchDrawerOpen}>
        <DrawerContent className="h-[92vh] flex flex-col">
          <DrawerHeader className="border-b pb-4 px-4 sticky top-0 bg-background z-10">
            <div className="flex items-center justify-between gap-4">
              <DrawerTitle className="text-xl font-black">Search Applicants</DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" aria-label="Close applicant search" className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </DrawerClose>
            </div>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={filters.name || ''}
                  onChange={(e) => handleFilterChange({ ...filters, name: e.target.value || undefined })}
                  className="pl-10 h-10 text-base"
                  autoFocus
                />
              </div>
            </div>
          </DrawerHeader>
          
          <div className="flex-1 overflow-hidden relative">
            {tableLoading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            
            <ScrollArea className="h-full">
              <div className="p-1">
                {filteredApplicants.length > 0 ? (
                  <ApplicantsMobileListView
                    applicants={filteredApplicants}
                    selectedApplicantIds={new Set()} // No checkbox selection in search drawer
                    onToggleSelectApplicant={() => {}}
                    onApplicantClick={(applicant) => {
                      setSelectedApplicantForDetail({ id: applicant.id, name: applicant.name });
                      setIsDetailModalOpen(true);
                      setIsSearchDrawerOpen(false);
                    }}
                    stageNames={stageNames}
                    stageColors={stageColors as any}
                    allDbPositions={effectivePositions}
                  />
                ) : !tableLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Search className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-sm">No results found for "{filters.name || ''}"</p>
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Detail Modal for Search Results */}
      {selectedApplicantForDetail && (
        <ApplicantDetailModal
          applicantId={selectedApplicantForDetail.id}
          open={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setTimeout(() => setSelectedApplicantForDetail(null), 100);
          }}
        />
      )}
    </>

  );
}

