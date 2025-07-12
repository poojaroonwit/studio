"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Candidate, CandidateDetails, TransitionRecord, EducationEntry, ExperienceEntry, SkillEntry, JobSuitableEntry, PersonalInfo, AutomationJobMatch, UserProfile, Position, PositionLevel, RecruitmentStage } from '@/lib/types';
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
import { ArrowLeft, Briefcase, CalendarDays, DollarSign, Edit, GraduationCap, HardDrive, Info, LinkIcon, ListChecks, Loader2, Mail, MapPin, MessageSquare, Percent, Phone, ServerCrash, ShieldAlert, Star, Tag, UploadCloud, User, UserCircle, UserCog, Users, Zap, ExternalLink, Edit3, Save, X, PlusCircle, Trash2, Lightbulb, ChevronDown, ChevronRight, Activity, Clock } from 'lucide-react';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor } from "@/lib/scoreUtils";
import UploadResumeModal from '@/components/candidates/UploadResumeModal';
import { ManageTransitionsModal } from '@/components/candidates/ManageTransitionsModal';
import { EditPositionModal } from '@/components/positions/EditPositionModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller, useFieldArray, FormProvider } from 'react-hook-form';
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
import { StagePipeline } from '@/components/candidates/StagePipeline';
import { differenceInMonths, parse, isValid } from 'date-fns';

const MINIO_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL || `http://localhost:9847`;
const MINIO_BUCKET = process.env.NEXT_PUBLIC_MINIO_BUCKET_NAME || "canditrack-resumes";

const PLACEHOLDER_VALUE_NONE = "___NOT_SPECIFIED___";
const positionLevelOptions: PositionLevel[] = ['entry level', 'mid level', 'senior level', 'lead', 'manager', 'executive', 'officer', 'leader'];


const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Hired': case 'Offer Accepted': return 'default';
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
    postition_level: z.string().optional().nullable(),
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

const candidateDetailsEditSchema = z.object({
  cv_language: z.string().optional().nullable(),
  personal_info: personalInfoEditSchema.optional(),
  contact_info: contactInfoEditSchema.optional(),
  education: z.array(educationEntryEditSchema).optional(),
  experience: z.array(experienceEntryEditSchema).optional(),
  skills: z.array(skillEntryEditSchema).optional(),
  job_suitable: z.array(jobSuitableEntryEditSchema).optional(),
}).deepPartial();

const editCandidateDetailSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional().nullable(),
  positionId: z.string().uuid().nullable().optional(),
  recruiterId: z.string().uuid().nullable().optional(),
  fitScore: z.number().min(0).max(100).nullable().optional(),
  status: z.string().min(1, "Status is required").optional(),
  parsedData: candidateDetailsEditSchema.optional(),
});

type EditCandidateFormValues = z.infer<typeof editCandidateDetailSchema>;


interface RoleSuggestionSummaryProps {
  candidate: Candidate | null;
  allDbPositions: Position[];
}

const RoleSuggestionSummary: React.FC<RoleSuggestionSummaryProps> = ({ candidate, allDbPositions }) => {
  if (!candidate || !candidate.parsedData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg"><Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />Role Suggestion</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No automated job match data to provide suggestions.</p>
        </CardContent>
      </Card>
    );
  }

  // Use a type guard to safely access job_matches
  const jobMatches =
    candidate.parsedData && 'job_matches' in candidate.parsedData
      ? candidate.parsedData.job_matches
      : undefined;

  if (!jobMatches || jobMatches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg"><Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />Role Suggestion</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No automated job match data to provide suggestions.</p>
        </CardContent>
      </Card>
    );
  }

  const currentAppliedPositionId = candidate.positionId;
  const currentAppliedPosition = allDbPositions.find(p => p.id === currentAppliedPositionId);
  const currentFitScore = candidate.fitScore || 0;
  let bestAlternativeMatch: AutomationJobMatch | null = null;
  let bestAlternativeScore = currentFitScore;
  let bestAlternativePositionInDb: Position | null = null;

  const openPositionsMap = new Map(allDbPositions.filter(p => p.isOpen).map(p => [p.title.toLowerCase(), p]));

  for (const jobMatch of jobMatches) {
    const jobMatchTitleLower = jobMatch.job_title?.toLowerCase(); // job_title can be optional/null
    if (!jobMatchTitleLower) continue;

    const dbPositionMatch = openPositionsMap.get(jobMatchTitleLower);

    if (dbPositionMatch && dbPositionMatch.id !== currentAppliedPositionId) {
      if (jobMatch.fit_score > bestAlternativeScore && (jobMatch.fit_score - currentFitScore >= 10)) {
        bestAlternativeScore = jobMatch.fit_score;
        bestAlternativeMatch = jobMatch;
        bestAlternativePositionInDb = dbPositionMatch;
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg"><Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />Role Suggestion</CardTitle>
      </CardHeader>
      <CardContent>
        {bestAlternativeMatch && bestAlternativePositionInDb ? (
          <div className="p-3 border border-dashed border-primary/50 rounded-md bg-primary/5">
            <p className="text-sm text-foreground">
              Consider {candidate.name} for the role of <strong>{bestAlternativeMatch.job_title}</strong> (Open Position).
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Automated Fit Score for this role: <span className={`font-semibold ${getScoreColor(bestAlternativeMatch.fit_score)}`}>{formatScoreWithGrade(bestAlternativeMatch.fit_score)}</span>.
            </p>
            {currentAppliedPosition ? (
              <p className="text-xs text-muted-foreground">
                Currently applied for: &quot;{currentAppliedPosition.title}&quot; (Fit Score: <span className={getScoreColor(currentFitScore)}>{formatScoreWithGrade(currentFitScore)}</span>)
              </p>
            ) : (
               <p className="text-xs text-muted-foreground">Currently not formally applied to a specific position in our system (General Fit Score: <span className={getScoreColor(currentFitScore)}>{formatScoreWithGrade(currentFitScore)}</span>).</p>
            )}
            {bestAlternativeMatch.match_reasons && bestAlternativeMatch.match_reasons.length > 0 && (
              <div className="mt-1.5">
                <p className="text-xs font-medium text-muted-foreground">Top Match Reasons for Suggested Role:</p>
                <ul className="list-disc list-inside pl-3 text-xs text-foreground">
                  {bestAlternativeMatch.match_reasons.slice(0, 2).map((reason, i) => <li key={`reason-sugg-${i}`}>{reason}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Candidate appears well-suited for their current applied role, or no significantly stronger alternative open roles were identified from automated matches.</p>
        )}
      </CardContent>
    </Card>
  );
};



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

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id as string;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [recruiters, setRecruiters] = useState<Pick<UserProfile, 'id' | 'name'>[]>([]);
  const [isAssigningRecruiter, setIsAssigningRecruiter] = useState(false);

  const { data: session, status: sessionStatus } = useSession();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTransitionsModalOpen, setIsTransitionsModalOpen] = useState(false);

  const [allDbPositions, setAllDbPositions] = useState<Position[]>([]);
  const [isEditPositionModalOpen, setIsEditPositionModalOpen] = useState(false);
  const [selectedPositionForEdit, setSelectedPositionForEdit] = useState<Position | null>(null);
  const [availableStages, setAvailableStages] = useState<RecruitmentStage[]>([]);

  const [isEditing, setIsEditing] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const form = useForm<EditCandidateFormValues>({
    resolver: zodResolver(editCandidateDetailSchema),
    defaultValues: {},
  });

  const { control, register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = form;

  const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({ control, name: "parsedData.education" });
  const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({ control, name: "parsedData.experience" });
  const { fields: skillsFields, append: appendSkill, remove: removeSkill } = useFieldArray({ control, name: "parsedData.skills" });
  const { fields: jobSuitableFields, append: appendJobSuitable, remove: removeJobSuitable } = useFieldArray({ control, name: "parsedData.job_suitable" });

  const [comments, setComments] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  // Add state for attachments
  const [attachments, setAttachments] = useState<any[]>([]);
  const [transitionHistory, setTransitionHistory] = useState<TransitionRecord[]>([]);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!candidateId) return;
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/candidates/${candidateId}/comments`);
        if (!res.ok) {
          console.error('Failed to fetch comments:', res.status, res.statusText);
          setComments([]);
          return;
        }
        
        const data = await res.json();
        console.log('Initial comments fetch:', data);
        
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

  // Merge attachments from resumes and comments
  useEffect(() => {
    const loadAllAttachments = async () => {
      const [resumeAttachments, commentList] = await Promise.all([
        fetchResumes(),
        fetchComments(),
      ]);
      // Extract attachments from comments
      const commentAttachments = (commentList || []).flatMap((comment: any) =>
        (comment.attachments || []).map((att: any) => ({
          ...att,
          // Optionally add a tag to indicate source
          label: att.label || 'comment',
          updatedAt: att.updatedAt || comment.createdAt || new Date().toISOString(),
        }))
      );
      // Merge and sort by updatedAt desc
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
    };
    loadAllAttachments();
  }, [candidateId, isEditing]);

  // Reference to reload all attachments
  const loadAllAttachments = async () => {
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
  };

  const handleCommentsChange = async () => {
    await loadAllAttachments();
    // re-fetch comments after add/edit/delete
    try {
      const response = await fetch(`/api/candidates/${candidateId}/comments`);
      if (!response.ok) {
        console.error('Failed to fetch comments:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      console.log('Fetched comments:', data);
      
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
      reset({
        name: data.name,
        email: data.email,
        phone: data.phone,
        positionId: data.positionId,
        recruiterId: data.recruiterId,
        fitScore: data.fitScore,
        status: data.status,
        parsedData: {
            ...(data.parsedData as CandidateDetails),
            skills: (data.parsedData as CandidateDetails)?.skills?.map(s => ({
                ...s,
                skill_string: s.skill?.join(', ') || ''
            })) || [],
            experience: ((data.parsedData as CandidateDetails)?.experience?.map(exp => ({
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
        }
      });
    } catch (error) {
      console.error("Error fetching candidate details:", error);
      setFetchError((error as Error).message || "Could not load candidate data.");
      setCandidate(null);
    } finally {
      setIsLoading(false);
    }
  }, [candidateId, reset]);

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
        setAllDbPositions(posData.positions || []);
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
    }
  }, [candidateId, sessionStatus, fetchCandidateDetails, fetchRecruiters, fetchPositionsAndStages]);

  useEffect(() => {
    if (fetchError) {
      toast(fetchError);
    }
  }, [fetchError]);

  useEffect(() => {
    console.log('Available stages:', availableStages);
  }, [availableStages]);

  // Fetch transition records from logs endpoint
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


  useEffect(() => {
    // Subscribe to SSE for real-time candidate updates
    console.log('[SSE] Setting up SSE connection for candidate detail page...');
    const eventSource = new EventSource('/api/candidates/sse');
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      console.log('[SSE] SSE connection opened for candidate detail page');
    };
    
    eventSource.onerror = (error) => {
      console.error('[SSE] SSE connection error for candidate detail page:', error);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const updatedCandidate = JSON.parse(event.data);
        if (updatedCandidate.id === candidateId) {
          // Only refresh if the update is for the current candidate
          fetchCandidateDetails();
        }
      } catch (e) {
        // Ignore parse errors
      }
    };
    // Listen for custom events: comment, resume, transition
    eventSource.addEventListener('comment', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.candidateId === candidateId) {
          fetchComments();
          loadAllAttachments && loadAllAttachments();
        }
      } catch (e) {}
    });
    eventSource.addEventListener('resume', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.candidateId === candidateId) {
          fetchResumes();
          loadAllAttachments && loadAllAttachments();
        }
      } catch (e) {}
    });
    eventSource.addEventListener('transition', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.candidateId === candidateId) {
          fetchTransitionHistory && fetchTransitionHistory();
        }
      } catch (e) {}
    });
    
    // Listen for recruitment stage updates
    eventSource.addEventListener('recruitment-stages', (event: MessageEvent) => {
      try {
        console.log('[SSE] Received recruitment stages update:', event.data);
        const updatedStages = JSON.parse(event.data);
        console.log('[SSE] Parsed stages:', updatedStages);
        setAvailableStages(updatedStages);
      } catch (e) {
        console.error('Error parsing recruitment stages update:', e);
      }
    });
    // Cleanup function
    return () => {
      console.log('[SSE] Cleaning up SSE connection for candidate detail page');
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [candidateId, fetchCandidateDetails, fetchComments, fetchResumes, fetchTransitionHistory, loadAllAttachments]);

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
            postition_level?: string | null;
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

  const handleJobMatchClick = (jobMatchTitle: string | null | undefined) => {
    if (!jobMatchTitle) {
        toast("Job match data is incomplete.");
        return;
    }
    const matchedPosition = allDbPositions.find(p => p.title.toLowerCase() === jobMatchTitle.toLowerCase());
    if (matchedPosition) {
      setSelectedPositionForEdit(matchedPosition);
      setIsEditPositionModalOpen(true);
    } else {
      toast(`Position "${jobMatchTitle}" not found in the system.`);
    }
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
                postition_level: exp.postition_level === PLACEHOLDER_VALUE_NONE ? null : exp.postition_level
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
          toast("Candidate details updated successfully.");
        }
    } catch (error) {
        toast((error as Error).message);
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
            }
        });
    }
    setIsEditing(false);
  };

  const jobMatches =
    candidate &&
    candidate.parsedData &&
    'job_matches' in candidate.parsedData &&
    candidate.parsedData.job_matches &&
    candidate.parsedData.job_matches.length > 0
      ? candidate.parsedData.job_matches
      : undefined;

  const [preselectedStage, setPreselectedStage] = useState<string | null>(null);
  const [selectedJobMatch, setSelectedJobMatch] = useState<any | null>(null);

  const [infoOpen, setInfoOpen] = useState(true);
  const [educationOpen, setEducationOpen] = useState(true);
  const [experienceOpen, setExperienceOpen] = useState(true);
  const [skillsOpen, setSkillsOpen] = useState(true);
  const [jobSuitableOpen, setJobSuitableOpen] = useState(true);

  
  useEffect(() => {
    fetchTransitionHistory();
  }, [candidateId, fetchTransitionHistory]);

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
  const education = (candidate.parsedData && 'education' in candidate.parsedData)
    ? candidate.parsedData.education
    : undefined;
  const experience = (candidate.parsedData && 'experience' in candidate.parsedData)
    ? candidate.parsedData.experience
    : undefined;
  const skills = (candidate.parsedData && 'skills' in candidate.parsedData)
    ? candidate.parsedData.skills
    : undefined;
  const jobSuitable = (candidate.parsedData && 'job_suitable' in candidate.parsedData)
    ? candidate.parsedData.job_suitable
    : undefined;
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

  return (
    <FormProvider {...form}>
      <div className="h-screen overflow-y-auto">
      
        <form onSubmit={handleSubmit(handleSaveDetails)}>
          {/* Header - 2 Columns */}
          {candidate && (
            <div className="bg-card border-b border-border p-6 sticky top-0 z-50">
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                {/* Column 1: Candidate Header (7 cols - left sidebar + main content) */}
                <div className="lg:col-span-7">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <Avatar className="w-20 h-20 text-3xl relative group">
                        {candidate.avatarUrl ? (
                          <AvatarImage src={candidate.avatarUrl} alt={candidate.name} />
                        ) : (
                          <AvatarFallback>{candidate.name?.[0] || '?'}</AvatarFallback>
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
                        <span className="text-2xl font-bold tracking-tight text-foreground line-clamp-1">{candidate.name}</span>
                        {candidate.status && (
                          <Badge variant={getStatusBadgeVariant(candidate.status)} className="text-xs px-2 py-1 rounded-full">{candidate.status}</Badge>
                        )}
                        {candidate.fitScore !== undefined && candidate.fitScore !== null && (
                          <span className={`text-sm font-semibold py-1 rounded-full ${getScoreBgColor(candidate.fitScore)} ${getScoreColor(candidate.fitScore)}`}>
                            Fit Score: {formatScoreWithGrade(candidate.fitScore)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-1">
                        {candidate.positionId && allDbPositions.length > 0 && (
                          <span>Applied Job: <span className="font-medium text-foreground">{allDbPositions.find(p => p.id === candidate.positionId)?.title || 'N/A'}</span></span>
                        )}
                        {candidate.recruiterId && recruiters.length > 0 && (
                          <span>Recruiter: <span className="font-medium text-foreground">{recruiters.find(r => r.id === candidate.recruiterId)?.name || 'N/A'}</span></span>
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
                
                {/* Column 2: Action Buttons (3 cols - same as comments) */}
                <div className="lg:col-span-3">
                  <div className="flex flex-row gap-3">
                    {/* Edit Actions Button with Dropdown */}
                    {!isEditing ? (
                      <div className="w-1/2 relative">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="default"
                              className="w-full h-18 flex flex-col items-start justify-center p-3"
                            >
                              <div className="flex items-center mb-1">
                                <Edit3 className="h-4 w-4 mr-2" />
                                <span className="font-bold text-sm">Edit Actions</span>
                              </div>
                                                      <span className="text-xs text-muted-foreground text-left leading-tight">
                          Edit candidate details,<br />
                          Manage transitions
                        </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-0" align="start">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setIsEditing(true);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center"
                              >
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit Candidate Details
                              </button>
                              {availableStages.length > 0 && (
                                <button
                                  onClick={() => {
                                    setIsTransitionsModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center"
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  Manage Transitions
                                </button>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    ) : (
                      <div className="flex gap-2 w-1/2">
                        <Button
                          variant="default"
                          size="default"
                          onClick={handleSubmit(handleSaveDetails)}
                          disabled={isSubmitting}
                          className="btn-primary-gradient w-1/2 h-16 flex flex-col items-center justify-center p-3"
                        >
                          <div className="flex items-center mb-1">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            <span className="font-bold text-sm">{isSubmitting ? 'Saving...' : 'Save'}</span>
                          </div>
                          <span className="text-xs text-muted-foreground leading-tight">
                            Save all changes
                          </span>
                        </Button>
                        <Button
                          variant="outline"
                          size="default"
                          onClick={handleCancelEdit}
                          disabled={isSubmitting}
                          className="w-1/2 h-16 flex flex-col items-center justify-center p-3"
                        >
                          <div className="flex items-center mb-1">
                            <X className="mr-2 h-4 w-4" />
                            <span className="font-bold text-sm">Cancel</span>
                          </div>
                          <span className="text-xs text-muted-foreground leading-tight">
                            Discard changes
                          </span>
                        </Button>
                      </div>
                    )}
                    
                    {/* Recruiter Assignment Button with Dropdown */}
                    <div className="w-1/2 relative">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="default"
                            disabled={isAssigningRecruiter || !candidate.id}
                            className="w-full h-18 flex flex-col items-start justify-center p-3"
                          >
                            <div className="flex items-center mb-1">
                              <Users className="h-4 w-4 mr-2" />
                              <span className="font-bold text-sm">Recruiter Label</span>
                            </div>
                            <span className="text-xs text-muted-foreground text-left leading-tight">
                              {recruiters.length > 0 ? 'Recruiter assign' : 'No recruiters available'}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-0" align="start">
                          <div className="py-1">
                            {recruiters.length > 0 ? (
                              <>
                                <div className="px-4 py-2 text-xs text-muted-foreground border-b">
                                  Current: {recruiters.find(r => r.id === candidate.recruiterId)?.name || 'Unassigned'}
                                </div>
                                <button
                                  onClick={() => handleAssignRecruiter(null)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                >
                                  Unassign
                                </button>
                                {recruiters.map((recruiter) => (
                                  <button
                                    key={recruiter.id}
                                    onClick={() => handleAssignRecruiter(recruiter.id)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center"
                                  >
                                    <User className="h-4 w-4 mr-2" />
                                    {recruiter.name}
                                  </button>
                                ))}
                              </>
                            ) : (
                              <div className="px-4 py-2 text-sm text-muted-foreground">
                                No recruiters available
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
                
                {/* Empty space for 2 cols to maintain 12-column grid */}
               
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-10 border-t bg-card overflow-hidden">
            {/* LEFT SIDEBAR: Stage Pipeline (20%) */}
            <div className="lg:col-span-2 bg-card sticky top-6 p-6">
              {availableStages.length > 0 && candidate && (
                <div className="max-w-[14rem] w-full">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold flex items-center mb-3">
                      <Users className="mr-2 h-5 w-5 text-primary" />
                      Recruitment Stage
                    </h3>
                  </div>
                  <StagePipeline
                    stages={availableStages}
                    transitionHistory={transitionHistory}
                    currentStatus={candidate.status}
                    onStageClick={(stageName) => {
                      setPreselectedStage(stageName);
                      setIsTransitionsModalOpen(true);
                    }}
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
            </div>
            {/* MAIN CONTENT (50%) with Tabs */}
            <div className="lg:col-span-5 space-y-8 border-r border-l border-border p-8">
              {/* Tabs for main content */}

                   {/* Role Suggestion and Job Matches at the top */}
                   <div className="space-y-6">
                     {/* Role Suggestion Summary */}
                     <RoleSuggestionSummary candidate={candidate} allDbPositions={allDbPositions} />
                     
                     {/* Job Matches Table */}
                     <div className="bg-muted rounded p-6 shadow-sm">
                       <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center">
                         <ListChecks className="mr-2 h-6 w-6 text-blue-600" />
                         Job Matches
                       </h2>
                       <div className="overflow-x-auto">
                         <table className="min-w-full border text-sm">
                           <thead className="bg-muted">
                             <tr>
                               <th className="px-4 py-2 text-left">Title</th>
                               <th className="px-4 py-2 text-left">Score</th>
                               <th className="px-4 py-2 text-left">Justification</th>
                             </tr>
                           </thead>
                           <tbody>
                             {(() => {
                               const jobMatches = candidate && candidate.parsedData && 'job_matches' in candidate.parsedData && Array.isArray(candidate.parsedData.job_matches)
                                 ? candidate.parsedData.job_matches
                                 : [];
                               const appliedPosition = allDbPositions.find(p => p.id === candidate.positionId);
                               const appliedMatch = jobMatches.find(
                                 (jm: any) => appliedPosition && jm.job_title?.toLowerCase() === appliedPosition.title.toLowerCase()
                               );
                               const otherMatches = jobMatches.filter((jm: any) => !appliedPosition || jm.job_title?.toLowerCase() !== appliedPosition.title.toLowerCase());
                               const rows = [];
                               if (appliedMatch && appliedPosition) {
                                 rows.push({
                                   title: appliedPosition.title,
                                   score: appliedMatch.fit_score,
                                   justification: (appliedMatch.match_reasons || []).join('; ')
                                 });
                               }
                               for (const jm of otherMatches) {
                                 rows.push({
                                   title: jm.job_title,
                                   score: jm.fit_score,
                                   justification: (jm.match_reasons || []).join('; ')
                                 });
                               }
                               if (rows.length === 0) {
                                 return <tr><td colSpan={3} className="text-muted-foreground text-center py-4">No job match data available.</td></tr>;
                               }
                               return rows.map((row, i) => (
                                 <tr key={i} className={i === 0 ? 'bg-primary/10 font-semibold' : ''}>
                                   <td className="px-4 py-2">{row.title}</td>
                                   <td className={`px-4 py-2 ${getScoreColor(row.score)}`}>{formatScoreWithGrade(row.score)}</td>
                                   <td className="px-4 py-2">{row.justification}</td>
                                 </tr>
                               ));
                             })()}
                           </tbody>
                         </table>
                       </div>
                     </div>
                   </div>

                  {/* Collapsible Candidate Info Sections */}
                  <section className="mb-4 ">
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
                            <Label htmlFor="parsedData.personal_info.location" className="mb-2">Location</Label>
                            <Input id="parsedData.personal_info.location" {...register('parsedData.personal_info.location')} className="mb-4" />
                            <Label htmlFor="parsedData.personal_info.introduction_aboutme" className="mb-2">About Me</Label>
                            <Textarea id="parsedData.personal_info.introduction_aboutme" {...register('parsedData.personal_info.introduction_aboutme')} className="mb-4" />
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
                  <section className="mb-4 ">
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
                              {(education ?? []).length > 0 && (
                                <div className="absolute left-36 top-0 w-0.5 bg-border" style={{ height: `${(education.length - 1) * 80}px` }} />
                              )}
                              {(education ?? []).length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-4">No education details provided.</div>
                              )}
                              {(education ?? []).map((edu, index) => {
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
                                          {typeof edu.fitScore === 'number' && (
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
                                          {typeof edu.fitScore === 'number' && (
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
                  <section className="mb-4 ">
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
                                            name={`parsedData.experience.${index}.postition_level`}
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
                                <Button type="button" variant="outline" className="mt-2" onClick={() => appendExperience({ company: '', position: '', period: '', duration: '', is_current_position: false, description: '', postition_level: null })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Experience
                                </Button>
                            </div>
                        ) : (
                            <div className="relative">
                              {(experience ?? []).length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-4">No experience details provided.</div>
                              )}
                              {(experience ?? []).map((exp, index) => {
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
                                        {(experience ?? []).length > 1 && (
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
                                          {renderField("Level", String(exp.postition_level))}
                                          {exp.is_current_position !== undefined && renderField("Current Position", String(exp.is_current_position))}
                                          {exp.description && (
                                            <div>
                                              <h4 className="text-sm font-medium text-muted-foreground mt-2 mb-1">Description:</h4>
                                              <p className="text-sm text-foreground whitespace-pre-wrap bg-card p-2 rounded">{exp.description}</p>
                                            </div>
                                          )}
                                        </div>
                                        {typeof exp.fitScore === 'number' && (
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
                  <section className="mb-4 ">
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
                  <section className="mb-4 ">
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
      </div>
      {/* Render UploadResumeModal for drag-and-drop upload */}
      <UploadResumeModal
        isOpen={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        candidate={candidate}
        onUploadSuccess={handleUploadSuccess}
      />
    </FormProvider>
  );
}
