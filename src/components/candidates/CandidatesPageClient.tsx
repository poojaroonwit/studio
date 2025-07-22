"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CandidateFilters, type CandidateFilterValues } from '@/components/candidates/CandidateFilters';
import { CandidateTable } from '@/components/candidates/CandidateTable';
import type { Candidate, CandidateStatus, Position, RecruitmentStage, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { PlusCircle, Users, ServerCrash, Zap, Loader2, FileDown, FileUp, ChevronDown, FileSpreadsheet, ShieldAlert, Brain, Trash2 as BulkTrashIcon, Edit as BulkEditIcon, ChevronLeft, ChevronRight, ChevronsUpDown, Check, Briefcase, X, Filter } from 'lucide-react';
import { toast } from "react-hot-toast";
import { AddCandidateModal, type AddCandidateFormValues } from '@/components/candidates/AddCandidateModal';
import { ImportCandidatesModal } from '@/components/candidates/ImportCandidatesModal';
import { EditPositionModal } from '@/components/positions/EditPositionModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import BulkUploadCVsModal from '@/components/BulkUploadCVsModal';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import AutomationUploadModal from './AutomationUploadModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { StageSelect } from './StageSelect';
import { HealthCheck } from '@/components/ui/health-check';
import { Badge } from '@/components/ui/badge';


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
  
  // Read URL parameters for initial filtering
  const urlPositionId = searchParams.get('positionId');
  const urlRecruiterId = searchParams.get('recruiterId');
  const urlStatus = searchParams.get('status');
  
  const [filters, setFilters] = useState<CandidateFilterValues>(() => {
    const baseFilters = initialFilters || {
      minFitScore: 0,
      maxFitScore: 100,
      selectedPositionIds: [],
      selectedStatuses: []
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

  const [allCandidates, setAllCandidates] = useState<Candidate[]>(safeInitialCandidates || []);
  const [availablePositions, setAvailablePositions] = useState<Position[]>(safeInitialAvailablePositions || []);
  const [availableStages, setAvailableStages] = useState<RecruitmentStage[]>(safeInitialAvailableStages || []);
  const [availableRecruiters, setAvailableRecruiters] = useState<Pick<UserProfile, 'id' | 'name' | 'email'>[]>([]);

  const [isLoading, setIsLoading] = useState(false); // Changed to false initially
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [isFetching, setIsFetching] = useState(false); // Track if we're currently fetching
  const [aiSearchReasoning, setAiSearchReasoning] = useState<string | null>(null);
  const [aiMatchedCandidateIds, setAiMatchedCandidateIds] = useState<string[] | null>(null);
  const [isAiSearchActive, setIsAiSearchActive] = useState(false);
  const [hasInitialFetch, setHasInitialFetch] = useState(false);
  const [hasInitialDataFetch, setHasInitialDataFetch] = useState(false);
  const [advancedQueryFromUrl, setAdvancedQueryFromUrl] = useState<string>('');
  const [isClearingFilters, setIsClearingFilters] = useState(false);

  // Add debouncing for fetch requests
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreateViaAutomationModalOpen, setIsCreateViaAutomationModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(initialFetchError || null);
  const [authError, setAuthError] = useState(serverAuthError);
  const [permissionError, setPermissionError] = useState(serverPermissionError);

  const [isEditPositionModalOpen, setIsEditPositionModalOpen] = useState(false);
  const [selectedPositionForEdit, setSelectedPositionForEdit] = useState<Position | null>(null);
  const { data: session, status: sessionStatus } = useSession();

  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [isBulkActionConfirmOpen, setIsBulkActionConfirmOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'delete' | 'change_status' | 'assign_recruiter' | null>(null);
  const [bulkNewStatus, setBulkNewStatus] = useState<string>('');
  const [bulkNewRecruiterId, setBulkNewRecruiterId] = useState<string | null>(null);
  const [bulkTransitionNotes, setBulkTransitionNotes] = useState<string>('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const canImportCandidates = session?.user?.role === 'Admin' || session?.user?.modulePermissions?.includes('CANDIDATES_IMPORT');
  const canExportCandidates = session?.user?.role === 'Admin' || session?.user?.modulePermissions?.includes('CANDIDATES_EXPORT');
  const canManageCandidates = session?.user?.role === 'Admin' || session?.user?.modulePermissions?.includes('CANDIDATES_MANAGE');

  // Calculate total pages for pagination
  const totalPages = useMemo(() => {
    if (isAiSearchActive && aiMatchedCandidateIds) {
      return Math.max(1, Math.ceil(aiMatchedCandidateIds.length / pageSize));
    }
    return Math.max(1, Math.ceil(total / pageSize));
  }, [isAiSearchActive, aiMatchedCandidateIds, pageSize, total]);

  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isAutomationUploadModalOpen, setIsAutomationUploadModalOpen] = useState(false);

  // Collapsible sidebar state
  const [showFilters, setShowFilters] = useState(true);

  // Add at the top of the component
  const hasInitializedFilters = useRef(false);

  const [missingPositions, setMissingPositions] = useState<string[]>([]);

  // Fetch missing positions if any candidate has a positionId not in availablePositions
  useEffect(() => {
    const missing = allCandidates
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
  }, [allCandidates, availablePositions]);

  // Handle initial URL parameters (only if not clearing filters)
  useEffect(() => {
    if (isClearingFilters || hasInitializedFilters.current) {
      return;
    }
    
    // Apply URL parameters if they exist and haven't been applied yet
    let hasChanges = false;
    const newFilters = { ...filters };
    
    if (urlPositionId && (!filters.selectedPositionIds || filters.selectedPositionIds.length === 0)) {
      newFilters.selectedPositionIds = [urlPositionId];
      // console.log('Setting position filter from URL:', urlPositionId);
      hasChanges = true;
    }
    if (urlRecruiterId && (!filters.selectedRecruiterIds || filters.selectedRecruiterIds.length === 0)) {
      newFilters.selectedRecruiterIds = [urlRecruiterId];
      // console.log('Setting recruiter filter from URL:', urlRecruiterId);
      hasChanges = true;
    }
    if (urlStatus && (!filters.selectedStatuses || filters.selectedStatuses.length === 0)) {
      newFilters.selectedStatuses = [urlStatus];
      // console.log('Setting status filter from URL:', urlStatus);
      hasChanges = true;
    }
    
    if (hasChanges) {
      setFilters(newFilters);
    }
    hasInitializedFilters.current = true;
  }, [urlPositionId, urlRecruiterId, urlStatus, isClearingFilters]);

  const fetchRecruiters = useCallback(async (retryCount = 0) => {
    if (sessionStatus !== 'authenticated') return;
    
    const maxRetries = 3;
    const retryDelay = 1000 * (retryCount + 1); // Exponential backoff: 1s, 2s, 3s
    
    try {
      const response = await fetch('/api/users?role=Recruiter');
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); // Default to empty object on JSON parse fail
          // console.error("API error fetching recruiters:", errorData); // Log the object we got
          
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
            // console.warn(`Recruiter fetch failed (attempt ${retryCount + 1}/${maxRetries}), retrying in ${retryDelay}ms:`, detailedErrorMessage);
            setTimeout(() => fetchRecruiters(retryCount + 1), retryDelay);
            return;
          }
          
          // Don't throw error, just log it and continue with empty recruiters list
          // console.warn("Recruiter fetch failed, continuing with empty list:", detailedErrorMessage);
          setAvailableRecruiters([]);
          return;
      }
      const recruitersData: UserProfile[] | undefined = await response.json(); 
      if (!recruitersData || !Array.isArray(recruitersData)) {
        // console.warn("Invalid data format received for recruiters, using empty list");
        setAvailableRecruiters([]);
        return;
      }
      setAvailableRecruiters(recruitersData.map(r => ({ id: r.id, name: r.name, email: r.email || '' })));
    } catch (error) {
      // console.error("Error fetching recruiters:", error);
      
      // Retry on network errors
      if (retryCount < maxRetries) {
        // console.warn(`Recruiter fetch failed due to network error (attempt ${retryCount + 1}/${maxRetries}), retrying in ${retryDelay}ms`);
        setTimeout(() => fetchRecruiters(retryCount + 1), retryDelay);
        return;
      }
      
      // Don't show toast error, just log it and continue with empty recruiters list
      // console.warn("Recruiter fetch failed due to network error, continuing with empty list");
      setAvailableRecruiters([]);
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
      if (currentFilters.minFitScore !== undefined) query.append('minFitScore', String(currentFilters.minFitScore));
      if (currentFilters.maxFitScore !== undefined) query.append('maxFitScore', String(currentFilters.maxFitScore));
      if (currentFilters.applicationDateStart) query.append('applicationDateStart', currentFilters.applicationDateStart.toISOString());
      if (currentFilters.applicationDateEnd) query.append('applicationDateEnd', currentFilters.applicationDateEnd.toISOString());
      if (currentFilters.selectedRecruiterIds && currentFilters.selectedRecruiterIds.length > 0) query.append('recruiterId', currentFilters.selectedRecruiterIds.join(','));
      query.append('page', String(page));
      query.append('limit', String(pageSize));
      
      if (currentFilters.location) {
        query.append('location', currentFilters.location);
        if (currentFilters.locationOperator) query.append('locationOperator', currentFilters.locationOperator);
      }
      if (currentFilters.university) query.append('university', currentFilters.university);
      if (currentFilters.major) query.append('major', currentFilters.major);
      if (currentFilters.skills && Array.isArray(currentFilters.skills)) {
        if (currentFilters.skills.length > 0) query.append('skills', currentFilters.skills.join(','));
      } else if (typeof currentFilters.skills === 'string' && currentFilters.skills) {
        query.append('skills', currentFilters.skills);
      }
      
            const apiUrl = `/api/candidates?${query.toString()}`;

      // Add timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

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
            return;
        }
        if (response.status === 403) {
            setPermissionError(true);
            setFetchError(errorMessage);
            if (latestRequestIdRef.current === requestId) setAllCandidates([]); // Only clear on permission error
            return;
        }
        setFetchError(errorMessage);
        // Do NOT clear candidates here
        return;
      }
      const data = await response.json();
      
      const candidatesArray = Array.isArray(data.data) ? data.data : [];
      const totalCount = data.pagination?.total || 0;
      const actualPage = data.pagination?.page || 1;
      
      // Only update if this is the latest request
      if (latestRequestIdRef.current === requestId) {
        setAllCandidates(candidatesArray); // Only update on success
        setTotal(totalCount);
        setPage(actualPage); // <-- Update page state from API response
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
  }, []); // Removed sessionStatus dependency to prevent recreation

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // Create a debounced version for refresh events
  const debouncedFetchPaginatedCandidates = useCallback((currentFilters: CandidateFilterValues, page: number, pageSize: number) => {
    // Clear any pending timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    // Set a new timeout
    fetchTimeoutRef.current = setTimeout(() => {
      fetchPaginatedCandidates(currentFilters, page, pageSize);
    }, 300); // 300ms debounce
  }, [fetchPaginatedCandidates]);

  const handleAiSearch = async (aiQuery: string) => {
    if (!aiQuery.trim()) {
      toast("Please enter a search query for AI search.");
      return;
    }
    setIsAiSearching(true);
    setFetchError(null);
    setAiSearchReasoning(null);
    setAiMatchedCandidateIds(null);
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
      setAiMatchedCandidateIds(result.matchedCandidateIds || []);
      setAiSearchReasoning(result.aiReasoning || "AI search complete.");
      if (result.matchedCandidateIds?.length > 0) {
        toast.success(`Found ${result.matchedCandidateIds.length} potential match(es). ${result.aiReasoning || ''}`);
      } else {
        toast.success(result.aiReasoning || "No strong matches found by AI for your query.");
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
      // Only show loading if we don't have initial data and no errors
      if (safeInitialCandidates.length === 0 && !initialFetchError && !serverAuthError && !serverPermissionError) {
        setIsLoading(true);
      } else {
        setIsLoading(false);
      }
      
      // Fetch recruiters with a delay to give server time to start up
      const timeoutId = setTimeout(() => {
        fetchRecruiters();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    } else {
      // Not authenticated or has errors
      setIsLoading(false);
    }
  }, [sessionStatus, serverAuthError, serverPermissionError, fetchRecruiters, safeInitialCandidates.length, initialFetchError]);

  // Separate useEffect for initial data fetching
  useEffect(() => {
    // Only fetch candidates if:
    // 1. We're authenticated
    // 2. No server errors
    // 3. No initial data provided
    // 4. Haven't already fetched
    if (sessionStatus === 'authenticated' && 
        !serverAuthError && 
        !serverPermissionError && 
        safeInitialCandidates.length === 0 && 
        !hasInitialDataFetch) {
      setHasInitialDataFetch(true);
      fetchPaginatedCandidates(filters, page, pageSize);
    }
  }, [sessionStatus, serverAuthError, serverPermissionError, safeInitialCandidates.length, initialFetchError, hasInitialDataFetch, fetchPaginatedCandidates, filters, page, pageSize]);



  // Separate useEffect for URL parameter handling
  useEffect(() => {
    // Skip if we're currently clearing filters
    if (isClearingFilters) {
      return;
    }
    
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const recruiterIdParam = urlParams.get('recruiterId');
    const positionIdParam = urlParams.get('positionId');
    const statusParam = urlParams.get('status');
    const applicationDateStartParam = urlParams.get('applicationDateStart');
    const applicationDateEndParam = urlParams.get('applicationDateEnd');
    const nameParam = urlParams.get('name');
    const emailParam = urlParams.get('email');
    const phoneParam = urlParams.get('phone');
    const educationParam = urlParams.get('education');
    const minFitScoreParam = urlParams.get('minFitScore');
    const maxFitScoreParam = urlParams.get('maxFitScore');
    const advancedQueryParam = urlParams.get('query');

    // Build new filters from URL params
    let newFilters = { ...filters };
    let hasChanges = false;
    let advancedQuery = '';

    // Handle advanced query parameter first
    if (advancedQueryParam) {
      advancedQuery = decodeURIComponent(advancedQueryParam);
      hasChanges = true;
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
      if (minFitScoreParam || maxFitScoreParam) {
        const minScore = minFitScoreParam ? parseInt(minFitScoreParam, 10) : 0;
        const maxScore = maxFitScoreParam ? parseInt(maxFitScoreParam, 10) : 100;
        
        if (filters.minFitScore !== minScore || filters.maxFitScore !== maxScore) {
          newFilters.minFitScore = minScore;
          newFilters.maxFitScore = maxScore;
          hasChanges = true;
        }
      }
    }

    // Only update if there are actual changes
    if (hasChanges) {
      setFilters(newFilters);
      // Don't reset hasInitialDataFetch here - let the filter change useEffect handle fetching
      
      // If we have an advanced query, store it for the filter component
      if (advancedQuery) {
        setAdvancedQueryFromUrl(advancedQuery);
      }
    }
  }, [window.location.search, isClearingFilters]); // Added isClearingFilters dependency

  // Separate useEffect to handle filter changes and fetch candidates
  useEffect(() => {
    // console.log('Filter change useEffect triggered with filters:', filters);
    
    // Skip if not authenticated or has errors
    if (sessionStatus !== 'authenticated' || serverAuthError || serverPermissionError) {
      return;
    }
    
    // Skip if we're currently clearing filters
    if (isClearingFilters) {
      // console.log('Skipping filter change useEffect - currently clearing filters');
      return;
    }
    
    // Create a unique request ID to prevent infinite loops
    const requestId = JSON.stringify({ filters, page, pageSize });
    if (currentRequestRef.current === requestId) {
      // console.log('Skipping fetch - same request already in progress');
      return;
    }
    
    currentRequestRef.current = requestId;
    // console.log('Fetching candidates due to filter change');
    fetchPaginatedCandidates(filters, page, pageSize);
  }, [filters, page, pageSize, sessionStatus, serverAuthError, serverPermissionError, isClearingFilters]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated' && !serverAuthError && !serverPermissionError) {
        return;
    }
  }, [sessionStatus, serverAuthError, serverPermissionError]);

  useEffect(() => { setAllCandidates(safeInitialCandidates || []); }, [safeInitialCandidates]);
  useEffect(() => { setAvailablePositions(safeInitialAvailablePositions || []); }, [safeInitialAvailablePositions]);
  useEffect(() => { setAvailableStages(safeInitialAvailableStages || []); }, [safeInitialAvailableStages]);

  // Fetch positions and stages on mount if not provided initially
  useEffect(() => {
    if (sessionStatus === 'authenticated' && safeInitialAvailablePositions.length === 0) {
      const fetchPositionsAndStages = async () => {
        try {
          const [posResponse, stagesResponse] = await Promise.all([
            fetch('/api/positions/all'),
            fetch('/api/settings/recruitment-stages')
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

  useEffect(() => {
    // Show error as toast popup if present
    if (initialFetchError) {
      toast.error(initialFetchError);
    }
  }, [initialFetchError]);

  // Add a ref to track the debounce timeout
  const filterChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAppliedFiltersRef = useRef<string>('');

  const handleFilterChange = (newFilters: CandidateFilterValues) => {
    // console.log('handleFilterChange called with:', newFilters);
    
    // Skip if we're currently clearing filters
    if (isClearingFilters) {
      // console.log('Skipping filter change - currently clearing filters');
      return;
    }
    
    // Clear any existing timeout
    if (filterChangeTimeoutRef.current) {
      clearTimeout(filterChangeTimeoutRef.current);
    }

    // Debounce the filter change to prevent rapid successive calls
    filterChangeTimeoutRef.current = setTimeout(() => {
      // console.log('Applying debounced filter change');
    const combinedFilters = { ...filters, ...newFilters, aiSearchQuery: undefined };
      
      // Check if filters have actually changed to prevent unnecessary updates
      const currentFiltersString = JSON.stringify(filters);
      const newFiltersString = JSON.stringify(combinedFilters);
      
      if (currentFiltersString === newFiltersString) {
        // console.log('Filters unchanged, skipping update');
        return;
      }
      
      // Check if this is an AI search query being applied
      const isAiSearchQuery = newFilters.aiSearchQuery !== undefined;
      // Only clear AI search if user is clearing all filters (handled elsewhere)
      // const isSignificantFilterChange = ...
      // if (isSignificantFilterChange && !isAiSearchActive) {
      //   setAiMatchedCandidateIds(null);
      //   setAiSearchReasoning(null);
      //   setIsAiSearchActive(false);
      // }
      // Reset page to 1 when filters change
      setPage(1);
      setFilters(combinedFilters);
    }, 300); // 300ms debounce
  };

  const handleClearAllFilters = () => {
    // console.log('handleClearAllFilters called');
    
    // Clear any existing filter change timeout to prevent interference
    if (filterChangeTimeoutRef.current) {
      clearTimeout(filterChangeTimeoutRef.current);
      filterChangeTimeoutRef.current = null;
    }
    
    // Set flag to prevent URL parameter re-application
    setIsClearingFilters(true);
    
    // Clear all filters and update URL
    const clearedFilters = {
      name: undefined,
      email: undefined,
      phone: undefined,
      education: undefined,
      skills: undefined,
      location: undefined,
      cvLanguage: undefined,
      jobSuitableCareer: undefined,
      jobSuitableLevel: undefined,
      jobSuitablePosition: undefined,
      minExperienceYears: undefined,
      maxExperienceYears: undefined,
      selectedPositionIds: undefined,
      selectedStatuses: undefined,
      selectedRecruiterIds: undefined,
      minFitScore: 0,
      maxFitScore: 100,
      matchingMinFitScore: 70,
      matchingMaxFitScore: 100,
      applicationDateStart: undefined,
      applicationDateEnd: undefined,
      aiSearchQuery: undefined,
    };
    
    // Update filters state immediately
    setFilters(clearedFilters);
    setAiMatchedCandidateIds(null); // Only clear AI search here
    setAiSearchReasoning(null);
    setIsAiSearchActive(false);
    setAdvancedQueryFromUrl(''); // Clear advanced query from URL
    setPage(1);
    
    // Clear URL parameters by navigating to the base path immediately
    router.replace(pathname, { scroll: false });
    
    // Reset the clearing flag after a delay to allow the router to complete
    setTimeout(() => {
      setIsClearingFilters(false);
    }, 500);
  };

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
      setAllCandidates(prev => prev.map(c => c.id === candidateId ? updatedCandidate : c));
    } else {
      toast.error('Could not refresh data for candidate. Attempting full list refresh.');
      fetchPaginatedCandidates(filters, page, pageSize);
    }
  }, [fetchCandidateById, toast, fetchPaginatedCandidates, filters, page, pageSize, aiMatchedCandidateIds]);

  const handleUpdateCandidateAPI = async (candidateId: string, status: CandidateStatus, transitionNotes?: string, suppressToast?: boolean) => {
    try {
      const payload: { status: CandidateStatus, transitionNotes?: string } = { status };
      if (transitionNotes) {
        payload.transitionNotes = transitionNotes;
      }
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred" }));
        throw new Error(errorData.message || `Failed to update candidate: ${response.statusText || `Status: ${response.status}`}`);
      }
      const updatedCandidateFromServer: Candidate = await response.json();
      setAllCandidates(prev => prev.map(c => (c.id === updatedCandidateFromServer.id ? updatedCandidateFromServer : c)));
      if (!suppressToast) {
        toast.success(`${updatedCandidateFromServer.name}'s status set to ${updatedCandidateFromServer.status}.`);
      }
    } catch (error) {
      // console.error("Error updating candidate:", error);
      toast.error((error as Error).message);
      throw error; // Re-throw for ManageTransitionsModal or other callers to handle
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
     try {
      const response = await fetch(`/api/candidates/${candidateId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred" }));
        throw new Error(errorData.message || `Failed to delete candidate: ${response.statusText || `Status: ${response.status}`}`);
      }
      setAllCandidates(prev => prev.filter(c => c.id !== candidateId));
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
      const apiPayload = {
        candidate_info: {
          personal_info: formData.personal_info,
          contact_info: formData.contact_info,
          education: formData.education,
          experience: formData.experience?.map(exp => ({
            ...exp,
            positionLevel: exp.positionLevel === "___NOT_SPECIFIED___" || exp.positionLevel === null ? undefined : exp.positionLevel
          })),
          skills: formData.skills?.map(s => ({
            segment_skill: s.segment_skill,
            skill: s.skill_string?.split(',').map(sk => sk.trim()).filter(sk => sk) || []
          })),
          job_suitable: formData.job_suitable,
          cv_language: formData.cv_language,
          status: formData.status,
          // Add any other fields needed
        },
        // Add job_matches and job_applied if available in formData
        ...(formData.job_matches ? { job_matches: formData.job_matches } : {}),
        ...(formData.job_applied ? { job_applied: formData.job_applied } : {}),
        applicationDate: formData.applicationDate,
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
      await fetchPaginatedCandidates(filters, page, pageSize);
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
    setTimeout(() => { fetchPaginatedCandidates(filters, page, pageSize); }, 15000); // Optimistic refresh after 15s
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/candidates/import/template');
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'candidate_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Import template downloaded successfully!');
    } catch (error: any) {
      toast.error(`Failed to download template: ${error.message}`);
    }
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
      if (filters.minFitScore !== undefined) query.append('minFitScore', String(filters.minFitScore));
      if (filters.maxFitScore !== undefined) query.append('maxFitScore', String(filters.maxFitScore));
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

  const handleExportToCsv = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      query.append('format', 'csv');
      if (filters.name) query.append('name', filters.name);
      if (filters.email) query.append('email', filters.email);
      if (filters.phone) query.append('phone', filters.phone);
      if (filters.selectedPositionIds && filters.selectedPositionIds.length > 0) query.append('positionId', filters.selectedPositionIds.join(','));
      if (filters.selectedStatuses && filters.selectedStatuses.length > 0) query.append('status', filters.selectedStatuses.join(','));
      if (filters.education) query.append('education', filters.education);
      if (filters.minFitScore !== undefined) query.append('minFitScore', String(filters.minFitScore));
      if (filters.maxFitScore !== undefined) query.append('maxFitScore', String(filters.maxFitScore));
      if (filters.applicationDateStart) query.append('applicationDateStart', filters.applicationDateStart.toISOString());
      if (filters.applicationDateEnd) query.append('applicationDateEnd', filters.applicationDateEnd.toISOString());
      if (filters.selectedRecruiterIds && filters.selectedRecruiterIds.length > 0) query.append('recruiterId', filters.selectedRecruiterIds.join(','));

      const response = await fetch(`/api/candidates/export?${query.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Error exporting candidate data." }));
        throw new Error(errorData.message);
      }
      const blob = await response.blob();
      const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'candidates_export.csv';
      downloadFile(blob, filename);

      toast.success('Candidates exported as CSV.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally { setIsLoading(false); }
  };

  const handleOpenEditPositionModal = (position: Position) => {
    setSelectedPositionForEdit(position);
    setIsEditPositionModalOpen(true);
  };

  const handlePositionEdited = async () => {
    toast.success('Position details have been saved.');
    setIsEditPositionModalOpen(false);
    if (sessionStatus === 'authenticated') {
        const posResponse = await fetch('/api/positions/all'); // Re-fetch all positions
        if (posResponse.ok) {
          const posData = await posResponse.json();
          setAvailablePositions(posData.data || []);
        }
        fetchPaginatedCandidates(filters, page, pageSize); // Refresh candidates list
    }
  };

  const handleOpenUploadModal = (candidate: Candidate) => {
    // For now, we'll redirect to the candidate detail page where the upload modal is available
    router.push(`/candidates/${candidate.id}`);
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
    // Ensure allCandidates is an array before calling filter
    const candidates = Array.isArray(allCandidates) ? allCandidates : [];
    // Filter out invalid candidates
    const validCandidates = candidates.filter(c => c && c.id && c.name);
    return aiMatchedCandidateIds !== null
      ? validCandidates.filter(c => aiMatchedCandidateIds.includes(c.id))
      : validCandidates;
  }, [allCandidates, aiMatchedCandidateIds]);


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
      fetchPaginatedCandidates(filters, page, pageSize); // Refresh list
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
    const prevCandidate = allCandidates.find(c => c.id === candidateId);
    const prevRecruiter = prevCandidate?.recruiter || null;
    // Optimistically update recruiter in UI
    setAllCandidates(prev =>
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
      const candidate = allCandidates.find(c => c.id === candidateId);
      const status = candidate?.status || 'Applied';
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recruiterId, status }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to assign recruiter' }));
        throw new Error(errorData.message || 'Failed to assign recruiter');
      }
      await refreshCandidateInList(candidateId);
      toast.success('Recruiter updated.');
    } catch (error) {
      // Revert recruiter in UI
      setAllCandidates(prev =>
        prev.map(c =>
          c.id === candidateId
            ? { ...c, recruiter: prevRecruiter }
            : c
        )
      );
      toast.error((error as Error).message);
    }
  };

  useEffect(() => {
    const handleRefresh = () => {
      debouncedFetchPaginatedCandidates(filters, page, pageSize);
    };
    window.addEventListener('refreshCandidateQueue', handleRefresh);
    return () => {
      window.removeEventListener('refreshCandidateQueue', handleRefresh);
    };
  }, [filters, page, pageSize, debouncedFetchPaginatedCandidates]);

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
        
        // Add a small delay to prevent rapid refreshes when modals open/close
        clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(() => {
          // console.log('Page became visible, refreshing candidate data...');
          lastRefreshTime = Date.now();
          debouncedFetchPaginatedCandidates(filters, page, pageSize);
        }, 1000); // Increased delay to 1 second
      }
    };

    const handleFocus = () => {
      if (sessionStatus === 'authenticated' && !isLoading && !isAiSearchActive) {
        const now = Date.now();
        if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
          return; // Skip refresh if too soon
        }
        
        // Add a small delay to prevent rapid refreshes when modals open/close
        clearTimeout(focusTimeout);
        focusTimeout = setTimeout(() => {
          // console.log('Window gained focus, refreshing candidate data...');
          lastRefreshTime = Date.now();
          debouncedFetchPaginatedCandidates(filters, page, pageSize);
        }, 1000); // Increased delay to 1 second
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
  }, [sessionStatus, isLoading, isAiSearchActive, debouncedFetchPaginatedCandidates, filters, page, pageSize]);

  // Ensure recruiter filter is set on client if user is a Recruiter
  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user?.role === 'Recruiter') {
      if (!filters.selectedRecruiterIds || filters.selectedRecruiterIds.length === 0) {
        setFilters(prev => ({
          ...prev,
          selectedRecruiterIds: [session.user.id],
        }));
      }
    }
  }, [sessionStatus, session?.user?.role, session?.user?.id, filters.selectedRecruiterIds]);

  // Ensure mappedCandidates useMemo is called before any return
  const mappedCandidates = useMemo(() => {
    let candidates = allCandidates.map(candidate => {
      if ((!candidate.position || !candidate.position.title) && candidate.positionId && availablePositions.length > 0) {
        const foundPosition = availablePositions.find(pos => pos.id === candidate.positionId);
        if (foundPosition) {
          return { ...candidate, position: foundPosition };
        }
      }
      return candidate;
    });
    // Filter by AI search if active
    if (isAiSearchActive && aiMatchedCandidateIds && aiMatchedCandidateIds.length > 0) {
      candidates = candidates.filter(c => aiMatchedCandidateIds.includes(c.id));
    }
    // If AI search is active and there are no matches, show empty list
    if (isAiSearchActive && aiMatchedCandidateIds && aiMatchedCandidateIds.length === 0) {
      candidates = [];
    }
    return candidates;
  }, [allCandidates, availablePositions, isAiSearchActive, aiMatchedCandidateIds]);

  // Centralized error UI for auth/permission
  if (authError || sessionStatus === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Authentication Error</h2>
        <p className="text-muted-foreground mb-4 max-w-md">You need to be signed in to view candidates.</p>
        <Button onClick={() => signIn(undefined, { callbackUrl: window.location.href })}>Sign In</Button>
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
  if (isLoading && allCandidates.length === 0 && !fetchError) {
    return ( <div className="flex h-screen w-screen items-center justify-center bg-background fixed inset-0 z-50"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div> );
  }
  if (fetchError && !isLoading) {
    const isMissingTableError = fetchError.toLowerCase().includes("relation") && fetchError.toLowerCase().includes("does not exist");
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Error Loading Candidates</h2>
        <p className="text-muted-foreground mb-4 max-w-md">{fetchError}</p>
        {isMissingTableError && ( <div className="mb-6 p-4 border border-destructive bg-destructive/10 rounded-md text-sm"> <p className="font-semibold">It looks like a required database table (e.g., &quot;Candidate&quot;, &quot;Position&quot;, &quot;User&quot;, &quot;RecruitmentStage&quot;) is missing or not accessible.</p> <p className="mt-1">This usually means the database initialization script (`pg-init-scripts/init-db.sql`) did not run correctly when the PostgreSQL Docker container started.</p> <p className="mt-2">Please refer to the troubleshooting steps in the `README.md` for guidance on how to resolve this, typically involving a clean Docker volume reset.</p> </div> )}
        <Button onClick={() => fetchPaginatedCandidates(filters, page, pageSize)} className="btn-primary-gradient">Try Again</Button>
      </div>
    );
  }

  // Paginate candidates for display
  const paginatedCandidates = useMemo(() => {
    if (isAiSearchActive && aiMatchedCandidateIds) {
      const filtered = mappedCandidates;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      return filtered.slice(start, end);
    }
    return mappedCandidates;
  }, [isAiSearchActive, aiMatchedCandidateIds, mappedCandidates, page, pageSize]);

  // For row numbering in table
  const baseIndex = useMemo(() => {
    if (isAiSearchActive && aiMatchedCandidateIds) {
      return (page - 1) * pageSize;
    }
    return (page - 1) * pageSize;
  }, [isAiSearchActive, aiMatchedCandidateIds, page, pageSize]);

  return (
    <div className="flex h-full relative">
      {/* Filter Sidebar */}
      {showFilters && (
        <aside className="w-80 min-w-[250px] border-r bg-card dark:bg-background transition-all flex flex-col h-screen">
          <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
            <span className="font-bold text-lg">Filters</span>
            <button
              className="ml-2 p-1 rounded hover:bg-muted"
              onClick={() => setShowFilters(false)}
              aria-label="Hide filters"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <CandidateFilters
              initialFilters={filters}
              onFilterChange={handleFilterChange}
              onAiSearch={handleAiSearch}
              onClearAllFilters={handleClearAllFilters}
              availablePositions={availablePositions}
              availableStages={availableStages}
              availableRecruiters={availableRecruiters}
              isLoading={isLoading || isAiSearching}
              isAiSearching={isAiSearching}
              advancedQuery={advancedQueryFromUrl}
            />
          </div>
        </aside>
      )}
      {/* Show button when sidebar is hidden */}
      {!showFilters && (
        <button
          className="absolute left-0 top-4 z-10 bg-card dark:bg-background border rounded-r p-1 shadow"
          onClick={() => setShowFilters(true)}
          aria-label="Show filters"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
      {/* Main Content */}
      <main className="flex-1 w-full space-y-6 min-w-0 p-6">
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
            (filters.minExperienceYears !== undefined && filters.minExperienceYears > 0) ||
            (filters.maxExperienceYears !== undefined && filters.maxExperienceYears < 50) ||
            (filters.selectedPositionIds && filters.selectedPositionIds.length > 0) ||
            (filters.selectedStatuses && filters.selectedStatuses.length > 0) ||
            (filters.selectedRecruiterIds && filters.selectedRecruiterIds.length > 0) ||
            filters.minFitScore !== 0 ||
            filters.maxFitScore !== 100 ||
            (filters.matchingMinFitScore !== undefined && filters.matchingMinFitScore !== 70) ||
            (filters.matchingMaxFitScore !== undefined && filters.matchingMaxFitScore !== 100) ||
            filters.applicationDateStart ||
            filters.applicationDateEnd ||
            aiSearchReasoning;

          if (!hasActiveFilters) return null;

          return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
              <Filter className="h-4 w-4" />
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
                  Skills: "{filters.skills}"
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
              {filters.minExperienceYears !== undefined && filters.minExperienceYears > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Min Experience: {filters.minExperienceYears} years
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
              {filters.minFitScore !== 0 && (
                <Badge variant="secondary" className="text-xs">
                  Min Score: {filters.minFitScore}
                </Badge>
              )}
              {filters.maxFitScore !== 100 && (
                <Badge variant="secondary" className="text-xs">
                  Max Score: {filters.maxFitScore}
                </Badge>
              )}
              {filters.matchingMinFitScore !== undefined && filters.matchingMinFitScore !== 70 && (
                <Badge variant="secondary" className="text-xs">
                  Matching Min: {filters.matchingMinFitScore}
                </Badge>
              )}
              {filters.matchingMaxFitScore !== undefined && filters.matchingMaxFitScore !== 100 && (
                <Badge variant="secondary" className="text-xs">
                  Matching Max: {filters.matchingMaxFitScore}
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

        {/* Loading Indicator for Filter Changes */}
        {(isLoading || isAiSearching) && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-md border border-amber-200 dark:border-amber-800">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{isAiSearching ? 'AI Searching...' : 'Loading candidates...'}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2 text-xs text-amber-600 hover:text-amber-700"
              onClick={() => {
                // Force a new search
                fetchPaginatedCandidates(filters, page, pageSize);
              }}
            >
              Retry
            </Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-4 w-full">
            {/* Candidate count badge */}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-muted text-foreground ">
              {isAiSearchActive && aiMatchedCandidateIds ? aiMatchedCandidateIds.length : total} Candidate{(isAiSearchActive && aiMatchedCandidateIds ? aiMatchedCandidateIds.length : total) !== 1 ? 's' : ''}
            </span>
            {selectedCandidateIds.size > 0 && canManageCandidates && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    Bulk Actions ({selectedCandidateIds.size}) <ChevronDown className="ml-2 h-4 w-4" />
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
            )}
            <div className="flex gap-2 items-center ml-auto">
              {/* Removed Clear All Filters button as per request */}
              {canManageCandidates && (
                <Button onClick={() => setIsBulkUploadModalOpen(true)} variant="default" className="w-full sm:w-auto"> <Zap className="mr-2 h-4 w-4" /> Upload CVs (Create via Resume) </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto"> More Actions <ChevronDown className="ml-2 h-4 w-4" /> </Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canManageCandidates && (
                    <DropdownMenuItem onSelect={() => setIsAddModalOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Manually
                    </DropdownMenuItem>
                  )}
                  {canImportCandidates && (<DropdownMenuItem onSelect={handleDownloadTemplate}> <FileDown className="mr-2 h-4 w-4" /> Download Import Template </DropdownMenuItem>)}
                                      {canExportCandidates && (
                      <>
                        <DropdownMenuItem onSelect={handleExportToExcel} disabled={isLoading}> 
                          <FileSpreadsheet className="mr-2 h-4 w-4" /> Export (Excel) 
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleExportToCsv} disabled={isLoading}> 
                          <FileSpreadsheet className="mr-2 h-4 w-4" /> Export (CSV) 
                        </DropdownMenuItem>
                      </>
                    )}
              
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          </div>
{/* AI Search Results */}
        {aiSearchReasoning && (
          <Alert variant="default" className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700">
            <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="font-semibold text-blue-700 dark:text-blue-300">AI Search Results</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              {aiSearchReasoning}
              {aiMatchedCandidateIds && aiMatchedCandidateIds.length === 0 && " No strong matches found."}
            </AlertDescription>
          </Alert>
        )}

        <CandidateTable
          candidates={paginatedCandidates}
          availablePositions={availablePositions}
          availableStages={availableStages}
          availableRecruiters={availableRecruiters}
          onAssignRecruiter={handleAssignRecruiter}
          onUpdateCandidate={handleUpdateCandidateAPI}
          onDeleteCandidate={handleDeleteCandidate}
          onOpenUploadModal={handleOpenUploadModal}
          onEditPosition={handleOpenEditPositionModal}
          isLoading={isLoading || isAiSearching}
          onRefreshCandidateData={refreshCandidateInList}
          selectedCandidateIds={selectedCandidateIds}
          onToggleSelectCandidate={handleToggleSelectCandidate}
          onToggleSelectAllCandidates={handleToggleSelectAllCandidates}
          isAllCandidatesSelected={isAllCandidatesSelected}
          page={page}
          pageSize={pageSize}
          baseIndex={baseIndex}
        />

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(1)}
              disabled={page === 1}
              aria-label="First page"
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
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
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
              onChange={e => {
                const newPageSize = Number(e.target.value);
                setPageSize(newPageSize);
                setPage(1); // Reset to first page when changing page size
              }}
              className="border rounded-md px-2 py-1 text-sm bg-background text-foreground"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
      </main>

      {canManageCandidates && <AddCandidateModal isOpen={isAddModalOpen} onOpenChange={setIsAddModalOpen} onAddCandidate={handleAddCandidateSubmit} availableStages={availableStages} />}
      {selectedPositionForEdit && ( <EditPositionModal isOpen={isEditPositionModalOpen} onOpenChange={(isOpen) => { setIsEditPositionModalOpen(isOpen); if (!isOpen) setSelectedPositionForEdit(null); }} position={selectedPositionForEdit} onEditPosition={handlePositionEdited} /> )}
      <AutomationUploadModal
        isOpen={isAutomationUploadModalOpen}
        onOpenChange={setIsAutomationUploadModalOpen}
      />
      {canManageCandidates && (
        <BulkUploadCVsModal
          isOpen={isBulkUploadModalOpen}
          onOpenChange={setIsBulkUploadModalOpen}
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
              <Select value={bulkNewRecruiterId || ''} onValueChange={(value) => setBulkNewRecruiterId(value === '___UNASSIGN___' ? null : value)}>
                <SelectTrigger id="bulk-new-recruiter">
                  <SelectValue placeholder="Select recruiter...">
                    {bulkNewRecruiterId ? availableRecruiters.find(r => r.id === bulkNewRecruiterId)?.name || 'Unknown' : 'Select recruiter...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="___UNASSIGN___">Unassign</SelectItem>
                    {availableRecruiters.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
    </div>
  );
}
