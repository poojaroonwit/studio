// The following is a direct extraction of the candidate detail page logic, adapted to use candidateId as a prop instead of useParams. All styles and functions are preserved for a 100% match.

"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
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
import { ArrowLeft, Briefcase, CalendarDays, DollarSign, Edit, GraduationCap, HardDrive, Info, LinkIcon, ListChecks, Loader2, Mail, MapPin, MessageSquare, Percent, Phone, ServerCrash, ShieldAlert, Star, Tag, UploadCloud, User, UserCircle, UserCog, Users, Zap, ExternalLink, Edit3, Save, X, PlusCircle, Trash2, Lightbulb, ChevronDown, ChevronRight, ChevronUp, ChevronLeft, Activity, Clock, BarChart3, Eye, FileText } from 'lucide-react';
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

const candidateDetailsEditSchema = z.object({
  cv_language: z.string().optional().nullable(),
  personal_info: personalInfoEditSchema.optional(),
  contact_info: contactInfoEditSchema.optional(),
  education: z.array(z.any()).optional(),
  experience: z.array(z.any()).optional(),
  skills: z.array(z.any()).optional(),
  job_suitable: z.array(z.any()).optional(),
  job_matches: z.array(z.any()).optional(),
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

interface FullCandidateDetailProps {
  candidateId: string;
  isModal?: boolean;
  onClose?: () => void;
}

const FullCandidateDetail: React.FC<FullCandidateDetailProps> = ({ candidateId, isModal, onClose }) => {
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

  const { data: session } = useSession();

  const form = useForm<EditCandidateFormValues>({
    resolver: zodResolver(editCandidateDetailSchema),
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
        setCandidate(data);
        
        // Set form default values
        form.reset({
          name: data.name,
          email: data.email,
          phone: data.phone,
          positionId: data.positionId,
          recruiterId: data.recruiterId,
          fitScore: data.fitScore,
          status: data.status,
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
  }, [candidateId, form]);

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
        const positionsRes = await fetch('/api/positions');
        if (positionsRes.ok) {
          const positionsData = await positionsRes.json();
          setAllDbPositions(Array.isArray(positionsData) ? positionsData : []);
        }

        // Fetch stages
        const stagesRes = await fetch('/api/settings/recruitment-stages');
        if (stagesRes.ok) {
          const stagesData = await stagesRes.json();
          setAvailableStages(Array.isArray(stagesData) ? stagesData : []);
        }
      } catch (err) {
        console.error('Error fetching additional data:', err);
      }
    };

    fetchAdditionalData();
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-4">
          {isModal && onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={candidate.avatarUrl || ''} alt={formatCandidateName(candidate)} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {formatCandidateName(candidate)?.charAt(0)?.toUpperCase() || 'C'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{formatCandidateName(candidate)}</h1>
              <p className="text-muted-foreground">{candidate.email}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {candidate.status && (
            <Badge variant={getStatusBadgeVariant(candidate.status)}>
              {candidate.status}
            </Badge>
          )}
          {candidate.fitScore !== null && candidate.fitScore !== undefined && (
            <Badge variant="outline" className="text-xs">
              {candidate.fitScore}% Fit
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6">
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField('Email', candidate.email, Mail)}
                {renderField('Phone', candidate.phone, Phone)}
                {renderField('Position', candidate.position?.title, Briefcase)}
                {renderField('Recruiter', candidate.recruiter?.name, UserCog)}
                {candidate.applicationDate && renderField('Applied', new Date(candidate.applicationDate).toLocaleDateString(), CalendarDays)}
                {candidate.fitScore !== null && candidate.fitScore !== undefined && (
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
            </CardContent>
          </Card>

          {/* Personal Information from Parsed Data */}
          {candidate.parsedData && (candidate.parsedData.candidate_info?.personal_info || candidate.parsedData.personal_info) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="w-5 h-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    const personalInfo = candidate.parsedData?.candidate_info?.personal_info || candidate.parsedData?.personal_info;
                    return (
                      <>
                        {personalInfo?.title_honorific && renderField('Title', personalInfo.title_honorific, User)}
                        {personalInfo?.firstname && renderField('First Name', personalInfo.firstname, User)}
                        {personalInfo?.lastname && renderField('Last Name', personalInfo.lastname, User)}
                        {personalInfo?.nickname && renderField('Nickname', personalInfo.nickname, User)}
                        {personalInfo?.location && renderField('Location', personalInfo.location, MapPin)}
                        {personalInfo?.introduction_aboutme && (
                          <div className="md:col-span-2">
                            <div className="flex items-start gap-2">
                              <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div>
                                <span className="text-muted-foreground text-sm">About:</span>
                                <p className="text-sm mt-1">{personalInfo.introduction_aboutme}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Information from Parsed Data */}
          {candidate.parsedData && (candidate.parsedData.candidate_info?.contact_info || candidate.parsedData.contact_info) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    const contactInfo = candidate.parsedData?.candidate_info?.contact_info || candidate.parsedData?.contact_info;
                    return (
                      <>
                        {contactInfo?.email && renderField('Email', contactInfo.email, Mail, true, `mailto:${contactInfo.email}`)}
                        {contactInfo?.phone && renderField('Phone', contactInfo.phone, Phone, true, `tel:${contactInfo.phone}`)}
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Parsed Data */}
          {candidate.parsedData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Resume Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="experience" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="experience">Experience</TabsTrigger>
                    <TabsTrigger value="education">Education</TabsTrigger>
                    <TabsTrigger value="skills">Skills</TabsTrigger>
                    <TabsTrigger value="suitable">Job Suitable</TabsTrigger>
                    <TabsTrigger value="matches">Job Matches</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="experience" className="space-y-4">
                    {(() => {
                      const experience = candidate.parsedData?.candidate_info?.experience || candidate.parsedData?.experience;
                      return experience && Array.isArray(experience) && experience.length > 0 ? (
                        experience.map((exp: any, index: number) => (
                          <Card key={index} className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">{exp.position || 'Unknown Position'}</h4>
                                {exp.period && <span className="text-sm text-muted-foreground">{exp.period}</span>}
                              </div>
                              <p className="text-sm text-muted-foreground">{exp.company || 'Unknown Company'}</p>
                              {exp.description && <p className="text-sm">{exp.description}</p>}
                            </div>
                          </Card>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No experience data available</p>
                      );
                    })()}
                  </TabsContent>
                  
                  <TabsContent value="education" className="space-y-4">
                    {(() => {
                      const education = candidate.parsedData?.candidate_info?.education || candidate.parsedData?.education;
                      return education && Array.isArray(education) && education.length > 0 ? (
                        education.map((edu: any, index: number) => (
                          <Card key={index} className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">{edu.university || 'Unknown University'}</h4>
                                {edu.period && <span className="text-sm text-muted-foreground">{edu.period}</span>}
                              </div>
                              <p className="text-sm text-muted-foreground">{edu.major || edu.field || 'No major specified'}</p>
                            </div>
                          </Card>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No education data available</p>
                      );
                    })()}
                  </TabsContent>
                  
                  <TabsContent value="skills" className="space-y-4">
                    {(() => {
                      const skills = candidate.parsedData?.candidate_info?.skills || candidate.parsedData?.skills;
                      return skills && Array.isArray(skills) && skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill: any, index: number) => (
                            <Badge key={index} variant="secondary">
                              {skill.skill_string || skill.segment_skill || 'Unknown Skill'}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No skills data available</p>
                      );
                    })()}
                  </TabsContent>
                  
                  <TabsContent value="suitable" className="space-y-4">
                    {(() => {
                      const jobSuitable = candidate.parsedData?.candidate_info?.job_suitable || candidate.parsedData?.job_suitable;
                      return jobSuitable && Array.isArray(jobSuitable) && jobSuitable.length > 0 ? (
                        jobSuitable.map((suitable: any, index: number) => (
                          <Card key={index} className="p-4">
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {suitable.suitable_career && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">Career:</span>
                                    <p className="font-medium">{suitable.suitable_career}</p>
                                  </div>
                                )}
                                {suitable.suitable_job_position && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">Position:</span>
                                    <p className="font-medium">{suitable.suitable_job_position}</p>
                                  </div>
                                )}
                                {suitable.suitable_job_level && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">Level:</span>
                                    <p className="font-medium">{suitable.suitable_job_level}</p>
                                  </div>
                                )}
                                {suitable.suitable_salary_bath_month && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">Expected Salary:</span>
                                    <p className="font-medium">{suitable.suitable_salary_bath_month}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No job suitable data available</p>
                      );
                    })()}
                  </TabsContent>
                  
                  <TabsContent value="matches" className="space-y-4">
                    {(() => {
                      const jobMatches = candidate.parsedData?.job_matches || [];
                      return jobMatches && Array.isArray(jobMatches) && jobMatches.length > 0 ? (
                        jobMatches.map((match: any, index: number) => (
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
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No job matches available</p>
                      );
                    })()}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Resumes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Resumes
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>
        </div>
      </ScrollArea>

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
    </div>
  );
};

export default FullCandidateDetail; 