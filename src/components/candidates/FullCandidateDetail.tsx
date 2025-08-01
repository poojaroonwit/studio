// The following is a direct extraction of the candidate detail page logic, adapted to use candidateId as a prop instead of useParams. All styles and functions are preserved for a 100% match.

"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import type { Candidate, CandidateDetails, TransitionRecord, EducationEntry, ExperienceEntry, SkillEntry, JobSuitableEntry, PersonalInfo, AutomationJobMatch, UserProfile, Position, positionLevel, RecruitmentStage } from '@/lib/types';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScoreBadge } from '@/components/ui/score-color';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { format, differenceInMonths } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import { ArrowLeft, Briefcase, CalendarDays, DollarSign, Edit, GraduationCap, HardDrive, Info, LinkIcon, ListChecks, Loader2, Mail, MapPin, MessageSquare, Percent, Phone, ServerCrash, ShieldAlert, Star, Tag, UploadCloud, User, UserCircle, UserCog, Users, Zap, ExternalLink, Edit3, Save, X, PlusCircle, Trash2, Lightbulb, ChevronDown, ChevronRight, ChevronUp, ChevronLeft, Activity, Clock, BarChart3, Eye, FileText, Building2, Target } from 'lucide-react';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor, getScoreGrade } from "@/lib/scoreUtils";
import { formatCandidateName, formatCandidateNameWithLang } from "@/lib/candidateUtils";
import UploadResumeModal from '@/components/candidates/UploadResumeModal';
import { ManageTransitionsModal } from '@/components/candidates/ManageTransitionsModal';
import { EditPositionModal } from '@/components/positions/EditPositionModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'react-hot-toast';
import { ImageUpload } from '@/components/ui/image-upload';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CandidateCommentsSection from './CandidateCommentsSection';
import CandidateResumesSection from './CandidateResumesSection';
import { Tabs as UITabs, TabsList as UITabsList, TabsTrigger as UITabsTrigger, TabsContent as UITabsContent } from '@/components/ui/tabs';
import { updateCandidateStatusWithNotes } from '@/lib/candidateTransitionUtils';
import { MonthYearPicker } from '@/components/ui/MonthYearPicker';
import { RecruitmentPipelineCard } from './RecruitmentPipelineCard';
import { PositionSelectDropdown } from './PositionSelectDropdown';

import { parse, isValid } from 'date-fns';
import JobMatchModal from './JobMatchModal';
import RecruiterAssignmentDropdown from './RecruiterAssignmentDropdown';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import CandidateAttachmentUploadModal from './CandidateAttachmentUploadModal';


const MINIO_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL || `http://localhost:8621`;
const MINIO_BUCKET = process.env.NEXT_PUBLIC_MINIO_BUCKET_NAME || "canditrack-resumes";

const PLACEHOLDER_VALUE_NONE = "___NOT_SPECIFIED___";
const positionLevelOptions: positionLevel[] = ['entry level', 'mid level', 'senior level', 'lead', 'manager', 'executive', 'officer', 'leader'];

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Hired': case 'Offer Accepted': return 'default';
    case 'Applied': case 'Screening': case 'Shortlisted': case 'On Hold': return 'secondary';
    case 'Interview Scheduled': case 'Interviewing': case 'Offer Extended': return 'secondary';
    case 'Rejected': return 'destructive';
    default: return 'outline';
  }
};

// Form schemas
const personalInfoEditSchema = z.object({
  title_honorific: z.string().optional().nullable(),
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  nickname: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  introduction_aboutme: z.string().optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
}).deepPartial();

const contactInfoEditSchema = z.object({
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().nullable(),
}).deepPartial();

const educationEntryEditSchema = z.object({
    major: z.string().optional().nullable(),
    field: z.string().optional().nullable(),
    startMonth: z.string().optional().nullable(),
    startYear: z.string().optional().nullable(),
    endMonth: z.string().optional().nullable(),
    endYear: z.string().optional().nullable(),
    isCurrent: z.boolean().optional(),
    duration: z.string().optional().nullable(),
    GPA: z.string().optional().nullable(),
    university: z.string().optional().nullable(),
    campus: z.string().optional().nullable(),
}).deepPartial();

const experienceEntryEditSchema = z.object({
    company: z.string().optional().nullable(),
    position: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    startMonth: z.string().optional().nullable(),
    startYear: z.string().optional().nullable(),
    endMonth: z.string().optional().nullable(),
    endYear: z.string().optional().nullable(),
    isCurrent: z.boolean().optional(),
    duration: z.string().optional().nullable(),
    positionLevel: z.string().optional().nullable(),
}).deepPartial();

const skillEntryEditSchema = z.object({
    segment_skill: z.string().optional().nullable(),
    skill_string: z.string().optional().nullable(),
    skill: z.array(z.string()).optional(),
}).deepPartial();

const jobSuitableEntryEditSchema = z.object({
    suitable_career: z.string().optional().nullable(),
    suitable_job_position: z.string().optional().nullable(),
    suitable_job_level: z.string().optional().nullable(),
    suitable_salary_bath_month: z.string().optional().nullable(),
}).deepPartial();

const jobMatchEntryEditSchema = z.object({
    jobId: z.string().uuid().optional().nullable(),
    jobTitle: z.string().optional().nullable(),
    fitScore: z.number().min(0).max(100).optional().nullable(),
    matchReasons: z.array(z.string()).optional(),
    matchReasons_string: z.string().optional().nullable(),
    is_applied_job: z.boolean().optional(),
}).deepPartial();

const candidateDetailsEditSchema = z.object({
  cv_language: z.string().optional().nullable(),
  personal_info: personalInfoEditSchema.optional(),
  contact_info: contactInfoEditSchema.optional(),
  education: z.array(educationEntryEditSchema).optional(),
  experience: z.array(experienceEntryEditSchema).optional(),
  skills: z.array(skillEntryEditSchema).optional(),
  job_suitable: z.array(jobSuitableEntryEditSchema).optional(),
  job_matches: z.array(jobMatchEntryEditSchema).optional(),
}).deepPartial();

const editCandidateDetailSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional().nullable(),
  positionId: z.string().uuid().nullable().optional(),
  recruiterId: z.string().uuid().nullable().optional(),
  fitScore: z.number().min(0).max(100).nullable().optional(),
  status: z.string().min(1, "Status is required").optional(),
  assignmentJustification: z.array(z.string()).optional(),
  parsedData: candidateDetailsEditSchema.optional(),
});

type EditCandidateFormValues = z.infer<typeof editCandidateDetailSchema>;

interface FullCandidateDetailProps {
  candidateId: string;
  isModal?: boolean;
  onClose?: () => void;
  comments: any[];
  resumes: any[];
  onRefresh: () => void;
}

// Utility for displaying fitScore as a percentage
function displayFitScore(score: number | undefined | null) {
  if (typeof score !== 'number' || isNaN(score)) return '';
  if (score >= 0 && score <= 1) return `${Math.round(score * 100)}%`;
  return `${Math.round(score)}%`;
}

function formatTimelinePeriod(
  startMonth: string | undefined,
  startYear: string | undefined,
  endMonth: string | undefined,
  endYear: string | undefined,
  isCurrent: boolean
) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  let left = '', right = '';
  if (startMonth && startYear) {
    left = `<strong>${months[parseInt(startMonth, 10) - 1] || startMonth} ${startYear}</strong>`;
  } else if (startYear) {
    left = `<strong>${startYear}</strong>`;
  }
  if (isCurrent) {
    right = `<strong>Present</strong>`;
  } else if (endMonth && endYear) {
    right = `<strong>${months[parseInt(endMonth, 10) - 1] || endMonth} ${endYear}</strong>`;
  } else if (endYear) {
    right = `<strong>${endYear}</strong>`;
  }
  return `${left} - ${right}`;
}

function formatTimelineDuration(
  startMonth: string | undefined,
  startYear: string | undefined,
  endMonth: string | undefined,
  endYear: string | undefined,
  isCurrent: boolean
) {
  if (!startYear) return '';
  const startYearNum = startYear ? parseInt(startYear, 10) : undefined;
  const endYearNum = endYear ? parseInt(endYear, 10) : undefined;
  const start = startMonth && startYearNum !== undefined ? new Date(startYearNum, parseInt(startMonth, 10) - 1) : new Date(startYearNum || 0, 0);
  let end;
  if (isCurrent) {
    end = new Date();
  } else if (endYearNum !== undefined) {
    end = endMonth ? new Date(endYearNum, parseInt(endMonth, 10) - 1) : new Date(endYearNum, 0);
  } else {
    end = new Date();
  }
  const months = differenceInMonths(end, start);
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  let parts = [];
  if (years > 0) parts.push(`${years} Year${years > 1 ? 's' : ''}`);
  if (remMonths > 0) parts.push(`${remMonths} Month${remMonths > 1 ? 's' : ''}`);
  return parts.length ? `(${parts.join(', ')})` : '';
}

const FullCandidateDetail: React.FC<FullCandidateDetailProps> = ({ candidateId, isModal = false, onClose, comments, resumes, onRefresh }) => {
  // All hooks must be called before any return
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTransitionsModalOpen, setIsTransitionsModalOpen] = useState(false);
  const [isJobMatchModalOpen, setIsJobMatchModalOpen] = useState(false);
  const [selectedJobMatch, setSelectedJobMatch] = useState<any>(null);
  const [allDbPositions, setAllDbPositions] = useState<Position[]>([]);
  const [isEditPositionModalOpen, setIsEditPositionModalOpen] = useState(false);
  const [selectedPositionForEdit, setSelectedPositionForEdit] = useState<Position | null>(null);
  const [availableStages, setAvailableStages] = useState<RecruitmentStage[]>([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [transitionHistory, setTransitionHistory] = useState<TransitionRecord[]>([]);
  const [jobAppliedOpen, setJobAppliedOpen] = useState(true);
  const [jobMatchesOpen, setJobMatchesOpen] = useState(true);
  const [avatarInputRef] = useState<React.RefObject<HTMLInputElement>>(React.createRef());
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [availableRecruiters, setAvailableRecruiters] = useState<UserProfile[]>([]);
  const [isAssigningRecruiter, setIsAssigningRecruiter] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const [personalInfoOpen, setPersonalInfoOpen] = useState(true);
  const [contactOpen, setContactOpen] = useState(true);
  const [educationOpen, setEducationOpen] = useState(true);
  const [experienceOpen, setExperienceOpen] = useState(true);
  const [skillsOpen, setSkillsOpen] = useState(true);
  const [jobSuitableOpen, setJobSuitableOpen] = useState(true);
  const [recruiters, setRecruiters] = useState<{ id: string; name: string }[]>([]);
  const [recruiterSearchTerm, setRecruiterSearchTerm] = useState('');
  const [filteredRecruiters, setFilteredRecruiters] = useState<{ id: string; name: string }[]>([]);
  const [candidateJobMatches, setCandidateJobMatches] = useState<any[]>([]);
  const { data: session } = useSession();
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);

  // Form setup
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
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      positionId: null,
      recruiterId: null,
      fitScore: null,
      status: '',
      assignmentJustification: [],
      parsedData: {},
    },
  });

  const {
    fields: educationFields,
    append: appendEducation,
    remove: removeEducation,
  } = useFieldArray({
    control,
    name: 'parsedData.education',
  });

  const {
    fields: experienceFields,
    append: appendExperience,
    remove: removeExperience,
  } = useFieldArray({
    control,
    name: 'parsedData.experience',
  });

  const {
    fields: skillsFields,
    append: appendSkill,
    remove: removeSkill,
  } = useFieldArray({
    control,
    name: 'parsedData.skills',
  });

  const {
    fields: jobSuitableFields,
    append: appendJobSuitable,
    remove: removeJobSuitable,
  } = useFieldArray({
    control,
    name: 'parsedData.job_suitable',
  });

  const {
    fields: jobMatchesFields,
    append: appendJobMatch,
    remove: removeJobMatch,
  } = useFieldArray({
    control,
    name: 'parsedData.job_matches',
  });

  // Fetch candidate data
  useEffect(() => {
    const fetchCandidate = async () => {
      if (!candidateId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`/api/candidates/${candidateId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch candidate: ${res.status}`);
        }
        
        const data = await res.json();
        setCandidate({
          ...data,
          fitScore: data.fitScore !== undefined && data.fitScore !== null ? Number(data.fitScore) : null,
        });
        
        // Set form default values
        reset({
          name: data.name,
          email: data.email,
          phone: data.phone,
          positionId: !data.positionId || data.positionId === '' ? null : data.positionId,
          recruiterId: !data.recruiterId || data.recruiterId === '' ? null : data.recruiterId,
          fitScore: data.fitScore || null,
          status: data.status || '',
          parsedData: {
            ...data.parsedData,
            education: data.parsedData?.education || [],
            experience: data.parsedData?.experience || [],
            skills: data.parsedData?.skills || [],
            job_suitable: data.parsedData?.job_suitable || [],
            job_matches: data.parsedData?.job_matches || [],
          },
        });
      } catch (err) {
        console.error('Error fetching candidate:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch candidate');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [candidateId, reset]);

  // Fetch transition history
  useEffect(() => {
    const fetchTransitionHistory = async () => {
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
    };

    fetchTransitionHistory();
  }, [candidateId]);

  // Fetch all positions for enrichment
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const res = await fetch('/api/positions/all');
        if (res.ok) {
          const data = await res.json();
          setAllDbPositions(data.data || []);
          console.log('Fetched allDbPositions:', data.data);
        } else {
          console.error('Failed to fetch positions');
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
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setAvailableRecruiters(data.data || []);
          setRecruiters(data.data?.map((user: any) => ({ id: user.id, name: user.name })) || []);
        } else {
          console.error('Failed to fetch recruiters');
        }
      } catch (e) {
        console.error('Error fetching recruiters:', e);
      }
    };
    fetchRecruiters();
  }, []);

  // Ensure candidateJobMatches is always in sync with candidate data
  useEffect(() => {
    let jobMatches: any[] = [];
    if (candidate && Array.isArray(candidate.jobMatches)) {
      jobMatches = candidate.jobMatches;
    } else if (
      candidate &&
      candidate.parsedData &&
      typeof candidate.parsedData === 'object' &&
      Array.isArray((candidate.parsedData as any).job_matches)
    ) {
      jobMatches = (candidate.parsedData as any).job_matches;
    }
    if (jobMatches.length > 0) {
      // Enrich each job match with jobTitle and position details
      const enrichedJobMatches = jobMatches.map((jm: any) => {
        const position = Array.isArray(allDbPositions)
          ? (allDbPositions.find(p => p.id === jm.jobId) || allDbPositions.find(p => p.title === jm.jobTitle))
          : null;
        if (!position) {
          console.warn('No position found for jobMatch', jm);
        }
        return {
          ...jm,
          jobId: position ? position.id : jm.jobId,
          jobTitle: position ? position.title : jm.jobTitle,
          position: position
            ? {
                id: position.id,
                title: position.title,
                description: position.description,
                department: position.department,
                requirements: (position as any).requirements,
                isOpen: position.isOpen,
              }
            : jm.position,
        };
      });
      setCandidateJobMatches(enrichedJobMatches);
    } else {
      setCandidateJobMatches([]);
    }
  }, [candidate, allDbPositions]);

  // Add this useEffect after the other useEffects in the component:
  useEffect(() => {
    const fetchStages = async () => {
      try {
        const res = await fetch('/api/settings/recruitment-stages');
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

  const handleSaveDetails = async (data: EditCandidateFormValues) => {
    if (!candidate) return;

    // Ensure status is present and valid
    const statusToSend = data.status && data.status.trim() !== '' ? data.status : 'Applied';
    if (!statusToSend) {
      toast.error('Status is required. Please select a status before saving.');
      return;
    }

    // v1 API expects this structure:
    // {
    //   candidate_info: { personal_info, contact_info, cv_language, skills, job_suitable, status, ... },
    //   educationData: [...],
    //   experienceData: [...],
    //   ...
    // }
    const candidate_info = {
      personal_info: data.parsedData?.personal_info,
      contact_info: data.parsedData?.contact_info,
      cv_language: data.parsedData?.cv_language,
      skills: data.parsedData?.skills?.map(s => ({
        segment_skill: s.segment_skill,
        skill: s.skill_string
          ? s.skill_string.split(',').map(sk => sk.trim()).filter(sk => sk)
          : (s.skill || [])
      })),
      job_suitable: data.parsedData?.job_suitable,
      status: statusToSend,
      fitScore: data.fitScore,
      job_matches: data.parsedData?.job_matches,
      job_applied: undefined, // Add if you support job_applied in edit
      applicationDate: undefined, // Add if you support applicationDate in edit
    };
    const apiPayload = {
      candidate_info,
      educationData: data.parsedData?.education || [],
      experienceData: data.parsedData?.experience || [],
      // v1 API may expect job_matches/job_applied at top level as well, but they're included in candidate_info above
    };
    try {
      // Save main candidate data (including job_matches in candidate_info)
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to update candidate');
      }

      // Refresh candidate after request succeeds
      const updatedCandidate = await res.json();
      setCandidate(updatedCandidate);
      setIsEditing(false);
      toast.success('Candidate updated successfully');
    } catch (err) {
      console.error('Error updating candidate:', err);
      toast.error('Failed to update candidate');
    }
  };

  const handleAvatarUpload = async (fileUrlOrFile: string | File) => {
    if (!candidate) return;

    setAvatarUploading(true);
    setAvatarError(null);

    try {
      let fileUrl: string;
      
      if (typeof fileUrlOrFile === 'string') {
        fileUrl = fileUrlOrFile;
      } else {
        // Handle file upload logic here if needed
        fileUrl = URL.createObjectURL(fileUrlOrFile);
      }

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
      console.error('Error updating avatar:', err);
      setAvatarError('Failed to update avatar');
      toast.error('Failed to update avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

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

  const handleJobMatchClick = (jobMatch: any) => {
    // Always build jobMatch object from latest allDbPositions, like candidate id page
    const position = Array.isArray(allDbPositions)
      ? (allDbPositions.find(p => p.id === jobMatch.jobId) || allDbPositions.find(p => p.title === jobMatch.jobTitle))
      : null;
    if (!position) {
      console.warn('No position found for jobMatch', jobMatch);
    }
    const jobMatchData = {
      jobId: position ? position.id : jobMatch.jobId,
      jobTitle: position ? position.title : jobMatch.jobTitle,
      fitScore: jobMatch.fitScore,
      matchReasons: jobMatch.matchReasons || [],
      position: position
        ? {
            id: position.id,
            title: position.title,
            description: position.description,
            department: position.department,
            requirements: (position as any).requirements,
            isOpen: position.isOpen,
          }
        : undefined,
    };
    setSelectedJobMatch(jobMatchData);
    setIsJobMatchModalOpen(true);
  };

  // Helper function to calculate duration from period string
  const calculateDuration = (period?: string): string => {
    if (!period) return '';
    // Format: 'Jan 2020 - Dec 2022' or 'Jan 2020 - Present'
    const match = period.match(/([A-Za-z]+) (\d{4}) - (([A-Za-z]+) (\d{4})|Present)/);
    if (!match) return '';
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const startMonth = months.indexOf(match[1]);
    const startYear = parseInt(match[2], 10);
    let endMonth, endYear;
    if (match[3] === 'Present') {
      const now = new Date();
      endMonth = now.getMonth();
      endYear = now.getFullYear();
    } else {
      endMonth = months.indexOf(match[4]);
      endYear = parseInt(match[5], 10);
    }
    if (startMonth === -1 || isNaN(startYear) || endMonth === -1 || isNaN(endYear)) return '';
    let years = endYear - startYear;
    let monthsDiff = endMonth - startMonth;
    if (monthsDiff < 0) {
      years -= 1;
      monthsDiff += 12;
    }
    let result = '';
    if (years > 0) result += `${years} year${years > 1 ? 's' : ''}`;
    if (monthsDiff > 0) {
      if (result) result += ' ';
      result += `${monthsDiff} month${monthsDiff > 1 ? 's' : ''}`;
    }
    return result || '0 months';
  };

  // Function to calculate total experience duration
  const calculateTotalExperienceDuration = (experienceArray: any[]) => {
    let totalMonths = 0;
    
    const safeExperienceArray = Array.isArray(experienceArray) ? experienceArray : [];
    safeExperienceArray.forEach((exp: any) => {
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      
      // Get start date
      if (exp.startYear && exp.startMonth) {
        startDate = new Date(exp.startYear, exp.startMonth - 1);
      } else if (exp.period) {
        // Extract start date from period string
        const startMatch = exp.period.match(/([A-Za-z]+)\s+(\d{4})/);
        if (startMatch) {
          const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const monthIndex = months.indexOf(startMatch[1].toLowerCase());
          if (monthIndex !== -1) {
            startDate = new Date(parseInt(startMatch[2]), monthIndex);
          }
        }
      }
      
      // Get end date
      if (exp.endYear && exp.endMonth) {
        endDate = new Date(exp.endYear, exp.endMonth - 1);
      } else if (exp.isCurrent || (exp.period && exp.period.includes('Present'))) {
        endDate = new Date(); // Current date for current positions
      } else if (exp.period) {
        // Extract end date from period string
        const endMatch = exp.period.match(/([A-Za-z]+)\s+(\d{4})(?:\s*-\s*|$)/);
        if (endMatch) {
          const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const monthIndex = months.indexOf(endMatch[1].toLowerCase());
          if (monthIndex !== -1) {
            endDate = new Date(parseInt(endMatch[2]), monthIndex);
          }
        }
      }
      
      // Calculate duration for this experience
      if (startDate && endDate) {
        const months = differenceInMonths(endDate, startDate);
        if (months > 0) {
          totalMonths += months;
        }
      }
    });
    
    // Convert total months to years and months
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
  };

  // Type guards
  const hasFitScore = (obj: any): obj is { fitScore: number } => {
    return typeof obj === 'object' && obj !== null && 'fitScore' in obj && typeof obj.fitScore === 'number';
  };

  const hasExperienceArray = (data: any): data is { experience: any[] } => {
    return data && Array.isArray(data.experience);
  };

  const hasEducationArray = (data: any): data is { education: any[] } => {
    return data && Array.isArray(data.education);
  };

  // Helper to get education and experience arrays, preferring structured fields
  const getEducation = (candidate: Candidate | null) => {
    if (!candidate) return [];
    if (Array.isArray(candidate.educationData) && candidate.educationData.length > 0) {
      return candidate.educationData;
    }
    // Type-safe access to education data
    const parsedData = candidate.parsedData;
    if (parsedData && typeof parsedData === 'object') {
      // Check for new candidate_info structure
      if ('candidate_info' in parsedData && parsedData.candidate_info && typeof parsedData.candidate_info === 'object') {
        const education = (parsedData.candidate_info as any).education;
        if (Array.isArray(education) && education.length > 0) {
          return education;
        }
      }
      // Check for direct education property
      if ('education' in parsedData) {
        const education = (parsedData as any).education;
        if (Array.isArray(education) && education.length > 0) {
          return education;
        }
      }
    }
    return [];
  };

  const getExperience = (candidate: Candidate | null) => {
    if (!candidate) return [];
    if (Array.isArray(candidate.experienceData) && candidate.experienceData.length > 0) {
      return candidate.experienceData;
    }
    // Type-safe access to experience data
    const parsedData = candidate.parsedData;
    if (parsedData && typeof parsedData === 'object') {
      // Check for new candidate_info structure
      if ('candidate_info' in parsedData && parsedData.candidate_info && typeof parsedData.candidate_info === 'object') {
        const experience = (parsedData.candidate_info as any).experience;
        if (Array.isArray(experience) && experience.length > 0) {
          return experience;
        }
      }
      // Check for direct experience property
      if ('experience' in parsedData) {
        const experience = (parsedData as any).experience;
        if (Array.isArray(experience) && experience.length > 0) {
          return experience;
        }
      }
    }
    return [];
  };

  // Helper function to safely extract properties from parsedData
  const getParsedDataProperty = (propertyName: string) => {
    const parsedData = candidate?.parsedData;
    if (!parsedData || typeof parsedData !== 'object') return undefined;
    
    // Check for new candidate_info structure
    if ('candidate_info' in parsedData && parsedData.candidate_info && typeof parsedData.candidate_info === 'object') {
      return (parsedData.candidate_info as any)[propertyName];
    }
    
    // Check for direct property
    if (propertyName in parsedData) {
      return (parsedData as any)[propertyName];
    }
    
    return undefined;
  };

  const personalInfo = getParsedDataProperty('personal_info');

  const renderField = (label: string, value?: string | number | null, icon?: React.ElementType, isLink?: boolean, linkHref?: string, linkTarget?: string) => {
    if (!value) return null;
    
    const IconComponent = icon;
    
    return (
      <div className="flex items-center gap-2 text-sm">
        {IconComponent && <IconComponent className="w-4 h-4 text-muted-foreground" />}
        <span className="text-muted-foreground">{label}:</span>
        {isLink && linkHref ? (
          <Link href={linkHref} target={linkTarget} className="text-primary hover:underline">
            {value}
          </Link>
        ) : (
          <span className="text-foreground">{value}</span>
        )}
      </div>
    );
  };

  // --- Job Applied logic: match candidate detail page 100% ---
  // Remove all usage of parsedData.job_applied
  // Use only top-level fields
  const appliedJobId = candidate?.positionId;
  const appliedFitScore = candidate?.fitScore;
  const appliedJustification = candidate?.assignmentJustification
    ? (Array.isArray(candidate.assignmentJustification)
        ? candidate.assignmentJustification
        : typeof candidate.assignmentJustification === 'string'
          ? candidate.assignmentJustification.split('\n').map((sentence: string) => sentence.trim()).filter(Boolean)
          : [])
    : [];
  // --- End Job Applied logic ---

  // Before the return statement in the component, add:
  let appliedJobBadge = null;
  if (appliedFitScore !== null && appliedFitScore !== undefined) {
    appliedJobBadge = (
      <ScoreBadge score={appliedFitScore}>
        {formatScoreWithGrade(appliedFitScore)}
      </ScoreBadge>
    );
  }

  // After all hooks are declared, place the early returns:
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <p className="text-muted-foreground">Loading candidate details...</p>
        </div>
      </div>
    );
  }
  if (error || !candidate) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4 text-center">
          <ServerCrash className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="text-lg font-medium text-foreground">Failed to load candidate</h3>
            <p className="text-muted-foreground text-sm">{error || 'Candidate not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isModal ? "h-full overflow-y-auto" : "h-screen overflow-y-auto"}>
      {/* Header - 2 Columns */}
      {candidate && (
        <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/20 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-700/30 shadow-lg backdrop-blur-sm border-b border-border p-6 sticky top-0 z-50">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 relative">
            {/* Modal Close Button in header */}
            {isModal && typeof onClose === 'function' && (
              <button
                type="button"
                className="absolute top-0 right-0 mt-2 mr-2 z-50 p-2 rounded-full hover:bg-muted transition"
                title="Close"
                onClick={onClose}
              >
                <X className="w-6 h-6 text-muted-foreground" />
              </button>
            )}
            {/* Column 1: Candidate Header (7 cols) */}
            <div className="lg:col-span-7">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0 relative">
                  {(() => {
                    const nameInfo = formatCandidateNameWithLang(candidate);
                    return (
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                        <Avatar className="w-20 h-20 text-3xl relative ring-4 ring-background/80 shadow-xl bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-800/30">
                          {candidate.avatarUrl ? (
                            <AvatarImage src={candidate.avatarUrl} alt={nameInfo.name} className="object-cover" />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-700 dark:text-blue-300 font-bold">
                              {nameInfo.name?.[0] || '?'}
                            </AvatarFallback>
                          )}
                          {/* Pencil icon button for avatar upload */}
                          <div
                            role="button"
                            tabIndex={0}
                            className="absolute -bottom-1 -right-1 p-2 bg-background/95 backdrop-blur-sm border border-border/50 rounded-full hover:bg-primary/10 hover:scale-110 transition-all duration-200 z-10 flex items-center justify-center shadow-lg"
                            title="Change profile picture"
                            onClick={() => {
                              if (avatarInputRef?.current) avatarInputRef.current.click();
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                if (avatarInputRef?.current) avatarInputRef.current.click();
                              }
                            }}
                            aria-disabled={avatarUploading}
                            style={{ pointerEvents: avatarUploading ? 'none' : 'auto' }}
                          >
                            <Edit className="w-4 h-4 text-primary" />
                          </div>
                          {/* Hidden file input for avatar upload */}
                          <input
                            type="file"
                            accept="image/*"
                            ref={avatarInputRef}
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) await handleAvatarUpload(file);
                              e.target.value = '';
                            }}
                            tabIndex={-1}
                            aria-hidden="true"
                          />
                          {avatarUploading && !isEditing && (
                            <Loader2 className="animate-spin text-primary h-7 w-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20" />
                          )}
                        </Avatar>
                      </div>
                    );
                  })()}
                  {avatarError && <div className="text-xs text-destructive mt-2 text-center bg-destructive/10 px-2 py-1 rounded-md">{avatarError}</div>}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    {(() => {
                      const nameInfo = formatCandidateNameWithLang(candidate);
                      return (
                        <span 
                          className={`text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent line-clamp-1 ${nameInfo.fontClass}`}
                          lang={nameInfo.lang}
                        >
                          {nameInfo.name}
                        </span>
                      );
                    })()}
                    <div className="flex items-center gap-2">
                      {candidate.id && (
                        <Badge variant="outline" className="text-xs px-3 py-1 rounded-full bg-background/50 backdrop-blur-sm border-border/50 shadow-sm">
                          <span className="text-muted-foreground">ID:</span> {candidate.id}
                        </Badge>
                      )}
                      {candidate.status && (
                        <Badge variant={getStatusBadgeVariant(candidate.status)} className="text-xs px-3 py-1 rounded-full shadow-sm">
                          {candidate.status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                    {candidate.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground/60" />
                        <span className="font-medium text-foreground">{candidate.email}</span>
                      </div>
                    )}
                    {candidate.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground/60" />
                        <span className="font-medium text-foreground">{candidate.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            

            
            {/* Column 2: Action Buttons (5 cols) */}
            <div className={isModal ? "lg:col-span-5" : "lg:col-span-5"}>
              <div className="flex justify-end gap-3">
                {!isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="default"
                      className="bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-sm border-border/50 hover:from-primary/10 hover:to-primary/5 hover:border-primary/30 transition-all duration-200 shadow-lg hover:shadow-xl"
                      onClick={() => {
                        setIsEditing(true);
                        if (candidate) {
                          reset({
                            name: candidate.name || '',
                            email: candidate.email || '',
                            phone: candidate.phone || '',
                            positionId: !candidate.positionId || candidate.positionId === '' ? null : candidate.positionId,
                            fitScore: candidate.fitScore || null,
                            assignmentJustification: Array.isArray(candidate.assignmentJustification) ? candidate.assignmentJustification : (candidate.assignmentJustification ? [candidate.assignmentJustification] : []),
                            status: candidate.status || '',
                            recruiterId: !candidate.recruiterId || candidate.recruiterId === '' ? null : candidate.recruiterId,
                            parsedData: (candidate.parsedData as any) || {}
                          });
                        }
                      }}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Candidate Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="default"
                      className="bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-sm border-border/50 hover:from-primary/10 hover:to-primary/5 hover:border-primary/30 transition-all duration-200 shadow-lg hover:shadow-xl"
                      onClick={() => setIsTransitionsModalOpen(true)}
                      disabled={availableStages.length === 0}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Transitions
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    {/* Save/Cancel buttons will be floating */}
                  </div>
                )}
              </div>
            </div>
            
            {/* Empty space for 3 cols to maintain 10-column grid */}
            <div className="lg:col-span-3">
              
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-10 border-t bg-card overflow-hidden">
        {/* LEFT SIDEBAR: Recruitment Pipeline & Recruiter Assignment (20%) */}
        <div className="lg:col-span-2 bg-background sticky top-6 p-4 space-y-4 z-10 border-r border-border">
          {/* Recruiter Assignment Section */}
          <div className="w-full">
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Recruiter Assignment</h3>
              </div>
              <div className="space-y-3">
                <Select
                  value={candidate.recruiterId || 'unassign'}
                  onValueChange={(value) => handleAssignRecruiter(value === 'unassign' ? null : value)}
                  disabled={isAssigningRecruiter}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Select recruiter..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassign" className="text-destructive">Unassign</SelectItem>
                    {recruiters.map((recruiter) => (
                      <SelectItem key={recruiter.id} value={recruiter.id}>
                        {recruiter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAssigningRecruiter && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Assigning...
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Recruitment Pipeline */}
          {availableStages.length > 0 && candidate && (
            <div className="w-full">
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Recruitment Pipeline</h3>
                </div>
                <RecruitmentPipelineCard
                  stages={availableStages}
                  transitionHistory={transitionHistory}
                  currentStatus={candidate.status}
                  onStageClick={(stageName) => {
                    setIsTransitionsModalOpen(true);
                  }}
                  editableNotes={true}
                  onNoteEdit={async (transitionId, newNote) => {
                    await fetch(`/api/transitions/${transitionId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ notes: newNote }),
                      credentials: 'include',
                    });
                    // Refresh transition history
                    const res = await fetch(`/api/transitions?candidateId=${candidateId}`, { credentials: 'include' });
                    if (res.ok) {
                      const data = await res.json();
                      setTransitionHistory(Array.isArray(data) ? data : (data.data || []));
                    }
                  }}
                  candidateId={candidateId}
                />
              </div>
            </div>
          )}
        </div>
        {/* MAIN CONTENT (50%) with Sections */}
        <div className="lg:col-span-5 space-y-8 border-r border-l border-border p-8 max-h-[calc(100vh-200px)] overflow-y-auto bg-muted/50">
          {/* Job Applied Section */}
          <section className="mb-4">
            <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setJobAppliedOpen(o => !o)}>
              <div className="mr-3 p-2 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-lg">
                <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Job Applied</h2>
              {jobAppliedOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
            </button>
            {jobAppliedOpen && (
              <div className="space-y-4 transition-all duration-200">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-card space-y-4">
                      <div>
                        <Label className="text-sm font-medium mb-2">Applied Position</Label>
                        <Controller
                          name="positionId"
                          control={control}
                          render={({ field }) => (
                            <PositionSelectDropdown
                              value={field.value || ''}
                              onValueChange={val => field.onChange(!val || val === '' ? null : val)}
                              placeholder="Select the position this candidate applied for..."
                              filterOpenOnly={false}
                            />
                          )}
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          This is the position the candidate actually applied for.
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium mb-2">Match Score</Label>
                        <Input 
                          type="number" 
                          min="0"
                          max="100"
                          placeholder="0-100" 
                          {...register('fitScore', { 
                            valueAsNumber: true,
                            min: { value: 0, message: "Score must be at least 0" },
                            max: { value: 100, message: "Score must be at most 100" }
                          })} 
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Rate how well this candidate fits the applied position (0-100).
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium mb-2">Assignment Justification</Label>
                        <div className="space-y-3">
                          {(!watch('assignmentJustification') || watch('assignmentJustification')?.length === 0) && (
                            <div className="text-center py-4 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                              <Info className="mx-auto h-8 w-8 mb-2 opacity-50" />
                              <p className="text-sm">No justification items added yet.</p>
                              <p className="text-xs">Click \"Add Justification\" to get started.</p>
                            </div>
                          )}
                          {watch('assignmentJustification')?.map((item: string, index: number) => (
                            <div key={index} className="flex items-start gap-2 group">
                              <div className="flex-1">
                                <Input
                                  placeholder={`Justification reason ${index + 1}...`}
                                  {...register(`assignmentJustification.${index}`)}
                                  className="resize-none"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  const current = watch('assignmentJustification') || [];
                                  const updated = current.filter((_: string, i: number) => i !== index);
                                  setValue('assignmentJustification', updated);
                                }}
                                title="Remove justification"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              const current = watch('assignmentJustification') || [];
                              setValue('assignmentJustification', [...current, '']);
                            }}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Justification
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Add detailed reasons for assigning this candidate to the applied position.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appliedJobId ? (
                      <div 
                        className="relative rounded-lg cursor-pointer hover:shadow-xl transition-all duration-200 text-foreground"
                        style={{
                          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
                          padding: '2px',
                          boxShadow: '0 4px 12px -2px hsla(var(--primary), 0.4), 0 2px 4px -1px hsla(var(--primary), 0.2)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.filter = 'brightness(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.filter = 'brightness(1)';
                        }}
                        onClick={() => {
                          console.log('Job Applied card clicked');
                          const position = Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === appliedJobId) : null;
                          if (position) {
                        
                            let normalizedFitScore = 0;
                            if (typeof appliedFitScore === 'number' && !isNaN(appliedFitScore)) {
                              if (appliedFitScore > 1 && appliedFitScore <= 100) {
                                normalizedFitScore = appliedFitScore / 100;
                              } else if (appliedFitScore >= 0 && appliedFitScore <= 1) {
                                normalizedFitScore = appliedFitScore;
                              }
                            }
                            const appliedJobData = {
                              jobId: appliedJobId,
                              jobTitle: position.title,
                              fitScore: normalizedFitScore,
                              matchReasons: appliedJustification || [],
                              position: {
                                id: position.id,
                                title: position.title,
                                description: position.description,
                                department: position.department,
                                location: (position as any).location,
                                salary: (position as any).salary,
                                requirements: (position as any).requirements,
                                isOpen: position.isOpen,
                              }
                            };
                            setSelectedJobMatch(appliedJobData);
                            setIsJobMatchModalOpen(true);
                          }
                        }}
                      >
                        <div 
                          className="rounded-lg p-4 h-full border shadow-lg bg-card"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-foreground text-lg">
                              {Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === appliedJobId)?.title || 'Unknown Position' : 'Unknown Position'}
                            </h4>
                            {appliedJobBadge}
                           </div>
                          {appliedJustification.length > 0 && (
                             <div className="mt-3">
                              <h5 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                Justification:
                              </h5>
                              <div className="space-y-2">
                                {appliedJustification.map((sentence: string, index: number) => {
                                  const trimmedSentence = sentence.trim();
                                  if (!trimmedSentence) return null;
                                  return (
                                    <div 
                                      key={index}
                                      className="text-sm text-foreground px-3 py-2 rounded shadow-sm bg-muted"
                                    >
                                      {trimmedSentence}
                                    </div>
                                  );
                                })}
                              </div>
                             </div>
                           )}
                         </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Briefcase className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>No position applied for.</p>
                        <p className="text-sm">Click \"Edit\" to select the position this candidate applied for.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Job Matches Section */}
          <section className="mb-4">
            <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setJobMatchesOpen(o => !o)}>
              <ListChecks className="mr-2 h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold tracking-tight flex-1 text-left">
                Job Matches
                {candidateJobMatches && candidateJobMatches.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({candidateJobMatches.length})
                  </span>
                )}
            
              </h2>
              {jobMatchesOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
            </button>
            {jobMatchesOpen && (
              <div className="space-y-4 transition-all duration-200">
                {isEditing ? (
                  <div className="border rounded-lg p-4 bg-card">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Edit3 className="h-5 w-5 text-primary" />
                      Edit Job Matches
                    </h3>
                    <div className="space-y-4">
                      {jobMatchesFields.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <ListChecks className="mx-auto h-12 w-12 mb-4 opacity-50" />
                          <p>No job matches added yet.</p>
                          <p className="text-sm">Click \"Add Job Match\" to get started.</p>
                        </div>
                      )}
                      {jobMatchesFields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-lg space-y-3 bg-card relative group hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-muted-foreground">
                                Job Match #{index + 1}
                              </div>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" 
                              onClick={() => removeJobMatch(index)}
                              title="Remove job match"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">Position *</Label>
                              <Controller
                                name={`parsedData.job_matches.${index}.jobId`}
                                control={control}
                                render={({ field }) => (
                                  <PositionSelectDropdown
                                    value={field.value || ''}
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      // Update job title when position is selected
                                      const selectedPosition = Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === value) : null;
                                      if (selectedPosition) {
                                        setValue(`parsedData.job_matches.${index}.jobTitle`, selectedPosition.title);
                                      }
                                    }}
                                    placeholder="Select position..."
                                    filterOpenOnly={false}
                                  />
                                )}
                              />
                              {errors.parsedData?.job_matches?.[index]?.jobId && (
                                <p className="text-xs text-destructive">
                                  {errors.parsedData.job_matches[index]?.jobId?.message}
                                </p>
                              )}
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">Fit Score</Label>
                              <Input 
                                type="number" 
                                min="0"
                                max="100"
                                placeholder="0-100" 
                                {...register(`parsedData.job_matches.${index}.fitScore`, { 
                                  valueAsNumber: true,
                                  min: { value: 0, message: "Score must be at least 0" },
                                  max: { value: 100, message: "Score must be at most 100" }
                                })} 
                              />
                              {errors.parsedData?.job_matches?.[index]?.fitScore && (
                                <p className="text-xs text-destructive">
                                  {errors.parsedData.job_matches[index]?.fitScore?.message}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-sm font-medium">Match Reasons</Label>
                            <Textarea 
                              placeholder="Explain why this candidate is a good match for this position...&#10;e.g.,&#10;• Relevant experience in similar role&#10;• Strong technical skills&#10;• Good cultural fit&#10;• Meets key requirements"
                              {...register(`parsedData.job_matches.${index}.matchReasons`)}
                              rows={3}
                              className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                              Provide detailed reasons for this job match.
                            </p>
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" className="mt-2" onClick={() => appendJobMatch({ jobId: '', jobTitle: '', fitScore: 0, matchReasons: [] })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Job Match
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {candidateJobMatches && candidateJobMatches.length > 0 ? (
                      <div className="grid gap-4">
                        {candidateJobMatches.map((match: any, index: number) => {
                          return (
                            <Card key={index} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleJobMatchClick(match)}>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold">{match.jobTitle || 'Unknown Position'}</h4>
                                  {match.fitScore !== undefined && match.fitScore !== null && (
                                    <ScoreBadge score={match.fitScore}>
                                      {formatScoreWithGrade(match.fitScore)}
                                    </ScoreBadge>
                                  )}
                                </div>
                                {match.matchReasons && Array.isArray(match.matchReasons) && match.matchReasons.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Match reasons:</p>
                                    <ul className="text-sm space-y-1">
                                      {match.matchReasons.slice(0, 3).map((reason: string, reasonIndex: number) => (
                                        <li key={reasonIndex} className="flex items-start gap-2">
                                          <span className="text-primary text-xs mt-1">•</span>
                                          <span>{reason}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <ListChecks className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>No job matches found for this candidate.</p>
                        <p className="text-sm">Job matches will appear here if the candidate matches any positions.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Personal Information Section */}
          {candidate?.parsedData && (getParsedDataProperty('personal_info')) && (
            <section className="mb-4 border border-border rounded-lg p-8 bg-card">
              <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setPersonalInfoOpen(o => !o)}>
                <div className="mr-3 p-2 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-lg">
                  <UserCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Personal Information</h2>
                {personalInfoOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
              </button>
              {personalInfoOpen && (
                <div className="space-y-4 transition-all duration-200">
                  {isEditing ? (
                    <>
                      <Label htmlFor="parsedData.personal_info.title_honorific" className="mb-2">Title</Label>
                      <Input id="parsedData.personal_info.title_honorific" {...register('parsedData.personal_info.title_honorific')} className="mb-4" />
                      <Label htmlFor="parsedData.personal_info.firstname" className="mb-2">First Name</Label>
                      <Input id="parsedData.personal_info.firstname" {...register('parsedData.personal_info.firstname')} className="mb-4" />
                      <Label htmlFor="parsedData.personal_info.lastname" className="mb-2">Last Name</Label>
                      <Input id="parsedData.personal_info.lastname" {...register('parsedData.personal_info.lastname')} className="mb-4" />
                      <Label htmlFor="parsedData.personal_info.nickname" className="mb-2">Nickname</Label>
                      <Input id="parsedData.personal_info.nickname" {...register('parsedData.personal_info.nickname')} className="mb-4" />
                                        <Label htmlFor="parsedData.personal_info.introduction_aboutme" className="mb-2">About Me</Label>
                  <Textarea
                    id="parsedData.personal_info.introduction_aboutme"
                    {...register('parsedData.personal_info.introduction_aboutme')}
                    placeholder="Tell us about yourself..."
                    className="mb-4 min-h-[100px]"
                  />
                      <Label htmlFor="parsedData.personal_info.location" className="mb-2">Location</Label>
                      <Input id="parsedData.personal_info.location" {...register('parsedData.personal_info.location')} className="mb-4" />
                    </>
                  ) : (
                    <div className="space-y-4">
                      {renderField("Title", personalInfo?.title_honorific)}
                      {renderField("First Name", personalInfo?.firstname)}
                      {renderField("Last Name", personalInfo?.lastname)}
                      {renderField("Nickname", personalInfo?.nickname)}
                      {renderField("Location", personalInfo?.location, MapPin)}
                      {personalInfo?.introduction_aboutme && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center"><Info className="h-4 w-4 mr-2"/>About Me:</h4>
                          <p className="text-sm text-foreground whitespace-pre-wrap bg-card p-3 rounded-md">{personalInfo.introduction_aboutme}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Contact Information Section */}
          <section className="mb-4 border border-border rounded-lg p-8 bg-card">
            <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setContactOpen(o => !o)}>
              <div className="mr-3 p-2 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Contact Information</h2>
              {contactOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
            </button>
            {contactOpen && (
              <div className="space-y-4 transition-all duration-200">
                {isEditing ? (
                  <>
                    <Label htmlFor="email" className="mb-2">Email *</Label>
                    <Input id="email" type="email" {...register('email')} className="mb-4" />
                    {errors.email && <p className="text-sm text-destructive mb-4">{errors.email.message}</p>}
                    <Label htmlFor="phone" className="mb-2">Phone</Label>
                    <Input id="phone" type="tel" {...register('phone')} className="mb-4" />
                    {errors.phone && <p className="text-sm text-destructive mb-4">{errors.phone.message}</p>}
                  </>
                ) : (
                  <div className="space-y-4">
                    {renderField("Email", candidate?.email, Mail)}
                    {renderField("Phone", candidate?.phone, Phone)}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Education Section */}
       <section className="mb-4 border border-border rounded-lg p-8 bg-card">
       <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setEducationOpen(o => !o)}>
         <div className="mr-3 p-2 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-lg">
           <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
         </div>
         <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Education</h2>
         {educationOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
         </button>
       {educationOpen && (
         <div className="space-y-4 transition-all duration-200">
           {isEditing ? (
         <div className="space-y-4">
               {educationFields.map((field, index) => (
                 <div key={field.id} className="p-3 border rounded-md space-y-2 bg-muted/30 relative">
                   <Input placeholder="University" {...register(`parsedData.education.${index}.university`)} />
                   <Input placeholder="Major" {...register(`parsedData.education.${index}.major`)} />
                   <Input placeholder="Field" {...register(`parsedData.education.${index}.field`)} />
                   <Input placeholder="Campus" {...register(`parsedData.education.${index}.campus`)} />
                   <Controller
                     name={`parsedData.education.${index}.startMonth`}
                     control={control}
                     render={({ field }) => (
                       <MonthYearPicker
                         value={field.value || ''}
                         onChange={field.onChange}
                         label="Start Month"
                       />
                     )}
                   />
                   <Controller
                     name={`parsedData.education.${index}.startYear`}
                     control={control}
                     render={({ field }) => (
                       <MonthYearPicker
                         value={field.value || ''}
                         onChange={field.onChange}
                         label="Start Year"
                       />
                     )}
                   />
                   <Controller
                     name={`parsedData.education.${index}.endMonth`}
                     control={control}
                     render={({ field }) => (
                       <MonthYearPicker
                         value={field.value || ''}
                         onChange={field.onChange}
                         label="End Month"
                       />
                     )}
                   />
                   <Controller
                     name={`parsedData.education.${index}.endYear`}
                     control={control}
                     render={({ field }) => (
                       <MonthYearPicker
                         value={field.value || ''}
                         onChange={field.onChange}
                         label="End Year"
                       />
                     )}
                   />
                   <Controller
                     name={`parsedData.education.${index}.isCurrent`}
                     control={control}
                     render={({ field }) => (
                       <Checkbox
                         checked={field.value}
                         onCheckedChange={field.onChange}
                         id={`parsedData.education.${index}.isCurrent`}
                       >
                         Current
                       </Checkbox>
                     )}
                   />
                   <Controller
                     name={`parsedData.education.${index}.duration`}
                     control={control}
                     render={({ field }) => (
                       <MonthYearPicker
                         value={field.value || ''}
                         onChange={field.onChange}
                         label="Duration"
                       />
                     )}
                   />
                   <Input placeholder="GPA" {...register(`parsedData.education.${index}.GPA`)} />
                   <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeEducation(index)}>
                     <Trash2 className="h-4 w-4 text-destructive" />
                   </Button>
                 </div>
               ))}
               <Button type="button" variant="outline" className="mt-2" onClick={() => appendEducation({ university: '', major: '', field: '', campus: '', startMonth: '', startYear: '', endMonth: '', endYear: '', isCurrent: false, duration: '', GPA: '' })}>
                 <PlusCircle className="mr-2 h-4 w-4" /> Add Education
               </Button>
                   </div>
                 ) : (
             <div className="relative">
               {getEducation(candidate).length === 0 && (
                 <div className="text-sm text-muted-foreground text-center py-4">No education details provided.</div>
               )}
               {getEducation(candidate).map((edu: any, index: number) => {
                 const isCurrent = !edu.endYear && !edu.endMonth;
                 const periodDisplay = formatTimelinePeriod(edu.startMonth, edu.startYear, edu.endMonth, edu.endYear, isCurrent);
                 const duration = formatTimelineDuration(edu.startMonth, edu.startYear, edu.endMonth, edu.endYear, isCurrent);
                 return (
                   <div key={`edu-${index}-${edu.university || index}`} className="relative">
                     <div className="grid grid-cols-[12rem_4rem_1fr] gap-x-2 items-stretch h-full">
                       <div className="text-right h-full flex flex-col items-end justify-start">
                         {periodDisplay && (
                           <div className="text-muted-foreground whitespace-pre-line mb-1" dangerouslySetInnerHTML={{ __html: periodDisplay }} />
                         )}
                         {duration && (
                           <div className="text-sm text-muted-foreground">{duration}</div>
                         )}
                       </div>
                       {/* Timeline icon and vertical line */}
                       <div className="flex flex-col items-center h-full">
                         <div className="w-10 h-10 bg-muted rounded-full bg-card flex items-center justify-center z-10  border-border relative">
                           <GraduationCap className="w-6 h-6 text-foreground" />
                         </div>
                         {index < getEducation(candidate).length - 1 && (
                           <div className="w-px bg-border flex-grow" />
                         )}
                       </div>
                       {/* Content */}
                       <div className="bg-muted/50 rounded-lg p-4 flex-1 flex items-center min-w-0 mb-8">
                         <div className="flex-1">
                           <h4 className="font-semibold text-foreground mb-1">
                             {edu.major && edu.field ? `${edu.major} - ${edu.field}` : edu.major || edu.field || 'Field of study not specified'}
                           </h4>
                           <p className="text-sm text-muted-foreground mb-2">
                             {edu.university || 'University not specified'}
                             {edu.campus && ` (${edu.campus})`}
                           </p>
                           <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                             {edu.GPA && (
                               <span>GPA: {edu.GPA}</span>
                             )}
                           </div>
                         </div>
                         {hasFitScore(edu) && (
                           <div className="flex flex-col items-center justify-center ml-6">
                             <span className="text-4xl font-extrabold text-primary leading-none">{formatScoreWithGrade(edu.fitScore)}</span>
                             <span className="text-lg text-muted-foreground font-semibold mt-1">{edu.fitScore}%</span>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
         </div>
       )}
     </section>

     {/* Experience Section */}
     <section className="mb-4 border border-border rounded-lg p-8 bg-card">
       <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setExperienceOpen(o => !o)}>
         <div className="mr-3 p-2 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-lg">
           <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
         </div>
         <h2 className="text-xl font-bold tracking-tight flex-1 text-left">
         Experience
         {(() => {
           const totalDuration = calculateTotalExperienceDuration(getExperience(candidate));
           return totalDuration ? ` (${totalDuration})` : '';
         })()}
       </h2>
         {experienceOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
       </button>
       {experienceOpen && (
         <div className="space-y-4 transition-all duration-200">
           {isEditing ? (
             <div className="space-y-4">
               {experienceFields.map((field, index) => (
                 <div key={field.id} className="p-3 border rounded-md space-y-2 bg-muted/30 relative">
                   <Input placeholder="Company" {...register(`parsedData.experience.${index}.company`)} />
                   <Input placeholder="Position" {...register(`parsedData.experience.${index}.position`)} />
                   <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      {...register(`parsedData.experience.${index}.description`)}
                      placeholder="Describe your role and responsibilities..."
                      className="mt-1 min-h-[80px]"
                    />
                  </div>
                   <Controller
                     name={`parsedData.experience.${index}.startMonth`}
                     control={control}
                     render={({ field }) => (
                       <MonthYearPicker
                         value={field.value || ''}
                         onChange={field.onChange}
                         label="Start Month"
                       />
                     )}
                   />
                   <Controller
                     name={`parsedData.experience.${index}.startYear`}
                     control={control}
                     render={({ field }) => (
                       <MonthYearPicker
                         value={field.value || ''}
                         onChange={field.onChange}
                         label="Start Year"
                       />
                     )}
                   />
                   <Controller
                     name={`parsedData.experience.${index}.endMonth`}
                     control={control}
                     render={({ field }) => (
                       <MonthYearPicker
                         value={field.value || ''}
                         onChange={field.onChange}
                         label="End Month"
                       />
                     )}
                   />
                   <Controller
                     name={`parsedData.experience.${index}.endYear`}
                     control={control}
                     render={({ field }) => (
                       <MonthYearPicker
                         value={field.value || ''}
                         onChange={field.onChange}
                         label="End Year"
                       />
                     )}
                   />
                   <Controller
                     name={`parsedData.experience.${index}.isCurrent`}
                     control={control}
                     render={({ field }) => (
                       <Checkbox
                         checked={field.value}
                         onCheckedChange={field.onChange}
                         id={`parsedData.experience.${index}.isCurrent`}
                       >
                         Current
                       </Checkbox>
                     )}
                   />
                   <Controller
                     name={`parsedData.experience.${index}.duration`}
                     control={control}
                     render={({ field }) => (
                       <MonthYearPicker
                         value={field.value || ''}
                         onChange={field.onChange}
                         label="Duration"
                       />
                     )}
                   />
                   <Input placeholder="Position Level" {...register(`parsedData.experience.${index}.positionLevel`)} />
                   <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeExperience(index)}>
                     <Trash2 className="h-4 w-4 text-destructive" />
                   </Button>
                 </div>
               ))}
               <Button type="button" variant="outline" className="mt-2" onClick={() => appendExperience({ company: '', position: '', description: '', startMonth: '', startYear: '', endMonth: '', endYear: '', isCurrent: false, duration: '', positionLevel: '' })}>
                 <PlusCircle className="mr-2 h-4 w-4" /> Add Experience
               </Button>
                   </div>
                 ) : (
             <div className="relative">
               {getExperience(candidate).length === 0 && (
                 <div className="text-sm text-muted-foreground text-center py-4">No experience details provided.</div>
               )}
               {getExperience(candidate).map((exp: any, index: number) => {
                 const isCurrent = !exp.endYear && !exp.endMonth;
                 const periodDisplay = formatTimelinePeriod(exp.startMonth, exp.startYear, exp.endMonth, exp.endYear, isCurrent);
                 const duration = formatTimelineDuration(exp.startMonth, exp.startYear, exp.endMonth, exp.endYear, isCurrent);
                 return (
                   <div key={`exp-${index}-${exp.company || index}`} className="relative">
                     <div className="grid grid-cols-[12rem_4rem_1fr] gap-x-2 items-stretch h-full">
                       <div className="text-right h-full flex flex-col items-end justify-start">
                         {periodDisplay && (
                           <div className="text-muted-foreground whitespace-pre-line mb-1" dangerouslySetInnerHTML={{ __html: periodDisplay }} />
                         )}
                         {duration && (
                           <div className="text-sm text-muted-foreground">{duration}</div>
                         )}
                       </div>
                       {/* Timeline icon and vertical line */}
                       <div className="flex flex-col items-center h-full">
                         <div className="w-10 h-10 bg-muted rounded-full bg-card flex items-center justify-center z-10  border-border relative">
                           <Briefcase className="w-6 h-6 text-foreground" />
                         </div>
                         {index < getExperience(candidate).length - 1 && (
                           <div className="w-px bg-border flex-grow" />
                         )}
                       </div>
                       {/* Content */}
                       <div className="bg-muted/50 rounded-lg p-4 flex-1 flex items-center min-w-0 mb-8">
                         <div className="flex-1">
                           <div className="mb-2">
                             <span className="text-primary font-semibold">
                               {exp.position || 'Position not specified'}
                             </span>
                             {exp.positionLevel && exp.positionLevel !== 'undefined' && exp.positionLevel !== undefined && (
                               <span className="text-foreground font-semibold">
                                 {' '}({exp.positionLevel})
                               </span>
                             )}
                           </div>
                           {exp.company && (
                             <div className="mb-3 flex items-center gap-2">
                               <Building2 className="h-4 w-4 text-muted-foreground" />
                               <span className="text-foreground">
                                 {exp.company}
                               </span>
                             </div>
                           )}
                           {exp.description && (
                             <div className="mt-3">
                               <h4 className="text-sm font-medium text-muted-foreground mb-2">Description:</h4>
                               <p className="text-sm text-foreground whitespace-pre-wrap bg-card p-3 rounded border">
                                 {exp.description}
                               </p>
                             </div>
                           )}
                         </div>
                         {hasFitScore(exp) && (
                           <div className="flex flex-col items-center justify-center ml-6">
                             <span className="text-4xl font-extrabold text-primary leading-none">{formatScoreWithGrade(exp.fitScore)}</span>
                             <span className="text-lg text-muted-foreground font-semibold mt-1">{exp.fitScore}%</span>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
         </div>
       )}
     </section>

     {/* Skills Section */}
     <section className="mb-4 border border-border rounded-lg p-8 bg-card">
       <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setSkillsOpen(o => !o)}>
         <div className="mr-3 p-2 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-lg">
           <HardDrive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
         </div>
         <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Skills</h2>
         {skillsOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
       </button>
       {skillsOpen && (
         <div className="space-y-4 transition-all duration-200">
           {isEditing ? (
             <div className="space-y-4">
               {skillsFields.map((field, index) => (
                 <div key={field.id} className="p-3 border rounded-md space-y-2 bg-muted/30 relative">
                   <Input placeholder="Skill Category" {...register(`parsedData.skills.${index}.segment_skill`)} />
                   <Textarea placeholder="Skills" {...register(`parsedData.skills.${index}.skill_string`)} />
                   <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeSkill(index)}>
                     <Trash2 className="h-4 w-4 text-destructive" />
                   </Button>
                 </div>
               ))}
               <Button type="button" variant="outline" className="mt-2" onClick={() => appendSkill({ segment_skill: '', skill_string: '', skill: [] })}>
                 <PlusCircle className="mr-2 h-4 w-4" /> Add Skill Category
               </Button>
                   </div>
                 ) : (
             <div className="space-y-4">
               {getParsedDataProperty('skills')?.length === 0 && (
                 <div className="text-sm text-muted-foreground text-center py-4">No skills provided.</div>
               )}
               {getParsedDataProperty('skills')?.map((skill: any, index: number) => {
                 // DEBUG LOGGING
                 console.log('Skill entry at index', index, skill, 'Type:', typeof skill);
                 return (
                   <div key={index} className="p-3 border rounded-md bg-muted/30">
                     <h4 className="font-semibold text-foreground mb-2">{skill.segment_skill || 'Skills'}</h4>
                     {skill.skill && Array.isArray(skill.skill) && skill.skill.length > 0 ? (
                       <div className="flex flex-wrap gap-1.5 mt-1">
                         {skill.skill.map((s: string, i: number) => (
                           <Badge key={`${index}-${i}-${s}`} variant="secondary" className="text-xs px-2 py-1">{s}</Badge>
                         ))}
                       </div>
                     ) : skill.skill_string ? (
                       <div className="flex flex-wrap gap-1.5 mt-1">
                         {skill.skill_string.split(',').map((s: string, i: number) => {
                           const trimmedSkill = s.trim();
                           return trimmedSkill ? (
                             <Badge key={`${index}-${i}-${trimmedSkill}`} variant="secondary" className="text-xs px-2 py-1">{trimmedSkill}</Badge>
                           ) : null;
                         })}
                       </div>
                     ) : (
                       <div className="text-sm text-muted-foreground">No skills listed</div>
                     )}
                   </div>
                 );
               })}
             </div>
           )}
         </div>
       )}
     </section>

     {/* Job Suitable Section */}
     <section className="mb-4 border border-border rounded-lg p-8 bg-card">
       <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setJobSuitableOpen(o => !o)}>
         <div className="mr-3 p-2 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-lg">
           <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
         </div>
         <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Job Suitable</h2>
         {jobSuitableOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
       </button>
       {jobSuitableOpen && (
         <div className="space-y-4 transition-all duration-200">
           {isEditing ? (
             <div className="space-y-4">
               {jobSuitableFields.map((field, index) => (
                 <div key={field.id} className="p-3 border rounded-md space-y-2 bg-muted/30 relative">
                   <Input placeholder="Suitable Career" {...register(`parsedData.job_suitable.${index}.suitable_career`)} />
                   <Input placeholder="Suitable Job Position" {...register(`parsedData.job_suitable.${index}.suitable_job_position`)} />
                   <Input placeholder="Suitable Job Level" {...register(`parsedData.job_suitable.${index}.suitable_job_level`)} />
                   <Input placeholder="Suitable Salary" {...register(`parsedData.job_suitable.${index}.suitable_salary_bath_month`)} />
                   <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeJobSuitable(index)}>
                     <Trash2 className="h-4 w-4 text-destructive" />
                   </Button>
                             </div>
               ))}
               <Button type="button" variant="outline" className="mt-2" onClick={() => appendJobSuitable({ suitable_career: '', suitable_job_position: '', suitable_job_level: '', suitable_salary_bath_month: '' })}>
                 <PlusCircle className="mr-2 h-4 w-4" /> Add Job Suitable
               </Button>
             </div>
           ) : (
             <div className="space-y-4">
               {getParsedDataProperty('job_suitable')?.length === 0 && (
                 <div className="text-sm text-muted-foreground text-center py-4">No job suitable information provided.</div>
               )}
               {getParsedDataProperty('job_suitable')?.map((job: any, index: number) => (
                 <div key={index} className="p-3 border rounded-md bg-muted/30">
                   <h4 className="font-semibold text-foreground mb-2">{job.suitable_career || 'Career Path'}</h4>
                   <div className="space-y-1 text-sm text-muted-foreground">
                     {job.suitable_job_position && <p><span className="font-medium">Position:</span> {job.suitable_job_position}</p>}
                     {job.suitable_job_level && <p><span className="font-medium">Level:</span> {job.suitable_job_level}</p>}
                     {job.suitable_salary_bath_month && <p><span className="font-medium">Salary:</span> {job.suitable_salary_bath_month}</p>}
                   </div>
                 </div>
               ))}
                             </div>
                           )}
                           </div>
                         )}
         </section>
       </div>
       {/* RIGHT SIDEBAR: Quick Stats, Comments & Activity, Attachments */}
       <div className="lg:col-span-3 bg-muted rounded-xl shadow-lg backdrop-blur-sm max-h-[calc(100vh-200px)] overflow-y-auto border border-border/50">
         <div className="sticky top-0 z-10 bg-gradient-to-r from-background/95 to-background/90 backdrop-blur-md border-b border-border/30 px-6 py-4">
           <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
             <BarChart3 className="h-5 w-5 text-primary" />
             Quick Stats
           </h3>
         </div>
         
         {/* Quick Stats Section */}
         <div className="px-3 py-3 bg-gradient-to-br from-slate-50/30 to-blue-50/20 dark:from-slate-800/20 dark:to-slate-700/10">
           <div className="grid grid-cols-3 gap-2">
             <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg p-2 border border-blue-200/20 dark:border-blue-700/10 text-center">
               <div className="text-lg font-bold text-foreground">
                 {(() => {
                   const totalExp = calculateTotalExperienceDuration(getExperience(candidate));
                   return totalExp || '-';
                 })()}
               </div>
               <div className="text-[10px] text-muted-foreground">Experience</div>
             </div>
             
             <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg p-2 border border-green-200/20 dark:border-green-700/10 text-center">
               <div className="flex items-center justify-center gap-1 mb-1">
                 <Building2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                 <div className="text-lg font-bold text-foreground">
                   {(() => {
                     const avgDuration = calculateAverageDurationPerCompany(getExperience(candidate));
                     return avgDuration || '-';
                   })()}
                 </div>
               </div>
               <div className="text-[10px] text-muted-foreground">Avg/Company</div>
             </div>
             
             <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg p-2 border border-blue-200/20 dark:border-blue-700/10 text-center">
               <div className="text-lg font-bold text-foreground">
                 {(() => {
                   const appliedDate = candidate.createdAt ? new Date(candidate.createdAt) : null;
                   const endDate = candidate.status === 'Hired' || candidate.status === 'Rejected' ? 
                     (candidate.updatedAt ? new Date(candidate.updatedAt) : new Date()) : 
                     new Date();
                   
                   if (!appliedDate) return 'N/A';
                   
                   const diffTime = Math.abs(endDate.getTime() - appliedDate.getTime());
                   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                   
                   if (diffDays === 0) return 'Today';
                   if (diffDays === 1) return '1 Day';
                   if (diffDays < 7) return `${diffDays} Days`;
                   if (diffDays < 30) {
                     const weeks = Math.floor(diffDays / 7);
                     const remainingDays = diffDays % 7;
                     if (remainingDays === 0) return `${weeks} Week${weeks > 1 ? 's' : ''}`;
                     return `${weeks} Week${weeks > 1 ? 's' : ''} ${remainingDays} Day${remainingDays > 1 ? 's' : ''}`;
                   }
                   
                   const months = Math.floor(diffDays / 30);
                   const remainingDays = diffDays % 30;
                   
                   if (months === 0) return `${diffDays} Days`;
                   if (remainingDays === 0) return `${months} Month${months > 1 ? 's' : ''}`;
                   return `${months} Month${months > 1 ? 's' : ''} ${remainingDays} Day${remainingDays > 1 ? 's' : ''}`;
                 })()}
               </div>
               <div className="text-[10px] text-muted-foreground">Process</div>
             </div>
           </div>
         </div>

         <Accordion type="multiple" defaultValue={["comments-activity", "attachments"]} className="px-4 py-2 shadow-lg roudned">
           {/* Comments & Activity Section */}
           <AccordionItem value="comments-activity" className="rounded-lg mb-3 bg-white dark:bg-slate-800">
             <AccordionTrigger className="px-4 py-3 hover:no-underline bg-gradient-to-r from-blue-500/10 to-blue-600/15 dark:from-blue-400/20 dark:to-blue-500/25 rounded-t-lg">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-500/10 dark:bg-blue-400/20 rounded-lg">
                   <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                 </div>
                 <div className="text-left">
                   <span className="text-sm font-semibold text-foreground">Comments & Activity</span>
                   <p className="text-xs text-muted-foreground">View and add comments</p>
                 </div>
               </div>
             </AccordionTrigger>
             <AccordionContent className="px-6 pb-4 pt-4 bg-card">
               <CandidateCommentsSection 
                 candidateId={candidateId} 
                 comments={comments} 
                 isEditing={isEditing} 
                 onCommentsChange={() => onRefresh()} 
               />
             </AccordionContent>
           </AccordionItem>
           
           {/* Attachments Section */}
           <AccordionItem value="attachments" className="rounded-lg mb-3 bg-white dark:bg-slate-800">
             <AccordionTrigger className="px-4 py-3 hover:no-underline bg-gradient-to-r from-blue-500/5 to-blue-600/10 dark:from-blue-400/20 dark:to-blue-500/25 rounded-t-lg">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-500/10 dark:bg-blue-400/20 rounded-lg">
                   <UploadCloud className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                 </div>
                 <div className="text-left">
                   <span className="text-sm font-semibold text-foreground">Attachments</span>
                   <p className="text-xs text-muted-foreground">Manage files and documents</p>
                 </div>
               </div>
             </AccordionTrigger>
             <AccordionContent className="px-4 py-4 bg-card/30">
               <div className="space-y-3">
                 <CandidateResumesSection 
                   candidateId={candidateId} 
                   resumes={resumes} 
                   isEditing={isEditing} 
                   onResumesChange={() => onRefresh()} 
                 />
               </div>
             </AccordionContent>
           </AccordionItem>
         </Accordion>
       </div>
      </div>
 
      {/* Modals */}
      <UploadResumeModal
        isOpen={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        candidate={candidate}
        onUploadSuccess={(updatedCandidate) => {
          setCandidate(updatedCandidate);
          setIsUploadModalOpen(false);
        }}
      />
 
      <ManageTransitionsModal
        isOpen={isTransitionsModalOpen}
        onOpenChange={setIsTransitionsModalOpen}
        candidate={candidate}
        availableStages={availableStages}
        onUpdateCandidate={async (candidateId: string, status: string, notes?: string, suppressToast?: boolean) => {
          setCandidate(prev => prev ? { ...prev, status } : null);
        }}
        onRefreshCandidateData={async (candidateId: string) => {
          const response = await fetch(`/api/candidates/${candidateId}`, { credentials: 'include' });
          const updatedCandidate = await response.json();
          setCandidate(updatedCandidate);
        }}
        preselectedStage={null}
        comments={comments}
        onCommentsChange={() => {
          // Refresh comments
          onRefresh();
        }}
      />
 
      <JobMatchModal
        isOpen={isJobMatchModalOpen}
        onClose={() => setIsJobMatchModalOpen(false)}
        jobMatch={selectedJobMatch}
      />
 
      <EditPositionModal
        isOpen={isEditPositionModalOpen}
        onOpenChange={setIsEditPositionModalOpen}
        position={selectedPositionForEdit}
        onEditPosition={async () => {
          setIsEditPositionModalOpen(false);
          // Refresh candidate data
          const response = await fetch(`/api/candidates/${candidateId}`, { credentials: 'include' });
          const updatedCandidate = await response.json();
          setCandidate(updatedCandidate);
        }}
      />
 
      {/* Floating Save/Cancel buttons when editing */}
      {isEditing && (
        <div className="fixed bottom-6 right-6 z-50 flex gap-2">
          <Button
            onClick={handleSubmit(handleSaveDetails)}
            className="shadow-lg"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsEditing(false);
              if (candidate) {
                reset({
                  name: candidate.name || '',
                  email: candidate.email || '',
                  phone: candidate.phone || '',
                  positionId: !candidate.positionId || candidate.positionId === '' ? null : candidate.positionId,
                  fitScore: candidate.fitScore || null,
                  assignmentJustification: Array.isArray(candidate.assignmentJustification) ? candidate.assignmentJustification : (candidate.assignmentJustification ? [candidate.assignmentJustification] : []),
                  status: candidate.status || '',
                  recruiterId: !candidate.recruiterId || candidate.recruiterId === '' ? null : candidate.recruiterId,
                  parsedData: (candidate.parsedData as any) || {}
                });
              }
            }}
            className="shadow-lg"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}
      <CandidateAttachmentUploadModal
        candidateId={candidateId}
        open={isAttachmentModalOpen}
        onClose={() => setIsAttachmentModalOpen(false)}
        onUploadSuccess={onRefresh}
      />
    </div>
  );
 };
 
 export default FullCandidateDetail;