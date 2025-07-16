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
import CandidateDetailView from './CandidateDetailView';
import FullCandidateDetail from './FullCandidateDetail';

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
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogOverlay />
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] flex flex-col overflow-hidden">
        <FullCandidateDetail candidateId={candidateId} isModal onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};

export default CandidateDetailModal;