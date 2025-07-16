"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';
import { useSession } from 'next-auth/react';
import type { Candidate, CandidateDetails, TransitionRecord, EducationEntry, ExperienceEntry, SkillEntry, JobSuitableEntry, PersonalInfo, AutomationJobMatch, UserProfile, Position, positionLevel, RecruitmentStage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import { 
  ArrowLeft, Briefcase, CalendarDays, DollarSign, Edit, GraduationCap, HardDrive, Info, 
  LinkIcon, ListChecks, Loader2, Mail, MapPin, MessageSquare, Percent, Phone, ServerCrash, 
  ShieldAlert, Star, Tag, UploadCloud, User, UserCircle, UserCog, Users, Zap, ExternalLink, 
  Edit3, Save, X, PlusCircle, Trash2, Lightbulb, ChevronDown, ChevronRight, ChevronUp, ChevronLeft, 
  Activity, Clock, BarChart3, Eye
} from 'lucide-react';
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

// Form schemas (ported from page)
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

// --- Update Zod schemas for structured fields ---
const educationEntryEditSchema = z.object({
  university: z.string().optional().nullable(),
  major: z.string().optional().nullable(),
  field: z.string().optional().nullable(),
  campus: z.string().optional().nullable(),
  startMonth: z.number().min(1).max(12).optional().nullable(),
  startYear: z.number().min(1900).max(2100).optional().nullable(),
  endMonth: z.number().min(1).max(12).optional().nullable(),
  endYear: z.number().min(1900).max(2100).optional().nullable(),
  isCurrent: z.boolean().optional(),
  GPA: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  // Legacy fallback
  period: z.string().optional().nullable(),
}).deepPartial();

const experienceEntryEditSchema = z.object({
  company: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  startMonth: z.number().min(1).max(12).optional().nullable(),
  startYear: z.number().min(1900).max(2100).optional().nullable(),
  endMonth: z.number().min(1).max(12).optional().nullable(),
  endYear: z.number().min(1900).max(2100).optional().nullable(),
  isCurrent: z.boolean().optional(),
  positionLevel: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  // Legacy fallback
  period: z.string().optional().nullable(),
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
    job_id: z.string().uuid().optional().nullable(),
    job_title: z.string().optional().nullable(),
    fit_score: z.number().min(0).max(100).optional().nullable(),
    match_reasons: z.array(z.string()).optional(),
    match_reasons_string: z.string().optional().nullable(),
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

// Helper functions (ported from page)
function calculateDuration(period?: string): string {
  if (!period) return '';
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

function hasFitScore(obj: any): obj is { fitScore: number } {
  return typeof obj === 'object' && obj !== null && 'fitScore' in obj && typeof obj.fitScore === 'number';
}

// Type guard to check if parsedData is CandidateDetails
function isCandidateDetails(parsedData: any): parsedData is CandidateDetails {
  return parsedData && typeof parsedData === 'object' && 'personal_info' in parsedData;
}

interface CandidateDetailModalProps {
  candidateId: string;
  open: boolean;
  onClose: () => void;
}

const CandidateDetailModal: React.FC<CandidateDetailModalProps> = ({ candidateId, open, onClose }) => {
  // State variables (ported from page)
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [recruiters, setRecruiters] = useState<Pick<UserProfile, 'id' | 'name'>[]>([]);
  const [allDbPositions, setAllDbPositions] = useState<Position[]>([]);
  const [availableStages, setAvailableStages] = useState<RecruitmentStage[]>([]);
  const [transitionHistory, setTransitionHistory] = useState<TransitionRecord[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTransitionsModalOpen, setIsTransitionsModalOpen] = useState(false);
  const [isJobMatchModalOpen, setIsJobMatchModalOpen] = useState(false);
  const [selectedJobMatch, setSelectedJobMatch] = useState<any>(null);
  const [isAssigningRecruiter, setIsAssigningRecruiter] = useState(false);
  const [isEditPositionModalOpen, setIsEditPositionModalOpen] = useState(false);
  const [selectedPositionForEdit, setSelectedPositionForEdit] = useState<Position | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showAllJobMatches, setShowAllJobMatches] = useState(false);
  const [preselectedStage, setPreselectedStage] = useState<string | null>(null);
  const [experienceOpen, setExperienceOpen] = useState(true);
  const [skillsOpen, setSkillsOpen] = useState(true);
  const [jobSuitableOpen, setJobSuitableOpen] = useState(true);
  const [jobAppliedOpen, setJobAppliedOpen] = useState(true);
  const [jobMatchesOpen, setJobMatchesOpen] = useState(true);
  const [educationOpen, setEducationOpen] = useState(true);
  const [recruiterSearchTerm, setRecruiterSearchTerm] = useState('');
  const [filteredRecruiters, setFilteredRecruiters] = useState<Pick<UserProfile, 'id' | 'name'>[]>([]);

  // Move fetchRecruiters here so it can access setRecruiters
  const fetchRecruiters = async () => {
    try {
      const recruitersRes = await fetch('/api/users?role=Recruiter');
      if (recruitersRes.ok) {
        const recruitersData = await recruitersRes.json();
        setRecruiters(recruitersData);
      }
    } catch (error) {
      // Optionally handle error
    }
  };

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const { data: session } = useSession();

  // Initialize form
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

  const { handleSubmit, reset, setValue, formState: { isSubmitting, errors }, control, register, watch } = form;

  // Field arrays for form sections
  const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({ control, name: "parsedData.education" });
  const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({ control, name: "parsedData.experience" });
  const { fields: skillsFields, append: appendSkill, remove: removeSkill } = useFieldArray({ control, name: "parsedData.skills" });
  const { fields: jobSuitableFields, append: appendJobSuitable, remove: removeJobSuitable } = useFieldArray({ control, name: "parsedData.job_suitable" });
  const { fields: jobMatchesFields, append: appendJobMatch, remove: removeJobMatch } = useFieldArray({ control, name: "parsedData.job_matches" });

  // Fetch candidate details and metadata
  const fetchData = async () => {
    try {
      const [candidateRes, recruitersRes, positionsRes, stagesRes, transitionRes] = await Promise.all([
        fetch(`/api/candidates/${candidateId}`),
        fetch('/api/users?role=Recruiter'),
        fetch('/api/positions/all'),
        fetch('/api/settings/recruitment-stages'),
        fetch(`/api/transitions?candidateId=${candidateId}`)
      ]);

      if (candidateRes.ok) {
        const candidateData = await candidateRes.json();
        setCandidate(candidateData);
      }

      if (recruitersRes.ok) {
        const recruitersData = await recruitersRes.json();
        setRecruiters(recruitersData);
      }

      if (positionsRes.ok) {
        const positionsData = await positionsRes.json();
        setAllDbPositions(Array.isArray(positionsData.data) ? positionsData.data : []);
      } else {
        setAllDbPositions([]);
      }

      if (stagesRes.ok) {
        const stagesData = await stagesRes.json();
        setAvailableStages(stagesData);
      }

      if (transitionRes.ok) {
        const transitionData = await transitionRes.json();
        setTransitionHistory(transitionData);
      }

      setIsLoading(false);
    } catch (error) {
      setFetchError('Failed to fetch candidate data');
      setAllDbPositions([]);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!candidateId || !open) return;
    setIsLoading(true);
    fetchData();
  }, [candidateId, open]);

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
        parsedData: (candidate.parsedData as any) || {}
      });
    }
  }, [candidate, reset]);

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

  const handleAssignRecruiter = async (newRecruiterId: string | null) => {
    if (!candidate || isAssigningRecruiter) return;
    setIsAssigningRecruiter(true);
    try {
      const response = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          skills: Array.isArray((updatedCandidate.parsedData as CandidateDetails)?.skills) ? (updatedCandidate.parsedData as CandidateDetails)?.skills?.map(s => ({
            ...s,
            skill_string: Array.isArray(s.skill) ? s.skill.join(', ') : ''
          })) || [] : [],
          experience: Array.isArray((updatedCandidate.parsedData as CandidateDetails)?.experience) ? (updatedCandidate.parsedData as CandidateDetails)?.experience?.map(exp => ({
            ...exp,
            is_current_position: typeof exp.is_current_position === 'string'
              ? exp.is_current_position === 'true'
              : !!exp.is_current_position,
          })) || [] : [],
        }
      });
      toast(`Candidate assigned to ${updatedCandidate.recruiter?.name || 'Unassigned'}.`);
      await fetchRecruiters();
      await fetchData(); // fetchCandidateDetails equivalent in modal
    } catch (error) {
      toast((error as Error).message);
    } finally {
      setIsAssigningRecruiter(false);
    }
  };

  // Main layout structure
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogOverlay />
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">Loading...</div>
        ) : fetchError ? (
          <div className="text-red-500">{fetchError}</div>
        ) : candidate ? (
          <>
            {/* Header - 2 Columns - Fixed at top */}
            <div className="bg-card border-b border-border p-6 flex-shrink-0">
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                {/* Column 1: Candidate Header (7 cols) */}
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
                            if (file) {
                              // TODO: Implement avatar upload
                              console.log('Avatar upload:', file);
                            }
                            e.target.value = '';
                          }}
                          tabIndex={-1}
                          aria-hidden="true"
                        />
                        {avatarUploading && (
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
                        {/* Removed recruiter display from header - now shown in button */}
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
                {/* Column 2: Action Buttons + Recruiter Dropdown (3 cols) */}
                <div className="lg:col-span-3">
                  <div className="flex justify-end gap-2 items-center">
                    {!isEditing && (
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
                          onClick={() => {
                            if (candidate?.status) {
                              setPreselectedStage(candidate.status);
                            } else if (availableStages.length > 0) {
                              setPreselectedStage(availableStages[0].name);
                            } else {
                              setPreselectedStage(null);
                            }
                            setIsTransitionsModalOpen(true);
                          }}
                          disabled={availableStages.length === 0}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Manage Transitions
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-10 border-t bg-card min-h-full">
                {/* LEFT SIDEBAR: Recruitment Pipeline & Recruiter Assignment (20%) */}
                <div className="lg:col-span-2 bg-card p-6 space-y-6">
                  {/* Recruitment Pipeline */}
                  {availableStages.length > 0 && candidate && (
                    <div className="w-full">
                      <RecruitmentPipelineCard
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
                          // Refresh data
                          const transitionRes = await fetch(`/api/transitions?candidateId=${candidateId}`);
                          if (transitionRes.ok) {
                            const transitionData = await transitionRes.json();
                            setTransitionHistory(transitionData);
                          }
                        }}
                        candidateId={candidateId}
                      />
                    </div>
                  )}

                  {/* Recruiter Assignment Section - match screenshot */}
                  <div className="space-y-2">
                    <div className="font-medium flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="h-4 w-4" /> Recruiter Assignment
                    </div>
                    <div className="rounded-lg bg-muted p-4">
                      <div className="mb-2 text-sm text-muted-foreground">Current Recruiter:</div>
                      <RecruiterAssignmentDropdown
                        candidateId={candidate?.id || ''}
                        recruiterId={candidate?.recruiterId || null}
                        recruiters={recruiters}
                        isAssigningRecruiter={isAssigningRecruiter}
                        onAssignRecruiter={handleAssignRecruiter}
                      />
                    </div>
                  </div>
                </div>
                {/* MAIN CONTENT (50%) */}
                <div className="lg:col-span-5 space-y-8 border-r border-l border-border p-8">
                {/* Job Applied Section */}
                <section className="mb-4 border border-border rounded-lg bg-card shadow-sm hover:shadow-md transition-all duration-200">
                  <button type="button" className="flex items-center w-full p-4 group hover:bg-muted/50 transition-colors rounded-t-lg" onClick={() => setJobAppliedOpen(o => !o)}>
                    <Briefcase className="mr-2 h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Job Applied</h2>
                    {jobAppliedOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
                  </button>
                  {jobAppliedOpen && (
                    <div className="space-y-4 transition-all duration-200 p-4 pt-0 border-t border-border">
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
                                    job_id: candidate.positionId,
                                    job_title: position.title,
                                    fit_score: candidate.fitScore || 0,
                                    match_reasons: (candidate as any).assignmentJustification ? [(candidate as any).assignmentJustification] : [],
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
                <section className="mb-4 border border-border rounded-lg bg-card shadow-sm hover:shadow-md transition-all duration-200">
                  <button type="button" className="flex items-center w-full p-4 group hover:bg-muted/50 transition-colors rounded-t-lg" onClick={() => setJobMatchesOpen(o => !o)}>
                    <ListChecks className="mr-2 h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold tracking-tight flex-1 text-left">
                      Job Matches
                      {candidate.parsedData && 'job_matches' in candidate.parsedData && (candidate.parsedData as any).job_matches && (candidate.parsedData as any).job_matches.length > 0 && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({(candidate.parsedData as any).job_matches.length})
                        </span>
                      )}
                      {candidate.parsedData && 'job_matches' in candidate.parsedData && (candidate.parsedData as any).job_matches && (candidate.parsedData as any).job_matches.length > 1 && (
                        <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                          ← Scroll →
                        </span>
                      )}
                    </h2>
                    {jobMatchesOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
                  </button>
                  {jobMatchesOpen && (
                    <div className="space-y-4 transition-all duration-200 p-4 pt-0 border-t border-border">
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
                            {jobMatchesFields.map((field, index: number) => (
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
                                      name={`parsedData.job_matches.${index}.job_id`}
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
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <Label className="text-sm font-medium">Fit Score</Label>
                                    <Input 
                                      type="number" 
                                      min="0"
                                      max="100"
                                      placeholder="0-100" 
                                      {...register(`parsedData.job_matches.${index}.fit_score`, { 
                                        valueAsNumber: true,
                                        min: { value: 0, message: "Score must be at least 0" },
                                        max: { value: 100, message: "Score must be at most 100" }
                                      })} 
                                    />
                                  </div>
                                </div>
                                
                                <div className="space-y-1">
                                  <Label className="text-sm font-medium">Match Reasons</Label>
                                  <Textarea 
                                    placeholder="Explain why this candidate is a good match for this position..."
                                    {...register(`parsedData.job_matches.${index}.match_reasons_string`)}
                                    rows={3}
                                    className="resize-none"
                                  />
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Controller
                                    name={`parsedData.job_matches.${index}.is_applied_job`}
                                    control={control}
                                    render={({ field: controllerField }) => (
                                      <Checkbox
                                        id={`job_matches.${index}.is_applied_job`}
                                        checked={Boolean(controllerField.value)}
                                        onCheckedChange={(checked) => controllerField.onChange(checked)}
                                      />
                                    )}
                                  />
                                  <Label htmlFor={`job_matches.${index}.is_applied_job`}>Applied for this position</Label>
                                </div>
                              </div>
                            ))}
                            <Button type="button" variant="outline" className="mt-2" onClick={() => appendJobMatch({ job_id: '', job_title: '', fit_score: null, match_reasons: [], match_reasons_string: '', is_applied_job: false })}>
                              <PlusCircle className="mr-2 h-4 w-4" /> Add Job Match
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* View Section */}
                      {!isEditing && candidate.parsedData && 'job_matches' in candidate.parsedData && (candidate.parsedData as any).job_matches && (candidate.parsedData as any).job_matches.length > 0 && (
                        <div className="relative">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Matching Positions</h3>
                            {(candidate.parsedData as any).job_matches.length > 1 && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const container = document.getElementById('job-matches-scroll');
                                    if (container) {
                                      container.scrollLeft -= 300;
                                    }
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const container = document.getElementById('job-matches-scroll');
                                    if (container) {
                                      container.scrollLeft += 300;
                                    }
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <div 
                            id="job-matches-scroll"
                            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
                            style={{ scrollBehavior: 'smooth' }}
                          >
                            {(Array.isArray((candidate.parsedData as any)?.job_matches) ? (candidate.parsedData as any).job_matches : []).map((match: AutomationJobMatch, index: number) => {
                              const position = Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === match.job_id) : null;
                              if (!position) return null;
                              
                              return (
                                <div
                                  key={`${match.job_id}-${index}`}
                                  className="flex-shrink-0 w-80 p-4 border rounded-lg bg-card hover:shadow-lg transition-shadow cursor-pointer"
                                  onClick={() => {
                                    const jobMatchData = {
                                      job_id: match.job_id,
                                      job_title: match.job_title || position.title,
                                      fit_score: match.fit_score || 0,
                                      match_reasons: match.match_reasons || [],
                                      match_reasons_string: match.match_reasons_string,
                                      is_applied_job: match.is_applied_job,
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
                                    setSelectedJobMatch(jobMatchData);
                                    setIsJobMatchModalOpen(true);
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-foreground text-lg line-clamp-2">
                                      {match.job_title || position.title}
                                    </h4>
                                    {match.fit_score !== null && match.fit_score !== undefined && (
                                      <div className="text-2xl font-bold text-primary flex items-center gap-2">
                                        <span>{match.fit_score}%</span>
                                        <span className="text-lg font-bold text-primary">(A)</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {match.match_reasons_string && (
                                    <div className="mt-3">
                                      <h5 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                        <Info className="h-3 w-3" />
                                        Match Reasons:
                                      </h5>
                                      <div className="text-sm text-foreground bg-muted/50 px-3 py-2 rounded whitespace-pre-wrap line-clamp-3">
                                        {match.match_reasons_string}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {match.is_applied_job && (
                                    <div className="mt-3">
                                      <Badge variant="default" className="text-xs">
                                        Applied
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {!isEditing && (!candidate.parsedData || !('job_matches' in candidate.parsedData) || !(candidate.parsedData as any).job_matches || (candidate.parsedData as any).job_matches.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          <ListChecks className="mx-auto h-12 w-12 mb-4 opacity-50" />
                          <p>No job matches found.</p>
                          <p className="text-sm">Click "Edit" to add job matches for this candidate.</p>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Education Section */}
                <section className="mb-4 border border-border rounded-lg bg-card shadow-sm hover:shadow-md transition-all duration-200">
                  <button type="button" className="flex items-center w-full p-4 group hover:bg-muted/50 transition-colors rounded-t-lg" onClick={() => setEducationOpen(o => !o)}>
                    <GraduationCap className="mr-2 h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Education</h2>
                    {educationOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
                  </button>
                  {educationOpen && (
                    <div className="space-y-4 transition-all duration-200 p-4 pt-0 border-t border-border">
                      {isEditing ? (
                        <div className="space-y-4">
                          {educationFields.map((field, index: number) => (
                            <div key={field.id} className="p-3 border rounded-md space-y-2 bg-muted/30 relative">
                              <Input placeholder="University" {...register(`parsedData.education.${index}.university`)} />
                              <Input placeholder="Major" {...register(`parsedData.education.${index}.major`)} />
                              <Input placeholder="Field" {...register(`parsedData.education.${index}.field`)} />
                              <Input placeholder="Campus" {...register(`parsedData.education.${index}.campus`)} />
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Start Month</Label>
                                  <Select
                                    value={watch(`parsedData.education.${index}.startMonth`)?.toString() || ''}
                                    onValueChange={value => setValue(`parsedData.education.${index}.startMonth`, parseInt(value))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <SelectItem key={month} value={month.toString()}>
                                          {new Date(2000, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Start Year</Label>
                                  <Input
                                    type="number"
                                    min="1900"
                                    max="2100"
                                    placeholder="Year"
                                    {...register(`parsedData.education.${index}.startYear`, { valueAsNumber: true })}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Controller
                                  name={`parsedData.education.${index}.isCurrent`}
                                  control={control}
                                  render={({ field }) => (
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                  )}
                                />
                                <Label>Currently studying</Label>
                              </div>
                              {!watch(`parsedData.education.${index}.isCurrent`) && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs">End Month</Label>
                                    <Select
                                      value={watch(`parsedData.education.${index}.endMonth`)?.toString() || ''}
                                      onValueChange={value => setValue(`parsedData.education.${index}.endMonth`, parseInt(value))}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Month" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                          <SelectItem key={month} value={month.toString()}>
                                            {new Date(2000, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs">End Year</Label>
                                    <Input
                                      type="number"
                                      min="1900"
                                      max="2100"
                                      placeholder="Year"
                                      {...register(`parsedData.education.${index}.endYear`, { valueAsNumber: true })}
                                    />
                                  </div>
                                </div>
                              )}
                              <Input placeholder="GPA" {...register(`parsedData.education.${index}.GPA`)} />
                              <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeEducation(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Button type="button" variant="outline" className="mt-2" onClick={() => appendEducation({ university: '', major: '', field: '', campus: '', startMonth: null, startYear: null, endMonth: null, endYear: null, isCurrent: false, GPA: '' })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Education
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          {/* Continuous vertical line that connects all education nodes */}
                          {(Array.isArray(candidate.parsedData?.education) ? candidate.parsedData.education : []).length > 0 && (
                            <div className="absolute left-36 top-0 w-0.5 bg-border" style={{ height: `${((Array.isArray(candidate.parsedData?.education) ? candidate.parsedData.education : []).length - 1) * 80}px` }} />
                          )}
                          {(Array.isArray(candidate.parsedData?.education) ? candidate.parsedData.education : []).length === 0 && (
                            <div className="text-sm text-muted-foreground text-center py-4">No education details provided.</div>
                          )}
                          {(Array.isArray(candidate.parsedData?.education) ? candidate.parsedData.education : []).map((edu, index: number) => {
                            if (typeof edu === 'string') {
                              return (
                                <div key={`edu-${index}-${edu}`} className="relative mb-8">
                                  {/* ...existing string display... */}
                                </div>
                              );
                            } else if (typeof edu === 'object' && edu !== null) {
                              let start = '', end = '', duration = '';
                              if (edu.period) {
                                const parts = String(edu.period).split(' - ');
                                start = parts[0] || '';
                                end = parts[1] || '';
                              } else if (edu.startMonth && edu.startYear) {
                                start = `${new Date(edu.startYear, edu.startMonth - 1).toLocaleDateString('en-US', { month: 'long' })} ${edu.startYear}`;
                              }
                              if (edu.endMonth && edu.endYear) {
                                end = `${new Date(edu.endYear, edu.endMonth - 1).toLocaleDateString('en-US', { month: 'long' })} ${edu.endYear}`;
                              } else if (edu.isCurrent) {
                                end = 'Present';
                              }
                              if (edu.duration) {
                                duration = edu.duration;
                              }
                              return (
                                <div key={`edu-${index}-${edu.university || index}`} className="relative mb-8">
                                  {/* ...existing object display, using start/end/duration... */}
                                </div>
                              );
                            } else {
                              return null;
                            }
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </section>
                {/* Experience Section */}
                <section className="mb-4 border border-border rounded-lg bg-card shadow-sm hover:shadow-md transition-all duration-200">
                  <button type="button" className="flex items-center w-full p-4 group hover:bg-muted/50 transition-colors rounded-t-lg" onClick={() => setExperienceOpen(o => !o)}>
                    <Briefcase className="mr-2 h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Experience</h2>
                    {experienceOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
                  </button>
                  {experienceOpen && (
                    <div className="space-y-4 transition-all duration-200 p-4 pt-0 border-t border-border">
                      {isEditing ? (
                        <div className="space-y-4">
                          {experienceFields.map((field, index: number) => (
                            <div key={field.id} className="p-3 border rounded-md space-y-2 bg-muted/30 relative">
                              <Input placeholder="Company" {...register(`parsedData.experience.${index}.company`)} />
                              <Input placeholder="Position" {...register(`parsedData.experience.${index}.position`)} />
                              <Textarea placeholder="Description" {...register(`parsedData.experience.${index}.description`)} />
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Start Month</Label>
                                  <Select
                                    value={watch(`parsedData.experience.${index}.startMonth`)?.toString() || ''}
                                    onValueChange={value => setValue(`parsedData.experience.${index}.startMonth`, parseInt(value))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <SelectItem key={month} value={month.toString()}>
                                          {new Date(2000, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Start Year</Label>
                                  <Input
                                    type="number"
                                    min="1900"
                                    max="2100"
                                    placeholder="Year"
                                    {...register(`parsedData.experience.${index}.startYear`, { valueAsNumber: true })}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Controller
                                  name={`parsedData.experience.${index}.isCurrent`}
                                  control={control}
                                  render={({ field }) => (
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                  )}
                                />
                                <Label>Current Position</Label>
                              </div>
                              {!watch(`parsedData.experience.${index}.isCurrent`) && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs">End Month</Label>
                                    <Select
                                      value={watch(`parsedData.experience.${index}.endMonth`)?.toString() || ''}
                                      onValueChange={value => setValue(`parsedData.experience.${index}.endMonth`, parseInt(value))}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Month" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                          <SelectItem key={month} value={month.toString()}>
                                            {new Date(2000, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs">End Year</Label>
                                    <Input
                                      type="number"
                                      min="1900"
                                      max="2100"
                                      placeholder="Year"
                                      {...register(`parsedData.experience.${index}.endYear`, { valueAsNumber: true })}
                                    />
                                  </div>
                                </div>
                              )}
                              <Input placeholder="Position Level" {...register(`parsedData.experience.${index}.positionLevel`)} />
                              <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeExperience(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Button type="button" variant="outline" className="mt-2" onClick={() => appendExperience({ company: '', position: '', startMonth: null, startYear: null, endMonth: null, endYear: null, isCurrent: false, description: '', positionLevel: '' })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Experience
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          {/* Continuous vertical line that connects all experience nodes */}
                          {(candidate.parsedData && isCandidateDetails(candidate.parsedData) && Array.isArray(candidate.parsedData.experience) ? candidate.parsedData.experience : []).length > 0 && (
                            <div className="absolute left-36 top-0 w-0.5 bg-border" style={{ height: `${((candidate.parsedData && isCandidateDetails(candidate.parsedData) && Array.isArray(candidate.parsedData.experience) ? candidate.parsedData.experience : []).length - 1) * 80}px` }} />
                          )}
                          {(candidate.parsedData && isCandidateDetails(candidate.parsedData) && Array.isArray(candidate.parsedData.experience) ? candidate.parsedData.experience : []).length === 0 && (
                            <div className="text-sm text-muted-foreground text-center py-4">No experience details provided.</div>
                          )}
                          {(candidate.parsedData && isCandidateDetails(candidate.parsedData) && Array.isArray(candidate.parsedData.experience) ? candidate.parsedData.experience : []).map((exp: ExperienceEntry, index: number) => {
                            if (typeof exp === 'string') {
                              return (
                                <div key={`exp-${index}-${exp}`} className="relative mb-8">
                                  {/* ...existing string display... */}
                                </div>
                              );
                            } else if (typeof exp === 'object' && exp !== null) {
                              let start = '', end = '', duration = '';
                              if (exp.period) {
                                const parts = String(exp.period).split(' - ');
                                start = parts[0] || '';
                                end = parts[1] || '';
                              } else if (exp.startMonth && exp.startYear) {
                                start = `${new Date(exp.startYear, exp.startMonth - 1).toLocaleDateString('en-US', { month: 'long' })} ${exp.startYear}`;
                              }
                              if (exp.endMonth && exp.endYear) {
                                end = `${new Date(exp.endYear, exp.endMonth - 1).toLocaleDateString('en-US', { month: 'long' })} ${exp.endYear}`;
                              } else if (exp.isCurrent) {
                                end = 'Present';
                              }
                              if (exp.duration) {
                                duration = exp.duration;
                              }
                              return (
                                <div key={`exp-${index}-${exp.company || index}`} className="relative mb-8">
                                  {/* ...existing object display, using start/end/duration... */}
                                </div>
                              );
                            } else {
                              return null;
                            }
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </section>
                {/* Skills Section */}
                <section className="mb-4 border border-border rounded-lg bg-card shadow-sm hover:shadow-md transition-all duration-200">
                  <button type="button" className="flex items-center w-full p-4 group hover:bg-muted/50 transition-colors rounded-t-lg" onClick={() => setSkillsOpen(o => !o)}>
                    <Star className="mr-2 h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Skills</h2>
                    {skillsOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
                  </button>
                  {skillsOpen && (
                    <div className="space-y-4 transition-all duration-200 p-4 pt-0 border-t border-border">
                      {isEditing ? (
                        <div className="space-y-4">
                          {skillsFields.map((field, index: number) => (
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
                        (Array.isArray(candidate.parsedData?.skills) ? candidate.parsedData.skills : []).length > 0 ? (
                          <ul className="space-y-4">
                            {(Array.isArray(candidate.parsedData?.skills) ? candidate.parsedData.skills : []).map((skillEntry, index: number) => {
                              if (typeof skillEntry === 'string') {
                                return (
                                  <li key={`skill-${index}-${skillEntry}`} className="p-3 border rounded-md bg-muted">
                                    <div className="text-sm text-foreground">{skillEntry}</div>
                                  </li>
                                );
                              } else {
                                return (
                                  <li key={`skill-${index}-${skillEntry.segment_skill || index}`} className="p-3 border rounded-md bg-muted">
                                    <div className="text-sm font-medium text-foreground mb-2">{skillEntry.segment_skill || 'Skill Segment'}</div>
                                    {skillEntry.skill && Array.isArray(skillEntry.skill) && skillEntry.skill.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mt-1">
                                        {skillEntry.skill.map((s, i) => <Badge key={`${index}-${i}-${s}`} variant="secondary">{s}</Badge>)}
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

                {/* Job Suitability Section */}
                <section className="mb-4 border border-border rounded-lg bg-card shadow-sm hover:shadow-md transition-all duration-200">
                  <button type="button" className="flex items-center w-full p-4 group hover:bg-muted/50 transition-colors rounded-t-lg" onClick={() => setJobSuitableOpen(o => !o)}>
                    <UserCog className="mr-2 h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Job Suitability</h2>
                    {jobSuitableOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
                  </button>
                  {jobSuitableOpen && (
                    <div className="space-y-4 transition-all duration-200 p-4 pt-0 border-t border-border">
                      {isEditing ? (
                        <div className="space-y-4">
                          {jobSuitableFields.map((field, index: number) => (
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
                        (() => {
                          const isDetails = candidate.parsedData && isCandidateDetails(candidate.parsedData);
                          const jobSuitableArr: JobSuitableEntry[] = isDetails && Array.isArray((candidate.parsedData as CandidateDetails).job_suitable) ? (candidate.parsedData as CandidateDetails).job_suitable ?? [] : [];
                          return jobSuitableArr.length > 0 ? (
                            <ul className="space-y-4">
                              {jobSuitableArr.map((job: JobSuitableEntry, index: number) => (
                                <li key={`jobsuit-${index}-${job.suitable_career || index}`} className="p-3 border rounded-md bg-muted">
                                  <div className="space-y-2">
                                    {job.suitable_career && <div className="text-sm"><span className="font-medium">Career Path:</span> {job.suitable_career}</div>}
                                    {job.suitable_job_position && <div className="text-sm"><span className="font-medium">Job Position:</span> {job.suitable_job_position}</div>}
                                    {job.suitable_job_level && <div className="text-sm"><span className="font-medium">Job Level:</span> {job.suitable_job_level}</div>}
                                    {job.suitable_salary_bath_month && <div className="text-sm"><span className="font-medium">Desired Salary:</span> {job.suitable_salary_bath_month} THB/Month</div>}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : <div className="text-sm text-muted-foreground text-center py-4">No job suitability details provided.</div>;
                        })()
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
                      onCommentsChange={() => {
                        // TODO: Implement comments change handler
                        console.log('Comments changed');
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
                      resumes={Array.isArray(attachments) ? attachments : []} 
                      isEditing={isEditing} 
                      onResumesChange={() => {
                        // TODO: Implement resumes change handler
                        console.log('Resumes changed');
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modals */}
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
                onUpdateCandidate={async (id: string, newStatus: string, notes?: string, suppressToast?: boolean) => {
                  // TODO: Implement status update
                  console.log('Update candidate status:', id, newStatus, notes);
                }}
                onRefreshCandidateData={async () => {
                  // TODO: Implement refresh
                  console.log('Refresh candidate data');
                }}
                availableStages={availableStages}
                preselectedStage={preselectedStage}
                comments={comments}
                onCommentsChange={() => {
                  // TODO: Implement comments change
                  console.log('Comments changed');
                }}
              />
            </>
          )}
          
          {selectedPositionForEdit && (
            <EditPositionModal
              isOpen={isEditPositionModalOpen}
              onOpenChange={setIsEditPositionModalOpen}
              position={selectedPositionForEdit}
              onEditPosition={async () => {
                // TODO: Implement position edit
                console.log('Position edited');
              }}
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
            onUploadSuccess={(updatedCandidate: Candidate) => {
              // TODO: Implement upload success
              console.log('Upload success:', updatedCandidate);
            }}
          />

          {/* Floating Save/Cancel Buttons for Edit Mode */}
          {isEditing && (
            <div className="fixed bottom-6 right-6 z-50 flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  setIsEditing(false);
                  // TODO: Implement cancel edit
                  console.log('Cancel edit');
                }}
                className="shadow-lg hover:shadow-xl transition-all duration-200 bg-background/95 backdrop-blur-sm border-border"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                size="lg"
                onClick={handleSubmit((data) => {
                  // TODO: Implement save details
                  console.log('Save details:', data);
                })}
                className="shadow-lg hover:shadow-xl transition-all duration-200 btn-primary-gradient"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </>
      ) : null}
    </DialogContent>
  </Dialog>
);
};

export default CandidateDetailModal;