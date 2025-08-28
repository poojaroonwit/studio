"use client";

import * as React from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const portalContainerRef = useRef<HTMLDivElement | null>(null);
  const originalBodyOverflowRef = useRef<string>('');

  // Enhanced cleanup function
  const cleanupModal = useCallback(() => {
    // Restore body scroll
    if (originalBodyOverflowRef.current !== undefined) {
      document.body.style.overflow = originalBodyOverflowRef.current;
    } else {
      document.body.style.overflow = '';
    }

    // Clean up any remaining modal overlays
    const remainingOverlays = document.querySelectorAll('[data-radix-dialog-overlay][data-state="closed"]');
    remainingOverlays.forEach(overlay => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });

    // Clean up any remaining portal containers
    const remainingPortals = document.querySelectorAll('[data-candidate-modal-portal="true"]');
    remainingPortals.forEach(portal => {
      if (portal.parentNode) {
        portal.parentNode.removeChild(portal);
      }
    });

    // Force a reflow to ensure cleanup
    document.body.offsetHeight;
  }, []);

  // Create portal container on mount
  useEffect(() => {
    setMounted(true);
    
    // Store original body overflow
    originalBodyOverflowRef.current = window.getComputedStyle(document.body).overflow;
    
    // Create portal container if it doesn't exist
    if (!portalContainerRef.current) {
      portalContainerRef.current = document.createElement('div');
      portalContainerRef.current.setAttribute('data-candidate-modal-portal', 'true');
      document.body.appendChild(portalContainerRef.current);
    }

    return () => {
      setMounted(false);
      cleanupModal();
      
      // Clean up portal container on unmount
      if (portalContainerRef.current && portalContainerRef.current.parentNode) {
        portalContainerRef.current.parentNode.removeChild(portalContainerRef.current);
        portalContainerRef.current = null;
      }
    };
  }, [cleanupModal]);

  // Handle escape key and body scroll
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Clean up when modal closes
      cleanupModal();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (!open) {
        cleanupModal();
      }
    };
  }, [open, onClose, cleanupModal]);

  // Enhanced close handler
  const handleClose = useCallback(() => {
    cleanupModal();
    onClose();
  }, [cleanupModal, onClose]);

  // Validate candidate ID format (same as page validation)
  const isValidCandidateId = candidateId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId);

  if (!open || !candidateId || !mounted || !portalContainerRef.current) return null;

  // Show error for invalid candidate ID
  if (!isValidCandidateId) {
    const errorContent = (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 pointer-events-auto">
        <div className="w-full max-w-md bg-background rounded-lg shadow-2xl border border-border overflow-hidden relative pointer-events-auto">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Invalid Candidate ID</h3>
            <p className="text-muted-foreground text-sm mb-6">The candidate ID format is not valid.</p>
            <Button onClick={handleClose} variant="outline" size="sm">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
    
    return createPortal(errorContent, portalContainerRef.current);
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Prevent event from bubbling up to parent components
    e.stopPropagation();
    handleClose();
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 pointer-events-auto"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-[95vw] h-full max-h-[95vh] flex flex-col bg-background rounded-lg shadow-2xl border border-border overflow-hidden relative pointer-events-auto"
        onClick={handleModalClick}
      >
        <CandidateDetailView 
          candidateId={candidateId} 
          isModal={true} 
          onClose={handleClose}
        />
      </div>
    </div>
  );

  // Use Portal to render outside the current component tree
  return createPortal(modalContent, portalContainerRef.current);
}