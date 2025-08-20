import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { differenceInMonths } from 'date-fns';
import * as z from 'zod';
import type { Candidate, Position, UserProfile, RecruitmentStage, TransitionRecord, CandidateSource } from '@/lib/types';

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
    resolver: zodResolver(editCandidateDetailSchema),
    defaultValues: getDefaultFormValues(),
    mode: 'onChange',
  });

  // Defensive useFieldArray hooks with safe initialization
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

  // Fetch candidate data with robust error handling
  useEffect(() => {
    const fetchCandidate = async () => {
      if (!candidateId) {
        setError('No candidate ID provided');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const res = await fetch(`/api/candidates/${candidateId}`, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Candidate not found');
          } else if (res.status === 403) {
            throw new Error('Access denied to candidate');
          } else if (res.status >= 500) {
            throw new Error('Server error occurred');
          } else {
            throw new Error(`Failed to fetch candidate: ${res.status}`);
          }
        }
        
        const data = await res.json();
        
        // Validate basic candidate data structure
        if (!data || typeof data !== 'object' || !data.id) {
          throw new Error('Invalid candidate data received');
        }
        
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
      } catch (err) {
        console.error('Error fetching candidate:', err);
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            setError('Request timed out. Please try again.');
          } else {
            setError(err.message);
          }
        } else {
          setError('Failed to fetch candidate');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [candidateId]);

  // Fetch all positions
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const res = await fetch('/api/positions/all');
        if (res.ok) {
          const data = await res.json();
          setAllDbPositions(data.data || []);
        }
      } catch (e) {
        console.error('Error fetching positions:', e);
      }
    };
    fetchPositions();
  }, []);

  // Fetch recruiters
  useEffect(() => {
    const fetchRecruiters = async () => {
      try {
        const res = await fetch('/api/users?role=Recruiter');
        if (res.ok) {
          const responseData = await res.json();
          // Handle the correct API response structure: { users: [...], pagination: {...} }
          const recruitersArray = responseData?.users || [];
          setAvailableRecruiters(recruitersArray);
        }
      } catch (e) {
        console.error('Error fetching recruiters:', e);
      }
    };
    fetchRecruiters();
  }, []);

  // Fetch sources
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await fetch('/api/settings/candidate-sources');
        if (res.ok) {
          const data = await res.json();
          setAvailableSources(data || []);
        }
      } catch (e) {
        console.error('Error fetching sources:', e);
      }
    };
    fetchSources();
  }, []);

  // Fetch stages
  useEffect(() => {
    const fetchStages = async () => {
      try {
        const res = await fetch('/api/recruitment-stages');
        if (res.ok) {
          const stagesData = await res.json();
          setAvailableStages(Array.isArray(stagesData) ? stagesData : []);
        }
      } catch (e) {
        setAvailableStages([]);
      }
    };
    fetchStages();
  }, []);

  // Fetch transition history
  const fetchTransitionHistory = useCallback(async () => {
    if (!candidateId) return;
    
    try {
      const res = await fetch(`/api/transitions?candidateId=${candidateId}`);
      if (res.ok) {
        const data = await res.json();
        setTransitionHistory(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (error) {
      console.error('Error fetching transition history:', error);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchTransitionHistory();
  }, [fetchTransitionHistory]);

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
    
    // Functions
    calculateTotalExperienceDuration,
    calculateAverageDurationPerCompany,
    handleAssignRecruiter,
    handleAssignSource,
    handleAvatarUpload,
    fetchTransitionHistory,
  };
};
