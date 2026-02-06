import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { Applicant } from '@/lib/types';
import { toast } from "react-hot-toast";

interface UseApplicantAiSearchProps {
  setFilteredApplicants: (applicants: Applicant[] | ((prev: Applicant[]) => Applicant[])) => void;
  setAiMatchedApplicantIds: (ids: string[] | null) => void;
  setAiSearchReasoning: (reasoning: string | null) => void;
  setAiRecordCount: (count: number) => void;
  setIsAiSearchActive: (active: boolean) => void;
  filteredApplicants: Applicant[];
}

export function useApplicantAiSearch({
  setFilteredApplicants,
  setAiMatchedApplicantIds,
  setAiSearchReasoning,
  setAiRecordCount,
  setIsAiSearchActive,
  filteredApplicants
}: UseApplicantAiSearchProps) {
  // Use a ref to track if the component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Initialize state with a function to ensure proper initialization in Strict Mode
  const [isAiSearching, setIsAiSearching] = useState(() => false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize the filteredApplicants to ensure stable reference
  const memoizedFilteredApplicants = useMemo(() => filteredApplicants, [filteredApplicants]);

  // Cleanup function to prevent memory leaks and state updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleAiSearch = useCallback(async (aiQuery: string) => {
    if (!aiQuery.trim()) {
      toast("Please enter a search query for AI search.");
      return;
    }
    
    // Check if component is still mounted before proceeding
    if (!isMountedRef.current) {
      return;
    }
    
    // Reset all states at the beginning
    try {
      setIsAiSearching(true);
      setAiSearchReasoning(null);
      setAiMatchedApplicantIds(null);
      setAiRecordCount(0);
      setIsAiSearchActive(true);
    } catch (error) {
      console.error('Error setting initial states:', error);
      return;
    }
    
    try {
      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/ai/search-applicants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery }),
        signal: abortControllerRef.current?.signal,
      });
      
      // Check if component is still mounted before processing response
      if (!isMountedRef.current) {
        return;
      }
      
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        // If response is not valid JSON, create a meaningful error
        const text = await response.text().catch(() => 'Unable to read response');
        throw new Error(`AI search failed with status: ${response.status}. Response: ${text.substring(0, 200)}`);
      }
      
      if (!response.ok) {
        // Provide detailed error message from API response
        const errorMessage = result.message || 
                            result.error || 
                            (typeof result.details === 'string' ? result.details : JSON.stringify(result.details)) || 
                            `AI search failed with status: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      // If AI search returned results, fetch all applicants to ensure we have them available
      // But do it silently without affecting the page state
      const matchedIds = result.matchedApplicantIds || [];
      
      if (matchedIds.length > 0) {
        // Check if we already have all the matched applicants in our current list
        const existingIds = new Set(memoizedFilteredApplicants.map(c => c.id));
        const missingApplicants = matchedIds.filter((id: string) => !existingIds.has(id));
      
        if (missingApplicants.length > 0) {
          // Only fetch if we're missing some applicants
          
          // Fetch all applicants without filters to ensure AI search results are available
          // Use a separate state update to avoid triggering page refresh
          const allApplicantsResponse = await fetch('/api/applicants?limit=1000');
          if (allApplicantsResponse.ok) {
            const allApplicantsData = await allApplicantsResponse.json();
            if (allApplicantsData.data && Array.isArray(allApplicantsData.data)) {
              // Update applicants silently without affecting other state
              try {
                if (isMountedRef.current) {
                  setFilteredApplicants((prevApplicants: Applicant[]) => {
                    // Merge new applicants with existing ones, avoiding duplicates
                    const existingIds = new Set(prevApplicants.map((c: Applicant) => c.id));
                    const newApplicants = (allApplicantsData.data as Applicant[]).filter((c: Applicant) => !existingIds.has(c.id));
                    const mergedApplicants = [...prevApplicants, ...newApplicants];
                  
                    return mergedApplicants;
                  });
                  
                  // Set AI results immediately without setTimeout
                  setAiMatchedApplicantIds(matchedIds);
                  setAiSearchReasoning(result.aiReasoning || "AI search complete.");
                  setAiRecordCount(result.recordCount || 0);
                  toast.success(`Found ${result.recordCount || matchedIds.length} potential match(es).`);
                }
              } catch (error) {
                console.error('Error updating applicants or AI results:', error);
                // Fallback: still set AI results even if applicant update fails
                if (isMountedRef.current) {
                  setAiMatchedApplicantIds(matchedIds);
                  setAiSearchReasoning(result.aiReasoning || "AI search complete.");
                  setAiRecordCount(result.recordCount || 0);
                  toast.success(`Found ${result.recordCount || matchedIds.length} potential match(es).`);
                }
              }
            } else {
              // If we couldn't fetch applicants, still show AI results but warn user
              if (isMountedRef.current) {
                setAiMatchedApplicantIds(matchedIds);
                setAiSearchReasoning(result.aiReasoning || "AI search complete.");
                setAiRecordCount(result.recordCount || 0);
                toast.success(`Found ${result.recordCount || matchedIds.length} potential match(es).`);
                toast.error("Some applicants may not be visible due to current filters.");
              }
            }
          } else {
            // If fetch failed, still show AI results but warn user
            if (isMountedRef.current) {
              setAiMatchedApplicantIds(matchedIds);
              setAiSearchReasoning(result.aiReasoning || "AI search complete.");
              setAiRecordCount(result.recordCount || 0);
              toast.success(`Found ${result.recordCount || matchedIds.length} potential match(es).`);
              toast.error("Could not load all applicants. Some results may not be visible.");
            }
          }
        } else {
          if (isMountedRef.current) {
            setAiMatchedApplicantIds(matchedIds);
            setAiSearchReasoning(result.aiReasoning || "AI search complete.");
            setAiRecordCount(result.recordCount || 0);
            toast.success(`Found ${result.recordCount || matchedIds.length} potential match(es).`);
          }
        }
      } else {
        if (isMountedRef.current) {
          setAiMatchedApplicantIds([]);
          setAiSearchReasoning(result.aiReasoning || "AI search complete.");
          setAiRecordCount(0);
          toast.success(`Found 0 potential match(es).`);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error("AI search request was cancelled.");
      } else {
        toast.error((error as Error).message);
      }
      
      try {
        if (isMountedRef.current) {
          setAiMatchedApplicantIds([]);
          setAiRecordCount(0);
          setIsAiSearchActive(false);
        }
      } catch (stateError) {
        console.error('Error resetting states on error:', stateError);
      }
    } finally {
      try {
        if (isMountedRef.current) {
          setIsAiSearching(false);
        }
      } catch (stateError) {
        console.error('Error setting search state to false:', stateError);
      }
    }
  }, [setFilteredApplicants, setAiMatchedApplicantIds, setAiSearchReasoning, setAiRecordCount, setIsAiSearchActive, memoizedFilteredApplicants]);

  const cancelAiSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (isMountedRef.current) {
      setIsAiSearching(false);
      setIsAiSearchActive(false);
      setAiMatchedApplicantIds(null);
      setAiSearchReasoning(null);
      setAiRecordCount(0);
    }
  }, [setIsAiSearchActive, setAiMatchedApplicantIds, setAiSearchReasoning, setAiRecordCount]);

  return {
    isAiSearching,
    handleAiSearch,
    cancelAiSearch
  };
}
