"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Candidate, CandidateDetails, TransitionRecord, EducationEntry, ExperienceEntry, SkillEntry, JobSuitableEntry, PersonalInfo, AutomationJobMatch, UserProfile, Position, positionLevel, RecruitmentStage } from '@/lib/types';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScoreBadge, getScoreColorInfo } from '@/components/ui/score-color';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import { ArrowLeft, Briefcase, Building, CalendarDays, DollarSign, Edit, GraduationCap, HardDrive, Info, LinkIcon, ListChecks, Loader2, Mail, MapPin, MessageSquare, Percent, Phone, ServerCrash, ShieldAlert, Star, Tag, UploadCloud, User, UserCircle, UserCog, Users, Zap, ExternalLink, Edit3, Save, X, PlusCircle, Trash2, Lightbulb, ChevronDown, ChevronRight, ChevronUp, ChevronLeft, Activity, Clock, BarChart3, Eye, Download, Building2 } from 'lucide-react';
// import { formatScoreWithGrade, getScoreColor, getScoreBgColor } from "@/lib/scoreUtils";
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
import CandidateCommentsSection from '../../../components/candidates/CandidateCommentsSection';
import CandidateResumesSection from '../../../components/candidates/CandidateResumesSection';
import { Tabs as UITabs, TabsList as UITabsList, TabsTrigger as UITabsTrigger, TabsContent as UITabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { updateCandidateStatusWithNotes } from '@/lib/candidateTransitionUtils';
import { MonthYearPicker } from '@/components/ui/MonthYearPicker';
import { RecruitmentPipelineCard } from '@/components/candidates/RecruitmentPipelineCard';
import { PositionSelectDropdown } from '@/components/candidates/PositionSelectDropdown';
import { differenceInMonths, parse, isValid } from 'date-fns';
import JobMatchModal from '@/components/candidates/JobMatchModal';
import RecruiterAssignmentDropdown from '@/components/candidates/RecruiterAssignmentDropdown';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


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






// Add a helper function to calculate duration from period string
function calculateDuration(period?: string): string {
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
}

// Add this type guard near the top of your component file, after imports:
function hasFitScore(obj: any): obj is { fitScore: number } {
  return typeof obj === 'object' && obj !== null && 'fitScore' in obj && typeof obj.fitScore === 'number';
}

// Type guard for experience array
function hasExperienceArray(data: any): data is { experience: any[] } {
  return data && Array.isArray(data.experience);
}

// Type guard for education array
function hasEducationArray(data: any): data is { education: any[] } {
  return data && Array.isArray(data.education);
}

// Helper to normalize fitScore for API (0-1 decimal)
const normalizeScoreForApi = (score: any) => {
  if (typeof score === 'number' && score > 1 && score <= 100) return score / 100;
  if (typeof score === 'string' && !isNaN(Number(score)) && Number(score) > 1 && Number(score) <= 100) return Number(score) / 100;
  if (typeof score === 'number' && score >= 0 && score <= 1) return score;
  if (typeof score === 'string' && !isNaN(Number(score)) && Number(score) >= 0 && Number(score) <= 1) return Number(score);
  return 0;
};

// Utility for displaying fitScore as a percentage
function displayFitScore(score: number | undefined | null) {
  if (typeof score !== 'number' || isNaN(score)) return '';
  if (score >= 0 && score <= 1) return `${Math.round(score * 100)}%`;
  return `${Math.round(score)}%`;
}

// Utility for displaying fitScore as a percentage and grade
function displayFitScoreWithGrade(score: number | undefined | null) {
  if (typeof score !== 'number' || isNaN(score)) return 'N/A';
  let percent = score;
  if (score >= 0 && score <= 1) percent = Math.round(score * 100);
  else percent = Math.round(score);
  let grade = 'E';
  if (percent >= 80) grade = 'A';
  else if (percent >= 60) grade = 'B';
  else if (percent >= 40) grade = 'C';
  else if (percent >= 20) grade = 'D';
  return `${percent}% (${grade})`;
}

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id as string;

  // Defensive: validate candidateId is a UUID
  const uuidSchema = z.string().uuid();
  const isValidCandidateId = candidateId && uuidSchema.safeParse(candidateId).success;

  if (!isValidCandidateId) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-6">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Invalid Candidate ID</h2>
        <p className="text-muted-foreground mb-6">The candidate ID in the URL is not valid.</p>
        <Button onClick={() => router.push('/candidates')}>Back to Candidates</Button>
      </div>
    );
  }

  // Define fetchTransitionHistory before any useEffect that uses it
  const fetchTransitionHistory = useCallback(async () => {
    if (!candidateId) return;
    try {
      const res = await fetch(`/api/candidates/${candidateId}/logs`);
      if (!res.ok) throw new Error('Failed to fetch candidate logs');
      const data = await res.json();
      // Only keep stage change records
      const transitions = Array.isArray(data.data)
        ? data.data.filter((log: any) => log.action === 'Stage changed')
        : [];
      // Map to TransitionRecord shape if needed
      setTransitionHistory(transitions.map((tr: any) => ({
        id: tr.id,
        candidateId: candidateId,
        date: tr.time,
        stage: tr.stage,
        notes: tr.note,
        actingUserName: tr.user,
      })));
    } catch (error) {
      setTransitionHistory([]);
    }
  }, [candidateId]);

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [recruiters, setRecruiters] = useState<Pick<UserProfile, 'id' | 'name'>[]>([]);
  const [isAssigningRecruiter, setIsAssigningRecruiter] = useState(false);

  const { data: session, status: sessionStatus } = useSession();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTransitionsModalOpen, setIsTransitionsModalOpen] = useState(false);
  const [isJobMatchModalOpen, setIsJobMatchModalOpen] = useState(false);
  const [selectedJobMatch, setSelectedJobMatch] = useState<any>(null);

  const [allDbPositions, setAllDbPositions] = useState<Position[]>([]);
  const [isEditPositionModalOpen, setIsEditPositionModalOpen] = useState(false);
  const [selectedPositionForEdit, setSelectedPositionForEdit] = useState<Position | null>(null);
  const [availableStages, setAvailableStages] = useState<RecruitmentStage[]>([]);

  const [isEditing, setIsEditing] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);





  const [comments, setComments] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  // Add state for attachments
  const [attachments, setAttachments] = useState<any[]>([]);
  const [transitionHistory, setTransitionHistory] = useState<TransitionRecord[]>([]);
  const [showAllJobMatches, setShowAllJobMatches] = useState(false);
  const [recruiterSearchTerm, setRecruiterSearchTerm] = useState('');
  const [filteredRecruiters, setFilteredRecruiters] = useState<Pick<UserProfile, 'id' | 'name'>[]>([]);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  // Note: Removed eventSourceRef - no real-time polling for candidate details
  // Comments and resumes are fetched on initial load and updated optimistically on user actions

  // Find the state for jobAppliedOpen and set its default to true
  const [jobAppliedOpen, setJobAppliedOpen] = useState(true);

  // Initialize form early to avoid temporal dead zone
  const form = useForm<EditCandidateFormValues>({
    resolver: zodResolver(editCandidateDetailSchema),
    defaultValues: {
      name: candidate?.name || '',
      email: candidate?.email || '',
      phone: candidate && candidate.phone ? candidate.phone : '',
      positionId: !candidate?.positionId || candidate?.positionId === '' ? null : candidate?.positionId,
      fitScore: candidate?.fitScore || null,
      assignmentJustification: candidate?.assignmentJustification
        ? Array.isArray(candidate.assignmentJustification)
          ? candidate.assignmentJustification
          : [candidate.assignmentJustification]
        : [],
      status: candidate?.status || '',
      recruiterId: !candidate?.recruiterId || candidate?.recruiterId === '' ? null : candidate?.recruiterId,
      parsedData: (candidate?.parsedData as any) || {}
    }
  });

  const { handleSubmit, reset, setValue, formState: { isSubmitting, errors }, control, register } = form;

  // Field arrays for form sections
  const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({ control, name: "parsedData.education" });
  const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({ control, name: "parsedData.experience" });
  const { fields: skillsFields, append: appendSkill, remove: removeSkill } = useFieldArray({ control, name: "parsedData.skills" });
  const { fields: jobSuitableFields, append: appendJobSuitable, remove: removeJobSuitable } = useFieldArray({ control, name: "parsedData.job_suitable" });
  const { fields: jobMatchesFields, append: appendJobMatch, remove: removeJobMatch } = useFieldArray({ control, name: "parsedData.job_matches" });

  // Update form when candidate data changes
  useEffect(() => {
    if (candidate) {
      reset({
        name: candidate.name || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        positionId: !candidate?.positionId || candidate?.positionId === '' ? null : candidate?.positionId,
        fitScore: candidate?.fitScore || null,
        assignmentJustification: candidate?.assignmentJustification
          ? Array.isArray(candidate.assignmentJustification)
            ? candidate.assignmentJustification
            : [candidate.assignmentJustification]
          : [],
        status: candidate.status || '',
        recruiterId: !candidate?.recruiterId || candidate?.recruiterId === '' ? null : candidate?.recruiterId,
        parsedData: {
          ...(candidate.parsedData as any) || {},
          job_matches: (candidate.jobMatches || []).map((match: any) => ({
            jobId: match.jobId,
            jobTitle: match.positionTitle,
            fitScore: match.fitScore,
            matchReasons: match.matchReasons || [],
            matchReasons_string: Array.isArray(match.matchReasons) 
              ? match.matchReasons.join('\n')
              : ''
          }))
        }
      });
    }
  }, [candidate, reset]);

  // Update filtered recruiters when search term or recruiters list changes
  useEffect(() => {
    if (recruiterSearchTerm.trim() === '') {
      setFilteredRecruiters(recruiters);
    } else {
      const filtered = recruiters.filter(recruiter =>
        recruiter.name.toLowerCase().includes(recruiterSearchTerm.toLowerCase())
      );
      setFilteredRecruiters(filtered);
    }
  }, [recruiterSearchTerm, recruiters]);

  // Initial fetch of comments on page load (no real-time polling)
  useEffect(() => {
    if (!candidateId) return;
    const fetchCommentsEffect = async () => {
      try {
        const res = await fetch(`/api/candidates/${candidateId}/comments`);
        if (!res.ok) {
          setComments([]);
          return;
        }
        
        const data = await res.json();
        
        // Handle both array and object { data: [...] }
        if (Array.isArray(data)) {
          setComments(data);
        } else if (data && Array.isArray(data.data)) {
          setComments(data.data);
        } else {
          setComments([]);
        }
      } catch (error) {
        setComments([]);
      }
    };
    fetchCommentsEffect();
  }, [candidateId]);

  // Initial fetch of resumes on page load (no real-time polling)
  useEffect(() => {
    if (!candidateId) return;
    const fetchResumesEffect = async () => {
      const res = await fetch(`/api/candidates/${candidateId}/resumes`);
      if (res.ok) {
        const data = await res.json();
        // If API returns { data: [...] }, extract data
        setResumes(Array.isArray(data) ? data : (data.data || []));
      } else {
        setResumes([]);
      }
    };
    fetchResumesEffect();
  }, [candidateId]);

  // Update fetchResumes to fetch attachments
  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/resumes`);
      const data = await res.json();
      if (Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    } catch {
      return [];
    }
  }, [candidateId]);

  // Update fetchComments to also extract attachments from comments
  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/comments`);
      const data = await res.json();
      if (Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    } catch {
      return [];
    }
  }, [candidateId]);

  // Reference to reload all attachments
  const loadAllAttachments = useCallback(async () => {
    const [resumeAttachments, commentList] = await Promise.all([
      fetchResumes(),
      fetchComments(),
    ]);
    // Extract attachments from comments
    const commentAttachments = (commentList || []).flatMap((comment: any) =>
      (comment.attachments || []).map((att: any) => ({
        ...att,
        label: att.label || 'comment',
        updatedAt: att.updatedAt || comment.createdAt || new Date().toISOString(),
      }))
    );
    // Merge and remove duplicates by filePath, id, or url
    const all = [...(resumeAttachments || []), ...commentAttachments];
    const unique: any[] = [];
    const seen = new Set();
    for (const att of all) {
      const key = att.filePath || att.id || att.url;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(att);
      }
    }
    unique.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setAttachments(unique);
  }, [fetchResumes, fetchComments]);

  // Merge attachments from resumes and comments
  useEffect(() => {
    loadAllAttachments();
    // Only run when candidateId changes or editing mode toggles
  }, [candidateId, isEditing, loadAllAttachments]);

  // Manual refresh after user actions (not automatic polling)
  const handleCommentsChange = async () => {
    await loadAllAttachments();
    // Re-fetch comments after user add/edit/delete actions
    try {
      const response = await fetch(`/api/candidates/${candidateId}/comments`);
      if (!response.ok) {
        return;
      }
      
      const data = await response.json();
      
      // Handle both array and object { data: [...] }
      if (Array.isArray(data)) {
        setComments(data);
      } else if (data && Array.isArray(data.data)) {
        setComments(data.data);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  // Manual refresh after user actions (not automatic polling)
  const handleResumesChange = () => {
    fetch(`/api/candidates/${candidateId}/resumes`).then(res => res.ok ? res.json() : []).then(data => {
      setResumes(Array.isArray(data) ? data : (data.data || []));
    });
  };

  const fetchCandidateDetails = useCallback(async () => {
    if (!candidateId) return;
    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await fetch(`/api/candidates/${candidateId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Failed to fetch candidate: ${response.statusText || `Status ${response.status}`}`;
        setFetchError(errorMessage);
        setCandidate(null);
        return;
      }
            const data: Candidate = await response.json();
      setCandidate(data);
    } catch (error) {
      console.error("Error fetching candidate details:", error);
      setFetchError((error as Error).message || "Could not load candidate data.");
      setCandidate(null);
    } finally {
      setIsLoading(false);
    }
  }, [candidateId]);

  const fetchRecruiters = useCallback(async () => {
    try {
      const response = await fetch('/api/users?role=Recruiter');
      if (!response.ok) throw new Error('Failed to fetch recruiters');
      const data: UserProfile[] = await response.json();
      setRecruiters(data.map(r => ({ id: r.id, name: r.name })));
    } catch (error) {
      console.error("Error fetching recruiters:", error);
      toast("Could not load recruiters for assignment.");
    }
  }, []);

  const fetchPositionsAndStages = useCallback(async () => {
    try {
      const [posResponse, stagesResponse] = await Promise.all([
        fetch('/api/positions/all'),
        fetch('/api/settings/recruitment-stages')
      ]);

      if (posResponse.ok) {
        const posData = await posResponse.json();
        setAllDbPositions(posData.data || []);
      } else {
        console.error("Failed to fetch positions");
        toast("Could not load the list of available positions.");
      }

      if (stagesResponse.ok) {
        const stagesData = await stagesResponse.json();
        setAvailableStages(Array.isArray(stagesData) ? stagesData : []);
      } else {
        console.error("Failed to fetch recruitment stages");
        toast("Could not load recruitment stages.");
      }
    } catch (error) {
      console.error("Error fetching positions or stages:", error);
      toast("A network error occurred while fetching initial data.");
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchCandidateDetails();
      fetchRecruiters();
      fetchPositionsAndStages();
      fetchTransitionHistory();
    }
  }, [candidateId, sessionStatus, fetchCandidateDetails, fetchRecruiters, fetchPositionsAndStages, fetchTransitionHistory]);

  useEffect(() => {
    if (fetchError) {
      toast(fetchError);
    }
  }, [fetchError]);

  // useEffect(() => {
  //   console.log('Available stages:', availableStages);
  // }, [availableStages]);

  const handleUploadSuccess = (updatedCandidate: Candidate) => {
    console.log('handleUploadSuccess called', updatedCandidate);
    if (!updatedCandidate || !updatedCandidate.id) return;
    setCandidate(updatedCandidate);
    setIsUploadModalOpen(false);
    toast("Resume has been uploaded and candidate details updated.");
    fetchCandidateDetails(); // Re-fetch to ensure all data is fresh
  };

  const handleTransitionsUpdated = (updatedHistory: TransitionRecord[], newStatus: string) => {
    if (candidate) {
      setCandidate({ ...candidate, status: newStatus, transitionHistory: updatedHistory });
    }
    fetchCandidateDetails();
  };

  const handleUpdateCandidateStatus = async (id: string, newStatus: string, notes?: string, suppressToast?: boolean) => {
    setIsLoading(true);
    try {
      // Use unified bulk update logic
      await updateCandidateStatusWithNotes(id, newStatus, notes);
      await fetchCandidateDetails();
      await fetchTransitionHistory();
      if (!suppressToast) {
        toast.success(`Candidate status updated to "${newStatus}".`);
      }
    } catch (error: any) {
      console.error('Error updating candidate status:', error);
      if (!suppressToast) {
        toast.error(error?.message || 'Failed to update status.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignRecruiter = async (newRecruiterId: string | null) => {
    if (!candidate || isAssigningRecruiter) return;
    setIsAssigningRecruiter(true);
    try {
      const response = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Send all fields to prevent data loss
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          positionId: candidate.positionId,
          recruiterId: newRecruiterId,
          fitScore: candidate.fitScore,
          status: candidate.status,
          parsedData: candidate.parsedData,
          custom_attributes: candidate.customAttributes ?? {},
          resumePath: candidate.resumePath ?? null,
          avatarUrl: candidate.avatarUrl ?? null,
          // Add any other fields you want to preserve here
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to assign recruiter: ${response.statusText}`);
      }
      const updatedCandidate: Candidate = await response.json();
      setCandidate(updatedCandidate);
      reset({
        name: updatedCandidate.name,
        email: updatedCandidate.email,
        phone: updatedCandidate.phone,
        positionId: updatedCandidate.positionId,
        recruiterId: updatedCandidate.recruiterId,
        fitScore: updatedCandidate.fitScore,
        status: updatedCandidate.status,
        parsedData: {
          ...(updatedCandidate.parsedData as CandidateDetails),
          skills: (updatedCandidate.parsedData as CandidateDetails)?.skills?.map(s => ({
            ...s,
            skill_string: s.skill?.join(', ') || ''
          })) || [],
          experience: ((updatedCandidate.parsedData as CandidateDetails)?.experience?.map(exp => ({
            ...exp,
            is_current_position: typeof exp.is_current_position === 'string'
              ? exp.is_current_position === 'true'
              : !!exp.is_current_position,
          })) || []) as {
            period?: string | null;
            duration?: string | null;
            company?: string | null;
            position?: string | null;
            description?: string | null;
            is_current_position?: boolean;
            positionLevel?: string | null;
          }[],
        }
      });
      toast(`Candidate assigned to ${updatedCandidate.recruiter?.name || 'Unassigned'}.`);
      await fetchRecruiters(); // Ensure recruiter list is always up-to-date
      await fetchCandidateDetails(); // Ensure candidate state is always up-to-date after recruiter assignment
    } catch (error) {
      toast((error as Error).message);
    } finally {
      setIsAssigningRecruiter(false);
    }
  };

  const handleJobMatchClick = (jobMatch: any) => {
    console.log('Raw match object:', jobMatch);
    // Find the position details - try by jobId first, then by jobTitle
    const position = Array.isArray(allDbPositions) ? 
                    (allDbPositions.find(p => p.id === jobMatch.jobId) || 
                     allDbPositions.find(p => p.title === jobMatch.jobTitle)) : null;
    
    // Normalize fitScore to 0-100 percentage
    const normalizeFitScore = (score: number | undefined | null) => {
      if (typeof score !== 'number' || isNaN(score)) return 0;
      if (score >= 0 && score <= 1) return Math.round(score * 100);
      return Math.round(score);
    };
    // Prepare the job match data with position details
    const jobMatchData = {
      jobId: position ? position.id : jobMatch.jobId,
      jobTitle: position ? position.title : jobMatch.jobTitle,
      fitScore: normalizeFitScore(jobMatch.fitScore),
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
    
    console.log('Opening JobMatchModal with:', jobMatchData);
    setSelectedJobMatch(jobMatchData);
    setIsJobMatchModalOpen(true);
  };

  const handlePositionEdited = async () => {
    toast("Position details have been saved.");
    setIsEditPositionModalOpen(false);
    await fetchPositionsAndStages();
    if (candidateId) {
        await fetchCandidateDetails();
    }
  };

  const handleExportCandidate = async () => {
    if (!candidate) return;
    
    try {
      const response = await fetch(`/api/candidates/${candidateId}/export`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Error exporting candidate data." }));
        throw new Error(errorData.message || 'Failed to export candidate');
      }
      
      const blob = await response.blob();
      const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || `candidate_${candidate.name}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Candidate details exported successfully!');
    } catch (error) {
      console.error('Error exporting candidate:', error);
      toast.error((error as Error).message || 'Failed to export candidate details');
    }
  };

  const handleSaveDetails = async (data: EditCandidateFormValues) => {
    if (!candidate) return;
    console.log('handleSaveDetails called', data);
    // Patch: update parsedData.job_applied as well as top-level fields
    const newJobApplied = {
      jobId: data.positionId,
      fitScore: normalizeScoreForApi(data.fitScore),
      justification: data.assignmentJustification || [],
    };
    // Fix: Ensure positionId and recruiterId are null if empty string
    // Fix: assignmentJustification should be a string for backend
    // Extract job matches from form (from parsedData.job_matches)
    const jobMatchesToSave = Array.isArray(data.parsedData?.job_matches)
      ? data.parsedData.job_matches.map(jm => ({
          jobId: jm.jobId,
          fitScore: normalizeScoreForApi(jm.fitScore),
          matchReasons: Array.isArray(jm.matchReasons)
            ? jm.matchReasons
            : (typeof jm.matchReasons_string === 'string' && jm.matchReasons_string.length > 0
                ? jm.matchReasons_string.split('\n').map((s: string) => s.trim()).filter(Boolean)
                : []),
        }))
      : [];
    const processedData = {
      ...data,
      positionId: !data.positionId || data.positionId === '' ? null : data.positionId,
      recruiterId: !data.recruiterId || data.recruiterId === '' ? null : data.recruiterId,
      assignmentJustification: Array.isArray(data.assignmentJustification)
        ? data.assignmentJustification.join('\n')
        : data.assignmentJustification,
      parsedData: {
        ...data.parsedData,
        job_applied: newJobApplied,
        // Do NOT save job_matches in parsedData
      },
    };
    try {
      // Save main candidate data
      const response = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData),
      });
      if (!response.ok) {
        throw new Error(`Failed to update candidate: ${response.statusText}`);
      }
      // No PATCH to v1 API for job matches
      await fetchCandidateDetails();
      setIsEditing(false);
      if (data && Object.keys(data).length > 0) {
        toast.success('Candidate details updated successfully.');
      }
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleCancelEdit = () => {
    if (candidate) {
        reset({
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone || '',
            positionId: !candidate?.positionId || candidate?.positionId === '' ? null : candidate?.positionId,
            fitScore: candidate?.fitScore || null,
            assignmentJustification: candidate?.assignmentJustification
              ? Array.isArray(candidate.assignmentJustification)
                ? candidate.assignmentJustification
                : [candidate.assignmentJustification]
              : [],
            status: candidate.status,
            recruiterId: !candidate?.recruiterId || candidate?.recruiterId === '' ? null : candidate?.recruiterId,
            parsedData: {
                ...(candidate.parsedData as CandidateDetails),
                skills: (candidate.parsedData as CandidateDetails)?.skills?.map(s => ({
                    ...s,
                    skill_string: Array.isArray(s.skill)
                        ? s.skill.filter((sk): sk is string => typeof sk === 'string').join(', ')
                        : (typeof s.skill_string === 'string' ? s.skill_string : '')
                })) || [],
                experience: ((candidate.parsedData as CandidateDetails)?.experience?.map(exp => ({
                    ...exp,
                    is_current_position: typeof exp.is_current_position === 'string'
                        ? exp.is_current_position === 'true'
                        : !!exp.is_current_position,
                })) || []) as {
                    period?: string | null;
                    duration?: string | null;
                    company?: string | null;
                    position?: string | null;
                    description?: string | null;
                    is_current_position?: boolean;
                    postition_level?: string | null;
                }[],
                job_matches: ((candidate.parsedData as CandidateDetails)?.job_matches?.map(match => ({
                    ...match,
                    matchReasons_string: Array.isArray(match.matchReasons) 
                        ? match.matchReasons.join('\n')
                        : ''
                })) || []) as {
                    jobTitle?: string | null;
                    fitScore?: number | null;
                    matchReasons?: string[];
                    matchReasons_string?: string | null;
                    is_applied_job?: boolean;
                }[],
            }
        });
    }
    setIsEditing(false);
  };

  const [preselectedStage, setPreselectedStage] = useState<string | null>(null);

  const [infoOpen, setInfoOpen] = useState(true);
  const [contactOpen, setContactOpen] = useState(true);
  const [educationOpen, setEducationOpen] = useState(true);
  const [experienceOpen, setExperienceOpen] = useState(true);
  const [skillsOpen, setSkillsOpen] = useState(true);
  const [jobSuitableOpen, setJobSuitableOpen] = useState(true);
  const [jobMatchesOpen, setJobMatchesOpen] = useState(true);
  const [jobMatchesScrollPosition, setJobMatchesScrollPosition] = useState(0);

  
  useEffect(() => {
    fetchTransitionHistory();
  }, [candidateId, fetchTransitionHistory]);

  // Unified function to open ManageTransitionsModal
  const openManageTransitionsModal = (stageName?: string) => {
    setPreselectedStage(stageName || candidate?.status || availableStages[0]?.name || null);
    setIsTransitionsModalOpen(true);
  };

  // Helper to get education and experience arrays, preferring structured fields
  function getEducation(candidate: Candidate | null) {
    if (!candidate) return [];
    
    let educationArray: any[] = [];
    
    if (Array.isArray(candidate.educationData) && candidate.educationData.length > 0) {
      educationArray = candidate.educationData;
    } else {
      // Type-safe access to education data
      const parsedData = candidate.parsedData;
      if (parsedData && typeof parsedData === 'object') {
        // Check for new candidate_info structure
        if ('candidate_info' in parsedData && parsedData.candidate_info && typeof parsedData.candidate_info === 'object') {
          const education = (parsedData.candidate_info as any).education;
          if (Array.isArray(education) && education.length > 0) {
            educationArray = education;
          }
        }
        // Check for direct education property
        if ('education' in parsedData) {
          const education = (parsedData as any).education;
          if (Array.isArray(education) && education.length > 0) {
            educationArray = education;
          }
        }
      }
    }
    
    // Sort education by timeline (latest first)
    return educationArray.sort((a, b) => {
      const getStartYear = (edu: any) => {
        if (edu.startYear) return edu.startYear;
        if (edu.period) {
          const yearMatch = edu.period.match(/(\d{4})/);
          return yearMatch ? parseInt(yearMatch[1]) : 0;
        }
        return 0;
      };
      
      const getStartMonth = (edu: any) => {
        if (edu.startMonth) return edu.startMonth;
        if (edu.period) {
          const monthMatch = edu.period.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
          if (monthMatch) {
            const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            return months.indexOf(monthMatch[1].toLowerCase()) + 1;
          }
        }
        return 0;
      };
      
      const yearA = getStartYear(a);
      const yearB = getStartYear(b);
      
      if (yearA !== yearB) return yearB - yearA; // Latest year first
      
      // If years are the same, sort by month (latest month first)
      const monthA = getStartMonth(a);
      const monthB = getStartMonth(b);
      
      return monthB - monthA; // Latest month first
    });
  }
  function getExperience(candidate: Candidate | null) {
    if (!candidate) return [];
    
    let experienceArray: any[] = [];
    
    if (Array.isArray(candidate.experienceData) && candidate.experienceData.length > 0) {
      experienceArray = candidate.experienceData;
    } else {
      // Type-safe access to experience data
      const parsedData = candidate.parsedData;
      if (parsedData && typeof parsedData === 'object') {
        // Check for new candidate_info structure
        if ('candidate_info' in parsedData && parsedData.candidate_info && typeof parsedData.candidate_info === 'object') {
          const experience = (parsedData.candidate_info as any).experience;
          if (Array.isArray(experience) && experience.length > 0) {
            experienceArray = experience;
          }
        }
        // Check for direct experience property
        if ('experience' in parsedData) {
          const experience = (parsedData as any).experience;
          if (Array.isArray(experience) && experience.length > 0) {
            experienceArray = experience;
          }
        }
      }
    }
    
    // Sort experience: current jobs first, then by timeline (latest first)
    return experienceArray.sort((a, b) => {
      // First, prioritize current positions
      const aIsCurrent = a.is_current_position === true || a.isCurrent === true || 
                        (a.period && (a.period.includes('Present') || a.period.includes('present'))) ||
                        !a.endMonth || !a.endYear;
      const bIsCurrent = b.is_current_position === true || b.isCurrent === true || 
                        (b.period && (b.period.includes('Present') || b.period.includes('present'))) ||
                        !b.endMonth || !b.endYear;
      
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;
      
      // If both are current or both are not current, sort by start date (latest first)
      const getStartYear = (exp: any) => {
        if (exp.startYear) return exp.startYear;
        if (exp.period) {
          const yearMatch = exp.period.match(/(\d{4})/);
          return yearMatch ? parseInt(yearMatch[1]) : 0;
        }
        return 0;
      };
      
      const getStartMonth = (exp: any) => {
        if (exp.startMonth) return exp.startMonth;
        if (exp.period) {
          const monthMatch = exp.period.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
          if (monthMatch) {
            const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            return months.indexOf(monthMatch[1].toLowerCase()) + 1;
          }
        }
        return 0;
      };
      
      const yearA = getStartYear(a);
      const yearB = getStartYear(b);
      
      if (yearA !== yearB) return yearB - yearA; // Latest year first
      
      // If years are the same, sort by month (latest month first)
      const monthA = getStartMonth(a);
      const monthB = getStartMonth(b);
      
      return monthB - monthA; // Latest month first
    });
  }

  if (isLoading && !fetchError) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }


  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-6">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Error Loading Candidate</h2>
        <p className="text-muted-foreground mb-6">{fetchError}</p>
        <Button onClick={fetchCandidateDetails}>Try Again</Button>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-6">
        <UserCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground">Candidate Not Found</h2>
        <p className="text-muted-foreground">The requested candidate could not be found.</p>
        <Button onClick={() => router.push('/candidates')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Candidates
        </Button>
      </div>
    );
  }

  // Helper function to safely extract properties from parsedData
  const getParsedDataProperty = (propertyName: string) => {
    const parsedData = candidate.parsedData;
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

  // Use type guards for flat properties on parsedData
  const personalInfo = getParsedDataProperty('personal_info');
  const contactInfo = getParsedDataProperty('contact_info');
  const education = getEducation(candidate);
  const experience = getExperience(candidate);
  const skills = getParsedDataProperty('skills');
  const jobSuitable = getParsedDataProperty('job_suitable');
  // Use jobMatches from the API response instead of parsedData.job_matches
  const candidateJobMatches = candidate.jobMatches || [];
  
  // Calculate applied job data from parsedData.job_applied or fallback to top-level fields
  // const jobApplied = (candidate.parsedData && 'job_applied' in candidate.parsedData)
  //   ? (candidate.parsedData as any).job_applied
  //   : undefined;

  // const appliedJobId = jobApplied?.jobId || candidate.positionId;
  // const appliedFitScore = jobApplied?.fitScore ?? candidate.fitScore;
  // --- Job Applied logic: match FullCandidateDetail 100% ---
  const appliedJustification = candidate?.assignmentJustification
    ? (Array.isArray(candidate.assignmentJustification)
        ? candidate.assignmentJustification
        : typeof candidate.assignmentJustification === 'string'
          ? candidate.assignmentJustification.split('\n').map((sentence: string) => sentence.trim()).filter(Boolean)
          : [])
    : [];
  // --- End Job Applied logic ---

  const renderField = (label: string, value?: string | number | null, icon?: React.ElementType, isLink?: boolean, linkHref?: string, linkTarget?: string) => {
    if (value === undefined || value === null || String(value).trim() === '' || (typeof value === 'number' && isNaN(value))) return null;
    const IconComponent = icon;
    const content = isLink ? (
      <a href={linkHref} target={linkTarget} rel={linkTarget === "_blank" ? "noopener noreferrer" : undefined} className="text-primary hover:underline cursor-pointer break-all">
        {String(value)}
      </a>
    ) : (
      <span className="text-foreground break-words">{String(value)}</span>
    );
    return (
      <div className="flex items-start text-sm py-1">
        {IconComponent && <IconComponent className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground shrink-0" />}
        <span className="font-medium text-muted-foreground mr-1 w-32 shrink-0">{label}:</span>
        {content}
      </div>
    );
  };

  const getDisplayFilename = (filePath: string | null | undefined): string => {
    if (!filePath) return "View Resume";
    // Ensure filePath is a string before attempting to split
    if (typeof filePath !== 'string') return "Invalid Path";
    const parts = filePath.split('-');
    if (parts.length > 2) {
      return parts.slice(2).join('-').replace(/_/g, ' ');
    }
    return parts.pop() || "View Resume";
  };

  // Update getGradeFromScore to handle both 0-1 and 0-100 input
  const getGradeFromScore = (score: number): string => {
    let percent = score;
    if (typeof percent === 'number' && percent >= 0 && percent <= 1) percent = percent * 100;
    if (percent >= 80) return 'A';
    if (percent >= 60) return 'B';
    if (percent >= 40) return 'C';
    if (percent >= 20) return 'D';
    return 'E';
  };

  // Add this function to handle avatar upload
  const handleAvatarUpload = async (fileUrlOrFile: string | File) => {
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      let avatarUrl = '';
      if (typeof fileUrlOrFile === 'string') {
        // If a URL is provided (from ImageUpload), just use it
        avatarUrl = fileUrlOrFile;
      } else {
        // If a File is provided, upload to backend
        const formData = new FormData();
        formData.append('avatar', fileUrlOrFile);
        const res = await fetch(`/api/candidates/${candidate.id}/avatar`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          throw new Error('Failed to upload avatar');
        }
        const data = await res.json();
        avatarUrl = data.avatar_url;
      }
      // Update avatar in UI (optimistically)
      // If using form, setValue; else, update candidate state
      if (setValue) setValue('parsedData.personal_info.avatar_url', avatarUrl);
      toast.success('Profile image updated');
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to upload avatar');
      toast.error('Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  // Utility to parse 'MMM yyyy' date strings
  const parseDate = (str: string) => {
    const d = parse(str, 'MMM yyyy', new Date());
    return isValid(d) ? d : null;
  };

  // Function to calculate total experience duration
  const calculateTotalExperienceDuration = (experienceArray: any[]) => {
    let totalMonths = 0;
    
    experienceArray.forEach((exp: any) => {
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
      // Check for valid end date (not future dates like 9999)
      const hasValidEndDate = exp.endYear && exp.endMonth && 
        exp.endYear <= new Date().getFullYear() + 1 && 
        exp.endYear >= 1900;
      
      if (hasValidEndDate && exp.endYear && exp.endMonth) {
        endDate = new Date(exp.endYear, exp.endMonth - 1);
      } else if (exp.is_current_position === true || exp.isCurrent === true || 
                 (exp.period && (exp.period.includes('Present') || exp.period.includes('present'))) ||
                 !exp.endMonth || !exp.endYear) {
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

  // Helper to map Tailwind bg-* class to hex color
  const tailwindBgToHex: Record<string, string> = {
    'bg-red-400': '#f87171',
    'bg-orange-400': '#fb923c',
    'bg-yellow-200': '#fef08a',
    'bg-yellow-400': '#facc15',
    'bg-lime-400': '#a3e635',
  };

  // Field arrays for form sections
  return (
    <div>
    
      <form onSubmit={handleSubmit(handleSaveDetails)}>
          {/* Header - 2 Columns */}
          {candidate && (
            <div className="bg-card border-b border-border p-6 sticky top-0 z-50">
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                {/* Column 1: Candidate Header (6 cols) */}
                <div className="lg:col-span-7">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0 relative">
                      {(() => {
                        const nameInfo = formatCandidateNameWithLang(candidate);
                        return (
                          <Avatar className="w-20 h-20 text-3xl relative group">
                            {candidate.avatarUrl ? (
                              <AvatarImage src={candidate.avatarUrl} alt={nameInfo.name} />
                            ) : (
                              <AvatarFallback>{nameInfo.name?.[0] || '?'}</AvatarFallback>
                            )}
                            {/* Pencil icon button for avatar upload */}
                            <div
                              role="button"
                              tabIndex={0}
                              className="absolute bottom-1 right-1 p-1 hover:bg-primary/10 transition z-10 flex items-center justify-center"
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
                              <Edit className="w-5 h-5 text-primary" />
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
                          </Avatar>
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
                        {candidate.id && (
                          <Badge variant="outline" className="text-xs px-2 py-1 rounded-full">ID: {candidate.id}</Badge>
                        )}
                        {candidate.status && (
                          <Badge variant={getStatusBadgeVariant(candidate.status)} className="text-xs px-2 py-1 rounded-full">{candidate.status}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-1">
                        {candidate.positionId && Array.isArray(allDbPositions) && allDbPositions.length > 0 && (
                          <span>
                            Applied Job: 
                            <span
                              className="font-medium text-foreground  inline-block align-middle"
                              style={{
                                display: 'inline-block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'normal',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                verticalAlign: 'middle',
                                cursor: 'pointer',
                              }}
                              title={allDbPositions.find(p => p.id === candidate.positionId)?.title || 'N/A'}
                            >
                              {allDbPositions.find(p => p.id === candidate.positionId)?.title || 'N/A'}
                            </span>
                          </span>
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
                

                
                {/* Column 2: Action Buttons (4 cols) */}
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
                                positionId: !candidate?.positionId || candidate?.positionId === '' ? null : candidate?.positionId,
                                fitScore: candidate?.fitScore || null,
                                assignmentJustification: candidate?.assignmentJustification
                                  ? Array.isArray(candidate.assignmentJustification)
                                    ? candidate.assignmentJustification
                                    : [candidate.assignmentJustification]
                                  : [],
                                status: candidate.status || '',
                                recruiterId: !candidate?.recruiterId || candidate?.recruiterId === '' ? null : candidate?.recruiterId,
                                parsedData: (candidate?.parsedData as any) || {}
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
                          onClick={() => openManageTransitionsModal()}
                          disabled={availableStages.length === 0}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Manage Transitions
                        </Button>
                        {/* Removed Export to Excel button as per requirements */}
                      </>
                    ) : (
                      <div className="flex gap-2">
                        {/* Save/Cancel buttons will be floating */}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Empty space for 2 cols to maintain 12-column grid */}
               
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-10 border-t bg-card overflow-hidden">
            {/* LEFT SIDEBAR: Recruitment Pipeline & Recruiter Assignment (20%) */}
            <div className="lg:col-span-2 bg-card sticky top-6 p-6 space-y-6 z-10">
              {/* Recruitment Pipeline */}
              {availableStages.length > 0 && candidate && (
                <div className="w-full">
                  <RecruitmentPipelineCard
                    stages={availableStages}
                    transitionHistory={transitionHistory}
                    currentStatus={candidate.status}
                    onStageClick={openManageTransitionsModal}
                    editableNotes={true}
                    onNoteEdit={async (transitionId, newNote) => {
                      await fetch(`/api/transitions/${transitionId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notes: newNote }),
                      });
                      await fetchCandidateDetails();
                      await fetchTransitionHistory();
                    }}
                    candidateId={candidateId}
                  />
                </div>
              )}
              {/* Recruiter Assignment Section removed from left sidebar as per requirements */}
            </div>
            {/* MAIN CONTENT (50%) with Tabs */}
            <div className="lg:col-span-5 space-y-8 border-r border-l border-border p-8 max-h-[calc(100vh-200px)] overflow-y-auto bg-muted/50">
              {/* Tabs for main content */}

                  {/* Job Applied Section */}
                  <section className="mb-4">
                    <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setJobAppliedOpen((o: boolean) => !o)}>
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
                                <Label className="text-sm font-medium mb-2">Match Score (0-1)</Label>
                                <Controller
                                  name="fitScore"
                                  control={control}
                                  render={({ field }) => (
                                    <div className="space-y-2">
                                      <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={field.value ?? 0}
                                        onChange={e => field.onChange(Number(e.target.value))}
                                        className="w-full"
                                      />
                                      <div className="flex justify-between text-xs">
                                        <span>0</span>
                                        <span>1</span>
                                      </div>
                                      <div className="mt-1 text-sm">
                                        <span className="font-bold">{displayFitScoreWithGrade(field.value)}</span>
                                      </div>
                                    </div>
                                  )}
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                  Use the slider to set the fit score (0 = poor fit, 1 = perfect fit).
                                </p>
                              </div>
                              
                              <div>
                                <Label className="text-sm font-medium mb-2">Assignment Justification</Label>
                                <div className="space-y-3">
                                  {(!form.watch('assignmentJustification') || form.watch('assignmentJustification')?.length === 0) && (
                                    <div className="text-center py-4 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                                      <Info className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                      <p className="text-sm">No justification items added yet.</p>
                                      <p className="text-xs">Click "Add Justification" to get started.</p>
                                    </div>
                                  )}
                                  {form.watch('assignmentJustification')?.map((item: string, index: number) => (
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
                                          const current = form.watch('assignmentJustification') || [];
                                          const updated = current.filter((_: string, i: number) => i !== index);
                                          form.setValue('assignmentJustification', updated);
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
                                      const current = form.watch('assignmentJustification') || [];
                                      form.setValue('assignmentJustification', [...current, '']);
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
                            {candidate.positionId ? (
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
                                      fitScore: displayFitScore(candidate?.fitScore),
                                      matchReasons: candidate?.assignmentJustification || [],
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
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span
                                            className="block  overflow-hidden text-ellipsis whitespace-pre-line line-clamp-2 cursor-pointer"
                                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                          >
                                            {Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === candidate.positionId)?.title || 'Unknown Position' : 'Unknown Position'}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                          {Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === candidate.positionId)?.title || 'Unknown Position' : 'Unknown Position'}
                                        </TooltipContent>
                                      </Tooltip>
                                    </h4>
                                    {candidate?.fitScore !== null && candidate?.fitScore !== undefined && (
                                      <div className="text-4xl font-extrabold flex items-center gap-2">
                                        <span
                                          style={{ color: tailwindBgToHex[getScoreColorInfo(candidate?.fitScore).bg] || '#000' }}
                                        >
                                          {displayFitScore(candidate?.fitScore)} ({getGradeFromScore(candidate?.fitScore || 0)})
                                        </span>
                                      </div>
                                    )}
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
                                <p className="text-sm">Click "Edit" to select the position this candidate applied for.</p>
                              </div>
                            )}
                                 </div>
                               )}
                       </div>
                    )}
                  </section>

                  {/* Job Matches Section */}
                  <section className={`mb-4 ${(!candidateJobMatches || candidateJobMatches.length === 0) ? 'border border-border rounded-lg p-4' : ''}`}>
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
                        {/* Edit Section */}
                        {isEditing && (
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
                                    
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Match Reasons</Label>
                                        <Textarea 
                                            placeholder="Enter match reasons, one per line&#10;e.g.,&#10;• Strong technical skills&#10;• Relevant experience&#10;• Good cultural fit"
                                            {...register(`parsedData.job_matches.${index}.matchReasons_string`)}
                                            rows={4}
                                            className="resize-none"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Each line will become a separate reason. Use bullet points (•) for better formatting.
                                        </p>
                                    </div>
                                </div>
                            ))}
                            
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        className="w-full" 
                                        onClick={() => appendJobMatch({ 
                                            jobId: '',
                                            jobTitle: '', 
                                            fitScore: 0, 
                                            matchReasons: [], 
                                            is_applied_job: false,
                                            matchReasons_string: ''
                                        })}
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Job Match
                                    </Button>
                                </div>
                            </div>
                        </div>
                                    </div>
                        )}

                        {/* View Section - Job Matches Cards */}
                        {!isEditing && (candidateJobMatches && candidateJobMatches.length > 0) && (
                            <div className="relative">
                              {/* Left Navigation Button - Section Level */}
                              {candidateJobMatches.length > 1 && (
                                    <Button 
                                        type="button"
                                        variant="outline" 
                                  size="icon"
                                  className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-background/95 backdrop-blur-sm border-border hover:bg-background shadow-lg hover:shadow-xl transition-all duration-200"
                                        onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const container = document.querySelector('.job-matches-container');
                                    if (container) {
                                      container.scrollBy({ left: -280, behavior: 'smooth' });
                                      // Update scroll position after animation
                                      setTimeout(() => {
                                        setJobMatchesScrollPosition(container.scrollLeft);
                                      }, 300);
                                    }
                                  }}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                    </Button>
                              )}
                              
                              {/* Right Navigation Button - Section Level */}
                              {candidateJobMatches.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                  size="icon"
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-background/95 backdrop-blur-sm border-border hover:bg-background shadow-lg hover:shadow-xl transition-all duration-200"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const container = document.querySelector('.job-matches-container');
                                    if (container) {
                                      container.scrollBy({ left: 280, behavior: 'smooth' });
                                      // Update scroll position after animation
                                      setTimeout(() => {
                                        setJobMatchesScrollPosition(container.scrollLeft);
                                      }, 300);
                                    }
                                  }}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                    </Button>

                                  
                              )}
                                  
                               
                                    <div 
                                className="flex overflow-x-auto gap-3 pb-2 job-matches-container scrollbar-hide" 
                                        style={{ 
                                            scrollbarWidth: 'none', 
                                            msOverflowStyle: 'none'
                                        }}
                                        onScroll={(e) => {
                                          const target = e.target as HTMLElement;
                                          setJobMatchesScrollPosition(target.scrollLeft);
                                        }}
                                    >
                                {candidateJobMatches.map((match: any, index: number) => {
                                  // Try to find position by jobId first, then by jobTitle
                                  const position = Array.isArray(allDbPositions) ? 
                                                 (allDbPositions.find(p => p.id === match.jobId) || 
                                                  allDbPositions.find(p => p.title === match.jobTitle)) : null;
                                  return (
                                    <Card key={`jobmatch-${index}-${match.jobTitle || index}`} className="flex-shrink-0 w-70 p-3 border rounded-lg hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleJobMatchClick(match)}>
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <h4 className="font-semibold text-foreground text-sm truncate">
                                            {position?.title || match.jobTitle || 'Unknown Position'}
                                          </h4>
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
                                            {match.matchReasons.length > 3 && (
                                              <div className="text-xs text-muted-foreground italic">
                                                +{match.matchReasons.length - 3} more reasons
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {(!match.matchReasons || match.matchReasons.length === 0) && (
                                          <div className="text-xs text-muted-foreground italic">
                                            No match reasons provided
                                          </div>
                                        )}
                                      </div>
                                    </Card>
                                  );
                                })}
                                    </div>
                                        </div>
                           
                    )}
                              </div>
                            )}
                               {!isEditing && (!candidateJobMatches || candidateJobMatches.length === 0) && (
                                      <div className="text-center py-8 text-muted-foreground">
                                        <ListChecks className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                        <p>No job matches found for this candidate.</p>
                                        <p className="text-sm">Job matches will appear here if the candidate matches any positions.</p>
                                      </div>
                                    )}
                  </section>

                

                  {/* Collapsible Candidate Info Sections */}
                  <section className="mb-4 border border-border rounded-lg p-4 bg-card">
                    <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setInfoOpen(o => !o)}>
                      <UserCircle className="mr-2 h-6 w-6 text-primary" />
                      <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Personal Information</h2>
                      {infoOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
                    </button>
                    {infoOpen && (
                      <div className="space-y-4 transition-all duration-200">
                     {isEditing ? (
                        <>
                            <Label htmlFor="parsedData.personal_info.title_honorific" className="mb-2">Title</Label>
                            <Input id="parsedData.personal_info.title_honorific" {...register('parsedData.personal_info.title_honorific')} className="mb-4" />
                            <Label htmlFor="parsedData.personal_info.firstname" className="mb-2">First Name *</Label>
                            <Input id="parsedData.personal_info.firstname" {...register('parsedData.personal_info.firstname')} className="mb-4" />
                            {errors.parsedData?.personal_info?.firstname && <p className="text-sm text-destructive mb-4">{errors.parsedData.personal_info.firstname.message}</p>}
                            <Label htmlFor="parsedData.personal_info.lastname" className="mb-2">Last Name *</Label>
                            <Input id="parsedData.personal_info.lastname" {...register('parsedData.personal_info.lastname')} className="mb-4" />
                            {errors.parsedData?.personal_info?.lastname && <p className="text-sm text-destructive mb-4">{errors.parsedData.personal_info.lastname.message}</p>}
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
                                        <Controller
                                          name={`parsedData.education.${index}.period`}
                                          control={control}
                                          render={({ field }) => (
                                            <MonthYearPicker
                                              value={field.value || ''}
                                              onChange={field.onChange}
                                              label="Period"
                                            />
                                          )}
                                        />
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
                            <div className="relative mb-8">
                              {education.length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-4">No education details provided.</div>
                              )}
                              {education.map((edu: any, index: number) => {
                                let periodDisplay = '', duration = '';
                                if (edu.period) {
                                  const match = edu.period.match(/([A-Za-z]+) (\d{4}) - (([A-Za-z]+) (\d{4})|Present)/);
                                  if (match) {
                                    const left = `<strong>${match[1]} ${match[2]}</strong>`;
                                    const right = `<strong>${match[3] === 'Present' ? 'Present' : `${match[4]} ${match[5]}`}</strong>`;
                                    periodDisplay = `${left} - ${right}`;
                                    duration = calculateDuration(edu.period);
                                  } else {
                                    periodDisplay = edu.period;
                                  }
                                }
                                return (
                                  <div key={`edu-${index}-${edu.university || index}`} className="relative">
                                    <div className="grid grid-cols-[12rem_4rem_1fr] gap-x-2 items-stretch h-full ">
                                      <div className="text-right h-full flex flex-col items-end justify-start pt-2">
                                        {/* Period and duration display */}
                                        {periodDisplay && (
                                          <div className=" text-muted-foreground whitespace-pre-line mb-1" dangerouslySetInnerHTML={{ __html: periodDisplay }} />
                                        )}
                                        {duration && (
                                          <div className="text-sm text-muted-foreground">({duration})</div>
                                        )}
                                      </div>
                                      {/* Timeline icon and vertical line */}
                                      <div className="flex flex-col items-center h-full">
                                        <div className="w-10 h-10 bg-muted rounded-full bg-card flex items-center justify-center z-10  border-border relative">
                                          <GraduationCap className="w-6 h-6 text-foreground" />
                                        </div>
                                        {index < education.length - 1 && (
                                          <div className="w-px bg-border flex-grow" />
                                        )}
                                      </div>
                                      {/* Content */}
                                      <div className="bg-muted/50 rounded-lg p-4 flex-1 flex items-center min-w-0  mb-8">
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
                                        <Controller
                                          name={`parsedData.experience.${index}.period`}
                                          control={control}
                                          render={({ field }) => (
                                            <MonthYearPicker
                                              value={field.value || ''}
                                              onChange={field.onChange}
                                              label="Period"
                                            />
                                          )}
                                        />
                                        <Controller
                                          name={`parsedData.experience.${index}.positionLevel`}
                                          control={control}
                                          render={({ field: controllerField }) => (
                                            <Input {...controllerField} value={controllerField.value || ''} placeholder="Position Level" />
                                          )}
                                        />
                                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeExperience(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" className="mt-2" onClick={() => appendExperience({ company: '', position: '', period: '', duration: '', is_current_position: false, description: '', positionLevel: null })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Experience
                                </Button>
                            </div>
                        ) : (
                            <div className="relative mb-8">
                              {(getExperience(candidate).length === 0) && (
                                <div className="text-sm text-muted-foreground text-center py-4">No experience details provided.</div>
                              )}
                              {experience.map((exp: any, index: number) => {
                                let periodDisplay = '', duration = '';
                                if (exp.period) {
                                  const match = exp.period.match(/([A-Za-z]+) (\d{4}) - (([A-Za-z]+) (\d{4})|Present)/);
                                  if (match) {
                                    const left = `<strong>${match[1]} ${match[2]}</strong>`;
                                    const right = `<strong>${match[3] === 'Present' ? 'Present' : `${match[4]} ${match[5]}`}</strong>`;
                                    periodDisplay = `${left} - ${right}`;
                                    duration = calculateDuration(exp.period);
                                  } else {
                                    periodDisplay = exp.period;
                                  }
                                }
                                return (
                                  <div key={`exp-${index}-${exp.company || index}`} className="relative">
                                    <div className="grid grid-cols-[12rem_4rem_1fr] gap-x-4 items-stretch h-full">
                                      <div className="text-right h-full flex flex-col items-end justify-start pt-2">
                                        {/* Period and duration display */}
                                        {periodDisplay && (
                                          <div className=" text-muted-foreground whitespace-pre-line mb-1" dangerouslySetInnerHTML={{ __html: periodDisplay }} />
                                        )}
                                        {duration && (
                                          <div className="text-sm text-muted-foreground">({duration})</div>
                                        )}
                                      </div>
                                      {/* Timeline icon and vertical line */}
                                      <div className="flex flex-col items-center h-full">
                                        <div className="w-10 h-10 bg-muted rounded-full bg-card flex items-center justify-center z-10  border-border relative">
                                          <Briefcase className="w-6 h-6 text-foreground" />
                                        </div>
                                        {index < experience.length - 1 && (
                                          <div className="w-px bg-border flex-grow" />
                                        )}
                                      </div>
                                      {/* Content */}
                                      <div className="bg-muted/50 rounded-lg p-4 flex-1 flex items-center min-w-0  mb-8">
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
                  <section className="mb-4 border border-border rounded-lg p-4 bg-card">
                    <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setSkillsOpen(o => !o)}>
                      <Star className="mr-2 h-6 w-6 text-primary" />
                      <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Skills</h2>
                      {skillsOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
                    </button>
                    {skillsOpen && (
                      <div className="space-y-4 transition-all duration-200">
                    {isEditing ? (
                        <div className="space-y-4">
                            {skillsFields.map((field, index) => (
                                <div key={field.id} className="p-3 border rounded-md space-y-2 bg-muted/30 relative">
                                    <Input placeholder="Skill Segment" {...register(`parsedData.skills.${index}.segment_skill`)} />
                                    <Textarea placeholder="Skills (comma-separated)" {...register(`parsedData.skills.${index}.skill_string`)} />
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeSkill(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" className="mt-2" onClick={() => appendSkill({ segment_skill: '', skill_string: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Skill Segment
                            </Button>
                        </div>
                    ) : (
                        (skills && skills.length > 0) ? (
                            <ul className="space-y-4">
                                {skills.map((skillEntry: any, index: number) => {
                                    // Match FullCandidateDetail logic: handle string, array, and object
                                    if (typeof skillEntry === 'string') {
                                        // Render string-only skill entry as badges
                                        return (
                                            <li key={`skill-${index}-${skillEntry}`} className="p-3 border rounded-md bg-muted/30">
                                                <h4 className="font-semibold text-foreground mb-2">Skills</h4>
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {skillEntry.split(',').map((s: string, i: number) => {
                                                        const trimmedSkill = s.trim();
                                                        return trimmedSkill ? (
                                                            <Badge key={`${index}-${i}-${trimmedSkill}`} variant="secondary" className="text-xs px-2 py-1">{trimmedSkill}</Badge>
                                                        ) : null;
                                                    })}
                                                </div>
                                            </li>
                                        );
                                    } else if (Array.isArray(skillEntry.skill) && skillEntry.skill.length > 0) {
                                        // Render SkillEntry object with skill array
                                        return (
                                            <li key={`skill-${index}-${skillEntry.segment_skill || index}`} className="p-3 border rounded-md bg-muted/30">
                                                <h4 className="font-semibold text-foreground mb-2">{skillEntry.segment_skill || 'Skills'}</h4>
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {skillEntry.skill.map((s: string, i: number) => (
                                                        <Badge key={`${index}-${i}-${s}`} variant="secondary" className="text-xs px-2 py-1">{s}</Badge>
                                                    ))}
                                                </div>
                                            </li>
                                        );
                                    } else if (typeof skillEntry.skill_string === 'string' && skillEntry.skill_string.length > 0) {
                                        // Render SkillEntry object with skill_string
                                        return (
                                            <li key={`skill-${index}-${skillEntry.segment_skill || index}`} className="p-3 border rounded-md bg-muted/30">
                                                <h4 className="font-semibold text-foreground mb-2">{skillEntry.segment_skill || 'Skills'}</h4>
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {skillEntry.skill_string.split(',').map((s: string, i: number) => {
                                                        const trimmedSkill = s.trim();
                                                        return trimmedSkill ? (
                                                            <Badge key={`${index}-${i}-${trimmedSkill}`} variant="secondary" className="text-xs px-2 py-1">{trimmedSkill}</Badge>
                                                        ) : null;
                                                    })}
                                                </div>
                                            </li>
                                        );
                                    } else {
                                        // No skills listed
                                        return (
                                            <li key={`skill-${index}-empty`} className="p-3 border rounded-md bg-muted/30">
                                                <h4 className="font-semibold text-foreground mb-2">{skillEntry.segment_skill || 'Skills'}</h4>
                                                <div className="text-sm text-muted-foreground">No skills listed</div>
                                            </li>
                                        );
                                    }
                                })}
                            </ul>
                        ) : <div className="text-sm text-muted-foreground text-center py-4">No skill details provided.</div>
                    )}
                      </div>
                    )}
                  </section>
                  <section className="mb-4 border border-border rounded-lg p-4 bg-card">
                    <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setJobSuitableOpen(o => !o)}>
                      <UserCog className="mr-2 h-6 w-6 text-primary" />
                      <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Job Suitability</h2>
                      {jobSuitableOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
                    </button>
                    {jobSuitableOpen && (
                      <div className="space-y-4 transition-all duration-200">
                     {isEditing ? (
                        <div className="space-y-4">
                            {jobSuitableFields.map((field, index) => (
                                <div key={field.id} className="p-3 border rounded-md space-y-2 bg-muted/30 relative">
                                    <Input placeholder="Suitable Career Path" {...register(`parsedData.job_suitable.${index}.suitable_career`)} />
                                    <Input placeholder="Suitable Job Position" {...register(`parsedData.job_suitable.${index}.suitable_job_position`)} />
                                    <Input placeholder="Suitable Job Level" {...register(`parsedData.job_suitable.${index}.suitable_job_level`)} />
                                    <Input placeholder="Desired Salary (THB/Month)" {...register(`parsedData.job_suitable.${index}.suitable_salary_bath_month`)} />
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeJobSuitable(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" className="mt-2" onClick={() => appendJobSuitable({ suitable_career: '', suitable_job_position: '', suitable_job_level: '', suitable_salary_bath_month: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Job Suitability
                            </Button>
                        </div>
                    ) : (
                        (jobSuitable && jobSuitable.length > 0) ? (
                            <ul className="space-y-4">
                                {jobSuitable.map((job: any, index: number) => (
                                <li key={`jobsuit-${index}-${job.suitable_career || index}`} className="p-3 border rounded-md bg-muted">
                                    {renderField("Career Path", job.suitable_career)}
                                    {renderField("Job Position", job.suitable_job_position)}
                                    {renderField("Job Level", job.suitable_job_level)}
                                    {renderField("Desired Salary (THB/Month)", job.suitable_salary_bath_month, DollarSign)}
                                    {index < jobSuitable!.length - 1 && <Separator className="my-3" />}
                                </li>
                                ))}
                            </ul>
                        ) : <div className="text-sm text-muted-foreground text-center py-4">No job suitability details provided.</div>
                    )}
                              </div>
                            )}
                  </section>

                </div>
            {/* RIGHT SIDEBAR: Quick Actions & Summary (30%) */}
            <div className="lg:col-span-3 bg-muted  rounded-xl shadow-sm max-h-[calc(100vh-200px)] overflow-y-auto">
              <Accordion type="multiple" defaultValue={["recruiter-assignment", "comments-activity", "attachments"]}>
                {/* Recruiter Assignment Section */}
                <AccordionItem value="recruiter-assignment" className="border-b">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline bg-card">
                    <div className="flex items-center">
                      <Users className="mr-2 h-5 w-5 text-primary bg-card" />
                      <span className="text-lg font-semibold">Recruiter Assignment</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 pt-4 bg/muted">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Current Recruiter:</span>
                      <Select
                        value={candidate.recruiterId || 'unassign'}
                        onValueChange={(value) => handleAssignRecruiter(value === 'unassign' ? null : value)}
                        disabled={isAssigningRecruiter}
                      >
                        <SelectTrigger className="min-w-[120px] border-none bg-transparent shadow-none">
                          <SelectValue placeholder="Assign..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassign">Unassign</SelectItem>
                          {recruiters.map((recruiter) => (
                            <SelectItem key={recruiter.id} value={recruiter.id}>
                              {recruiter.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Comments & Activity Section */}
                <AccordionItem value="comments-activity" className="border-b">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline bg-card">
                    <div className="flex items-center bg-card">
                      <MessageSquare className="mr-2 h-5 w-5 text-primary" />
                      <span className="text-lg font-semibold ">Comments & Activity</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 pt-4 bg-muted">
                    <CandidateCommentsSection 
                      candidateId={candidateId} 
                      comments={comments} 
                      isEditing={isEditing} 
                      onCommentsChange={handleCommentsChange} 
                    />
                  </AccordionContent>
                </AccordionItem>
                
                {/* Attachments Section */}
                <AccordionItem value="attachments" className="border-b-0">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline bg-card">
                    <div className="flex items-center bg-card">
                      <UploadCloud className="mr-2 h-5 w-5 text-primary" />
                      <span className="text-lg font-semibold">Attachments</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 pt-4 bg-muted">
                    <CandidateResumesSection 
                      candidateId={candidateId} 
                      resumes={Array.isArray(attachments) ? attachments : []} 
                      isEditing={isEditing} 
                      onResumesChange={handleResumesChange} 
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div> {/* <-- Add this closing div for the grid-cols-10 main grid */}
        </form>

        {candidate && (
          <>
            {/* Pipeline Stage/Transitions Modal */}
            <ManageTransitionsModal
                candidate={candidate}
                isOpen={isTransitionsModalOpen}
                onOpenChange={(open) => {
                  setIsTransitionsModalOpen(open);
                  if (!open) setPreselectedStage(null);
                }}
                onUpdateCandidate={handleUpdateCandidateStatus}
                onRefreshCandidateData={fetchCandidateDetails}
                availableStages={availableStages}
                preselectedStage={preselectedStage}
                comments={comments}
                onCommentsChange={handleCommentsChange}
            />
          </>
        )}
        {selectedPositionForEdit && (
            <EditPositionModal
              isOpen={isEditPositionModalOpen}
              onOpenChange={setIsEditPositionModalOpen}
              position={selectedPositionForEdit}
              onEditPosition={handlePositionEdited}
            />
        )}
        
        {/* Job Match Modal */}
        <JobMatchModal
          isOpen={isJobMatchModalOpen}
          onClose={() => setIsJobMatchModalOpen(false)}
          jobMatch={selectedJobMatch}
        />
        {/* Render UploadResumeModal for drag-and-drop upload */}
        <UploadResumeModal
          isOpen={isUploadModalOpen}
          onOpenChange={setIsUploadModalOpen}
          candidate={candidate}
          onUploadSuccess={handleUploadSuccess}
        />

        {/* Floating Save/Cancel Buttons for Edit Mode */}
        {isEditing && (
          <div className="fixed bottom-6 right-6 z-50 flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleCancelEdit}
              className="shadow-lg hover:shadow-xl transition-all duration-200 bg-background/95 backdrop-blur-sm border-border"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              onClick={handleSubmit(handleSaveDetails)}
              className="shadow-lg hover:shadow-xl transition-all duration-200 btn-primary-gradient"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </div>
    );
}
