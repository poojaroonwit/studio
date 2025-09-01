"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CandidateFilters, type CandidateFilterValues } from '@/components/candidates/CandidateFilters';
import { CandidateTable } from '@/components/candidates/CandidateTable';
import type { Candidate, Position, RecruitmentStage } from '@/lib/types';
import { getScoreRangesForChart } from '@/lib/scoreUtils';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, ServerCrash, Zap, Loader2, FileDown, FileUp, ChevronDown, FileSpreadsheet, ShieldAlert, Brain, Trash2 as BulkTrashIcon, Edit as BulkEditIcon, ChevronLeft, ChevronRight, ChevronsUpDown, Check, Briefcase, X, Filter, Search, Settings, MoreVertical, Trash2, FileEdit, Users as UsersIcon } from 'lucide-react';
import { toast } from "react-hot-toast";
import { AddCandidateModal } from '@/components/candidates/AddCandidateModal';
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
import CandidateImportModal from '@/components/candidates/CandidateImportModal';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { StageSelect } from './StageSelect';

import { Badge } from '@/components/ui/badge';
import { UserX } from 'lucide-react';
import { FitScoreFilterBadges } from './FitScoreFilterBadges';
import { FitScoreFilterTabs } from './FitScoreFilterTabs';
import { CandidateSettingsDrawer } from './CandidateSettingsDrawer';
import { useDynamicHeight } from '@/hooks/use-dynamic-height';
import { useCandidateSettings } from '@/hooks/use-candidate-settings';
import { useSimpleSSE, useCandidateUpdates } from '@/hooks/use-simple-sse';


// Import our new hooks
import { useCandidateFilters } from './hooks/use-candidate-filters';
import { useCandidateData } from './hooks/use-candidate-data';
import { useCandidateFetching } from './hooks/use-candidate-fetching';
import { useCandidateActions } from './hooks/use-candidate-actions';
import { useCandidateAiSearch } from './hooks/use-candidate-ai-search';

// Import safe effect hooks
// Removed complex emergency render monitor - using simple useEffect instead


interface CandidatesPageClientProps {
  initialCandidates: Candidate[];
  initialAvailablePositions: Position[];
  initialAvailableStages: RecruitmentStage[];
  authError?: boolean;
  permissionError?: boolean;
  initialFetchError?: string;
  initialFilters?: CandidateFilterValues;
}

export function CandidatesPageClient({
  initialCandidates,
  initialAvailablePositions,
  initialAvailableStages,
  authError: serverAuthError = false,
  permissionError: serverPermissionError = false,
  initialFetchError,
  initialFilters,
}: CandidatesPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  
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

  // Local state for pagination and UI
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50); // Use reasonable limit for efficiency
  const [total, setTotal] = useState<number>(0);
  const [sortColumn, setSortColumn] = useState<string>('lastUpdate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  

  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [isClearingFilters, setIsClearingFilters] = useState(false);
  const clearingFiltersTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // AI Search state
  const [aiSearchReasoning, setAiSearchReasoning] = useState<string | null>(null);
  const [aiMatchedCandidateIds, setAiMatchedCandidateIds] = useState<string[] | null>(null);
  const [aiRecordCount, setAiRecordCount] = useState<number>(0);
  const [isAiSearchActive, setIsAiSearchActive] = useState(false);

  // Performance Monitor state


  // Initial data fetch state
  const [hasInitialDataFetch, setHasInitialDataFetch] = useState<boolean>(false);

  // Stabilize setter functions to prevent unnecessary re-renders
  const stableSetAiMatchedCandidateIds = useCallback((ids: string[] | null) => {
    setAiMatchedCandidateIds(ids);
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
  } = useCandidateFilters(initialFilters);

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
    filteredCandidates,
    setFilteredCandidates,
    allCandidatesForCounts,
    setAllCandidatesForCounts,
    availablePositions,
    setAvailablePositions,
    availableStages,
    setAvailableStages,
    availableRecruiters,
    setAvailableRecruiters,
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
    fetchRecruiters,
    fetchSources,
    fetchAllCandidatesForCounts,
    fetchCandidateById,
    refreshCandidateInList,
    applyOptimisticUpdate,
    revertOptimisticUpdate,
    databaseFitScoreCounts,
    isFitScoreCountsLoading,
    fetchFitScoreCounts,
    debouncedFetchFitScoreCounts,
    forceRefreshFitScoreCounts
  } = useCandidateData({
    initialCandidates,
    initialAvailablePositions,
    initialAvailableStages,
    sessionStatus,
    serverAuthError,
    serverPermissionError,
    initialFetchError,
    filters
  });

  const {
    fetchTableData,
    debouncedFetchTableData,
    currentRequestRef: currentRequestRefFromHook,
    latestRequestIdRef: latestRequestIdRefFromHook
  } = useCandidateFetching({
    sessionStatus,
    serverAuthError,
    serverPermissionError,
    isClearingFilters,
    hasInitialDataFetch,
    searchParams,
    sortColumn,
    sortDirection,
    setFilteredCandidates,
    setTotal,
    setTableError,
    setTableLoading,
    setIsFetching,
    setAuthError,
    setPermissionError,
    setFetchError,
    setIsLoading
  });

  const {
    updateCandidateStatus,
    handleDeleteCandidate,
    handleAssignRecruiter,
    handleAssignSource
  } = useCandidateActions({
    setFilteredCandidates,
    setAllCandidatesForCounts,
    fetchTableData,
    filters,
    page,
    pageSize,
    aiMatchedCandidateIds
  });

  // FIXED: Stabilize callback functions to prevent infinite loops
  const handleCandidateUpdate = useCallback((updatedCandidate: any) => {
    setFilteredCandidates(prevCandidates => {
      const existingIndex = prevCandidates.findIndex(c => c.id === updatedCandidate.id);
      if (existingIndex !== -1) {
        const updated = [...prevCandidates];
        updated[existingIndex] = { ...updated[existingIndex], ...updatedCandidate };
        return updated;
      } else {
        return [...prevCandidates, updatedCandidate];
      }
    });
    
    setAllCandidatesForCounts(prevCandidates => {
      const existingIndex = prevCandidates.findIndex(c => c.id === updatedCandidate.id);
      if (existingIndex !== -1) {
        const updated = [...prevCandidates];
        updated[existingIndex] = { ...updated[existingIndex], ...updatedCandidate };
        return updated;
      } else {
        return [...prevCandidates, updatedCandidate];
      }
    });
  }, []);

  const handlePositionUpdate = useCallback((updatedPosition: any) => {
    setAvailablePositions(prevPositions => {
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

  const handlePresenceUpdate = useCallback((presence: any) => {
    // Handle presence updates if needed
  }, []);

  const handleUserListUpdate = useCallback((users: any[]) => {
    // Handle user list updates if needed
  }, []);

  const handleNotificationUpdate = useCallback((notification: any) => {
    // Handle notifications if needed
  }, []);

  // Simple SSE hook
  const { isConnected: realtimeConnected } = useSimpleSSE();
  const { candidateUpdates, latestUpdate } = useCandidateUpdates();

  // Bulk action handlers
  const handleBulkDelete = useCallback(async (candidateIds: string[]) => {
    try {
      const response = await fetch('/api/candidates/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          candidateIds: candidateIds
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Bulk delete failed');
      }

      const result = await response.json();
      toast.success(`${result.successCount} candidate(s) deleted successfully`);
      
      // Clear selection and refresh data
      setSelectedCandidateIds(new Set());
      if (filters) {
        fetchTableData(filters, page, pageSize);
      }
      fetchAllCandidatesForCounts();
    } catch (error) {
      toast.error((error as Error).message || 'Bulk delete failed');
    }
  }, [fetchTableData, filters, page, pageSize, fetchAllCandidatesForCounts]);

  const handleBulkChangeStatus = useCallback(async (candidateIds: string[], newStatus: string, notes?: string) => {
    try {
      const response = await fetch('/api/candidates/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_status',
          candidateIds: candidateIds,
          newStatus: newStatus,
          transitionNotes: notes
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Bulk status change failed');
      }

      const result = await response.json();
      toast.success(`${result.successCount} candidate(s) status updated to ${newStatus}`);
      
      // Clear selection and refresh data
      setSelectedCandidateIds(new Set());
      if (filters) {
        fetchTableData(filters, page, pageSize);
      }
      fetchAllCandidatesForCounts();
    } catch (error) {
      toast.error((error as Error).message || 'Bulk status change failed');
    }
  }, [fetchTableData, filters, page, pageSize, fetchAllCandidatesForCounts]);

  const handleBulkAssignRecruiter = useCallback(async (candidateIds: string[], recruiterId: string | null) => {
    try {
      const response = await fetch('/api/candidates/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_recruiter',
          candidateIds: candidateIds,
          newRecruiterId: recruiterId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Bulk recruiter assignment failed');
      }

      const result = await response.json();
      const recruiterName = availableRecruiters.find(r => r.id === recruiterId)?.name || 'No Recruiter';
      toast.success(`${result.successCount} candidate(s) assigned to ${recruiterName}`);
      
      // Clear selection and refresh data
      setSelectedCandidateIds(new Set());
      if (filters) {
        fetchTableData(filters, page, pageSize);
      }
      fetchAllCandidatesForCounts();
    } catch (error) {
      toast.error((error as Error).message || 'Bulk recruiter assignment failed');
    }
  }, [fetchTableData, filters, page, pageSize, fetchAllCandidatesForCounts, availableRecruiters]);

  const {
    isAiSearching,
    handleAiSearch
  } = useCandidateAiSearch({
    setFilteredCandidates,
    setAiMatchedCandidateIds: stableSetAiMatchedCandidateIds,
    setAiSearchReasoning: stableSetAiSearchReasoning,
    setAiRecordCount: stableSetAiRecordCount,
    setIsAiSearchActive: stableSetIsAiSearchActive,
    filteredCandidates
  });

  // UI state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreateViaAutomationModalOpen, setIsCreateViaAutomationModalOpen] = useState(false);
  const [isPositionDrawerOpen, setIsPositionDrawerOpen] = useState(false);
  const [selectedPositionForEdit, setSelectedPositionForEdit] = useState<Position | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [isBulkActionConfirmOpen, setIsBulkActionConfirmOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'delete' | 'change_status' | 'assign_recruiter' | null>(null);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [showFilters, setShowFilters] = useState(true);
  const [missingPositions, setMissingPositions] = useState<string[]>([]);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [advancedQueryFromUrl, setAdvancedQueryFromUrl] = useState<string>('');

  // Bulk action modal states
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [isBulkRecruiterModalOpen, setIsBulkRecruiterModalOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState<string>('');
  const [bulkNewRecruiterId, setBulkNewRecruiterId] = useState<string | null>(null);
  const [bulkTransitionNotes, setBulkTransitionNotes] = useState<string>('');

  // Settings
  const { settings: candidateSettings, setSettings: setCandidateSettings, isLoading: settingsLoading, error: settingsError } = useCandidateSettings();

  // Stable callback for settings change
  const handleSettingsChange = useCallback(async (settings: any) => {
    setCandidateSettings(settings);
  }, [setCandidateSettings]);

  // Stable callback for settings drawer open/close
  const handleSettingsDrawerOpenChange = useCallback((open: boolean) => {
    setIsSettingsDrawerOpen(open);
  }, []);

  // Permissions
  const modulePermissions = session?.user?.modulePermissions || [];
  const canExportCandidates = session?.user?.role === 'Admin' || modulePermissions.includes('CANDIDATES_EXPORT') || false;
  const canCreateCandidates = session?.user?.role === 'Admin' || modulePermissions.includes('CANDIDATES_CREATE') || false;
  const canEditCandidates = session?.user?.role === 'Admin' || modulePermissions.includes('CANDIDATES_EDIT_BASIC') || false;
  const canDeleteCandidates = session?.user?.role === 'Admin' || modulePermissions.includes('CANDIDATES_DELETE') || false;
  const canChangeStatus = session?.user?.role === 'Admin' || modulePermissions.includes('CANDIDATES_PIPELINE_STAGE_UPDATE') || false;
  const canBulkChangeStatus = session?.user?.role === 'Admin' || modulePermissions.includes('CANDIDATES_PIPELINE_STAGE_BULK_UPDATE') || false;
  const canViewDetailed = session?.user?.role === 'Admin' || modulePermissions.includes('CANDIDATES_VIEW_DETAILED') || false;
  const canAssignSource = session?.user?.role === 'Admin' || modulePermissions.includes('CANDIDATES_SOURCE_ASSIGN') || false;
  const canAssignRecruiter = session?.user?.role === 'Admin' || modulePermissions.includes('CANDIDATES_RECRUITER_ASSIGN') || false;

  // Calculate total pages for pagination
  const totalPages = useMemo(() => {
    if (isAiSearchActive && aiMatchedCandidateIds) {
      return Math.max(1, Math.ceil(aiRecordCount / pageSize));
    }
    return Math.max(1, Math.ceil(total / pageSize));
  }, [isAiSearchActive, aiMatchedCandidateIds, aiRecordCount, pageSize, total]);

  // Get candidates for fit score counts
  // Note: Use allCandidatesForCounts for fit score calculation to get accurate counts for all candidates
  // This allows the fitscore horizon filter to show counts for unlimited candidates
  const candidatesForFitScoreCounts = useMemo(() => {
    // Use allCandidatesForCounts for fit score badge calculations
    // This provides accurate counts for all candidates, not just the current page
    return allCandidatesForCounts;
  }, [allCandidatesForCounts]);

  // Update total count when allCandidatesForCounts changes
  // Only update if we don't have a valid total from the main table fetch
  // This useEffect is now disabled to prevent conflicts with the main table fetch total
  /*
  useEffect(() => {
    // Only update total from allCandidatesForCounts if:
    // 1. We have candidates in allCandidatesForCounts
    // 2. The current total is 0 (meaning no valid total from main table fetch)
    // 3. We're not currently clearing filters (to avoid race conditions)
    if (allCandidatesForCounts.length > 0 && total === 0 && !isClearingFilters) {
      setTotal(allCandidatesForCounts.length);
    }
  }, [allCandidatesForCounts, total, isClearingFilters]);
  */

    // Use database-level fit score counts for accurate badge display
  const candidateScoreCounts = useMemo(() => {
  

    // If AI search is active, calculate counts based on AI-matched candidates only
    if (isAiSearchActive && aiMatchedCandidateIds && aiMatchedCandidateIds.length > 0) {
      
      const scoreRanges = getScoreRangesForChart();
      const appliedScoreRangeCounts: { [key: string]: number } = {};
      const matchingScoreRangeCounts: { [key: string]: number } = {};
      
      // Get AI-matched candidates from the full candidate list
      const aiMatchedCandidates = allCandidatesForCounts.filter(candidate => 
        aiMatchedCandidateIds.includes(candidate.id)
      );
      
      aiMatchedCandidates.forEach((candidate: Candidate) => {
        // Applied fit score - count each applied position record separately
        const appliedScores = [];
        
        // Add main fit score if available
        if (candidate.fitScore !== null && candidate.fitScore !== undefined) {
          const normalizedScore = normalizeFitScore(candidate.fitScore);
          appliedScores.push(normalizedScore);
        }
        
        // Add fit scores from parsedData.job_applied if available
        if (candidate.parsedData && typeof candidate.parsedData === 'object') {
          const parsedData = candidate.parsedData as any;
          if (parsedData.job_applied && parsedData.job_applied.fitScore) {
            appliedScores.push(normalizeFitScore(parsedData.job_applied.fitScore));
          }
        }
        
        if (appliedScores.length > 0) {
          // Count each candidate once based on their best applied score
          const bestAppliedScore = Math.max(...appliedScores);
          scoreRanges.forEach(range => {
            if (bestAppliedScore >= range.min && bestAppliedScore <= range.max) {
              appliedScoreRangeCounts[range.letter] = (appliedScoreRangeCounts[range.letter] || 0) + 1;
            }
          });
        } else {
          // Count candidates with no applied fit score
          appliedScoreRangeCounts['no-score'] = (appliedScoreRangeCounts['no-score'] || 0) + 1;
        }
        
        // Matching fit score - count each job match record separately
        const jobMatches = candidate.jobMatches || [];
        const parsedJobMatches = candidate.parsedData && typeof candidate.parsedData === 'object' 
          ? (candidate.parsedData as any).job_matches || []
          : [];
        
        // Combine both sources of job matches
        const allJobMatches = [
          ...jobMatches.map(match => ({ fitScore: match.fitScore })),
          ...parsedJobMatches.map((match: any) => ({ fitScore: match.fitScore }))
        ];
        
        if (allJobMatches.length > 0) {
          // Count each candidate once based on their best matching score
          const matchScores = allJobMatches.map(match => normalizeFitScore(match.fitScore));
          const bestMatchScore = Math.max(...matchScores);
          scoreRanges.forEach(range => {
            if (bestMatchScore >= range.min && bestMatchScore <= range.max) {
              matchingScoreRangeCounts[range.letter] = (matchingScoreRangeCounts[range.letter] || 0) + 1;
            }
          });
        } else {
          // Count candidates with no matching fit score
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
    
    // Fallback to client-side calculation if database counts not available
    const scoreRanges = getScoreRangesForChart();
    
    const appliedScoreRangeCounts: { [key: string]: number } = {};
    const matchingScoreRangeCounts: { [key: string]: number } = {};
    
    const candidatesToProcess = candidatesForFitScoreCounts;
    
    // Only calculate if we have candidates to process
    if (candidatesToProcess.length > 0) {
      candidatesToProcess.forEach((candidate: Candidate) => {
        // Applied fit score - count each applied position record separately
        const appliedScores = [];
        
        // Add main fit score if available
        if (candidate.fitScore !== null && candidate.fitScore !== undefined) {
          const normalizedScore = normalizeFitScore(candidate.fitScore);
          appliedScores.push(normalizedScore);
        }
        
        // Add fit scores from parsedData.job_applied if available
        if (candidate.parsedData && typeof candidate.parsedData === 'object') {
          const parsedData = candidate.parsedData as any;
          if (parsedData.job_applied && parsedData.job_applied.fitScore) {
            appliedScores.push(normalizeFitScore(parsedData.job_applied.fitScore));
          }
        }
        
        if (appliedScores.length > 0) {
          // Count each candidate once based on their best applied score
          const bestAppliedScore = Math.max(...appliedScores);
          scoreRanges.forEach(range => {
            if (bestAppliedScore >= range.min && bestAppliedScore <= range.max) {
              appliedScoreRangeCounts[range.letter] = (appliedScoreRangeCounts[range.letter] || 0) + 1;
            }
          });
        } else {
          // Count candidates with no applied fit score
          appliedScoreRangeCounts['no-score'] = (appliedScoreRangeCounts['no-score'] || 0) + 1;
        }
        
        // Matching fit score - count each job match record separately
        const jobMatches = candidate.jobMatches || [];
        const parsedJobMatches = candidate.parsedData && typeof candidate.parsedData === 'object' 
          ? (candidate.parsedData as any).job_matches || []
          : [];
        
        // Combine both sources of job matches
        const allJobMatches = [
          ...jobMatches.map(match => ({ fitScore: match.fitScore })),
          ...parsedJobMatches.map((match: any) => ({ fitScore: match.fitScore }))
        ];
        
        if (allJobMatches.length > 0) {
          // Count each candidate once based on their best matching score
          const matchScores = allJobMatches.map(match => normalizeFitScore(match.fitScore));
          const bestMatchScore = Math.max(...matchScores);
          scoreRanges.forEach(range => {
            if (bestMatchScore >= range.min && bestMatchScore <= range.max) {
              matchingScoreRangeCounts[range.letter] = (matchingScoreRangeCounts[range.letter] || 0) + 1;
            }
          });
        } else {
          // Count candidates with no matching fit score
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
  }, [candidatesForFitScoreCounts, normalizeFitScore, getBestMatchingFitScore, isAiSearchActive, aiMatchedCandidateIds, allCandidatesForCounts, databaseFitScoreCounts]);

  // Calculate loading state for fit score counts
  const isFitScoreCountsLoadingState = useMemo(() => {
    // Show loading if we're in initial loading state or if fit score counts are loading
    if (isLoading || tableLoading || isFitScoreCountsLoading) {
      return true;
    }
    
    return false;
  }, [isLoading, tableLoading, isFitScoreCountsLoading]);

  // Calculate candidate counts by stage for the pipeline stage filter
  const candidateCountsByStage = useMemo(() => {
    const stageCounts: { [stageName: string]: number } = {};
    
    candidatesForFitScoreCounts.forEach((candidate: Candidate) => {
      const status = candidate.status;
      stageCounts[status] = (stageCounts[status] || 0) + 1;
    });
    
    return stageCounts;
  }, [candidatesForFitScoreCounts]);

  // Map candidates for display
  const mappedCandidates = useMemo(() => {
    const candidates = filteredCandidates.map((candidate: Candidate) => {
      const position = availablePositions.find(p => p.id === candidate.positionId);
      const recruiter = availableRecruiters.find(r => r.id === candidate.recruiterId);
      const source = availableSources.find(s => s.id === candidate.sourceId);
      
      return {
        ...candidate,
        position,
        recruiter,
        source
      };
    });
    
    return candidates;
  }, [filteredCandidates, availablePositions, availableRecruiters, availableSources, isAiSearchActive, aiMatchedCandidateIds]);

  // Paginate candidates for display
  const paginatedCandidates = useMemo(() => {
    if (isAiSearchActive && aiMatchedCandidateIds) {
      // Filter candidates to only show AI-matched ones
      const aiMatchedCandidates = mappedCandidates.filter(candidate => 
        aiMatchedCandidateIds.includes(candidate.id)
      );
      
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      return aiMatchedCandidates.slice(startIndex, endIndex);
    }
    
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return mappedCandidates.slice(startIndex, endIndex);
  }, [isAiSearchActive, aiMatchedCandidateIds, mappedCandidates, page, pageSize]);

  // For row numbering in table
  const displayedCandidates = useMemo(() => {
    if (isAiSearchActive && aiMatchedCandidateIds) {
      return paginatedCandidates;
    }
    
    // But we need to ensure we're not returning an empty array when there are candidates
    if (mappedCandidates.length === 0 && filteredCandidates.length > 0) {
      // If mappedCandidates is empty but filteredCandidates has data, there might be a filtering issue
      // Return the first page of filteredCandidates as a fallback
      const safePageSize = pageSize > 0 ? pageSize : 20;
      const safePage = page > 0 ? page : 1;
      const startIndex = (safePage - 1) * safePageSize;
      const endIndex = startIndex + safePageSize;
      const fallbackCandidates = filteredCandidates.slice(startIndex, endIndex);
      return fallbackCandidates;
    }
    
    return paginatedCandidates;
  }, [isAiSearchActive, aiMatchedCandidateIds, mappedCandidates, filteredCandidates, page, pageSize, total, paginatedCandidates, isLoading, tableLoading]);

  // Apply horizontal filters when selections change (OPTIMIZED to prevent resource leaks)
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
    
    // Debounce the filter application to prevent resource leaks
    filterChangeTimeoutRef.current = setTimeout(() => {
      // Only apply horizontal filters if there are selections
      if (horizontalSelectedFitScoreGrades.size > 0 || horizontalSelectedMatchingFitScoreGrades.size > 0) {
        const horizontalFilters = applyHorizontalFitScoreFilters();
        
        // Check if horizontal filters have any actual values
        const hasValidFilters = Object.values(horizontalFilters).some(value => value !== undefined);
        
        if (hasValidFilters) {
          const newFilters = {
            ...currentFiltersRef.current,
            ...horizontalFilters
          };
          setFilters(newFilters);
          setPage(1); // Always reset to page 1 when applying fit score filters
          setTableLoading(true); // Show loading state; central filters effect will fetch
          // Avoid double-fetch here; fetching is handled by the filters change effects
        } else {
          // Clear fit score filters if no valid horizontal filters
          const newFilters = {
            ...currentFiltersRef.current,
            minAppliedJobFitScore: undefined,
            maxAppliedJobFitScore: undefined,
            minMatchingJobFitScore: undefined,
            maxMatchingJobFitScore: undefined,
          };
          setFilters(newFilters);
          setPage(1); // Reset to page 1 when clearing fit score filters
          setTableLoading(true); // Show loading state; central filters effect will fetch
          // Avoid double-fetch here; fetching is handled by the filters change effects
        }
      } else {
        // If no horizontal selections, clear fit score filters from main filters
        const newFilters = {
          ...currentFiltersRef.current,
          minAppliedJobFitScore: undefined,
          maxAppliedJobFitScore: undefined,
          minMatchingJobFitScore: undefined,
          maxMatchingJobFitScore: undefined,
        };
        setFilters(newFilters);
        setPage(1); // Reset to page 1 when clearing all fit score filters
        setTableLoading(true); // Show loading state; central filters effect will fetch
        // Avoid double-fetch here; fetching is handled by the filters change effects
      }
    }, 400); // Increased debounce to prevent resource leaks
    
    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (filterChangeTimeoutRef.current) {
        clearTimeout(filterChangeTimeoutRef.current);
        filterChangeTimeoutRef.current = null;
      }
    };
  }, [horizontalSelectedFitScoreGrades, horizontalSelectedMatchingFitScoreGrades, applyHorizontalFitScoreFilters, isClearingFilters, hasInitialDataFetch]);

  // Handle filter changes (OPTIMIZED to prevent infinite loops)
  const onFilterChange = useCallback((newFilters: CandidateFilterValues) => {
    // Skip if we're currently clearing filters to prevent conflicts
    if (isClearingFilters) {
      return;
    }
    
    // Check if this is a significant filter change (not just pagination/sorting)
    const hasSignificantFilterChange = 
      filters?.name !== newFilters.name ||
      filters?.email !== newFilters.email ||
      filters?.phone !== newFilters.phone ||
      filters?.positionId !== newFilters.positionId ||
      filters?.status !== newFilters.status ||
      filters?.recruiterId !== newFilters.recruiterId ||
      filters?.sourceId !== newFilters.sourceId ||
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
      
      // Use a timeout to batch the API calls and prevent conflicts with useEffect
      const batchTimeout = setTimeout(() => {
        fetchTableData(filters, 1, pageSize);
        
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
  }, [handleFilterChange, pageSize, fetchTableData, isClearingFilters, fetchFitScoreCounts]);

  // Update total count for AI search only (server sets total for regular search)
  useEffect(() => {
    if (!isLoading && !tableLoading && !isClearingFilters) {
      // For AI search, use aiRecordCount
      if (isAiSearchActive && aiMatchedCandidateIds) {
        setTotal(aiRecordCount);
      }
      // Note: For regular search, total is correctly set by the fetchTableData API response
      // We should NOT override it with filteredCandidates.length as that's only the current page
    }
  }, [isAiSearchActive, aiMatchedCandidateIds, aiRecordCount, isLoading, tableLoading, isClearingFilters]);

  // Update fit score counts when filteredCandidates changes
  useEffect(() => {
    if (!isLoading && !tableLoading && !isClearingFilters) {
      // The candidateScoreCounts will be recalculated automatically via useMemo
      // when filteredCandidates changes, so we don't need to do anything here
    }
  }, [filteredCandidates, isLoading, tableLoading, isClearingFilters]);

  // Update fit score counts when database fit score counts change
  useEffect(() => {
    if (!isLoading && !tableLoading && !isClearingFilters) {
      // The candidateScoreCounts will be recalculated automatically via useMemo
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
    setAiMatchedCandidateIds(null);
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
    
    // Fetch candidates with default filters to restore original state
    // Use a small delay to ensure state updates are processed
    const clearTimeoutId = setTimeout(() => {
      fetchTableData(defaultFilters, 1, pageSize);
      forceRefreshFitScoreCounts(); // Update fit score counts when clearing all filters (force refresh)
      // Don't reset isClearingFilters here - let the useEffect handle it when fitscore counts finish loading
    }, 100);
    
    return () => {
      clearTimeout(clearTimeoutId);
    };
  }, [clearAllFilters, pageSize, fetchTableData, fetchFitScoreCounts, filterChangeTimeoutRef]);

  // Handle export candidates
  const handleExportCandidates = useCallback(async () => {
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
      if (filters.selectedStatuses) params.append('statuses', filters.selectedStatuses.join(','));
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
      
      console.log('Starting export with params:', params.toString());
      
      const response = await fetch(`/api/candidates/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Export response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export failed with status:', response.status, 'Error:', errorText);
        
        let errorMessage = 'Export failed. Please try again.';
        
        if (response.status === 401) {
          errorMessage = 'Authentication required. Please refresh the page and try again.';
        } else if (response.status === 403) {
          errorMessage = 'Permission denied. You may not have permission to export candidates.';
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
      a.download = `candidates-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Export completed successfully! File size: ${(blob.size / 1024).toFixed(1)} KB`);
    } catch (error) {
      console.error('Export error:', error);
      
      let errorMessage = 'Export failed. Please try again.';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.';
        } else if (error.message.includes('fetch failed')) {
          errorMessage = 'Network connection failed. Please check your internet connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. The server took too long to respond. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setTableLoading(false);
    }
  }, [filters, toast]);

  // Handle import candidates
  const handleImportCandidates = useCallback(() => {
    setIsImportModalOpen(true);
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

  // Fetch missing positions if any candidate has a positionId not in availablePositions
  useEffect(() => {
    try {
      // Defensive check to prevent filter errors
      if (!Array.isArray(filteredCandidates)) {
        console.warn('CandidatesPageClient: filteredCandidates is not an array:', filteredCandidates);
        setMissingPositions([]);
        return;
      }
      
      const missing = filteredCandidates
        .filter(c => {
          try {
            return c && c.positionId && !availablePositions.some(p => p && p.id === c.positionId);
          } catch (error) {
            console.warn('CandidatesPageClient: Error filtering candidate for missing positions:', error, c);
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
                const newPositions = data.data.filter((p: any) => !prev.some((q: any) => q.id === p.id));
                return [...prev, ...newPositions];
              });
            }
          });
      }
    } catch (error) {
      console.error('CandidatesPageClient: Error processing missing positions:', error);
      setMissingPositions([]);
    }
  }, [filteredCandidates, availablePositions]);

  // Handle initial loading state
  useEffect(() => {
    if (sessionStatus === 'loading') {
      setIsLoading(true);
    } else if (sessionStatus === 'authenticated') {
      if (initialCandidates.length > 0) {
        setIsLoading(false);
      } else if (!initialFetchError && !serverAuthError && !serverPermissionError) {
        setIsLoading(true);
      } else {
        setIsLoading(false);
      }
      
      if (filteredCandidates.length > 0) {
        setIsLoading(false);
      }
      
      // Fetch recruiters and sources with a delay to give server time to start up
      const timeoutId = setTimeout(() => {
        fetchRecruiters();
        fetchSources();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    } else {
      setIsLoading(false);
      setTableLoading(false);
    }
  }, [sessionStatus, serverAuthError, serverPermissionError, fetchRecruiters, fetchSources, initialFetchError]);

  // Single client-side fetch - no server-side initial data
  useEffect(() => {
    if (
      sessionStatus === 'authenticated' &&
      !serverAuthError &&
      !serverPermissionError &&
      !hasInitialDataFetch &&
      initialCandidates.length === 0
    ) {
      setHasInitialDataFetch(true);
      setIsLoading(true);
      setTableLoading(true);
      
      // Fetch both table data and full dataset for counts in parallel
      fetchTableData(filters, page, pageSize);
      fetchAllCandidatesForCounts(); // Don't pass filters to get all candidates for counts
    } else {
      // If we have initial data from server, mark as fetched
      if (initialCandidates.length > 0 && !hasInitialDataFetch) {
        setHasInitialDataFetch(true);
        // Ensure loading states are reset when we have initial data
        setIsLoading(false);
        setTableLoading(false);
        // Don't fetch data immediately if we have initial candidates
        // The initial candidates are already loaded and will be used
      }
    }
  }, [sessionStatus, serverAuthError, serverPermissionError, hasInitialDataFetch, fetchTableData, fetchAllCandidatesForCounts, initialCandidates.length, filters]);

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
      console.log('🔍 CandidatesPageClient: Advanced query detected:', advancedQueryFromUrl);
      console.log('🔍 CandidatesPageClient: Current filters:', filters);
      console.log('🔍 CandidatesPageClient: Filter checks:', {
        hasName: !!filters.name,
        hasEmail: !!filters.email,
        hasPhone: !!filters.phone,
        hasPositionIds: !!filters.selectedPositionIds?.length,
        hasStatuses: !!filters.selectedStatuses?.length,
        hasMinAppliedJobFitScore: !!filters.minAppliedJobFitScore,
        hasMaxAppliedJobFitScore: !!filters.maxAppliedJobFitScore,
        hasMinMatchingJobFitScore: !!filters.minMatchingJobFitScore,
        hasMaxMatchingJobFitScore: !!filters.maxMatchingJobFitScore
      });
    }
    if (advancedQueryFromUrl && !filters.name && !filters.email && !filters.phone && !filters.selectedPositionIds?.length && !filters.selectedStatuses?.length && !filters.minAppliedJobFitScore && !filters.maxAppliedJobFitScore && !filters.minMatchingJobFitScore && !filters.maxMatchingJobFitScore) {
      // Advanced query is being processed, don't fetch yet
      console.log('🔍 CandidatesPageClient: Skipping fetch - advanced query being processed');
      return;
    }
    
    // If we have initial candidates and no filters are applied, don't fetch immediately
    // This prevents overwriting the initial data unnecessarily
    const hasActiveFilters = Object.values(filters).some(value => 
      value !== undefined && 
      value !== null && 
      (Array.isArray(value) ? value.length > 0 : true)
    );
    
    // Only skip fetch if we have initial candidates, no active filters, page is 1, and sort is default
    if (initialCandidates.length > 0 && !hasActiveFilters && page === 1 && sortColumn === 'lastUpdate' && sortDirection === 'desc') {
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
  }, [filters, page, pageSize, sortColumn, sortDirection, sessionStatus, serverAuthError, serverPermissionError, isClearingFilters, hasInitialDataFetch, initialCandidates.length, searchParams]);

  // Refresh data when we receive candidate updates via SSE
  useEffect(() => {
    if (latestUpdate && sessionStatus === 'authenticated' && hasInitialDataFetch) {
      console.log('🔄 CandidatesPageClient: Refreshing data due to SSE update:', latestUpdate);
      if (filters) {
        fetchTableData(filters, page, pageSize);
      }
      fetchAllCandidatesForCounts();
    }
  }, [latestUpdate, sessionStatus, hasInitialDataFetch, filters, page, pageSize, fetchTableData, fetchAllCandidatesForCounts]);

    // Show error as toast popup if present
  useEffect(() => {
    if (initialFetchError) {
      toast.error(initialFetchError);
    }
  }, [initialFetchError]);

  // Store current filters in a ref to avoid dependency issues
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Fetch fit score counts on mount and when session changes - FIXED: Use regular useEffect with proper conditions
  useEffect(() => {
    if (sessionStatus === 'authenticated' && hasInitialDataFetch && initialCandidates.length > 0 && filtersRef.current) {
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
  }, [sessionStatus, hasInitialDataFetch, initialCandidates.length]);

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
              <div className="flex flex-col h-full">
          {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-[280px] border-r bg-background overflow-hidden">
              <div className="h-full overflow-y-auto">
                {(() => {
                  const advancedQuery = searchParams.get('query') || undefined;
                  return (
                    <CandidateFilters
                      initialFilters={filters}
                      onFilterChange={onFilterChange}
                      onAiSearch={handleAiSearch}
                      availablePositions={availablePositions}
                      availableStages={availableStages}
                      availableRecruiters={availableRecruiters}
                      availableSources={availableSources}
                      candidateCounts={candidateCountsByStage}
                      onClearAllFilters={handleClearAllFilters}
                      isLoading={isLoading}
                      isAiSearching={isAiSearching}
                      candidateScoreCounts={candidateScoreCounts}
                      advancedQuery={advancedQuery}
                    />
                  );
                })()}
              </div>
            </div>
          )}

          {/* Table Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Fit Score Filters with Action Buttons */}
            {(() => {
              if (!candidateSettings.showHorizontalFitScoreFilters) {
                return null;
              }
              
              return (
                <div className="p-4 pb-0 pr-2 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {candidateSettings.fitScoreType === 'applied' && (
                        <FitScoreFilterTabs
                          selectedGrades={horizontalSelectedFitScoreGrades}
                          onGradeToggle={handleHorizontalFitScoreGradeToggle}
                          onClearAll={() => {
                            clearAllHorizontalFitScoreFilters();
                            setIsClearingFilters(true);
                            // Don't reset the flag immediately - let the fitscore counts loading complete first
                            // The flag will be reset in the useEffect that handles fitscore counts loading
                          }}
                          candidateCounts={candidateScoreCounts?.applied || []}
                          className=""
                          filterMode={candidateSettings.fitScoreFilterMode}
                          aiMatchedCount={aiRecordCount}
                          isAiSearchActive={isAiSearchActive}
                          isLoading={isFitScoreCountsLoadingState}
                        />
                      )}
                      {candidateSettings.fitScoreType === 'matching' && (
                        <FitScoreFilterTabs
                          selectedGrades={horizontalSelectedMatchingFitScoreGrades}
                          onGradeToggle={handleHorizontalMatchingFitScoreGradeToggle}
                          onClearAll={() => {
                            clearAllHorizontalFitScoreFilters();
                            setIsClearingFilters(true);
                            // Don't reset the flag immediately - let the fitscore counts loading complete first
                            // The flag will be reset in the useEffect that handles fitscore counts loading
                          }}
                          candidateCounts={candidateScoreCounts?.matching || []}
                          className=""
                          filterMode={candidateSettings.fitScoreFilterMode}
                          aiMatchedCount={aiRecordCount}
                          isAiSearchActive={isAiSearchActive}
                          isLoading={isFitScoreCountsLoadingState}
                        />
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3 ml-3">
                      <Button
                        onClick={() => setIsBulkUploadModalOpen(true)}
                        disabled={isLoading || tableLoading}
                        className="mb-2 h-9 px-3"
                      >
                        Upload CVs
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            disabled={isLoading || tableLoading} 
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 ml-2 mb-2 hover:bg-muted/50 transition-colors duration-200"
                          >
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            onClick={() => setIsAddModalOpen(true)}
                            className="text-sm py-2"
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Candidate
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={handleExportCandidates}
                            className="text-sm py-2"
                          >
                            <FileDown className="mr-2 h-4 w-4" />
                            Export to Excel
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={handleImportCandidates}
                            className="text-sm py-2"
                          >
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Import Data
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setIsSettingsDrawerOpen(true)}
                            className="text-sm py-2"
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Settings Page
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* AI Search Results Display */}
                  {aiSearchReasoning && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20">
                      <div className="flex items-start gap-2">
                        <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              AI Search Results
                            </span>
                            <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                              {aiRecordCount} matched
                            </Badge>
                          </div>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            {aiSearchReasoning}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Table */}
            <div className="flex-1 overflow-hidden">
              <CandidateTable
                candidates={displayedCandidates}
                isLoading={(isLoading || tableLoading) && displayedCandidates.length === 0}
                onUpdateCandidate={updateCandidateStatus}
                onDeleteCandidate={handleDeleteCandidate}
                onAssignRecruiter={handleAssignRecruiter}
                onAssignSource={handleAssignSource}
                availablePositions={availablePositions}
                availableStages={availableStages}
                availableRecruiters={availableRecruiters}
                availableSources={availableSources}
                                    canManageCandidates={canEditCandidates}
                  canEditCandidates={canEditCandidates}
                  canDeleteCandidates={canDeleteCandidates}
                  canChangeStatus={canChangeStatus}
                  canViewDetailed={canViewDetailed}
                  canAssignSource={canAssignSource}
                  canAssignRecruiter={canAssignRecruiter}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={(column, direction) => {
                  if (column === sortColumn && (direction === null || direction === undefined)) {
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
                    setSortColumn(column || 'lastUpdate');
                    setSortDirection(direction || 'desc');
                  }
                }}
                onEditPosition={setSelectedPositionForEdit}
                onRefreshCandidateData={async (candidateId) => {
                  await fetchCandidateById(candidateId);
                }}
                selectedCandidateIds={selectedCandidateIds}
                onToggleSelectCandidate={(candidateId) => {
                  const newSelected = new Set(selectedCandidateIds);
                  if (newSelected.has(candidateId)) {
                    newSelected.delete(candidateId);
                  } else {
                    newSelected.add(candidateId);
                  }
                  setSelectedCandidateIds(newSelected);
                }}
                onToggleSelectAllCandidates={() => {
                  if (selectedCandidateIds.size === displayedCandidates.length) {
                    setSelectedCandidateIds(new Set());
                  } else {
                    setSelectedCandidateIds(new Set(displayedCandidates.map(c => c.id)));
                  }
                }}
                isAllCandidatesSelected={selectedCandidateIds.size === displayedCandidates.length && displayedCandidates.length > 0}
                page={page}
                pageSize={pageSize}
                baseIndex={(page - 1) * pageSize}
                onBulkDelete={handleBulkDelete}
                onBulkChangeStatus={handleBulkChangeStatus}
                onBulkAssignRecruiter={handleBulkAssignRecruiter}
                settings={candidateSettings}
              />
            </div>

            {/* Bulk Action Footer - moved outside table area */}
            {selectedCandidateIds && selectedCandidateIds.size > 0 && (
              <div className="border-t bg-muted/30 p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {selectedCandidateIds.size} candidate{selectedCandidateIds.size !== 1 ? 's' : ''} selected
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => handleBulkDelete(Array.from(selectedCandidateIds))}
                        disabled={!canDeleteCandidates}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                      
                      <Button
                        onClick={() => {
                          setBulkNewStatus('');
                          setBulkTransitionNotes('');
                          setIsBulkStatusModalOpen(true);
          
                        }}
                        disabled={!canBulkChangeStatus}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                      >
                        <FileEdit className="h-3 w-3 mr-1" />
                        Status
                      </Button>
                      
                      <Button
                        onClick={() => {
                          setBulkNewRecruiterId(null);
                          setIsBulkRecruiterModalOpen(true);
                        }}
                        disabled={!canEditCandidates}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Recruiter
                      </Button>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => setSelectedCandidateIds(new Set())}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {/* Pagination */}
            <div className="p-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    {(() => {
                      // Use AI search counts when AI search is active
                      const currentTotal = isAiSearchActive && aiMatchedCandidateIds ? aiRecordCount : total;
                      const currentPageSize = pageSize;
                      const startItem = ((page - 1) * currentPageSize) + 1;
                      const endItem = Math.min(page * currentPageSize, currentTotal);
                      
                      if (currentTotal === 0) {
                        return isAiSearchActive ? 'No AI-matched candidates found' : 'No candidates found';
                      }
                      
                      if (isAiSearchActive && aiMatchedCandidateIds) {
                        return `Showing ${startItem} to ${endItem} of ${currentTotal} AI-matched candidates`;
                      }
                      
                      return `Showing ${startItem} to ${endItem} of ${currentTotal} candidates`;
                    })()}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Items per page:</span>
                    <Select 
                      value={pageSize.toString()} 
                      onValueChange={(value) => {
                        const newPageSize = parseInt(value);
                        setPageSize(newPageSize);
                        setPage(1); // Reset to first page when changing page size
                        // Fetch data with new page size
                        if (filters) {
                          fetchTableData(filters, 1, newPageSize);
                        }
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
                        <SelectItem value="1000">1000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={(() => {
                      const currentTotal = isAiSearchActive && aiMatchedCandidateIds ? aiRecordCount : total;
                      return page <= 1 || currentTotal === 0;
                    })()}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 hover:bg-muted/50 transition-colors duration-200"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground mr-2" />
                    Previous
                  </Button>
                  
                  <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                    {(() => {
                      const currentTotal = isAiSearchActive && aiMatchedCandidateIds ? aiRecordCount : total;
                      if (currentTotal === 0) {
                        return 'No pages';
                      }
                      return `Page ${page} of ${totalPages}`;
                    })()}
                  </span>
                  
                  <Button
                    onClick={() => {
                      setPage(Math.min(totalPages, page + 1));
                      // Show Performance Monitor for admin users
                      if (session?.user?.role === 'Admin') {
                
                      }
                    }}
                    disabled={(() => {
                      const currentTotal = isAiSearchActive && aiMatchedCandidateIds ? aiRecordCount : total;
                      return page >= totalPages || currentTotal === 0;
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
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddCandidateModal
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        availableStages={availableStages}
        onAddCandidate={async () => {
          if (filters) {
            fetchTableData(filters, page, pageSize);
          }
        }}
      />

      <BulkUploadCVsModal
        isOpen={isBulkUploadModalOpen}
        onOpenChange={setIsBulkUploadModalOpen}
        onUploadSuccess={() => {
          if (filters) {
            fetchTableData(filters, page, pageSize);
          }
        }}
      />

      <CandidateImportModal
        isOpen={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportSuccess={() => {
          if (filters) {
            fetchTableData(filters, page, pageSize);
          }
        }}
      />

      <PositionDetailDrawer
        isOpen={isPositionDrawerOpen}
        onOpenChange={setIsPositionDrawerOpen}
        positionId={selectedPositionForEdit?.id || null}
      />

      <CandidateSettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onOpenChange={handleSettingsDrawerOpenChange}
        currentSettings={candidateSettings}
        onSettingsChange={handleSettingsChange}
        isLoading={settingsLoading}
        error={settingsError}
      />

      {/* Bulk Status Change Modal */}
      <AlertDialog open={isBulkStatusModalOpen} onOpenChange={setIsBulkStatusModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Change Status for Selected Candidates</AlertDialogTitle>
            <AlertDialogDescription>
              Change the status for {selectedCandidateIds.size} selected candidate{selectedCandidateIds.size !== 1 ? 's' : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-status">New Status</Label>
              <Select value={bulkNewStatus} onValueChange={setBulkNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="z-[100003]">
                  {availableStages.map((stage) => (
                    <SelectItem key={stage.name} value={stage.name}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Label htmlFor="bulk-notes">Transition Notes (Optional)</Label>
              <Textarea
                id="bulk-notes"
                placeholder="Add notes about this status change..."
                value={bulkTransitionNotes}
                onChange={(e) => setBulkTransitionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsBulkStatusModalOpen(false);
              setBulkNewStatus('');
              setBulkTransitionNotes('');
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (bulkNewStatus) {
                  handleBulkChangeStatus(Array.from(selectedCandidateIds), bulkNewStatus, bulkTransitionNotes);
                  setIsBulkStatusModalOpen(false);
                  setBulkNewStatus('');
                  setBulkTransitionNotes('');
                }
              }}
              disabled={!bulkNewStatus}
            >
              Change Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Recruiter Assignment Modal */}
      <AlertDialog open={isBulkRecruiterModalOpen} onOpenChange={setIsBulkRecruiterModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Recruiter to Selected Candidates</AlertDialogTitle>
            <AlertDialogDescription>
              Assign a recruiter to {selectedCandidateIds.size} selected candidate{selectedCandidateIds.size !== 1 ? 's' : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-recruiter">Recruiter</Label>
              <Select value={bulkNewRecruiterId || 'none'} onValueChange={(value) => setBulkNewRecruiterId(value === 'none' ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recruiter" />
                </SelectTrigger>
                <SelectContent className="z-[100003]">
                  <SelectItem value="none">No Recruiter</SelectItem>
                  {availableRecruiters.map((recruiter) => (
                    <SelectItem key={recruiter.id} value={recruiter.id}>
                      {recruiter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsBulkRecruiterModalOpen(false);
              setBulkNewRecruiterId(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                handleBulkAssignRecruiter(Array.from(selectedCandidateIds), bulkNewRecruiterId);
                setIsBulkRecruiterModalOpen(false);
                setBulkNewRecruiterId(null);
              }}
            >
              Assign Recruiter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </>
  );
}
