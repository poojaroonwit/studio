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
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface CandidateDetailModalProps {
  candidateId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function CandidateDetailModal({ candidateId, open, onClose }: CandidateDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [modalTimedOut, setModalTimedOut] = useState(false);
  const portalContainerRef = useRef<HTMLDivElement | null>(null);
  const originalBodyOverflowRef = useRef<string>('');
  const modalTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced cleanup function with comprehensive resource management
  const cleanupModal = useCallback(() => {
    try {
      // Restore body scroll
      if (originalBodyOverflowRef.current !== undefined) {
        document.body.style.overflow = originalBodyOverflowRef.current;
      } else {
        document.body.style.overflow = '';
      }

      // Clean up any remaining modal overlays
      const remainingOverlays = document.querySelectorAll('[data-radix-dialog-overlay][data-state="closed"]');
      remainingOverlays.forEach(overlay => {
        try {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        } catch (e) {
          console.warn('Error removing overlay:', e);
        }
      });

      // Clean up any remaining portal containers (except the current one)
      const remainingPortals = document.querySelectorAll('[data-candidate-modal-portal="true"]');
      remainingPortals.forEach(portal => {
        try {
          if (portal !== portalContainerRef.current && portal.parentNode) {
            portal.parentNode.removeChild(portal);
          }
        } catch (e) {
          console.warn('Error removing portal:', e);
        }
      });

      // Clear modal timeout
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
        modalTimeoutRef.current = null;
      }

      // Force a reflow to ensure cleanup
      document.body.offsetHeight;
    } catch (error) {
      console.warn('Error during modal cleanup:', error);
    }
  }, []);

  // Create portal container on mount with leak prevention
  useEffect(() => {
    let containerCreated = false;
    
    try {
      setMounted(true);
      
      // Store original body overflow
      originalBodyOverflowRef.current = window.getComputedStyle(document.body).overflow;
      
      // Create portal container if it doesn't exist
      if (!portalContainerRef.current) {
        portalContainerRef.current = document.createElement('div');
        portalContainerRef.current.setAttribute('data-candidate-modal-portal', 'true');
        portalContainerRef.current.setAttribute('data-creation-time', Date.now().toString());
        document.body.appendChild(portalContainerRef.current);
        containerCreated = true;
      }
    } catch (error) {
      console.error('Error creating modal portal:', error);
      setMounted(false);
    }

    return () => {
      try {
        setMounted(false);
        cleanupModal();
        
        // Clean up portal container on unmount
        if (portalContainerRef.current && portalContainerRef.current.parentNode) {
          portalContainerRef.current.parentNode.removeChild(portalContainerRef.current);
          portalContainerRef.current = null;
        }
        
        // Defensive cleanup: remove any orphaned portals older than 1 minute
        const orphanedPortals = document.querySelectorAll('[data-candidate-modal-portal="true"]');
        const now = Date.now();
        orphanedPortals.forEach(portal => {
          try {
            const creationTime = parseInt(portal.getAttribute('data-creation-time') || '0');
            if (now - creationTime > 60000) { // 1 minute
              portal.parentNode?.removeChild(portal);
            }
          } catch (e) {
            console.warn('Error cleaning orphaned portal:', e);
          }
        });
      } catch (error) {
        console.warn('Error during portal cleanup:', error);
      }
    };
  }, [cleanupModal]);

  // Handle escape key and body scroll with comprehensive cleanup
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
      
      // Set a safety timeout for the entire modal (reduced time, no retry)
      setModalTimedOut(false);
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
      }
      modalTimeoutRef.current = setTimeout(() => {
        console.error('Modal loading timeout - marking as failed');
        setModalTimedOut(true);
      }, 15000); // Reduced to 15 seconds for faster failure detection
    } else {
      // Clean up when modal closes
      cleanupModal();
      setModalTimedOut(false);
    }

    return () => {
      try {
        document.removeEventListener('keydown', handleEscape);
        if (!open) {
          cleanupModal();
        }
      } catch (error) {
        console.warn('Error during modal effect cleanup:', error);
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

  // Show timeout fallback if modal has been loading too long (NO RETRY - just error)
  if (modalTimedOut) {
    const timeoutContent = (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 pointer-events-auto">
        <div className="w-full max-w-md bg-background rounded-lg shadow-2xl border border-border overflow-hidden relative pointer-events-auto">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Loading Failed</h3>
            <p className="text-muted-foreground text-sm mb-6">
              The candidate details failed to load within the expected time. This may be due to server issues, network problems, or the candidate data being unavailable.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleClose} size="sm">
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
    
    return createPortal(timeoutContent, portalContainerRef.current);
  }

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 pointer-events-auto"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-[95vw] h-full max-h-[95vh] flex flex-col bg-background rounded-lg shadow-2xl border border-border overflow-hidden relative pointer-events-auto"
        onClick={handleModalClick}
      >
        <ErrorBoundary
          fallback={(
            <div className="flex items-center justify-center h-full p-8 text-center">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Component Error</h3>
                <p className="text-muted-foreground text-sm mb-4">An error occurred while rendering the candidate details.</p>
                <Button onClick={handleClose} size="sm">Close</Button>
              </div>
            </div>
          )}
        >
          <CandidateDetailView 
            candidateId={candidateId} 
            isModal={true} 
            onClose={handleClose}
          />
        </ErrorBoundary>
      </div>
    </div>
  );

  // Use Portal to render outside the current component tree
  return createPortal(modalContent, portalContainerRef.current);
}