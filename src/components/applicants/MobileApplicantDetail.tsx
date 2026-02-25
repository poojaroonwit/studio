"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowPathIcon as Loader2, XMarkIcon as X, BriefcaseIcon as Briefcase, UserIcon as User, AcademicCapIcon as GraduationCap, BriefcaseIcon as BriefcaseIcon, DocumentTextIcon as FileText, PhotoIcon as ImageIcon, DocumentIcon as FileIcon, ChatBubbleLeftRightIcon as MessageSquare, ClockIcon as Clock, FlagIcon as Pin, ArrowLeftIcon as ArrowLeft, ChevronLeftIcon as ChevronLeft, EllipsisVerticalIcon as MoreVertical, PencilIcon as Edit, TrashIcon as Trash2, PencilSquareIcon as FileEdit, UsersIcon as Users, ArrowPathIcon as RefreshCw, ArrowUpTrayIcon as UploadCloud, FlagIcon as Target, NoSymbolIcon as Ban } from '@heroicons/react/24/outline';
import { StatusBadge } from './ApplicantKanbanView';
import { formatApplicantNameWithLang } from '@/lib/applicantUtils';
import { JobAppliedTab } from './tabs/JobAppliedTab';
import { ApplicantInfoTab } from './tabs/ApplicantInfoTab';
import { EducationTab } from './tabs/EducationTab';
import { ExperienceTab } from './tabs/ExperienceTab';
import { AttachmentsTab } from './tabs/AttachmentsTab';
import ApplicantCommentsSection from './ApplicantCommentsSection';
import type { Applicant, Position, TransitionRecord } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useAutoScrollToInput } from '@/hooks/use-auto-scroll-to-input';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';
import { DeleteApplicantModal } from './DeleteApplicantModal';
import { TiptapEditor } from '../ui/tiptap-editor';

interface MobileApplicantDetailProps {
  applicantId: string;
  onClose?: () => void;
  onRefresh?: () => void;
}

export default function MobileApplicantDetail({
  applicantId,
  onClose,
  onRefresh
}: MobileApplicantDetailProps) {
  const { data: session } = useSession();
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [allDbPositions, setAllDbPositions] = useState<Position[]>([]);
  const [availableStages, setAvailableStages] = useState<any[]>([]);
  const [availableRecruiters, setAvailableRecruiters] = useState<Array<{ id: string; name: string }>>([]);
  const [availableSources, setAvailableSources] = useState<Array<{ id: string; name: string }>>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [transitionHistory, setTransitionHistory] = useState<TransitionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'job-applied' | 'applicant-info' | 'attachments' | 'comments'>('job-applied');
  const [isPositionDrawerOpen, setIsPositionDrawerOpen] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isRecruiterModalOpen, setIsRecruiterModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [transitionNotes, setTransitionNotes] = useState<string>('');
  const [newRecruiterId, setNewRecruiterId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    fileName: string;
    url: string;
    label?: string;
    updatedAt?: string;
    fileSize?: number | string;
    filePath?: string;
    applicantId?: string;
  } | null>(null);
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);

  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to focused inputs on mobile
  useAutoScrollToInput();

  const loadData = useCallback(async () => {
    if (!applicantId) {
      setIsLoading(false);
      setError('Invalid applicant ID');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const [applicantRes, positionsRes, stagesRes, recruitersRes, sourcesRes, commentsRes, attachmentsRes, transitionsRes] = await Promise.allSettled([
        fetch(`/api/applicants/${applicantId}`, {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        }),
        fetch('/api/positions', {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        }),
        fetch('/api/recruitment-stages', {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        }),
        fetch('/api/users?role=Recruiter', {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        }),
        fetch('/api/applicant-sources', {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        }),
        fetch(`/api/applicants/${applicantId}/comments?limit=100&offset=0`, {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        }),
        fetch(`/api/applicants/${applicantId}/resumes?limit=100&offset=0`, {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        }),
        fetch(`/api/transitions?applicantId=${applicantId}`, {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        })
      ]);

      if (!mountedRef.current) return;

      if (applicantRes.status === 'fulfilled' && applicantRes.value.ok) {
        const applicantData = await applicantRes.value.json();
        setApplicant(applicantData);
      } else {
        setError('Applicant not found');
        setIsLoading(false);
        return;
      }

      if (positionsRes.status === 'fulfilled' && positionsRes.value.ok) {
        const positionsData = await positionsRes.value.json();
        setAllDbPositions(Array.isArray(positionsData) ? positionsData : (positionsData.data || []));
      }

      if (stagesRes.status === 'fulfilled' && stagesRes.value.ok) {
        const stagesData = await stagesRes.value.json();
        setAvailableStages(Array.isArray(stagesData) ? stagesData : []);
      }

      if (recruitersRes.status === 'fulfilled' && recruitersRes.value.ok) {
        const recruitersData = await recruitersRes.value.json();
        const recruiters = Array.isArray(recruitersData) ? recruitersData : (recruitersData.data || []);
        setAvailableRecruiters(recruiters.map((r: any) => ({ id: r.id, name: r.name || r.email || 'Unknown' })));
      }

      if (sourcesRes.status === 'fulfilled' && sourcesRes.value.ok) {
        const sourcesData = await sourcesRes.value.json();
        const sources = Array.isArray(sourcesData) ? sourcesData : (sourcesData.data || []);
        setAvailableSources(sources.map((s: any) => ({ id: s.id, name: s.name })));
      }

      if (commentsRes.status === 'fulfilled' && commentsRes.value.ok) {
        const commentsData = await commentsRes.value.json();
        setComments(Array.isArray(commentsData) ? commentsData : (commentsData.data || []));
      }

      if (attachmentsRes.status === 'fulfilled' && attachmentsRes.value.ok) {
        const attachmentsData = await attachmentsRes.value.json();
        setAttachments(Array.isArray(attachmentsData) ? attachmentsData : (attachmentsData.data || []));
      }

      if (transitionsRes.status === 'fulfilled' && transitionsRes.value.ok) {
        const transitionsData = await transitionsRes.value.json();
        setTransitionHistory(Array.isArray(transitionsData) ? transitionsData : (transitionsData.data || []));
      }

      setIsLoading(false);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      console.error('Error loading applicant data:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to load applicant data');
        setIsLoading(false);
      }
    }
  }, [applicantId]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData]);

  // Scroll detection for header blur
  useEffect(() => {
    const handleScroll = () => {
      if (!mainContainerRef.current) return;

      // Find all scrollable elements within the main container
      const scrollableElements = mainContainerRef.current.querySelectorAll('[class*="overflow-y-auto"]');
      let maxScrollTop = 0;

      scrollableElements.forEach((el) => {
        if (el instanceof HTMLElement && el.scrollTop > maxScrollTop) {
          maxScrollTop = el.scrollTop;
        }
      });

      setIsScrolled(maxScrollTop > 10);
    };

    // Use MutationObserver to detect when scrollable elements are added/removed
    const observer = new MutationObserver(() => {
      // Re-attach scroll listeners when DOM changes
      const scrollableElements = mainContainerRef.current?.querySelectorAll('[class*="overflow-y-auto"]');
      scrollableElements?.forEach((el) => {
        el.addEventListener('scroll', handleScroll, { passive: true });
      });
    });

    if (mainContainerRef.current) {
      observer.observe(mainContainerRef.current, {
        childList: true,
        subtree: true,
      });

      // Initial attachment
      const scrollableElements = mainContainerRef.current.querySelectorAll('[class*="overflow-y-auto"]');
      scrollableElements.forEach((el) => {
        el.addEventListener('scroll', handleScroll, { passive: true });
      });
    }

    return () => {
      observer.disconnect();
      const scrollableElements = mainContainerRef.current?.querySelectorAll('[class*="overflow-y-auto"]');
      scrollableElements?.forEach((el) => {
        el.removeEventListener('scroll', handleScroll);
      });
    };
  }, [activeTab]); // Re-attach when tab changes

  const handleRefresh = useCallback(() => {
    loadData();
    if (onRefresh) {
      onRefresh();
    }
  }, [loadData, onRefresh]);

  const handleOpenPositionDrawer = (positionId: string) => {
    setSelectedPositionId(positionId);
    setIsPositionDrawerOpen(true);
  };

  // Action handlers
  const handleDelete = async () => {
    if (!applicant?.id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/applicants/${applicant.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete Applicant');
      toast.success('Applicant deleted');
      setIsDeleteModalOpen(false);
      setIsActionsModalOpen(false);
      if (onClose) onClose();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete Applicant');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!applicant?.id || !newStatus) return;
    try {
      const res = await fetch('/api/applicants/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'change_status',
          applicantIds: [applicant.id],
          newStatus,
          notes: transitionNotes || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success('Status updated');
      setIsStatusModalOpen(false);
      setIsActionsModalOpen(false);
      setNewStatus('');
      setTransitionNotes('');
      handleRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleAssignRecruiter = async () => {
    if (!applicant?.id) return;
    try {
      const res = await fetch(`/api/applicants/${applicant.id}/assign-recruiter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recruiterId: newRecruiterId }),
      });
      if (!res.ok) throw new Error('Failed to assign recruiter');
      toast.success('Recruiter assigned');
      setIsRecruiterModalOpen(false);
      setIsActionsModalOpen(false);
      setNewRecruiterId(null);
      handleRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign recruiter');
    }
  };

  const handleTogglePin = async () => {
    if (!applicant?.id) return;
    try {
      const res = await fetch(`/api/applicants/${applicant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPinned: !applicant.isPinned }),
      });
      if (!res.ok) throw new Error('Failed to update pin status');
      toast.success(applicant.isPinned ? 'Unpinned' : 'Pinned');
      setIsActionsModalOpen(false);
      handleRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update pin status');
    }
  };

  const handleReprocess = async () => {
    if (!applicant?.id) return;
    try {
      const res = await fetch(`/api/applicants/${applicant.id}/reprocess`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to reprocess');
      toast.success('Reprocessing Applicant...');
      setIsActionsModalOpen(false);
      handleRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reprocess');
    }
  };

  // Get applied job info
  const appliedJobId = applicant?.positionId || null;
  const appliedFitScore = applicant?.fitScore || null;
  const appliedJustification: string[] = Array.isArray(applicant?.assignmentJustification)
    ? applicant.assignmentJustification
    : (applicant?.assignmentJustification ? [applicant.assignmentJustification] : []);
  const appliedJobBadge = appliedFitScore !== null ? (
    <Badge variant="secondary">{appliedFitScore}%</Badge>
  ) : null;

  // Get stage names mapping
  const stageNames = React.useMemo(() => {
    const map: Record<string, string> = {};
    availableStages.forEach((s) => { if (s.id && s.name) map[s.id] = s.name; });
    return map;
  }, [availableStages]);

  // Get file icon helper
  const getFileIcon = (fileName: string) => {
    if (!fileName) return FileIcon;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return ImageIcon;
    if (['pdf'].includes(ext || '')) return FileText;
    return FileIcon;
  };

  const nameInfo = React.useMemo(() => applicant ? formatApplicantNameWithLang(applicant) : { fontClass: '', lang: 'en' }, [applicant]);
  const personalInfo = React.useMemo(() => {
    if (!applicant) return {};
    let parsedDataObj: any = {};
    if (applicant.parsedData) {
      if (typeof applicant.parsedData === 'string') {
        try {
          parsedDataObj = JSON.parse(applicant.parsedData);
        } catch (e) {
          parsedDataObj = {};
        }
      } else {
        parsedDataObj = applicant.parsedData;
      }
    }
    return parsedDataObj.personal_info || {};
  }, [applicant]);

  const education = React.useMemo(() => {
    if (!applicant) return [];
    if (Array.isArray(applicant.educationData) && applicant.educationData.length > 0) {
      return applicant.educationData;
    }
    const parsedData = applicant.parsedData;
    if (parsedData && typeof parsedData === 'object') {
      if ('education' in parsedData) {
        return (parsedData as any).education || [];
      }
    }
    return [];
  }, [applicant]);

  const experience = React.useMemo(() => {
    if (!applicant) return [];
    if (Array.isArray(applicant.experienceData) && applicant.experienceData.length > 0) {
      return applicant.experienceData;
    }
    const parsedData = applicant.parsedData;
    if (parsedData && typeof parsedData === 'object') {
      if ('experience' in parsedData) {
        return (parsedData as any).experience || [];
      }
    }
    return [];
  }, [applicant]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !applicant) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <p className="text-destructive mb-4">{error || 'Applicant not found'}</p>
        <Button onClick={loadData}>Retry</Button>
      </div>
    );
  }

  return (
    <div ref={mainContainerRef} className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Header - Redesigned with compact layout */}
      <div className={cn(
        "flex-shrink-0 border-b sticky top-0 z-10 transition-all duration-300",
        isScrolled
          ? "bg-background/80 backdrop-blur-md shadow-sm"
          : "bg-background/95 backdrop-blur-sm"
      )}>
        <div className="flex items-center gap-2 p-3">
          {/* Back Button - Simple chevron */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 flex-shrink-0 touch-manipulation border-none shadow-none hover:bg-transparent"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className={cn("text-base font-bold truncate", nameInfo.fontClass, applicant.isBlacklisted && "text-destructive")} lang={nameInfo.lang}>
                {applicant.name}
              </h2>
              {applicant.isBlacklisted && <Ban className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
              {applicant.isPinned && (
                <Pin className="h-3.5 w-3.5 text-primary rotate-45 fill-current flex-shrink-0" />
              )}
            </div>
            {applicant.email && (
              <p className="text-xs text-muted-foreground truncate">{applicant.email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs - Using system settings design */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Tab Navigation - Following system settings pattern */}
        <div className="overflow-x-auto border-b border-border/50 flex-shrink-0">
          <div className="flex w-full min-w-max">
            <div
              onClick={() => setActiveTab('job-applied')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer flex-shrink-0 touch-manipulation",
                activeTab === 'job-applied'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Briefcase className="h-4 w-4" />
              Job Applied
            </div>
            <div
              onClick={() => setActiveTab('applicant-info')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer flex-shrink-0 touch-manipulation",
                activeTab === 'applicant-info'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <User className="h-4 w-4" />
              Applicant Info
            </div>
            <div
              onClick={() => setActiveTab('attachments')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer flex-shrink-0 touch-manipulation",
                activeTab === 'attachments'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <FileText className="h-4 w-4" />
              Attachments ({attachments.length})
            </div>
            <div
              onClick={() => setActiveTab('comments')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer flex-shrink-0 touch-manipulation",
                activeTab === 'comments'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Comments ({comments.length})
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          {/* Job Applied Tab */}
          {activeTab === 'job-applied' && (
            <div className="h-full w-full overflow-y-auto p-4">
              <JobAppliedTab
                applicant={applicant}
                allDbPositions={allDbPositions}
                isEditing={false}
                onCopyJobApplied={() => { }}
                copiedJobApplied={false}
                appliedJobId={appliedJobId}
                appliedFitScore={appliedFitScore}
                appliedJustification={appliedJustification}
                appliedJobBadge={appliedJobBadge}
                onOpenPositionDrawer={handleOpenPositionDrawer}
                availableStages={availableStages}
                availableRecruiters={availableRecruiters}
                availableSources={availableSources}
                onRefresh={handleRefresh}
                resumes={attachments}
              />
            </div>
          )}

          {/* Applicant Info Tab - Merged */}
          {activeTab === 'applicant-info' && (
            <div className="h-full w-full overflow-y-auto p-4">
              <div className="space-y-6">
                {/* Applicant Info Section */}
                <div>
                  <h3 className="text-base font-semibold mb-3">Personal Information</h3>
                  <div className="space-y-3">
                    <ApplicantInfoTab
                      applicant={applicant}
                      isEditing={false}
                    />
                  </div>
                </div>

                {/* Education Section */}
                {education.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Education
                    </h3>
                    <div>
                      <EducationTab
                        applicant={applicant}
                        isEditing={false}
                      />
                    </div>
                  </div>
                )}

                {/* Experience Section */}
                {experience.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                      <BriefcaseIcon className="h-4 w-4" />
                      Experience
                    </h3>
                    <div>
                      <ExperienceTab
                        applicant={applicant}
                        isEditing={false}
                      />
                    </div>
                  </div>
                )}

                {/* Attachments Section - Small Cards with Icons */}
                {attachments.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Attachments ({attachments.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {attachments.map((attachment) => {
                        const FileIconComponent = getFileIcon(attachment.fileName || attachment.name || '');
                        return (
                          <div
                            key={attachment.id}
                            className="border border-border rounded-lg p-3 flex flex-col items-center justify-center gap-2 min-h-[100px] cursor-pointer hover:shadow-md hover:border-primary/50 transition-all bg-card"
                            onClick={() => {
                              setSelectedFile({
                                fileName: attachment.fileName || attachment.name || 'Unknown',
                                url: attachment.url,
                                label: attachment.label,
                                updatedAt: attachment.uploadedAt,
                                filePath: attachment.filePath,
                                applicantId: applicantId
                              });
                              setIsFileViewerOpen(true);
                            }}
                          >
                            <FileIconComponent className="h-8 w-8 text-muted-foreground" />
                            <p className="text-xs text-center truncate w-full" title={attachment.fileName || attachment.name}>
                              {attachment.fileName || attachment.name || 'Unknown'}
                            </p>
                            {attachment.label && (
                              <Badge variant="secondary" className="text-[10px]">
                                {attachment.label}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attachments Tab */}
          {activeTab === 'attachments' && (
            <div className="h-full w-full overflow-y-auto">
              <AttachmentsTab
                applicantId={applicantId}
                attachments={attachments}
                onRefresh={handleRefresh}
                canUpload={true}
                canDelete={true}
              />
            </div>
          )}

          {/* Comments Tab - No Activity Timeline on Mobile */}
          {activeTab === 'comments' && (
            <div className="h-full w-full overflow-y-auto">
              <ApplicantCommentsSection
                applicantId={applicantId}
                comments={comments}
                isEditing={false}
                onCommentsChange={handleRefresh}
              />
            </div>
          )}
        </div>
      </div>

      {/* Actions Button - Mobile Only - Moved to header area if needed */}
      <div className="fixed bottom-20 right-4 z-40 md:hidden">
        <Button
          size="lg"
          onClick={() => setIsActionsModalOpen(true)}
          className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground border-0 transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
          aria-label="Actions"
        >
          <MoreVertical className="h-7 w-7" />
        </Button>
      </div>

      {/* Actions Modal */}
      <Dialog open={isActionsModalOpen} onOpenChange={setIsActionsModalOpen}>
        <DialogContent
          className="fixed bottom-0 left-1/2 top-auto translate-x-[-50%] translate-y-0 w-screen max-w-none h-[90vh] p-0 overflow-hidden rounded-t-3xl rounded-b-none border-0 shadow-2xl bg-background flex flex-col"
          dialogId="applicant-actions-modal"
        >
          <VisuallyHidden>
            <DialogTitle>Applicant Actions</DialogTitle>
          </VisuallyHidden>

          <DialogHeader className="border-b px-4 pt-6 pb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 flex-shrink-0">
                <AvatarImage src={applicant.avatarUrl || undefined} alt={applicant.name || ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
                  {applicant.name?.charAt(0)?.toUpperCase() || 'C'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className={cn("text-sm font-semibold truncate", nameInfo.fontClass, applicant.isBlacklisted && "text-destructive")} lang={nameInfo.lang}>
                  {applicant.name || 'Applicant'}
                </span>
                {applicant.email && (
                  <span className="text-xs text-muted-foreground truncate">
                    {applicant.email}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {applicant.isBlacklisted && (
                  <Badge variant="destructive" className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full">
                    <Ban className="h-3 w-3" />
                    Blacklisted
                  </Badge>
                )}
                {applicant.isPinned && (
                  <Badge variant="secondary" className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full">
                    <Pin className="h-3 w-3 rotate-45 fill-current" />
                    Pinned
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 px-4 py-2">
            <div className="space-y-0">
              <Button
                variant="ghost"
                className="w-full justify-start h-12 rounded-none border-0 text-left gap-3 hover:bg-muted/50 active:bg-muted/70"
                onClick={() => {
                  setIsActionsModalOpen(false);
                  setIsStatusModalOpen(true);
                }}
              >
                <Edit className="h-4 w-4" />
                Change Status
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start h-12 rounded-none border-0 text-left gap-3 hover:bg-muted/50 active:bg-muted/70"
                onClick={() => {
                  setIsActionsModalOpen(false);
                  setIsRecruiterModalOpen(true);
                }}
              >
                <Users className="h-4 w-4" />
                Assign Recruiter
              </Button>

              <div className="border-t border-border/60 my-1" />

              <Button
                variant="ghost"
                className="w-full justify-start h-12 rounded-none border-0 text-left gap-3 hover:bg-muted/50 active:bg-muted/70"
                onClick={handleTogglePin}
              >
                <Pin className="h-4 w-4" />
                {applicant?.isPinned ? 'Unpin' : 'Pin'} applicant
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start h-12 rounded-none border-0 text-left gap-3 hover:bg-muted/50 active:bg-muted/70"
                onClick={() => {
                  setIsActionsModalOpen(false);
                  handleRefresh();
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Data
              </Button>

              <div className="border-t border-border/60 my-1" />

              <Button
                variant="ghost"
                className="w-full justify-start h-12 rounded-none border-0 text-left gap-3 hover:bg-muted/50 active:bg-muted/70 text-destructive hover:text-destructive"
                onClick={() => {
                  setIsActionsModalOpen(false);
                  setIsDeleteModalOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete Applicant
              </Button>
            </div>
          </ScrollArea>

          <div className="border-t px-4 py-4">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl"
              onClick={() => setIsActionsModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Status Modal */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent
          className="fixed bottom-0 left-1/2 top-auto translate-x-[-50%] translate-y-0 w-screen max-w-none h-auto p-0 overflow-hidden rounded-t-3xl rounded-b-none border-0 shadow-2xl bg-background flex flex-col"
          dialogId="status-actions-modal"
        >
          <VisuallyHidden>
            <DialogTitle>Change Status</DialogTitle>
          </VisuallyHidden>

          <DialogHeader className="border-b px-4 pt-6 pb-4 flex-shrink-0">
            <div className="text-lg font-semibold text-center">Change Applicant Status</div>
          </DialogHeader>

          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {availableStages.map((stage) => (
                <Button
                  key={stage.id}
                  variant={newStatus === stage.id ? "default" : "outline"}
                  onClick={() => setNewStatus(stage.id)}
                  className="w-full justify-start truncate"
                >
                  {stage.name}
                </Button>
              ))}
            </div>

            {newStatus && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Notes (Optional)</p>
                <TiptapEditor
                  value={transitionNotes}
                  onChange={(value: string) => setTransitionNotes(value)}
                  placeholder="Add notes about this status change..."
                  className="min-h-[120px]"
                  showToolbar={true}
                />
              </div>
            )}
          </div>

          <div className="border-t px-4 py-4 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>Cancel</Button>
            <Button disabled={!newStatus} onClick={handleChangeStatus}>Update Status</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Recruiter Modal */}
      <Dialog open={isRecruiterModalOpen} onOpenChange={setIsRecruiterModalOpen}>
        <DialogContent
          className="fixed bottom-0 left-1/2 top-auto translate-x-[-50%] translate-y-0 w-screen max-w-none h-auto p-0 overflow-hidden rounded-t-3xl rounded-b-none border-0 shadow-2xl bg-background flex flex-col"
          dialogId="recruiter-actions-modal"
        >
          <VisuallyHidden>
            <DialogTitle>Assign Recruiter</DialogTitle>
          </VisuallyHidden>

          <DialogHeader className="border-b px-4 pt-6 pb-4 flex-shrink-0">
            <div className="text-lg font-semibold text-center">Assign Recruiter</div>
          </DialogHeader>

          <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
            {availableRecruiters.length > 0 ? (
              availableRecruiters.map((recruiter) => (
                <Button
                  key={recruiter.id}
                  variant={newRecruiterId === recruiter.id ? "default" : "outline"}
                  onClick={() => setNewRecruiterId(recruiter.id)}
                  className="w-full justify-between h-auto py-3 px-4"
                >
                  <span>{recruiter.name}</span>
                  {newRecruiterId === recruiter.id && <Users className="h-4 w-4" />}
                </Button>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No recruiters available.</p>
            )}
          </div>

          <div className="border-t px-4 py-4 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setIsRecruiterModalOpen(false)}>Cancel</Button>
            <Button disabled={!newRecruiterId} onClick={handleAssignRecruiter}>Assign</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Position Drawer */}
      {
        selectedPositionId && (
          <PositionDetailDrawer
            isOpen={isPositionDrawerOpen}
            onOpenChange={setIsPositionDrawerOpen}
            positionId={selectedPositionId}
          />
        )
      }

      {/* Delete Applicant Modal */}
      <DeleteApplicantModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        applicant={applicant}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      {/* File Viewer Modal */}
      <FileViewerModal
        isOpen={isFileViewerOpen}
        onOpenChange={setIsFileViewerOpen}
        file={selectedFile}
      />
    </div >
  );
}
