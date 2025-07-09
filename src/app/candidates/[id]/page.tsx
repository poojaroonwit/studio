"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from 'react';
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
import { ArrowLeft, Briefcase, CalendarDays, DollarSign, Edit, GraduationCap, HardDrive, Info, LinkIcon, ListChecks, Loader2, Mail, MapPin, MessageSquare, Percent, Phone, ServerCrash, ShieldAlert, Star, Tag, UploadCloud, User, UserCircle, UserCog, Users, Zap, ExternalLink, Edit3, Save, X, PlusCircle, Trash2, Lightbulb, ChevronDown, ChevronRight, Home, Users as UsersIcon, Activity, Clock } from 'lucide-react';
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
import { Breadcrumb } from '@/components/ui/breadcrumb';

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

function StagePipeline({ stages, transitionHistory, currentStatus, onStageClick, editableNotes, onNoteEdit }: { stages: RecruitmentStage[], transitionHistory: TransitionRecord[], currentStatus: string, onStageClick: (stageName: string) => void, editableNotes: boolean, onNoteEdit: (transitionId: string, newNote: string) => Promise<void> }) {
  // Map stage name to all transition records for that stage
  const stageToRecords: Record<string, TransitionRecord[]> = {};
  transitionHistory.forEach(record => {
    if (!stageToRecords[record.stage]) stageToRecords[record.stage] = [];
    stageToRecords[record.stage].push(record);
  });
  // Track which popover is open by index
  const [openPopoverIdx, setOpenPopoverIdx] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-0.5 mb-6">
      {stages.map((stage, idx) => {
        const records = stageToRecords[stage.name] || [];
        const isCompleted = transitionHistory.some(r => r.stage === stage.name);
        const isCurrent = currentStatus === stage.name;
        return (
          <Popover key={stage.id} open={openPopoverIdx === idx}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex items-center gap-3 cursor-pointer px-3 py-2 rounded transition-colors
                  ${isCurrent ? 'bg-primary/10 border-l-4 border-primary font-bold' : isCompleted ? 'bg-green-100 border-l-4 border-green-500 font-semibold text-green-800' : 'bg-muted/10 text-muted-foreground'}
                `}
                onClick={() => {
                  if (!isCompleted) onStageClick(stage.name);
                }}
                onMouseEnter={() => setOpenPopoverIdx(idx)}
                onMouseLeave={() => setOpenPopoverIdx(null)}
              >
                <div className={`w-3 h-3 rounded-full border ${isCurrent ? 'bg-primary border-primary' : isCompleted ? 'bg-green-500 border-green-500' : 'bg-gray-300 border-gray-300'}`}></div>
                <span>{stage.name}</span>
                {isCurrent && <span className="ml-2 text-xs text-primary">(Current)</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start" sideOffset={4} onMouseEnter={() => setOpenPopoverIdx(idx)} onMouseLeave={() => setOpenPopoverIdx(null)}>
              <div className="mb-1 font-semibold">{stage.name}</div>
              {records.length > 0 ? (
                <ul className="space-y-2">
                  {records.map((record, i) => (
                    <li key={record.id} className="border-b pb-2 last:border-b-0 last:pb-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Info className="h-3 w-3" />
                        <span>{record.notes || <span className='italic text-muted-foreground'>No note</span>}</span>
                        {editableNotes && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newNote = prompt("Edit note:", record.notes);
                              if (newNote && newNote.trim() !== '') {
                                onNoteEdit(record.id, newNote.trim());
                              }
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span>By: <span className="font-medium">{record.actingUserName || 'Unknown'}</span></span>
                        <span className="text-muted-foreground">|</span>
                        <span>{record.date ? new Date(record.date).toLocaleString() : ''}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-muted-foreground">No transition record for this stage yet.</div>
              )}
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
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

  const handleCommentsChange = async () => {
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
      // Only send the fields that are actually being updated
      const payload: { status: string; transitionNotes?: string; positionId?: string | null; recruiterId?: string | null } = {
        status: newStatus || '',
      };
      
      // Only include positionId and recruiterId if they exist
      if (candidate?.positionId !== undefined) {
        payload.positionId = candidate.positionId;
      }
      if (candidate?.recruiterId !== undefined) {
        payload.recruiterId = candidate.recruiterId;
      }
      
      if (notes) {
        payload.transitionNotes = notes;
      }
      
      console.log('Sending payload to API:', payload); // Debug log
      
      const response = await fetch(`/api/candidates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('API response:', result); // Debug log
      
      if (!response.ok) {
        if (!suppressToast) {
          toast(result?.message || 'Failed to update status.');
        }
        return;
      }

      setCandidate(result.candidate);
      
      // Only show toast if not suppressed
      if (!suppressToast) {
        // Create a more specific toast message for status transitions
        const candidateName = result.candidate?.name || 'Candidate';
        const oldStatus = candidate?.status || 'Unknown';
        const newStatusDisplay = newStatus || 'Unknown';
        
        if (oldStatus === newStatusDisplay) {
          // If only notes were added without status change
          toast.success(`${candidateName}'s transition notes have been updated.`);
        } else {
          // Status was changed
          toast.success(`${candidateName} moved from "${oldStatus}" to "${newStatusDisplay}".`);
        }
      }
    } catch (error: any) {
      console.error('Error updating candidate status:', error); // Debug log
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
        body: JSON.stringify({ recruiterId: newRecruiterId }),
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

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        <div className="flex justify-between items-center p-6 pb-0">
          <Breadcrumb 
            items={[
              { label: "Home", href: "/", icon: Home },
              { label: "Candidates", href: "/candidates", icon: UsersIcon },
              { label: candidate?.name || "Candidate Details" }
            ]} 
          />
        </div>
        <form onSubmit={handleSubmit(handleSaveDetails)}>
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 border border-border bg-card overflow-hidden">
            {/* LEFT SIDEBAR: Stage Pipeline (20%) */}
            <div className="lg:col-span-2 bg-card sticky top-6 h-fit p-3">
              {availableStages.length > 0 && candidate && (
                <div className="max-w-[14rem] w-full">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold flex items-center mb-3">
                      <Users className="mr-2 h-5 w-5 text-primary" />
                      Recruitment Stage
                    </h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mb-3"
                      onClick={() => setIsTransitionsModalOpen(true)}
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Manage Transitions
                    </Button>
                  </div>
                  <StagePipeline
                    stages={availableStages}
                    transitionHistory={candidate.transitionHistory || []}
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
                    }}
                  />
                </div>
              )}
            </div>
            {/* MAIN CONTENT (50%) with Tabs */}
            <div className="lg:col-span-5 space-y-8 border-r border-l border-border p-8">
              {/* Tabs for main content */}
             
            
               
                   {/* Candidate Header */}
                   {candidate && (
                     <div className="flex flex-col md:flex-row items-center  gap-6 ">
                       {/* Avatar */}
                       <div className="flex-shrink-0">
                         <Avatar className="w-20 h-20 text-3xl">
                           {candidate.avatarUrl ? (
                             <AvatarImage src={candidate.avatarUrl} alt={candidate.name} />
                           ) : (
                             <AvatarFallback>{candidate.name?.[0] || '?'}</AvatarFallback>
                           )}
                         </Avatar>
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
                   )}

                   {/* Role Suggestion and Job Matches at the top */}
                   <div className="space-y-6">
                     {/* Role Suggestion Summary */}
                     <RoleSuggestionSummary candidate={candidate} allDbPositions={allDbPositions} />
                     
                     {/* Job Matches Table */}
                     <div className="bg-muted rounded-xl p-6 shadow-sm">
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
                                        <Input placeholder="Period" {...register(`parsedData.education.${index}.period`)} />
                                        <Input placeholder="Duration" {...register(`parsedData.education.${index}.duration`)} />
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
                            (education && education.length > 0) ? (
                                <ul className="space-y-4">
                                    {education.map((edu, index) => {
                                        if (typeof edu === 'string') {
                                            // Render string-only education entry
                                            return (
                                                <li key={`edu-${index}-${edu}`} className="p-3 border rounded-md bg-muted">
                                                    {renderField("Education", edu)}
                                                </li>
                                            );
                                        } else {
                                            // Render EducationEntry object
                                            return (
                                                <li key={`edu-${index}-${edu.university || index}`} className="p-3 border rounded-md bg-muted">
                                                    {renderField("University", edu.university)}
                                                    {renderField("Major", edu.major)}
                                                    {renderField("Field", edu.field)}
                                                    {renderField("Campus", edu.campus)}
                                                    {renderField("Period", edu.period, CalendarDays)}
                                                    {renderField("Duration", edu.duration)}
                                                    {renderField("GPA", edu.GPA)}
                                                    {index < education!.length - 1 && <Separator className="my-3" />}
                                                </li>
                                            );
                                        }
                                    })}
                                </ul>
                            ) : <div className="text-sm text-muted-foreground text-center py-4">No education details provided.</div>
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
                                        <Input placeholder="Period" {...register(`parsedData.experience.${index}.period`)} />
                                        <Input placeholder="Duration" {...register(`parsedData.experience.${index}.duration`)} />
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
                            (experience && experience.length > 0) ? (
                                <ul className="space-y-4">
                                    {experience.map((exp, index) => (
                                    <li key={`exp-${index}-${exp.company || index}`} className="p-3 border rounded-md bg-muted">
                                        {renderField("Company", exp.company)}
                                        {renderField("Position", exp.position)}
                                        {renderField("Level", String(exp.postition_level))}
                                        {renderField("Period", exp.period, CalendarDays)}
                                        {renderField("Duration", exp.duration)}
                                        {exp.is_current_position !== undefined && renderField("Current Position", String(exp.is_current_position))}
                                        {exp.description && (
                                            <div>
                                                <h4 className="text-sm font-medium text-muted-foreground mt-2 mb-1">Description:</h4>
                                                <p className="text-sm text-foreground whitespace-pre-wrap bg-card p-2 rounded">{exp.description}</p>
                                            </div>
                                        )}
                                        {index < experience!.length - 1 && <Separator className="my-3" />}
                                    </li>
                                    ))}
                                </ul>
                            ) : <div className="text-sm text-muted-foreground text-center py-4">No experience details provided.</div>
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
            <div className="lg:col-span-3 space-y-6 bg-card p-3 pt-6 rounded-xl shadow-sm">
              {/* Quick Actions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Zap className="mr-2 h-5 w-5 text-primary" />
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 gap-3">
               
                  
                  {!isEditing ? (
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto p-3"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      <div className="text-left">
                        <div className="font-medium">Edit Details</div>
                        <div className="text-xs text-muted-foreground">Modify candidate info</div>
                      </div>
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="default" 
                        className="justify-start h-auto p-3"
                        onClick={handleSubmit(handleSaveDetails)}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        <div className="text-left">
                          <div className="font-medium">{isSubmitting ? 'Saving...' : 'Save Changes'}</div>
                          <div className="text-xs text-muted-foreground">Save all modifications</div>
                        </div>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="justify-start h-auto p-3"
                        onClick={handleCancelEdit}
                        disabled={isSubmitting}
                      >
                        <X className="mr-2 h-4 w-4" />
                        <div className="text-left">
                          <div className="font-medium">Cancel Edit</div>
                          <div className="text-xs text-muted-foreground">Discard changes</div>
                        </div>
                      </Button>
                    </>
                  )}
                  <Button 
                    variant="outline" 
                    className="justify-start h-auto p-3"
                    onClick={() => setIsUploadModalOpen(true)}
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">Upload Resume</div>
                      <div className="text-xs text-muted-foreground">Add new resume file (Legacy)</div>
                    </div>
                  </Button>
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
              
              {/* Resumes Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <UploadCloud className="mr-2 h-5 w-5 text-primary" />
                  Resume Files
                </h3>
                <div className="bg-muted rounded-lg p-4">
                  <CandidateResumesSection 
                    candidateId={candidateId} 
                    resumes={Array.isArray(resumes) ? resumes : []} 
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
    </FormProvider>
  );
}
