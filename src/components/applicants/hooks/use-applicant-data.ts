import { useState, useCallback, useRef, useEffect } from 'react';
import type { Applicant, ApplicantStatus, Position, RecruitmentStage, UserProfile, ApplicantSource } from '@/lib/types';
import type { ApplicantFilterValues } from '@/components/applicants/ApplicantFilters';
import { toast } from 'react-hot-toast';
import { normalizeFitScore } from '@/lib/scoreUtils';
import { safeFetch } from '@/lib/safe-fetch';

interface UseApplicantDataProps {
  initialApplicants: Applicant[];
  initialAvailablePositions: Position[];
  initialAvailableStages: RecruitmentStage[];
  sessionStatus: string;
  serverAuthError: boolean;
  serverPermissionError: boolean;
  initialFetchError?: string;
  filters?: ApplicantFilterValues;
}

export function useApplicantData({
  initialApplicants,
  initialAvailablePositions,
  initialAvailableStages,
  sessionStatus,
  serverAuthError,
  serverPermissionError,
  initialFetchError,
  filters
}: UseApplicantDataProps) {
  
  const [filteredApplicants, setFilteredApplicants] = useState<Applicant[]>([]);
  const [allApplicantsForCounts, setAllApplicantsForCounts] = useState<Applicant[]>([]);
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [availableStages, setAvailableStages] = useState<RecruitmentStage[]>([]);
  const [availableRecruiter, setAvailableRecruiter] = useState<Pick<UserProfile, 'id' | 'name' | 'email' | 'avatarUrl'>[]>([]);
  const [availableSources, setAvailableSources] = useState<ApplicantSource[]>([]);
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

  const stableSetFilteredApplicants = useCallback((applicants: Applicant[] | ((prev: Applicant[]) => Applicant[])) => {
    setFilteredApplicants(applicants);
  }, []);

  const stableSetAllApplicantsForCounts = useCallback((applicants: Applicant[] | ((prev: Applicant[]) => Applicant[])) => {
    setAllApplicantsForCounts(applicants);
  }, []);

  const stableSetAvailablePositions = useCallback((positions: Position[] | ((prev: Position[]) => Position[])) => {
    setAvailablePositions(positions);
  }, []);

  const stableSetAvailableStages = useCallback((stages: RecruitmentStage[] | ((prev: RecruitmentStage[]) => RecruitmentStage[])) => {
    setAvailableStages(stages);
  }, []);

  const stableSetAvailableRecruiter = useCallback((recruiters: Pick<UserProfile, 'id' | 'name' | 'email' | 'avatarUrl'>[] | ((prev: Pick<UserProfile, 'id' | 'name' | 'email' | 'avatarUrl'>[]) => Pick<UserProfile, 'id' | 'name' | 'email' | 'avatarUrl'>[])) => {
    setAvailableRecruiter(recruiters);
  }, []);

  const stableSetAvailableSources = useCallback((sources: ApplicantSource[] | ((prev: ApplicantSource[]) => ApplicantSource[])) => {
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

  // Safe initial data setup
  useEffect(() => {
    const safeInitialApplicants = Array.isArray(initialApplicants) ? initialApplicants : [];
    const safeInitialAvailablePositions = Array.isArray(initialAvailablePositions) ? initialAvailablePositions : [];
    const safeInitialAvailableStages = Array.isArray(initialAvailableStages) ? initialAvailableStages : [];

    // Set initial data only once
    if (safeInitialApplicants.length > 0) {
      stableSetFilteredApplicants(safeInitialApplicants);
      stableSetAllApplicantsForCounts(safeInitialApplicants);
      stableSetHasInitialFetch(true);
    }

    if (safeInitialAvailablePositions.length > 0) {
      stableSetAvailablePositions(safeInitialAvailablePositions);
    }

    if (safeInitialAvailableStages.length > 0) {
      stableSetAvailableStages(safeInitialAvailableStages);
    }
  }, [initialApplicants, initialAvailablePositions, initialAvailableStages, stableSetFilteredApplicants, stableSetAllApplicantsForCounts, stableSetHasInitialFetch, stableSetAvailablePositions, stableSetAvailableStages]);

  // Fetch all applicants for counts (unfiltered, for accurate statistics)
  const fetchAllApplicantsForCounts = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return;

    try {
      stableSetIsLoading(true);
      const result = await safeFetch<{ applicants: Applicant[] }>(
        '/api/applicants?limit=10000&includeCounts=true',
        { timeoutMs: 10000 }
      );
      
      if (result.ok && result.data) {
        const applicants = result.data.applicants || [];
        stableSetAllApplicantsForCounts(applicants);
      } else {
        console.warn('Skipping failed endpoint /api/applicants (counts):', result.error || result.status);
      }
    } catch (error) {
      console.error('Error fetching all applicants for counts:', error);
    } finally {
      stableSetIsLoading(false);
    }
  }, [sessionStatus, stableSetIsLoading, stableSetAllApplicantsForCounts]);

  // Fetch sources
  const fetchSources = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return;

    try {
      const result = await safeFetch<ApplicantSource[] | { sources: ApplicantSource[] }>(
        '/api/settings/applicant-sources',
        { timeoutMs: 8000 }
      );
      if (result.ok && result.data) {
        stableSetAvailableSources(Array.isArray(result.data) ? result.data : (result.data.sources || []));
      }
    } catch (error) {
      // Error fetching sources
    }
  }, [sessionStatus, stableSetAvailableSources]);

  // Fetch recruiters
  const fetchRecruiter = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return;

    try {
      const result = await safeFetch<{ users: Array<{ id: string; name: string; email: string; avatarUrl?: string }> }>(
        '/api/users?role=Recruiter',
        { timeoutMs: 8000 }
      );
      if (result.ok && result.data) {
        const recruiters = (result.data.users || []).map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl
        }));
        stableSetAvailableRecruiter(recruiters);
      }
    } catch (error) {
      // Error fetching recruiters
    }
  }, [sessionStatus, stableSetAvailableRecruiter]);

  // Store current filters in a ref to avoid dependency issues
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Debounce ref for fit score counts
  const isFetchingFitScoreCountsRef = useRef(false);

  // Fetch fit score counts with circuit breaker and debouncing
  const fetchFitScoreCounts = useCallback(async (forceRefresh = false) => {
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
      
      // Add basic filters only
      if (currentFilters?.selectedPositionIds && currentFilters.selectedPositionIds.length > 0) {
        params.append('positionId', currentFilters.selectedPositionIds.join(','));
      }
      if (currentFilters?.selectedStatuses && currentFilters.selectedStatuses.length > 0) {
        params.append('status', currentFilters.selectedStatuses.join(','));
      }
      if (currentFilters?.selectedRecruiterIds && currentFilters.selectedRecruiterIds.length > 0) {
        params.append('recruiterId', currentFilters.selectedRecruiterIds.join(','));
      }
      if (currentFilters?.selectedSourceIds && currentFilters.selectedSourceIds.length > 0) {
        params.append('sourceId', currentFilters.selectedSourceIds.join(','));
      }
      
      // Add fit score filters to ensure counts match the filtered results
      if (currentFilters?.minAppliedJobFitScore !== undefined) {
        params.append('minAppliedJobFitScore', String(currentFilters.minAppliedJobFitScore * 100));
      }
      if (currentFilters?.maxAppliedJobFitScore !== undefined) {
        params.append('maxAppliedJobFitScore', String(currentFilters.maxAppliedJobFitScore * 100));
      }
      if (currentFilters?.includeNoScoreInApplied !== undefined) {
        params.append('includeNoScoreInApplied', String(currentFilters.includeNoScoreInApplied));
      }
      
      // Add application date filters to ensure counts match the filtered results
      if (currentFilters?.applicationDateStart) {
        params.append('applicationDateStart', currentFilters.applicationDateStart.toISOString());
      }
      if (currentFilters?.applicationDateEnd) {
        params.append('applicationDateEnd', currentFilters.applicationDateEnd.toISOString());
      }
      
      // Add experience years filters to ensure counts match the filtered results
      if (currentFilters?.minExperienceYears !== undefined) {
        params.append('minExperienceYears', String(currentFilters.minExperienceYears));
      }
      if (currentFilters?.maxExperienceYears !== undefined) {
        params.append('maxExperienceYears', String(currentFilters.maxExperienceYears));
      }
      
      // Add skills filter to ensure counts match the filtered results
      if (currentFilters?.skills) {
        params.append('skills', currentFilters.skills);
      }
      
      // Add location filter to ensure counts match the filtered results
      if (currentFilters?.location) {
        params.append('location', currentFilters.location);
        if (currentFilters.locationOperator) {
          params.append('locationOperator', currentFilters.locationOperator);
        }
      }

      const url = `/api/applicants/fit-score-counts?${params.toString()}`;
      
      const result = await safeFetch<{ applied?: Array<{ letter: string; count: number }>; matching?: Array<{ letter: string; count: number }> }>(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeoutMs: 8000
      });
      
      if (result.ok && result.data) {
        const data = result.data;
        
        // Ensure all grades are included in the response
        const allGrades = ['A', 'B', 'C', 'D', 'E', 'no-score'];
        
        const applied = allGrades.map(letter => {
          const item = data.applied?.find((item: any) => item.letter === letter);
          return { letter, count: item?.count || 0 };
        });
        
        const matching = allGrades.map(letter => {
          const item = data.matching?.find((item: any) => item.letter === letter);
          return { letter, count: item?.count || 0 };
        });

        setDatabaseFitScoreCounts({ applied, matching });
      } else {
        setDatabaseFitScoreCounts(null);
      }
    } catch (error: any) {
      setDatabaseFitScoreCounts(null);
    } finally {
      setIsFitScoreCountsLoading(false);
      isFetchingFitScoreCountsRef.current = false;
    }
  }, []);

  // Debounced version for filter changes
  const debouncedFetchFitScoreCounts = useCallback(() => {
    fetchFitScoreCounts(false);
  }, [fetchFitScoreCounts]);

  // Force refresh version for manual updates
  const forceRefreshFitScoreCounts = useCallback(() => {
    fetchFitScoreCounts(true);
  }, [fetchFitScoreCounts]);

  // Fetch positions and stages if not provided initially
  useEffect(() => {
    const safeInitialAvailablePositions = Array.isArray(initialAvailablePositions) ? initialAvailablePositions : [];
    if (sessionStatus === 'authenticated' && safeInitialAvailablePositions.length === 0) {
      const fetchPositionsAndStages = async () => {
        try {
          const positionsResult = await safeFetch<Position[] | { positions: Position[] }>(
            '/api/positions',
            { timeoutMs: 8000 }
          );
          if (positionsResult.ok && positionsResult.data) {
            setAvailablePositions(
              Array.isArray(positionsResult.data)
                ? positionsResult.data
                : (positionsResult.data.positions || [])
            );
          }

          const stagesResult = await safeFetch<RecruitmentStage[] | { stages: RecruitmentStage[] }>(
            '/api/recruitment-stages',
            { timeoutMs: 8000 }
          );
          if (stagesResult.ok && stagesResult.data) {
            setAvailableStages(
              Array.isArray(stagesResult.data)
                ? stagesResult.data
                : (stagesResult.data.stages || [])
            );
          }
        } catch (error) {
          // Error fetching positions and stages
        }
      };

      fetchPositionsAndStages();
    }
  }, [sessionStatus, initialAvailablePositions.length]);

  // Fetch stages independently if not provided initially
  useEffect(() => {
    const safeInitialAvailableStages = Array.isArray(initialAvailableStages) ? initialAvailableStages : [];
    if (sessionStatus === 'authenticated' && safeInitialAvailableStages.length === 0) {
      const fetchStages = async () => {
        try {
          const stagesResponse = await fetch('/api/recruitment-stages');

          if (stagesResponse.ok) {
            const stagesData = await stagesResponse.json();
            setAvailableStages(Array.isArray(stagesData) ? stagesData : (stagesData.stages || []));
          }
        } catch (error) {
          // A network error occurred while fetching stages
        }
      };
      fetchStages();
    }
  }, [sessionStatus, initialAvailableStages.length]);

  // Fetch full applicants on mount and when session changes
  useEffect(() => {
    const safeInitialApplicants = Array.isArray(initialApplicants) ? initialApplicants : [];
    if (sessionStatus === 'authenticated' && safeInitialApplicants.length === 0) {
      const timeoutId = setTimeout(() => {
        fetchAllApplicantsForCounts();
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [sessionStatus, initialApplicants.length, fetchAllApplicantsForCounts]);

  // Fetch sources and recruiters on mount
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchSources();
      fetchRecruiter();
    }
  }, [sessionStatus, fetchSources, fetchRecruiter]);

  // Fetch fit score counts on mount
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      const timeoutId = setTimeout(() => {
        fetchFitScoreCounts();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [sessionStatus, fetchFitScoreCounts]);

  // Simplified helper function to normalize fit scores
  const getBestMatchingFitScore = (applicant: Applicant): number => {
    // Check JobMatch table first
    if (applicant.jobMatches && Array.isArray(applicant.jobMatches)) {
      const maxMatchScore = Math.max(...applicant.jobMatches.map(match => match.fitScore || 0));
      if (maxMatchScore >= 0) return normalizeFitScore(maxMatchScore);
    }
    
    // If no JobMatch, check parsedData.job_matches
    if (applicant.parsedData && typeof applicant.parsedData === 'object') {
      const parsed = applicant.parsedData as any;
      if (parsed.job_matches && Array.isArray(parsed.job_matches)) {
        const maxMatchScore = Math.max(...parsed.job_matches.map((match: any) => match.fitScore || 0));
        if (maxMatchScore >= 0) return normalizeFitScore(maxMatchScore);
      }
    }
    
    return 0;
  };

  const fetchApplicantById = useCallback(async (candidateId: string): Promise<Applicant | null> => {
    try {
      const result = await safeFetch<Applicant>(`/api/applicants/${candidateId}`, { timeoutMs: 8000 });
      if (!result.ok) {
        return null;
      }
      return result.data;
    } catch (error) {
      return null;
    }
  }, []);

  const refreshApplicantInList = useCallback(async (candidateId: string, fetchTableData: (filters: ApplicantFilterValues, page: number, pageSize: number) => void, filters: ApplicantFilterValues, page: number, pageSize: number, aiMatchedApplicantIds: string[] | null) => {
    if (aiMatchedApplicantIds !== null) {
        toast('AI Search Active: Please clear AI search or re-run it to see specific updates.');
        return;
    }

    const updatedApplicant = await fetchApplicantById(candidateId);
    if (updatedApplicant) {
      stableSetFilteredApplicants(prev => prev.map(c => c.id === candidateId ? updatedApplicant : c));
      stableSetAllApplicantsForCounts(prev => prev.map(c => c.id === candidateId ? updatedApplicant : c));
    } else {
      toast.error('Could not refresh data for applicant. Attempting full list refresh.');
      fetchTableData(filters, page, pageSize);
    }
  }, [fetchApplicantById, stableSetFilteredApplicants, stableSetAllApplicantsForCounts]);

  // Optimistic update helper function
  const applyOptimisticUpdate = useCallback((candidateId: string, updates: Partial<Applicant>) => {
    stableSetFilteredApplicants(prev => prev.map(applicant => 
      applicant.id === candidateId 
        ? { ...applicant, ...updates, updatedAt: new Date().toISOString() }
        : applicant
    ));
    stableSetAllApplicantsForCounts(prev => prev.map(applicant => 
      applicant.id === candidateId 
        ? { ...applicant, ...updates, updatedAt: new Date().toISOString() }
        : applicant
    ));
  }, [stableSetFilteredApplicants, stableSetAllApplicantsForCounts]);

  // Revert optimistic update helper function
  const revertOptimisticUpdate = useCallback((candidateId: string, originalApplicant: Applicant) => {
    stableSetFilteredApplicants(prev => prev.map(applicant => 
      applicant.id === candidateId ? originalApplicant : applicant
    ));
    stableSetAllApplicantsForCounts(prev => prev.map(applicant => 
      applicant.id === candidateId ? originalApplicant : applicant
    ));
  }, [stableSetFilteredApplicants, stableSetAllApplicantsForCounts]);

  return {
    // State
    filteredApplicants,
    setFilteredApplicants: stableSetFilteredApplicants,
    allApplicantsForCounts,
    setAllApplicantsForCounts: stableSetAllApplicantsForCounts,
    availablePositions,
    setAvailablePositions: stableSetAvailablePositions,
    availableStages,
    setAvailableStages: stableSetAvailableStages,
    availableRecruiter,
    setAvailableRecruiter: stableSetAvailableRecruiter,
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
    fetchRecruiter,
    fetchSources,
    fetchAllApplicantsForCounts,
    fetchApplicantById,
    refreshApplicantInList,
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
