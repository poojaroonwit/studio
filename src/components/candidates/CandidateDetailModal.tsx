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
import { ArrowLeft, Briefcase, CalendarDays, DollarSign, Edit, GraduationCap, HardDrive, Info, LinkIcon, ListChecks, Loader2, Mail, MapPin, MessageSquare, Percent, Phone, ServerCrash, ShieldAlert, Star, Tag, UploadCloud, User, UserCircle, UserCog, Users, Zap, ExternalLink, Edit3, Save, X, PlusCircle, Trash2, Lightbulb, ChevronDown, ChevronRight, ChevronUp, ChevronLeft, Activity, Clock, BarChart3, Eye, FileText, Building2, Target } from 'lucide-react';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor, getScoreGrade } from "@/lib/scoreUtils";
import { formatCandidateName } from "@/lib/candidateUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface CandidateDetailModalProps {
  candidateId: string | null;
  open: boolean;
  onClose: () => void;
}

// Helper function to extract parsed data properties
const getParsedDataProperty = (candidate: Candidate, propertyName: string) => {
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

// Helper function to get education data
const getEducation = (candidate: Candidate) => {
  if (!candidate) return [];
  
  let educationArray: any[] = [];
  
  if (Array.isArray(candidate.educationData) && candidate.educationData.length > 0) {
    educationArray = candidate.educationData;
  } else {
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
  
  return educationArray;
};

// Helper function to get experience data
const getExperience = (candidate: Candidate) => {
  if (!candidate) return [];
  
  let experienceArray: any[] = [];
  
  if (Array.isArray(candidate.experienceData) && candidate.experienceData.length > 0) {
    experienceArray = candidate.experienceData;
  } else {
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
  
  return experienceArray;
};

// Helper function to get skills data
const getSkills = (candidate: Candidate) => {
  return getParsedDataProperty(candidate, 'skills') || [];
};

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

const CandidateDetailModal = ({ candidateId, open, onClose }: CandidateDetailModalProps) => {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitionHistory, setTransitionHistory] = useState<TransitionRecord[]>([]);
  const [availableStages, setAvailableStages] = useState<RecruitmentStage[]>([]);
  const [allDbPositions, setAllDbPositions] = useState<Position[]>([]);

  const { data: session } = useSession();

  // Fetch candidate data
  useEffect(() => {
    if (!candidateId || !open) return;

    const fetchCandidate = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/candidates/${candidateId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch candidate: ${res.statusText}`);
        }
        const data = await res.json();
        setCandidate(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load candidate');
      } finally {
        setLoading(false);
      }
    };

    const fetchAdditionalData = async () => {
      try {
        const [stagesRes, positionsRes, transitionsRes] = await Promise.all([
          fetch('/api/settings/recruitment-stages'),
          fetch('/api/positions'),
          fetch(`/api/transitions?candidateId=${candidateId}`)
        ]);

        if (stagesRes.ok) {
          const stagesData = await stagesRes.json();
          setAvailableStages(Array.isArray(stagesData) ? stagesData : []);
        }

        if (positionsRes.ok) {
          const positionsData = await positionsRes.json();
          setAllDbPositions(Array.isArray(positionsData) ? positionsData : []);
        }

        if (transitionsRes.ok) {
          const transitionsData = await transitionsRes.json();
          setTransitionHistory(Array.isArray(transitionsData) ? transitionsData : (transitionsData.data || []));
        }
      } catch (error) {
        console.error('Error fetching additional data:', error);
      }
    };

    fetchCandidate();
    fetchAdditionalData();
  }, [candidateId, open]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  if (!open) return null;

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 bg-black/80 z-50" />
        <div className="fixed top-[80px] left-1/2 transform -translate-x-1/2 z-50 bg-background border border-border rounded-lg shadow-lg max-w-[95vw] max-h-[90vh] w-[1200px] h-[800px] overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
              <p className="text-muted-foreground">Loading candidate details...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !candidate) {
    return (
      <>
        <div className="fixed inset-0 bg-black/80 z-50" />
        <div className="fixed top-[80px] left-1/2 transform -translate-x-1/2 z-50 bg-background border border-border rounded-lg shadow-lg max-w-[95vw] max-h-[90vh] w-[1200px] h-[800px] overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-4 text-center">
              <ServerCrash className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="text-lg font-medium text-foreground">Failed to load candidate</h3>
                <p className="text-muted-foreground text-sm">{error || 'Candidate not found'}</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const education = getEducation(candidate);
  const experience = getExperience(candidate);
  const skills = getSkills(candidate);
  const personalInfo = getParsedDataProperty(candidate, 'personal_info');
  const contactInfo = getParsedDataProperty(candidate, 'contact_info');
  const candidateJobMatches = candidate.jobMatches || [];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed top-[80px] left-1/2 transform -translate-x-1/2 z-50 bg-background border border-border rounded-lg shadow-lg max-w-[95vw] max-h-[90vh] w-[1200px] h-[800px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        
        {/* Content */}
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="bg-card border-b border-border p-6">
            <div className="flex items-center gap-6">
              <Avatar className="w-16 h-16 text-2xl">
                {candidate.avatarUrl ? (
                  <AvatarImage src={candidate.avatarUrl} alt={formatCandidateName(candidate)} />
                ) : (
                  <AvatarFallback>{formatCandidateName(candidate)?.[0] || '?'}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground line-clamp-1">{formatCandidateName(candidate)}</span>
                  {candidate.status && (
                    <Badge variant="outline" className="text-xs px-2 py-1 rounded-full">{candidate.status}</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                  {candidate.positionId && candidate.position && (
                    <span>Applied Job: <span className="font-medium text-foreground">{candidate.position.title}</span></span>
                  )}
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

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="matches">Job Matches</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-sm">{candidate.email || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Phone</label>
                        <p className="text-sm">{candidate.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Position</label>
                        <p className="text-sm">{candidate.position?.title || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Recruiter</label>
                        <p className="text-sm">{candidate.recruiter?.name || 'Unassigned'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Application Date</label>
                        <p className="text-sm">{candidate.applicationDate ? new Date(candidate.applicationDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Fit Score</label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{candidate.fitScore || 0}%</span>
                          <Progress value={candidate.fitScore || 0} className="flex-1 h-2" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Job Applied */}
                {candidate.positionId && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Applied Position
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Position Title</label>
                          <p className="text-sm font-medium">{candidate.position?.title || 'Unknown Position'}</p>
                        </div>
                        {candidate.fitScore !== null && candidate.fitScore !== undefined && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Match Score</label>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-primary">{candidate.fitScore}%</span>
                              <Badge variant="outline">{getScoreGrade(candidate.fitScore)}</Badge>
                            </div>
                          </div>
                        )}
                        {candidate.assignmentJustification && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Justification</label>
                            <p className="text-sm whitespace-pre-wrap">{candidate.assignmentJustification}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recruitment Pipeline */}
                {availableStages.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recruitment Pipeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {availableStages.map((stage, index) => (
                          <div key={stage.id} className="flex items-center gap-3">
                            <div className={cn(
                              "w-3 h-3 rounded-full",
                              candidate.status === stage.name ? "bg-primary" : "bg-muted"
                            )} />
                            <span className={cn(
                              "text-sm",
                              candidate.status === stage.name ? "font-medium" : "text-muted-foreground"
                            )}>
                              {stage.name}
                            </span>
                            {candidate.status === stage.name && (
                              <Badge variant="outline" className="text-xs">Current</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Experience Tab */}
              <TabsContent value="experience" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Work Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {experience && experience.length > 0 ? (
                      <div className="space-y-6">
                        {experience.map((exp, index) => (
                          <TimelineItem
                            key={index}
                            icon={Briefcase}
                            title={exp.position || 'Position'}
                            subtitle={exp.company || 'Company'}
                            period={exp.period || exp.duration}
                            description={exp.description}
                            isLast={index === experience.length - 1}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Briefcase className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>No experience information available.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Education Tab */}
              <TabsContent value="education" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Education
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {education && education.length > 0 ? (
                      <div className="space-y-6">
                        {education.map((edu, index) => (
                          <TimelineItem
                            key={index}
                            icon={GraduationCap}
                            title={edu.major || edu.field || 'Degree'}
                            subtitle={edu.university || edu.campus}
                            period={edu.period || edu.duration}
                            description={edu.description}
                            isLast={index === education.length - 1}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <GraduationCap className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>No education information available.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HardDrive className="h-5 w-5" />
                      Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {skills && skills.length > 0 ? (
                      <div className="space-y-4">
                        {skills.map((skill: SkillEntry, index: number) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <HardDrive className="h-4 w-4 text-primary" />
                              <span className="font-medium">{skill.segment_skill || 'Skill Category'}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {skill.skill_string && (
                                <Badge variant="outline">{skill.skill_string}</Badge>
                              )}
                              {Array.isArray(skill.skill) && skill.skill.map((s, idx) => (
                                <Badge key={idx} variant="outline">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <HardDrive className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>No skills information available.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Job Matches Tab */}
              <TabsContent value="matches" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ListChecks className="h-5 w-5" />
                      Job Matches
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {candidateJobMatches && candidateJobMatches.length > 0 ? (
                      <div className="space-y-4">
                        {candidateJobMatches.map((match, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{match.jobTitle || 'Position'}</h4>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-primary">{match.fitScore || 0}%</span>
                                <Badge variant="outline">{getScoreGrade(match.fitScore || 0)}</Badge>
                              </div>
                            </div>
                            {match.matchReasons && match.matchReasons.length > 0 && (
                              <div className="space-y-1">
                                <label className="text-sm font-medium text-muted-foreground">Match Reasons:</label>
                                <ul className="text-sm space-y-1">
                                  {match.matchReasons.map((reason, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <span className="text-primary">•</span>
                                      <span>{reason}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <ListChecks className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>No job matches available.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
};

export default CandidateDetailModal;