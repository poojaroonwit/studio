import { useCallback, useRef } from 'react';
import { CandidateFilterValues } from '@/components/candidates/CandidateFilters';
import { Candidate } from '@/lib/types';

interface UseCandidateFetchingProps {
  sessionStatus: string;
  serverAuthError: boolean;
  serverPermissionError: boolean;
  isClearingFilters: boolean;
  hasInitialDataFetch: boolean;
  searchParams: URLSearchParams;
  sortColumn: string;
  sortDirection: 'asc' | 'desc' | null;
  setFilteredCandidates: (candidates: Candidate[]) => void;
  setTotal: (total: number) => void;
  setTableError: (error: string | null) => void;
  setTableLoading: (loading: boolean) => void;
  setIsFetching: (fetching: boolean) => void;
  setAuthError: (error: boolean) => void;
  setPermissionError: (error: boolean) => void;
  setFetchError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export function useCandidateFetching({
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
}: UseCandidateFetchingProps) {
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRequestRef = useRef<string | null>(null);
  const latestRequestIdRef = useRef<string | null>(null);

  const fetchTableData = useCallback(async (currentFilters: CandidateFilterValues, currentPage: number, currentPageSize: number) => {
    console.log('🔍 FETCH DEBUG: fetchTableData called with filters:', currentFilters);
    const requestId = `${Date.now()}-${Math.random()}`;
    latestRequestIdRef.current = requestId;

    if (sessionStatus !== 'authenticated') {
      console.log('🔍 FETCH DEBUG: Not authenticated, skipping fetch');
      setTableLoading(false);
      return;
    }
    
    // Prevent multiple simultaneous requests
    if (currentRequestRef.current) {
      console.log('🔍 FETCH DEBUG: Already fetching, skipping request');
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
      if (currentFilters.includeNoScoreInApplied) query.append('includeNoScoreInApplied', 'true');
      if (currentFilters.includeNoScoreInMatching) query.append('includeNoScoreInMatching', 'true');
      if (currentFilters.minExperienceYears !== undefined && (currentFilters.minExperienceYears > 0 || currentFilters.minExperienceYears === -1)) query.append('minExperienceYears', String(currentFilters.minExperienceYears));
      if (currentFilters.maxExperienceYears !== undefined && currentFilters.maxExperienceYears < 50) query.append('maxExperienceYears', String(currentFilters.maxExperienceYears));
      if (currentFilters.applicationDateStart) {
        query.append('applicationDateStart', currentFilters.applicationDateStart.toISOString());
      }
      if (currentFilters.applicationDateEnd) {
        query.append('applicationDateEnd', currentFilters.applicationDateEnd.toISOString());
      }
      if (currentFilters.selectedRecruiterIds && currentFilters.selectedRecruiterIds.length > 0) query.append('recruiterId', currentFilters.selectedRecruiterIds.join(','));
      if (currentFilters.selectedSourceIds && currentFilters.selectedSourceIds.length > 0) query.append('sourceId', currentFilters.selectedSourceIds.join(','));
      query.append('page', String(currentPage));
      query.append('limit', String(currentPageSize));
      // Add sorting
      if (sortColumn) query.append('sortColumn', sortColumn);
      // Send sortDirection - null/empty means unsorted, 'asc'/'desc' for explicit sorting
      if (sortDirection) {
        query.append('sortDirection', sortDirection);
      } else {
        // For unsorted state, send empty string to indicate no sorting
        query.append('sortDirection', '');
      }
      
      console.log('🔍 SORT DEBUG: sortColumn:', sortColumn, 'sortDirection:', sortDirection);
      

      
      if (currentFilters.location) {
        query.append('location', currentFilters.location);
        if (currentFilters.locationOperator) query.append('locationOperator', currentFilters.locationOperator);
      }
      if (currentFilters.skills && Array.isArray(currentFilters.skills)) {
        if (currentFilters.skills.length > 0) query.append('skills', currentFilters.skills.join(','));
      } else if (typeof currentFilters.skills === 'string' && currentFilters.skills) {
        query.append('skills', currentFilters.skills);
      }
      
      console.log('🔍 FETCH DEBUG: Fit score filter parameters being sent:', {
        minAppliedJobFitScore: currentFilters.minAppliedJobFitScore,
        maxAppliedJobFitScore: currentFilters.maxAppliedJobFitScore,
        minMatchingJobFitScore: currentFilters.minMatchingJobFitScore,
        maxMatchingJobFitScore: currentFilters.maxMatchingJobFitScore
      });
      
      const apiUrl = `/api/candidates?${query.toString()}`;
      
      console.log('🔍 FETCH DEBUG: Making API request to:', apiUrl);
      console.log('🔍 FETCH DEBUG: Query parameters:', Object.fromEntries(query.entries()));
      
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
      
      console.log('🔍 FETCH DEBUG: API response received:', {
        dataLength: data.data?.length || 0,
        total: data.pagination?.total || 0,
        hasData: !!data.data
      });
      
      // Check if this is still the latest request
      if (latestRequestIdRef.current !== requestId) {
        console.log('🔍 FETCH DEBUG: Request superseded, ignoring response');
        return;
      }
      
      if (data.data && Array.isArray(data.data)) {
        console.log('🔍 FETCH DEBUG: About to update candidates state with:', {
          candidatesCount: data.data.length,
          firstCandidate: data.data[0],
          lastCandidate: data.data[data.data.length - 1],
          totalFromAPI: data.pagination?.total
        });
        
        // Debug: Check fit scores of returned candidates
        if (currentFilters.minAppliedJobFitScore !== undefined || currentFilters.maxAppliedJobFitScore !== undefined) {
          console.log('🔍 FETCH DEBUG: Fit score filter applied. Candidates returned:', data.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            fitScore: c.fitScore
          })));
        }
        
        setFilteredCandidates(data.data);
        setTotal(data.pagination?.total || data.data.length);
        setTableError(null);
        console.log('🔍 FETCH DEBUG: Successfully updated table with', data.data.length, 'candidates');
      } else {
        console.log('🔍 FETCH DEBUG: No valid data received:', data);
        setFilteredCandidates([]);
        setTotal(0);
        setTableError('Invalid data format received from server');
        console.error('🔍 FETCH ERROR: Invalid data format:', data);
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
      console.log('🔍 FETCH DEBUG: Request completed');
    }
  }, [sessionStatus, searchParams, sortColumn, sortDirection]);

  // Create a debounced version for table refresh
  const debouncedFetchTableData = useCallback((currentFilters: CandidateFilterValues, currentPage: number, currentPageSize: number) => {
    console.log('🔍 DEBOUNCE DEBUG: debouncedFetchTableData called with:', {
      filters: currentFilters,
      page: currentPage,
      pageSize: currentPageSize
    });
    
    // Clear any pending timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    // Set a new timeout - increased for better stability
    fetchTimeoutRef.current = setTimeout(() => {
      console.log('🔍 DEBOUNCE DEBUG: Executing fetchTableData after debounce');
      fetchTableData(currentFilters, currentPage, currentPageSize);
    }, 200); // Increased debounce for better stability
  }, [fetchTableData]);

  return {
    fetchTableData,
    debouncedFetchTableData,
    fetchTimeoutRef,
    currentRequestRef,
    latestRequestIdRef
  };
}
