"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CandidateFilters, type CandidateFilterValues } from '@/components/candidates/CandidateFilters';
import { CandidateTable } from '@/components/candidates/CandidateTable';
import type { Candidate, CandidateStatus, Position, RecruitmentStage, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { PlusCircle, Users, ServerCrash, Zap, Loader2, FileDown, FileUp, ChevronDown, FileSpreadsheet, ShieldAlert, Brain, Trash2 as BulkTrashIcon, Edit as BulkEditIcon, ChevronLeft, ChevronRight, ChevronsUpDown, Check, Briefcase, X } from 'lucide-react';
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


interface CandidatesPageClientProps {
  initialCandidates: Candidate[];
  initialAvailablePositions: Position[];
  initialAvailableStages: RecruitmentStage[];
  authError?: boolean;
  permissionError?: boolean;
  initialFetchError?: string; // Added for server-side errors
  initialFilters?: CandidateFilterValues;
}

function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
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
    
    console.log('Initial filters set:', baseFilters);
    return baseFilters;
  });

  // Debug: Log whenever filters change
  useEffect(() => {
    console.log('Filters state changed to:', filters);
  }, [filters]);



  const safeInitialCandidates = Array.isArray(initialCandidates) ? initialCandidates : [];
  const safeInitialAvailablePositions = Array.isArray(initialAvailablePositions) ? initialAvailablePositions : [];
  const safeInitialAvailableStages = Array.isArray(initialAvailableStages) ? initialAvailableStages : [];

  const [allCandidates, setAllCandidates] = useState<Candidate[]>(safeInitialCandidates || []);
  const [availablePositions, setAvailablePositions] = useState<Position[]>(safeInitialAvailablePositions || []);
  const [availableStages, setAvailableStages] = useState<RecruitmentStage[]>(safeInitialAvailableStages || []);
  const [availableRecruiters, setAvailableRecruiters] = useState<Pick<UserProfile, 'id' | 'name'>[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [isFetching, setIsFetching] = useState(false); // Track if we're currently fetching
  const [aiSearchReasoning, setAiSearchReasoning] = useState<string | null>(null);
  const [aiMatchedCandidateIds, setAiMatchedCandidateIds] = useState<string[] | null>(null);
  const [hasInitialFetch, setHasInitialFetch] = useState(false);
  const [hasInitialDataFetch, setHasInitialDataFetch] = useState(false);
  const [advancedQueryFromUrl, setAdvancedQueryFromUrl] = useState<string>('');
  const [isClearingFilters, setIsClearingFilters] = useState(false);

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
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const canImportCandidates = session?.user?.role === 'Admin' || session?.user?.modulePermissions?.includes('CANDIDATES_IMPORT');
  const canExportCandidates = session?.user?.role === 'Admin' || session?.user?.modulePermissions?.includes('CANDIDATES_EXPORT');
  const canManageCandidates = session?.user?.role === 'Admin' || session?.user?.modulePermissions?.includes('CANDIDATES_MANAGE');

  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isAutomationUploadModalOpen, setIsAutomationUploadModalOpen] = useState(false);

  // Collapsible sidebar state
  const [showFilters, setShowFilters] = useState(true);

  // Handle initial URL parameters (only if not clearing filters)
  useEffect(() => {
    if (isClearingFilters) {
      return;
    }
    
    // Apply URL parameters if they exist and haven't been applied yet
    let hasChanges = false;
    const newFilters = { ...filters };
    
    if (urlPositionId && (!filters.selectedPositionIds || filters.selectedPositionIds.length === 0)) {
      newFilters.selectedPositionIds = [urlPositionId];
      console.log('Setting position filter from URL:', urlPositionId);
      hasChanges = true;
    }
    if (urlRecruiterId && (!filters.selectedRecruiterIds || filters.selectedRecruiterIds.length === 0)) {
      newFilters.selectedRecruiterIds = [urlRecruiterId];
      console.log('Setting recruiter filter from URL:', urlRecruiterId);
      hasChanges = true;
    }
    if (urlStatus && (!filters.selectedStatuses || filters.selectedStatuses.length === 0)) {
      newFilters.selectedStatuses = [urlStatus];
      console.log('Setting status filter from URL:', urlStatus);
      hasChanges = true;
    }
    
    if (hasChanges) {
      setFilters(newFilters);
    }
  }, [urlPositionId, urlRecruiterId, urlStatus, isClearingFilters, filters]);

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
      const recruitersData: UserProfile[] | undefined = await response.json(); 
      if (!recruitersData || !Array.isArray(recruitersData)) {
        console.warn("Invalid data format received for recruiters, using empty list");
        setAvailableRecruiters([]);
        return;
      }
      setAvailableRecruiters(recruitersData.map(r => ({ id: r.id, name: r.name })));
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


  // Use ref to track session status to avoid dependency issues
  const sessionStatusRef = useRef(sessionStatus);
  sessionStatusRef.current = sessionStatus;
  
  // Use ref to track current request to prevent infinite loops
  const currentRequestRef = useRef<string | null>(null);
  


  const fetchPaginatedCandidates = useCallback(async (currentFilters: CandidateFilterValues, page: number, pageSize: number) => {
    console.log('fetchPaginatedCandidates called with:', { currentFilters, page, pageSize });
    if (sessionStatusRef.current !== 'authenticated') {
      setIsLoading(false);
      return;
    }
    
    // Prevent multiple simultaneous requests
    if (isFetching) {
      console.log('fetchPaginatedCandidates: Already fetching, skipping request');
      return;
    }
    
    setIsFetching(true);
    setIsLoading(true);
    setFetchError(null);
    setAuthError(false);
    setPermissionError(false);
    setAiMatchedCandidateIds(null);
    setAiSearchReasoning(null);
    try {
      const query = new URLSearchParams();
      if (currentFilters.name) query.append('name', currentFilters.name);
      if (currentFilters.email) query.append('email', currentFilters.email);
      if (currentFilters.phone) query.append('phone', currentFilters.phone);
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
            setAllCandidates([]);
            return;
        }
        setFetchError(errorMessage);
        setAllCandidates([]);
        return;
      }
      const data = await response.json();
      
      const candidatesArray = Array.isArray(data.data) ? data.data : [];
      const totalCount = data.pagination?.total || 0;
      
      setAllCandidates(candidatesArray);
      setTotal(totalCount);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Request timeout - server may be overloaded');
        setFetchError('Request timeout - please try again in a moment');
      } else {
      const errorMessage = (error as Error).message || "Could not load candidate data.";
       if (!(errorMessage.toLowerCase().includes("unauthorized") || errorMessage.toLowerCase().includes("forbidden"))) {
        setFetchError(errorMessage);
        }
      }
      setAllCandidates([]);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
      currentRequestRef.current = null; // Clear the current request ref
    }
  }, []); // Removed sessionStatus dependency to prevent recreation

  const handleAiSearch = async (aiQuery: string) => {
    if (!aiQuery.trim()) {
      toast("Please enter a search query for AI search.");
      return;
    }
    setIsAiSearching(true);
    setFetchError(null);
    setAiSearchReasoning(null);
    setAiMatchedCandidateIds(null);
    try {
      const response = await fetch('/api/ai/search-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery }),
      });
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
      console.error("AI Search Error:", error);
      toast.error((error as Error).message);
      setAiMatchedCandidateIds([]);
    } finally {
      setIsAiSearching(false);
    }
  };

  useEffect(() => {
    // Set initial loading state
    if (safeInitialCandidates.length === 0 && !initialFetchError) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
    
    if (sessionStatus === 'authenticated' && !serverAuthError && !serverPermissionError) {
      // Use a longer delay to give server time to start up
      const timeoutId = setTimeout(() => {
      fetchRecruiters(); // Fetch recruiters on client side
      }, 1000); // Increased delay to 1 second
      
      return () => clearTimeout(timeoutId);
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
    console.log('Filter change useEffect triggered with filters:', filters);
    
    // Skip if not authenticated or has errors
    if (sessionStatus !== 'authenticated' || serverAuthError || serverPermissionError) {
      return;
    }
    
    // Skip if we're currently clearing filters
    if (isClearingFilters) {
      console.log('Skipping filter change useEffect - currently clearing filters');
      return;
    }
    
    // Create a unique request ID to prevent infinite loops
    const requestId = JSON.stringify({ filters, page, pageSize });
    if (currentRequestRef.current === requestId) {
      console.log('Skipping fetch - same request already in progress');
      return;
    }
    
    currentRequestRef.current = requestId;
    console.log('Fetching candidates due to filter change');
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
            fetch('/api/positions'),
            fetch('/api/settings/recruitment-stages')
          ]);

          if (posResponse.ok) {
            const posData = await posResponse.json();
            setAvailablePositions(posData.positions || posData.data || []);
          } else {
            console.error("Failed to fetch positions");
            toast.error("Could not load the list of available positions.");
          }

          if (stagesResponse.ok) {
            const stagesData = await stagesResponse.json();
            setAvailableStages(Array.isArray(stagesData) ? stagesData : (stagesData.stages || []));
          } else {
            console.error("Failed to fetch recruitment stages");
            toast.error("Could not load recruitment stages.");
          }
        } catch (error) {
          console.error("Error fetching positions or stages:", error);
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

  useEffect(() => {
    const eventSource = new EventSource('/api/candidates/sse');
    
    eventSource.onerror = (error) => {
      console.error('[SSE] SSE connection error for candidates page:', error);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const updatedCandidate = JSON.parse(event.data);
        if (updatedCandidate.deleted && updatedCandidate.id) {
          // Remove candidate from list
          setAllCandidates(prev => prev.filter(c => c.id !== updatedCandidate.id));
        } else {
          setAllCandidates(prev => {
            const idx = prev.findIndex(c => c.id === updatedCandidate.id);
            if (idx !== -1) {
              // Update existing candidate
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...updatedCandidate };
              return updated;
            } else {
              // Insert new candidate at the top
              return [updatedCandidate, ...prev];
            }
          });
        }
      } catch (e) {
        // Ignore parse errors
      }
    };
    
    // Listen for recruitment stage updates
    eventSource.addEventListener('recruitment-stages', (event: MessageEvent) => {
      try {
        const updatedStages = JSON.parse(event.data);
        setAvailableStages(updatedStages);
      } catch (e) {
        console.error('Error parsing recruitment stages update:', e);
      }
    });
    
    // Cleanup function
    return () => {
      eventSource.close();
    };
  }, []);


  // Add a ref to track the debounce timeout
  const filterChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAppliedFiltersRef = useRef<string>('');

  const handleFilterChange = (newFilters: CandidateFilterValues) => {
    console.log('handleFilterChange called with:', newFilters);
    
    // Skip if we're currently clearing filters
    if (isClearingFilters) {
      console.log('Skipping filter change - currently clearing filters');
      return;
    }
    
    // Clear any existing timeout
    if (filterChangeTimeoutRef.current) {
      clearTimeout(filterChangeTimeoutRef.current);
    }

    // Debounce the filter change to prevent rapid successive calls
    filterChangeTimeoutRef.current = setTimeout(() => {
      console.log('Applying debounced filter change');
    const combinedFilters = { ...filters, ...newFilters, aiSearchQuery: undefined };
      
      // Check if filters have actually changed to prevent unnecessary updates
      const currentFiltersString = JSON.stringify(filters);
      const newFiltersString = JSON.stringify(combinedFilters);
      
      if (currentFiltersString === newFiltersString) {
        console.log('Filters unchanged, skipping update');
        return;
      }
      
      // Update URL parameters to reflect the new filters
      const params = new URLSearchParams();
      
      // Check if all filters are cleared (reset to defaults)
      const isAllFiltersCleared = !combinedFilters.name && !combinedFilters.email && !combinedFilters.phone && 
          !combinedFilters.education && !combinedFilters.selectedPositionIds?.length && 
          !combinedFilters.selectedStatuses?.length && !combinedFilters.selectedRecruiterIds?.length &&
          combinedFilters.minFitScore === 0 && combinedFilters.maxFitScore === 100 &&
          combinedFilters.matchingMinFitScore === 70 && combinedFilters.matchingMaxFitScore === 100 &&
          !combinedFilters.applicationDateStart && !combinedFilters.applicationDateEnd;

      // If all filters are cleared, don't add any parameters to URL (this will clear the URL parameters)
      // This ensures that when "Clear Filter" is clicked, the URL is cleaned up
      if (!isAllFiltersCleared) {
        // Check if this is an advanced query (from URL or advanced query input)
        const currentQuery = searchParams.get('query');
        if (currentQuery && !isAllFiltersCleared) {
          // If we have an advanced query and filters are not being cleared, keep the query parameter
          params.set('query', currentQuery);
        } else {
          // Add individual non-empty filters to URL parameters
          if (combinedFilters.name) params.set('name', combinedFilters.name);
          if (combinedFilters.email) params.set('email', combinedFilters.email);
          if (combinedFilters.phone) params.set('phone', combinedFilters.phone);
          if (combinedFilters.education) params.set('education', combinedFilters.education);
          if (combinedFilters.selectedPositionIds && combinedFilters.selectedPositionIds.length > 0) {
            params.set('positionId', combinedFilters.selectedPositionIds.join(','));
          }
          if (combinedFilters.selectedStatuses && combinedFilters.selectedStatuses.length > 0) {
            params.set('status', combinedFilters.selectedStatuses.join(','));
          }
          if (combinedFilters.selectedRecruiterIds && combinedFilters.selectedRecruiterIds.length > 0) {
            params.set('recruiterId', combinedFilters.selectedRecruiterIds.join(','));
          }
          if (combinedFilters.minFitScore !== undefined && combinedFilters.minFitScore > 0) {
            params.set('minFitScore', String(combinedFilters.minFitScore));
          }
          if (combinedFilters.maxFitScore !== undefined && combinedFilters.maxFitScore < 100) {
            params.set('maxFitScore', String(combinedFilters.maxFitScore));
          }
          if (combinedFilters.matchingMinFitScore !== undefined && combinedFilters.matchingMinFitScore > 70) {
            params.set('matchingFitScoreMin', String(combinedFilters.matchingMinFitScore));
          }
          if (combinedFilters.matchingMaxFitScore !== undefined && combinedFilters.matchingMaxFitScore < 100) {
            params.set('matchingFitScoreMax', String(combinedFilters.matchingMaxFitScore));
          }
          if (combinedFilters.applicationDateStart) {
            params.set('applicationDateStart', combinedFilters.applicationDateStart.toISOString().slice(0, 10));
          }
          if (combinedFilters.applicationDateEnd) {
            params.set('applicationDateEnd', combinedFilters.applicationDateEnd.toISOString().slice(0, 10));
          }
        }
      }
      
      // Update the URL without triggering a page reload
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
      
      // Always apply the filters - the useEffect will handle deduplication
    setFilters(combinedFilters);
    setAiMatchedCandidateIds(null);
    setAiSearchReasoning(null);
      // Reset page to 1 when filters change
      setPage(1);
    }, 300); // 300ms debounce
  };

  const handleClearAllFilters = () => {
    console.log('handleClearAllFilters called');
    
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
    setAiMatchedCandidateIds(null);
    setAiSearchReasoning(null);
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
        console.error(`Failed to fetch candidate ${candidateId}: ${errorData.message || response.statusText}`);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching candidate ${candidateId}:`, error);
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
      console.error("Error updating candidate:", error);
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
      console.error("Error deleting candidate:", error);
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
        console.error("Error adding candidate:", error);
        toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutomatedProcessingStart = () => {
    toast('Processing Started: Resume sent for automated processing. Candidate list will refresh if successful.');
    setTimeout(() => { fetchPaginatedCandidates(filters, page, pageSize); }, 15000); // Optimistic refresh after 15s
  };

  const handleDownloadCsvTemplateGuide = () => {
    const headers = [
      "name", "email", "phone", "positionId", "fitScore", "status", "applicationDate",
      "parsedData.cv_language",
      "parsedData.personal_info.firstname", "parsedData.personal_info.lastname",
      "parsedData.personal_info.title_honorific", "parsedData.personal_info.nickname",
      "parsedData.personal_info.location", "parsedData.personal_info.introduction_aboutme",
      "parsedData.contact_info.email", "parsedData.contact_info.phone",
      "parsedData.education", "parsedData.experience", "parsedData.skills",
      "parsedData.job_suitable", "parsedData.job_matches"
    ];
    const exampleRows = [
      ["Sample Candidate", "candidate@example.com", "555-0000", "position-uuid", "85", "Applied", new Date().toISOString(),
       "EN", "Sample", "Candidate", "Mr.", "Sam", "City, Country", "Professional summary.",
       "candidate@example.com", "555-0000",
       JSON.stringify([{university:"University",major:"Field of Study"}]),
       JSON.stringify([{company:"Company",position:"Position"}]),
       JSON.stringify([{segment_skill:"Skills",skill:["Skill 1","Skill 2"]}]),
       JSON.stringify([{suitable_career:"Career Path"}]),
       JSON.stringify([{jobTitle:"Job Title",fitScore:85}])
      ],
    ];
     let csvContent = headers.join(',') + '\n';
    exampleRows.forEach(row => {
        csvContent += row.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    csvContent += "\nNOTE: For array fields, provide a valid JSON string representation of the array of objects, or leave blank (e.g., []).";

    downloadFile(csvContent, 'candidates_template.csv', 'text/csv;charset=utf-8;');
    toast.success('A CSV template for candidates has been downloaded.');
  };

  const handleExportToCsv = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
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
      downloadFile(await blob.text(), filename, blob.type);

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
        const posResponse = await fetch('/api/positions'); // Re-fetch all positions
        if (posResponse.ok) setAvailablePositions(await posResponse.json());
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

  // Pagination controls
  const totalPages = Math.ceil(total / pageSize);

  // Add handler for assigning recruiter inline
  const handleAssignRecruiter = async (candidateId: string, recruiterId: string | null) => {
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
      toast.error((error as Error).message);
    }
  };

  useEffect(() => {
    const handleRefresh = () => {
      fetchPaginatedCandidates(filters, page, pageSize);
    };
    window.addEventListener('refreshCandidateQueue', handleRefresh);
    return () => {
      window.removeEventListener('refreshCandidateQueue', handleRefresh);
    };
  }, [filters, page, pageSize, fetchPaginatedCandidates]);

  // Refresh data when page becomes visible (e.g., when navigating back from candidate detail)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && sessionStatus === 'authenticated' && !isLoading) {
        console.log('Page became visible, refreshing candidate data...');
        // Refresh data when page becomes visible
        fetchPaginatedCandidates(filters, page, pageSize);
      }
    };

    const handleFocus = () => {
      if (sessionStatus === 'authenticated' && !isLoading) {
        console.log('Window gained focus, refreshing candidate data...');
        // Refresh data when window regains focus
        fetchPaginatedCandidates(filters, page, pageSize);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [sessionStatus, isLoading, fetchPaginatedCandidates, filters, page, pageSize]);

  if (sessionStatus === 'loading') {
    // Show a loading spinner while session is being established
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background fixed inset-0 z-50">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Show loading while session is being determined
  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background fixed inset-0 z-50">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (authError) {
    return ( <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4"> <ShieldAlert className="w-16 h-16 text-destructive mb-4" /> <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h2> <p className="text-muted-foreground mb-4 max-w-md">You need to be signed in to view this page.</p> <Button onClick={() => signIn(undefined, { callbackUrl: pathname })} className="btn-primary-gradient">Sign In</Button> </div> );
  }
  if (permissionError) {
     return ( <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4"> <ShieldAlert className="w-16 h-16 text-destructive mb-4" /> <h2 className="text-2xl font-semibold text-foreground mb-2">Permission Denied</h2> <p className="text-muted-foreground mb-4 max-w-md">{fetchError || "You do not have sufficient permissions to view this page."}</p> <Button onClick={() => router.push('/')} className="btn-primary-gradient">Go to Dashboard</Button> </div> );
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

  return (
    <div className="flex h-full relative">
      {/* Filter Sidebar */}
      {showFilters && (
        <aside className="w-80 min-w-[250px] border-r bg-card dark:bg-background transition-all flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <span className="font-bold text-lg">Filters</span>
            <button
              className="ml-2 p-1 rounded hover:bg-muted"
              onClick={() => setShowFilters(false)}
              aria-label="Hide filters"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1">
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
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-4 w-full">
            {/* Candidate count badge */}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-muted text-foreground ">
              {displayedCandidates.length} Candidate{displayedCandidates.length !== 1 ? 's' : ''}
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
                <Button onClick={() => setIsBulkUploadModalOpen(true)} className="w-full sm:w-auto btn-primary-gradient"> <Zap className="mr-2 h-4 w-4" /> Upload CVs (Create via Resume) </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto"> More Actions <ChevronDown className="ml-2 h-4 w-4" /> </Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canManageCandidates && (
                    <DropdownMenuItem onSelect={() => setIsAddModalOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Manually
                    </DropdownMenuItem>
                  )}
                  {canImportCandidates && (<DropdownMenuItem onSelect={handleDownloadCsvTemplateGuide}> <FileDown className="mr-2 h-4 w-4" /> Download CSV Template </DropdownMenuItem>)}
                  {canExportCandidates && (<DropdownMenuItem onSelect={handleExportToCsv} disabled={isLoading}> <FileSpreadsheet className="mr-2 h-4 w-4" /> Export (CSV) </DropdownMenuItem>)}
              
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

        {(isLoading || isAiSearching) && !fetchError ? ( 
          <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-card shadow"> 
            <Users className="w-16 h-16 text-muted-foreground animate-pulse mb-4" /> 
            <h3 className="text-xl font-semibold text-foreground"> 
              {isAiSearching ? "AI Searching Candidates..." : "Loading Candidates..."}
            </h3> 
            <p className="text-muted-foreground">Please wait while we fetch the data.</p> 
            {isLoading && (
              <p className="text-sm text-muted-foreground mt-2">
                If this takes too long, the server may be starting up. Please wait a moment and refresh.
              </p>
            )}
          </div>
        ) : (
          <CandidateTable
            candidates={displayedCandidates}
            availablePositions={availablePositions}
            availableStages={availableStages}
            availableRecruiters={availableRecruiters}
            onAssignRecruiter={handleAssignRecruiter}
            onUpdateCandidate={handleUpdateCandidateAPI}
            onDeleteCandidate={handleDeleteCandidate}
            onOpenUploadModal={handleOpenUploadModal}
            onEditPosition={handleOpenEditPositionModal}
            isLoading={(isLoading || isAiSearching) && displayedCandidates.length > 0 && !fetchError}
            onRefreshCandidateData={refreshCandidateInList}
            selectedCandidateIds={selectedCandidateIds}
            onToggleSelectCandidate={handleToggleSelectCandidate}
            onToggleSelectAllCandidates={handleToggleSelectAllCandidates}
            isAllCandidatesSelected={isAllCandidatesSelected}
          />
        )}

        <div className="flex justify-center items-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>Prev</Button>
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i + 1}
              variant={page === i + 1 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page === totalPages}>Next</Button>
        </div>
      </main>

      {canManageCandidates && <AddCandidateModal isOpen={isAddModalOpen} onOpenChange={setIsAddModalOpen} onAddCandidate={handleAddCandidateSubmit} availablePositions={availablePositions} availableStages={availableStages} />}
      {selectedPositionForEdit && ( <EditPositionModal isOpen={isEditPositionModalOpen} onOpenChange={(isOpen) => { setIsEditPositionModalOpen(isOpen); if (!isOpen) setSelectedPositionForEdit(null); }} position={selectedPositionForEdit} onEditPosition={handlePositionEdited} /> )}
      <AutomationUploadModal
        isOpen={isAutomationUploadModalOpen}
        onOpenChange={setIsAutomationUploadModalOpen}
        onUploadSuccess={() => fetchPaginatedCandidates(filters, page, pageSize)}
      />
      {canManageCandidates && (
        <BulkUploadCVsModal
          isOpen={isBulkUploadModalOpen}
          onOpenChange={setIsBulkUploadModalOpen}
          onUploadSuccess={() => fetchPaginatedCandidates(filters, page, pageSize)}
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
