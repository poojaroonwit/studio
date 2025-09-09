import { useCallback, useRef, useEffect } from 'react';
import { CandidateFilterValues } from '@/components/candidates/CandidateFilters';
import { Candidate } from '@/lib/types';
import { safeFetch } from '@/lib/safe-fetch';

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
  const currentRequestRef = useRef<string | null>(null);
  const latestRequestIdRef = useRef<string | null>(null);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      // Cleanup function - no timeouts to clear
    };
  }, []);

  const fetchTableData = useCallback(async (currentFilters: CandidateFilterValues, currentPage: number, currentPageSize: number) => {
    if (sessionStatus !== 'authenticated') {
      return;
    }
    
    // Generate a unique request ID for this request
    const requestId = Math.random().toString(36).substring(2, 15);
    latestRequestIdRef.current = requestId;
    
    setIsFetching(true);
    setTableLoading(true);
    setTableError(null);
    
    try {
      const query = new URLSearchParams();
      
      // Check if we have an advanced query from URL and pass it to the API
      // When an advanced query is present, we intentionally ignore other sticky filters
      // so that "View All" from the dashboard yields results consistent with the card.
      const advancedQueryParam = searchParams.get('query');
      if (advancedQueryParam) {
        query.append('query', advancedQueryParam);
      }

      // Only append individual filters if NOT processing an advanced query
      if (!advancedQueryParam && currentFilters.name) {
        query.append('name', currentFilters.name);
        if (currentFilters.nameOperator) query.append('nameOperator', currentFilters.nameOperator);
      }
      if (!advancedQueryParam && currentFilters.email) {
        query.append('email', currentFilters.email);
        if (currentFilters.emailOperator) query.append('emailOperator', currentFilters.emailOperator);
      }
      if (!advancedQueryParam && currentFilters.phone) {
        query.append('phone', currentFilters.phone);
        if (currentFilters.phoneOperator) query.append('phoneOperator', currentFilters.phoneOperator);
      }
      if (!advancedQueryParam && currentFilters.selectedPositionIds && currentFilters.selectedPositionIds.length > 0) query.append('positionId', currentFilters.selectedPositionIds.join(','));
      if (!advancedQueryParam && currentFilters.selectedStatuses && currentFilters.selectedStatuses.length > 0) query.append('status', currentFilters.selectedStatuses.join(','));
      if (!advancedQueryParam && currentFilters.education) query.append('education', currentFilters.education);
      if (!advancedQueryParam && currentFilters.minAppliedJobFitScore !== undefined) query.append('minAppliedJobFitScore', String(currentFilters.minAppliedJobFitScore));
      if (!advancedQueryParam && currentFilters.maxAppliedJobFitScore !== undefined) query.append('maxAppliedJobFitScore', String(currentFilters.maxAppliedJobFitScore));
      if (!advancedQueryParam && currentFilters.minMatchingJobFitScore !== undefined) query.append('minMatchingJobFitScore', String(currentFilters.minMatchingJobFitScore));
      if (!advancedQueryParam && currentFilters.maxMatchingJobFitScore !== undefined) query.append('maxMatchingJobFitScore', String(currentFilters.maxMatchingJobFitScore));
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
      
      // Handle custom field filters
      if (currentFilters.customFieldFilters && Object.keys(currentFilters.customFieldFilters).length > 0) {
        for (const [fieldCode, value] of Object.entries(currentFilters.customFieldFilters)) {
          if (value !== undefined && value !== null && value !== '') {
            query.append(`customField_${fieldCode}`, String(value));
          }
        }
      }
      
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
      
      const apiUrl = `/api/candidates?${query.toString()}`;
      
      // console.log('🔍 API DEBUG: Making request to:', apiUrl);
      
      const result = await safeFetch(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache'
        },
        timeoutMs: 12000
      });
      
      if (!result.ok) {
        console.warn('Skipping failed endpoint /api/candidates:', result.error || result.status);
        setTableError(`Failed to fetch candidates: ${result.error}`);
        setFilteredCandidates([]);
        setTotal(0);
        return;
      }
      
      const data = result.data;
      
      // Check if this is still the latest request
      if (latestRequestIdRef.current !== requestId) {
        return;
      }
      
      if (data.data && Array.isArray(data.data)) {
        // console.log('🔍 API DEBUG: Received', data.data.length, 'candidates');
        setFilteredCandidates(data.data);
        setTotal(data.pagination?.total || data.data.length);
        setTableError(null);
      } else {
        // console.log('🔍 API DEBUG: Invalid data format received:', data);
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
      
      setTableLoading(false);
      setIsFetching(false);
    }
  }, [sessionStatus, searchParams, sortColumn, sortDirection]);

  // Create a debounced version for table refresh
  const debouncedFetchTableData = useCallback((currentFilters: CandidateFilterValues, currentPage: number, currentPageSize: number) => {
    fetchTableData(currentFilters, currentPage, currentPageSize);
  }, [fetchTableData]);

  return {
    fetchTableData,
    debouncedFetchTableData,
    currentRequestRef,
    latestRequestIdRef
  };
}
