import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Candidate } from '@/lib/types';
import { toast } from "react-hot-toast";

interface UseCandidateAiSearchProps {
  setFilteredCandidates: (candidates: Candidate[] | ((prev: Candidate[]) => Candidate[])) => void;
  setAiMatchedCandidateIds: (ids: string[] | null) => void;
  setAiSearchReasoning: (reasoning: string | null) => void;
  setAiRecordCount: (count: number) => void;
  setIsAiSearchActive: (active: boolean) => void;
  filteredCandidates: Candidate[];
}

export function useCandidateAiSearch({
  setFilteredCandidates,
  setAiMatchedCandidateIds,
  setAiSearchReasoning,
  setAiRecordCount,
  setIsAiSearchActive,
  filteredCandidates
}: UseCandidateAiSearchProps) {
  // Use a ref to track if the component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Initialize state with a function to ensure proper initialization in Strict Mode
  const [isAiSearching, setIsAiSearching] = useState(() => false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize the filteredCandidates to ensure stable reference
  const memoizedFilteredCandidates = useMemo(() => filteredCandidates, [filteredCandidates]);

  // Cleanup function to prevent memory leaks and state updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortTimeoutRef.current) {
        clearTimeout(abortTimeoutRef.current);
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
      setAiMatchedCandidateIds(null);
      setAiRecordCount(0);
      setIsAiSearchActive(true);
    } catch (error) {
      console.error('Error setting initial states:', error);
      return;
    }
    
    // Add timeout for AI search
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsAiSearching(false);
        setIsAiSearchActive(false);
        toast.error("AI search timed out. Please try again with a more specific query.");
      }
    }, 5000); // 5 second timeout
    
    try {
      abortControllerRef.current = new AbortController();
      // Clear any existing abort timeout before setting a new one
      if (abortTimeoutRef.current) {
        clearTimeout(abortTimeoutRef.current);
      }
      abortTimeoutRef.current = setTimeout(() => abortControllerRef.current?.abort(), 5000); // 5 second timeout for fetch
      
      const response = await fetch('/api/ai/search-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery }),
        signal: abortControllerRef.current?.signal,
      });
      
      if (abortTimeoutRef.current) {
        clearTimeout(abortTimeoutRef.current);
        abortTimeoutRef.current = null;
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current); // Clear timeout on successful response
      }
      
      // Check if component is still mounted before processing response
      if (!isMountedRef.current) {
        return;
      }
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `AI search failed with status: ${response.status}`);
      }
      
      // If AI search returned results, fetch all candidates to ensure we have them available
      // But do it silently without affecting the page state
      if (result.matchedCandidateIds?.length > 0) {
        // Check if we already have all the matched candidates in our current list
        const existingIds = new Set(memoizedFilteredCandidates.map(c => c.id));
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
              try {
                if (isMountedRef.current) {
                  setFilteredCandidates((prevCandidates: Candidate[]) => {
                    // Merge new candidates with existing ones, avoiding duplicates
                    const existingIds = new Set(prevCandidates.map((c: Candidate) => c.id));
                    const newCandidates = (allCandidatesData.data as Candidate[]).filter((c: Candidate) => !existingIds.has(c.id));
                    const mergedCandidates = [...prevCandidates, ...newCandidates];
                  
                    return mergedCandidates;
                  });
                  
                  // Set AI results immediately without setTimeout
                  setAiMatchedCandidateIds(result.matchedCandidateIds || []);
                  setAiSearchReasoning(result.aiReasoning || "AI search complete.");
                  setAiRecordCount(result.recordCount || 0);
                  toast.success(`Found ${result.recordCount || result.matchedCandidateIds.length} potential match(es).`);
                }
              } catch (error) {
                console.error('Error updating candidates or AI results:', error);
                // Fallback: still set AI results even if candidate update fails
                if (isMountedRef.current) {
                  setAiMatchedCandidateIds(result.matchedCandidateIds || []);
                  setAiSearchReasoning(result.aiReasoning || "AI search complete.");
                  setAiRecordCount(result.recordCount || 0);
                  toast.success(`Found ${result.recordCount || result.matchedCandidateIds.length} potential match(es).`);
                }
              }
            } else {
              // If we couldn't fetch candidates, still show AI results but warn user
              if (isMountedRef.current) {
                setAiMatchedCandidateIds(result.matchedCandidateIds || []);
                setAiSearchReasoning(result.aiReasoning || "AI search complete.");
                setAiRecordCount(result.recordCount || 0);
                toast.success(`Found ${result.recordCount || result.matchedCandidateIds.length} potential match(es).`);
                toast.error("Some candidates may not be visible due to current filters.");
              }
            }
          } else {
            // If fetch failed, still show AI results but warn user
            if (isMountedRef.current) {
              setAiMatchedCandidateIds(result.matchedCandidateIds || []);
              setAiSearchReasoning(result.aiReasoning || "AI search complete.");
              setAiRecordCount(result.recordCount || 0);
              toast.success(`Found ${result.recordCount || result.matchedCandidateIds.length} potential match(es).`);
              toast.error("Could not load all candidates. Some results may not be visible.");
            }
          }
        } else {
          if (isMountedRef.current) {
            setAiMatchedCandidateIds(result.matchedCandidateIds || []);
            setAiSearchReasoning(result.aiReasoning || "AI search complete.");
            setAiRecordCount(result.recordCount || 0);
            toast.success(`Found ${result.recordCount || result.matchedCandidateIds.length} potential match(es).`);
          }
        }
      } else {
        if (isMountedRef.current) {
          setAiMatchedCandidateIds(result.matchedCandidateIds || []);
          setAiSearchReasoning(result.aiReasoning || "AI search complete.");
          setAiRecordCount(result.recordCount || 0);
          toast.success(`Found ${result.recordCount || 0} potential match(es).`);
        }
      }
    } catch (error) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current); // Clear timeout on error
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error("AI search request was cancelled due to timeout. Please try again.");
      } else {
        toast.error((error as Error).message);
      }
      
      try {
        if (isMountedRef.current) {
          setAiMatchedCandidateIds([]);
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
  }, [setFilteredCandidates, setAiMatchedCandidateIds, setAiSearchReasoning, setAiRecordCount, setIsAiSearchActive, memoizedFilteredCandidates]);

  return {
    isAiSearching,
    handleAiSearch
  };
}
