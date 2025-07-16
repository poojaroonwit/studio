"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Candidate, CandidateDetails, TransitionRecord, EducationEntry, ExperienceEntry, SkillEntry, JobSuitableEntry, PersonalInfo, AutomationJobMatch, UserProfile, Position, positionLevel, RecruitmentStage } from '@/lib/types';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import { ArrowLeft, Briefcase, CalendarDays, DollarSign, Edit, GraduationCap, HardDrive, Info, LinkIcon, ListChecks, Loader2, Mail, MapPin, MessageSquare, Percent, Phone, ServerCrash, ShieldAlert, Star, Tag, UploadCloud, User, UserCircle, UserCog, Users, Zap, ExternalLink, Edit3, Save, X, PlusCircle, Trash2, Lightbulb, ChevronDown, ChevronRight, ChevronUp, ChevronLeft, Activity, Clock, BarChart3, Eye } from 'lucide-react';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor } from "@/lib/scoreUtils";
import { formatCandidateName } from "@/lib/candidateUtils";
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
import { updateCandidateStatusWithNotes } from '@/lib/candidateTransitionUtils';
import { MonthYearPicker } from '@/components/ui/MonthYearPicker';
import { RecruitmentPipelineCard } from '@/components/candidates/RecruitmentPipelineCard';
import { PositionSelectDropdown } from '@/components/candidates/PositionSelectDropdown';
import { differenceInMonths, parse, isValid } from 'date-fns';
import JobMatchModal from '@/components/candidates/JobMatchModal';
import RecruiterAssignmentDropdown from '@/components/candidates/RecruiterAssignmentDropdown';


const MINIO_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL || `http://localhost:9847`;
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
    job_title: z.string().optional().nullable(),
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
  assignmentJustification: z.string().optional(),
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

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id as string;

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
  const eventSourceRef = useRef<EventSource | null>(null);

  // Initialize form early to avoid temporal dead zone
  const form = useForm<EditCandidateFormValues>({
    resolver: zodResolver(editCandidateDetailSchema),
    defaultValues: {
      name: candidate?.name || '',
      email: candidate?.email || '',
      phone: candidate?.phone || '',
      positionId: candidate?.positionId || null,
      recruiterId: candidate?.recruiterId || null,
      fitScore: candidate?.fitScore || null,
      status: candidate?.status || '',
      assignmentJustification: (candidate as any)?.assignmentJustification || '',
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
        positionId: candidate.positionId || null,
        recruiterId: candidate.recruiterId || null,
        fitScore: candidate.fitScore || null,
        status: candidate.status || '',
        assignmentJustification: (candidate as any)?.assignmentJustification || '',
        parsedData: {
          ...(candidate.parsedData as any) || {},
          // Include job matches from the API response
          job_matches: (candidate.jobMatches || []).map((match: any) => ({
            jobId: match.jobId,
            job_title: match.positionTitle,
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

  useEffect(() => {
    if (!candidateId) return;
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/candidates/${candidateId}/comments`);
        if (!res.ok) {
          // console.error('Failed to fetch comments:', res.status, res.statusText);
          setComments([]);
          return;
        }
        
        const data = await res.json();
        // console.log('Initial comments fetch:', data);
        
        // Handle both array and object { data: [...] }
        if (Array.isArray(data)) {
          setComments(data);
        } else if (data && Array.isArray(data.data)) {
          setComments(data.data);
        } else {
          setComments([]);
        }
      } catch (error) {
        // console.error('Error fetching comments:', error);
        setComments([]);
      }
    };
    fetchComments();
  }, [candidateId]);

  useEffect(() => {
    if (!candidateId) return;
    const fetchResumes = async () => {
      const res = await fetch(`/api/candidates/${candidateId}/resumes`);
      if (res.ok) {
        const data = await res.json();
        // If API returns { data: [...] }, extract data
        setResumes(Array.isArray(data) ? data : (data.data || []));
      } else {
        setResumes([]);
      }
    };
    fetchResumes();
  }, [candidateId]);

  // Update fetchResumes to fetch attachments
  const fetchResumes = async () => {
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
  };

  // Update fetchComments to also extract attachments from comments
  const fetchComments = async () => {
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
  };

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
  }, [candidateId, isEditing, loadAllAttachments]);

  const handleCommentsChange = async () => {
    await loadAllAttachments();
    // re-fetch comments after add/edit/delete
    try {
      const response = await fetch(`/api/candidates/${candidateId}/comments`);
      if (!response.ok) {
        // console.error('Failed to fetch comments:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      // console.log('Fetched comments:', data);
      
      // Handle both array and object { data: [...] }
      if (Array.isArray(data)) {
        setComments(data);
      } else if (data && Array.isArray(data.data)) {
        setComments(data.data);
      } else {
        setComments([]);
      }
    } catch (error) {
      // console.error('Error fetching comments:', error);
    }
  };

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
        fetch('/api/positions'),
        fetch('/api/settings/recruitment-stages')
      ]);

      if (posResponse.ok) {
        const posData = await posResponse.json();
        // The API returns { data: positions, total } not { positions }
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

  useEffect(() => {
    console.log('Available stages:', availableStages);
  }, [availableStages]);

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
    // Find the position details - try by jobId first, then by job_title
    const position = Array.isArray(allDbPositions) ? 
                    (allDbPositions.find(p => p.id === jobMatch.jobId) || 
                     allDbPositions.find(p => p.title === jobMatch.job_title)) : null;
    
    // Prepare the job match data with position details
    const jobMatchData = {
      ...jobMatch,
      position: position ? {
        id: position.id,
        title: position.title,
        description: position.description,
        department: position.department,
        location: (position as any).location,
        salary: (position as any).salary,
        requirements: (position as any).requirements,
        isOpen: position.isOpen,
      } : undefined
    };
    
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

  const handleSaveDetails = async (data: EditCandidateFormValues) => {
    if (!candidate) return;
    console.log('handleSaveDetails called', data);
    
    const processedData = {
        ...data,
        parsedData: {
            ...data.parsedData,
            skills: data.parsedData?.skills?.map(s => ({
                segment_skill: s.segment_skill,
                skill: s.skill_string?.split(',').map(sk => sk.trim()).filter(sk => sk) || [],
            })),
            experience: data.parsedData?.experience?.map(exp => ({
                ...exp,
                positionLevel: exp.positionLevel === PLACEHOLDER_VALUE_NONE ? null : exp.positionLevel
            })),
            job_matches: data.parsedData?.job_matches?.map(match => ({
                ...match,
                matchReasons: match.matchReasons_string 
                    ? match.matchReasons_string.split('\n').map(reason => reason.trim()).filter(reason => reason)
                    : []
            }))
        }
    };
    try {
        const response = await fetch(`/api/candidates/${candidate.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(processedData),
        });
        if (!response.ok) {
            throw new Error(`Failed to update candidate: ${response.statusText}`);
        }
        await fetchCandidateDetails();
        setIsEditing(false);
        if (data && Object.keys(data).length > 0) {
          toast.success("Candidate details updated successfully.");
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
            phone: candidate.phone,
            positionId: candidate.positionId,
            recruiterId: candidate.recruiterId,
            fitScore: candidate.fitScore,
            status: candidate.status,
            assignmentJustification: (candidate as any).assignmentJustification || '',
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
                    job_title?: string | null;
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
  const [jobAppliedOpen, setJobAppliedOpen] = useState(true);
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
    if (Array.isArray(candidate.educationData) && candidate.educationData.length > 0) {
      return candidate.educationData;
    }
    if (candidate.parsedData && Array.isArray((candidate.parsedData as any).education) && (candidate.parsedData as any).education.length > 0) {
      return (candidate.parsedData as any).education;
    }
    return [];
  }
  function getExperience(candidate: Candidate | null) {
    if (!candidate) return [];
    if (Array.isArray(candidate.experienceData) && candidate.experienceData.length > 0) {
      return candidate.experienceData;
    }
    if (candidate.parsedData && Array.isArray((candidate.parsedData as any).experience) && (candidate.parsedData as any).experience.length > 0) {
      return (candidate.parsedData as any).experience;
    }
    return [];
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

  // Use type guards for flat properties on parsedData
  const personalInfo = (candidate.parsedData && 'personal_info' in candidate.parsedData)
    ? candidate.parsedData.personal_info
    : undefined;
  const contactInfo = (candidate.parsedData && 'contact_info' in candidate.parsedData)
    ? candidate.parsedData.contact_info
    : undefined;
  const education = getEducation(candidate);
  const experience = getExperience(candidate);
  const skills = (candidate.parsedData && 'skills' in candidate.parsedData)
    ? candidate.parsedData.skills
    : undefined;
  const jobSuitable = (candidate.parsedData && 'job_suitable' in candidate.parsedData)
    ? candidate.parsedData.job_suitable
    : undefined;
  // Use jobMatches from the API response instead of parsedData.job_matches
  const candidateJobMatches = candidate.jobMatches || [];
  

  const jobApplied = (candidate.parsedData && 'job_applied' in candidate.parsedData)
    ? (candidate.parsedData as any).job_applied
    : undefined;

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



  // Field arrays for form sections
  return (
    <div className="h-screen overflow-y-auto">
    
      <form onSubmit={handleSubmit(handleSaveDetails)}>
          {/* Header - 2 Columns */}
          {candidate && (
            <div className="bg-card border-b border-border p-6 sticky top-0 z-50">
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                {/* Column 1: Candidate Header (6 cols) */}
                <div className="lg:col-span-7">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <Avatar className="w-20 h-20 text-3xl relative group">
                        {candidate.avatarUrl ? (
                          <AvatarImage src={candidate.avatarUrl} alt={formatCandidateName(candidate)} />
                        ) : (
                          <AvatarFallback>{formatCandidateName(candidate)?.[0] || '?'}</AvatarFallback>
                        )}
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
                      </Avatar>
                      {avatarError && <div className="text-xs text-destructive mt-1">{avatarError}</div>}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="text-2xl font-bold tracking-tight text-foreground line-clamp-1">{formatCandidateName(candidate)}</span>
                        {candidate.status && (
                          <Badge variant={getStatusBadgeVariant(candidate.status)} className="text-xs px-2 py-1 rounded-full">{candidate.status}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-1">
                        {candidate.positionId && Array.isArray(allDbPositions) && allDbPositions.length > 0 && (
                          <span>Applied Job: <span className="font-medium text-foreground">{allDbPositions.find(p => p.id === candidate.positionId)?.title || 'N/A'}</span></span>
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
                                positionId: candidate.positionId || null,
                                recruiterId: candidate.recruiterId || null,
                                fitScore: candidate.fitScore || null,
                                status: candidate.status || '',
                                assignmentJustification: (candidate as any).assignmentJustification || '',
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
                          onClick={() => openManageTransitionsModal()}
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
                
                {/* Empty space for 2 cols to maintain 12-column grid */}
               
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-10 border-t bg-card overflow-hidden">
            {/* LEFT SIDEBAR: Recruitment Pipeline & Recruiter Assignment (20%) */}
            <div className="lg:col-span-2 bg-card sticky top-6 p-6 space-y-6">
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
            <div className="lg:col-span-5 space-y-8 border-r border-l border-border p-8">
              {/* Tabs for main content */}

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
                                      job_title: position.title,
                                      fitScore: candidate.fitScore || 0,
                                      matchReasons: (candidate as any).assignmentJustification ? [(candidate as any).assignmentJustification] : [],
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
                                        <span className="text-lg font-bold text-primary">(A)</span>
                                      </div>
                                    )}
                                   </div>
                                   
                                  {(candidate as any).assignmentJustification && (
                                     <div className="mt-3">
                                      <h5 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                        <Info className="h-3 w-3" />
                                        Justification:
                                      </h5>
                                      <div className="text-sm text-foreground bg-muted/50 px-3 py-2 rounded whitespace-pre-wrap">
                                        {(candidate as any).assignmentJustification}
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
                                                                setValue(`parsedData.job_matches.${index}.job_title`, selectedPosition.title);
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
                                            job_title: '', 
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
                                  // Try to find position by jobId first, then by job_title
                                  const position = Array.isArray(allDbPositions) ? 
                                                 (allDbPositions.find(p => p.id === match.jobId) || 
                                                  allDbPositions.find(p => p.title === match.job_title)) : null;
                                  
                                  return (
                                    <div 
                                      key={`jobmatch-${index}-${match.job_title || index}`} 
                                      className={`flex-shrink-0 w-70 p-3 border rounded-lg ${(match as any).is_applied_job ? 'bg-primary/10 border-primary/30' : 'bg-card border-border'} hover:shadow-md transition-shadow cursor-pointer`}
                                      onClick={() => handleJobMatchClick(match)}
                                    >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    {(match as any).is_applied_job && (
                                                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20 shrink-0">Applied</Badge>
                                                    )}
                                          <h4 className="font-semibold text-foreground text-sm truncate">
                                            {position?.title || match.job_title || 'Unknown Position'}
                                          </h4>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                                <div className="text-xs text-muted-foreground">
                                                    #{index + 1}
                                                </div>
                                            </div>
                                            </div>
                                            {match.fitScore && match.fitScore > 0 && (
                                                <div className={`text-xl font-bold mb-2 ${getScoreColor(match.fitScore)}`}>
                                                    {formatScoreWithGrade(match.fitScore)}
                                                </div>
                                            )}
                                            {match.matchReasons && match.matchReasons.length > 0 && (
                                                <div>
                                                    <h5 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                                        <Lightbulb className="h-3 w-3" />
                                                        Reasons ({match.matchReasons.length}):
                                                    </h5>
                                                    <div className="space-y-1 max-h-20 overflow-y-auto">
                                                        {match.matchReasons.slice(0, 2).map((reason: any, reasonIndex: number) => (
                                                            <div key={reasonIndex} className="text-xs text-foreground bg-muted/50 px-2 py-1 rounded flex items-start gap-1">
                                                                <span className="text-primary text-xs mt-0.5">•</span>
                                                                <span className="flex-1 line-clamp-1">{reason}</span>
                                                            </div>
                                                        ))}
                                                        {match.matchReasons.length > 2 && (
                                                            <div className="text-xs text-muted-foreground italic">
                                                                +{match.matchReasons.length - 2} more reasons
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {(!match.matchReasons || match.matchReasons.length === 0) && (
                                                <div className="text-xs text-muted-foreground italic">
                                                    No match reasons provided
                                                </div>
                                            )}
                                        </div>
                                  );
                                })}
                                    </div>
                                        </div>
                           
                    )}
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
                                  // Parse start, end, duration
                                  let start = '', end = '', duration = '';
                                  if (edu.period) {
                                    const parts = String(edu.period).split(' - ');
                                    start = parts[0] || '';
                                    end = parts[1] || '';
                                  }
                                  if (edu.duration) {
                                    duration = edu.duration;
                                  } else if (start && end) {
                                    // Try to parse and calculate duration
                                    const startDate = parseDate(start);
                                    const endDate = parseDate(end);
                                    if (startDate && endDate) {
                                      const months = differenceInMonths(endDate, startDate);
                                      const years = Math.floor(months / 12);
                                      const remMonths = months % 12;
                                      duration = [
                                        years > 0 ? `${years} year${years > 1 ? 's' : ''}` : '',
                                        remMonths > 0 ? `${remMonths} month${remMonths > 1 ? 's' : ''}` : ''
                                      ].filter(Boolean).join(' ');
                                    }
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
                  <section className="mb-4 border border-border rounded-lg p-4 bg-card">
                    <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setExperienceOpen(o => !o)}>
                      <Briefcase className="mr-2 h-6 w-6 text-primary" />
                      <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Experience</h2>
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
                                          name={`parsedData.experience.${index}.duration`}
                                          control={control}
                                          render={({ field }) => {
                                            let years = '', months = '';
                                            if (field.value) {
                                              const match = String(field.value).match(/(\d+)\s*years?\s*(\d+)?\s*months?/);
                                              if (match) {
                                                years = match[1] || '';
                                                months = match[2] || '';
                                              }
                                            }
                                            return (
                                              <div className="flex gap-2 items-center">
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  placeholder="Years"
                                                  value={years}
                                                  onChange={e => {
                                                    const y = e.target.value;
                                                    field.onChange(`${y || 0} years ${months || 0} months`);
                                                  }}
                                                  className="w-20"
                                                />
                                                <span>years</span>
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  max={11}
                                                  placeholder="Months"
                                                  value={months}
                                                  onChange={e => {
                                                    const m = e.target.value;
                                                    field.onChange(`${years || 0} years ${m || 0} months`);
                                                  }}
                                                  className="w-20"
                                                />
                                                <span>months</span>
                                              </div>
                                            );
                                          }}
                                        />
                                         <Controller
                                            name={`parsedData.experience.${index}.positionLevel`}
                                            control={control}
                                            render={({ field: controllerField }) => (
                                                <Input {...controllerField} value={controllerField.value || ''} placeholder="Position Level" />
                                            )}
                                        />
                                        <div className="flex items-center space-x-2">
                                            <Controller
                                                name={`parsedData.experience.${index}.is_current_position`}
                                                control={control}
                                                render={({ field: controllerField }) => (
                                                    <Checkbox
                                                        id={`experience.${index}.is_current_position`}
                                                        checked={Boolean(controllerField.value)}
                                                        onCheckedChange={(checked) => controllerField.onChange(checked)}
                                                    />
                                                )}
                                            />
                                            <Label htmlFor={`experience.${index}.is_current_position`}>Current Position</Label>
                                        </div>
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
                            <div className="relative">
                              {(getExperience(candidate).length === 0) && (
                                <div className="text-sm text-muted-foreground text-center py-4">No experience details provided.</div>
                              )}
                              {getExperience(candidate).map((exp: any, index: number) => {
                                // Parse start, end, duration
                                let start = '', end = '', duration = '';
                                if (exp.period) {
                                  const parts = String(exp.period).split(' - ');
                                  start = parts[0] || '';
                                  end = parts[1] || '';
                                }
                                if (exp.duration) {
                                  duration = exp.duration;
                                } else if (start && end) {
                                  // Try to parse and calculate duration
                                  const startDate = parseDate(start);
                                  const endDate = parseDate(end);
                                  if (startDate && endDate) {
                                    const months = differenceInMonths(endDate, startDate);
                                    const years = Math.floor(months / 12);
                                    const remMonths = months % 12;
                                    duration = [
                                      years > 0 ? `${years} year${years > 1 ? 's' : ''}` : '',
                                      remMonths > 0 ? `${remMonths} month${remMonths > 1 ? 's' : ''}` : ''
                                    ].filter(Boolean).join(' ');
                                  }
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
                                        {/* Vertical line within this node container */}
                                        {getExperience(candidate).length > 1 && (
                                          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border transform -translate-x-1/2 z-0" />
                                        )}
                                        {/* Node (icon) */}
                                        <div className="w-6 h-6 rounded-full bg-card flex items-center justify-center z-10 border-2 border-border">
                                          <Briefcase className="w-3 h-3 text-foreground" />
                                        </div>
                                      </div>
                                      {/* Content */}
                                      <div className="flex-1 min-w-0 pb-0 flex items-center">
                                        <div className="bg-muted/50 rounded-lg p-4 flex-1">
                                          {renderField("Company", exp.company)}
                                          {renderField("Position", exp.position)}
                                          {renderField("Level", String(exp.positionLevel))}
                                          {exp.is_current_position !== undefined && renderField("Current Position", String(exp.is_current_position))}
                                          {exp.description && (
                                            <div>
                                              <h4 className="text-sm font-medium text-muted-foreground mt-2 mb-1">Description:</h4>
                                              <p className="text-sm text-foreground whitespace-pre-wrap bg-card p-2 rounded">{exp.description}</p>
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
                                {skills.map((skillEntry, index) => {
                                    if (typeof skillEntry === 'string') {
                                        // Render string-only skill entry
                                        return (
                                            <li key={`skill-${index}-${skillEntry}`} className="p-3 border rounded-md bg-muted">
                                                {renderField("Skill", skillEntry)}
                                            </li>
                                        );
                                    } else {
                                        // Render SkillEntry object
                                        return (
                                            <li key={`skill-${index}-${skillEntry.segment_skill || index}`} className="p-3 border rounded-md bg-muted">
                                                {renderField("Segment", skillEntry.segment_skill)}
                                                {skillEntry.skill && skillEntry.skill.length > 0 && (
                                                    <div>
                                                        <h4 className="text-sm font-medium text-muted-foreground mt-1.5">Skills:</h4>
                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                            {skillEntry.skill.map((s, i) => <Badge key={`${index}-${i}-${s}`} variant="secondary">{s}</Badge>)}
                                                        </div>
                                                    </div>
                                                )}
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
                                {jobSuitable.map((job, index) => (
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
            <div className="lg:col-span-3 space-y-6 bg-card p-6 rounded-xl shadow-sm">
              {/* Recruiter Assignment Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Users className="mr-2 h-5 w-5 text-primary" />
                  Recruiter Assignment
                </h3>
                <div className="bg-muted rounded-lg p-4">
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
                </div>
              </div>

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
                    isEditing={isEditing} 
                    onCommentsChange={handleCommentsChange} 
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
                    resumes={Array.isArray(attachments) ? attachments : []} 
                    isEditing={isEditing} 
                    onResumesChange={handleResumesChange} 
                  />
                </div>
              </div>
            </div>
          </div>
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
