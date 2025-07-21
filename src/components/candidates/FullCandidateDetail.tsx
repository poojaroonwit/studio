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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
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
import { differenceInMonths, parse, isValid } from 'date-fns';
import JobMatchModal from './JobMatchModal';
import RecruiterAssignmentDropdown from './RecruiterAssignmentDropdown';

const MINIO_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL || `http://localhost:8721`;
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
    period: z.string().optional().nullable(),
    duration: z.string().optional().nullable(),
    GPA: z.string().optional().nullable(),
    university: z.string().optional().nullable(),
    campus: z.string().optional().nullable(),
}).deepPartial();

const experienceEntryEditSchema = z.object({
    company: z.string().optional().nullable(),
    position: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    period: z.string().optional().nullable(),
    duration: z.string().optional().nullable(),
    is_current_position: z.boolean().optional(),
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
}

// Timeline component for experience and education
const TimelineItem = ({ 
  icon: Icon, 
  title, 
  subtitle, 
  period, 
  description, 
  isLast = false 
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  period?: string;
  description?: string;
  isLast?: boolean;
}) => (
  <div className="flex gap-4">
    {/* Timeline line and icon */}
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      {!isLast && (
        <div className="w-0.5 h-8 bg-border mt-2"></div>
      )}
    </div>
    
    {/* Content */}
    <div className="flex-1 pb-6">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">{title}</h4>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {period && (
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              <Clock className="w-3 h-3 mr-1" />
              {period}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  </div>
);

const FullCandidateDetail: React.FC<FullCandidateDetailProps> = ({ candidateId, isModal = false, onClose }) => {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTransitionsModalOpen, setIsTransitionsModalOpen] = useState(false);
  const [isJobMatchModalOpen, setIsJobMatchModalOpen] = useState(false);
  const [selectedJobMatch, setSelectedJobMatch] = useState<any>(null);
  const [resumes, setResumes] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
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



  // Remove duplicate form setup - using the one above with full configuration

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
        setCandidate(data);
        
        // Set form default values
        reset({
          name: data.name,
          email: data.email,
          phone: data.phone,
          positionId: data.positionId,
          recruiterId: data.recruiterId,
          fitScore: data.fitScore || null,
          status: data.status || '',
          parsedData: data.parsedData,
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

  // Fetch additional data
  useEffect(() => {
    if (!candidateId) return;

    const fetchAdditionalData = async () => {
      try {
        // Fetch resumes
        const resumesRes = await fetch(`/api/candidates/${candidateId}/resumes`);
        if (resumesRes.ok) {
          const resumesData = await resumesRes.json();
          setResumes(Array.isArray(resumesData) ? resumesData : (resumesData.data || []));
        }

        // Fetch comments
        const commentsRes = await fetch(`/api/candidates/${candidateId}/comments`);
        if (commentsRes.ok) {
          const commentsData = await commentsRes.json();
          setComments(Array.isArray(commentsData) ? commentsData : (commentsData.data || []));
        }

        // Fetch positions
        const positionsRes = await fetch('/api/positions/all');
        if (positionsRes.ok) {
          const positionsData = await positionsRes.json();
          setAllDbPositions(positionsData.data || []);
        }

        // Fetch stages
        const stagesRes = await fetch('/api/settings/recruitment-stages');
        if (stagesRes.ok) {
          const stagesData = await stagesRes.json();
          setAvailableStages(Array.isArray(stagesData) ? stagesData : []);
        }

        // Fetch recruiters
        const recruitersRes = await fetch('/api/users?role=Recruiter');
        if (recruitersRes.ok) {
          const recruitersData = await recruitersRes.json();
          setRecruiters(recruitersData.map((r: any) => ({ id: r.id, name: r.name })));
          setFilteredRecruiters(recruitersData.map((r: any) => ({ id: r.id, name: r.name })));
        }
      } catch (err) {
        console.error('Error fetching additional data:', err);
      }
    };

    fetchAdditionalData();
  }, [candidateId]);

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

  const handleSaveDetails = async (data: EditCandidateFormValues) => {
    if (!candidate) return;

    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('Failed to update candidate');
      }

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

  const handleJobMatchClick = (jobMatch: any) => {
    setSelectedJobMatch(jobMatch);
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

  const getJobMatches = () => {
    const parsedData = candidate?.parsedData;
    if (!parsedData || typeof parsedData !== 'object') return null;
    
    // Check if parsedData has job_matches property (CandidateDetails)
    if ('job_matches' in parsedData) {
      return (parsedData as any).job_matches;
    }
    
    return null;
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
        <div className="bg-card border-b border-border p-6 sticky top-0 z-50">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* Column 1: Candidate Header (7 cols) */}
            <div className={isModal ? "lg:col-span-10" : "lg:col-span-7"}>
                                  <div className="flex flex-col md:flex-row items-center gap-6">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {(() => {
                          const nameInfo = formatCandidateNameWithLang(candidate);
                          return (
                            <div className="relative group">
                              <Avatar className="w-20 h-20 text-3xl">
                                {candidate.avatarUrl ? (
                                  <AvatarImage src={candidate.avatarUrl} alt={nameInfo.name} />
                                ) : (
                                  <AvatarFallback>{nameInfo.name?.[0] || '?'}</AvatarFallback>
                                )}
                              </Avatar>
                              {/* Pencil icon button for avatar upload */}
                              <button
                                type="button"
                                className="absolute bottom-1 right-1 p-1 hover:bg-primary/10 transition z-10 flex items-center justify-center"
                                title="Change profile picture"
                                onClick={() => {
                                  // Open hidden file input for image upload
                                  if (avatarInputRef?.current) avatarInputRef.current.click();
                                }}
                                disabled={avatarUploading}
                                style={{ pointerEvents: avatarUploading ? 'none' : 'auto' }}
                              >
                                <Edit className="w-5 h-5 text-primary" />
                              </button>
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
                              {/* Existing overlay for edit mode remains unchanged */}
                              {isEditing && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ImageUpload
                                    value={candidate.avatarUrl || ''}
                                    onChange={async (urlOrFile) => {
                                      if (typeof urlOrFile === 'string') {
                                        await handleAvatarUpload(urlOrFile);
                                      } else if (urlOrFile && typeof urlOrFile === 'object' && 'name' in urlOrFile && 'type' in urlOrFile) {
                                        await handleAvatarUpload(urlOrFile);
                                      }
                                    }}
                                    label="Upload Profile Image"
                                    accept="image/*"
                                    maxSize={2 * 1024 * 1024}
                                    showPreview={false}
                                    allowUrl={false}
                                    allowFile={true}
                                    disabled={avatarUploading}
                                    className="w-full h-full"
                                  />
                                  {avatarUploading && <Loader2 className="animate-spin text-white h-6 w-6 absolute" />}
                                </div>
                              )}
                              {avatarUploading && !isEditing && (
                                <Loader2 className="animate-spin text-primary h-7 w-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20" />
                              )}
                            </div>
                          );
                        })()}
                  {avatarError && <div className="text-xs text-destructive mt-1">{avatarError}</div>}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    {(() => {
                      const nameInfo = formatCandidateNameWithLang(candidate);
                      return (
                        <span 
                          className={`text-2xl font-bold tracking-tight text-foreground line-clamp-1 ${nameInfo.fontClass}`}
                          lang={nameInfo.lang}
                        >
                          {nameInfo.name}
                        </span>
                      );
                    })()}
                    {candidate.status && (
                      <Badge variant={getStatusBadgeVariant(candidate.status)} className="text-xs px-2 py-1 rounded-full">{candidate.status}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-1">
                    {candidate.positionId && candidate.position && (
                      <span>Applied Job: <span className="font-medium text-foreground">{candidate.position.title}</span></span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                    {candidate.email && (
                      <span>Email: <span className="font-medium text-foreground">{candidate.email}</span></span>
                    )}
                    {candidate.phone && (
                      <span>Phone: <span className="font-medium text-foreground">{candidate.phone}</span></span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Column 2: Action Buttons (3 cols) - Only show in full page mode */}
            {!isModal && (
            <div className="lg:col-span-3">
              <div className="flex justify-end gap-2">
                  {!isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => {
                          setIsEditing(true);
                          if (candidate) {
                            reset({
                              name: candidate.name || '',
                              email: candidate.email || '',
                              phone: candidate.phone || '',
                              positionId: candidate.positionId || null,
                              fitScore: candidate.fitScore || null,
                              assignmentJustification: Array.isArray(candidate.assignmentJustification) ? candidate.assignmentJustification : (candidate.assignmentJustification ? [candidate.assignmentJustification] : []),
                              status: candidate.status || '',
                              recruiterId: candidate.recruiterId || null,
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
            )}
          </div>
        </div>
      )}
      
      <div className={`grid grid-cols-1 lg:grid-cols-10 border-t bg-card overflow-hidden ${isModal ? 'lg:grid-cols-12' : ''}`}>
        {/* LEFT SIDEBAR: Recruitment Pipeline (20%) */}
        <div className={`${isModal ? 'lg:col-span-3' : 'lg:col-span-2'} bg-card sticky top-6 p-6 space-y-6`}>
          {/* Recruitment Pipeline */}
          {availableStages.length > 0 && candidate && (
            <div className="w-full">
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
                  });
                  // Refresh transition history
                  const res = await fetch(`/api/transitions?candidateId=${candidateId}`);
                  if (res.ok) {
                    const data = await res.json();
                    setTransitionHistory(Array.isArray(data) ? data : (data.data || []));
                  }
                }}
                candidateId={candidateId}
              />
            </div>
          )}
          
          {/* Basic Info Card */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <User className="mr-2 h-5 w-5 text-primary" />
              Basic Information
            </h3>
            <div className="bg-muted rounded-lg p-4 space-y-3">
              {renderField('Email', candidate?.email, Mail)}
              {renderField('Phone', candidate?.phone, Phone)}
              {renderField('Position', candidate?.position?.title, Briefcase)}
              {renderField('Recruiter', candidate?.recruiter?.name, UserCog)}
              {candidate?.applicationDate && renderField('Applied', new Date(candidate.applicationDate).toLocaleDateString(), CalendarDays)}
              {candidate?.fitScore !== null && candidate?.fitScore !== undefined && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Fit Score:</span>
                    <span className="font-medium">{candidate.fitScore}%</span>
                  </div>
                  <Progress value={candidate.fitScore} className="h-2" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT (50%) with Sections */}
        <div className={`${isModal ? 'lg:col-span-6' : 'lg:col-span-5'} space-y-8 border-r border-l border-border p-8`}>
          {/* Job Applied Section */}
          <section className="mb-4 border border-border rounded-lg p-4 bg-card">
            <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setJobAppliedOpen(o => !o)}>
              <Briefcase className="mr-2 h-6 w-6 text-primary" />
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
                              onValueChange={field.onChange}
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
                        <Textarea 
                          placeholder="Explain why this candidate was assigned to this position...&#10;e.g.,&#10;• Strong technical background&#10;• Relevant experience in similar role&#10;• Good cultural fit with team&#10;• Meets all required qualifications"
                          {...register('assignmentJustification')}
                          rows={4}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Provide detailed reasons for assigning this candidate to the applied position.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {candidate?.positionId ? (
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
                          const position = Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === candidate.positionId) : null;
                          
                          if (position) {
                            const appliedJobData = {
                              jobId: candidate.positionId,
                              jobTitle: position.title,
                              fitScore: candidate.fitScore || 0,
                              matchReasons: candidate.assignmentJustification 
                                ? candidate.assignmentJustification.split('\n').map((sentence: string) => sentence.trim()).filter(Boolean)
                                : [],
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
                          className="rounded-lg p-4 h-full border shadow-lg"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-foreground text-lg">
                              {Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === candidate.positionId)?.title || 'Unknown Position' : 'Unknown Position'}
                            </h4>
                            {candidate.fitScore !== null && candidate.fitScore !== undefined && (
                              <div className="text-2xl font-bold text-primary flex items-center gap-2">
                                <span>{candidate.fitScore}%</span>
                                <span className="text-lg font-bold text-primary">({getScoreGrade(candidate.fitScore)})</span>
                              </div>
                            )}
                           </div>
                           
                          {candidate.assignmentJustification && (
                             <div className="mt-3">
                              <h5 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                Justification:
                              </h5>
                              <div className="space-y-2">
                                {candidate.assignmentJustification.split('\n').map((sentence: string, index: number) => {
                                  const trimmedSentence = sentence.trim();
                                  if (!trimmedSentence) return null;
                                  
                                  return (
                                    <div 
                                      key={index}
                                      className={`text-sm text-foreground px-3 py-2 rounded shadow-sm ${
                                        trimmedSentence.endsWith('.') 
                                          ? 'bg-primary/10 border border-primary/30' 
                                          : 'bg-muted/50'
                                      }`}
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
                        <p className="text-sm">Click "Edit" to select the position this candidate applied for.</p>
                      </div>
                    )}
                       </div>
                     )}
                   </div>
                 )}
               </section>

               {/* Job Matches Section */}
               <section className="mb-4 border border-border rounded-lg p-4 bg-card">
                 <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setJobMatchesOpen(o => !o)}>
                   <ListChecks className="mr-2 h-6 w-6 text-primary" />
                   <h2 className="text-xl font-bold tracking-tight flex-1 text-left">
                     Job Matches
                     {candidateJobMatches && candidateJobMatches.length > 0 && (
                       <span className="ml-2 text-sm font-normal text-muted-foreground">
                         ({candidateJobMatches.length})
                       </span>
                     )}
                     {candidateJobMatches && candidateJobMatches.length > 1 && (
                       <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                         ← Scroll →
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
                               <p className="text-sm">Click "Add Job Match" to get started.</p>
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
                             {candidateJobMatches.map((match: any, index: number) => (
                               <Card key={index} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleJobMatchClick(match)}>
                                 <div className="space-y-2">
                                   <div className="flex items-center justify-between">
                                     <h4 className="font-semibold">{match.jobTitle || 'Unknown Position'}</h4>
                                     {match.fitScore && (
                                       <Badge variant="outline">{match.fitScore}% Match</Badge>
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
                             ))}
                           </div>
                         ) : (
                           <div className="text-center py-8 text-muted-foreground">
                             <ListChecks className="mx-auto h-12 w-12 mb-4 opacity-50" />
                             <p>No another job matched with the candidate</p>
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                 )}
               </section>

               {/* Personal Information Section */}
               {candidate?.parsedData && (getParsedDataProperty('personal_info')) && (
                 <section className="mb-4 border border-border rounded-lg p-4 bg-card">
                   <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setPersonalInfoOpen(o => !o)}>
                     <UserCircle className="mr-2 h-6 w-6 text-primary" />
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
                           <Textarea id="parsedData.personal_info.introduction_aboutme" {...register('parsedData.personal_info.introduction_aboutme')} className="mb-4" />
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
               <section className="mb-4 border border-border rounded-lg p-4 bg-card">
                 <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setContactOpen(o => !o)}>
                   <Mail className="mr-2 h-6 w-6 text-primary" />
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
            <section className="mb-4 border border-border rounded-lg p-4 bg-card">
            <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setEducationOpen(o => !o)}>
              <GraduationCap className="mr-2 h-6 w-6 text-primary" />
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
                        <Input placeholder="Period" {...register(`parsedData.education.${index}.period`)} />
                        <Input placeholder="GPA" {...register(`parsedData.education.${index}.GPA`)} />
                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeEducation(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" className="mt-2" onClick={() => appendEducation({ university: '', major: '', field: '', campus: '', period: '', duration: '', GPA: '' })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Education
                    </Button>
                        </div>
                      ) : (
                  <div className="relative">
                    {/* Continuous vertical line that connects all education nodes */}
                    {getEducation(candidate).length > 0 && (
                      <div className="absolute left-36 top-0 w-0.5 bg-border" style={{ height: `${(getEducation(candidate).length - 1) * 80}px` }} />
                    )}
                    {getEducation(candidate).length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-4">No education details provided.</div>
                    )}
                    {getEducation(candidate).map((edu: any, index: number) => {
                      if (typeof edu === 'string') {
                        return (
                          <div key={`edu-${index}-${edu}`} className="relative mb-8">
                            {/* Timeline item */}
                            <div className="flex items-start space-x-4">
                              {/* Date on the left */}
                              <div className="flex-shrink-0 w-28 text-right">
                                <div className="text-xs text-muted-foreground font-medium">
                                  <div className="text-muted-foreground">Education</div>
                                </div>
                              </div>
                              {/* Timeline line and node */}
                              <div className="flex-shrink-0 relative flex flex-col items-center" style={{ width: '2rem', minHeight: '2.5rem' }}>
                                {/* Node (icon) */}
                                <div className="w-6 h-6 rounded-full bg-card flex items-center justify-center z-10 border-2 border-border">
                                  <GraduationCap className="w-3 h-3 text-foreground" />
                                </div>
                              </div>
                              {/* Content */}
                              <div className="flex-1 min-w-0 pb-0 flex items-center">
                                <div className="bg-muted/50 rounded-lg p-4 flex-1">
                                  {renderField("Education", edu)}
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
                      } else {
                        // Only use structured fields for timeline
                        let start = '', end = '', duration = '';
                        if (edu.startMonth && edu.startYear) {
                          const startDate = new Date(edu.startYear, edu.startMonth - 1);
                          start = startDate.toLocaleString('default', { month: 'short', year: 'numeric' });
                          if (edu.endMonth && edu.endYear) {
                            const endDate = new Date(edu.endYear, edu.endMonth - 1);
                            end = endDate.toLocaleString('default', { month: 'short', year: 'numeric' });
                          } else if (edu.isCurrent) {
                            end = 'Present';
                          }
                        }
                        if (start) {
                          const startDate = new Date(edu.startYear, edu.startMonth - 1);
                          let endDate: Date;
                          
                          if (edu.endMonth && edu.endYear) {
                            // Past education with end date
                            endDate = new Date(edu.endYear, edu.endMonth - 1);
                          } else if (edu.isCurrent) {
                            // Current education - use current date
                            endDate = new Date();
                          } else {
                            // No end date specified
                            endDate = startDate;
                          }
                          
                          const months = differenceInMonths(endDate, startDate);
                          const years = Math.floor(months / 12);
                          const remMonths = months % 12;
                          duration = [
                            years > 0 ? `${years} year${years > 1 ? 's' : ''}` : '',
                            remMonths > 0 ? `${remMonths} month${remMonths > 1 ? 's' : ''}` : ''
                          ].filter(Boolean).join(' ');
                        }
                        return (
                          <div key={`edu-${index}-${edu.university || index}`} className="relative mb-8">
                            {/* Timeline item */}
                            <div className="flex items-start space-x-4">
                              {/* Date on the left */}
                              <div className="flex-shrink-0 w-28 text-right">
                                <div className="text-xs text-muted-foreground font-medium space-y-1 mt-2">
                                  {(start || end) && (
                                    <div>
                                      <span className="text-primary font-black text-sm">{start}</span>
                                      {end && (
                                        <span className="text-primary font-black text-sm"> - {end}</span>
                                      )}
                                    </div>
                                  )}
                                  {duration && <div className="text-xs text-muted-foreground mt-1">{duration}</div>}
                                </div>
                              </div>
                              {/* Timeline line and node */}
                              <div className="flex-shrink-0 relative flex flex-col items-center" style={{ width: '2rem', minHeight: '2.5rem' }}>
                                {/* Node (icon) */}
                                <div className="w-6 h-6 rounded-full bg-card flex items-center justify-center z-10 border-2 border-border">
                                  <GraduationCap className="w-3 h-3 text-foreground" />
                                </div>
                              </div>
                              {/* Content */}
                              <div className="flex-1 min-w-0 pb-0 flex items-center">
                                <div className="bg-muted/50 rounded-lg p-4 flex-1">
                                  <h4 className="font-semibold text-foreground mb-1">
                                    {edu.university || 'University not specified'}
                                    {edu.campus && ` (${edu.campus})`}
                                  </h4>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {edu.major && edu.field ? `${edu.major} - ${edu.field}` : 
                                     edu.major || edu.field || 'Field of study not specified'}
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
                      }
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Experience Section */}
          <section className="mb-4 border border-border rounded-lg p-4 bg-card">
            <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setExperienceOpen(o => !o)}>
              <Briefcase className="mr-2 h-6 w-6 text-primary" />
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
                        <Textarea placeholder="Description" {...register(`parsedData.experience.${index}.description`)} />
                        <Input placeholder="Period" {...register(`parsedData.experience.${index}.period`)} />
                        <Input placeholder="Position Level" {...register(`parsedData.experience.${index}.positionLevel`)} />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`experience.${index}.is_current_position`}
                            {...register(`parsedData.experience.${index}.is_current_position`)}
                          />
                          <Label htmlFor={`experience.${index}.is_current_position`}>Current Position</Label>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeExperience(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" className="mt-2" onClick={() => appendExperience({ company: '', position: '', description: '', period: '', duration: '', is_current_position: false, positionLevel: '' })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Experience
                    </Button>
                        </div>
                      ) : (
                  <div className="relative">
                    {/* Continuous vertical line that connects all experience nodes */}
                    {getExperience(candidate).length > 0 && (
                      <div className="absolute left-36 top-0 w-0.5 bg-border" style={{ height: `${(getExperience(candidate).length - 1) * 80}px` }} />
                    )}
                    {getExperience(candidate).length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-4">No experience details provided.</div>
                    )}
                    {getExperience(candidate).map((exp: any, index: number) => {
                      if (typeof exp === 'string') {
                        return (
                          <div key={`exp-${index}-${exp}`} className="relative mb-8">
                            {/* Timeline item */}
                            <div className="flex items-start space-x-4">
                              {/* Date on the left */}
                              <div className="flex-shrink-0 w-28 text-right">
                                <div className="text-xs text-muted-foreground font-medium">
                                  <div className="text-muted-foreground">Experience</div>
                                </div>
                              </div>
                              {/* Timeline line and node */}
                              <div className="flex-shrink-0 relative flex flex-col items-center" style={{ width: '2rem', minHeight: '2.5rem' }}>
                                {/* Node (icon) */}
                                <div className="w-6 h-6 rounded-full bg-card flex items-center justify-center z-10 border-2 border-border">
                                  <Briefcase className="w-3 h-3 text-foreground" />
                                </div>
                              </div>
                              {/* Content */}
                              <div className="flex-1 min-w-0 pb-0 flex items-center">
                                <div className="bg-muted/50 rounded-lg p-4 flex-1">
                                  {renderField("Experience", exp)}
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
                      } else {
                        // Only use structured fields for timeline
                        let start = '', end = '', duration = '';
                        if (exp.startMonth && exp.startYear) {
                          const startDate = new Date(exp.startYear, exp.startMonth - 1);
                          start = startDate.toLocaleString('default', { month: 'short', year: 'numeric' });
                          if (exp.endMonth && exp.endYear) {
                            const endDate = new Date(exp.endYear, exp.endMonth - 1);
                            end = endDate.toLocaleString('default', { month: 'short', year: 'numeric' });
                          } else if (exp.isCurrent) {
                            end = 'Present';
                          }
                        }
                        if (start) {
                          const startDate = new Date(exp.startYear, exp.startMonth - 1);
                          let endDate: Date;
                          
                          if (exp.endMonth && exp.endYear) {
                            // Past position with end date
                            endDate = new Date(exp.endYear, exp.endMonth - 1);
                          } else if (exp.isCurrent) {
                            // Current position - use current date
                            endDate = new Date();
                          } else {
                            // No end date specified
                            endDate = startDate;
                          }
                          
                          const months = differenceInMonths(endDate, startDate);
                          const years = Math.floor(months / 12);
                          const remMonths = months % 12;
                          duration = [
                            years > 0 ? `${years} year${years > 1 ? 's' : ''}` : '',
                            remMonths > 0 ? `${remMonths} month${remMonths > 1 ? 's' : ''}` : ''
                          ].filter(Boolean).join(' ');
                        }
                        return (
                          <div key={`exp-${index}-${exp.company || index}`} className="relative mb-8">
                            {/* Timeline item */}
                            <div className="flex items-start space-x-4">
                              {/* Date on the left */}
                              <div className="flex-shrink-0 w-28 text-right">
                                <div className="text-xs text-muted-foreground font-medium space-y-1 mt-2">
                                  {(start || end) && (
                                    <div>
                                      <span className="text-primary font-black text-sm">{start}</span>
                                      {end && (
                                        <span className="text-primary font-black text-sm"> - {end}</span>
                                      )}
                                    </div>
                                  )}
                                  {duration && <div className="text-xs text-muted-foreground mt-1">{duration}</div>}
                                </div>
                              </div>
                              {/* Timeline line and node */}
                              <div className="flex-shrink-0 relative flex flex-col items-center" style={{ width: '2rem', minHeight: '2.5rem' }}>
                                {/* Node (icon) */}
                                <div className="w-6 h-6 rounded-full bg-card flex items-center justify-center z-10 border-2 border-border">
                                  <Briefcase className="w-3 h-3 text-foreground" />
                                </div>
                              </div>
                              {/* Content */}
                              <div className="flex-1 min-w-0 pb-0 flex items-center">
                                <div className="bg-muted/50 rounded-lg p-4 flex-1">
                                  {/* Position and Level */}
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
                                  
                                  {/* Company with Building Icon */}
                                  {exp.company && (
                                    <div className="mb-3 flex items-center gap-2">
                                      <span className="text-foreground">at</span>
                                      <Building2 className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-semibold text-foreground">
                                        {exp.company}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Description */}
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
                      }
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Skills Section */}
          <section className="mb-4 border border-border rounded-lg p-4 bg-card">
            <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setSkillsOpen(o => !o)}>
              <HardDrive className="mr-2 h-6 w-6 text-primary" />
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
                    {getParsedDataProperty('skills')?.map((skill: any, index: number) => (
                      <div key={index} className="p-3 border rounded-md bg-muted/30">
                        <h4 className="font-semibold text-foreground mb-2">{skill.segment_skill || 'Skills'}</h4>
                        <p className="text-sm text-muted-foreground">{skill.skill_string || 'No skills listed'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Job Suitable Section */}
          <section className="mb-4 border border-border rounded-lg p-4 bg-card">
            <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setJobSuitableOpen(o => !o)}>
              <Target className="mr-2 h-6 w-6 text-primary" />
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

          {/* Job Applied Section */}
          <section className="mb-4 border border-border rounded-lg p-4 bg-card">
            <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setJobAppliedOpen(o => !o)}>
              <Briefcase className="mr-2 h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Job Applied</h2>
              {jobAppliedOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
            </button>
            {jobAppliedOpen && (
              <div className="space-y-4 transition-all duration-200">
                <div className="space-y-4">
                  {candidate?.positionId ? (
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
                        const position = Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === candidate.positionId) : null;
                        
                        if (position) {
                          const appliedJobData = {
                            jobId: candidate.positionId,
                            jobTitle: position.title,
                            fitScore: candidate.fitScore || 0,
                            matchReasons: candidate.assignmentJustification 
                              ? candidate.assignmentJustification.split('\n').map((sentence: string) => sentence.trim()).filter(Boolean)
                              : [],
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
                      <div className="rounded-lg p-4 h-full border shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">
                            {Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === candidate.positionId)?.title || 'Unknown Position' : 'Unknown Position'}
                          </h4>
                          {candidate.fitScore !== null && candidate.fitScore !== undefined && (
                            <div className="text-2xl font-bold text-primary flex items-center gap-2">
                              <span>{candidate.fitScore}%</span>
                              <span className="text-lg font-bold text-primary">({candidate.fitScore >= 80 ? 'A' : candidate.fitScore >= 60 ? 'B' : candidate.fitScore >= 40 ? 'C' : candidate.fitScore >= 20 ? 'D' : 'E'})</span>
                                  </div>
                                )}
                              </div>
                        
                        {candidate.assignmentJustification && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              Justification:
                            </h5>
                            <div className="space-y-2">
                              {candidate.assignmentJustification.split('\n').map((sentence: string, index: number) => {
                                const trimmedSentence = sentence.trim();
                                if (!trimmedSentence) return null;
                                
                                return (
                                  <div 
                                    key={index}
                                    className={`text-sm text-foreground px-3 py-2 rounded shadow-sm ${
                                      trimmedSentence.endsWith('.') 
                                        ? 'bg-primary/10 border border-primary/30' 
                                        : 'bg-muted/50'
                                    }`}
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
                      <p className="text-sm">Click "Edit" to select the position this candidate applied for.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Job Matches Section */}
          <section className="mb-4 border border-border rounded-lg p-4 bg-card">
            <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setJobMatchesOpen(o => !o)}>
              <ListChecks className="mr-2 h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold tracking-tight flex-1 text-left">
                Job Matches
                {getJobMatches() && getJobMatches().length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({getJobMatches().length})
                  </span>
                )}
                {getJobMatches() && getJobMatches().length > 1 && (
                  <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    ← Scroll →
                  </span>
                )}
              </h2>
              {jobMatchesOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
            </button>
            {jobMatchesOpen && (
              <div className="space-y-4 transition-all duration-200">
                                {getJobMatches() && Array.isArray(getJobMatches()) && getJobMatches().length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">    
                    {getJobMatches().map((match: any, index: number) => (
                      <div
                        key={index}
                        className="relative rounded-lg cursor-pointer hover:shadow-xl transition-all duration-200 text-foreground border border-border"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                        onClick={() => handleJobMatchClick(match)}
                      >
                        <div className="p-4 h-full">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-foreground text-sm line-clamp-2">
                              {match.jobTitle || 'Unknown Position'}
                            </h4>
                                {match.fitScore && (
                              <div className="text-lg font-bold text-primary flex items-center gap-1">
                                <span>{match.fitScore}%</span>
                                <span className="text-sm font-bold text-primary">({match.fitScore >= 80 ? 'A' : match.fitScore >= 60 ? 'B' : match.fitScore >= 40 ? 'C' : match.fitScore >= 20 ? 'D' : 'E'})</span>
                              </div>
                                )}
                              </div>
                          
                              {match.matchReasons && Array.isArray(match.matchReasons) && match.matchReasons.length > 0 && (
                            <div className="mt-3">
                              <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                Match reasons:
                              </h5>
                              <ul className="text-xs space-y-1">
                                {match.matchReasons.slice(0, 2).map((reason: string, reasonIndex: number) => (
                                      <li key={reasonIndex} className="flex items-start gap-2">
                                        <span className="text-primary text-xs mt-1">•</span>
                                    <span className="line-clamp-2">{reason}</span>
                                      </li>
                                    ))}
                                {match.matchReasons.length > 2 && (
                                  <li className="text-xs text-muted-foreground">
                                    +{match.matchReasons.length - 2} more reasons
                                  </li>
                                )}
                                  </ul>
                                </div>
                              )}
                            </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListChecks className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No another job matched with the candidate</p>
                  </div>
          )}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT SIDEBAR: Quick Actions & Summary (30%) */}
        <div className={`${isModal ? 'lg:col-span-3' : 'lg:col-span-3'} space-y-6 bg-card p-6 rounded-xl shadow-sm`}>
          {/* Recruitment Pipeline Section */}
          {candidate && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                Recruitment Pipeline
              </h3>
              <div className="bg-muted rounded-lg p-4">
                <RecruitmentPipelineCard
                  stages={availableStages}
                  transitionHistory={transitionHistory}
                  currentStatus={candidate.status || ''}
                  onStageClick={(stageName: string) => {
                    // Open manage transitions modal with preselected stage
                    setIsTransitionsModalOpen(true);
                  }}
                  editableNotes={true}
                  onNoteEdit={async (transitionId: string, newNote: string) => {
                    try {
                      const response = await fetch(`/api/transitions/${transitionId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notes: newNote }),
                      });
                      if (!response.ok) throw new Error('Failed to update note');
                      
                      // Refresh transition history
                      const historyResponse = await fetch(`/api/transitions?candidateId=${candidateId}`);
                      if (historyResponse.ok) {
                        const data = await historyResponse.json();
                        setTransitionHistory(Array.isArray(data) ? data : (data.data || []));
                      }
                    } catch (error) {
                      console.error('Error updating note:', error);
                      throw error;
                    }
                  }}
                  candidateId={candidateId}
                />
              </div>
            </div>
          )}

          {/* Comments & Activity Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <MessageSquare className="mr-2 h-5 w-5 text-primary" />
              Comments & Activity
            </h3>
            <div className="bg-muted rounded-lg p-4">
              <CandidateCommentsSection
                candidateId={candidateId}
                comments={comments}
                isEditing={false}
                onCommentsChange={() => {
                  // Refresh comments
                  fetch(`/api/candidates/${candidateId}/comments`)
                    .then(res => res.json())
                    .then(data => setComments(Array.isArray(data) ? data : (data.data || [])))
                    .catch(console.error);
                }}
              />
            </div>
          </div>
          
          {/* Attachments Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <UploadCloud className="mr-2 h-5 w-5 text-primary" />
              Attachments
            </h3>
            <div className="bg-muted rounded-lg p-4">
              <CandidateResumesSection
                candidateId={candidateId}
                resumes={resumes}
                isEditing={false}
                onResumesChange={() => {
                  // Refresh resumes
                  fetch(`/api/candidates/${candidateId}/resumes`)
                    .then(res => res.json())
                    .then(data => setResumes(Array.isArray(data) ? data : (data.data || [])))
                    .catch(console.error);
                }}
              />
            </div>
          </div>
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
          const response = await fetch(`/api/candidates/${candidateId}`);
          const updatedCandidate = await response.json();
          setCandidate(updatedCandidate);
        }}
        preselectedStage={null}
        comments={comments}
        onCommentsChange={() => {
          // Refresh comments
          fetch(`/api/candidates/${candidateId}/comments`)
            .then(res => res.json())
            .then(data => setComments(Array.isArray(data) ? data : (data.data || [])))
            .catch(console.error);
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
          const response = await fetch(`/api/candidates/${candidateId}`);
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
                  positionId: candidate.positionId || null,
                  fitScore: candidate.fitScore || null,
                  assignmentJustification: Array.isArray(candidate.assignmentJustification) ? candidate.assignmentJustification : (candidate.assignmentJustification ? [candidate.assignmentJustification] : []),
                  status: candidate.status || '',
                  recruiterId: candidate.recruiterId || null,
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
    </div>
  );
};

export default FullCandidateDetail; 