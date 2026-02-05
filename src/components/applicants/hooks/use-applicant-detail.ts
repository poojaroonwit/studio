import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { differenceInMonths } from 'date-fns';
import * as z from 'zod';
import type { Applicant, Position, UserProfile, RecruitmentStage, TransitionRecord, ApplicantSource } from '@/lib/types';
import { useEnhancedSSE, useEnhancedApplicantUpdates, useEnhancedPositionUpdates } from '@/hooks/use-enhanced-sse';
// Removed complex infinite loop prevention - using simple useEffect instead

// Form schemas - validation removed
const editApplicantDetailSchema = z.object({
  email: z.any().optional(),
  phone: z.any().optional(),
  positionId: z.any().optional(),
  recruiterId: z.any().optional(),
  fitScore: z.any().optional(),
  status: z.any().optional(),
  expectedSalary: z.any().optional(),
  assignmentJustification: z.any().optional(),
  parsedData: z.object({
    personal_info: z.object({
      title_honorific: z.string().optional(),
      firstname: z.string().optional(),
      lastname: z.string().optional(),
      nickname: z.string().optional(),
      location: z.string().optional(),
      introduction_aboutme: z.string().optional(),
    }).optional(),
    contact_info: z.object({
      email: z.string().optional(),
      phone: z.string().optional(),
    }).optional(),
    education: z.array(z.any()).optional(),
    experience: z.array(z.any()).optional(),
    skills: z.array(z.any()).optional(),
    job_suitable: z.array(z.any()).optional(),
    job_matches: z.array(z.any()).optional(),
  }).optional(),
});

type EditApplicantFormValues = z.infer<typeof editApplicantDetailSchema>;

export const useApplicantDetail = (applicantId: string) => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [allDbPositions, setAllDbPositions] = useState<Position[]>([]);
  const [availableRecruiter, setAvailableRecruiter] = useState<UserProfile[]>([]);
  const [availableSources, setAvailableSources] = useState<ApplicantSource[]>([]);
  const [availableStages, setAvailableStages] = useState<RecruitmentStage[]>([]);
  const [transitionHistory, setTransitionHistory] = useState<TransitionRecord[]>([]);
  const [applicantJobMatches, setApplicantJobMatches] = useState<any[]>([]);
  const [isAssigningRecruiter, setIsAssigningRecruiter] = useState(false);
  const [isAssigningSource, setIsAssigningSource] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarForceRefresh, setAvatarForceRefresh] = useState(false);
  const [copiedJobApplied, setCopiedJobApplied] = useState(false);
  const [copiedJobMatchIndex, setCopiedJobMatchIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formPopulated, setFormPopulated] = useState(false);
  const [customFieldsRefreshTrigger, setCustomFieldsRefreshTrigger] = useState(0);

  // Add refs for cleanup
  const avatarForceRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Simple tracking for debugging (removed complex infinite loop prevention)
  const fetchApplicantCount = useRef(0);
  const realtimeUpdateCount = useRef(0);

  // Safe default values to prevent temporal dead zone issues
  const getDefaultFormValues = (): EditApplicantFormValues => ({
    email: '',
    phone: '',
    positionId: null,
    recruiterId: null,
    fitScore: null,
    status: '',
    expectedSalary: null,
    assignmentJustification: [],
    parsedData: {
      personal_info: {
        title_honorific: '',
        firstname: '',
        lastname: '',
        nickname: '',
        location: '',
        introduction_aboutme: '',
      },
      contact_info: {
        email: '',
        phone: '',
      },
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
  } = useForm<EditApplicantFormValues>({
    defaultValues: getDefaultFormValues(),
    mode: 'onChange', // Use onChange mode for better form reactivity
    shouldUnregister: false, // Keep fields registered even when not rendered
  });

  // Watch form values
  const watchedValues = watch();

  const {
    fields: educationFields,
    append: appendEducation,
    remove: removeEducation,
    replace: replaceEducation,
  } = useFieldArray({
    control,
    name: 'parsedData.education',
    keyName: 'field_id',
  });

  const {
    fields: experienceFields,
    append: appendExperience,
    remove: removeExperience,
    replace: replaceExperience,
  } = useFieldArray({
    control,
    name: 'parsedData.experience',
    keyName: 'field_id',
  });

  const {
    fields: skillsFields,
    append: appendSkill,
    remove: removeSkill,
    replace: replaceSkills,
  } = useFieldArray({
    control,
    name: 'parsedData.skills',
    keyName: 'field_id',
  });

  const {
    fields: jobSuitableFields,
    append: appendJobSuitable,
    remove: removeJobSuitable,
    replace: replaceJobSuitable,
  } = useFieldArray({
    control,
    name: 'parsedData.job_suitable',
    keyName: 'field_id',
  });

  const {
    fields: jobMatchesFields,
    append: appendJobMatch,
    remove: removeJobMatch,
    replace: replaceJobMatches,
  } = useFieldArray({
    control,
    name: 'parsedData.job_matches',
    keyName: 'field_id',
  });

  // Memoized fetch function with infinite loop prevention
  const fetchApplicant = useCallback(async (forceRefresh = false) => {

    // Simple tracking (removed complex infinite loop prevention)
    fetchApplicantCount.current++;
    if (!applicantId) {
      return;
    }

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Only show loading spinner if we don't have data yet
    if (!applicant) {
      setLoading(true);
    }
    setError(null);

    // Helper: small delay
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    // Retry attempts with gentle backoff for transient server timeouts
    const maxAttempts = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // No client-side abort timeout: allow slow local servers to respond

      try {
        const apiStartTime = Date.now();

        const res = await fetch(`/api/applicants/${applicantId}?lite=1`, {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: abortControllerRef.current.signal,
        });

        const apiDuration = Date.now() - apiStartTime;

        // No timeout to clear

        if (!res.ok) {
          console.error(`use-applicant-detail API call failed with status ${res.status} for applicantId: ${applicantId}`);
          // Handle auth/not found immediately
          if (res.status === 401) {
            lastError = new Error('Unauthorized. Please sign in again.');
            break;
          }
          if (res.status === 404) {
            lastError = new Error('Applicant not found');
            break;
          }
          // For transient server issues, retry silently without surfacing an error yet
          if (res.status === 408 || res.status === 503 || res.status === 500) {
            lastError = new Error(res.status === 408 ? 'Server timed out.' : 'Server temporarily unavailable.');
            if (attempt < maxAttempts) {
              const backoffMs = attempt * 1000; // 1s, 2s
              await delay(backoffMs);
              // recreate controller for next attempt
              abortControllerRef.current = new AbortController();
              continue;
            }
            // Exhausted attempts
            break;
          }
          // Other errors: do not retry
          lastError = new Error(`Failed to fetch applicant: ${res.status} ${res.statusText}`);
          break;
        }

        const data = await res.json();

        // Check if component is still mounted before setting state
        if (!isMountedRef.current) {
          return;
        }

        // Safely process Applicant data
        setApplicant(data);
        setLoading(false);
        setError(null);
        // Successful fetch; stop retry loop
        return;

      } catch (error: any) {
        // No timeout to clear

        if (!isMountedRef.current) {
          return;
        }

        // Handle aborted requests (e.g., client-side timeout)
        if ((error as any).name === 'AbortError') {
          lastError = new Error('Request timed out. Please try again.');
        } else {
          console.error(`use-applicant-detail error fetching applicant for applicantId: ${applicantId} (attempt ${attempt}):`, error);
          lastError = error;
        }

        // For network exceptions, backoff and retry unless out of attempts
        if (attempt < maxAttempts) {
          const backoffMs = attempt * 1000;
          await delay(backoffMs);
          abortControllerRef.current = new AbortController();
          continue;
        }
        lastError = error;
        break;
      }
    }
    // If we reach here, all attempts failed
    setError(lastError instanceof Error ? lastError.message : 'Failed to load Applicant details');
    setLoading(false);
  }, [applicantId]);

  // Memoized fetch functions for static data
  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch('/api/positions/all', {
        headers: { 'Cache-Control': 'no-cache' },
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

  const fetchRecruiter = useCallback(async () => {
    try {
      const res = await fetch('/api/users?role=Recruiter', {
        headers: { 'Cache-Control': 'no-cache' },
        credentials: 'include' // Include session cookies
      });
      if (res.ok) {
        const responseData = await res.json();
        const recruitersArray = responseData?.users || [];
        setAvailableRecruiter(recruitersArray);
      } else {
        console.error('Error fetching recruiters:', res.status, res.statusText);
      }
    } catch (e) {
      console.error('Error fetching recruiters:', e);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/applicant-sources', {
        headers: { 'Cache-Control': 'no-cache' },
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
        headers: { 'Cache-Control': 'no-cache' },
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
      const res = await fetch(`/api/transitions?applicantId=${applicantId}`, {
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
  }, [applicantId]);

  // Stable realtime update handler
  const handleRealtimeUpdate = useCallback((updatedApplicant: any) => {
    // Simple tracking (removed complex infinite loop prevention)
    realtimeUpdateCount.current++;
    if (updatedApplicant.id === applicantId) {
      // Refresh applicant data when updated
      fetchApplicant(true); // Force refresh
      fetchTransitionHistory();
    }
  }, [applicantId, fetchApplicant, fetchTransitionHistory]);

  // Simple SSE hook
  const { isConnected: realtimeConnected } = useEnhancedSSE();

  // Fetch Applicant data - FIXED: Remove fetchApplicant from dependencies to prevent infinite loops
  useEffect(() => {
    isMountedRef.current = true;

    fetchApplicant();

    return () => {
      isMountedRef.current = false;
      // Abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [applicantId]); // FIXED: Only depend on applicantId, not fetchApplicant

  // Fetch static data only once on mount with parallel execution - FIXED: Use useEffect instead of useSafeEffect
  useEffect(() => {
    // Fetch all static data in parallel for better performance
    Promise.all([
      fetchPositions(),
      fetchRecruiter(),
      fetchSources(),
      fetchStages()
    ]).catch(error => {
      console.error('Error fetching static data:', error);
    });
  }, []); // FIXED: Empty dependency array since this should only run once

  // Fetch transition history when applicantId is available (non-blocking) - FIXED: Use useEffect
  useEffect(() => {
    if (applicantId) {
      // Fetch transition history in background without blocking main applicant data
      fetchTransitionHistory().catch(error => {
        console.error('Error fetching transition history:', error);
      });
    }
  }, [applicantId]); // FIXED: Only depend on applicantId

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
    };
  }, []); // FIXED: Empty dependency array for cleanup

  // Populate form with applicant data when entering edit mode
  useEffect(() => {
    if (isEditing && applicant && !formPopulated) {
      // Normalize fitScore to ensure it's within 0-1 range
      let normalizedFitScore = applicant.fitScore;
      if (typeof applicant.fitScore === 'number') {
        // If fitScore is a percentage (0-100), convert to decimal (0-1)
        if (applicant.fitScore > 1) {
          normalizedFitScore = applicant.fitScore / 100;
        }
        // Ensure the value is within 0-1 range
        normalizedFitScore = Math.max(0, Math.min(1, normalizedFitScore));
      }
 
      const formValues: EditApplicantFormValues = {
        email: applicant.email || '',
        phone: applicant.phone || '',
        positionId: applicant.positionId || null,
        recruiterId: applicant.recruiterId || null,
        fitScore: normalizedFitScore,
        status: applicant.statusId || applicant.status || '',
        expectedSalary: applicant.expectedSalary || null,
        assignmentJustification: applicant.assignmentJustification
          ? (Array.isArray(applicant.assignmentJustification)
            ? applicant.assignmentJustification
            : typeof applicant.assignmentJustification === 'string'
              ? applicant.assignmentJustification.split(/[\n\r]+/).filter((item: string) => item.trim() !== '')
              : [])
          : [],
        parsedData: (() => {
          // Handle parsedData - it might be a string that needs parsing
          let parsedDataObj: any = {};

          if (applicant.parsedData) {
            if (typeof applicant.parsedData === 'string') {
              try {
                parsedDataObj = JSON.parse(applicant.parsedData);
              } catch (e) {
                console.warn('Failed to parse parsedData string:', e);
                parsedDataObj = {};
              }
            } else {
              parsedDataObj = applicant.parsedData;
            }
          }

          return {
            personal_info: parsedDataObj?.personal_info || {},
            contact_info: parsedDataObj?.contact_info || {},
            education: parsedDataObj?.education || [],
            experience: parsedDataObj?.experience || [],
            skills: parsedDataObj?.skills || [],
            job_suitable: parsedDataObj?.job_suitable || [],
            job_matches: parsedDataObj?.job_matches || [],
          };
        })(),
      };

      // Reset form with all values at once
      reset(formValues, {
        keepDefaultValues: false,
        keepDirty: false,
        keepErrors: false,
        keepIsSubmitted: false,
        keepTouched: false
      });

      // Add a small delay to ensure form reset is complete before setting individual fields
      setTimeout(() => {
        // Also try setting individual fields to ensure they're populated
        if (formValues.parsedData?.personal_info) {
          setValue('parsedData.personal_info.title_honorific', formValues.parsedData.personal_info.title_honorific || '');
          setValue('parsedData.personal_info.firstname', formValues.parsedData.personal_info.firstname || '');
          setValue('parsedData.personal_info.lastname', formValues.parsedData.personal_info.lastname || '');
          setValue('parsedData.personal_info.nickname', formValues.parsedData.personal_info.nickname || '');
          setValue('parsedData.personal_info.location', formValues.parsedData.personal_info.location || '');
          setValue('parsedData.personal_info.introduction_aboutme', formValues.parsedData.personal_info.introduction_aboutme || '');
        }

        // Set main Applicant fields explicitly
        setValue('email', formValues.email || '');
        setValue('phone', formValues.phone || '');
        setValue('expectedSalary', formValues.expectedSalary);
      }, 100);

      // Populate field arrays
      if (formValues.parsedData?.education && formValues.parsedData.education.length > 0) {
        replaceEducation(formValues.parsedData.education);
      }
      if (formValues.parsedData?.experience && formValues.parsedData.experience.length > 0) {
        replaceExperience(formValues.parsedData.experience);
      }
      if (formValues.parsedData?.skills && formValues.parsedData.skills.length > 0) {
        replaceSkills(formValues.parsedData.skills);
      }
      if (formValues.parsedData?.job_suitable && formValues.parsedData.job_suitable.length > 0) {
        replaceJobSuitable(formValues.parsedData.job_suitable);
      }
      if (formValues.parsedData?.job_matches && formValues.parsedData.job_matches.length > 0) {
        replaceJobMatches(formValues.parsedData.job_matches);
      }

      // Set form as populated
      setFormPopulated(true);
    }
  }, [isEditing, applicant, formPopulated, reset, setValue, replaceEducation, replaceExperience, replaceSkills, replaceJobSuitable, replaceJobMatches]);

  // Reset form populated state when exiting edit mode
  useEffect(() => {
    if (!isEditing) {
      setFormPopulated(false);
    }
  }, [isEditing]);



  // Handle entering edit mode
  const handleEnterEditMode = useCallback(() => {
    if (applicant) {
      console.log('Entering edit mode for applicant:', applicant);
      console.log('Applicant parsedData:', applicant.parsedData);
      setIsEditing(true);
      setFormPopulated(false);
    }
  }, [applicant]);

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
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(`/api/applicants/${applicantId}`, {
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

      const updatedApplicant = await response.json();
      setApplicant(updatedApplicant);
      toastSuccess(newRecruiterId ? 'Recruiter assigned successfully' : 'Recruiter unassigned successfully');
    } catch (error: unknown) {
      console.error('Error assigning recruiter:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        toastError('Request timed out. Please try again.');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to assign recruiter';
        toastError(errorMessage);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsAssigningRecruiter(false);
    }
  };

  const handleAssignSource = async (applicantId: string, newSourceId: string | null, subSource?: string | null) => {
    setIsAssigningSource(true);
    try {
      const response = await fetch(`/api/applicants/${applicantId}`, {
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

      const updatedApplicant = await response.json();
      setApplicant(updatedApplicant);
      toastSuccess(newSourceId ? 'Source assigned successfully' : 'Source unassigned successfully');
    } catch (error: unknown) {
      console.error('Error assigning source:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign source';
      toastError(errorMessage);
    } finally {
      setIsAssigningSource(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    console.log(`[handleAvatarUpload] Called with file:`, file);
    console.log(`[handleAvatarUpload] Current applicant:`, applicant);

    if (!applicant) {
      console.error(`[handleAvatarUpload] No applicant available, cannot upload avatar`);
      return;
    }

    setAvatarUploading(true);
    setAvatarError(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('avatar', file);

      console.log(`[handleAvatarUpload] Uploading to: /api/applicants/${applicant.id}/avatar`);

      const res = await fetch(`/api/applicants/${applicant.id}/avatar`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      console.log(`[handleAvatarUpload] Response status:`, res.status);
      console.log(`[handleAvatarUpload] Response ok:`, res.ok);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error(`[handleAvatarUpload] Upload failed:`, errorData);
        throw new Error(errorData.message || 'Failed to update avatar');
      }

      const result = await res.json();
      console.log(`[handleAvatarUpload] Upload successful:`, result);

      // Update the Applicant with the new avatar URL
      setApplicant(prev => prev ? { ...prev, avatarUrl: result.avatarUrl } : null);

      // Force refresh the avatar display
      setAvatarForceRefresh(true);
      const timeoutId = setTimeout(() => setAvatarForceRefresh(false), 1000);

      // Store timeout ID for cleanup
      if (avatarForceRefreshTimeoutRef.current) {
        clearTimeout(avatarForceRefreshTimeoutRef.current);
      }
      avatarForceRefreshTimeoutRef.current = timeoutId;

      toastSuccess('Avatar updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update avatar';
      console.error(`[handleAvatarUpload] Error:`, err);
      setAvatarError(errorMessage);
      toastError(errorMessage);
    } finally {
      setAvatarUploading(false);
    }
  };

  // Function to handle applicant pin toggle
  const handleTogglePin = async () => {
    if (!applicant?.id) return;

    try {
      const response = await fetch(`/api/applicants/${applicant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPinned: !applicant.isPinned }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update applicant pin status');
      }

      const updatedApplicant = await response.json();

      // Update the applicant state with the new pin status
      setApplicant(prev => prev ? { ...prev, isPinned: updatedApplicant.isPinned } : prev);

      toastSuccess(updatedApplicant.isPinned ? 'Applicant pinned successfully' : 'Applicant unpinned successfully');
    } catch (error: any) {
      console.error('Error toggling applicant pin status:', error);
      toastError(error.message || 'Failed to update applicant pin status');
    }
  };

  // Function to handle applicant blacklist toggle
  const handleToggleBlacklist = async () => {
    if (!applicant?.id) return;

    try {
      const response = await fetch(`/api/applicants/${applicant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isBlacklisted: !applicant.isBlacklisted }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update applicant blacklist status');
      }

      const updatedApplicant = await response.json();

      // Update the applicant state with the new blacklist status
      setApplicant(prev => prev ? { ...prev, isBlacklisted: updatedApplicant.isBlacklisted } : prev);

      toastSuccess(updatedApplicant.isBlacklisted ? 'Applicant added to blacklist' : 'Applicant removed from blacklist');
    } catch (error: any) {
      console.error('Error toggling applicant blacklist status:', error);
      toastError(error.message || 'Failed to update applicant blacklist status');
    }
  };

  // Function to handle applicant read status toggle
  const handleToggleRead = async () => {
    if (!applicant?.id) return;

    try {
      const response = await fetch(`/api/applicants/${applicant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: !applicant.isRead }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update applicant read status');
      }

      const updatedApplicant = await response.json();

      // Update the applicant state with the new read status
      setApplicant(prev => prev ? { ...prev, isRead: updatedApplicant.isRead } : prev);

      toastSuccess(updatedApplicant.isRead ? 'Marked as read' : 'Marked as unread');
    } catch (error: any) {
      console.error('Error toggling applicant read status:', error);
      toastError(error.message || 'Failed to update applicant read status');
    }
  };

  return {
    // State
    applicant,
    loading,
    error,
    isEditing,
    allDbPositions,
    availableRecruiter,
    availableSources,
    availableStages,
    transitionHistory,
    applicantJobMatches,
    isAssigningRecruiter,
    isAssigningSource,
    avatarUploading,
    avatarError,
    avatarForceRefresh,
    copiedJobApplied,
    copiedJobMatchIndex,
    isSaving,
    realtimeConnected,
    formPopulated,

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
    setApplicant,
    setTransitionHistory,
    handleEnterEditMode,

    // Functions
    calculateTotalExperienceDuration,
    calculateAverageDurationPerCompany,
    handleAssignRecruiter,
    handleAssignSource,
    handleAvatarUpload,
    fetchApplicant, // Expose the memoized fetch function
    fetchTransitionHistory,
    handleTogglePin,
    handleToggleBlacklist,
    handleToggleRead,

    // Custom fields refresh
    customFieldsRefreshTrigger,
    refreshCustomFields: () => setCustomFieldsRefreshTrigger(prev => prev + 1),
  };
};
