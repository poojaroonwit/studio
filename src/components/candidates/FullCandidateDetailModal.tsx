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
import { 
  ArrowLeft, Briefcase, CalendarDays, DollarSign, Edit, GraduationCap, HardDrive, Info, 
  LinkIcon, ListChecks, Loader2, Mail, MapPin, MessageSquare, Percent, Phone, ServerCrash, 
  ShieldAlert, Star, Tag, UploadCloud, User, UserCircle, UserCog, Users, Zap, ExternalLink, 
  Edit3, Save, X, PlusCircle, Trash2, Lightbulb, ChevronDown, ChevronRight, Home, Users as UsersIcon, 
  Activity, Clock, Eye, EyeOff, Heart, Share2, Download, Copy, Bookmark, Flag, AlertTriangle,
  CheckCircle, Clock4, TrendingUp, Award, Target, Calendar, FileText, Video, PhoneCall, 
  Send, Archive, UserPlus, UserMinus, Settings, MoreHorizontal, Star as StarIcon
} from 'lucide-react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
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
  candidate: Candidate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Enhanced Quick Actions Component
const QuickActions = ({ candidate, onAction }: { candidate: Candidate; onAction: (action: string) => void }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);

  const actions = [
    { icon: PhoneCall, label: 'Call', action: 'call', color: 'text-green-600' },
    { icon: Mail, label: 'Email', action: 'email', color: 'text-blue-600' },
    { icon: MessageSquare, label: 'Message', action: 'message', color: 'text-purple-600' },
    { icon: Video, label: 'Video Call', action: 'video', color: 'text-indigo-600' },
    { icon: Send, label: 'Send Offer', action: 'offer', color: 'text-emerald-600' },
    { icon: Archive, label: 'Archive', action: 'archive', color: 'text-gray-600' },
  ];

  return (
    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
      {actions.map(({ icon: Icon, label, action, color }) => (
        <Tooltip key={action}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${color} hover:bg-muted`}
              onClick={() => onAction(action)}
            >
              <Icon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
      
      <Separator orientation="vertical" className="h-6" />
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${isBookmarked ? 'text-yellow-600' : 'text-gray-600'} hover:bg-muted`}
            onClick={() => setIsBookmarked(!isBookmarked)}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isBookmarked ? 'Remove Bookmark' : 'Bookmark'}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${isFlagged ? 'text-red-600' : 'text-gray-600'} hover:bg-muted`}
            onClick={() => setIsFlagged(!isFlagged)}
          >
            <Flag className={`w-4 h-4 ${isFlagged ? 'fill-current' : ''}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isFlagged ? 'Remove Flag' : 'Flag for Review'}</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onAction('duplicate')}>
            <Copy className="w-4 h-4 mr-2" />
            Duplicate Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction('export')}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onAction('delete')} className="text-red-600">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Candidate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// Enhanced Status Timeline Component
const StatusTimeline = ({ candidate, stages, onStatusChange }: { 
  candidate: Candidate; 
  stages: RecruitmentStage[]; 
  onStatusChange: (status: string) => void;
}) => {
  const currentStageIndex = stages.findIndex(s => s.name === candidate.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recruitment Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted"></div>
          {stages.map((stage, index) => {
            const isCurrent = stage.name === candidate.status;
            const isCompleted = index <= currentStageIndex;
            const isFuture = index > currentStageIndex;

            return (
              <div key={stage.name} className="relative flex items-center gap-4 mb-4 last:mb-0">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold z-10
                  ${isCurrent ? 'bg-primary text-primary-foreground shadow-lg' : ''}
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isFuture ? 'bg-muted text-muted-foreground' : ''}
                `}>
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>
                        {stage.name}
                      </h4>
                      {isCurrent && (
                        <p className="text-sm text-muted-foreground">Current Stage</p>
                      )}
                    </div>
                    
                    {isCurrent && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStatusChange(stage.name)}
                        className="text-xs"
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Update
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Enhanced Skills & Competencies Component
const SkillsCompetencies = ({ candidate }: { candidate: Candidate }) => {
  const skills = candidate.parsedData?.skills || [];
  const competencies = candidate.parsedData?.competencies || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Skills & Competencies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {skills.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Technical Skills</h4>
            <div className="flex flex-wrap gap-2">
              {skills.slice(0, 10).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {skills.length > 10 && (
                <Badge variant="outline" className="text-xs">
                  +{skills.length - 10} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {competencies.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Core Competencies</h4>
            <div className="flex flex-wrap gap-2">
              {competencies.map((comp, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {comp}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {skills.length === 0 && competencies.length === 0 && (
          <p className="text-sm text-muted-foreground">No skills data available</p>
        )}
      </CardContent>
    </Card>
  );
};

// Enhanced Contact Information Component
const ContactInformation = ({ candidate }: { candidate: Candidate }) => {
  const contactMethods = [
    { icon: Mail, label: 'Email', value: candidate.email, action: 'email', color: 'text-blue-600' },
    { icon: Phone, label: 'Phone', value: candidate.phone, action: 'call', color: 'text-green-600' },
    { icon: MapPin, label: 'Location', value: candidate.location, action: 'location', color: 'text-purple-600' },
    { icon: LinkIcon, label: 'LinkedIn', value: candidate.linkedinUrl, action: 'linkedin', color: 'text-indigo-600' },
  ].filter(item => item.value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle className="w-5 h-5" />
          Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {contactMethods.map(({ icon: Icon, label, value, action, color }) => (
            <div key={label} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${color}`} />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{value}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Icon className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Enhanced Fit Score Component
const FitScoreDisplay = ({ candidate }: { candidate: Candidate }) => {
  const fitScore = candidate.fitScore || 0;
  const grade = formatScoreWithGrade(fitScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Position Fit Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full bg-muted"></div>
            <div 
              className="absolute inset-0 rounded-full border-4 border-primary"
              style={{
                background: `conic-gradient(from 0deg, ${getScoreBgColor(fitScore)} ${fitScore * 3.6}deg, transparent ${fitScore * 3.6}deg)`
              }}
            ></div>
            <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{fitScore}%</div>
                <div className="text-xs text-muted-foreground">{grade}</div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Technical Skills</span>
              <span className="font-medium">85%</span>
            </div>
            <Progress value={85} className="h-2" />
            
            <div className="flex justify-between text-sm">
              <span>Experience Match</span>
              <span className="font-medium">92%</span>
            </div>
            <Progress value={92} className="h-2" />
            
            <div className="flex justify-between text-sm">
              <span>Cultural Fit</span>
              <span className="font-medium">78%</span>
            </div>
            <Progress value={78} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function FullCandidateDetailModal({ candidate, open, onOpenChange }: FullCandidateDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [recruiters, setRecruiters] = useState<{ id: string; name: string }[]>([]);
  const [stages, setStages] = useState<RecruitmentStage[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);

  // Fetch metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [recruitersRes, stagesRes] = await Promise.all([
          fetch('/api/users?role=Recruiter'),
          fetch('/api/settings/recruitment-stages')
        ]);

        if (recruitersRes.ok) {
          const recruitersData = await recruitersRes.json();
          setRecruiters(recruitersData.map((r: UserProfile) => ({ id: r.id, name: r.name })));
        }

        if (stagesRes.ok) {
          const stagesData = await stagesRes.json();
          setStages(stagesData);
        }
      } catch (error) {
        console.error("Error fetching metadata:", error);
      }
    };

    if (open) {
      fetchMetadata();
    }
  }, [open]);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'call':
        toast.success('Initiating call...');
        break;
      case 'email':
        toast.success('Opening email client...');
        break;
      case 'message':
        toast.success('Opening messaging...');
        break;
      case 'video':
        toast.success('Starting video call...');
        break;
      case 'offer':
        toast.success('Preparing offer...');
        break;
      case 'archive':
        toast.success('Archiving candidate...');
        break;
      default:
        toast.success(`Action: ${action}`);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');
      
      toast.success('Status updated successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={candidate.avatarUrl} alt={candidate.name} />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {candidate.name?.charAt(0)?.toUpperCase() || 'C'}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl font-bold">{candidate.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={getStatusBadgeVariant(candidate.status)}>
                    {candidate.status}
                  </Badge>
                  <Badge variant="outline">
                    {candidate.position?.title || 'No Position'}
                  </Badge>
                  {candidate.fitScore && (
                    <Badge variant="secondary" className={getScoreColor(candidate.fitScore)}>
                      {formatScoreWithGrade(candidate.fitScore)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                <Edit3 className="w-4 h-4 mr-2" />
                {isEditing ? 'Cancel Edit' : 'Edit'}
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" size="sm">
                  <X className="w-4 h-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {/* Quick Actions */}
        <div className="px-6 py-3 border-b">
          <QuickActions candidate={candidate} onAction={handleQuickAction} />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 px-6 pt-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto p-6">
              <TabsContent value="overview" className="h-full space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column */}
                  <div className="lg:col-span-2 space-y-6">
                    <ContactInformation candidate={candidate} />
                    <SkillsCompetencies candidate={candidate} />
                  </div>
                  
                  {/* Right Column */}
                  <div className="space-y-6">
                    <FitScoreDisplay candidate={candidate} />
                    <StatusTimeline candidate={candidate} stages={stages} onStatusChange={handleStatusChange} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="profile" className="h-full">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Profile details coming soon...</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="experience" className="h-full">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Work Experience</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Experience details coming soon...</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="h-full">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Documents & Attachments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Document management coming soon...</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="h-full">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Activity Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Activity history coming soon...</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <DialogFooter className="p-6 pt-4 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Last updated: {candidate.updatedAt ? format(parseISO(candidate.updatedAt), "MMM d, yyyy 'at' h:mm a") : 'Unknown'}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Move to Next Stage
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 