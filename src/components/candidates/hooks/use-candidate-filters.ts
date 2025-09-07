import { useState, useCallback, useRef, useEffect } from 'react';
import { CandidateFilterValues } from '@/components/candidates/CandidateFilters';
import { getScoreRangesForChart } from '@/lib/scoreUtils';

export function useCandidateFilters(initialFilters?: CandidateFilterValues) {
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
    return baseFilters;
  });

  // Use a ref to access current filters value without causing re-renders
  const filtersRef = useRef<CandidateFilterValues>(filters);
  
  // Update ref whenever filters change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Horizontal fit score filter state
  const [horizontalSelectedFitScoreGrades, setHorizontalSelectedFitScoreGrades] = useState<Set<string>>(new Set());
  const [horizontalSelectedMatchingFitScoreGrades, setHorizontalSelectedMatchingFitScoreGrades] = useState<Set<string>>(new Set());

  // Add a ref to track the debounce timeout
  const filterChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAppliedFiltersRef = useRef<string>('');
  const optimisticUpdateRef = useRef<boolean>(false);

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
    const newFilters = { ...filtersRef.current };

    // Process applied job fit score grades
    const scoreRanges = getScoreRangesForChart();

    if (horizontalSelectedFitScoreGrades.size > 0) {
      const selectedRanges = scoreRanges.filter(range => horizontalSelectedFitScoreGrades.has(range.letter));
      const hasNoScore = horizontalSelectedFitScoreGrades.has('no-score');
      
      if (selectedRanges.length > 0 && hasNoScore) {
        // Both regular grades and no-score selected
        const minScore = Math.min(...selectedRanges.map(r => r.min));
        const maxScore = Math.max(...selectedRanges.map(r => r.max));
        newFilters.minAppliedJobFitScore = minScore;
        newFilters.maxAppliedJobFitScore = maxScore;
        newFilters.includeNoScoreInApplied = true;
      } else if (selectedRanges.length > 0) {
        // Only regular grades selected
        const minScore = Math.min(...selectedRanges.map(r => r.min));
        const maxScore = Math.max(...selectedRanges.map(r => r.max));
        newFilters.minAppliedJobFitScore = minScore;
        newFilters.maxAppliedJobFitScore = maxScore;
        newFilters.includeNoScoreInApplied = false;
      } else if (hasNoScore) {
        // Only no-score selected
        newFilters.minAppliedJobFitScore = -1;
        newFilters.maxAppliedJobFitScore = -1; // Set both to -1 for "no-score" case
        newFilters.includeNoScoreInApplied = true;
      }
    } else {
      // Clear applied job fit score filters when no grades are selected
      newFilters.minAppliedJobFitScore = undefined;
      newFilters.maxAppliedJobFitScore = undefined;
      newFilters.includeNoScoreInApplied = undefined;
    }

    // Process matching job fit score grades
    if (horizontalSelectedMatchingFitScoreGrades.size > 0) {
      const selectedRanges = scoreRanges.filter(range => horizontalSelectedMatchingFitScoreGrades.has(range.letter));
      const hasNoScore = horizontalSelectedMatchingFitScoreGrades.has('no-score');
      
      if (selectedRanges.length > 0 && hasNoScore) {
        // Both regular matching grades and no-score selected
        const minScore = Math.min(...selectedRanges.map(r => r.min));
        const maxScore = Math.max(...selectedRanges.map(r => r.max));
        newFilters.minMatchingJobFitScore = minScore;
        newFilters.maxMatchingJobFitScore = maxScore;
        newFilters.includeNoScoreInMatching = true;
      } else if (selectedRanges.length > 0) {
        // Only regular matching grades selected
        const minScore = Math.min(...selectedRanges.map(r => r.min));
        const maxScore = Math.max(...selectedRanges.map(r => r.max));
        newFilters.minMatchingJobFitScore = minScore;
        newFilters.maxMatchingJobFitScore = maxScore;
        newFilters.includeNoScoreInMatching = false;
      } else if (hasNoScore) {
        // Only no-score selected for matching
        newFilters.minMatchingJobFitScore = -1;
        newFilters.maxMatchingJobFitScore = -1; // Set both to -1 for "no-score" case
        newFilters.includeNoScoreInMatching = true;
      }
    } else {
      // Clear matching job fit score filters when no grades are selected
      newFilters.minMatchingJobFitScore = undefined;
      newFilters.maxMatchingJobFitScore = undefined;
      newFilters.includeNoScoreInMatching = undefined;
    }

    setFilters(newFilters);
    return newFilters;
  }, [horizontalSelectedFitScoreGrades, horizontalSelectedMatchingFitScoreGrades]);

  const handleFilterChange = useCallback((newFilters: CandidateFilterValues, onFilterChange: (filters: CandidateFilterValues) => void) => {
    // Clear any existing timeout
    if (filterChangeTimeoutRef.current) {
      clearTimeout(filterChangeTimeoutRef.current);
      filterChangeTimeoutRef.current = null;
    }
    
    // Use ref to get current filters value without causing re-renders
    const currentFilters = filtersRef.current;
    const combinedFilters = { ...currentFilters, ...newFilters, aiSearchQuery: undefined };
    
    // Check if filters have actually changed to prevent unnecessary updates
    const currentFiltersString = JSON.stringify(currentFilters);
    const newFiltersString = JSON.stringify(combinedFilters);
    if (currentFiltersString === newFiltersString) {
      return;
    }

    // Check if this is a fit score filter change to avoid clearing horizontal fit score filters
    const isFitScoreFilterChange = 
      newFilters.minAppliedJobFitScore !== undefined ||
      newFilters.maxAppliedJobFitScore !== undefined ||
      newFilters.minMatchingJobFitScore !== undefined ||
      newFilters.maxMatchingJobFitScore !== undefined ||
      newFilters.includeNoScoreInApplied !== undefined ||
      newFilters.includeNoScoreInMatching !== undefined;

    // Only clear horizontal fit score filters when other filters change (not fit score filters)
    if (!isFitScoreFilterChange) {
      setHorizontalSelectedFitScoreGrades(new Set());
      setHorizontalSelectedMatchingFitScoreGrades(new Set());
    }
    
    // Immediate UI update for better responsiveness
    setFilters(combinedFilters);
    
    // Increased debounce to prevent infinite loops
    filterChangeTimeoutRef.current = setTimeout(() => {
      onFilterChange(combinedFilters);
    }, 150); // Increased from 50ms to 150ms to prevent infinite loops
  }, []); // Removed filters from dependency array to prevent infinite loop

  const clearAllFilters = useCallback(() => {
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
      selectedSourceIds: [],
      minAppliedJobFitScore: undefined,
      maxAppliedJobFitScore: undefined,
      minMatchingJobFitScore: undefined,
      maxMatchingJobFitScore: undefined,
      includeNoScoreInApplied: false,
      includeNoScoreInMatching: false,
      applicationDateStart: undefined,
      applicationDateEnd: undefined,
      nameOperator: 'contains',
      emailOperator: 'contains',
      phoneOperator: 'contains',
      locationOperator: 'contains',
      aiSearchQuery: undefined,
      aiSearchType: 'hybrid',
      aiSearchFilters: {},
      customFieldFilters: {},
    };
    
    setFilters(defaultFilters);
    return defaultFilters;
  }, []);



  return {
    filters,
    setFilters,
    horizontalSelectedFitScoreGrades,
    setHorizontalSelectedFitScoreGrades,
    horizontalSelectedMatchingFitScoreGrades,
    setHorizontalSelectedMatchingFitScoreGrades,
    handleHorizontalFitScoreGradeToggle,
    handleHorizontalMatchingFitScoreGradeToggle,
    applyHorizontalFitScoreFilters,
    handleFilterChange,
    clearAllFilters,
    filterChangeTimeoutRef,
    lastAppliedFiltersRef,
    optimisticUpdateRef,
    clearAllHorizontalFitScoreFilters
  };
}
