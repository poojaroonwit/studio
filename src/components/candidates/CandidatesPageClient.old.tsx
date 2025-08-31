"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { CandidateFilters, type CandidateFilterValues } from '@/components/candidates/CandidateFilters';
import { CandidateTable } from '@/components/candidates/CandidateTable';
import type { Candidate, CandidateStatus, Position, RecruitmentStage, UserProfile, CandidateSource } from '@/lib/types';
import { getScoreRangesForChart } from '@/lib/scoreUtils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { PlusCircle, Users, ServerCrash, Zap, Loader2, FileDown, FileUp, ChevronDown, FileSpreadsheet, ShieldAlert, Brain, Trash2 as BulkTrashIcon, Edit as BulkEditIcon, ChevronLeft, ChevronRight, ChevronsUpDown, Check, Briefcase, X, Filter, Search, Settings, MoreVertical } from 'lucide-react';
import { toast } from "react-hot-toast";
import { AddCandidateModal, type AddCandidateFormValues } from '@/components/candidates/AddCandidateModal';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import BulkUploadCVsModal from '@/components/BulkUploadCVsModal';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import AutomationUploadModal from './AutomationUploadModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { StageSelect } from './StageSelect';
import { HealthCheck } from '@/components/ui/health-check';
import { Badge } from '@/components/ui/badge';
import { UserX } from 'lucide-react';
import { FitScoreFilterBadges } from './FitScoreFilterBadges';
import { FitScoreFilterTabs } from './FitScoreFilterTabs';
import { CandidateSettingsDrawer, type CandidateSettings } from './CandidateSettingsDrawer';
import { useDynamicHeight } from '@/hooks/use-dynamic-height';
import { useCandidateSettings } from '@/hooks/use-candidate-settings';


interface CandidatesPageClientProps {
  initialCandidates: Candidate[];
  initialAvailablePositions: Position[];
  initialAvailableStages: RecruitmentStage[];
  authError?: boolean;
  permissionError?: boolean;
  initialFetchError?: string; // Added for server-side errors
  initialFilters?: CandidateFilterValues;
}

function downloadFile(content: string | Blob, filename: string, contentType?: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: contentType });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
  // All hooks must be called before any return
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
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



  const [filters, setFilters] = useState<CandidateFilterValues>(() => {
    const baseFilters = initialFilters || {
      minAppliedJobFitScore: undefined,
      maxAppliedJobFitScore: undefined,
      minMatchingJobFitScore: undefined,
      maxMatchingJobFitScore: undefined,
      minExperienceYears: 0,
      maxExperienceYears: 50,
      selectedPositionIds: [],
      selectedStatuses: [],
      selectedRecruiterIds: []
    };
    
    // console.log('Initial filters set:', baseFilters);
    return baseFilters;
  });

  // Debug: Log whenever filters change
  // useEffect(() => {
  //   console.log('Filters state changed to:', filters);
  // }, [filters]);



  const safeInitialCandidates = Array.isArray(initialCandidates) ? initialCandidates : [];
  const safeInitialAvailablePositions = Array.isArray(initialAvailablePositions) ? initialAvailablePositions : [];
  const safeInitialAvailableStages = Array.isArray(initialAvailableStages) ? initialAvailableStages : [];

  // Main candidates data - filtered and paginated for display
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>(safeInitialCandidates || []);
  // Complete candidates data for counts and statistics (unfiltered)
  const [allCandidatesForCounts, setAllCandidatesForCounts] = useState<Candidate[]>(safeInitialCandidates || []);
  const [availablePositions, setAvailablePositions] = useState<Position[]>(safeInitialAvailablePositions || []);
  const [availableStages, setAvailableStages] = useState<RecruitmentStage[]>(safeInitialAvailableStages || []);
  const [availableRecruiters, setAvailableRecruiters] = useState<Pick<UserProfile, 'id' | 'name' | 'email' | 'avatarUrl'>[]>([]);
  const [availableSources, setAvailableSources] = useState<CandidateSource[]>([]);



  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [aiSearchReasoning, setAiSearchReasoning] = useState<string | null>(null);
  const [aiMatchedCandidateIds, setAiMatchedCandidateIds] = useState<string[] | null>(null);
  const [aiRecordCount, setAiRecordCount] = useState<number>(0);
  const [isAiSearchActive, setIsAiSearchActive] = useState(false);
  const [hasInitialFetch, setHasInitialFetch] = useState(false);
  const [hasInitialDataFetch, setHasInitialDataFetch] = useState(false);
  const [advancedQueryFromUrl, setAdvancedQueryFromUrl] = useState<string>('');
  const [isClearingFilters, setIsClearingFilters] = useState(false);

  // Add debouncing for fetch requests
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreateViaAutomationModalOpen, setIsCreateViaAutomationModalOpen] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(initialFetchError || null);
  const [authError, setAuthError] = useState(serverAuthError);
  const [permissionError, setPermissionError] = useState(serverPermissionError);

  const [isPositionDrawerOpen, setIsPositionDrawerOpen] = useState(false);
  const [selectedPositionForEdit, setSelectedPositionForEdit] = useState<Position | null>(null);
  const { data: session, status: sessionStatus } = useSession();
  
  


  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [isBulkActionConfirmOpen, setIsBulkActionConfirmOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'delete' | 'change_status' | 'assign_recruiter' | null>(null);
  const [bulkNewStatus, setBulkNewStatus] = useState<string>('');
  const [bulkNewRecruiterId, setBulkNewRecruiterId] = useState<string | null>(null);
  const [bulkTransitionNotes, setBulkTransitionNotes] = useState<string>('');

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [total, setTotal] = useState<number>(safeInitialCandidates?.length || 0);
  
  // Add sorting state variables here to prevent temporal dead zone issues
  const [sortColumn, setSortColumn] = useState<string>('lastUpdate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const canExportCandidates = session?.user?.role === 'Admin' || session?.user?.modulePermissions?.includes('CANDIDATES_EXPORT') || false;
  const canManageCandidates = session?.user?.role === 'Admin' || session?.user?.modulePermissions?.includes('CANDIDATES_MANAGE') || false;

  // Calculate total pages for pagination
  const totalPages = useMemo(() => {
    if (isAiSearchActive && aiMatchedCandidateIds) {
      return Math.max(1, Math.ceil(aiRecordCount / pageSize));
    }
    return Math.max(1, Math.ceil(total / pageSize));
  }, [isAiSearchActive, aiMatchedCandidateIds, aiRecordCount, pageSize, total]);

  // Simplified helper function to normalize fit scores
  const normalizeFitScore = (score: number | null | undefined): number => {
    if (score === null || score === undefined) return 0;
    if (score > 0 && score <= 1) return Math.round(score * 100);
    return Math.round(score);
  };

  // Simplified helper function to get the best matching fit score
  const getBestMatchingFitScore = (candidate: Candidate): number => {
    // Check JobMatch table first
    if (candidate.jobMatches && Array.isArray(candidate.jobMatches)) {
      const maxMatchScore = Math.max(...candidate.jobMatches.map(match => match.fitScore || 0));
      if (maxMatchScore > 0) return normalizeFitScore(maxMatchScore);
    }
    
    // If no JobMatch, check parsedData.job_matches
    if (candidate.parsedData && typeof candidate.parsedData === 'object') {
      const parsed = candidate.parsedData as any;
      if (parsed.job_matches && Array.isArray(parsed.job_matches)) {
        const maxMatchScore = Math.max(...parsed.job_matches.map((match: any) => match.fitScore || 0));
        if (maxMatchScore > 0) return normalizeFitScore(maxMatchScore);
      }
    }
    
    return 0;
  };

  // Add a separate state for table data to prevent full page refresh
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const [tableError, setTableError] = useState<string | null>(null);



  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isAutomationUploadModalOpen, setIsAutomationUploadModalOpen] = useState(false);

  // Collapsible sidebar state
  const [showFilters, setShowFilters] = useState(true);

  // Horizontal fit score filter state
  const [horizontalSelectedFitScoreGrades, setHorizontalSelectedFitScoreGrades] = useState<Set<string>>(new Set());
  const [horizontalSelectedMatchingFitScoreGrades, setHorizontalSelectedMatchingFitScoreGrades] = useState<Set<string>>(new Set());

  // Add at the top of the component
  const hasInitializedFilters = useRef(false);
  


  const [missingPositions, setMissingPositions] = useState<string[]>([]);

  // Settings state
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const { settings: candidateSettings, setSettings: setCandidateSettings, isLoading: settingsLoading, error: settingsError } = useCandidateSettings();



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

  // Get candidates that match all other filters but NOT fit score filters
  // This prevents circular dependency where fit score counts would be affected by selected fit score filters
  const candidatesForFitScoreCounts = useMemo(() => {
    // Apply basic filters to allCandidatesForCounts to get counts for the current filter state
    // This excludes fit score filters to prevent circular dependency
    const filtered = allCandidatesForCounts.filter((candidate: Candidate) => {
      // Apply basic filters that we can easily replicate on client side
      if (filters.selectedPositionIds && filters.selectedPositionIds.length > 0 && 
          !filters.selectedPositionIds.includes(candidate.positionId || '')) return false;
      if (filters.selectedStatuses && filters.selectedStatuses.length > 0 && 
          !filters.selectedStatuses.includes(candidate.status)) return false;
      if (filters.selectedRecruiterIds && filters.selectedRecruiterIds.length > 0 && 
          !filters.selectedRecruiterIds.includes(candidate.recruiterId || '')) return false;
      if (filters.selectedSourceIds && filters.selectedSourceIds.length > 0 && 
          !filters.selectedSourceIds.includes(candidate.sourceId || '')) return false;
      
      return true;
    });
    

    
    return filtered;
  }, [allCandidatesForCounts, filters.selectedPositionIds, filters.selectedStatuses, filters.selectedRecruiterIds, filters.selectedSourceIds]);

  // Calculate candidate score counts for fit score filter badges
  // Use candidates filtered by other criteria but NOT fit score filters to avoid circular dependency
  const candidateScoreCounts = useMemo(() => {
    const scoreRanges = getScoreRangesForChart();
    const appliedScoreRangeCounts: { [key: string]: number } = {};
    const matchingScoreRangeCounts: { [key: string]: number } = {};
    
    const candidatesToProcess = candidatesForFitScoreCounts;
    
    candidatesToProcess.forEach((candidate: Candidate) => {
      // Applied fit score (normalized)
      const appliedScore = normalizeFitScore(candidate.fitScore);
      
      if (appliedScore > 0) {
        scoreRanges.forEach(range => {
          if (appliedScore >= range.min && appliedScore <= range.max) {
            appliedScoreRangeCounts[range.letter] = (appliedScoreRangeCounts[range.letter] || 0) + 1;
          }
        });
      } else {
        // Count candidates with no applied fit score
        appliedScoreRangeCounts['no-score'] = (appliedScoreRangeCounts['no-score'] || 0) + 1;
      }
      
      // Matching fit score (simplified)
      const matchingScore = getBestMatchingFitScore(candidate);
      
      if (matchingScore > 0) {
        scoreRanges.forEach(range => {
          if (matchingScore >= range.min && matchingScore <= range.max) {
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
  }, [candidatesForFitScoreCounts]);

  // Fetch missing positions if any candidate has a positionId not in availablePositions
  useEffect(() => {
    const missing = filteredCandidates
      .filter(c => c.positionId && !availablePositions.some(p => p.id === c.positionId))
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
  }, [filteredCandidates, availablePositions]);

  // Handle initial URL parameters (only if not clearing filters)
  useEffect(() => {
    if (isClearingFilters || hasInitializedFilters.current) {
      return;
    }
    
    // Read URL parameters for initial filtering
    const urlPositionId = searchParams.get('positionId');
    const urlRecruiterId = searchParams.get('recruiterId');
    const urlStatus = searchParams.get('status');
    const applicationDateStartParam = searchParams.get('applicationDateStart');
    const applicationDateEndParam = searchParams.get('applicationDateEnd');
    const nameParam = searchParams.get('name');
    const emailParam = searchParams.get('email');
    const phoneParam = searchParams.get('phone');
    const educationParam = searchParams.get('education');
    const minAppliedJobFitScoreParam = searchParams.get('minAppliedJobFitScore');
    const maxAppliedJobFitScoreParam = searchParams.get('maxAppliedJobFitScore');
    const advancedQueryParam = searchParams.get('query');

    // Build new filters from URL params
    let newFilters = { ...filters };
    let hasChanges = false;
    let advancedQuery = '';

    // Handle advanced query parameter first
    if (advancedQueryParam) {
      advancedQuery = decodeURIComponent(advancedQueryParam);
      hasChanges = true;
      // Don't process individual parameters when we have an advanced query
      // The advanced query will be parsed by the CandidateFilters component
    } else {
      // Handle individual parameters
      // Handle recruiter filter
      if (urlRecruiterId) {
        const recruiterIds = urlRecruiterId.split(',');
        if (!filters.selectedRecruiterIds || 
            JSON.stringify(filters.selectedRecruiterIds.sort()) !== JSON.stringify(recruiterIds.sort())) {
          newFilters.selectedRecruiterIds = recruiterIds;
          hasChanges = true;
        }
      }

      // Handle position filter
      if (urlPositionId) {
        const positionIds = urlPositionId.split(',');
        if (!filters.selectedPositionIds || 
            JSON.stringify(filters.selectedPositionIds.sort()) !== JSON.stringify(positionIds.sort())) {
          newFilters.selectedPositionIds = positionIds;
          hasChanges = true;
        }
      }

      // Handle status filter
      if (urlStatus) {
        const statuses = urlStatus.split(',');
        if (!filters.selectedStatuses || 
            JSON.stringify(filters.selectedStatuses.sort()) !== JSON.stringify(statuses.sort())) {
          newFilters.selectedStatuses = statuses;
          hasChanges = true;
        }
      }

      // Handle date range
      if (applicationDateStartParam || applicationDateEndParam) {
        const startDate = applicationDateStartParam ? new Date(applicationDateStartParam) : undefined;
        const endDate = applicationDateEndParam ? new Date(applicationDateEndParam) : undefined;
        
        if (filters.applicationDateStart !== startDate || filters.applicationDateEnd !== endDate) {
          newFilters.applicationDateStart = startDate;
          newFilters.applicationDateEnd = endDate;
          hasChanges = true;
        }
      }

      // Handle text filters
      if (nameParam && filters.name !== nameParam) {
        newFilters.name = nameParam;
        hasChanges = true;
      }
      if (emailParam && filters.email !== emailParam) {
        newFilters.email = emailParam;
        hasChanges = true;
      }
      if (phoneParam && filters.phone !== phoneParam) {
        newFilters.phone = phoneParam;
        hasChanges = true;
      }
      if (educationParam && filters.education !== educationParam) {
        newFilters.education = educationParam;
        hasChanges = true;
      }

      // Handle fit score range
      if (minAppliedJobFitScoreParam || maxAppliedJobFitScoreParam) {
        const minScore = minAppliedJobFitScoreParam ? parseInt(minAppliedJobFitScoreParam, 10) : 0;
        const maxScore = maxAppliedJobFitScoreParam ? parseInt(maxAppliedJobFitScoreParam, 10) : 100;
        
        if (filters.minAppliedJobFitScore !== minScore || filters.maxAppliedJobFitScore !== maxScore) {
          newFilters.minAppliedJobFitScore = minScore;
          newFilters.maxAppliedJobFitScore = maxScore;
          hasChanges = true;
        }
      }
    }

    // Only update if there are actual changes
    if (hasChanges) {
      // If we have an advanced query, don't update filters state directly
      // Let the CandidateFilters component handle the parsing
      if (!advancedQuery) {
        setFilters(newFilters);
      }
      
      // If we have an advanced query, store it for the filter component
      if (advancedQuery) {
        setAdvancedQueryFromUrl(advancedQuery);
      }
    }
  }, [searchParams, isClearingFilters, filters]); // Use searchParams instead of window.location.search

  const fetchRecruiters = useCallback(async (retryCount = 0) => {

    if (sessionStatus !== 'authenticated') return;
    
    const maxRetries = 3;
    const retryDelay = 1000 * (retryCount + 1); // Exponential backoff: 1s, 2s, 3s
    
    try {
      const response = await fetch('/api/users?role=Recruiter');
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); // Default to empty object on JSON parse fail
          console.error("API error fetching recruiters:", errorData); // Log the object we got
          
          let detailedErrorMessage = (errorData as any)?.message || 'Failed to fetch recruiters';
          if (Object.keys(errorData).length === 0 && !(errorData as any)?.message) {
            // If errorData is empty and has no message, use statusText
            detailedErrorMessage = `Failed to fetch recruiters. Server responded with status ${response.status}: ${response.statusText || 'No additional error message.'}`;
          } else if ((errorData as any)?.error) { // If there's an 'error' property in the JSON
            detailedErrorMessage += ` (Details: ${(errorData as any).error})`;
          }
          if ((errorData as any)?.code) { // If there's a 'code' property
             detailedErrorMessage += ` (Code: ${(errorData as any).code})`;
          }
          
          // Retry on server errors (5xx) but not on client errors (4xx)
          if (response.status >= 500 && retryCount < maxRetries) {
            console.warn(`Recruiter fetch failed (attempt ${retryCount + 1}/${maxRetries}), retrying in ${retryDelay}ms:`, detailedErrorMessage);
            setTimeout(() => fetchRecruiters(retryCount + 1), retryDelay);
            return;
          }
          
          // Don't throw error, just log it and continue with empty recruiters list
          console.warn("Recruiter fetch failed, continuing with empty list:", detailedErrorMessage);
          setAvailableRecruiters([]);
          return;
      }
      const responseData = await response.json(); 
      // Handle the correct API response structure: { users: [...], pagination: {...} }
      const recruitersArray = responseData?.users || [];

      if (!Array.isArray(recruitersArray)) {
        console.warn("Invalid data format received for recruiters, using empty list");
        setAvailableRecruiters([]);
        return;
      }
      const mappedRecruiters = recruitersArray.map(r => ({ id: r.id, name: r.name, email: r.email || '', avatarUrl: r.avatarUrl }));

      setAvailableRecruiters(mappedRecruiters);
    } catch (error) {
      console.error("Error fetching recruiters:", error);
      
      // Retry on network errors
      if (retryCount < maxRetries) {
        console.warn(`Recruiter fetch failed due to network error (attempt ${retryCount + 1}/${maxRetries}), retrying in ${retryDelay}ms`);
        setTimeout(() => fetchRecruiters(retryCount + 1), retryDelay);
        return;
      }
      
      // Don't show toast error, just log it and continue with empty recruiters list
      console.warn("Recruiter fetch failed due to network error, continuing with empty list");
      setAvailableRecruiters([]);
    }
  }, [sessionStatus]);

  const fetchSources = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return;
    
    try {
      const response = await fetch('/api/settings/candidate-sources');
      if (!response.ok) {
        console.warn("Failed to fetch candidate sources, continuing with empty list");
        setAvailableSources([]);
        return;
      }
      const sourcesData = await response.json();
      setAvailableSources(sourcesData || []);
    } catch (error) {
      console.error("Error fetching candidate sources:", error);
      setAvailableSources([]);
    }
  }, [sessionStatus]);

  // Use ref to track session status to avoid dependency issues
  const sessionStatusRef = useRef(sessionStatus);
  sessionStatusRef.current = sessionStatus;
  
  // Use ref to track current request to prevent infinite loops
  const currentRequestRef = useRef<string | null>(null);
  
  const latestRequestIdRef = useRef<string | null>(null);

  const fetchPaginatedCandidates = useCallback(async (currentFilters: CandidateFilterValues, page: number, pageSize: number) => {
    const requestId = `${Date.now()}-${Math.random()}`;
    latestRequestIdRef.current = requestId;

    if (sessionStatusRef.current !== 'authenticated') {
      setIsLoading(false);
      return;
    }
    
    // Prevent multiple simultaneous requests
    if (isFetching) {
      // console.log('fetchPaginatedCandidates: Already fetching, skipping request');
      return;
    }
    
    // Clear any pending timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    setIsFetching(true);
    setIsLoading(true);
    setFetchError(null);
    setAuthError(false);
    setPermissionError(false);
    // Do NOT clear AI results here; only clear on explicit user action
    // if (!isAiSearchActive) {
    //   setAiMatchedCandidateIds(null);
    //   setAiSearchReasoning(null);
    // }
    
    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      // console.error('Loading timeout: Candidates fetch took too long');
      setIsLoading(false);
      setIsFetching(false);
      setFetchError('Request timeout. The server may be starting up. Please wait a moment and refresh.');
    }, 30000);
    try {
      const query = new URLSearchParams();
      
      // Check if we have an advanced query from URL and pass it to the API
      const advancedQueryParam = searchParams.get('query');
      if (advancedQueryParam) {
        query.append('query', advancedQueryParam);
      }
      
      if (currentFilters.name) {
        query.append('name', currentFilters.name);
        if (currentFilters.nameOperator) query.append('nameOperator', currentFilters.nameOperator);
      }
      if (currentFilters.email) {
        query.append('email', currentFilters.email);
        if (currentFilters.emailOperator) query.append('emailOperator', currentFilters.emailOperator);
      }
      if (currentFilters.phone) {
        query.append('phone', currentFilters.phone);
        if (currentFilters.phoneOperator) query.append('phoneOperator', currentFilters.phoneOperator);
      }
      if (currentFilters.selectedPositionIds && currentFilters.selectedPositionIds.length > 0) query.append('positionId', currentFilters.selectedPositionIds.join(','));
      if (currentFilters.selectedStatuses && currentFilters.selectedStatuses.length > 0) query.append('status', currentFilters.selectedStatuses.join(','));
      if (currentFilters.education) query.append('education', currentFilters.education);
      if (currentFilters.minAppliedJobFitScore !== undefined) query.append('minAppliedJobFitScore', String(currentFilters.minAppliedJobFitScore));
      if (currentFilters.maxAppliedJobFitScore !== undefined) query.append('maxAppliedJobFitScore', String(currentFilters.maxAppliedJobFitScore));
      if (currentFilters.minMatchingJobFitScore !== undefined) query.append('minMatchingJobFitScore', String(currentFilters.minMatchingJobFitScore));
      if (currentFilters.maxMatchingJobFitScore !== undefined) query.append('maxMatchingJobFitScore', String(currentFilters.maxMatchingJobFitScore));
      if (currentFilters.minExperienceYears !== undefined && (currentFilters.minExperienceYears > 0 || currentFilters.minExperienceYears === -1)) query.append('minExperienceYears', String(currentFilters.minExperienceYears));
      if (currentFilters.maxExperienceYears !== undefined && currentFilters.maxExperienceYears < 50) query.append('maxExperienceYears', String(currentFilters.maxExperienceYears));
      if (currentFilters.applicationDateStart) {
        query.append('applicationDateStart', currentFilters.applicationDateStart.toISOString());
      }
      if (currentFilters.applicationDateEnd) {
        query.append('applicationDateEnd', currentFilters.applicationDateEnd.toISOString());
      }
      if (currentFilters.selectedRecruiterIds && currentFilters.selectedRecruiterIds.length > 0) query.append('recruiterId', currentFilters.selectedRecruiterIds.join(','));
      query.append('page', String(page));
      query.append('limit', String(pageSize));
      // Add sorting
      if (sortColumn) query.append('sortColumn', sortColumn);
      if (sortDirection) query.append('sortDirection', sortDirection);
      
      if (currentFilters.location) {
        query.append('location', currentFilters.location);
        if (currentFilters.locationOperator) query.append('locationOperator', currentFilters.locationOperator);
      }
      if (currentFilters.skills && Array.isArray(currentFilters.skills)) {
        if (currentFilters.skills.length > 0) query.append('skills', currentFilters.skills.join(','));
      } else if (typeof currentFilters.skills === 'string' && currentFilters.skills) {
        query.append('skills', currentFilters.skills);
      }
      
            const apiUrl = `/api/candidates?${query.toString()}`;
            


      // Add timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Reduced from 15 seconds to 8 seconds for faster response

      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorData: any = {};
        let errorMessageFromServer = null;
        try {
          errorData = await response.json();
          errorMessageFromServer = errorData?.message || errorData?.error;
        } catch (e) {}
        let errorMessage = errorMessageFromServer || `Failed to fetch candidates. Server responded with status ${response.status}: ${response.statusText || 'No additional error message.'}`;
        if (errorData?.code) {
          errorMessage += ` (Code: ${errorData.code})`;
        }
        if (response.status === 401) {
            setAuthError(true);
            setIsLoading(false); // Clear loading state on auth error
            return;
        }
        if (response.status === 403) {
            setPermissionError(true);
            setFetchError(errorMessage);
            setIsLoading(false); // Clear loading state on permission error
            if (latestRequestIdRef.current === requestId) setFilteredCandidates([]); // Only clear on permission error
            return;
        }
        setFetchError(errorMessage);
        setIsLoading(false); // Clear loading state on error
        // Do NOT clear candidates here
        return;
      }
      const data = await response.json();
      
      const candidatesArray = Array.isArray(data.data) ? data.data : [];
      const totalCount = data.pagination?.total || 0;
      const actualPage = data.pagination?.page || 1;
      
              // Only update if this is the latest request
        if (latestRequestIdRef.current === requestId) {
          setFilteredCandidates(candidatesArray); // Only update on success
          setTotal(totalCount);
          setPage(actualPage); // <-- Update page state from API response
        
        // Ensure loading state is cleared when we have data
        if (candidatesArray.length > 0 || totalCount > 0) {
          setIsLoading(false);
        }
      } 
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // console.error('Request timeout - server may be overloaded');
        setFetchError('Request timeout - please try again in a moment');
      } else {
      const errorMessage = (error as Error).message || "Could not load candidate data.";
       if (!(errorMessage.toLowerCase().includes("unauthorized") || errorMessage.toLowerCase().includes("forbidden"))) {
        setFetchError(errorMessage);
        }
      }
      // Do NOT clear candidates here
    } finally {
      clearTimeout(loadingTimeout); // Clear the loading timeout
      setIsLoading(false);
      setIsFetching(false);
      currentRequestRef.current = null; // Clear the current request ref
    }
  }, [sortColumn, sortDirection]); // Include sorting dependencies

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (filterChangeTimeoutRef.current) {
        clearTimeout(filterChangeTimeoutRef.current);
      }
    };
  }, []);

  // Create a debounced version for refresh events
  const debouncedFetchPaginatedCandidates = useCallback((currentFilters: CandidateFilterValues, page: number, pageSize: number) => {
    // Clear any pending timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    // Set a new timeout - reduced for faster response
    fetchTimeoutRef.current = setTimeout(() => {
      fetchPaginatedCandidates(currentFilters, page, pageSize);
    }, 50); // Reduced debounce for faster response
  }, [fetchPaginatedCandidates]);

      // Separate function to fetch only table data for optimized filtering
    const fetchTableData = useCallback(async (currentFilters: CandidateFilterValues, currentPage: number, currentPageSize: number) => {
      // console.log('🔍 FETCH DEBUG: fetchTableData called with filters:', currentFilters);
      const requestId = `${Date.now()}-${Math.random()}`;
      latestRequestIdRef.current = requestId;

    if (sessionStatusRef.current !== 'authenticated') {
     //  console.log('🔍 FETCH DEBUG: Not authenticated, skipping fetch');
      setTableLoading(false);
      return;
    }
    
    // Prevent multiple simultaneous requests
    if (isFetching) {
     //  console.log('🔍 FETCH DEBUG: Already fetching, skipping request');
      return;
    }
    
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    setIsFetching(true);
    setTableLoading(true);
    setTableError(null);
    
    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      setTableLoading(false);
      setIsLoading(false); // Also clear the main loading state
      setIsFetching(false);
      setTableError('Request timeout. The server may be starting up. Please wait a moment and refresh.');
    }, 10000); // Reduced from 30 seconds to 10 seconds for faster response
    
    try {
      const query = new URLSearchParams();
      
      // Check if we have an advanced query from URL and pass it to the API
      const advancedQueryParam = searchParams.get('query');
      if (advancedQueryParam) {
        query.append('query', advancedQueryParam);
      }
      
      if (currentFilters.name) {
        query.append('name', currentFilters.name);
        if (currentFilters.nameOperator) query.append('nameOperator', currentFilters.nameOperator);
      }
      if (currentFilters.email) {
        query.append('email', currentFilters.email);
        if (currentFilters.emailOperator) query.append('emailOperator', currentFilters.emailOperator);
      }
      if (currentFilters.phone) {
        query.append('phone', currentFilters.phone);
        if (currentFilters.phoneOperator) query.append('phoneOperator', currentFilters.phoneOperator);
      }
      if (currentFilters.selectedPositionIds && currentFilters.selectedPositionIds.length > 0) query.append('positionId', currentFilters.selectedPositionIds.join(','));
      if (currentFilters.selectedStatuses && currentFilters.selectedStatuses.length > 0) query.append('status', currentFilters.selectedStatuses.join(','));
      if (currentFilters.education) query.append('education', currentFilters.education);
      if (currentFilters.minAppliedJobFitScore !== undefined) query.append('minAppliedJobFitScore', String(currentFilters.minAppliedJobFitScore));
      if (currentFilters.maxAppliedJobFitScore !== undefined) query.append('maxAppliedJobFitScore', String(currentFilters.maxAppliedJobFitScore));
      if (currentFilters.minMatchingJobFitScore !== undefined) query.append('minMatchingJobFitScore', String(currentFilters.minMatchingJobFitScore));
      if (currentFilters.maxMatchingJobFitScore !== undefined) query.append('maxMatchingJobFitScore', String(currentFilters.maxMatchingJobFitScore));
      if (currentFilters.minExperienceYears !== undefined && (currentFilters.minExperienceYears > 0 || currentFilters.minExperienceYears === -1)) query.append('minExperienceYears', String(currentFilters.minExperienceYears));
      if (currentFilters.maxExperienceYears !== undefined && currentFilters.maxExperienceYears < 50) query.append('maxExperienceYears', String(currentFilters.maxExperienceYears));
      if (currentFilters.applicationDateStart) {
        query.append('applicationDateStart', currentFilters.applicationDateStart.toISOString());
      }
      if (currentFilters.applicationDateEnd) {
        query.append('applicationDateEnd', currentFilters.applicationDateEnd.toISOString());
      }
      if (currentFilters.selectedRecruiterIds && currentFilters.selectedRecruiterIds.length > 0) query.append('recruiterId', currentFilters.selectedRecruiterIds.join(','));
      query.append('page', String(currentPage));
      query.append('limit', String(currentPageSize));
      // Add sorting
      if (sortColumn) query.append('sortColumn', sortColumn);
      if (sortDirection) query.append('sortDirection', sortDirection);
      
      if (currentFilters.location) {
        query.append('location', currentFilters.location);
        if (currentFilters.locationOperator) query.append('locationOperator', currentFilters.locationOperator);
      }
      if (currentFilters.skills && Array.isArray(currentFilters.skills)) {
        if (currentFilters.skills.length > 0) query.append('skills', currentFilters.skills.join(','));
      } else if (typeof currentFilters.skills === 'string' && currentFilters.skills) {
        query.append('skills', currentFilters.skills);
      }
      
  
      
      const apiUrl = `/api/candidates?${query.toString()}`;
 
      // Add timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Reduced from 15 seconds to 8 seconds for faster response

      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch candidates: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
   
      
      // Check if this is still the latest request
      if (latestRequestIdRef.current !== requestId) {
       //  console.log('🔍 FETCH DEBUG: Request superseded, ignoring response');
        return;
      }
      
      if (data.data && Array.isArray(data.data)) {
     
        setFilteredCandidates(data.data);
        // No need to update tableCandidates since we're using filteredCandidates
        setTotal(data.pagination?.total || data.data.length);
        setTableError(null);
       //  console.log('🔍 FETCH DEBUG: Successfully updated table with', data.data.length, 'candidates');
      } else {
       //  console.log('🔍 FETCH DEBUG: No valid data received:', data);
        setFilteredCandidates([]);
        // No need to clear tableCandidates since we're using filteredCandidates
        setTotal(0);
        setTableError('Invalid data format received from server');
        // console.error('🔍 FETCH ERROR: Invalid data format:', data);
      }
    } catch (error) {
      if (latestRequestIdRef.current !== requestId) {
        return;
      }
      
      console.error('🔍 FETCH ERROR: Error fetching candidates:', error);
      setTableError((error as Error).message || 'Failed to fetch candidates');
      setFilteredCandidates([]);
      setTotal(0);
    } finally {
      if (latestRequestIdRef.current !== requestId) {
        return;
      }
      
      clearTimeout(loadingTimeout);
      setTableLoading(false);
      setIsFetching(false);
      currentRequestRef.current = null;
     //  console.log('🔍 FETCH DEBUG: Request completed');
    }
  }, [filters, page, pageSize, sortColumn, sortDirection, sessionStatus, serverAuthError, serverPermissionError, isClearingFilters, hasInitialDataFetch, searchParams]);

  // Create a debounced version for table refresh
  const debouncedFetchTableData = useCallback((currentFilters: CandidateFilterValues, currentPage: number, currentPageSize: number) => {
    // Clear any pending timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    // Set a new timeout - reduced for faster response
    fetchTimeoutRef.current = setTimeout(() => {
      const currentFetchTableData = fetchTableData;
      if (currentFetchTableData) {
        currentFetchTableData(currentFilters, currentPage, currentPageSize);
      } else {
        console.error('DEBOUNCE ERROR: fetchTableData is not defined');
      }
    }, 50); // Reduced debounce for faster response
  }, [fetchTableData]);

  // Add refs to track latest state and avoid stale closures
  const filtersRef = useRef(filters);
  const pageRef = useRef(page);
  const pageSizeRef = useRef(pageSize);
  const debouncedFetchTableDataRef = useRef(debouncedFetchTableData);
  
  // Update refs when state changes
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  
  useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);
  
  useEffect(() => {
    debouncedFetchTableDataRef.current = debouncedFetchTableData;
  }, [debouncedFetchTableData]);

  const handleAiSearch = async (aiQuery: string) => {
    if (!aiQuery.trim()) {
      toast("Please enter a search query for AI search.");
      return;
    }
    setIsAiSearching(true);
    setFetchError(null);
    setAiSearchReasoning(null);
    setAiMatchedCandidateIds(null);
    setAiRecordCount(0);
    setIsAiSearchActive(true);
    
    // Add timeout for AI search
    const timeoutId = setTimeout(() => {
      setIsAiSearching(false);
      setIsAiSearchActive(false);
      toast.error("AI search timed out. Please try again with a more specific query.");
    }, 30000); // 30 second timeout
    
    try {
      const controller = new AbortController();
      const timeoutId2 = setTimeout(() => controller.abort(), 25000); // 25 second timeout for fetch
      
      const response = await fetch('/api/ai/search-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId2);
      
      clearTimeout(timeoutId); // Clear timeout on successful response
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `AI search failed with status: ${response.status}`);
      }
      

      
      // If AI search returned results, fetch all candidates to ensure we have them available
      // But do it silently without affecting the page state
              if (result.matchedCandidateIds?.length > 0) {
          // Check if we already have all the matched candidates in our current list
          const existingIds = new Set(filteredCandidates.map(c => c.id));
          const missingCandidates = result.matchedCandidateIds.filter((id: string) => !existingIds.has(id));
        
        if (missingCandidates.length > 0) {
          // Only fetch if we're missing some candidates

          
                      // Fetch all candidates without filters to ensure AI search results are available
            // Use a separate state update to avoid triggering page refresh
            const allCandidatesResponse = await fetch('/api/candidates?limit=1000');
            if (allCandidatesResponse.ok) {
              const allCandidatesData = await allCandidatesResponse.json();
              if (allCandidatesData.data && Array.isArray(allCandidatesData.data)) {
                // Update candidates silently without affecting other state
                setFilteredCandidates(prevCandidates => {
                  // Merge new candidates with existing ones, avoiding duplicates
                  const existingIds = new Set(prevCandidates.map((c: Candidate) => c.id));
                  const newCandidates = (allCandidatesData.data as Candidate[]).filter((c: Candidate) => !existingIds.has(c.id));
                  const mergedCandidates = [...prevCandidates, ...newCandidates];
                

                
                return mergedCandidates;
              });
              
              // Wait a bit for the state to update before setting AI results
              setTimeout(() => {
                setAiMatchedCandidateIds(result.matchedCandidateIds || []);
                setAiSearchReasoning(result.aiReasoning || "AI search complete.");
                setAiRecordCount(result.recordCount || 0);
                toast.success(`Found ${result.recordCount || result.matchedCandidateIds.length} potential match(es).`);
              }, 100);
            } else {
              // If we couldn't fetch candidates, still show AI results but warn user
              setAiMatchedCandidateIds(result.matchedCandidateIds || []);
              setAiSearchReasoning(result.aiReasoning || "AI search complete.");
              setAiRecordCount(result.recordCount || 0);
              toast.success(`Found ${result.recordCount || result.matchedCandidateIds.length} potential match(es).`);
              toast.error("Some candidates may not be visible due to current filters.");
            }
                      } else {
              // If fetch failed, still show AI results but warn user
              setAiMatchedCandidateIds(result.matchedCandidateIds || []);
              setAiSearchReasoning(result.aiReasoning || "AI search complete.");
              setAiRecordCount(result.recordCount || 0);
              toast.success(`Found ${result.recordCount || result.matchedCandidateIds.length} potential match(es).`);
              toast.error("Could not load all candidates. Some results may not be visible.");
            }
        } else {
          setAiMatchedCandidateIds(result.matchedCandidateIds || []);
          setAiSearchReasoning(result.aiReasoning || "AI search complete.");
          setAiRecordCount(result.recordCount || 0);
          toast.success(`Found ${result.recordCount || result.matchedCandidateIds.length} potential match(es).`);
        }
      } else {
        setAiMatchedCandidateIds(result.matchedCandidateIds || []);
        setAiSearchReasoning(result.aiReasoning || "AI search complete.");
        setAiRecordCount(result.recordCount || 0);
        toast.success(`Found ${result.recordCount || 0} potential match(es).`);
      }
    } catch (error) {
      clearTimeout(timeoutId); // Clear timeout on error
      // console.error("AI Search Error:", error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error("AI search request was cancelled due to timeout. Please try again.");
      } else {
        toast.error((error as Error).message);
      }
      
      setAiMatchedCandidateIds([]);
      setAiRecordCount(0);
      setIsAiSearchActive(false);
    } finally {
      setIsAiSearching(false);
    }
  };

  useEffect(() => {
    // Set initial loading state - simplified logic
    if (sessionStatus === 'loading') {
      setIsLoading(true);
    } else if (sessionStatus === 'authenticated') {
      // If we have initial data, don't show loading
      if (safeInitialCandidates.length > 0) {
        setIsLoading(false);
      } else if (!initialFetchError && !serverAuthError && !serverPermissionError) {
        // Show loading if we don't have initial data and no errors
        setIsLoading(true);
      } else {
        setIsLoading(false);
      }
      
      // Safety check: if we have candidates, ensure loading is false
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
      // Not authenticated or has errors
      setIsLoading(false);
      setTableLoading(false); // Also clear table loading state
    }
  }, [sessionStatus, serverAuthError, serverPermissionError, fetchRecruiters, fetchSources, safeInitialCandidates.length, initialFetchError, filteredCandidates.length]);

  // Add a separate effect to clear loading when we have data
  useEffect(() => {
    if (filteredCandidates.length > 0) {
      setIsLoading(false);
      setTableLoading(false);
    }
  }, [filteredCandidates.length]);

  // Separate useEffect for initial data fetching
  useEffect(() => {
    // Only fetch candidates if:
    // 1. We're authenticated
    // 2. No server errors
    // 3. No initial data provided
    // 4. Haven't already fetched
    if (
      sessionStatus === 'authenticated' &&
      !serverAuthError &&
      !serverPermissionError &&
      safeInitialCandidates.length === 0 &&
      !hasInitialDataFetch
    ) {
      setHasInitialDataFetch(true);
      // Use a ref to avoid dependency issues
      const currentFetchTableData = fetchTableData;
      currentFetchTableData(filters, page, pageSize);
    } else if (safeInitialCandidates.length > 0) {
      // If we have initial data, set it immediately and clear loading
      setFilteredCandidates(safeInitialCandidates);
      // No need to set tableCandidates since we're using filteredCandidates
      setTotal(safeInitialCandidates.length);
      setIsLoading(false);
      setTableLoading(false);
      setHasInitialDataFetch(true); // Mark as fetched to prevent duplicate requests
    }
  }, [sessionStatus, serverAuthError, serverPermissionError, safeInitialCandidates.length, initialFetchError, hasInitialDataFetch, fetchTableData, filters, page, pageSize]);

  // Reset hasInitialDataFetch on client-side navigation (pathname change)
  useEffect(() => {
    setHasInitialDataFetch(false);
  }, [pathname]);

  // Handle initial loading state when there are no initial candidates
  useEffect(() => {
    // If we have initial candidates, we're not loading
    if (safeInitialCandidates.length > 0) {
      setIsLoading(false);
      setTableLoading(false);
    }
    // If we don't have initial candidates and we're authenticated, keep loading until data is fetched
    else if (sessionStatus === 'authenticated' && !serverAuthError && !serverPermissionError) {
      // Loading state will be cleared when fetchTableData completes
      setIsLoading(true);
      setTableLoading(true);
    }
  }, [safeInitialCandidates.length, sessionStatus, serverAuthError, serverPermissionError]);



  // Separate useEffect for URL parameter handling
  useEffect(() => {
    // Skip if we're currently clearing filters
    if (isClearingFilters) {
      return;
    }
    
    // Check for URL parameters using searchParams hook
    const recruiterIdParam = searchParams.get('recruiterId');
    const positionIdParam = searchParams.get('positionId');
    const statusParam = searchParams.get('status');
    const applicationDateStartParam = searchParams.get('applicationDateStart');
    const applicationDateEndParam = searchParams.get('applicationDateEnd');
    const nameParam = searchParams.get('name');
    const emailParam = searchParams.get('email');
    const phoneParam = searchParams.get('phone');
    const educationParam = searchParams.get('education');
    const minAppliedJobFitScoreParam = searchParams.get('minAppliedJobFitScore');
    const maxAppliedJobFitScoreParam = searchParams.get('maxAppliedJobFitScore');
    const advancedQueryParam = searchParams.get('query');

    // Build new filters from URL params
    let newFilters = { ...filters };
    let hasChanges = false;
    let advancedQuery = '';

    // Handle advanced query parameter first
    if (advancedQueryParam) {
      advancedQuery = decodeURIComponent(advancedQueryParam);
      hasChanges = true;
      // Don't process individual parameters when we have an advanced query
      // The advanced query will be parsed by the CandidateFilters component
    } else {
      // Handle individual parameters
      // Handle recruiter filter
      if (recruiterIdParam) {
        const recruiterIds = recruiterIdParam.split(',');
        if (!filters.selectedRecruiterIds || 
            JSON.stringify(filters.selectedRecruiterIds.sort()) !== JSON.stringify(recruiterIds.sort())) {
          newFilters.selectedRecruiterIds = recruiterIds;
          hasChanges = true;
        }
      }

      // Handle position filter
      if (positionIdParam) {
        const positionIds = positionIdParam.split(',');
        if (!filters.selectedPositionIds || 
            JSON.stringify(filters.selectedPositionIds.sort()) !== JSON.stringify(positionIds.sort())) {
          newFilters.selectedPositionIds = positionIds;
          hasChanges = true;
        }
      }

      // Handle status filter
      if (statusParam) {
        const statuses = statusParam.split(',');
        if (!filters.selectedStatuses || 
            JSON.stringify(filters.selectedStatuses.sort()) !== JSON.stringify(statuses.sort())) {
          newFilters.selectedStatuses = statuses;
          hasChanges = true;
        }
      }

      // Handle date range
      if (applicationDateStartParam || applicationDateEndParam) {
        const startDate = applicationDateStartParam ? new Date(applicationDateStartParam) : undefined;
        const endDate = applicationDateEndParam ? new Date(applicationDateEndParam) : undefined;
        
        if (filters.applicationDateStart !== startDate || filters.applicationDateEnd !== endDate) {
          newFilters.applicationDateStart = startDate;
          newFilters.applicationDateEnd = endDate;
          hasChanges = true;
        }
      }

      // Handle text filters
      if (nameParam && filters.name !== nameParam) {
        newFilters.name = nameParam;
        hasChanges = true;
      }
      if (emailParam && filters.email !== emailParam) {
        newFilters.email = emailParam;
        hasChanges = true;
      }
      if (phoneParam && filters.phone !== phoneParam) {
        newFilters.phone = phoneParam;
        hasChanges = true;
      }
      if (educationParam && filters.education !== educationParam) {
        newFilters.education = educationParam;
        hasChanges = true;
      }

      // Handle fit score range
      if (minAppliedJobFitScoreParam || maxAppliedJobFitScoreParam) {
        const minScore = minAppliedJobFitScoreParam ? parseInt(minAppliedJobFitScoreParam, 10) : 0;
        const maxScore = maxAppliedJobFitScoreParam ? parseInt(maxAppliedJobFitScoreParam, 10) : 100;
        
        if (filters.minAppliedJobFitScore !== minScore || filters.maxAppliedJobFitScore !== maxScore) {
          newFilters.minAppliedJobFitScore = minScore;
          newFilters.maxAppliedJobFitScore = maxScore;
          hasChanges = true;
        }
      }
    }

    // Only update if there are actual changes
    if (hasChanges) {
      // If we have an advanced query, don't update filters state directly
      // Let the CandidateFilters component handle the parsing
      if (!advancedQuery) {
        setFilters(newFilters);
      }
      
      // If we have an advanced query, store it for the filter component
      if (advancedQuery) {
        setAdvancedQueryFromUrl(advancedQuery);
      }
    }
  }, [searchParams, isClearingFilters]); // Removed filters from dependencies to prevent infinite loop

  // Separate useEffect to handle filter changes and fetch candidates
  useEffect(() => {
    // Skip if not authenticated or has errors
    if (sessionStatus !== 'authenticated' || serverAuthError || serverPermissionError) {
      return;
    }
    
    // Skip if we're currently clearing filters
    if (isClearingFilters) {
      return;
    }
    
    // Skip if we haven't completed initial fetch yet
    if (!hasInitialDataFetch) {
      return;
    }
    
    // Create a unique request ID to prevent infinite loops
    const requestId = JSON.stringify({ filters, page, pageSize, sortColumn, sortDirection });
    if (currentRequestRef.current === requestId) {
      return;
    }
    
    currentRequestRef.current = requestId;

    
    // Call fetchTableData directly instead of through dependency
    const fetchCandidates = async () => {
      const requestId = `${Date.now()}-${Math.random()}`;
      latestRequestIdRef.current = requestId;

      if (sessionStatus !== 'authenticated') {
        setTableLoading(false);
        return;
      }
      
      // Prevent multiple simultaneous requests
      if (isFetching) {
        return;
      }
      
      // Clear any existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      setIsFetching(true);
      setTableLoading(true);
      setTableError(null);
      
      // Add a timeout to prevent infinite loading
      const loadingTimeout = setTimeout(() => {
        setTableLoading(false);
        setIsLoading(false); // Also clear the main loading state
        setIsFetching(false);
        setTableError('Request timeout. The server may be starting up. Please wait a moment and refresh.');
      }, 30000);
      
      try {
        const query = new URLSearchParams();
        
        // Check if we have an advanced query from URL and pass it to the API
        const advancedQueryParam = searchParams.get('query');
        if (advancedQueryParam) {
          query.append('query', advancedQueryParam);
        }
        
        if (filters.name) {
          query.append('name', filters.name);
          if (filters.nameOperator) query.append('nameOperator', filters.nameOperator);
        }
        if (filters.email) {
          query.append('email', filters.email);
          if (filters.emailOperator) query.append('emailOperator', filters.emailOperator);
        }
        if (filters.phone) {
          query.append('phone', filters.phone);
          if (filters.phoneOperator) query.append('phoneOperator', filters.phoneOperator);
        }
        if (filters.selectedPositionIds && filters.selectedPositionIds.length > 0) query.append('positionId', filters.selectedPositionIds.join(','));
        if (filters.selectedStatuses && filters.selectedStatuses.length > 0) query.append('status', filters.selectedStatuses.join(','));
        if (filters.education) query.append('education', filters.education);
        if (filters.minAppliedJobFitScore !== undefined) query.append('minAppliedJobFitScore', String(filters.minAppliedJobFitScore));
        if (filters.maxAppliedJobFitScore !== undefined) query.append('maxAppliedJobFitScore', String(filters.maxAppliedJobFitScore));
        if (filters.minMatchingJobFitScore !== undefined) query.append('minMatchingJobFitScore', String(filters.minMatchingJobFitScore));
        if (filters.maxMatchingJobFitScore !== undefined) query.append('maxMatchingJobFitScore', String(filters.maxMatchingJobFitScore));
        if (filters.minExperienceYears !== undefined && (filters.minExperienceYears > 0 || filters.minExperienceYears === -1)) query.append('minExperienceYears', String(filters.minExperienceYears));
        if (filters.maxExperienceYears !== undefined && filters.maxExperienceYears < 50) query.append('maxExperienceYears', String(filters.maxExperienceYears));
        if (filters.applicationDateStart) {
          query.append('applicationDateStart', filters.applicationDateStart.toISOString());
        }
        if (filters.applicationDateEnd) {
          query.append('applicationDateEnd', filters.applicationDateEnd.toISOString());
        }
        if (filters.selectedRecruiterIds && filters.selectedRecruiterIds.length > 0) query.append('recruiterId', filters.selectedRecruiterIds.join(','));
        query.append('page', String(page));
        query.append('limit', String(pageSize));
        // Add sorting
        if (sortColumn) query.append('sortColumn', sortColumn);
        if (sortDirection) query.append('sortDirection', sortDirection);
        
        if (filters.location) {
          query.append('location', filters.location);
          if (filters.locationOperator) query.append('locationOperator', filters.locationOperator);
        }
        if (filters.skills && Array.isArray(filters.skills)) {
          if (filters.skills.length > 0) query.append('skills', filters.skills.join(','));
        } else if (typeof filters.skills === 'string' && filters.skills) {
          query.append('skills', filters.skills);
        }
        
        const apiUrl = `/api/candidates?${query.toString()}`;
        
    
        
        // Add timeout and retry logic
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // Reduced from 15 seconds to 8 seconds for faster response

        const response = await fetch(apiUrl, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch candidates: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check if this is still the latest request
        if (latestRequestIdRef.current !== requestId) {
          return;
        }
        
        if (data.data && Array.isArray(data.data)) {
          setFilteredCandidates(data.data);
          setTotal(data.pagination?.total || data.data.length);
          setTableError(null);
        } else {
          setFilteredCandidates([]);
          // No need to clear tableCandidates since we're using filteredCandidates
          setTotal(0);
          setTableError('Invalid data format received from server');
        }
      } catch (error) {
        if (latestRequestIdRef.current !== requestId) {
          return;
        }
        
        console.error('Error fetching candidates:', error);
        setTableError((error as Error).message || 'Failed to fetch candidates');
        setFilteredCandidates([]);
        setTotal(0);
      } finally {
        if (latestRequestIdRef.current !== requestId) {
          return;
        }
        
        clearTimeout(loadingTimeout);
        setTableLoading(false);
        setIsFetching(false);
        currentRequestRef.current = null;
      }
    };
    
    fetchCandidates();
  }, [filters, page, pageSize, sortColumn, sortDirection, sessionStatus, serverAuthError, serverPermissionError, isClearingFilters, hasInitialDataFetch, searchParams]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated' && !serverAuthError && !serverPermissionError) {
        return;
    }
  }, [sessionStatus, serverAuthError, serverPermissionError]);

  useEffect(() => { 
    setFilteredCandidates(safeInitialCandidates || []); 
    setAllCandidatesForCounts(safeInitialCandidates || []); 
    // No need to set tableCandidates since we're using filteredCandidates
    if (safeInitialCandidates.length > 0) {
      setTableLoading(false);
    }
  }, [safeInitialCandidates]);
  useEffect(() => { setAvailablePositions(safeInitialAvailablePositions || []); }, [safeInitialAvailablePositions]);
  useEffect(() => { setAvailableStages(safeInitialAvailableStages || []); }, [safeInitialAvailableStages]);

  // Fetch positions and stages on mount if not provided initially
  useEffect(() => {
    if (sessionStatus === 'authenticated' && safeInitialAvailablePositions.length === 0) {
      const fetchPositionsAndStages = async () => {
        try {
          const [posResponse, stagesResponse] = await Promise.all([
            fetch('/api/positions/all'),
            fetch('/api/recruitment-stages')
          ]);

          if (posResponse.ok) {
            const posData = await posResponse.json();
            // console.log('Positions fetched:', posData);
            // console.log('Positions data length:', posData.data?.length || 0);
            // console.log('First few positions:', posData.data?.slice(0, 3));
            setAvailablePositions(posData.data || []);
          } else {
            // console.error("Failed to fetch positions");
            // console.error("Response status:", posResponse.status);
            // console.error("Response status text:", posResponse.statusText);
            toast.error("Could not load the list of available positions.");
          }

          if (stagesResponse.ok) {
            const stagesData = await stagesResponse.json();
            setAvailableStages(Array.isArray(stagesData) ? stagesData : (stagesData.stages || []));
          } else {
            // console.error("Failed to fetch recruitment stages");
            toast.error("Could not load recruitment stages.");
          }
        } catch (error) {
          // console.error("Error fetching positions or stages:", error);
          toast.error("A network error occurred while fetching initial data.");
        }
      };
      fetchPositionsAndStages();
    }
  }, [sessionStatus, safeInitialAvailablePositions.length]);

  // Fetch full candidates dataset for accurate count calculations
  const fetchAllCandidatesForCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/candidates?limit=1000');
      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          setAllCandidatesForCounts(data.data);
        }
      }
    } catch (error) {
      // Silently fail - this is for counts only, not critical functionality
      console.warn('Failed to fetch all candidates for counts:', error);
    }
  }, []);

  // Fetch full candidates on mount and when session changes
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchAllCandidatesForCounts();
    }
  }, [sessionStatus, fetchAllCandidatesForCounts]);

  useEffect(() => {
    // Show error as toast popup if present
    if (initialFetchError) {
      toast.error(initialFetchError);
    }
  }, [initialFetchError]);

  // Add a ref to track the debounce timeout
  const filterChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAppliedFiltersRef = useRef<string>('');
  const optimisticUpdateRef = useRef<boolean>(false);

  const handleFilterChange = (newFilters: CandidateFilterValues) => {
    // Skip if we're currently clearing filters
    if (isClearingFilters) {
      return;
    }

    // Clear any existing timeout
    if (filterChangeTimeoutRef.current) {
      clearTimeout(filterChangeTimeoutRef.current);
      filterChangeTimeoutRef.current = null;
    }
    
    const combinedFilters = { ...filters, ...newFilters, aiSearchQuery: undefined };
    
    // Check if filters have actually changed to prevent unnecessary updates
    const currentFiltersString = JSON.stringify(filters);
    const newFiltersString = JSON.stringify(combinedFilters);
    if (currentFiltersString === newFiltersString) {
      return;
    }



    // Always clear AI search state if filters are changed
    if (isAiSearchActive) {
      setAiMatchedCandidateIds(null);
      setAiSearchReasoning(null);
      setAiRecordCount(0);
      setIsAiSearchActive(false);
    }
    
    // Clear horizontal fit score filters when other filters change to avoid conflicts
    setHorizontalSelectedFitScoreGrades(new Set());
    setHorizontalSelectedMatchingFitScoreGrades(new Set());
    
    // Immediate UI update for better responsiveness
    setPage(1);
    setFilters(combinedFilters);
    
    // Show loading state immediately
    setTableLoading(true);
    optimisticUpdateRef.current = true;
    
    // Apply filters immediately for faster response
    
    fetchTableData(combinedFilters, 1, pageSize);
  };

  // Horizontal fit score filter handlers
  const handleHorizontalFitScoreGradeToggle = useCallback((grade: string) => {
    
    setHorizontalSelectedFitScoreGrades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(grade)) {
        newSet.delete(grade);
       
      } else {
        newSet.add(grade);
        
      }
      
      return newSet;
    });
  }, []);

  const handleHorizontalMatchingFitScoreGradeToggle = useCallback((grade: string) => {
    
    setHorizontalSelectedMatchingFitScoreGrades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(grade)) {
        newSet.delete(grade);
        
      } else {
        newSet.add(grade);
        
      }
     
      return newSet;
    });
  }, []);

  // Clear all horizontal fit score filters
  const clearAllHorizontalFitScoreFilters = useCallback(() => {
    
    setHorizontalSelectedFitScoreGrades(new Set());
    setHorizontalSelectedMatchingFitScoreGrades(new Set());
  }, []);

  // Apply horizontal fit score filters
  const applyHorizontalFitScoreFilters = useCallback(() => {
    const scoreRanges = getScoreRangesForChart();
    
    let minAppliedJobFitScore: number | undefined = undefined;
    let maxAppliedJobFitScore: number | undefined = undefined;
    let minMatchingJobFitScore: number | undefined = undefined;
    let maxMatchingJobFitScore: number | undefined = undefined;

    // Handle applied job fit score grades
    if (horizontalSelectedFitScoreGrades.size > 0) {
      const selectedRanges = scoreRanges.filter(range => horizontalSelectedFitScoreGrades.has(range.letter));
      const hasNoScore = horizontalSelectedFitScoreGrades.has('no-score');
      
   
      
      if (selectedRanges.length > 0 && hasNoScore) {
        // Both regular grades and no-score selected - this is a complex case
        // For now, we'll prioritize regular grades and ignore no-score
        // TODO: Implement proper OR logic for this case
        const minScore = Math.min(...selectedRanges.map(r => r.min));
        const maxScore = Math.max(...selectedRanges.map(r => r.max));
        minAppliedJobFitScore = minScore;
        maxAppliedJobFitScore = maxScore;
        
      } else if (selectedRanges.length > 0) {
        // Only regular grades selected
        const minScore = Math.min(...selectedRanges.map(r => r.min));
        const maxScore = Math.max(...selectedRanges.map(r => r.max));
        minAppliedJobFitScore = minScore;
        maxAppliedJobFitScore = maxScore;
        
      } else if (hasNoScore) {
        // Only no-score selected
        minAppliedJobFitScore = -1;
        maxAppliedJobFitScore = -1; // Set both to -1 for "no-score" case
        
      }
    }

    // Handle matching job fit score grades
    if (horizontalSelectedMatchingFitScoreGrades.size > 0) {
      const selectedRanges = scoreRanges.filter(range => horizontalSelectedMatchingFitScoreGrades.has(range.letter));
      const hasNoScore = horizontalSelectedMatchingFitScoreGrades.has('no-score');
      
  
      
      if (selectedRanges.length > 0 && hasNoScore) {
        // Both regular grades and no-score selected - this is a complex case
        const minScore = Math.min(...selectedRanges.map(r => r.min));
        const maxScore = Math.max(...selectedRanges.map(r => r.max));
        minMatchingJobFitScore = minScore;
        maxMatchingJobFitScore = maxScore;
        // console.log('🔍 CLIENT DEBUG: Both regular grades and no-score selected for matching job fit score. Using regular grades only.');
      } else if (selectedRanges.length > 0) {
        // Only regular grades selected
        const minScore = Math.min(...selectedRanges.map(r => r.min));
        const maxScore = Math.max(...selectedRanges.map(r => r.max));
        minMatchingJobFitScore = minScore;
        maxMatchingJobFitScore = maxScore;
        // console.log('🔍 CLIENT DEBUG: Only regular grades selected for matching job fit score:', { minScore, maxScore });
      } else if (hasNoScore) {
        // Only no-score selected
        minMatchingJobFitScore = -1;
        maxMatchingJobFitScore = -1; // Set both to -1 for "no-score" case
        // console.log('🔍 CLIENT DEBUG: Only no-score selected for matching job fit score');
      }
    }

    const newFilters = {
      ...filters,
      minAppliedJobFitScore,
      maxAppliedJobFitScore,
      minMatchingJobFitScore,
      maxMatchingJobFitScore,
    };

 

    return newFilters;
  }, [horizontalSelectedFitScoreGrades, horizontalSelectedMatchingFitScoreGrades, filters]);

  // Apply horizontal filters when selections change
  useEffect(() => {
 
    
    // Only apply horizontal filters if there are selections
    if (horizontalSelectedFitScoreGrades.size > 0 || horizontalSelectedMatchingFitScoreGrades.size > 0) {
      const newFilters = applyHorizontalFitScoreFilters();
      // console.log('🔍 CLIENT DEBUG: Applying new filters:', newFilters);
      setFilters(newFilters);
      setPage(1);
      // console.log('🔍 CLIENT DEBUG: Calling debouncedFetchTableData with new filters');
      debouncedFetchTableData(newFilters, 1, pageSize);
    } else {
      // If no horizontal selections, clear fit score filters from main filters
      const newFilters = {
        ...filters,
        minAppliedJobFitScore: undefined,
        maxAppliedJobFitScore: undefined,
        minMatchingJobFitScore: undefined,
        maxMatchingJobFitScore: undefined,
      };
      // console.log('🔍 CLIENT DEBUG: Clearing fit score filters:', newFilters);
      setFilters(newFilters);
      debouncedFetchTableData(newFilters, page, pageSize);
    }
  }, [horizontalSelectedFitScoreGrades, horizontalSelectedMatchingFitScoreGrades, applyHorizontalFitScoreFilters, filters, debouncedFetchTableData, page, pageSize]);

  // Debug fit score filter rendering
  useEffect(() => {
 
  }, [candidateSettings.showHorizontalFitScoreFilters, candidateSettings.fitScoreType, horizontalSelectedFitScoreGrades, horizontalSelectedMatchingFitScoreGrades]);

  // Debug filteredCandidates state changes
  useEffect(() => {

  }, [filteredCandidates]);

  const handleClearAllFilters = useCallback(() => {
    setIsClearingFilters(true);
    
    // Clear AI search state
    setAiMatchedCandidateIds(null);
    setAiSearchReasoning(null);
    setAiRecordCount(0);
    setIsAiSearchActive(false);
    
    // Clear horizontal fit score filters
    setHorizontalSelectedFitScoreGrades(new Set());
    setHorizontalSelectedMatchingFitScoreGrades(new Set());
    
    // Reset filters to default
    const defaultFilters: CandidateFilterValues = {
      name: '',
      email: '',
      phone: '',
      education: '',
      skills: '',
      location: '',
      cvLanguage: '',
      jobSuitableCareer: '',
      jobSuitableLevel: '',
      jobSuitablePosition: '',
      minExperienceYears: undefined,
      maxExperienceYears: undefined,
      selectedPositionIds: [],
      selectedStatuses: [],
      selectedRecruiterIds: [],
      minAppliedJobFitScore: undefined,
      maxAppliedJobFitScore: undefined,
      minMatchingJobFitScore: undefined,
      maxMatchingJobFitScore: undefined,
      applicationDateStart: undefined,
      applicationDateEnd: undefined,
      nameOperator: 'contains',
      emailOperator: 'contains',
      phoneOperator: 'contains',
      locationOperator: 'contains',
      aiSearchQuery: undefined,
    };
    
    setFilters(defaultFilters);
    setPage(1);
    
    // Fetch candidates with default filters to restore original state
    // Use a small delay to ensure state updates are processed
    setTimeout(() => {
      fetchTableData(defaultFilters, 1, pageSize);
      setIsClearingFilters(false);
    }, 100);
  }, [fetchTableData, pageSize]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (filterChangeTimeoutRef.current) {
        clearTimeout(filterChangeTimeoutRef.current);
      }
    };
  }, []);



  const fetchCandidateById = useCallback(async (candidateId: string): Promise<Candidate | null> => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // console.error(`Failed to fetch candidate ${candidateId}: ${errorData.message || response.statusText}`);
        return null;
      }
      return await response.json();
    } catch (error) {
      // console.error(`Error fetching candidate ${candidateId}:`, error);
      return null;
    }
  }, []);

  const refreshCandidateInList = useCallback(async (candidateId: string) => {
    if (aiMatchedCandidateIds !== null) {
        toast('AI Search Active: Please clear AI search or re-run it to see specific updates.');
        return;
    }

        const updatedCandidate = await fetchCandidateById(candidateId);
    if (updatedCandidate) {
      setFilteredCandidates(prev => prev.map(c => c.id === candidateId ? updatedCandidate : c));
      setAllCandidatesForCounts(prev => prev.map(c => c.id === candidateId ? updatedCandidate : c));
    } else {
      toast.error('Could not refresh data for candidate. Attempting full list refresh.');
      const currentFetchTableData = fetchTableData;
      currentFetchTableData(filters, page, pageSize);
    }
  }, [fetchCandidateById, toast, filters, page, pageSize, aiMatchedCandidateIds]);

  // Optimistic update helper function
  const applyOptimisticUpdate = useCallback((candidateId: string, updates: Partial<Candidate>) => {
    setFilteredCandidates(prev => prev.map(candidate => 
      candidate.id === candidateId 
        ? { ...candidate, ...updates, updatedAt: new Date().toISOString() }
        : candidate
    ));
    setAllCandidatesForCounts(prev => prev.map(candidate => 
      candidate.id === candidateId 
        ? { ...candidate, ...updates, updatedAt: new Date().toISOString() }
        : candidate
    ));
  }, []);

  // Revert optimistic update helper function
  const revertOptimisticUpdate = useCallback((candidateId: string, originalCandidate: Candidate) => {
    setFilteredCandidates(prev => prev.map(candidate => 
      candidate.id === candidateId ? originalCandidate : candidate
    ));
    setAllCandidatesForCounts(prev => prev.map(candidate => 
      candidate.id === candidateId ? originalCandidate : candidate
    ));
  }, []);

  const updateCandidateStatus = useCallback(async (candidateId: string, newStatus: CandidateStatus, notes?: string, suppressToast?: boolean) => {
    if (aiMatchedCandidateIds !== null) {
      toast('AI Search Active: Please clear AI search to perform updates.');
      return;
    }

    // Find the original candidate for potential rollback
    const originalCandidate = filteredCandidates.find(c => c.id === candidateId);
    if (!originalCandidate) {
      toast.error('Candidate not found');
      return;
    }

    // Apply optimistic update immediately
    applyOptimisticUpdate(candidateId, { status: newStatus });
    
    if (!suppressToast) {
      toast.loading('Updating candidate status...', { id: candidateId });
    }

    try {
      // Use the utility function instead of direct API call
      const response = await fetch(`/api/candidates/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_status',
          candidateIds: [candidateId],
          newStatus: newStatus,
          transitionNotes: notes
        }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        revertOptimisticUpdate(candidateId, originalCandidate);
        
        const errorData = await response.json().catch(() => ({ message: 'Failed to update status' }));
        const errorMessage = errorData.message || `Failed to update status: ${response.statusText}`;
        
        if (!suppressToast) {
          toast.error(errorMessage, { id: candidateId });
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Handle headcount validation results
      if (result.rejectedCandidates && result.rejectedCandidates.length > 0) {
        const rejectedCandidate = result.rejectedCandidates.find((c: any) => c.candidateId === candidateId);
        if (rejectedCandidate) {
          if (!suppressToast) {
            toast.error(rejectedCandidate.message, { id: candidateId });
          }
          throw new Error(rejectedCandidate.message);
        }
      }

      // Show success messages for headcount assignments
      if (result.headcountAssignments && result.headcountAssignments.length > 0) {
        const assignment = result.headcountAssignments.find((a: any) => a.candidateId === candidateId);
        if (assignment && assignment.success) {
          if (!suppressToast) {
            toast.success(`Candidate automatically assigned to headcount`, { id: candidateId });
          }
        }
      }

      // Fetch the updated candidate to ensure we have the latest data
      const candidateResponse = await fetch(`/api/candidates/${candidateId}`);
      if (!candidateResponse.ok) {
        throw new Error('Failed to fetch updated candidate data');
      }
      const updatedCandidate = await candidateResponse.json();
      
      // Update with server response (this confirms the optimistic update)
      setFilteredCandidates(prev => prev.map(c => 
        c.id === candidateId ? {
          ...c,
          ...updatedCandidate,
          position: updatedCandidate.position || c.position,
          recruiter: updatedCandidate.recruiter || c.recruiter
        } : c
      ));
      setAllCandidatesForCounts(prev => prev.map(c => 
        c.id === candidateId ? {
          ...c,
          ...updatedCandidate,
          position: updatedCandidate.position || c.position,
          recruiter: updatedCandidate.recruiter || c.recruiter
        } : c
      ));

      if (!suppressToast) {
        toast.success(`Status updated to ${newStatus}`, { id: candidateId });
      }
    } catch (error) {
      console.error('Error updating candidate status:', error);
      // Optimistic update already reverted above
      if (!suppressToast) {
        toast.error((error as Error).message, { id: candidateId });
      }
    }
      }, [filteredCandidates, aiMatchedCandidateIds, toast, applyOptimisticUpdate, revertOptimisticUpdate]);

  const handleDeleteCandidate = async (candidateId: string) => {
     try {
      const response = await fetch(`/api/candidates/${candidateId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred" }));
        throw new Error(errorData.message || `Failed to delete candidate: ${response.statusText || `Status: ${response.status}`}`);
      }
      setFilteredCandidates(prev => prev.filter(c => c.id !== candidateId));
      setAllCandidatesForCounts(prev => prev.filter(c => c.id !== candidateId));
      setSelectedCandidateIds(prev => { const newSet = new Set(prev); newSet.delete(candidateId); return newSet; });
      toast.success(`Candidate successfully deleted.`);
    } catch (error) {
      // console.error("Error deleting candidate:", error);
      toast.error((error as Error).message);
      throw error; // Re-throw for table to handle
    }
  };

  const handleAddCandidateSubmit = async (formData: AddCandidateFormValues) => {
    setIsLoading(true);
    try {
      // v1 API expects this structure:
      // {
      //   candidate_info: { personal_info, contact_info, cv_language, skills, job_suitable, status, ... },
      //   educationData: [...],
      //   experienceData: [...],
      //   ...
      // }
      // Create job_applied object if positionId is provided
      const job_applied = formData.positionId ? {
        jobId: formData.positionId,
        fitScore: formData.fitScore || 0,
        justification: []
      } : formData.job_applied;

      const candidate_info = {
        personal_info: formData.personal_info,
        contact_info: formData.contact_info,
        cv_language: formData.cv_language,
        skills: formData.skills?.map(s => ({
          segment_skill: s.segment_skill,
          skill: s.skill_string?.split(',').map(sk => sk.trim()).filter(sk => sk) || []
        })),
        job_suitable: formData.job_suitable,
        status: formData.status,
        fitScore: formData.fitScore,
        job_matches: formData.job_matches,
        job_applied: job_applied,
        applicationDate: formData.applicationDate,
      };
      const apiPayload = {
        candidate_info,
        job_applied: job_applied, // Also include at top level for the API
        educationData: formData.education || [],
        experienceData: formData.experience?.map(exp => ({
          ...exp,
          positionLevel: exp.positionLevel === "___NOT_SPECIFIED___" || exp.positionLevel === null ? undefined : exp.positionLevel
        })) || [],
      };
      const response = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred" }));
        throw new Error(errorData.message || `Failed to add candidate: ${response.statusText || `Status: ${response.status}`}`);
      }
      const { candidate } = await response.json();
      // Instead of manually adding the candidate, refetch the list from the backend
      await fetchTableData(filters, page, pageSize);
      // Also refresh the full candidates dataset for accurate counts
      await fetchAllCandidatesForCounts();
      setIsAddModalOpen(false);
      toast.success(`${candidate.name} has been successfully added.`);
      // Optionally force a router refresh for full sync:
      // router.refresh();
    } catch (error) {
        // console.error("Error adding candidate:", error);
        toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutomatedProcessingStart = () => {
    toast('Processing Started: Resume sent for automated processing. Candidate list will refresh if successful.');
    setTimeout(() => { fetchTableData(filters, page, pageSize); }, 15000); // Optimistic refresh after 15s
  };

  const handleExportToExcel = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      query.append('format', 'excel');
      if (filters.name) query.append('name', filters.name);
      if (filters.email) query.append('email', filters.email);
      if (filters.phone) query.append('phone', filters.phone);
      if (filters.selectedPositionIds && filters.selectedPositionIds.length > 0) query.append('positionId', filters.selectedPositionIds.join(','));
      if (filters.selectedStatuses && filters.selectedStatuses.length > 0) query.append('status', filters.selectedStatuses.join(','));
      if (filters.education) query.append('education', filters.education);
      if (filters.minAppliedJobFitScore !== undefined) query.append('minAppliedJobFitScore', String(filters.minAppliedJobFitScore));
      if (filters.maxAppliedJobFitScore !== undefined) query.append('maxAppliedJobFitScore', String(filters.maxAppliedJobFitScore));
      if (filters.applicationDateStart) query.append('applicationDateStart', filters.applicationDateStart.toISOString());
      if (filters.applicationDateEnd) query.append('applicationDateEnd', filters.applicationDateEnd.toISOString());
      if (filters.selectedRecruiterIds && filters.selectedRecruiterIds.length > 0) query.append('recruiterId', filters.selectedRecruiterIds.join(','));

      const response = await fetch(`/api/candidates/export?${query.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Error exporting candidate data." }));
        throw new Error(errorData.message);
      }
      const blob = await response.blob();
      const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'candidates_export.xlsx';
      downloadFile(blob, filename);

      toast.success('Candidates exported as Excel.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally { setIsLoading(false); }
  };



  const handleOpenPositionDrawer = (position: Position) => {
    setSelectedPositionForEdit(position);
    setIsPositionDrawerOpen(true);
  };

  const handlePositionEdited = async () => {
    toast.success('Position details have been saved.');
    setIsPositionDrawerOpen(false);
    if (sessionStatus === 'authenticated') {
        const posResponse = await fetch('/api/positions/all'); // Re-fetch all positions
        if (posResponse.ok) {
          const posData = await posResponse.json();
          setAvailablePositions(posData.data || []);
        }
        fetchTableData(filters, page, pageSize); // Refresh candidates list
        // Also refresh the full candidates dataset for accurate counts
        fetchAllCandidatesForCounts();
    }
  };

  const handleToggleSelectCandidate = (candidateId: string) => {
    setSelectedCandidateIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }
      return newSet;
    });
  };

  const displayedCandidates = useMemo(() => {
    // Ensure filteredCandidates is an array before calling filter
    const candidates = Array.isArray(filteredCandidates) ? filteredCandidates : [];
    // Filter out invalid candidates
    const validCandidates = candidates.filter(c => c && c.id && c.name);
    return aiMatchedCandidateIds !== null
      ? validCandidates.filter(c => aiMatchedCandidateIds.includes(c.id))
      : validCandidates;
  }, [filteredCandidates, aiMatchedCandidateIds]);


  const handleToggleSelectAllCandidates = () => {
    if (selectedCandidateIds.size === displayedCandidates.length && displayedCandidates.length > 0) {
      setSelectedCandidateIds(new Set());
    } else {
      setSelectedCandidateIds(new Set(displayedCandidates.map(c => c.id)));
    }
  };

  const isAllCandidatesSelected = useMemo(() => {
    if (displayedCandidates.length === 0) return false;
    return selectedCandidateIds.size === displayedCandidates.length;
  }, [selectedCandidateIds, displayedCandidates]);

  const handleBulkAction = (action: 'delete' | 'change_status' | 'assign_recruiter') => {
    setBulkActionType(action);
    if (action === 'change_status') {
      setBulkNewStatus(availableStages.find(s => s.name === 'Applied')?.name || availableStages[0]?.name || '');
    } else if (action === 'assign_recruiter') {
      setBulkNewRecruiterId(availableRecruiters[0]?.id || null);
    }
    setBulkTransitionNotes('');
    setIsBulkActionConfirmOpen(true);
  };

  const executeBulkAction = async () => {
    if (!bulkActionType || selectedCandidateIds.size === 0) return;
    setIsLoading(true);
    try {
      const payload: any = {
        action: bulkActionType,
        candidateIds: Array.from(selectedCandidateIds),
      };
      if (bulkActionType === 'change_status') {
        payload.newStatus = bulkNewStatus;
        payload.transitionNotes = bulkTransitionNotes;
      } else if (bulkActionType === 'assign_recruiter') {
        payload.newRecruiterId = bulkNewRecruiterId;
      }

      const response = await fetch('/api/candidates/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Bulk action failed');

      toast.success(`${result.successCount} candidate(s) affected. ${result.failCount > 0 ? `${result.failCount} failed.` : ''}`);
      setSelectedCandidateIds(new Set()); // Clear selection
      fetchTableData(filters, page, pageSize); // Refresh list
      // Also refresh the full candidates dataset for accurate counts
      fetchAllCandidatesForCounts();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
      setIsBulkActionConfirmOpen(false);
      setBulkActionType(null);
    }
  };

  // Add handler for assigning recruiter inline
  const handleAssignRecruiter = async (candidateId: string, recruiterId: string | null) => {
    // Find previous recruiter for revert on error
    const prevCandidate = filteredCandidates.find(c => c.id === candidateId);
    const prevRecruiter = prevCandidate?.recruiter || null;
    // Optimistically update recruiter in UI
    setFilteredCandidates(prev =>
      prev.map(c =>
        c.id === candidateId
          ? {
              ...c,
              recruiter: recruiterId
                ? (() => {
                    const found = availableRecruiters.find(r => r.id === recruiterId);
                    return found
                      ? { id: found.id, name: found.name, email: found.email || '' }
                      : { id: recruiterId, name: 'Unknown', email: '' };
                  })()
                : null,
            }
          : c
      )
    );
    try {
      // Find the candidate's current status
      const candidate = filteredCandidates.find(c => c.id === candidateId);
      const status = candidate?.status || 'Applied';
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recruiterId, status }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to assign recruiter' }));
        throw new Error(errorData.message || `Failed to assign recruiter: ${response.status} ${response.statusText}`);
      }
      await refreshCandidateInList(candidateId);
      toast.success('Recruiter updated.');
    } catch (error) {
      // Revert recruiter in UI
      setFilteredCandidates(prev =>
        prev.map(c =>
          c.id === candidateId
            ? { ...c, recruiter: prevRecruiter }
            : c
        )
      );
      console.error('Error assigning recruiter:', error);
      toast.error((error as Error).message || 'Failed to assign recruiter');
    }
  };

  // Add handler for assigning source inline
  const handleAssignSource = async (candidateId: string, sourceId: string | null, subSource?: string | null) => {
    // Find previous source for revert on error
    const prevCandidate = filteredCandidates.find(c => c.id === candidateId);
    const prevSource = prevCandidate?.source || null;
    const prevSubSource = prevCandidate?.subSource || null;
    
    // Optimistically update source in UI
    setFilteredCandidates(prev =>
      prev.map(c =>
        c.id === candidateId
          ? {
              ...c,
              source: sourceId
                ? (() => {
                    const found = availableSources.find(s => s.id === sourceId);
                    return found
                      ? { id: found.id, name: found.name, description: found.description, logo: found.logo, allowSubSource: found.allowSubSource, sortOrder: found.sortOrder, isActive: found.isActive }
                      : { id: sourceId, name: 'Unknown', description: null, logo: undefined, allowSubSource: false, sortOrder: 0, isActive: true };
                  })()
                : null,
              subSource: subSource || null,
            }
          : c
      )
    );
    try {
      // Find the candidate's current status
      const candidate = filteredCandidates.find(c => c.id === candidateId);
      const status = candidate?.status || 'Applied';
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, subSource, status }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to assign source' }));
        throw new Error(errorData.message || `Failed to assign source: ${response.status} ${response.statusText}`);
      }
      await refreshCandidateInList(candidateId);
      toast.success('Source updated.');
    } catch (error) {
      // Revert source in UI
      setFilteredCandidates(prev =>
        prev.map(c =>
          c.id === candidateId
            ? { ...c, source: prevSource, subSource: prevSubSource }
            : c
        )
      );
      console.error('Error assigning source:', error);
      toast.error((error as Error).message || 'Failed to assign source');
    }
  };

  useEffect(() => {
    const handleRefresh = () => {
      debouncedFetchTableData(filters, page, pageSize);
    };
    window.addEventListener('refreshCandidateQueue', handleRefresh);
    return () => {
      window.removeEventListener('refreshCandidateQueue', handleRefresh);
    };
  }, [filters, page, pageSize, debouncedFetchTableData]);

  // Refresh data when page becomes visible (e.g., when navigating back from candidate detail)
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;
    let focusTimeout: NodeJS.Timeout;
    let lastRefreshTime = 0;
    const MIN_REFRESH_INTERVAL = 2000; // Minimum 2 seconds between refreshes
    
    const handleVisibilityChange = () => {
      if (!document.hidden && sessionStatus === 'authenticated' && !isLoading && !isAiSearchActive) {
        const now = Date.now();
        if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
          return; // Skip refresh if too soon
        }
        
        // Add a small delay to prevent rapid refreshes when modals open/close - reduced for better responsiveness
        clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(() => {
          // console.log('Page became visible, refreshing candidate data...');
          lastRefreshTime = Date.now();
          debouncedFetchTableData(filters, page, pageSize);
        }, 300); // Reduced delay from 1000ms to 300ms
      }
    };

    const handleFocus = () => {
      if (sessionStatus === 'authenticated' && !isLoading && !isAiSearchActive) {
        const now = Date.now();
        if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
          return; // Skip refresh if too soon
        }
        
        // Add a small delay to prevent rapid refreshes when modals open/close - reduced for better responsiveness
        clearTimeout(focusTimeout);
        focusTimeout = setTimeout(() => {
          // console.log('Window gained focus, refreshing candidate data...');
          lastRefreshTime = Date.now();
          debouncedFetchTableData(filters, page, pageSize);
        }, 300); // Reduced delay from 1000ms to 300ms
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearTimeout(visibilityTimeout);
      clearTimeout(focusTimeout);
    };
  }, [sessionStatus, isLoading, isAiSearchActive, filters, page, pageSize]);

  // Note: Removed automatic recruiter filter setting to allow recruiters to freely select any recruiter filter

  // Ensure ALL useMemo hooks are called before any return
  const mappedCandidates = useMemo(() => {
    // Defensive check to prevent temporal dead zone issues
    if (!Array.isArray(filteredCandidates) ) {
      return [];
    }
    
    let candidates = filteredCandidates.map((candidate: Candidate) => {
      // Ensure candidate is valid object
      if (!candidate || typeof candidate !== 'object') {
        return candidate;
      }
      
      if ((!candidate.position || !candidate.position.title) && 
          candidate.positionId && 
          Array.isArray(availablePositions) && 
          availablePositions.length > 0) {
        const foundPosition = availablePositions.find(pos => pos && pos.id === candidate.positionId);
        if (foundPosition) {
          return { ...candidate, position: foundPosition };
        }
      }
      return candidate;
    });
    
    // Filter by AI search if active - with safer checks
    if (isAiSearchActive && Array.isArray(aiMatchedCandidateIds)) {
      if (aiMatchedCandidateIds.length > 0) {
        // Create a Set for faster lookup
        const aiMatchedIdsSet = new Set(aiMatchedCandidateIds);
        candidates = candidates.filter(c => c && c.id && aiMatchedIdsSet.has(c.id));
      } else {
        // If AI search is active and there are no matches, show empty list
        candidates = [];
      }
    }
    
    return candidates;
  }, [filteredCandidates, availablePositions, isAiSearchActive, aiMatchedCandidateIds]);

  // Paginate candidates for display
  const paginatedCandidates = useMemo(() => {
    // Defensive check to prevent temporal dead zone issues
    if (!Array.isArray(mappedCandidates)) {
      return [];
    }
    
    // For AI search, we need client-side pagination since the API doesn't handle AI search pagination
    if (isAiSearchActive && Array.isArray(aiMatchedCandidateIds)) {
      const safePageSize = pageSize > 0 ? pageSize : 20;
      const safePage = page > 0 ? page : 1;
      const start = (safePage - 1) * safePageSize;
      const end = start + safePageSize;
      const paginated = mappedCandidates.slice(start, end);
      return paginated;
    }
    
    // For regular searches, the API already returns paginated data, so just return the mapped candidates
    // But we need to ensure we're not returning an empty array when there are candidates
    if (mappedCandidates.length === 0 && filteredCandidates.length > 0) {
      // If mappedCandidates is empty but filteredCandidates has data, there might be a filtering issue
      // Return the first page of filteredCandidates as a fallback
      const safePageSize = pageSize > 0 ? pageSize : 20;
      const safePage = page > 0 ? page : 1;
      const start = (safePage - 1) * safePageSize;
      const end = start + safePageSize;
      return filteredCandidates.slice(start, end);
    }
    
    return mappedCandidates;
  }, [isAiSearchActive, aiMatchedCandidateIds, mappedCandidates, filteredCandidates, page, pageSize]);

  // For row numbering in table
  const baseIndex = useMemo(() => {
    const safePageSize = pageSize > 0 ? pageSize : 20;
    const safePage = page > 0 ? page : 1;
    return (safePage - 1) * safePageSize;
  }, [page, pageSize]);

  // Calculate candidate counts by stage for the pipeline stage filter
  // Use allCandidatesForCounts to show total counts regardless of current filters
  const candidateCountsByStage = useMemo(() => {
    const stageCounts: { [stageName: string]: number } = {};
    
    allCandidatesForCounts.forEach((candidate: Candidate) => {
      const status = candidate.status;
      stageCounts[status] = (stageCounts[status] || 0) + 1;
    });
    
    return stageCounts;
  }, [allCandidatesForCounts]);

  // Sort state variables have been moved to the top with other state declarations to prevent temporal dead zone issues

  const handleSort = (column: string | null, direction?: 'asc' | 'desc' | null) => {
    if (!column) return;
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(direction ?? 'asc');
    }
  };

  // Server-side sorting is handled by the API, so we don't need client-side sorting
  // The candidates come pre-sorted from the server based on sortColumn and sortDirection
  const sortedCandidates = useMemo(() => {
    return paginatedCandidates;
  }, [paginatedCandidates]);

  // ALL EARLY RETURNS MOVED TO AFTER ALL HOOKS
  // Centralized error UI for auth/permission
  if (authError || sessionStatus === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Authentication Error</h2>
        <p className="text-muted-foreground mb-4 max-w-md">You need to be signed in to view candidates.</p>
        <Button onClick={() => signIn(undefined, { callbackUrl: pathname })}>Sign In</Button>
      </div>
    );
  }
  if (permissionError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Permission Denied</h2>
        <p className="text-muted-foreground mb-4 max-w-md">You do not have permission to view candidates. Please contact your administrator if you believe this is an error.</p>
      </div>
    );
  }
  // Only show full-screen loader on initial load, not during filter updates
  if (isLoading && !hasInitialDataFetch) {
    return ( <div className="flex h-screen w-screen items-center justify-center bg-background fixed inset-0 z-50"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div> );
  }
  if (fetchError && !isLoading) {
    const isMissingTableError = fetchError.toLowerCase().includes("relation") && fetchError.toLowerCase().includes("does not exist");
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Error Loading Candidates</h2>
        <p className="text-muted-foreground mb-4 max-w-md">{fetchError}</p>
        {isMissingTableError && ( 
          <div className="mb-6 p-4 border border-destructive bg-destructive/10 rounded-md text-sm"> 
            <p className="font-semibold">It looks like a required database table (e.g., &quot;Candidate&quot;, &quot;Position&quot;, &quot;User&quot;, &quot;RecruitmentStage&quot;) is missing or not accessible.</p> 
            <p className="mt-1">This usually means the database initialization script (`pg-init-scripts/init-db.sql`) did not run correctly when the PostgreSQL Docker container started.</p> 
            <p className="mt-2">Please refer to the troubleshooting steps in the `README.md` for guidance on how to resolve this, typically involving a clean Docker volume reset.</p> 
          </div> 
        )}
        <Button onClick={() => fetchTableData(filters, page, pageSize)} className="btn-primary-gradient">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="flex h-full relative">
      {/* Filter Sidebar */}
      {candidateSettings.showFilters && (
        <aside ref={sidebarFilterRef} className="w-80 min-w-[250px] border-r bg-card dark:bg-background transition-all flex flex-col h-screen responsive-filter-sidebar">
          <div className="flex justify-between items-center p-2 border-b flex-shrink-0">
            <span className="font-bold text-lg">Filters</span>
            <button
              className="ml-2 p-1 rounded hover:bg-muted"
              onClick={() => setCandidateSettings({ ...candidateSettings, showFilters: false })}
              aria-label="Hide filters"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <ErrorBoundary>
              <CandidateFilters
                initialFilters={filters}
                onFilterChange={handleFilterChange}
                onAiSearch={handleAiSearch}
                onClearAllFilters={handleClearAllFilters}
                availablePositions={availablePositions}
                availableStages={availableStages}
                availableRecruiters={availableRecruiters}
                availableSources={availableSources}
                isLoading={false}
                isAiSearching={isAiSearching}
                advancedQuery={advancedQueryFromUrl}
                candidateScoreCounts={candidateScoreCounts}
                candidateCounts={candidateCountsByStage}
              />
            </ErrorBoundary>
          </div>
        </aside>
      )}
      {/* Show button when sidebar is hidden */}
      {!candidateSettings.showFilters && (
        <button
          className="absolute left-0 top-4 z-10 bg-card dark:bg-background border rounded-r p-1 shadow"
                      onClick={() => setCandidateSettings({ ...candidateSettings, showFilters: true })}
          aria-label="Show filters"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
      {/* Main Content */}
      <main ref={dynamicContentRef} className="flex-1 w-full space-y-6 min-w-0 p-6">
       

     

    

        {/* Fit Score Filter Tabs and Action Buttons Row */}
        <div className="flex flex-col sm:flex-row justify-between items-left">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 transition-all duration-300 ease-in-out">
          <div className="flex items-center gap-4 w-full">
            {/* Candidate count badge */}
            {/* <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-muted text-foreground transition-all duration-300 ease-in-out">
              {isAiSearchActive && aiMatchedCandidateIds ? aiRecordCount : total} Candidate{(isAiSearchActive && aiMatchedCandidateIds ? aiRecordCount : total) !== 1 ? 's' : ''}
            </span> */}
          </div>
        </div>
         
          {/* Fit Score Filter Tabs */}
          {candidateSettings.showHorizontalFitScoreFilters && (
            <div className="flex-1">
              {candidateSettings.fitScoreType === 'applied' && (
                <FitScoreFilterTabs
                  selectedGrades={horizontalSelectedFitScoreGrades}
                  onGradeToggle={handleHorizontalFitScoreGradeToggle}
                  onClearAll={clearAllHorizontalFitScoreFilters}
                  candidateCounts={candidateScoreCounts?.applied || []}
                  className=""
                  filterMode={candidateSettings.fitScoreFilterMode}
                />
              )}
              {candidateSettings.fitScoreType === 'matching' && (
                <FitScoreFilterTabs
                  selectedGrades={horizontalSelectedMatchingFitScoreGrades}
                  onGradeToggle={handleHorizontalMatchingFitScoreGradeToggle}
                  onClearAll={clearAllHorizontalFitScoreFilters}
                  candidateCounts={candidateScoreCounts?.matching || []}
                  className=""
                  filterMode={candidateSettings.fitScoreFilterMode}
                />
              )}
            </div>
          )}

        
          
        
          {isAiSearchActive && aiMatchedCandidateIds && aiRecordCount === 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-blue-700 dark:text-blue-300">No candidates matched your AI search.</span>
              <Button size="sm" variant="outline" onClick={handleClearAllFilters}>Clear AI Search</Button>
            </div>
          )}

      
          
          {/* Action buttons on the right */}
          <div className="flex gap-2 items-center">
            {canManageCandidates && (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  setIsBulkUploadModalOpen(true);
                }}
                variant="default"
                size="sm"
                className="w-full sm:w-auto transition-all duration-300 ease-in-out hover:scale-105 mb-2"
              >
                <Zap className="mr-2 h-3 w-3" /> Upload CVs
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 mb-2">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setIsSettingsDrawerOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                {canManageCandidates && (
                  <DropdownMenuItem onSelect={() => setIsAddModalOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Manually
                  </DropdownMenuItem>
                )}
                {canExportCandidates && (
                  <DropdownMenuItem onSelect={handleExportToExcel} disabled={isLoading}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Export (Excel)
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Active Filters Bar */}
        {(() => {
          const hasActiveFilters = 
            filters.name || 
            filters.email || 
            filters.phone || 
            filters.education ||
            filters.skills ||
            filters.location ||
            filters.cvLanguage ||
            filters.jobSuitableCareer ||
            filters.jobSuitableLevel ||
            filters.jobSuitablePosition ||
            (filters.minExperienceYears !== undefined && (filters.minExperienceYears > 0 || filters.minExperienceYears === -1)) ||
            (filters.maxExperienceYears !== undefined && filters.maxExperienceYears < 50) ||
            (filters.selectedPositionIds && filters.selectedPositionIds.length > 0) ||
            (filters.selectedStatuses && filters.selectedStatuses.length > 0) ||
            (filters.selectedRecruiterIds && filters.selectedRecruiterIds.length > 0) ||
            // Fit score filters - only show if there's actual filtering
            (filters.minAppliedJobFitScore !== undefined) ||
            (filters.maxAppliedJobFitScore !== undefined && filters.maxAppliedJobFitScore !== 100) ||
            (filters.minMatchingJobFitScore !== undefined) ||
            (filters.maxMatchingJobFitScore !== undefined && filters.maxMatchingJobFitScore !== 100) ||
            filters.applicationDateStart ||
            filters.applicationDateEnd ||
            aiSearchReasoning ||
            horizontalSelectedFitScoreGrades.size > 0 ||
            horizontalSelectedMatchingFitScoreGrades.size > 0;

          if (!hasActiveFilters) return null;

          return (
            <div ref={activeFiltersBarRef} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1.5 rounded-md filter-bar-container transition-all duration-200 ease-in-out">
              <Filter className="h-3 w-3" />
              <span>Active filters:</span>
              {filters.name && (
                <Badge variant="secondary" className="text-xs">
                  Name: "{filters.name}"
                </Badge>
              )}
              {filters.email && (
                <Badge variant="secondary" className="text-xs">
                  Email: "{filters.email}"
                </Badge>
              )}
              {filters.phone && (
                <Badge variant="secondary" className="text-xs">
                  Phone: "{filters.phone}"
                </Badge>
              )}
              {filters.education && (
                <Badge variant="secondary" className="text-xs">
                  Education: "{filters.education}"
                </Badge>
              )}
              {filters.skills && (
                <Badge variant="secondary" className="text-xs">
                  Skills: {filters.skills}
                </Badge>
              )}
              {filters.location && (
                <Badge variant="secondary" className="text-xs">
                  Location: "{filters.location}"
                </Badge>
              )}
              {filters.cvLanguage && (
                <Badge variant="secondary" className="text-xs">
                  CV Language: "{filters.cvLanguage}"
                </Badge>
              )}
              {filters.jobSuitableCareer && (
                <Badge variant="secondary" className="text-xs">
                  Career: "{filters.jobSuitableCareer}"
                </Badge>
              )}
              {filters.jobSuitableLevel && (
                <Badge variant="secondary" className="text-xs">
                  Level: "{filters.jobSuitableLevel}"
                </Badge>
              )}
              {filters.jobSuitablePosition && (
                <Badge variant="secondary" className="text-xs">
                  Position: "{filters.jobSuitablePosition}"
                </Badge>
              )}
              {filters.minExperienceYears !== undefined && (filters.minExperienceYears > 0 || filters.minExperienceYears === -1) && (
                <Badge variant="secondary" className="text-xs">
                  {filters.minExperienceYears === -1 ? 'No Experience' : `Min Experience: ${filters.minExperienceYears} years`}
                </Badge>
              )}
              {filters.maxExperienceYears !== undefined && filters.maxExperienceYears < 50 && (
                <Badge variant="secondary" className="text-xs">
                  Max Experience: {filters.maxExperienceYears} years
                </Badge>
              )}
              {filters.selectedPositionIds && filters.selectedPositionIds.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Position{filters.selectedPositionIds.length > 1 ? 's' : ''}: {filters.selectedPositionIds.map(id => {
                    if (id === 'not-applied') return 'Not Applied';
                    const position = availablePositions.find(p => p.id === id);
                    return position ? position.title : id;
                  }).join(', ')}
                </Badge>
              )}
              {filters.selectedStatuses && filters.selectedStatuses.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Pipeline{filters.selectedStatuses.length > 1 ? ' Stages' : ' Stage'}: {filters.selectedStatuses.join(', ')}
                </Badge>
              )}
              {filters.selectedRecruiterIds && filters.selectedRecruiterIds.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Recruiter{filters.selectedRecruiterIds.length > 1 ? 's' : ''}: {filters.selectedRecruiterIds.map(id => {
                    if (id === 'unassigned') return 'Unassigned';
                    const recruiter = availableRecruiters.find(r => r.id === id);
                    return recruiter ? recruiter.name : id;
                  }).join(', ')}
                </Badge>
              )}
              {filters.minAppliedJobFitScore !== undefined && filters.minAppliedJobFitScore !== -1 && (
                <Badge variant="secondary" className="text-xs">
                  Applied Job Min Score: {filters.minAppliedJobFitScore}
                </Badge>
              )}
              {filters.maxAppliedJobFitScore !== undefined && filters.maxAppliedJobFitScore !== 100 && (
                <Badge variant="secondary" className="text-xs">
                  Applied Job Max Score: {filters.maxAppliedJobFitScore}
                </Badge>
              )}
              {filters.minAppliedJobFitScore === -1 && (
                <Badge variant="secondary" className="text-xs">
                  Applied Job: No Score Only
                </Badge>
              )}
              {filters.minMatchingJobFitScore !== undefined && filters.minMatchingJobFitScore !== -1 && (
                <Badge variant="secondary" className="text-xs">
                  Matching Job Min Score: {filters.minMatchingJobFitScore}
                </Badge>
              )}
              {filters.maxMatchingJobFitScore !== undefined && filters.maxMatchingJobFitScore !== 100 && (
                <Badge variant="secondary" className="text-xs">
                  Matching Job Max Score: {filters.maxMatchingJobFitScore}
                </Badge>
              )}
              {filters.minMatchingJobFitScore === -1 && (
                <Badge variant="secondary" className="text-xs">
                  Matching Job: No Score Only
                </Badge>
              )}
              {filters.applicationDateStart && (
                <Badge variant="secondary" className="text-xs">
                  From: {filters.applicationDateStart.toLocaleDateString()}
                </Badge>
              )}
              {filters.applicationDateEnd && (
                <Badge variant="secondary" className="text-xs">
                  To: {filters.applicationDateEnd.toLocaleDateString()}
                </Badge>
              )}
              {aiSearchReasoning && (
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                  AI Search Active
                </Badge>
              )}
              {horizontalSelectedFitScoreGrades.size > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Applied Fit Score: {Array.from(horizontalSelectedFitScoreGrades).join(', ')}
                </Badge>
              )}
              {horizontalSelectedMatchingFitScoreGrades.size > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Matching Fit Score: {Array.from(horizontalSelectedMatchingFitScoreGrades).join(', ')}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6 px-2 text-xs"
                onClick={handleClearAllFilters}
              >
                Clear all
              </Button>
            </div>
          );
        })()}
        {/* AI Search Results - Now positioned after Fit Score Filter Tabs */}
        {aiSearchReasoning && (
            <Alert variant="default" className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700 transition-all duration-300 ease-in-out animate-in slide-in-from-top-2 mt-4">
              <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="font-semibold text-blue-700 dark:text-blue-300">AI Search Results</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                {aiSearchReasoning}
              </AlertDescription>
            </Alert>
          )}
        {/* Bulk Actions - show when candidates are selected */}
        {selectedCandidateIds.size > 0 && canManageCandidates && (
          <div className="flex items-center gap-2 mt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-3 text-sm transition-all duration-300 ease-in-out hover:scale-105">
                  Bulk Actions ({selectedCandidateIds.size}) <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleBulkAction('delete')}>
                  <BulkTrashIcon className="mr-2 h-4 w-4" /> Delete Selected
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleBulkAction('change_status')}>
                  <BulkEditIcon className="mr-2 h-4 w-4" /> Change Status
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleBulkAction('assign_recruiter')}>
                  <Users className="mr-2 h-4 w-4" /> Assign Recruiter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Show no matching candidates message right under the filters */}
        {mappedCandidates.length === 0 && filteredCandidates.length > 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center transition-all duration-500 ease-in-out animate-in fade-in mt-4">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">No matching candidates</h3>
            <p className="text-muted-foreground mb-3 max-w-md text-sm">
              Try adjusting your filters or search criteria to find more candidates.
            </p>
            <Button onClick={handleClearAllFilters} variant="outline" size="sm">
              Clear All Filters
            </Button>
          </div>
        )}

        {/* Authentication Check */}
        {String(sessionStatus) === 'unauthenticated' && (
          <div className="flex flex-col items-center justify-center py-12 text-center transition-all duration-500 ease-in-out animate-in fade-in">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Authentication Required</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Please sign in to view and manage candidates.
            </p>
            <Button onClick={() => signIn()}>
              Sign In
            </Button>
          </div>
        )}

        {/* Loading State - Show when server is starting up or initial data is being fetched */}
        {String(sessionStatus) === 'authenticated' && (isLoading || tableLoading) && !isAiSearching && (
          <div className="flex flex-col items-center justify-center py-12 text-center transition-all duration-500 ease-in-out animate-in fade-in">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Loading Candidates...</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              {isLoading ? 'Initializing...' : 'Fetching data...'}
            </p>
            <p className="text-sm text-muted-foreground">
              If this takes too long, the server may be starting up. Please wait a moment.
            </p>
          </div>
        )}

        {/* Empty State - Single conditional to prevent duplicates */}
        {String(sessionStatus) === 'authenticated' && !isLoading && !tableLoading && !isAiSearching && (() => {
          // AI search is active and has results - don't show empty state
          if (isAiSearchActive && aiMatchedCandidateIds && aiMatchedCandidateIds.length > 0) {
            return null; // Don't show empty state when AI search has results
          }
          
          // No candidates in database at all
          if (filteredCandidates.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-12 text-center transition-all duration-500 ease-in-out animate-in fade-in">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No candidates found</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  No candidates have been added yet. Add your first candidate to get started.
                </p>
                {canManageCandidates && (
                  <Button onClick={() => setIsAddModalOpen(true)}>
                    Add First Candidate
                  </Button>
                )}
              </div>
            );
          }
          
          // Has candidates and results - show nothing
          return null;
        })()}

        {/* Only render table when there are candidates to show AND not loading */}
        {String(sessionStatus) === 'authenticated' && !isLoading && !tableLoading && (() => {
          if (sortedCandidates.length > 0) {
            // Create a settings hash to force table re-render when column visibility changes
            const settingsHash = JSON.stringify({
              showCandidateColumn: candidateSettings.showCandidateColumn,
              showAppliedJobColumn: candidateSettings.showAppliedJobColumn,
              showJobMatchesColumn: candidateSettings.showJobMatchesColumn,
              showFitScoreColumn: candidateSettings.showFitScoreColumn,
              showRecruiterColumn: candidateSettings.showRecruiterColumn,
              showStatusColumn: candidateSettings.showStatusColumn,
              showAppliedDateColumn: candidateSettings.showAppliedDateColumn,
            });

            return (
              <ErrorBoundary>
                <CandidateTable
                  key={`table-${settingsHash}`}
                  candidates={sortedCandidates}
                  availablePositions={availablePositions}
                  availableStages={availableStages}
                  availableRecruiters={availableRecruiters}
                  availableSources={availableSources}
                  onAssignRecruiter={handleAssignRecruiter}
                  onAssignSource={handleAssignSource}
                  onUpdateCandidate={updateCandidateStatus}
                  onDeleteCandidate={handleDeleteCandidate}
                  onEditPosition={handleOpenPositionDrawer}
                  isLoading={tableLoading}
                  onRefreshCandidateData={refreshCandidateInList}
                  selectedCandidateIds={selectedCandidateIds}
                  onToggleSelectCandidate={handleToggleSelectCandidate}
                  onToggleSelectAllCandidates={handleToggleSelectAllCandidates}
                  isAllCandidatesSelected={isAllCandidatesSelected}
                  page={page}
                  pageSize={pageSize}
                  baseIndex={baseIndex}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  canManageCandidates={canManageCandidates}
                  settings={candidateSettings}
                  tableHeight={tableHeight}
                />
              </ErrorBoundary>
            );
          }
          
          // If AI search is active and has results but no candidates are showing, 
          // there might be an issue with the filtering
          if (isAiSearchActive && aiMatchedCandidateIds && aiMatchedCandidateIds.length > 0 && sortedCandidates.length === 0) {
        
            return (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Brain className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">AI Search Results Found</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  AI found {aiMatchedCandidateIds.length} matching candidates, but they are not currently visible. 
                  This might be due to filtering issues.
                </p>
                <Button onClick={handleClearAllFilters} variant="outline">
                  Clear Filters to View Results
                </Button>
              </div>
            );
          }
          
          return null;
        })()}

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-4 transition-all duration-300 ease-in-out">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(1)}
              disabled={page === 1}
              aria-label="First page"
              className="transition-all duration-200 ease-in-out hover:scale-105"
            >
              <ChevronLeft className="h-4 w-4" />
              <ChevronLeft className="h-4 w-4 -ml-2" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              aria-label="Previous page"
              className="transition-all duration-200 ease-in-out hover:scale-105"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
              {isAiSearchActive && aiRecordCount > 0 && (
                <span className="ml-2 text-muted-foreground">
                  ({sortedCandidates.length} of {aiRecordCount} results)
                </span>
              )}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              aria-label="Next page"
              className="transition-all duration-200 ease-in-out hover:scale-105"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              aria-label="Last page"
              className="transition-all duration-200 ease-in-out hover:scale-105"
            >
              <ChevronRight className="h-4 w-4" />
              <ChevronRight className="h-4 w-4 -ml-2" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => {
                const newPageSize = Number(e.target.value);
                setPageSize(newPageSize);
                setPage(1); // Reset to first page when changing page size
              }}
              className="border rounded-md px-2 py-1 text-sm bg-background text-foreground transition-all duration-200 ease-in-out hover:border-primary focus:border-primary focus:outline-none"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
      </main>

      {canManageCandidates && <AddCandidateModal isOpen={isAddModalOpen} onOpenChange={setIsAddModalOpen} onAddCandidate={handleAddCandidateSubmit} availableStages={availableStages} />}
      {selectedPositionForEdit && (
        <PositionDetailDrawer
          isOpen={isPositionDrawerOpen}
          onOpenChange={(open: boolean) => {
            setIsPositionDrawerOpen(open);
            if (!open) setSelectedPositionForEdit(null);
          }}
          positionId={selectedPositionForEdit.id}
          initialEditMode={true}
        />
      )}
      <AutomationUploadModal
        isOpen={isAutomationUploadModalOpen}
        onOpenChange={setIsAutomationUploadModalOpen}
      />
      {canManageCandidates && (
        <BulkUploadCVsModal
          isOpen={isBulkUploadModalOpen}
          onOpenChange={(open) => {
        
            setIsBulkUploadModalOpen(open);
          }}
        />
      )}

      <AlertDialog open={isBulkActionConfirmOpen} onOpenChange={setIsBulkActionConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to perform <strong>{bulkActionType?.replace('_', ' ')}</strong> on <strong>{selectedCandidateIds.size}</strong> selected candidate(s).
              {bulkActionType === 'delete' && " This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {bulkActionType === 'change_status' && (
            <div className="my-4 space-y-2">
              <StageSelect
                value={bulkNewStatus}
                onChange={setBulkNewStatus}
                availableStages={availableStages}
                label="New Status"
              />
              <Label htmlFor="bulk-transition-notes">Notes (Optional)</Label>
              <Textarea id="bulk-transition-notes" value={bulkTransitionNotes} onChange={(e) => setBulkTransitionNotes(e.target.value)} placeholder="Optional notes for this bulk status change."/>
            </div>
          )}
          {bulkActionType === 'assign_recruiter' && (
            <div className="my-4 space-y-2">
              <Label htmlFor="bulk-new-recruiter">Assign to Recruiter</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    id="bulk-new-recruiter"
                  >
                    {bulkNewRecruiterId ? (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const selectedRecruiter = availableRecruiters.find(r => r.id === bulkNewRecruiterId);
                          return selectedRecruiter ? (
                            <>
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={selectedRecruiter.avatarUrl} />
                                <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                  {selectedRecruiter.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>{selectedRecruiter.name}</span>
                            </>
                          ) : (
                            <span>Unknown recruiter</span>
                          );
                        })()}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Select recruiter...</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <div className="p-2">
                    <div className="text-sm font-medium mb-2">Select Recruiter</div>
                    
                    {/* Unassign option */}
                    <button
                      onClick={() => setBulkNewRecruiterId(null)}
                      className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
                    >
                      <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <UserX className="h-3 w-3 text-gray-500" />
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-sm">Unassign</span>
                        <span className="text-xs text-muted-foreground">Remove recruiter assignment</span>
                      </div>
                      {bulkNewRecruiterId === null && (
                        <div className="w-4 h-4 rounded-full bg-primary" />
                      )}
                    </button>

                    {/* Available recruiters */}
                    {availableRecruiters.map((recruiter) => (
                      <button
                        key={recruiter.id}
                        onClick={() => setBulkNewRecruiterId(recruiter.id)}
                        className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={recruiter.avatarUrl} />
                          <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {recruiter.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-medium">{recruiter.name}</span>
                          <span className="text-xs text-muted-foreground">Recruiter</span>
                        </div>
                        {bulkNewRecruiterId === recruiter.id && (
                          <div className="w-4 h-4 rounded-full bg-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setIsBulkActionConfirmOpen(false); setBulkActionType(null);}}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkAction} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin mr-2" /> : null} Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings Drawer */}
      <CandidateSettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onOpenChange={setIsSettingsDrawerOpen}
        onSettingsChange={setCandidateSettings}
        currentSettings={candidateSettings}
        isLoading={settingsLoading}
        error={settingsError}
      />
    </div>
  );
}

