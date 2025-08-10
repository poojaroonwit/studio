"use client";

import * as React from "react";
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
import CandidateDetailView from './CandidateDetailView';

interface CandidateDetailModalProps {
  candidateId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function CandidateDetailModal({ candidateId, open, onClose }: CandidateDetailModalProps) {
  if (!open || !candidateId) return null;
  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={(e) => {
        // Prevent event from bubbling up to parent components
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="w-full max-w-7xl h-full max-h-[95vh] flex flex-col bg-background rounded-lg shadow-2xl border border-border overflow-hidden"
        onClick={e => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <CandidateDetailView 
          candidateId={candidateId} 
          isModal={true} 
          onClose={onClose}
        />
      </div>
    </div>
  );
}