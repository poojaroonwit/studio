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
    const scoreRanges = getScoreRangesForChart();
    
    let minAppliedJobFitScore: number | undefined = undefined;
    let maxAppliedJobFitScore: number | undefined = undefined;
    let minMatchingJobFitScore: number | undefined = undefined;
    let maxMatchingJobFitScore: number | undefined = undefined;

    // Handle applied job fit score grades
    if (horizontalSelectedFitScoreGrades.size > 0) {
      const selectedRanges = scoreRanges.filter(range => horizontalSelectedFitScoreGrades.has(range.letter));
      const hasNoScore = horizontalSelectedFitScoreGrades.has('no-score');
      
      if (selectedRanges.length > 0 && hasNoScore) {
        // Both regular grades and no-score selected - this is a complex case
        // We need to handle this as an OR condition: (regular grades) OR (no-score)
        const minScore = Math.min(...selectedRanges.map(r => r.min));
        const maxScore = Math.max(...selectedRanges.map(r => r.max));
        minAppliedJobFitScore = minScore;
        maxAppliedJobFitScore = maxScore;
        // Add a special flag to indicate that no-score should also be included
        // This will be handled by the API to create an OR condition
      } else if (selectedRanges.length > 0) {
        // Only regular grades selected
        const minScore = Math.min(...selectedRanges.map(r => r.min));
        const maxScore = Math.max(...selectedRanges.map(r => r.max));
        minAppliedJobFitScore = minScore;
        maxAppliedJobFitScore = maxScore;
      } else if (hasNoScore) {
        // Only no-score selected
        minAppliedJobFitScore = -1;
        maxAppliedJobFitScore = -1; // Set both to -1 for "no-score" case
      }
    }

    // Handle matching job fit score grades
    if (horizontalSelectedMatchingFitScoreGrades.size > 0) {
      const selectedRanges = scoreRanges.filter(range => horizontalSelectedMatchingFitScoreGrades.has(range.letter));
      const hasNoScore = horizontalSelectedMatchingFitScoreGrades.has('no-score');
      
      if (selectedRanges.length > 0 && hasNoScore) {
        // Both regular grades and no-score selected - this is a complex case
        // We need to handle this as an OR condition: (regular grades) OR (no-score)
        // For now, we'll set a special flag to indicate this case
        const minScore = Math.min(...selectedRanges.map(r => r.min));
        const maxScore = Math.max(...selectedRanges.map(r => r.max));
        minMatchingJobFitScore = minScore;
        maxMatchingJobFitScore = maxScore;
        // Add a special flag to indicate that no-score should also be included
        // This will be handled by the API to create an OR condition
      } else if (selectedRanges.length > 0) {
        // Only regular grades selected
        const minScore = Math.min(...selectedRanges.map(r => r.min));
        const maxScore = Math.max(...selectedRanges.map(r => r.max));
        minMatchingJobFitScore = minScore;
        maxMatchingJobFitScore = maxScore;
      } else if (hasNoScore) {
        // Only no-score selected
        minMatchingJobFitScore = -1;
        maxMatchingJobFitScore = -1; // Set both to -1 for "no-score" case
      }
    }

    const newFilters = {
      // Only include fit score filters if they have actual values
      ...(minAppliedJobFitScore !== undefined && { minAppliedJobFitScore }),
      ...(maxAppliedJobFitScore !== undefined && { maxAppliedJobFitScore }),
      ...(minMatchingJobFitScore !== undefined && { minMatchingJobFitScore }),
      ...(maxMatchingJobFitScore !== undefined && { maxMatchingJobFitScore }),
      // Include no-score flags when both regular grades and no-score are selected
      ...(horizontalSelectedFitScoreGrades.has('no-score') && horizontalSelectedFitScoreGrades.size > 1 && { includeNoScoreInApplied: true }),
      ...(horizontalSelectedMatchingFitScoreGrades.has('no-score') && horizontalSelectedMatchingFitScoreGrades.size > 1 && { includeNoScoreInMatching: true }),
    };



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

    // Clear horizontal fit score filters when other filters change to avoid conflicts
    setHorizontalSelectedFitScoreGrades(new Set());
    setHorizontalSelectedMatchingFitScoreGrades(new Set());
    
    // Immediate UI update for better responsiveness
    setFilters(combinedFilters);
    
    // Debounce the callback to prevent excessive calls
    filterChangeTimeoutRef.current = setTimeout(() => {
      onFilterChange(combinedFilters);
    }, 100); // 100ms debounce
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
      minAppliedJobFitScore: undefined,
      maxAppliedJobFitScore: undefined,
      minMatchingJobFitScore: undefined,
      maxMatchingJobFitScore: undefined,
      applicationDateStart: undefined,
      applicationDateEnd: undefined,
      nameOperator: 'contains',
      emailOperator: 'contains',
      phoneOperator: 'contains',
      locationOperator: 'contains',
      aiSearchQuery: undefined,
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
