import { useState, useCallback, useRef, useEffect } from 'react';
import { Candidate, CandidateStatus, Position, RecruitmentStage, UserProfile, CandidateSource } from '@/lib/types';
import { CandidateFilterValues } from '@/components/candidates/CandidateFilters';
import { toast } from 'react-hot-toast';
import { normalizeFitScore } from '@/lib/scoreUtils';
// Removed useSafeEffect import - no longer needed


interface UseCandidateDataProps {
  initialCandidates: Candidate[];
  initialAvailablePositions: Position[];
  initialAvailableStages: RecruitmentStage[];
  sessionStatus: string;
  serverAuthError: boolean;
  serverPermissionError: boolean;
  initialFetchError?: string;
  filters?: CandidateFilterValues;
}

export function useCandidateData({
  initialCandidates,
  initialAvailablePositions,
  initialAvailableStages,
  sessionStatus,
  serverAuthError,
  serverPermissionError,
  initialFetchError,
  filters
}: UseCandidateDataProps) {
  
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [allCandidatesForCounts, setAllCandidatesForCounts] = useState<Candidate[]>([]);
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [availableStages, setAvailableStages] = useState<RecruitmentStage[]>([]);
  const [availableRecruiters, setAvailableRecruiters] = useState<Pick<UserProfile, 'id' | 'name' | 'email' | 'avatarUrl'>[]>([]);
  const [availableSources, setAvailableSources] = useState<CandidateSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [hasInitialFetch, setHasInitialFetch] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(initialFetchError || null);
  const [authError, setAuthError] = useState(serverAuthError);
  const [permissionError, setPermissionError] = useState(serverPermissionError);

  // Add state for database fit score counts
  const [databaseFitScoreCounts, setDatabaseFitScoreCounts] = useState<{
    applied: Array<{ letter: string; count: number }>;
    matching: Array<{ letter: string; count: number }>;
  } | null>(null);
  
  // Add loading state for fit score counts
  const [isFitScoreCountsLoading, setIsFitScoreCountsLoading] = useState(false);

  // Add debouncing for fetch requests
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRequestRef = useRef<string | null>(null);
  const latestRequestIdRef = useRef<string | null>(null);
  const fetchRecruitersTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stableSetFilteredCandidates = useCallback((candidates: Candidate[] | ((prev: Candidate[]) => Candidate[])) => {
    setFilteredCandidates(candidates);
  }, []);

  const stableSetAllCandidatesForCounts = useCallback((candidates: Candidate[] | ((prev: Candidate[]) => Candidate[])) => {
    setAllCandidatesForCounts(candidates);
  }, []);

  const stableSetAvailablePositions = useCallback((positions: Position[] | ((prev: Position[]) => Position[])) => {
    setAvailablePositions(positions);
  }, []);

  const stableSetAvailableStages = useCallback((stages: RecruitmentStage[] | ((prev: RecruitmentStage[]) => RecruitmentStage[])) => {
    setAvailableStages(stages);
  }, []);

  const stableSetAvailableRecruiters = useCallback((recruiters: Pick<UserProfile, 'id' | 'name' | 'email' | 'avatarUrl'>[] | ((prev: Pick<UserProfile, 'id' | 'name' | 'email' | 'avatarUrl'>[]) => Pick<UserProfile, 'id' | 'name' | 'email' | 'avatarUrl'>[])) => {
    setAvailableRecruiters(recruiters);
  }, []);

  const stableSetAvailableSources = useCallback((sources: CandidateSource[] | ((prev: CandidateSource[]) => CandidateSource[])) => {
    setAvailableSources(sources);
  }, []);

  const stableSetIsLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const stableSetIsFetching = useCallback((fetching: boolean) => {
    setIsFetching(fetching);
  }, []);

  const stableSetHasInitialFetch = useCallback((hasFetch: boolean) => {
    setHasInitialFetch(hasFetch);
  }, []);

  const stableSetFetchError = useCallback((error: string | null) => {
    setFetchError(error);
  }, []);

  const stableSetAuthError = useCallback((error: boolean) => {
    setAuthError(error);
  }, []);

  const stableSetPermissionError = useCallback((error: boolean) => {
    setPermissionError(error);
  }, []);

  // Safe initial data setup - FIXED: Use regular useEffect and remove stable setter functions from dependencies
  useEffect(() => {
    const safeInitialCandidates = Array.isArray(initialCandidates) ? initialCandidates : [];
    const safeInitialAvailablePositions = Array.isArray(initialAvailablePositions) ? initialAvailablePositions : [];
    const safeInitialAvailableStages = Array.isArray(initialAvailableStages) ? initialAvailableStages : [];

    // Set initial data only once
    if (safeInitialCandidates.length > 0) {
      stableSetFilteredCandidates(safeInitialCandidates);
      stableSetAllCandidatesForCounts(safeInitialCandidates);
      stableSetHasInitialFetch(true);
    }

    if (safeInitialAvailablePositions.length > 0) {
      stableSetAvailablePositions(safeInitialAvailablePositions);
    }

    if (safeInitialAvailableStages.length > 0) {
      stableSetAvailableStages(safeInitialAvailableStages);
    }
  }, [initialCandidates, initialAvailablePositions, initialAvailableStages]);

  // Simplified helper function to normalize fit scores
  const normalizeFitScoreForCounts = useCallback((score: number | null | undefined): string => {
    if (score === null || score === undefined) return 'N/A';
    return normalizeFitScore(score).toString();
  }, []);

  // Fetch all candidates for counts (unfiltered, for accurate statistics)
  const fetchAllCandidatesForCounts = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return;

    try {
      stableSetIsLoading(true);
      const response = await fetch('/api/candidates?limit=10000&includeCounts=true');
      
      if (response.ok) {
        const data = await response.json();
        const candidates = data.candidates || [];
        stableSetAllCandidatesForCounts(candidates);
      } else {
        console.error('Failed to fetch all candidates for counts');
      }
    } catch (error) {
      console.error('Error fetching all candidates for counts:', error);
    } finally {
      stableSetIsLoading(false);
    }
  }, [sessionStatus, stableSetIsLoading, stableSetAllCandidatesForCounts]);

  // Fetch sources
  const fetchSources = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return;

    try {
      const response = await fetch('/api/settings/candidate-sources');
      if (response.ok) {
        const data = await response.json();
        stableSetAvailableSources(Array.isArray(data) ? data : (data.sources || []));
      }
    } catch (error) {
      console.error('Error fetching sources:', error);
    }
  }, [sessionStatus, stableSetAvailableSources]);

  // Fetch recruiters
  const fetchRecruiters = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return;

    try {
      const response = await fetch('/api/users?role=Recruiter');
      if (response.ok) {
        const data = await response.json();
        const recruiters = (data.users || []).map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl
        }));
        stableSetAvailableRecruiters(recruiters);
      }
    } catch (error) {
      console.error('Error fetching recruiters:', error);
    }
  }, [sessionStatus, stableSetAvailableRecruiters]);

  // Store current filters in a ref to avoid dependency issues
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Debounce ref for fit score counts
  const fitScoreCountsDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingFitScoreCountsRef = useRef(false);

  // Fetch fit score counts with circuit breaker and debouncing
  const fetchFitScoreCounts = async (forceRefresh = false) => {
    if (isFetchingFitScoreCountsRef.current && !forceRefresh) {
      return;
    }

    isFetchingFitScoreCountsRef.current = true;
    setIsFitScoreCountsLoading(true);

    try {
      // Build query parameters from current filters
      const params = new URLSearchParams();
      
      // Safety check: ensure filters is defined
      const currentFilters = filtersRef.current;
      if (!currentFilters) {
        console.warn('Filters not available for fit score counts');
        return;
      }
      
      // Add basic filters only
      if (currentFilters.selectedPositionIds && currentFilters.selectedPositionIds.length > 0) {
        params.append('positionId', currentFilters.selectedPositionIds.join(','));
      }
      if (currentFilters.selectedStatuses && currentFilters.selectedStatuses.length > 0) {
        params.append('status', currentFilters.selectedStatuses.join(','));
      }
      if (currentFilters.selectedRecruiterIds && currentFilters.selectedRecruiterIds.length > 0) {
        params.append('recruiterId', currentFilters.selectedRecruiterIds.join(','));
      }
      if (currentFilters.selectedSourceIds && currentFilters.selectedSourceIds.length > 0) {
        params.append('sourceId', currentFilters.selectedSourceIds.join(','));
      }

      const url = `/api/candidates/fit-score-counts?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const newCounts = {
          applied: (data.applied || []).map((item: any) => ({
            letter: item.letter,
            count: item.count
          })),
          matching: (data.matching || []).map((item: any) => ({
            letter: item.letter,
            count: item.count
          }))
        };
        setDatabaseFitScoreCounts(newCounts);
      } else {
        console.error('Failed to fetch fit score counts:', response.status);
        setDatabaseFitScoreCounts(null);
      }
    } catch (error: any) {
      console.error('Error fetching fit score counts:', error);
      setDatabaseFitScoreCounts(null);
    } finally {
      setIsFitScoreCountsLoading(false);
      isFetchingFitScoreCountsRef.current = false;
    }
  };

  // Debounced version for filter changes
  const debouncedFetchFitScoreCounts = useCallback(() => {
    fetchFitScoreCounts(false); // Use debouncing
  }, [fetchFitScoreCounts]);

  // Force refresh version for manual updates
  const forceRefreshFitScoreCounts = useCallback(() => {
    fetchFitScoreCounts(true); // Force refresh without debouncing
  }, [fetchFitScoreCounts]);

  // Fetch positions and stages if not provided initially - FIXED: Use regular useEffect
  useEffect(() => {
    const safeInitialAvailablePositions = Array.isArray(initialAvailablePositions) ? initialAvailablePositions : [];
    if (sessionStatus === 'authenticated' && safeInitialAvailablePositions.length === 0) {
      const fetchPositionsAndStages = async () => {
        try {
          const [positionsResponse, stagesResponse] = await Promise.all([
            fetch('/api/positions'),
            fetch('/api/recruitment-stages')
          ]);

          if (positionsResponse.ok) {
            const positionsData = await positionsResponse.json();
            setAvailablePositions(Array.isArray(positionsData) ? positionsData : (positionsData.positions || []));
          }

          if (stagesResponse.ok) {
            const stagesData = await stagesResponse.json();
            setAvailableStages(Array.isArray(stagesData) ? stagesData : (stagesData.stages || []));
          }
        } catch (error) {
          console.error('Error fetching positions and stages:', error);
        }
      };

      fetchPositionsAndStages();
    }
  }, [sessionStatus, initialAvailablePositions.length]);

  // Fetch stages independently if not provided initially - FIXED: Use regular useEffect
  useEffect(() => {
    const safeInitialAvailableStages = Array.isArray(initialAvailableStages) ? initialAvailableStages : [];
    if (sessionStatus === 'authenticated' && safeInitialAvailableStages.length === 0) {
      const fetchStages = async () => {
        try {
          const stagesResponse = await fetch('/api/recruitment-stages');

          if (stagesResponse.ok) {
            const stagesData = await stagesResponse.json();
            setAvailableStages(Array.isArray(stagesData) ? stagesData : (stagesData.stages || []));
          } else {
            // Could not load recruitment stages
          }
        } catch (error) {
          // A network error occurred while fetching stages
        }
      };
      fetchStages();
    }
  }, [sessionStatus, initialAvailableStages.length]);

  // Fetch full candidates on mount and when session changes - FIXED: Use regular useEffect
  useEffect(() => {
    const safeInitialCandidates = Array.isArray(initialCandidates) ? initialCandidates : [];
    if (sessionStatus === 'authenticated' && safeInitialCandidates.length === 0) {
      // Use a delay to ensure the component is fully mounted
      const timeoutId = setTimeout(() => {
        fetchAllCandidatesForCounts();
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [sessionStatus, initialCandidates.length, fetchAllCandidatesForCounts]);

  // Fetch sources and recruiters on mount - FIXED: Use regular useEffect
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchSources();
      fetchRecruiters();
    }
  }, [sessionStatus, fetchSources, fetchRecruiters]);

  // Fetch fit score counts on mount
  // Fetch fit score counts on mount - FIXED: Use regular useEffect instead of useSafeEffect
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      // Use a delay to ensure the component is fully mounted
      const timeoutId = setTimeout(() => {
        fetchFitScoreCounts();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [sessionStatus, fetchFitScoreCounts]);

  // Simplified helper function to normalize fit scores
  const getBestMatchingFitScore = (candidate: Candidate): number => {
    // Check JobMatch table first
    if (candidate.jobMatches && Array.isArray(candidate.jobMatches)) {
      const maxMatchScore = Math.max(...candidate.jobMatches.map(match => match.fitScore || 0));
      if (maxMatchScore >= 0) return normalizeFitScore(maxMatchScore);
    }
    
    // If no JobMatch, check parsedData.job_matches
    if (candidate.parsedData && typeof candidate.parsedData === 'object') {
      const parsed = candidate.parsedData as any;
      if (parsed.job_matches && Array.isArray(parsed.job_matches)) {
        const maxMatchScore = Math.max(...parsed.job_matches.map((match: any) => match.fitScore || 0));
        if (maxMatchScore >= 0) return normalizeFitScore(maxMatchScore);
      }
    }
    
    return 0;
  };

  const fetchCandidateById = useCallback(async (candidateId: string): Promise<Candidate | null> => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return null;
      }
      return await response.json();
    } catch (error) {
      return null;
    }
  }, []);

  const refreshCandidateInList = useCallback(async (candidateId: string, fetchTableData: (filters: CandidateFilterValues, page: number, pageSize: number) => void, filters: CandidateFilterValues, page: number, pageSize: number, aiMatchedCandidateIds: string[] | null) => {
    if (aiMatchedCandidateIds !== null) {
        toast('AI Search Active: Please clear AI search or re-run it to see specific updates.');
        return;
    }

    const updatedCandidate = await fetchCandidateById(candidateId);
    if (updatedCandidate) {
      stableSetFilteredCandidates(prev => prev.map(c => c.id === candidateId ? updatedCandidate : c));
      stableSetAllCandidatesForCounts(prev => prev.map(c => c.id === candidateId ? updatedCandidate : c));
    } else {
      toast.error('Could not refresh data for candidate. Attempting full list refresh.');
      fetchTableData(filters, page, pageSize);
    }
  }, [fetchCandidateById, stableSetFilteredCandidates, stableSetAllCandidatesForCounts]);

  // Optimistic update helper function
  const applyOptimisticUpdate = useCallback((candidateId: string, updates: Partial<Candidate>) => {
    stableSetFilteredCandidates(prev => prev.map(candidate => 
      candidate.id === candidateId 
        ? { ...candidate, ...updates, updatedAt: new Date().toISOString() }
        : candidate
    ));
    stableSetAllCandidatesForCounts(prev => prev.map(candidate => 
      candidate.id === candidateId 
        ? { ...candidate, ...updates, updatedAt: new Date().toISOString() }
        : candidate
    ));
  }, [stableSetFilteredCandidates, stableSetAllCandidatesForCounts]);

  // Revert optimistic update helper function
  const revertOptimisticUpdate = useCallback((candidateId: string, originalCandidate: Candidate) => {
    stableSetFilteredCandidates(prev => prev.map(candidate => 
      candidate.id === candidateId ? originalCandidate : candidate
    ));
    stableSetAllCandidatesForCounts(prev => prev.map(candidate => 
      candidate.id === candidateId ? originalCandidate : candidate
    ));
  }, [stableSetFilteredCandidates, stableSetAllCandidatesForCounts]);

  return {
    // State
    filteredCandidates,
    setFilteredCandidates: stableSetFilteredCandidates,
    allCandidatesForCounts,
    setAllCandidatesForCounts: stableSetAllCandidatesForCounts,
    availablePositions,
    setAvailablePositions: stableSetAvailablePositions,
    availableStages,
    setAvailableStages: stableSetAvailableStages,
    availableRecruiters,
    setAvailableRecruiters: stableSetAvailableRecruiters,
    availableSources,
    setAvailableSources: stableSetAvailableSources,
    isLoading,
    setIsLoading: stableSetIsLoading,
    isFetching,
    setIsFetching: stableSetIsFetching,
    hasInitialFetch,
    setHasInitialFetch: stableSetHasInitialFetch,
    fetchError,
    setFetchError: stableSetFetchError,
    authError,
    setAuthError: stableSetAuthError,
    permissionError,
    setPermissionError: stableSetPermissionError,

    // Refs
    fetchTimeoutRef,
    currentRequestRef,
    latestRequestIdRef,

    // Functions
    normalizeFitScore,
    getBestMatchingFitScore,
    fetchRecruiters,
    fetchSources,
    fetchAllCandidatesForCounts,
    fetchCandidateById,
    refreshCandidateInList,
    applyOptimisticUpdate,
    revertOptimisticUpdate,
    // Database-level fit score counts
    databaseFitScoreCounts,
    isFitScoreCountsLoading,
    fetchFitScoreCounts,
    debouncedFetchFitScoreCounts, // Expose debounced function
    forceRefreshFitScoreCounts // Expose force refresh function
  };
}
