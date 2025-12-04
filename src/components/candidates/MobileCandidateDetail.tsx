"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, X, Briefcase, User, GraduationCap, Briefcase as BriefcaseIcon, FileText, Image as ImageIcon, FileIcon, MessageSquare, Clock, Pin, ArrowLeft, MoreVertical, Edit, Trash2, FileEdit, Users, RefreshCw, UploadCloud, Target } from 'lucide-react';
import { StatusBadge } from './CandidateKanbanView';
import { formatCandidateNameWithLang } from '@/lib/candidateUtils';
import { JobAppliedTab } from './tabs/JobAppliedTab';
import { CandidateInfoTab } from './tabs/CandidateInfoTab';
import { EducationTab } from './tabs/EducationTab';
import { ExperienceTab } from './tabs/ExperienceTab';
import CandidateCommentsSection from './CandidateCommentsSection';
import type { Candidate, Position, TransitionRecord } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';

interface MobileCandidateDetailProps {
  candidateId: string;
  onClose?: () => void;
  onRefresh?: () => void;
}

export default function MobileCandidateDetail({ 
  candidateId, 
  onClose,
  onRefresh
}: MobileCandidateDetailProps) {
  const { data: session } = useSession();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [allDbPositions, setAllDbPositions] = useState<Position[]>([]);
  const [availableStages, setAvailableStages] = useState<any[]>([]);
  const [availableRecruiters, setAvailableRecruiters] = useState<Array<{ id: string; name: string }>>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [transitionHistory, setTransitionHistory] = useState<TransitionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'job-applied' | 'candidate-info' | 'comments-activity'>('job-applied');
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

  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (!candidateId) {
      setIsLoading(false);
      setError('Invalid candidate ID');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const [candidateRes, positionsRes, stagesRes, recruitersRes, commentsRes, attachmentsRes, transitionsRes] = await Promise.allSettled([
        fetch(`/api/candidates/${candidateId}`, {
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
        fetch(`/api/candidates/${candidateId}/comments?limit=100&offset=0`, {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        }),
        fetch(`/api/candidates/${candidateId}/resumes?limit=100&offset=0`, {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        }),
        fetch(`/api/candidates/${candidateId}/transitions`, {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        })
      ]);

      if (!mountedRef.current) return;

      if (candidateRes.status === 'fulfilled' && candidateRes.value.ok) {
        const candidateData = await candidateRes.value.json();
        setCandidate(candidateData);
      } else {
        setError('Candidate not found');
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
      console.error('Error loading candidate data:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to load candidate data');
        setIsLoading(false);
      }
    }
  }, [candidateId]);

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
    if (!candidate?.id) return;
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete candidate');
      toast.success('Candidate deleted');
      setIsDeleteModalOpen(false);
      setIsActionsModalOpen(false);
      if (onClose) onClose();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete candidate');
    }
  };

  const handleChangeStatus = async () => {
    if (!candidate?.id || !newStatus) return;
    try {
      const res = await fetch('/api/candidates/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'change_status',
          candidateIds: [candidate.id],
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
    if (!candidate?.id) return;
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/assign-recruiter`, {
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
    if (!candidate?.id) return;
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPinned: !candidate.isPinned }),
      });
      if (!res.ok) throw new Error('Failed to update pin status');
      toast.success(candidate.isPinned ? 'Unpinned' : 'Pinned');
      setIsActionsModalOpen(false);
      handleRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update pin status');
    }
  };

  const handleReprocess = async () => {
    if (!candidate?.id) return;
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/reprocess`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to reprocess');
      toast.success('Reprocessing candidate...');
      setIsActionsModalOpen(false);
      handleRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reprocess');
    }
  };

  // Get applied job info
  const appliedJobId = candidate?.positionId || null;
  const appliedFitScore = candidate?.fitScore || null;
  const appliedJustification: string[] = Array.isArray(candidate?.assignmentJustification) 
    ? candidate.assignmentJustification 
    : (candidate?.assignmentJustification ? [candidate.assignmentJustification] : []);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <p className="text-destructive mb-4">{error || 'Candidate not found'}</p>
        <Button onClick={loadData}>Retry</Button>
      </div>
    );
  }

  const nameInfo = formatCandidateNameWithLang(candidate);
  const personalInfo = (() => {
    let parsedDataObj: any = {};
    if (candidate.parsedData) {
      if (typeof candidate.parsedData === 'string') {
        try {
          parsedDataObj = JSON.parse(candidate.parsedData);
        } catch (e) {
          parsedDataObj = {};
        }
      } else {
        parsedDataObj = candidate.parsedData;
      }
    }
    return parsedDataObj.personal_info || {};
  })();

  const education = (() => {
    if (Array.isArray(candidate.educationData) && candidate.educationData.length > 0) {
      return candidate.educationData;
    }
    const parsedData = candidate.parsedData;
    if (parsedData && typeof parsedData === 'object') {
      if ('education' in parsedData) {
        return (parsedData as any).education || [];
      }
    }
    return [];
  })();

  const experience = (() => {
    if (Array.isArray(candidate.experienceData) && candidate.experienceData.length > 0) {
      return candidate.experienceData;
    }
    const parsedData = candidate.parsedData;
    if (parsedData && typeof parsedData === 'object') {
      if ('experience' in parsedData) {
        return (parsedData as any).experience || [];
      }
    }
    return [];
  })();

  return (
    <div ref={mainContainerRef} className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Header - Full page with back arrow */}
      <div className={cn(
        "flex-shrink-0 border-b sticky top-0 z-10 transition-all duration-300",
        isScrolled 
          ? "bg-background/80 backdrop-blur-md shadow-sm" 
          : "bg-background/95 backdrop-blur-sm"
      )}>
        <div className="flex items-center gap-3 p-4">
          {/* Back Arrow */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-11 w-11 flex-shrink-0 touch-manipulation"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={candidate.avatarUrl || undefined} alt={candidate.name || ''} />
            <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
              {candidate.name?.charAt(0)?.toUpperCase() || 'C'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className={cn("text-lg font-bold truncate", nameInfo.fontClass)} lang={nameInfo.lang}>
                {candidate.name}
              </h2>
              {candidate.isPinned && (
                <Pin className="h-4 w-4 text-primary rotate-45 fill-current flex-shrink-0" />
              )}
            </div>
            {candidate.email && (
              <p className="text-sm text-muted-foreground truncate mb-1.5">{candidate.email}</p>
            )}
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <StatusBadge 
                statusId={candidate.statusId} 
                status={candidate.status}
                stageNames={stageNames}
                className="text-xs"
              />
            </div>
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
              onClick={() => setActiveTab('candidate-info')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer flex-shrink-0 touch-manipulation",
                activeTab === 'candidate-info'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <User className="h-4 w-4" />
              Candidate Info
            </div>
            <div
              onClick={() => setActiveTab('comments-activity')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer flex-shrink-0 touch-manipulation",
                activeTab === 'comments-activity'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Comments & Activity
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          {/* Job Applied Tab */}
          {activeTab === 'job-applied' && (
            <div className="h-full w-full overflow-y-auto p-4">
              <JobAppliedTab
                candidate={candidate}
                allDbPositions={allDbPositions}
                isEditing={false}
                onCopyJobApplied={() => {}}
                copiedJobApplied={false}
                appliedJobId={appliedJobId}
                appliedFitScore={appliedFitScore}
                appliedJustification={appliedJustification}
                appliedJobBadge={appliedJobBadge}
                onOpenPositionDrawer={handleOpenPositionDrawer}
              />
            </div>
          )}

          {/* Candidate Info Tab - Merged */}
          {activeTab === 'candidate-info' && (
            <div className="h-full w-full overflow-y-auto p-4">
              <div className="space-y-6">
                {/* Candidate Info Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <CandidateInfoTab
                      candidate={candidate}
                      isEditing={false}
                    />
                  </CardContent>
                </Card>

                {/* Education Section */}
                {education.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Education
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EducationTab
                        candidate={candidate}
                        isEditing={false}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Experience Section */}
                {experience.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BriefcaseIcon className="h-4 w-4" />
                        Experience
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ExperienceTab
                        candidate={candidate}
                        isEditing={false}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Attachments Section - Small Cards with Icons */}
                {attachments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Attachments ({attachments.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {attachments.map((attachment) => {
                          const FileIconComponent = getFileIcon(attachment.fileName || attachment.name || '');
                          return (
                            <Card
                              key={attachment.id}
                              className="cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => {
                                if (attachment.filePath) {
                                  window.open(`/api/secure-file/preview?filePath=${encodeURIComponent(attachment.filePath)}&candidateId=${candidateId}`, '_blank');
                                } else if (attachment.url) {
                                  window.open(attachment.url, '_blank');
                                }
                              }}
                            >
                              <CardContent className="p-3 flex flex-col items-center justify-center gap-2 min-h-[100px]">
                                <FileIconComponent className="h-8 w-8 text-muted-foreground" />
                                <p className="text-xs text-center truncate w-full" title={attachment.fileName || attachment.name}>
                                  {attachment.fileName || attachment.name || 'Unknown'}
                                </p>
                                {attachment.label && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {attachment.label}
                                  </Badge>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Comments & Activity Tab */}
          {activeTab === 'comments-activity' && (
            <div className="h-full w-full flex flex-col overflow-hidden">
              {/* Comments Section */}
              <div className="flex-1 overflow-hidden border-b min-h-0">
                <div className="p-4 border-b flex-shrink-0">
                  <h3 className="text-base font-semibold">Comments</h3>
                </div>
                <div className="h-full overflow-y-auto">
                  <CandidateCommentsSection
                    candidateId={candidateId}
                    comments={comments}
                    isEditing={false}
                    onCommentsChange={handleRefresh}
                  />
                </div>
              </div>

              {/* Activity Section */}
              <div className="flex-1 overflow-hidden min-h-0">
                <div className="p-4 border-b flex-shrink-0">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Activity Timeline
                  </h3>
                </div>
                <div className="h-full overflow-y-auto">
                  <div className="p-4 space-y-4">
                    {transitionHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No activity recorded</p>
                    ) : (
                      transitionHistory.map((transition, index) => {
                        const stageName = stageNames[transition.stage] || transition.stage || 'Unknown';
                        return (
                          <div key={transition.id || index} className="flex gap-3 pb-4 border-b last:border-b-0">
                            <div className="flex-shrink-0">
                              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-xs">
                                  {stageName}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {transition.date ? format(new Date(transition.date), 'MMM dd, yyyy HH:mm') : ''}
                                </span>
                              </div>
                              {transition.notes && (
                                <p className="text-sm text-muted-foreground mt-1">{transition.notes}</p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Position Drawer */}
      {selectedPositionId && (
        <PositionDetailDrawer
          isOpen={isPositionDrawerOpen}
          onOpenChange={setIsPositionDrawerOpen}
          positionId={selectedPositionId}
        />
      )}
    </div>
  );
}

