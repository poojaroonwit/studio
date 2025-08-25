import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { differenceInMonths } from 'date-fns';
import * as z from 'zod';
import type { Candidate, Position, UserProfile, RecruitmentStage, TransitionRecord, CandidateSource } from '@/lib/types';
import { useUnifiedRealtime } from '@/hooks/use-unified-realtime';

// Form schemas
const editCandidateDetailSchema = z.object({
  name: z.string().optional().nullable(),
  email: z.union([z.string().email("Invalid email address"), z.literal(''), z.literal(null)]).optional(),
  phone: z.string().optional().nullable(),
  positionId: z.string().uuid().nullable().optional(),
  recruiterId: z.string().uuid().nullable().optional(),
  fitScore: z.number().min(0).max(1).nullable().optional(),
  status: z.string().optional().nullable(),
  assignmentJustification: z.array(z.string()).optional(),
  parsedData: z.object({
    personal_info: z.any().optional(),
    contact_info: z.any().optional(),
    education: z.array(z.any()).optional(),
    experience: z.array(z.any()).optional(),
    skills: z.array(z.any()).optional(),
    job_suitable: z.array(z.any()).optional(),
    job_matches: z.array(z.any()).optional(),
  }).optional(),
});

type EditCandidateFormValues = z.infer<typeof editCandidateDetailSchema>;

export const useCandidateDetail = (candidateId: string) => {
  // Validate candidateId early to prevent initialization issues
  if (!candidateId || typeof candidateId !== 'string') {
    throw new Error('Invalid candidate ID provided to useCandidateDetail hook');
  }

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
  const [copiedJobApplied, setCopiedJobApplied] = useState(false);
  const [copiedJobMatchIndex, setCopiedJobMatchIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add refs for caching
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const lastFetchRef = useRef<number>(0);

  // Cache duration: 30 seconds
  const CACHE_DURATION = 30000;

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
    mode: 'onChange',
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

  // Unified realtime hook
  const { isConnected: realtimeConnected } = useUnifiedRealtime({
    onCandidateUpdate: (updatedCandidate) => {
      if (updatedCandidate.id === candidateId) {
        // Refresh candidate data when updated
        fetchCandidate(true); // Force refresh
        fetchTransitionHistory();
      }
    },
    onNotification: (notification) => {
      // Handle notifications if needed
    },
    showNotifications: false, // Disable notifications to prevent conflicts
    showErrorNotifications: false // Disable error toast notifications
  });

  // Memoized fetch function with caching
  const fetchCandidate = useCallback(async (forceRefresh = false) => {
    if (!candidateId) {
      setError('No candidate ID provided');
      setLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = `candidate:${candidateId}`;
    const cached = cacheRef.current.get(cacheKey);
    const now = Date.now();

    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_DURATION) {
      setCandidate(cached.data);
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous requests
    if (now - lastFetchRef.current < 1000) {
      return;
    }
    lastFetchRef.current = now;

    setLoading(true);
    setError(null);

    // Check if we have a recent cache entry

    // Retry configuration
    const maxRetries = 2; // Reduced from 3
    const baseDelay = 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`/api/candidates/${candidateId}`, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=30',
          },
        });

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Candidate not found');
          } else if (res.status === 403) {
            throw new Error('Access denied to candidate');
          } else if (res.status === 408) {
            throw new Error('Request timed out. The server may be experiencing high load. Please try again in a moment.');
          } else if (res.status === 503) {
            throw new Error('Database connection error. Please try again in a moment.');
          } else if (res.status === 502 || res.status === 504) {
            throw new Error('Gateway timeout. Please try again in a moment.');
          } else if (res.status >= 500) {
            throw new Error('Server error occurred. Please try again later.');
          } else if (res.status === 429) {
            throw new Error('Too many requests. Please wait a moment before trying again.');
          } else {
            throw new Error(`Failed to fetch candidate: ${res.status}`);
          }
        }

        const data = await res.json();

        // Validate basic candidate data structure
        if (!data || typeof data !== 'object' || !data.id) {
          throw new Error('Invalid candidate data received');
        }

        // Cache the result
        cacheRef.current.set(cacheKey, { data, timestamp: now });

        // Safely process candidate data
        setCandidate({
          ...data,
          fitScore: data.fitScore !== undefined && data.fitScore !== null ? Number(data.fitScore) : null,
          parsedData: data.parsedData || {
            personal_info: {},
            contact_info: {},
            education: [],
            experience: [],
            skills: [],
            job_suitable: [],
            job_matches: [],
          },
        });

        // Success - break out of retry loop
        break;

      } catch (err) {
        console.error(`Error fetching candidate (attempt ${attempt + 1}/${maxRetries + 1}):`, err);

        if (err instanceof Error) {
          if (err.message === 'Candidate not found' || err.message === 'Access denied to candidate') {
            setError(err.message);
            break;
          } else if (attempt === maxRetries) {
            setError(err.message);
            break;
          } else {
            console.error(`Error on attempt ${attempt + 1}, retrying...`);
          }
        } else {
          if (attempt === maxRetries) {
            setError('Failed to fetch candidate. Please check your connection and try again.');
            break;
          }
          console.error(`Unknown error on attempt ${attempt + 1}, retrying...`);
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    setLoading(false);
  }, [candidateId]);

  // Fetch candidate data with optimized dependencies
  useEffect(() => {
    fetchCandidate();
  }, [candidateId]);

  // Memoized fetch functions for static data
  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch('/api/positions/all', {
        headers: { 'Cache-Control': 'max-age=300' } // Cache for 5 minutes
      });
      if (res.ok) {
        const data = await res.json();
        setAllDbPositions(data.data || []);
      }
    } catch (e) {
      console.error('Error fetching positions:', e);
    }
  }, []);

  const fetchRecruiters = useCallback(async () => {
    try {
      const res = await fetch('/api/users?role=Recruiter', {
        headers: { 'Cache-Control': 'max-age=300' } // Cache for 5 minutes
      });
      if (res.ok) {
        const responseData = await res.json();
        const recruitersArray = responseData?.users || [];
        setAvailableRecruiters(recruitersArray);
      }
    } catch (e) {
      console.error('Error fetching recruiters:', e);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/candidate-sources', {
        headers: { 'Cache-Control': 'max-age=300' } // Cache for 5 minutes
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableSources(data || []);
      }
    } catch (e) {
      console.error('Error fetching sources:', e);
    }
  }, []);

  const fetchStages = useCallback(async () => {
    try {
      const res = await fetch('/api/recruitment-stages', {
        headers: { 'Cache-Control': 'max-age=300' } // Cache for 5 minutes
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableStages(data || []);
      }
    } catch (e) {
      console.error('Error fetching stages:', e);
    }
  }, []);

  const fetchTransitionHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/transitions`);
      if (res.ok) {
        const data = await res.json();
        setTransitionHistory(data || []);
      }
    } catch (e) {
      console.error('Error fetching transition history:', e);
    }
  }, [candidateId]);

  // Fetch static data only once on mount
  useEffect(() => {
    fetchPositions();
    fetchRecruiters();
    fetchSources();
    fetchStages();
    fetchTransitionHistory();
  }, [fetchTransitionHistory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup any ongoing operations if needed
    };
  }, []);

  // Populate form with candidate data when entering edit mode
  useEffect(() => {
    if (isEditing && candidate) {
      const formValues: EditCandidateFormValues = {
        name: candidate.name || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        positionId: candidate.positionId || null,
        recruiterId: candidate.recruiterId || null,
        fitScore: candidate.fitScore || null,
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
      
      reset(formValues);
    }
  }, [isEditing, candidate, reset]);

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
    try {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recruiterId: newRecruiterId }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to assign recruiter');
      }

      const updatedCandidate = await response.json();
      setCandidate(updatedCandidate);
      toast.success(newRecruiterId ? 'Recruiter assigned successfully' : 'Recruiter unassigned successfully');
    } catch (error) {
      console.error('Error assigning recruiter:', error);
      toast.error('Failed to assign recruiter');
    } finally {
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
    } catch (error) {
      console.error('Error assigning source:', error);
      toast.error('Failed to assign source');
    } finally {
      setIsAssigningSource(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!candidate) return;

    setAvatarUploading(true);
    setAvatarError(null);

    try {
      const fileUrl = URL.createObjectURL(file);

      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: fileUrl }),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to update avatar');
      }

      const updatedCandidate = await res.json();
      setCandidate(updatedCandidate);
      toast.success('Avatar updated successfully');
    } catch (err) {
      setAvatarError('Failed to update avatar');
      toast.error('Failed to update avatar');
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
