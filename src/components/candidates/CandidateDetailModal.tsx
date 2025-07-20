"use client";

import { useEffect, useState } from "react";
import type { Candidate, TransitionRecord, EducationEntry, ExperienceEntry, SkillEntry, JobSuitableEntry, PersonalInfo, AutomationJobMatch, UserProfile, Position, positionLevel, RecruitmentStage } from '@/lib/types';
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
import { ArrowLeft, Briefcase, Building, CalendarDays, DollarSign, Edit, GraduationCap, HardDrive, Info, LinkIcon, ListChecks, Loader2, Mail, MapPin, MessageSquare, Percent, Phone, ServerCrash, ShieldAlert, Star, Tag, UploadCloud, User, UserCircle, UserCog, Users, Zap, ExternalLink, Edit3, Save, X, PlusCircle, Trash2, Lightbulb, ChevronDown, ChevronRight, ChevronUp, ChevronLeft, Activity, Clock, BarChart3, Eye, Download } from 'lucide-react';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor } from "@/lib/scoreUtils";
import { formatCandidateName, formatCandidateNameWithLang } from "@/lib/candidateUtils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'react-hot-toast';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecruitmentPipelineCard } from '@/components/candidates/RecruitmentPipelineCard';
import { PositionSelectDropdown } from '@/components/candidates/PositionSelectDropdown';
import { differenceInMonths, parse, isValid } from 'date-fns';
import RecruiterAssignmentDropdown from '@/components/candidates/RecruiterAssignmentDropdown';
import CandidateCommentsSection from './CandidateCommentsSection';
import CandidateResumesSection from './CandidateResumesSection';

interface CandidateDetailModalProps {
  candidateId: string | null;
  open: boolean;
  onClose: () => void;
}

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

// Helper function to calculate duration from period string
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

// Type guard for fit score
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

export default function CandidateDetailModal({ candidateId, open, onClose }: CandidateDetailModalProps) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [transitionHistory, setTransitionHistory] = useState<TransitionRecord[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [allDbPositions, setAllDbPositions] = useState<Position[]>([]);
  const [availableStages, setAvailableStages] = useState<RecruitmentStage[]>([]);
  const [recruiters, setRecruiters] = useState<UserProfile[]>([]);
  const [isAssigningRecruiter, setIsAssigningRecruiter] = useState(false);
  const [isAssigningRecruiterLoading, setIsAssigningRecruiterLoading] = useState(false);
  const [isTransitionsModalOpen, setIsTransitionsModalOpen] = useState(false);
  const [preselectedStage, setPreselectedStage] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isJobMatchModalOpen, setIsJobMatchModalOpen] = useState(false);
  const [selectedJobMatch, setSelectedJobMatch] = useState<any>(null);

  // Collapsible section states
  const [jobAppliedOpen, setJobAppliedOpen] = useState(true);
  const [jobMatchesOpen, setJobMatchesOpen] = useState(true);
  const [jobMatchesScrollPosition, setJobMatchesScrollPosition] = useState(0);
  const [infoOpen, setInfoOpen] = useState(true);
  const [contactOpen, setContactOpen] = useState(true);
  const [educationOpen, setEducationOpen] = useState(true);
  const [experienceOpen, setExperienceOpen] = useState(true);
  const [skillsOpen, setSkillsOpen] = useState(true);
  const [jobSuitableOpen, setJobSuitableOpen] = useState(true);

  const { data: session } = useSession();

  // Fetch candidate details
  const fetchCandidateDetails = async () => {
    if (!candidateId) return;
    
    setLoading(true);
    setFetchError(null);
    
    try {
      const response = await fetch(`/api/candidates/${candidateId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch candidate: ${response.statusText}`);
      }
      const data = await response.json();
      setCandidate(data);
    } catch (error) {
      console.error('Error fetching candidate:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to fetch candidate');
    } finally {
      setLoading(false);
    }
  };

  // Fetch transition history
  const fetchTransitionHistory = async () => {
    if (!candidateId) return;
    
    try {
      const response = await fetch(`/api/transitions?candidateId=${candidateId}`);
      if (response.ok) {
        const data = await response.json();
        setTransitionHistory(data);
      }
    } catch (error) {
      console.error('Error fetching transition history:', error);
    }
  };

  // Fetch comments
  const fetchComments = async () => {
    if (!candidateId) return;
    
    try {
      const response = await fetch(`/api/candidates/${candidateId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  // Fetch resumes/attachments
  const fetchResumes = async () => {
    if (!candidateId) return;
    
    try {
      const response = await fetch(`/api/candidates/${candidateId}/resumes`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(data);
      }
    } catch (error) {
      console.error('Error fetching resumes:', error);
    }
  };

  // Fetch metadata
  const fetchMetadata = async () => {
    try {
      const [positionsRes, stagesRes, recruitersRes] = await Promise.all([
        fetch('/api/positions'),
        fetch('/api/settings/recruitment-stages'),
        fetch('/api/users?role=Recruiter')
      ]);
      
      if (positionsRes.ok) {
        const positionsData = await positionsRes.json();
        setAllDbPositions(Array.isArray(positionsData.data) ? positionsData.data : []);
      }
      
      if (stagesRes.ok) {
        const stagesData = await stagesRes.json();
        setAvailableStages(Array.isArray(stagesData) ? stagesData : []);
      }
      
      if (recruitersRes.ok) {
        const recruitersData = await recruitersRes.json();
        setRecruiters(Array.isArray(recruitersData) ? recruitersData : []);
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  // Fetch all data when modal opens
  useEffect(() => {
    if (open && candidateId) {
      fetchCandidateDetails();
      fetchTransitionHistory();
      fetchComments();
      fetchResumes();
      fetchMetadata();
    }
  }, [open, candidateId]);

  // Handle comments change
  const handleCommentsChange = async () => {
    await fetchComments();
  };

  // Handle resumes change
  const handleResumesChange = () => {
    fetchResumes();
  };

  // Handle recruiter assignment
  const handleAssignRecruiter = async (newRecruiterId: string | null) => {
    if (!candidate) return;
    
    setIsAssigningRecruiterLoading(true);
    try {
      const response = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recruiterId: newRecruiterId })
      });
      
      if (response.ok) {
        await fetchCandidateDetails();
        toast.success(newRecruiterId ? 'Recruiter assigned successfully' : 'Recruiter unassigned successfully');
      } else {
        throw new Error('Failed to assign recruiter');
      }
    } catch (error) {
      console.error('Error assigning recruiter:', error);
      toast.error('Failed to assign recruiter');
    } finally {
      setIsAssigningRecruiterLoading(false);
    }
  };

  // Handle job match click
  const handleJobMatchClick = (jobMatch: any) => {
    setSelectedJobMatch(jobMatch);
    setIsJobMatchModalOpen(true);
  };

  // Open manage transitions modal
  const openManageTransitionsModal = (stageName?: string) => {
    setPreselectedStage(stageName || null);
    setIsTransitionsModalOpen(true);
  };

  // Helper functions for data extraction
  function getEducation(candidate: Candidate | null) {
    if (!candidate) return [];
    
    let educationArray: any[] = [];
    
    if (Array.isArray(candidate.educationData) && candidate.educationData.length > 0) {
      educationArray = candidate.educationData;
    } else {
      const parsedData = candidate.parsedData;
      if (parsedData && typeof parsedData === 'object') {
        if ('candidate_info' in parsedData && parsedData.candidate_info && typeof parsedData.candidate_info === 'object') {
          const education = (parsedData.candidate_info as any).education;
          if (Array.isArray(education) && education.length > 0) {
            educationArray = education;
          }
        }
        if ('education' in parsedData) {
          const education = (parsedData as any).education;
          if (Array.isArray(education) && education.length > 0) {
            educationArray = education;
          }
        }
      }
    }
    
    // Sort education by start date (most recent first)
    const safeEducationArray = Array.isArray(educationArray) ? educationArray : [];
    return safeEducationArray.sort((a, b) => {
      const getStartYear = (edu: any) => {
        if (!edu.period) return 0;
        const match = edu.period.match(/([A-Za-z]+) (\d{4})/);
        return match ? parseInt(match[2], 10) : 0;
      };
      
      const getStartMonth = (edu: any) => {
        if (!edu.period) return 0;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const match = edu.period.match(/([A-Za-z]+) (\d{4})/);
        return match ? months.indexOf(match[1]) : 0;
      };
      
      const yearA = getStartYear(a);
      const yearB = getStartYear(b);
      
      if (yearA !== yearB) return yearB - yearA;
      
      const monthA = getStartMonth(a);
      const monthB = getStartMonth(b);
      
      return monthB - monthA;
    });
  }

  function getExperience(candidate: Candidate | null) {
    if (!candidate) return [];
    
    let experienceArray: any[] = [];
    
    if (Array.isArray(candidate.experienceData) && candidate.experienceData.length > 0) {
      experienceArray = candidate.experienceData;
    } else {
      const parsedData = candidate.parsedData;
      if (parsedData && typeof parsedData === 'object') {
        if ('candidate_info' in parsedData && parsedData.candidate_info && typeof parsedData.candidate_info === 'object') {
          const experience = (parsedData.candidate_info as any).experience;
          if (Array.isArray(experience) && experience.length > 0) {
            experienceArray = experience;
          }
        }
        if ('experience' in parsedData) {
          const experience = (parsedData as any).experience;
          if (Array.isArray(experience) && experience.length > 0) {
            experienceArray = experience;
          }
        }
      }
    }
    
    // Sort experience by start date (most recent first)
    const safeExperienceArray = Array.isArray(experienceArray) ? experienceArray : [];
    return safeExperienceArray.sort((a, b) => {
      const getStartYear = (exp: any) => {
        if (!exp.period) return 0;
        const match = exp.period.match(/([A-Za-z]+) (\d{4})/);
        return match ? parseInt(match[2], 10) : 0;
      };
      
      const getStartMonth = (exp: any) => {
        if (!exp.period) return 0;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const match = exp.period.match(/([A-Za-z]+) (\d{4})/);
        return match ? months.indexOf(match[1]) : 0;
      };
      
      const yearA = getStartYear(a);
      const yearB = getStartYear(b);
      
      if (yearA !== yearB) return yearB - yearA;
      
      const monthA = getStartMonth(a);
      const monthB = getStartMonth(b);
      
      return monthB - monthA;
    });
  }

  // Helper function to extract parsed data properties
  const getParsedDataProperty = (propertyName: string) => {
    if (!candidate) return undefined;
    
    const parsedData = candidate.parsedData;
    if (!parsedData || typeof parsedData !== 'object') return undefined;
    
    if ('candidate_info' in parsedData && parsedData.candidate_info && typeof parsedData.candidate_info === 'object') {
      return (parsedData.candidate_info as any)[propertyName];
    }
    
    if (propertyName in parsedData) {
      return (parsedData as any)[propertyName];
    }
    
    return undefined;
  };

  // Render field helper
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
        <span className="font-medium text-muted-foreground min-w-[120px] shrink-0">{label}:</span>
        <span className="flex-1">{content}</span>
      </div>
    );
  };

  // Get grade from score
  const getGradeFromScore = (score: number): string => {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C-';
    return 'D';
  };

  // Calculate total experience duration
  const calculateTotalExperienceDuration = (experienceArray: any[]) => {
    let totalMonths = 0;
    
    const safeExperienceArray = Array.isArray(experienceArray) ? experienceArray : [];
    safeExperienceArray.forEach(exp => {
      if (exp.period) {
        const duration = calculateDuration(exp.period);
        const match = duration.match(/(\d+) year[s]?/);
        const years = match ? parseInt(match[1], 10) : 0;
        const monthMatch = duration.match(/(\d+) month[s]?/);
        const months = monthMatch ? parseInt(monthMatch[1], 10) : 0;
        
        totalMonths += years * 12;
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
  }; 

  // Extract data for display
  const personalInfo = getParsedDataProperty('personal_info');
  const contactInfo = getParsedDataProperty('contact_info');
  const skills = Array.isArray(getParsedDataProperty('skills')) ? getParsedDataProperty('skills') : [];
  const jobSuitable = Array.isArray(getParsedDataProperty('job_suitable')) ? getParsedDataProperty('job_suitable') : [];
  const candidateJobMatches = Array.isArray(getParsedDataProperty('job_matches')) ? getParsedDataProperty('job_matches') : [];

  // Job applied data
  const appliedJobId = candidate?.positionId;
  const appliedFitScore = candidate?.fitScore;
  const appliedJustification = candidate?.assignmentJustification;

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-background rounded-lg shadow-2xl border border-border p-8 flex flex-col items-center space-y-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading candidate details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-background rounded-lg shadow-2xl border border-border p-8 flex flex-col items-center space-y-4 text-center">
          <ServerCrash className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Error Loading Candidate</h2>
          <p className="text-muted-foreground mb-6">{fetchError}</p>
          <Button onClick={fetchCandidateDetails}>Try Again</Button>
        </div>
      </div>
    );
  }

  // No candidate state
  if (!candidate) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-background rounded-lg shadow-2xl border border-border p-8 flex flex-col items-center space-y-4 text-center">
          <UserCircle className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Candidate Not Found</h2>
          <p className="text-muted-foreground">The requested candidate could not be found.</p>
          <Button onClick={onClose} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="w-full max-w-7xl h-full max-h-[95vh] flex flex-col bg-background rounded-lg shadow-2xl border border-border overflow-hidden">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-lg font-semibold">Candidate Details</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {/* Header - 2 Columns */}
            <div className="bg-card border-b border-border p-6 sticky top-0 z-50">
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                {/* Column 1: Candidate Header (7 cols) */}
                <div className="lg:col-span-7">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {(() => {
                        const nameInfo = formatCandidateNameWithLang(candidate);
                        return (
                          <>
                            <Avatar className="w-20 h-20 text-3xl relative group">
                              {candidate.avatarUrl ? (
                                <AvatarImage src={candidate.avatarUrl} alt={nameInfo.name} />
                              ) : (
                                <AvatarFallback>{nameInfo.name?.[0] || '?'}</AvatarFallback>
                              )}
                            </Avatar>
                          </>
                        );
                      })()}
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
                
                {/* Column 2: Action Buttons (3 cols) */}
                <div className="lg:col-span-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => openManageTransitionsModal()}
                      disabled={availableStages.length === 0}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Transitions
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-10 border-t bg-card overflow-hidden">
              {/* LEFT SIDEBAR: Recruitment Pipeline (20%) */}
              <div className="lg:col-span-2 bg-card sticky top-6 p-6 space-y-6">
                {/* Recruitment Pipeline */}
                {availableStages.length > 0 && candidate && candidateId && (
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
              </div>
              
              {/* MAIN CONTENT (50%) with Sections */}
              <div className="lg:col-span-5 space-y-8 border-r border-l border-border p-8">
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
                              const position = Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === appliedJobId) : null;
                              
                              if (position) {
                                const appliedJobData = {
                                  jobId: appliedJobId,
                                  jobTitle: position.title,
                                  fitScore: appliedFitScore || 0,
                                  matchReasons: appliedJustification 
                                    ? appliedJustification.split('\n').map((sentence: string) => sentence.trim()).filter(Boolean)
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
                                  {Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === appliedJobId)?.title || 'Unknown Position' : 'Unknown Position'}
                                </h4>
                                {appliedFitScore !== null && appliedFitScore !== undefined && (
                                  <div className="text-2xl font-bold text-primary flex items-center gap-2">
                                    <span>{appliedFitScore}%</span>
                                    <span className="text-lg font-bold text-primary">({getGradeFromScore(appliedFitScore)})</span>
                                  </div>
                                )}
                               </div>
                               
                              {appliedJustification && (
                                 <div className="mt-3">
                                  <h5 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                    <Info className="h-3 w-3" />
                                    Justification:
                                  </h5>
                                  <div className="space-y-2">
                                    {appliedJustification.split('\n').map((sentence: string, index: number) => {
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

                        {/* View Section - Job Matches Cards */}
                        {candidateJobMatches && candidateJobMatches.length > 0 && (
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
                                    <div 
                                      key={`jobmatch-${index}-${match.jobTitle || index}`} 
                                      className={`flex-shrink-0 w-70 p-3 border rounded-lg ${(match as any).is_applied_job ? 'bg-primary/10 border-primary/30' : 'bg-card border-border'} hover:shadow-md transition-shadow cursor-pointer`}
                                      onClick={() => handleJobMatchClick(match)}
                                    >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    {(match as any).is_applied_job && (
                                                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20 shrink-0">Applied</Badge>
                                                    )}
                                          <h4 className="font-semibold text-foreground text-sm truncate">
                                            {position?.title || match.jobTitle || 'Unknown Position'}
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
                           
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <ListChecks className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <p>No job matches found.</p>
                        </div>
                    )}
                              </div>
                            )}
                  </section>

                {/* Personal Information Section */}
                <section className="mb-4 border border-border rounded-lg p-4 bg-card">
                  <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setInfoOpen(o => !o)}>
                    <UserCircle className="mr-2 h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Personal Information</h2>
                    {infoOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
                  </button>
                  {infoOpen && (
                    <div className="space-y-4 transition-all duration-200">
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
                      <div className="space-y-4">
                        {renderField("Email", candidate?.email, Mail)}
                        {renderField("Phone", candidate?.phone, Phone)}
                      </div>
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
                      <div className="relative">
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
                                <div className="flex items-start space-x-4">
                                  <div className="flex-shrink-0 w-28 text-right">
                                    <div className="text-xs text-muted-foreground font-medium">
                                      <div className="text-muted-foreground">Education</div>
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0 relative flex flex-col items-center" style={{ width: '2rem', minHeight: '2.5rem' }}>
                                    <div className="w-6 h-6 rounded-full bg-card flex items-center justify-center z-10 border-2 border-border">
                                      <GraduationCap className="w-3 h-3 text-foreground" />
                                    </div>
                                  </div>
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
                          }
                          
                          return (
                            <div key={`edu-${index}-${edu.university || edu.major || index}`} className="relative mb-8">
                              <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0 w-28 text-right">
                                  <div className="text-xs text-muted-foreground font-medium">
                                    <div className="text-muted-foreground">Education</div>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 relative flex flex-col items-center" style={{ width: '2rem', minHeight: '2.5rem' }}>
                                  <div className="w-6 h-6 rounded-full bg-card flex items-center justify-center z-10 border-2 border-border">
                                    <GraduationCap className="w-3 h-3 text-foreground" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0 pb-0">
                                  <div className="bg-muted/50 rounded-lg p-4">
                                    {renderField("University", edu.university)}
                                    {renderField("Major", edu.major)}
                                    {renderField("Field", edu.field)}
                                    {renderField("Campus", edu.campus)}
                                    {renderField("Period", edu.period)}
                                    {renderField("Duration", edu.duration)}
                                    {renderField("GPA", edu.GPA)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>

                {/* Experience Section */}
                <section className="mb-4 border border-border rounded-lg p-4 bg-card">
                  <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setExperienceOpen(o => !o)}>
                    <Briefcase className="mr-2 h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Experience</h2>
                    {experienceOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
                  </button>
                  {experienceOpen && (
                    <div className="space-y-4 transition-all duration-200">
                      <div className="relative">
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
                                <div className="flex items-start space-x-4">
                                  <div className="flex-shrink-0 w-28 text-right">
                                    <div className="text-xs text-muted-foreground font-medium">
                                      <div className="text-muted-foreground">Experience</div>
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0 relative flex flex-col items-center" style={{ width: '2rem', minHeight: '2.5rem' }}>
                                    <div className="w-6 h-6 rounded-full bg-card flex items-center justify-center z-10 border-2 border-border">
                                      <Briefcase className="w-3 h-3 text-foreground" />
                                    </div>
                                  </div>
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
                          }
                          
                          return (
                            <div key={`exp-${index}-${exp.company || exp.position || index}`} className="relative mb-8">
                              <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0 w-28 text-right">
                                  <div className="text-xs text-muted-foreground font-medium">
                                    <div className="text-muted-foreground">Experience</div>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 relative flex flex-col items-center" style={{ width: '2rem', minHeight: '2.5rem' }}>
                                  <div className="w-6 h-6 rounded-full bg-card flex items-center justify-center z-10 border-2 border-border">
                                    <Briefcase className="w-3 h-3 text-foreground" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0 pb-0">
                                  <div className="bg-muted/50 rounded-lg p-4">
                                    {renderField("Company", exp.company)}
                                    {renderField("Position", exp.position)}
                                    {renderField("Description", exp.description)}
                                    {renderField("Period", exp.period)}
                                    {renderField("Duration", exp.duration)}
                                    {renderField("Level", exp.positionLevel)}
                                    {exp.is_current_position && (
                                      <div className="flex items-center text-sm py-1">
                                        <span className="font-medium text-muted-foreground min-w-[120px] shrink-0">Current:</span>
                                        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Current Position</Badge>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
                      {skills && skills.length > 0 ? (
                        <ul className="space-y-4">
                          {skills.map((skillEntry: any, index: number) => {
                            if (typeof skillEntry === 'string') {
                              return (
                                <li key={`skill-${index}-${skillEntry}`} className="p-3 border rounded-md bg-muted">
                                  {renderField("Skill", skillEntry)}
                                </li>
                              );
                            }
                            
                            return (
                              <li key={`skill-${index}-${skillEntry.segment_skill || index}`} className="p-3 border rounded-md bg-muted">
                                {renderField("Segment", skillEntry.segment_skill)}
                                {skillEntry.skill && skillEntry.skill.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mt-1.5">Skills:</h4>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {Array.isArray(skillEntry.skill) ? skillEntry.skill.map((s: string, i: number) => <Badge key={`${index}-${i}-${s}`} variant="secondary">{s}</Badge>) : null}
                                    </div>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : <div className="text-sm text-muted-foreground text-center py-4">No skill details provided.</div>}
                    </div>
                  )}
                </section>

                {/* Job Suitability Section */}
                <section className="mb-4 border border-border rounded-lg p-4 bg-card">
                  <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setJobSuitableOpen(o => !o)}>
                    <UserCog className="mr-2 h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Job Suitability</h2>
                    {jobSuitableOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
                  </button>
                  {jobSuitableOpen && (
                    <div className="space-y-4 transition-all duration-200">
                      {(jobSuitable && jobSuitable.length > 0) ? (
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
                      ) : <div className="text-sm text-muted-foreground text-center py-4">No job suitability details provided.</div>}
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
                        disabled={isAssigningRecruiterLoading}
                      >
                        <SelectTrigger className="min-w-[120px] border-none bg-transparent shadow-none">
                          <SelectValue placeholder="Assign..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassign">Unassign</SelectItem>
                          {Array.isArray(recruiters) ? recruiters.map((recruiter) => (
                                                          <SelectItem key={recruiter.id} value={recruiter.id}>
                                {recruiter.name}
                              </SelectItem>
                            )) : null}
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
                    {candidateId && (
                      <CandidateCommentsSection 
                        candidateId={candidateId} 
                        comments={comments} 
                        isEditing={false} 
                        onCommentsChange={handleCommentsChange} 
                      />
                    )}
                  </div>
                </div>
                
                {/* Attachments Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <UploadCloud className="mr-2 h-5 w-5 text-primary" />
                    Attachments
                  </h3>
                  <div className="bg-muted rounded-lg p-4">
                    {candidateId && (
                      <CandidateResumesSection 
                        candidateId={candidateId} 
                        resumes={Array.isArray(attachments) ? attachments : []} 
                        isEditing={false} 
                        onResumesChange={handleResumesChange} 
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}