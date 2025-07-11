// src/components/candidates/FullCandidateDetailModal.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Candidate, CandidateDetails, TransitionRecord, EducationEntry, ExperienceEntry, SkillEntry, JobSuitableEntry, PersonalInfo, AutomationJobMatch, UserProfile, Position, PositionLevel, RecruitmentStage } from '@/lib/types';
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
import CandidateCommentsSection from './CandidateCommentsSection';
import CandidateResumesSection from './CandidateResumesSection';
import { Tabs as UITabs, TabsList as UITabsList, TabsTrigger as UITabsTrigger, TabsContent as UITabsContent } from '@/components/ui/tabs';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { updateCandidateStatusWithNotes } from '@/lib/candidateTransitionUtils';
import { MonthYearPicker } from '@/components/ui/MonthYearPicker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

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

interface FullCandidateDetailModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  candidateId: string;
}

// Role Suggestion Summary Component (same as original)
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
    const jobMatchTitleLower = jobMatch.job_title?.toLowerCase();
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
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-primary">{bestAlternativePositionInDb.title}</h4>
              <Badge variant="outline" className={`${getScoreColor(bestAlternativeMatch.fit_score)}`}>
                {formatScoreWithGrade(bestAlternativeMatch.fit_score)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              This candidate shows a {bestAlternativeMatch.fit_score - currentFitScore}% better fit for this position.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/positions/${bestAlternativePositionInDb.id}`}>
                  View Position
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/candidates?positionId=${bestAlternativePositionInDb.id}`}>
                  View Similar Candidates
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No better alternative positions found for this candidate.</p>
        )}
      </CardContent>
    </Card>
  );
};

// Stage Pipeline Component (same as original)
function StagePipeline({ stages, transitionHistory, currentStatus, onStageClick, editableNotes, onNoteEdit }: { 
  stages: RecruitmentStage[], 
  transitionHistory: TransitionRecord[], 
  currentStatus: string, 
  onStageClick: (stageName: string) => void, 
  editableNotes: boolean, 
  onNoteEdit: (transitionId: string, newNote: string) => Promise<void> 
}) {
  return (
    <div className="space-y-3">
      {stages.map((stage, index) => {
        const isCurrentStage = stage.name === currentStatus;
        const hasTransition = transitionHistory.some(t => t.stage === stage.name);
        const transition = transitionHistory.find(t => t.stage === stage.name);
        const isCompleted = hasTransition || index < stages.findIndex(s => s.name === currentStatus);

        return (
          <div key={stage.name} className="relative">
            <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
              isCurrentStage 
                ? 'bg-primary/10 border-primary/30 shadow-sm' 
                : isCompleted 
                  ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                  : 'bg-muted/50 border-border hover:bg-muted'
            }`} onClick={() => onStageClick(stage.name)}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                isCurrentStage 
                  ? 'bg-primary text-primary-foreground' 
                  : isCompleted 
                    ? 'bg-green-500 text-white' 
                    : 'bg-muted text-muted-foreground'
              }`}>
                {isCompleted ? '✓' : index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{stage.name}</div>
                {transition && (
                  <div className="text-xs text-muted-foreground">
                    {format(parseISO(transition.date), "MMM d, yyyy")}
                  </div>
                )}
              </div>
              {isCurrentStage && (
                <Badge variant="outline" className="text-xs">Current</Badge>
              )}
            </div>
            {transition && editableNotes && (
              <div className="mt-2 ml-11">
                <Textarea
                  placeholder="Add notes about this transition..."
                  value={transition.notes || ''}
                  onChange={(e) => onNoteEdit(transition.id, e.target.value)}
                  className="text-xs min-h-[60px]"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FullCandidateDetailModal({ isOpen, onOpenChange, candidateId }: FullCandidateDetailModalProps) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recruiters, setRecruiters] = useState<{ id: string; name: string }[]>([]);
  const [allDbPositions, setAllDbPositions] = useState<Position[]>([]);
  const [stages, setStages] = useState<RecruitmentStage[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [transitionHistory, setTransitionHistory] = useState<TransitionRecord[]>([]);
  const [isAssigningRecruiter, setIsAssigningRecruiter] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const fetchCandidate = useCallback(async () => {
    if (!candidateId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/candidates/${candidateId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch candidate details (Status: ${response.status})`);
      }
      const data: Candidate = await response.json();
      setCandidate(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [candidateId]);

  const fetchMetaData = useCallback(async () => {
    try {
      const [recruitersRes, positionsRes, stagesRes] = await Promise.all([
        fetch('/api/users?role=Recruiter'),
        fetch('/api/positions'),
        fetch('/api/settings/recruitment-stages')
      ]);

      if (recruitersRes.ok) {
        const recruitersData = await recruitersRes.json();
        setRecruiters(recruitersData.map((r: UserProfile) => ({ id: r.id, name: r.name })));
      }

      if (positionsRes.ok) {
        const positionsData = await positionsRes.json();
        setAllDbPositions(positionsData.positions || []);
      }

      if (stagesRes.ok) {
        const stagesData = await stagesRes.json();
        setStages(stagesData);
      }
    } catch (error) {
      console.error("Error fetching metadata:", error);
    }
  }, []);

  const fetchTransitionHistory = useCallback(async () => {
    if (!candidateId) return;
    
    try {
      const response = await fetch(`/api/candidates/${candidateId}/transitions`);
      if (response.ok) {
        const data = await response.json();
        setTransitionHistory(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching transition history:", error);
    }
  }, [candidateId]);

  const fetchAttachments = useCallback(async () => {
    if (!candidateId) return;
    
    try {
      const [resumesRes, commentsRes] = await Promise.all([
        fetch(`/api/candidates/${candidateId}/resumes`),
        fetch(`/api/candidates/${candidateId}/comments`)
      ]);

      const resumesData = await resumesRes.json();
      const commentsData = await commentsRes.json();

      const resumes = Array.isArray(resumesData) ? resumesData : (resumesData.data || []);
      const comments = Array.isArray(commentsData) ? commentsData : (commentsData.data || []);

      setResumes(resumes);
      setComments(comments);

      const allAttachments = [
        ...resumes.map((r: any) => ({ ...r, type: 'resume' })),
        ...comments.filter((c: any) => c.attachments && c.attachments.length > 0)
          .flatMap((c: any) => c.attachments.map((a: any) => ({ ...a, type: 'comment', commentId: c.id })))
      ];

      setAttachments(allAttachments);
    } catch (error) {
      console.error("Error fetching attachments:", error);
    }
  }, [candidateId]);

  useEffect(() => {
    if (isOpen && candidateId) {
      fetchCandidate();
      fetchMetaData();
      fetchTransitionHistory();
      fetchAttachments();
    }
  }, [isOpen, candidateId, fetchCandidate, fetchMetaData, fetchTransitionHistory, fetchAttachments]);

  const handleAssignRecruiter = async (newRecruiterId: string | null) => {
    if (!candidate) return;

    setIsAssigningRecruiter(true);
    try {
      const response = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recruiterId: newRecruiterId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign recruiter');
      }

      const updatedCandidate = await response.json();
      setCandidate(updatedCandidate);
      toast.success('Recruiter assigned successfully');
    } catch (error) {
      toast.error('Failed to assign recruiter');
      console.error('Error assigning recruiter:', error);
    } finally {
      setIsAssigningRecruiter(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!candidate) return;

    try {
      const response = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const updatedCandidate = await response.json();
      setCandidate(updatedCandidate);
      toast.success('Status updated successfully');
      fetchTransitionHistory();
    } catch (error) {
      toast.error('Failed to update status');
      console.error('Error updating status:', error);
    }
  };

  const renderField = (label: string, value?: string | number | null, icon?: React.ElementType, isLink?: boolean, linkHref?: string, linkTarget?: string) => {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    
    const IconComponent = icon;
    const content = isLink && linkHref ? (
      <a href={linkHref} target={linkTarget || "_blank"} rel="noopener noreferrer" className="text-primary hover:underline break-all">
        {String(value)} <ExternalLink className="inline h-3 w-3 ml-1 opacity-70"/>
      </a>
    ) : (
      <span className="text-foreground break-words">{String(value)}</span>
    );
    
    return (
      <div className="flex items-start text-sm py-1.5">
        {IconComponent && <IconComponent className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground shrink-0" />}
        <span className="font-medium text-muted-foreground mr-1 w-32 shrink-0">{label}:</span>
        {content}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Loading Candidate Details...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading candidate information...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Error Loading Candidate</DialogTitle>
          </DialogHeader>
          <div className="text-destructive p-4 border border-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!candidate) {
    return null;
  }

  const parsedDetails = candidate.parsedData as CandidateDetails | null;
  const personalInfo = (parsedDetails as any)?.candidate_info?.personal_info || parsedDetails?.personal_info;
  const education = parsedDetails?.education || [];
  const experience = parsedDetails?.experience || [];
  const skills = parsedDetails?.skills || [];
  const jobSuitable = parsedDetails?.job_suitable || [];
  const jobMatches = parsedDetails?.job_matches || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="text-2xl font-bold">Candidate Details</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-10 border-t bg-card overflow-hidden">
            {/* LEFT SIDEBAR: Assigned Recruiter + Stage Pipeline (20%) */}
            <div className="lg:col-span-2 bg-card sticky top-6 p-6">
              {candidate && (
                <div className="mb-6">
                  <div className="border rounded-lg p-4 bg-background">
                    <Label className="mb-1 block text-md font-semibold">Assigned Recruiter</Label>
                    {recruiters.length > 0 ? (
                      <div className="relative">
                        <Select
                          value={candidate.recruiterId || "___UNASSIGN___"}
                          onValueChange={value => handleAssignRecruiter(value === "___UNASSIGN___" ? null : value)}
                          disabled={isAssigningRecruiter || !candidate.id}
                        >
                          <SelectTrigger
                            className="w-full mt-2 rounded-lg px-4 py-2 text-base font-medium flex items-center gap-2 bg-background shadow-sm hover:border-primary/80 focus:ring-2 focus:ring-primary"
                            style={{ minHeight: 44 }}
                          >
                            <Users className="h-5 w-5 text-primary mr-2" />
                            <SelectValue placeholder="Assign a recruiter..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="___UNASSIGN___">Unassigned</SelectItem>
                            {recruiters.map(r => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(!candidate.id) && (
                          <div className="absolute left-0 mt-1 text-xs text-muted-foreground">
                            Candidate data is still loading. Please wait...
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No recruiters available to assign.</span>
                    )}
                  </div>
                </div>
              )}
              {stages.length > 0 && candidate && (
                <div className="max-w-[14rem] w-full">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold flex items-center mb-3">
                      <Users className="mr-2 h-5 w-5 text-primary" />
                      Recruitment Stage
                    </h3>
                  </div>
                  <StagePipeline
                    stages={stages}
                    transitionHistory={transitionHistory}
                    currentStatus={candidate.status}
                    onStageClick={(stageName) => handleUpdateStatus(stageName)}
                    editableNotes={true}
                    onNoteEdit={async (transitionId, newNote) => {
                      await fetch(`/api/transitions/${transitionId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notes: newNote }),
                      });
                      await fetchTransitionHistory();
                    }}
                  />
                </div>
              )}
            </div>

            {/* MAIN CONTENT (50%) with Tabs */}
            <div className="lg:col-span-5 space-y-8 border-r border-l border-border p-8">
              {/* Candidate Header */}
              {candidate && (
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <Avatar className="w-20 h-20 text-3xl relative group">
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
                {jobMatches.length > 0 && (
                  <div className="bg-muted rounded p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Zap className="mr-2 h-5 w-5 text-yellow-500" />
                      AI Job Matches
                    </h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Job Title</TableHead>
                            <TableHead>Fit Score</TableHead>
                            <TableHead>Match Reasons</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {jobMatches.slice(0, 5).map((match, index) => (
                            <TableRow key={index} className="hover:bg-muted/50">
                              <TableCell className="font-medium">{match.job_title || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={getScoreColor(match.fit_score)}>
                                  {formatScoreWithGrade(match.fit_score)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {match.match_reasons && match.match_reasons.length > 0 
                                  ? match.match_reasons.slice(0, 2).join(', ') + (match.match_reasons.length > 2 ? '...' : '')
                                  : 'N/A'
                                }
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Tabs for main content */}
                <UITabs defaultValue="personal" className="w-full">
                  <UITabsList className="grid w-full grid-cols-4">
                    <UITabsTrigger value="personal">Personal</UITabsTrigger>
                    <UITabsTrigger value="education">Education</UITabsTrigger>
                    <UITabsTrigger value="experience">Experience</UITabsTrigger>
                    <UITabsTrigger value="attachments">Files</UITabsTrigger>
                  </UITabsList>

                  {/* Personal Information Tab */}
                  <UITabsContent value="personal" className="space-y-6">
                    {/* Core Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-lg">
                          <Info className="mr-2 h-5 w-5 text-primary" />
                          Core Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {renderField("Email", candidate.email, Mail, true, `mailto:${candidate.email}`)}
                        {renderField("Phone", candidate.phone, Phone, true, `tel:${candidate.phone}`)}
                        {renderField("Applied for", candidate.position?.title || 'N/A - General Application', Briefcase)}
                        {candidate.fitScore !== undefined && renderField("Fit Score", formatScoreWithGrade(candidate.fitScore), Percent)}
                        {candidate.applicationDate && renderField("Application Date", format(parseISO(candidate.applicationDate), "PPP"), CalendarDays)}
                        {renderField("CV Language", parsedDetails?.cv_language, Tag)}
                        {renderField("Location", personalInfo?.location, MapPin)}
                      </CardContent>
                    </Card>

                    {/* Personal Information */}
                    {personalInfo && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-lg">
                            <UserCircle className="mr-2 h-5 w-5 text-primary" />
                            Personal Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {renderField("First Name", personalInfo.firstname)}
                          {renderField("Last Name", personalInfo.lastname)}
                          {renderField("Title", personalInfo.title_honorific)}
                          {renderField("Nickname", personalInfo.nickname)}
                          {renderField("Location", personalInfo.location, MapPin)}
                          {personalInfo.introduction_aboutme && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-muted-foreground mb-2">About Me:</h4>
                              <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-md">
                                {personalInfo.introduction_aboutme}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Skills */}
                    {skills.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-lg">
                            <HardDrive className="mr-2 h-5 w-5 text-primary" />
                            Skills
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {skills.map((skill, index) => (
                              <Badge key={index} variant="secondary">
                                {skill.skill_string || skill.segment_skill || 'Unknown Skill'}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Job Suitability */}
                    {jobSuitable.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-lg">
                            <Star className="mr-2 h-5 w-5 text-primary" />
                            Job Suitability
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {jobSuitable.map((job, index) => (
                              <div key={index} className="border rounded-lg p-4">
                                <div className="space-y-1 text-sm">
                                  {job.suitable_career && <p><strong>Career:</strong> {job.suitable_career}</p>}
                                  {job.suitable_job_position && <p><strong>Position:</strong> {job.suitable_job_position}</p>}
                                  {job.suitable_job_level && <p><strong>Level:</strong> {job.suitable_job_level}</p>}
                                  {job.suitable_salary_bath_month && <p><strong>Expected Salary:</strong> {job.suitable_salary_bath_month}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </UITabsContent>

                  {/* Education Tab */}
                  <UITabsContent value="education" className="space-y-6">
                    {education.length > 0 ? (
                      <div className="space-y-4">
                        {education.map((edu, index) => (
                          <Card key={index}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center text-lg">
                                  <GraduationCap className="mr-2 h-5 w-5 text-primary" />
                                  {edu.university || 'Unknown University'}
                                </CardTitle>
                                {edu.GPA && (
                                  <Badge variant="outline">GPA: {edu.GPA}</Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {edu.major && <p><strong>Major:</strong> {edu.major}</p>}
                              {edu.field && <p><strong>Field:</strong> {edu.field}</p>}
                              {edu.period && <p><strong>Period:</strong> {edu.period}</p>}
                              {edu.duration && <p><strong>Duration:</strong> {edu.duration}</p>}
                              {edu.campus && <p><strong>Campus:</strong> {edu.campus}</p>}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="text-center py-8">
                          <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No education information available.</p>
                        </CardContent>
                      </Card>
                    )}
                  </UITabsContent>

                  {/* Experience Tab */}
                  <UITabsContent value="experience" className="space-y-6">
                    {experience.length > 0 ? (
                      <div className="space-y-4">
                        {experience.map((exp, index) => (
                          <Card key={index}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center text-lg">
                                  <Briefcase className="mr-2 h-5 w-5 text-primary" />
                                  {exp.company || 'Unknown Company'}
                                </CardTitle>
                                {exp.is_current_position && (
                                  <Badge variant="default">Current</Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p><strong>Position:</strong> {exp.position || 'N/A'}</p>
                              {exp.period && <p><strong>Period:</strong> {exp.period}</p>}
                              {exp.duration && <p><strong>Duration:</strong> {exp.duration}</p>}
                              {exp.postition_level && <p><strong>Level:</strong> {exp.postition_level}</p>}
                              {exp.description && (
                                <div className="mt-4">
                                  <p><strong>Description:</strong></p>
                                  <p className="text-muted-foreground whitespace-pre-wrap">{exp.description}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="text-center py-8">
                          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No work experience information available.</p>
                        </CardContent>
                      </Card>
                    )}
                  </UITabsContent>

                  {/* Attachments Tab */}
                  <UITabsContent value="attachments" className="space-y-6">
                    <Tabs defaultValue="comments" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
                        <TabsTrigger value="resumes">Resumes ({resumes.length})</TabsTrigger>
                      </TabsList>
                      <TabsContent value="comments" className="mt-4">
                        <CandidateCommentsSection 
                          candidateId={candidate.id}
                          comments={comments}
                          isEditing={true}
                          onCommentsChange={() => fetchAttachments()}
                        />
                      </TabsContent>
                      <TabsContent value="resumes" className="mt-4">
                        <CandidateResumesSection 
                          candidateId={candidate.id}
                          resumes={resumes}
                          isEditing={true}
                          onResumesChange={() => fetchAttachments()}
                        />
                      </TabsContent>
                    </Tabs>
                  </UITabsContent>
                </UITabs>
              </div>
            </div>

            {/* RIGHT SIDEBAR: Additional Info (30%) */}
            <div className="lg:col-span-3 bg-muted/30 p-6">
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Zap className="mr-2 h-5 w-5 text-primary" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href={`/candidates/${candidate.id}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Full Profile
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Mail className="mr-2 h-4 w-4" />
                      Send Email
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Add Comment
                    </Button>
                  </CardContent>
                </Card>

                {/* Status History */}
                {transitionHistory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Activity className="mr-2 h-5 w-5 text-primary" />
                        Status History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {transitionHistory.slice(0, 5).map((transition, index) => (
                          <div key={transition.id} className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{transition.stage}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(transition.date), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                              {transition.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{transition.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 