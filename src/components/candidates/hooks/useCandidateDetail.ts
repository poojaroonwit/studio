import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { differenceInMonths } from 'date-fns';
import * as z from 'zod';
import type { Candidate, Position, UserProfile, RecruitmentStage, TransitionRecord, CandidateSource } from '@/lib/types';
import { useUnifiedRealtime } from '@/hooks/use-unified-realtime';
import { useSafeEffect, useInfiniteLoopPrevention } from '@/hooks/use-safe-effect';

// Form schemas - validation removed
const editCandidateDetailSchema = z.object({
  name: z.any().optional(),
  email: z.any().optional(),
  phone: z.any().optional(),
  positionId: z.any().optional(),
  recruiterId: z.any().optional(),
  fitScore: z.any().optional(),
  status: z.any().optional(),
  assignmentJustification: z.any().optional(),
  parsedData: z.any().optional(),
});

type EditCandidateFormValues = z.infer<typeof editCandidateDetailSchema>;

export const useCandidateDetail = (candidateId: string) => {

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [allDbPositions, setAllDbPositions] = useState<Position[]>([]);
  const [availableRecruiters, setAvailableRecruiters] = useState<UserProfile[]>([]);
  const [availableSources, setAvailableSources] = useState<CandidateSource[]>([]);
  const [availableStages, setAvailableStages] = useState<RecruitmentStage[]>([]);
  const [transitionHistory, setTransitionHistory] = useState<TransitionRecord[]>([]);
  const [candidateJobMatches, setCandidateJobMatches] = useState<any[]>([]);
  const [isAssigningRecruiter, setIsAssigningRecruiter] = useState(false);
  const [isAssigningSource, setIsAssigningSource] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarForceRefresh, setAvatarForceRefresh] = useState(false);
  const [copiedJobApplied, setCopiedJobApplied] = useState(false);
  const [copiedJobMatchIndex, setCopiedJobMatchIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add refs for caching and cleanup
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const avatarForceRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cache duration: 30 seconds
  const CACHE_DURATION = 30000;

  // Add infinite loop prevention
  const { trackRun: trackFetchCandidate } = useInfiniteLoopPrevention('useCandidateDetail_fetchCandidate', 20, () => {
    console.error('🚨 Excessive fetchCandidate calls detected in useCandidateDetail');
  });

  const { trackRun: trackRealtimeUpdate } = useInfiniteLoopPrevention('useCandidateDetail_realtimeUpdate', 50, () => {
    console.error('🚨 Excessive realtime updates detected in useCandidateDetail');
  });

  // Safe default values to prevent temporal dead zone issues
  const getDefaultFormValues = (): EditCandidateFormValues => ({
    name: '',
    email: '',
    phone: '',
    positionId: null,
    recruiterId: null,
    fitScore: null,
    status: '',
    assignmentJustification: [],
    parsedData: {
      personal_info: {},
      contact_info: {},
      education: [],
      experience: [],
      skills: [],
      job_suitable: [],
      job_matches: [],
    },
  });

  // Form setup with defensive initialization
  const {
    control,
    handleSubmit,
    reset,
    register,
    formState: { errors },
    watch,
    setValue,
  } = useForm<EditCandidateFormValues>({
    defaultValues: getDefaultFormValues(),
    mode: 'onSubmit', // Changed from 'onChange' to reduce validation
  });

  const {
    fields: educationFields,
    append: appendEducation,
    remove: removeEducation,
  } = useFieldArray({
    control,
    name: 'parsedData.education',
    keyName: 'field_id',
  });

  const {
    fields: experienceFields,
    append: appendExperience,
    remove: removeExperience,
  } = useFieldArray({
    control,
    name: 'parsedData.experience',
    keyName: 'field_id',
  });

  const {
    fields: skillsFields,
    append: appendSkill,
    remove: removeSkill,
  } = useFieldArray({
    control,
    name: 'parsedData.skills',
    keyName: 'field_id',
  });

  const {
    fields: jobSuitableFields,
    append: appendJobSuitable,
    remove: removeJobSuitable,
  } = useFieldArray({
    control,
    name: 'parsedData.job_suitable',
    keyName: 'field_id',
  });

  const {
    fields: jobMatchesFields,
    append: appendJobMatch,
    remove: removeJobMatch,
  } = useFieldArray({
    control,
    name: 'parsedData.job_matches',
    keyName: 'field_id',
  });

  // Memoized fetch function with caching and infinite loop prevention
  const fetchCandidate = useCallback(async (forceRefresh = false) => {
    if (!trackFetchCandidate()) return;
    if (!candidateId) return;

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Check cache first
    const cacheKey = `candidate:${candidateId}`;
    const cached = cacheRef.current.get(cacheKey);
    const now = Date.now();

    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_DURATION) {
      setCandidate(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch candidate: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      // Check if component is still mounted before setting state
      if (!isMountedRef.current) {
        return;
      }

      // Cache the result
      cacheRef.current.set(cacheKey, { data, timestamp: now });

      // Safely process candidate data
      setCandidate(data);
      setLoading(false);
      setError(null);

    } catch (error: any) {
      if (!isMountedRef.current) return;
      
      // Don't set error for aborted requests
      if (error.name === 'AbortError') {
        return;
      }

      setError('Failed to load candidate details');
      setLoading(false);
    }
  }, [candidateId, trackFetchCandidate]);

  // Memoized fetch functions for static data
  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch('/api/positions/all', {
        headers: { 'Cache-Control': 'max-age=300' }, // Cache for 5 minutes
        credentials: 'include' // Include session cookies
      });
      if (res.ok) {
        const data = await res.json();
        setAllDbPositions(data.data || []);
      } else {
        console.error('Error fetching positions:', res.status, res.statusText);
      }
    } catch (e) {
      console.error('Error fetching positions:', e);
    }
  }, []);

  const fetchRecruiters = useCallback(async () => {
    try {
      const res = await fetch('/api/users?role=Recruiter', {
        headers: { 'Cache-Control': 'max-age=300' }, // Cache for 5 minutes
        credentials: 'include' // Include session cookies
      });
      if (res.ok) {
        const responseData = await res.json();
        const recruitersArray = responseData?.users || [];
        setAvailableRecruiters(recruitersArray);
      } else {
        console.error('Error fetching recruiters:', res.status, res.statusText);
      }
    } catch (e) {
      console.error('Error fetching recruiters:', e);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/candidate-sources', {
        headers: { 'Cache-Control': 'max-age=300' }, // Cache for 5 minutes
        credentials: 'include' // Include session cookies
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableSources(data || []);
      } else {
        console.error('Error fetching sources:', res.status, res.statusText);
      }
    } catch (e) {
      console.error('Error fetching sources:', e);
    }
  }, []);

  const fetchStages = useCallback(async () => {
    try {
      const res = await fetch('/api/recruitment-stages', {
        headers: { 'Cache-Control': 'max-age=300' }, // Cache for 5 minutes
        credentials: 'include' // Include session cookies
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableStages(data || []);
      } else {
        console.error('Error fetching stages:', res.status, res.statusText);
      }
    } catch (e) {
      console.error('Error fetching stages:', e);
    }
  }, []);

  const fetchTransitionHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/transitions?candidateId=${candidateId}`, {
        credentials: 'include' // Include session cookies
      });
      if (res.ok) {
        const data = await res.json();
        setTransitionHistory(data || []);
      } else if (res.status === 401) {
        console.error('Authentication required to fetch transition history');
      } else {
        console.error('Error fetching transition history:', res.status, res.statusText);
      }
    } catch (e) {
      console.error('Error fetching transition history:', e);
    }
  }, [candidateId]);

  // Stable realtime update handler
  const handleRealtimeUpdate = useCallback((updatedCandidate: any) => {
    if (!trackRealtimeUpdate()) return;
    if (updatedCandidate.id === candidateId) {
      // Refresh candidate data when updated
      fetchCandidate(true); // Force refresh
      fetchTransitionHistory();
    }
  }, [candidateId, fetchCandidate, fetchTransitionHistory, trackRealtimeUpdate]);

  // Unified realtime hook with stable handlers
  const { isConnected: realtimeConnected } = useUnifiedRealtime({
    onCandidateUpdate: handleRealtimeUpdate,
    onNotificationUpdate: (notification: any) => {
      // Handle notifications if needed
    },
    showNotifications: false, // Disable notifications to prevent conflicts
    showErrorNotifications: false // Disable error toast notifications
  });

  // Fetch candidate data with safe effect
  useSafeEffect(() => {
    isMountedRef.current = true;
    
    fetchCandidate();
    
    return () => {
      isMountedRef.current = false;
      // Abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [candidateId], 'fetchCandidate', 10);

  // Fetch static data only once on mount with parallel execution - FIXED: Use useEffect instead of useSafeEffect
  useEffect(() => {
    // Fetch all static data in parallel for better performance
    Promise.all([
      fetchPositions(),
      fetchRecruiters(),
      fetchSources(),
      fetchStages()
    ]).catch(error => {
      console.error('Error fetching static data:', error);
    });
  }, []); // FIXED: Empty dependency array since this should only run once

  // Fetch transition history when candidateId is available (non-blocking) - FIXED: Use useEffect
  useEffect(() => {
    if (candidateId) {
      // Fetch transition history in background without blocking main candidate data
      fetchTransitionHistory().catch(error => {
        console.error('Error fetching transition history:', error);
      });
    }
  }, [candidateId]); // FIXED: Only depend on candidateId

  // Cleanup on unmount - FIXED: Use useEffect instead of useSafeEffect
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (avatarForceRefreshTimeoutRef.current) {
        clearTimeout(avatarForceRefreshTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Clear cache to prevent memory leaks
      cacheRef.current.clear();
    };
  }, []); // FIXED: Empty dependency array for cleanup

  // Populate form with candidate data when entering edit mode
  useSafeEffect(() => {
    if (isEditing && candidate) {
      console.log('Populating form with candidate data:', candidate);
      
      // Normalize fitScore to ensure it's within 0-1 range
      let normalizedFitScore = candidate.fitScore;
      if (typeof candidate.fitScore === 'number') {
        // If fitScore is a percentage (0-100), convert to decimal (0-1)
        if (candidate.fitScore > 1) {
          normalizedFitScore = candidate.fitScore / 100;
        }
        // Ensure the value is within 0-1 range
        normalizedFitScore = Math.max(0, Math.min(1, normalizedFitScore));
      }
      
      const formValues: EditCandidateFormValues = {
        name: candidate.name || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        positionId: candidate.positionId || null,
        recruiterId: candidate.recruiterId || null,
        fitScore: normalizedFitScore,
        status: candidate.status || '',
        assignmentJustification: candidate.assignmentJustification
          ? (Array.isArray(candidate.assignmentJustification)
            ? candidate.assignmentJustification
            : typeof candidate.assignmentJustification === 'string'
            ? candidate.assignmentJustification.split(/[\n\r]+/).filter((item: string) => item.trim() !== '')
            : [])
          : [],
        parsedData: {
          personal_info: (candidate.parsedData as any)?.personal_info || {},
          contact_info: (candidate.parsedData as any)?.contact_info || {},
          education: (candidate.parsedData as any)?.education || [],
          experience: (candidate.parsedData as any)?.experience || [],
          skills: (candidate.parsedData as any)?.skills || [],
          job_suitable: (candidate.parsedData as any)?.job_suitable || [],
          job_matches: (candidate.parsedData as any)?.job_matches || [],
        },
      };
      
      console.log('Form values to reset:', formValues);
      
      // Use setTimeout to ensure the form is ready before resetting
      setTimeout(() => {
        reset(formValues);
        console.log('Form reset completed');
      }, 0);
    }
  }, [isEditing, candidate, reset], 'populateForm', 20);

  // Handle entering edit mode
  const handleEnterEditMode = useCallback(() => {
    if (candidate) {
      setIsEditing(true);
    }
  }, [candidate]);

  // Utility functions
  const calculateTotalExperienceDuration = useCallback((experienceArray: any[]) => {
    let totalMonths = 0;
    
    const safeExperienceArray = Array.isArray(experienceArray) ? experienceArray : [];
    safeExperienceArray.forEach((exp: any) => {
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      
      if (exp.startYear && exp.startMonth) {
        startDate = new Date(exp.startYear, exp.startMonth - 1);
      }
      
      if (exp.endYear && exp.endMonth) {
        endDate = new Date(exp.endYear, exp.endMonth - 1);
      } else if (exp.isCurrent) {
        endDate = new Date();
      }
      
      if (startDate && endDate) {
        const months = differenceInMonths(endDate, startDate);
        if (months > 0) {
          totalMonths += months;
        }
      }
    });
    
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    
    if (years === 0 && months === 0) {
      return '';
    }
    
    const parts = [];
    if (years > 0) {
      parts.push(`${years} year${years > 1 ? 's' : ''}`);
    }
    if (months > 0) {
      parts.push(`${months} month${months > 1 ? 's' : ''}`);
    }
    
    return parts.join(' ');
  }, []);

  const calculateAverageDurationPerCompany = useCallback((experienceArray: any[]) => {
    let totalMonths = 0;
    let validExperiences = 0;
    
    const safeExperienceArray = Array.isArray(experienceArray) ? experienceArray : [];
    safeExperienceArray.forEach((exp: any) => {
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      
      if (exp.startYear && exp.startMonth) {
        startDate = new Date(exp.startYear, exp.startMonth - 1);
      }
      
      if (exp.endYear && exp.endMonth) {
        endDate = new Date(exp.endYear, exp.endMonth - 1);
      } else if (exp.isCurrent) {
        endDate = new Date();
      }
      
      if (startDate && endDate) {
        const months = differenceInMonths(endDate, startDate);
        if (months > 0) {
          totalMonths += months;
          validExperiences++;
        }
      }
    });
    
    if (validExperiences === 0) {
      return '';
    }
    
    const averageMonths = Math.round(totalMonths / validExperiences);
    const years = Math.floor(averageMonths / 12);
    const months = averageMonths % 12;
    
    const parts = [];
    if (years > 0) {
      parts.push(`${years} year${years > 1 ? 's' : ''}`);
    }
    if (months > 0) {
      parts.push(`${months} month${months > 1 ? 's' : ''}`);
    }
    
    return parts.join(' ');
  }, []);

  const handleAssignRecruiter = async (newRecruiterId: string | null) => {
    setIsAssigningRecruiter(true);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recruiterId: newRecruiterId }),
        credentials: 'include',
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to assign recruiter' }));
        throw new Error(errorData.message || `Failed to assign recruiter: ${response.status}`);
      }

      const updatedCandidate = await response.json();
      setCandidate(updatedCandidate);
      toast.success(newRecruiterId ? 'Recruiter assigned successfully' : 'Recruiter unassigned successfully');
    } catch (error: unknown) {
      console.error('Error assigning recruiter:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Request timed out. Please try again.');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to assign recruiter';
        toast.error(errorMessage);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsAssigningRecruiter(false);
    }
  };

  const handleAssignSource = async (candidateId: string, newSourceId: string | null, subSource?: string | null) => {
    setIsAssigningSource(true);
    try {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sourceId: newSourceId,
          subSource: subSource || null
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to assign source');
      }

      const updatedCandidate = await response.json();
      setCandidate(updatedCandidate);
      toast.success(newSourceId ? 'Source assigned successfully' : 'Source unassigned successfully');
    } catch (error: unknown) {
      console.error('Error assigning source:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign source';
      toast.error(errorMessage);
    } finally {
      setIsAssigningSource(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!candidate) return;

    setAvatarUploading(true);
    setAvatarError(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`/api/candidates/${candidate.id}/avatar`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update avatar');
      }

      const result = await res.json();
      
      // Update the candidate with the new avatar URL
      setCandidate(prev => prev ? { ...prev, avatarUrl: result.avatarUrl } : null);
      
      // Force refresh the avatar display
      setAvatarForceRefresh(true);
      const timeoutId = setTimeout(() => setAvatarForceRefresh(false), 1000);
      
      // Store timeout ID for cleanup
      if (avatarForceRefreshTimeoutRef.current) {
        clearTimeout(avatarForceRefreshTimeoutRef.current);
      }
      avatarForceRefreshTimeoutRef.current = timeoutId;
      
      toast.success('Avatar updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update avatar';
      setAvatarError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setAvatarUploading(false);
    }
  };

  return {
    // State
    candidate,
    loading,
    error,
    isEditing,
    allDbPositions,
    availableRecruiters,
    availableSources,
    availableStages,
    transitionHistory,
    candidateJobMatches,
    isAssigningRecruiter,
    isAssigningSource,
    avatarUploading,
    avatarError,
    avatarForceRefresh,
    copiedJobApplied,
    copiedJobMatchIndex,
    isSaving,
    realtimeConnected,
    
    // Form
    control,
    handleSubmit,
    reset,
    register,
    errors,
    watch,
    setValue,
    educationFields,
    appendEducation,
    removeEducation,
    experienceFields,
    appendExperience,
    removeExperience,
    skillsFields,
    appendSkill,
    removeSkill,
    jobSuitableFields,
    appendJobSuitable,
    removeJobSuitable,
    jobMatchesFields,
    appendJobMatch,
    removeJobMatch,
    
    // Actions
    setIsEditing,
    setCopiedJobApplied,
    setCopiedJobMatchIndex,
    setIsSaving,
    setIsAssigningRecruiter,
    setIsAssigningSource,
    setCandidate,
    setTransitionHistory,
    handleEnterEditMode,
    
    // Functions
    calculateTotalExperienceDuration,
    calculateAverageDurationPerCompany,
    handleAssignRecruiter,
    handleAssignSource,
    handleAvatarUpload,
    fetchCandidate, // Expose the memoized fetch function
    fetchTransitionHistory,
  };
};
