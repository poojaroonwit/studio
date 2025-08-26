import { useState, useCallback, useRef, useEffect } from 'react';
import { Candidate, CandidateStatus, Position, RecruitmentStage, UserProfile, CandidateSource } from '@/lib/types';
import { CandidateFilterValues } from '@/components/candidates/CandidateFilters';
import { toast } from "react-hot-toast";

interface UseCandidateDataProps {
  initialCandidates: Candidate[];
  initialAvailablePositions: Position[];
  initialAvailableStages: RecruitmentStage[];
  sessionStatus: string;
  serverAuthError: boolean;
  serverPermissionError: boolean;
  initialFetchError?: string;
}

export function useCandidateData({
  initialCandidates,
  initialAvailablePositions,
  initialAvailableStages,
  sessionStatus,
  serverAuthError,
  serverPermissionError,
  initialFetchError
}: UseCandidateDataProps) {
  const safeInitialCandidates = Array.isArray(initialCandidates) ? initialCandidates : [];
  const safeInitialAvailablePositions = Array.isArray(initialAvailablePositions) ? initialAvailablePositions : [];
  const safeInitialAvailableStages = Array.isArray(initialAvailableStages) ? initialAvailableStages : [];



  // Main candidates data - filtered and paginated for display
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>(safeInitialCandidates || []);
  // Complete candidates data for counts and statistics (unfiltered)
  const [allCandidatesForCounts, setAllCandidatesForCounts] = useState<Candidate[]>(safeInitialCandidates || []);
  // Database-level fit score counts for accurate badge display
  const [databaseFitScoreCounts, setDatabaseFitScoreCounts] = useState<{
    applied: Array<{letter: string, count: number}>;
    matching: Array<{letter: string, count: number}>;
  } | null>(null);
  const [availablePositions, setAvailablePositions] = useState<Position[]>(safeInitialAvailablePositions || []);
  const [availableStages, setAvailableStages] = useState<RecruitmentStage[]>(safeInitialAvailableStages || []);
  const [availableRecruiters, setAvailableRecruiters] = useState<Pick<UserProfile, 'id' | 'name' | 'email' | 'avatarUrl'>[]>([]);
  const [availableSources, setAvailableSources] = useState<CandidateSource[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [hasInitialFetch, setHasInitialFetch] = useState(false);
  const [hasInitialDataFetch, setHasInitialDataFetch] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(initialFetchError || null);
  const [authError, setAuthError] = useState(serverAuthError);
  const [permissionError, setPermissionError] = useState(serverPermissionError);

  // Add debouncing for fetch requests
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRequestRef = useRef<string | null>(null);
  const latestRequestIdRef = useRef<string | null>(null);
  const fetchRecruitersTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize setter functions to prevent unnecessary re-renders
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

  const stableSetHasInitialDataFetch = useCallback((hasDataFetch: boolean) => {
    setHasInitialDataFetch(hasDataFetch);
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



  // Ensure loading state is properly managed when we have initial data
  useEffect(() => {
    if (safeInitialCandidates.length > 0 && isLoading) {
      setIsLoading(false);
    }
  }, [safeInitialCandidates.length, isLoading]);

  // Ensure initial candidates are properly set to filteredCandidates
  useEffect(() => {
    if (safeInitialCandidates.length > 0 && filteredCandidates.length === 0) {
      setFilteredCandidates(safeInitialCandidates);
    }
  }, [safeInitialCandidates, filteredCandidates.length]);

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

  // Fetch fit score counts from the dedicated API endpoint
  const fetchFitScoreCounts = useCallback(async (filters?: any) => {
    if (sessionStatus !== 'authenticated') {
      return;
    }

    try {
      const params = new URLSearchParams();
      
      // Add filters to the params (EXCLUDING fit score filters to prevent circular dependency)
      if (filters) {
        if (filters.name) params.append('name', filters.name);
        if (filters.nameOperator) params.append('nameOperator', filters.nameOperator);
        if (filters.email) params.append('email', filters.email);
        if (filters.emailOperator) params.append('emailOperator', filters.emailOperator);
        if (filters.phone) params.append('phone', filters.phone);
        if (filters.phoneOperator) params.append('phoneOperator', filters.phoneOperator);
        if (filters.positionId) params.append('positionId', filters.positionId);
        if (filters.status) params.append('status', filters.status);
        if (filters.education) params.append('education', filters.education);
        if (filters.minExperienceYears !== undefined) params.append('minExperienceYears', filters.minExperienceYears.toString());
        if (filters.maxExperienceYears !== undefined) params.append('maxExperienceYears', filters.maxExperienceYears.toString());
        if (filters.applicationDateStart) params.append('applicationDateStart', filters.applicationDateStart);
        if (filters.applicationDateEnd) params.append('applicationDateEnd', filters.applicationDateEnd);
        if (filters.recruiterId) params.append('recruiterId', filters.recruiterId);
        if (filters.sourceId) params.append('sourceId', filters.sourceId);
        if (filters.location) params.append('location', filters.location);
        if (filters.locationOperator) params.append('locationOperator', filters.locationOperator);
        if (filters.skills) params.append('skills', filters.skills);
        
        // DO NOT include fit score filters to prevent circular dependency
        // The API will return counts for all candidates based on other filters
        // Client-side logic will handle fit score filtering
      }
      
      const url = `/api/candidates/fit-score-counts?${params.toString()}`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        
        // Transform the data to match the expected format
        // Update the database fit score counts
        setDatabaseFitScoreCounts({
          applied: data.applied || [],
          matching: data.matching || []
        });
      } else {
        console.warn('Failed to fetch fit score counts:', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('Error fetching fit score counts:', error);
    }
  }, [sessionStatus]);

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
            const timeoutId = setTimeout(() => fetchRecruiters(retryCount + 1), retryDelay);
            
            // Store timeout ID for cleanup
            if (fetchRecruitersTimeoutRef.current) {
              clearTimeout(fetchRecruitersTimeoutRef.current);
            }
            fetchRecruitersTimeoutRef.current = timeoutId;
            return;
          }
          
          // Don't throw error, just log it and continue with empty recruiters list
          console.warn("Recruiter fetch failed, continuing with empty list:", detailedErrorMessage);
          stableSetAvailableRecruiters([]);
          return;
      }
      const responseData = await response.json(); 
      // Handle the correct API response structure: { users: [...], pagination: {...} }
      const recruitersArray = responseData?.users || [];

      if (!Array.isArray(recruitersArray)) {
        console.warn("Invalid data format received for recruiters, using empty list");
        stableSetAvailableRecruiters([]);
        return;
      }
      const mappedRecruiters = recruitersArray.map(r => ({ id: r.id, name: r.name, email: r.email || '', avatarUrl: r.avatarUrl }));

      stableSetAvailableRecruiters(mappedRecruiters);
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
      stableSetAvailableRecruiters([]);
    }
  }, [sessionStatus, stableSetAvailableRecruiters]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (fetchRecruitersTimeoutRef.current) {
        clearTimeout(fetchRecruitersTimeoutRef.current);
      }
    };
  }, []);

  const fetchSources = useCallback(async () => {
    if (sessionStatus !== 'authenticated') {
      return;
    }
    
    try {
      const response = await fetch('/api/settings/candidate-sources');
      
      if (response.ok) {
        const sourcesData = await response.json();
        stableSetAvailableSources(sourcesData || []);
      } else {
        console.error('Failed to fetch candidate sources:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching candidate sources:', error);
    }
  }, [sessionStatus, stableSetAvailableSources]);





  // Fetch full candidates dataset for accurate count calculations
  const fetchAllCandidatesForCounts = useCallback(async (filters?: any) => {
    if (sessionStatus !== 'authenticated') {
      return;
    }
    
    try {
      // Build query parameters from ALL filters, INCLUDING fit score filters
      const params = new URLSearchParams();
      params.append('forCounts', 'true');
      
      if (filters) {
        if (filters.name) params.append('name', filters.name);
        if (filters.email) params.append('email', filters.email);
        if (filters.phone) params.append('phone', filters.phone);
        if (filters.location) params.append('location', filters.location);
        if (filters.selectedPositionIds) params.append('positionId', filters.selectedPositionIds.join(','));
        if (filters.selectedStatuses) params.append('status', filters.selectedStatuses.join(','));
        if (filters.selectedSourceIds) params.append('sourceId', filters.selectedSourceIds.join(','));
        if (filters.selectedRecruiterIds) params.append('recruiterId', filters.selectedRecruiterIds.join(','));
        if (filters.skills) params.append('skills', filters.skills);
        if (filters.minExperienceYears) params.append('minExperienceYears', filters.minExperienceYears.toString());
        if (filters.maxExperienceYears) params.append('maxExperienceYears', filters.maxExperienceYears.toString());
        if (filters.applicationDateStart) params.append('applicationDateStart', filters.applicationDateStart.toString());
        if (filters.applicationDateEnd) params.append('applicationDateEnd', filters.applicationDateEnd.toString());
        
        // Include fit score filters for accurate counts
        if (filters.minAppliedJobFitScore !== undefined) params.append('minAppliedJobFitScore', filters.minAppliedJobFitScore.toString());
        if (filters.maxAppliedJobFitScore !== undefined) params.append('maxAppliedJobFitScore', filters.maxAppliedJobFitScore.toString());
        if (filters.minMatchingJobFitScore !== undefined) params.append('minMatchingJobFitScore', filters.minMatchingJobFitScore.toString());
        if (filters.maxMatchingJobFitScore !== undefined) params.append('maxMatchingJobFitScore', filters.maxMatchingJobFitScore.toString());
        if (filters.includeNoScoreInApplied) params.append('includeNoScoreInApplied', 'true');
        if (filters.includeNoScoreInMatching) params.append('includeNoScoreInMatching', 'true');
      }
      
      const url = `/api/candidates?${params.toString()}`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        
        // Store the candidates data for accurate fit score count calculations
        if (data.data && Array.isArray(data.data)) {
          stableSetAllCandidatesForCounts(data.data);
        }
      }
    } catch (error) {
      // Silently fail - this is for counts only, not critical functionality
      console.warn('Failed to fetch all candidates for counts:', error);
    }
  }, [sessionStatus, stableSetAllCandidatesForCounts]);

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
            stableSetAvailablePositions(posData.data || []);
          } else {
            toast.error("Could not load the list of available positions.");
          }

          if (stagesResponse.ok) {
            const stagesData = await stagesResponse.json();
            stableSetAvailableStages(Array.isArray(stagesData) ? stagesData : (stagesData.stages || []));
          } else {
            toast.error("Could not load recruitment stages.");
          }
        } catch (error) {
          toast.error("A network error occurred while fetching initial data.");
        }
      };
      fetchPositionsAndStages();
    }
  }, [sessionStatus, safeInitialAvailablePositions.length, stableSetAvailablePositions, stableSetAvailableStages]);

  // Fetch stages independently if not provided initially
  useEffect(() => {
    if (sessionStatus === 'authenticated' && safeInitialAvailableStages.length === 0) {
      const fetchStages = async () => {
        try {
          const stagesResponse = await fetch('/api/recruitment-stages');

          if (stagesResponse.ok) {
            const stagesData = await stagesResponse.json();
            stableSetAvailableStages(Array.isArray(stagesData) ? stagesData : (stagesData.stages || []));
          } else {
            console.error("Could not load recruitment stages.");
          }
        } catch (error) {
          console.error("A network error occurred while fetching stages:", error);
        }
      };
      fetchStages();
    }
  }, [sessionStatus, safeInitialAvailableStages.length, stableSetAvailableStages]);

  // Fetch full candidates on mount and when session changes
  useEffect(() => {
    if (sessionStatus === 'authenticated' && safeInitialCandidates.length === 0) {
      // Use a delay to ensure the component is fully mounted
      const timeoutId = setTimeout(() => {
        fetchAllCandidatesForCounts();
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [sessionStatus, fetchAllCandidatesForCounts, safeInitialCandidates.length]);

  // Fetch sources and recruiters on mount
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchSources();
      fetchRecruiters();
    }
  }, [sessionStatus, fetchSources, fetchRecruiters]);

  // Fetch fit score counts on mount
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      // Use a delay to ensure the component is fully mounted
      const timeoutId = setTimeout(() => {
        fetchFitScoreCounts();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [sessionStatus, fetchFitScoreCounts]);

  // Set initial data
  useEffect(() => { 
    stableSetFilteredCandidates(safeInitialCandidates || []); 
    // Don't set allCandidatesForCounts here - let the client-side fetch handle it
    // This prevents the 50-record limit from affecting the counts
  }, [safeInitialCandidates, stableSetFilteredCandidates]);

  useEffect(() => { stableSetAvailablePositions(safeInitialAvailablePositions || []); }, [safeInitialAvailablePositions, stableSetAvailablePositions]);
  useEffect(() => { 
    stableSetAvailableStages(safeInitialAvailableStages || []); 
  }, [safeInitialAvailableStages, stableSetAvailableStages]);

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
    hasInitialDataFetch,
    setHasInitialDataFetch: stableSetHasInitialDataFetch,
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
    fetchFitScoreCounts
  };
}
