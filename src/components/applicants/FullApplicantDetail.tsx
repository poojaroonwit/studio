"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowPathIcon as Loader2, ExclamationTriangleIcon as ServerCrash, DocumentCheckIcon as Save, XMarkIcon as X, BriefcaseIcon as Briefcase, UserIcon as User, PhoneIcon as Phone, AcademicCapIcon as GraduationCap, ClockIcon as Clock, FlagIcon as Target, ChatBubbleLeftRightIcon as MessageSquare, CloudArrowUpIcon as UploadCloud, ArrowDownTrayIcon as Download, ClipboardDocumentIcon as Copy, ArrowTopRightOnSquareIcon as ExternalLink, MapPinIcon as MapPin, CalendarIcon as CalendarIcon, UsersIcon as Users, PencilSquareIcon as Edit, ChevronLeftIcon as ChevronLeft, ChevronRightIcon as ChevronRight, NoSymbolIcon as Ban } from '@heroicons/react/24/outline';
import { QRCodeCanvas } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import * as z from 'zod';

// Import extracted components
import { ApplicantHeader } from './ApplicantHeader';
import { ApplicantPipelineSection } from './ApplicantPipelineSection';
import { ApplicantTabsContent } from './ApplicantTabsContent';
import { ApplicantSidebar } from './ApplicantSidebar';

// Import modals
import UploadResumeModal from './UploadResumeModal';
import { ManageTransitionsModal } from './ManageTransitionsModal';

import JobMatchModal from './JobMatchModal';
import ReprocessModal from './ReprocessModal';
import { GenerativeAIModal } from './GenerativeAIModal';
import ApplicantAttachmentUploadModal from './ApplicantAttachmentUploadModal';
import { HeadcountWarningModal } from './HeadcountWarningModal';
import { DeleteApplicantModal } from './DeleteApplicantModal';
import { ApplicantEvaluationModal } from './ApplicantEvaluationModal';
import { SendInterviewInvitationModal } from './SendInterviewInvitationModal';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import { CreateEvaluateLinkModal } from '@/components/applicants/CreateEvaluateLinkModal';
import { useJobMatchFeature } from '@/hooks/useJobMatchFeature';
import { useInterviewInvitationFeature } from '@/hooks/useInterviewInvitationFeature';
import { useIsMobile } from '@/hooks/use-mobile';

// Import hooks
import { useApplicantDetail } from './hooks/use-applicant-detail';

// Import utilities
import { formatScoreWithGrade } from "@/lib/scoreUtils";
import { updateApplicantStatusWithNotes } from '@/lib/applicantTransitionUtils';
import { Badge } from '@/components/ui/badge';
import { ScoreBadge } from '@/components/ui/score-color';
import { cn, sanitizeUrl } from '@/lib/utils';

// Types
import type { Applicant, Position } from '@/lib/types';
import type { TransitionRecord } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { TiptapEditor } from '../ui/tiptap-editor';
import { canViewEvaluationLinks, canCreateEvaluationLink, canManageEvaluationLink } from '@/lib/permissions';
import { ApplicantDetailSkeleton } from './ApplicantDetailSkeleton';

interface FullApplicantDetailProps {
  applicantId: string;
  isModal?: boolean;
  onClose?: () => void;
  comments: any[];
  resumes: any[];
  onRefresh: () => void;
  initialApplicant?: Applicant | null;
}

const FullApplicantDetail: React.FC<FullApplicantDetailProps> = ({
  applicantId,
  isModal = false,
  onClose,
  comments,
  resumes,
  onRefresh,
  initialApplicant = null,
}) => {
  const { data: session } = useSession();
  const { isJobMatchEnabled } = useJobMatchFeature();
  const { isInterviewInvitationEnabled } = useInterviewInvitationFeature();
  const { success: toastSuccess, error: toastError } = useToast();
  const isMobile = useIsMobile();

  // Permission checks for evaluation links
  const canViewEvalLinks = canViewEvaluationLinks(session?.user).canView;
  const canCreateEvalLink = (applicant: any) => canCreateEvaluationLink(session?.user, applicant?.recruiterId, session?.user?.id || '').canCreate;
  const canManageEvalLink = (linkCreatedById: string | null | undefined) => canManageEvaluationLink(session?.user, linkCreatedById, session?.user?.id || '').canManage;
  const [avatarInputRef] = useState<React.RefObject<HTMLInputElement>>(React.createRef());


  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTransitionsModalOpen, setIsTransitionsModalOpen] = useState(false);
  const [isJobMatchModalOpen, setIsJobMatchModalOpen] = useState(false);

  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [isReprocessModalOpen, setIsReprocessModalOpen] = useState(false);
  const [isGenerativeAIModalOpen, setIsGenerativeAIModalOpen] = useState(false);
  const [isHeadcountWarningModalOpen, setIsHeadcountWarningModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isEvalLinkModalOpen, setIsEvalLinkModalOpen] = useState(false);
  const [isSendInvitationModalOpen, setIsSendInvitationModalOpen] = useState(false);
  const [isCreateEvalLinkModalOpen, setIsCreateEvalLinkModalOpen] = useState(false);
  const [evalLinkUrl, setEvalLinkUrl] = useState<string | null>(null);
  const [evalLinkExpiresAt, setEvalLinkExpiresAt] = useState<string | null>(null);
  const [evalLinkCreatedBy, setEvalLinkCreatedBy] = useState<{ id: string; name: string; email: string } | null>(null);
  const [evalExpireDays, setEvalExpireDays] = useState<number>(7);
  const [evalRequireLogin, setEvalRequireLogin] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [footerStatusNote, setFooterStatusNote] = useState('');
  const [footerRejectNote, setFooterRejectNote] = useState('');
  const [isFooterPopoverOpen, setIsFooterPopoverOpen] = useState(false);
  const [isRejectPopoverOpen, setIsRejectPopoverOpen] = useState(false);

  // QR Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState<{ name: string, url: string, avatarUrl: string | null, expiresAt?: string } | null>(null);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [isEditingEvalLink, setIsEditingEvalLink] = useState(false);

  // Fetch App Logo
  useEffect(() => {
    fetch('/api/settings/system-settings?keys=qrCodeLogo,appLogoDataUrl')
      .then(res => res.json())
      .then(data => {
        if (data.qrCodeLogo) setAppLogoUrl(sanitizeUrl(data.qrCodeLogo));
        else if (data.appLogoDataUrl) setAppLogoUrl(sanitizeUrl(data.appLogoDataUrl));
      })
      .catch(err => console.error('Failed to fetch QR code logo', err));
  }, []);

  // Render QR Code Modal Content
  const renderQrCodeContent = () => {
    if (!qrData) return null;
    return (
      <div className="flex flex-col items-center py-6 space-y-6">
        {/* QR Code */}
        <div className="bg-white p-8 rounded-3xl border-2 border-gray-200">
          <div className="overflow-hidden rounded-2xl">
            <QRCodeCanvas
              id="evaluation-qr-code-modal"
              value={qrData.url}
              size={240}
              level={"H"}
              imageSettings={appLogoUrl ? {
                src: appLogoUrl,
                x: undefined,
                y: undefined,
                height: 44,
                width: 44,
                excavate: true,
              } : undefined}
              style={{
                display: 'block',
                borderRadius: '12px'
              }}
            />
          </div>
        </div>

        {/* Applicant Name below QR */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Applicant</p>
          <h3 className="font-semibold text-lg">{qrData.name}</h3>
          {qrData.expiresAt && (() => {
            const expiresAt = new Date(qrData.expiresAt);
            const now = new Date();
            const diffMs = expiresAt.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            let text = '';
            if (diffMs <= 0) text = 'Expired';
            else if (diffDays > 1) text = `Expires in ${diffDays} days`;
            else text = 'Expires soon';

            return (
              <p className={cn("text-xs mt-1", diffMs <= 0 ? "text-destructive" : "text-muted-foreground")}>
                {text} ({expiresAt.toLocaleDateString()})
              </p>
            );
          })()}
        </div>

        {/* Buttons */}
        <div className="flex flex-col w-full gap-3 px-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              const canvas = document.getElementById('evaluation-qr-code-modal') as HTMLCanvasElement;
              if (canvas) {
                const newCanvas = document.createElement('canvas');
                const padding = 64;
                const borderWidth = 4;
                const totalSize = 240 + (padding * 2) + (borderWidth * 2);

                newCanvas.width = totalSize;
                newCanvas.height = totalSize;
                const ctx = newCanvas.getContext('2d');

                if (ctx) {
                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(0, 0, totalSize, totalSize);
                  ctx.strokeStyle = '#e5e7eb';
                  ctx.lineWidth = borderWidth;
                  ctx.strokeRect(borderWidth / 2, borderWidth / 2, totalSize - borderWidth, totalSize - borderWidth);
                  ctx.drawImage(canvas, padding + borderWidth, padding + borderWidth);

                  newCanvas.toBlob((blob) => {
                    if (blob) {
                      const url = URL.createObjectURL(blob);
                      const safeUrl = sanitizeUrl(url);
                      if (safeUrl) {
                        const downloadLink = document.createElement("a");
                        downloadLink.href = safeUrl;
                        downloadLink.download = `evaluation-qr-${qrData.name.replace(/\s+/g, '_')}.png`;
                        downloadLink.click();
                        URL.revokeObjectURL(url);
                      }
                    }
                  }, 'image/png');
                }
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Download QR Code
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              // Close QR modal and open edit modal with existing data
              setIsQrModalOpen(false);
              setIsEditingEvalLink(true);
              // Fetch applicant data to get interview details
              if (applicant?.id) {
                setIsCreateEvalLinkModalOpen(true);
              }
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Interview Details
          </Button>


          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                const safeUrl = sanitizeUrl(qrData.url);
                if (safeUrl) {
                  window.open(safeUrl, '_blank', 'noopener,noreferrer');
                } else {
                  toastError('Invalid URL');
                }
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Go to Link
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(qrData.url);
                toastSuccess('Link copied');
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Position drawer state
  const [isPositionDrawerOpen, setIsPositionDrawerOpen] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);

  // Headcount warning state
  const [headcountWarningData, setHeadcountWarningData] = useState<{
    applicantName: string;
    positionTitle?: string;
    errorMessage: string;
  } | null>(null);

  // Add a ref to track when the modal was opened to prevent premature closing
  const headcountModalOpenTimeRef = useRef<number | null>(null);

  // Add state to track when headcount warning was shown to prevent immediate reopening of transitions modal
  const [headcountWarningShownTime, setHeadcountWarningShownTime] = useState<number | null>(null);

  // Function to open position drawer
  const handleOpenPositionDrawer = (positionId: string) => {
    setSelectedPositionId(positionId);
    setIsPositionDrawerOpen(true);
  };

  // Function to handle applicant deletion
  const handleDeleteApplicant = async () => {
    if (!applicant?.id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/applicants/${applicant.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete Applicant');
      }

      toastSuccess('Applicant deleted successfully');

      // Close the modal/detail view
      if (onClose) {
        onClose();
      } else {
        // If not in modal, redirect to Applicants list
        window.location.href = '/applicants';
      }
    } catch (error: any) {
      console.error('Error deleting applicant:', error);
      toastError(error.message || 'Failed to delete Applicant');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };




  // Wrap setHeadcountWarningData to add debugging
  const setHeadcountWarningDataWithDebug = (data: typeof headcountWarningData) => {
    setHeadcountWarningData(data);
  };




  // Prevent modal from being closed unexpectedly
  const closeHeadcountWarningModal = useCallback(() => {
    // Check if modal was opened recently (within last 2 seconds) to prevent premature closing
    if (headcountModalOpenTimeRef.current) {
      const timeSinceOpen = Date.now() - headcountModalOpenTimeRef.current;
      if (timeSinceOpen < 2000) {
        return;
      }
    }

    setIsHeadcountWarningModalOpen(false);
    setHeadcountWarningDataWithDebug(null);
    headcountModalOpenTimeRef.current = null;
    setHeadcountWarningShownTime(null);
  }, []);


  // Auto-clear headcount warning timestamp after 5 seconds to allow transitions modal to be reopened
  useEffect(() => {
    if (headcountWarningShownTime) {
      const timer = setTimeout(() => {
        setHeadcountWarningShownTime(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [headcountWarningShownTime]);

  // Selection states
  const [preselectedStage, setPreselectedStage] = useState<string | null>(null);
  const [selectedJobMatch, setSelectedJobMatch] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<string>('jobs');

  // Refs for timeout cleanup
  const copiedJobAppliedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const copiedJobMatchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized callback for comments change - MUST be called before use-applicant-detail hook
  const handleCommentsChange = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  // Use custom hook for Applicant detail logic
  const {
    applicant,
    loading,
    error,
    isEditing,
    allDbPositions,
    availableRecruiter,
    availableSources,
    availableStages,
    transitionHistory,
    applicantJobMatches,
    isAssigningRecruiter,
    isAssigningSource,
    avatarUploading,
    avatarError,
    avatarForceRefresh,
    copiedJobApplied,
    copiedJobMatchIndex,
    isSaving,
    realtimeConnected,
    formPopulated,

    // Form
    control,
    handleSubmit,
    reset,
    register,
    errors,
    watch,
    setValue,
    educationFields,
    appendEducation,
    removeEducation,
    experienceFields,
    appendExperience,
    removeExperience,
    skillsFields,
    appendSkill,
    removeSkill,
    jobSuitableFields,
    appendJobSuitable,
    removeJobSuitable,
    jobMatchesFields,
    appendJobMatch,
    removeJobMatch,
    setApplicant,
    setTransitionHistory,
    // Actions
    setIsEditing,
    setCopiedJobApplied,
    setCopiedJobMatchIndex,
    setIsSaving,
    setIsAssigningRecruiter,
    setIsAssigningSource,
    // Functions
    calculateTotalExperienceDuration,
    calculateAverageDurationPerCompany,
    handleAssignRecruiter,
    handleAssignSource,
    handleAvatarUpload,
    handleEnterEditMode,
    customFieldsRefreshTrigger,
    refreshCustomFields,
    handleTogglePin,
    handleToggleBlacklist,
    handleToggleRead,
  } = useApplicantDetail(applicantId, { initialApplicant });

  // Handle custom field changes - MUST be called after use-applicant-detail but before any early returns
  const handleCustomFieldChange = useCallback((fieldCode: string, value: any) => {
    setApplicant(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        customFields: {
          ...prev.customFields,
          [fieldCode]: value
        }
      };
    });
  }, [setApplicant]);

  // Cleanup timeouts on component unmount
  React.useEffect(() => {
    return () => {
      if (copiedJobAppliedTimeoutRef.current) {
        clearTimeout(copiedJobAppliedTimeoutRef.current);
      }
      if (copiedJobMatchTimeoutRef.current) {
        clearTimeout(copiedJobMatchTimeoutRef.current);
      }
    };
  }, []);

  // Loading state - must happen after all hooks
  if (loading) {
    return <ApplicantDetailSkeleton />;
  }

  // Error state
  if (error || !applicant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4 text-center">
          <ServerCrash className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="text-lg font-medium text-foreground">Failed to load Applicant</h3>
            <p className="text-muted-foreground text-sm mb-4">{error || 'Applicant not found'}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
            >
              <Loader2 className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Event handlers

  const openManageTransitionsModal = (stageIdOrName?: string) => {
    // Prevent opening transitions modal if headcount warning was recently shown (within last 3 seconds)
    if (headcountWarningShownTime && (Date.now() - headcountWarningShownTime) < 3000) {
      toastError('Please resolve the headcount constraint before changing Applicant status.');
      return;
    }

    const resolvedStageId =
      availableStages.find((stage) => stage.id === stageIdOrName || stage.name === stageIdOrName)?.id ||
      applicant?.statusId ||
      availableStages.find((stage) => stage.name === applicant?.status)?.id ||
      availableStages[0]?.id ||
      null;

    setPreselectedStage(resolvedStageId);
    setIsTransitionsModalOpen(true);
  };

  const handleJobMatchClick = (jobMatch: any) => {
    if (!isJobMatchEnabled) return;

    const position = Array.isArray(allDbPositions)
      ? (allDbPositions.find(p => p.id === jobMatch.jobId) || allDbPositions.find(p => p.title === jobMatch.jobTitle))
      : null;

    const jobMatchData = {
      jobId: position ? position.id : jobMatch.jobId,
      jobTitle: position ? position.title : jobMatch.jobTitle,
      fitScore: jobMatch.fitScore,
      matchReasons: jobMatch.matchReasons || [],
      position: position
        ? {
          id: position.id,
          title: position.title,
          description: position.description,
          department: position.department,
          requirements: (position as any).requirements,
          isOpen: position.isOpen,
        }
        : undefined,
    };
    setSelectedJobMatch(jobMatchData);
    setIsJobMatchModalOpen(true);
  };

  const copyJobAppliedToClipboard = async () => {
    if (!applicant?.positionId) return;

    const position = Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === applicant.positionId) : null;
    const jobTitle = position?.title || 'Unknown Position';
    const fitScore = formatScoreWithGrade(applicant.fitScore);
    const justification = applicant.assignmentJustification
      ? (Array.isArray(applicant.assignmentJustification)
        ? applicant.assignmentJustification.filter(Boolean)
        : typeof applicant.assignmentJustification === 'string'
          ? applicant.assignmentJustification.split('\n').map((sentence: string) => sentence.trim()).filter(Boolean)
          : [])
      : [];

    const textToCopy = `Job Applied: ${jobTitle}\nFit Score: ${fitScore}\nJustification:\n• ${justification.join('\n• ')}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedJobApplied(true);

      // Clear any existing timeout
      if (copiedJobAppliedTimeoutRef.current) {
        clearTimeout(copiedJobAppliedTimeoutRef.current);
      }

      copiedJobAppliedTimeoutRef.current = setTimeout(() => setCopiedJobApplied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const copyJobMatchToClipboard = async (match: any, index: number) => {
    if (!isJobMatchEnabled) return;

    const position = Array.isArray(allDbPositions) ?
      (allDbPositions.find(p => p.id === match.jobId) ||
        allDbPositions.find(p => p.title === match.jobTitle)) : null;

    const displayTitle = position?.title || match.jobTitle || match.positionTitle || 'Unknown Position';
    const fitScore = match.fitScore !== undefined && match.fitScore !== null
      ? `${formatScoreWithGrade(match.fitScore)}`
      : 'Not set';
    const matchReasons = match.matchReasons && Array.isArray(match.matchReasons) && match.matchReasons.length > 0
      ? match.matchReasons.join('\n• ')
      : 'No match reasons provided';

    const textToCopy = `Job Match: ${displayTitle}\nFit Score: ${fitScore}\nMatch Reasons:\n• ${matchReasons}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedJobMatchIndex(index);

      // Clear any existing timeout
      if (copiedJobMatchTimeoutRef.current) {
        clearTimeout(copiedJobMatchTimeoutRef.current);
      }

      copiedJobMatchTimeoutRef.current = setTimeout(() => setCopiedJobMatchIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleSaveDetails = async (data: any) => {
    if (!applicant) return;

    // Validation check removed

    if (isSaving) return;
    setIsSaving(true);

    try {
      // Compose full name from title + first name + last name
      const personalInfo = data.parsedData?.personal_info || {};
      const title = personalInfo.title_honorific || '';
      const firstName = personalInfo.firstname || '';
      const lastName = personalInfo.lastname || '';

      const fullName = [title, firstName, lastName].filter(Boolean).join(' ').trim();

      const resolvedStatusId =
        availableStages.find((stage) => stage.id === data.status || stage.name === data.status)?.id ||
        applicant.statusId ||
        data.status;

      // Add the composed name and custom fields to the data being sent
      const dataWithName = {
        ...data,
        name: fullName || applicant.name, // Fallback to existing name if composition is empty
        status: resolvedStatusId,
        customFields: applicant.customFields || {} // Include updated custom fields from state
      };

      const res = await fetch(`/api/applicants/${applicant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataWithName),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Failed to update applicant: ${errorData.message || res.statusText}`);
      }

      const updatedApplicant = await res.json();
      setIsEditing(false);
      toastSuccess('Applicant updated successfully');

      // Refresh custom fields to show latest data
      refreshCustomFields();

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error updating applicant:', err);
      toastError(err instanceof Error ? err.message : 'Failed to update Applicant');
    } finally {
      setIsSaving(false);
    }
  };

  // Job applied data
  const appliedJobId = applicant?.positionId;
  const appliedFitScore = applicant?.fitScore;
  const appliedJustification = applicant?.assignmentJustification
    ? (Array.isArray(applicant.assignmentJustification)
      ? applicant.assignmentJustification.filter(Boolean)
      : typeof applicant.assignmentJustification === 'string'
        ? applicant.assignmentJustification.split('\n').map((sentence: string) => sentence.trim()).filter(Boolean)
        : [])
    : [];

  let appliedJobBadge = null;
  if (appliedJobId) {
    const appliedPosition = allDbPositions.find(p => p.id === appliedJobId);
    const hasGrade = appliedPosition?.gradeId && appliedPosition?.grade;

    if (hasGrade) {
      appliedJobBadge = (
        <div className="flex items-center gap-2">
          {hasGrade && appliedPosition?.grade && (
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: appliedPosition.grade.color || '#3B82F6',
                color: appliedPosition.grade.color || '#3B82F6'
              }}
            >
              {appliedPosition.grade.name}
            </Badge>
          )}
        </div>
      );
    }
  }

  const handleStatusUpdate = async (status: string, notes?: string, suppressToast?: boolean): Promise<boolean | undefined> => {
    if (!applicantId) return;

    setIsStatusUpdating(true);
    // Store original state for potential reversion
    const originalApplicant = applicant;
    const originalTransitionHistory = transitionHistory;

    try {
      // Check if this is a status change to "Hired" or similar hiring status
      // First, find the stage name for the given status ID
      const selectedStage = availableStages.find(stage => stage.id === status);
      const stageName = selectedStage?.name || status;

      const isHiringStatus = stageName.toLowerCase().includes('hired') ||
        stageName.toLowerCase().includes('hiring') ||
        stageName.toLowerCase().includes('employed');

      if (isHiringStatus && applicant?.positionId) {
        // Check headcount availability before proceeding
        try {
          const response = await fetch(`/api/headcount/validate-hiring?applicantId=${applicantId}&positionId=${applicant.positionId}`);
          const validationResult = await response.json();

          if (!validationResult.canHire) {
            // Close the ManageTransitionsModal when showing headcount warning
            setIsTransitionsModalOpen(false);
            setPreselectedStage(null);

            // Get position title for the warning
            const positionTitle = allDbPositions.find(p => p.id === applicant.positionId)?.title;

            // Set warning data and show modal
            setHeadcountWarningDataWithDebug({
              applicantName: applicant?.name || 'Unknown applicant',
              positionTitle,
              errorMessage: validationResult.message
            });

            // Open modal to block the status change
            headcountModalOpenTimeRef.current = Date.now();
            setHeadcountWarningShownTime(Date.now());
            setIsHeadcountWarningModalOpen(true);

            // IMPORTANT: Status change was blocked
            return;
          }
        } catch (validationError) {
          console.error('Error validating headcount availability:', validationError);
          // If validation fails, show error and don't proceed
          toastError('Failed to validate headcount availability. Please try again.');
          return false;
        }
      }

      // If we reach here, either it's not a hiring status or headcount is available
      // Proceed with normal status update logic

      // Apply optimistic update immediately
      if (applicant) {
        // Optimistically update the Applicant status
        setApplicant(prev => prev ? {
          ...prev,
          statusId: status,
          status: selectedStage?.name || prev.status,
          updatedAt: new Date().toISOString()
        } : null);

        // Optimistically add a new transition record
        const optimisticTransition: TransitionRecord = {
          id: `temp-${Date.now()}`,
          applicantId: applicantId,
          stage: status,
          notes: notes || undefined,
          actingUserId: session?.user?.id || null,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Update transition history optimistically
        setTransitionHistory(prev => [optimisticTransition, ...(Array.isArray(prev) ? prev : [])]);
      }

      // Make the actual API call
      await updateApplicantStatusWithNotes(applicantId, status, notes, suppressToast, {
        success: toastSuccess,
        error: toastError
      });

      // Successfully completed - return true to indicate transaction passed
      return true;
    } catch (error: any) {
      console.error('FullApplicantDetail - Error updating Applicant status:', error);

      // For any errors, revert optimistic updates
      if (originalApplicant) {
        // Revert Applicant status to original
        setApplicant(originalApplicant);

        // Revert transition history to original
        setTransitionHistory(originalTransitionHistory);
      }

      // Show error toast
      if (!suppressToast) {
        toastError(error?.message || 'Failed to update status.');
      } else {
        // If suppressToast is true, re-throw the error so the calling component can handle it
        throw error;
      }

      // Error handled - return false to indicate transaction failed
      return false;
    } finally {
      setIsStatusUpdating(false);
    }
  };

  return (
    <div className={isModal ? "h-full flex flex-col bg-background pointer-events-auto" : "h-full flex flex-col bg-background"}>
      {/* Mobile Header with Back Button */}
      {isMobile && !isModal && (
        <div className="flex items-center gap-2 p-2 border-b bg-background sticky top-0 z-[100]">
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <span className="font-semibold text-lg">Back</span>
        </div>
      )}

      {/* Header */}
      <div className="relative">
        <ApplicantHeader
          applicant={applicant}
          isModal={isModal}
          onClose={onClose}
          isEditing={isEditing}
          availableStages={availableStages}
          availableRecruiter={availableRecruiter}
          availableSources={availableSources}
          isAssigningRecruiter={isAssigningRecruiter}
          isAssigningSource={isAssigningSource}
          onAssignRecruiter={handleAssignRecruiter}
          onAssignSource={handleAssignSource}
          onResetAssigning={() => setIsAssigningRecruiter(false)}
          onResetSourceAssigning={() => setIsAssigningSource(false)}
          onEditClick={handleEnterEditMode}
          onManageTransitions={openManageTransitionsModal}
          onReprocess={() => setIsReprocessModalOpen(true)}
          onGenerativeAI={() => setIsGenerativeAIModalOpen(true)}
          onEvaluate={async () => {
            // Reset existing link data
            setEvalLinkUrl(null);
            setEvalLinkExpiresAt(null);

            // Try to load existing active link
            try {
              if (applicant?.id) {
                const res = await fetch(`/api/v1/applicants/${applicant.id}/evaluation-link`, { credentials: 'include' });
                if (res.ok) {
                  const data = await res.json();
                  if (data.url) {
                    // If link exists, show QR Code modal
                    setQrData({
                      name: applicant.name,
                      url: data.url,
                      avatarUrl: applicant.avatarUrl || null,
                      expiresAt: data.expiresAt
                    });
                    setIsQrModalOpen(true);
                  } else {
                    // If no link, show Create Wizard
                    setIsCreateEvalLinkModalOpen(true);
                  }
                } else {
                  // Fallback to create wizard on error
                  setIsCreateEvalLinkModalOpen(true);
                }
              }
            } catch (e) {
              console.error('Error checking for existing link:', e);
              // Fallback to create wizard on error
              setIsCreateEvalLinkModalOpen(true);
            }
          }}
          onSendInterviewInvitation={!isInterviewInvitationEnabled ? () => setIsSendInvitationModalOpen(true) : undefined}
          onDelete={() => setIsDeleteModalOpen(true)}
          onTogglePin={handleTogglePin}
          onToggleBlacklist={handleToggleBlacklist}
          onToggleRead={handleToggleRead}
          avatarInputRef={avatarInputRef}
          avatarUploading={avatarUploading}
          avatarError={avatarError}
          avatarForceRefresh={avatarForceRefresh}
          onAvatarUpload={handleAvatarUpload}
          realtimeConnected={realtimeConnected}
        />
      </div>

      {/* Pipeline Section - Above main content and sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-10 border-t bg-card flex-shrink-0">
        <div className="lg:col-span-10">
          <ApplicantPipelineSection
            applicant={applicant}
            availableStages={availableStages}
            transitionHistory={transitionHistory}
            onStageClick={openManageTransitionsModal}
            onNoteEdit={async (transitionId, newNote) => {
              await fetch(`/api/transitions/${transitionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: newNote }),
                credentials: 'include',
              });
              // Refresh transition history
              const res = await fetch(`/api/transitions?applicantId=${applicantId}`, { credentials: 'include' });
              if (res.ok) {
                const data = await res.json();
                // Update transition history in the hook
              }
            }}
            applicantId={applicantId}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-t bg-card flex-1 min-h-0">
        {/* Main Content with Tabs */}
        <div className="lg:col-span-8 border-r border-border bg-muted/50 flex flex-col min-h-0 pointer-events-auto">
          <div className="w-full h-full flex flex-col min-h-0 pointer-events-auto">
            <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent md:overflow-x-visible md:pb-0 md:mx-0 md:px-0" style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
              <div className="flex w-full bg-background border-b border-border flex-shrink-0 min-w-max md:min-w-0">
                <div
                  className={`text-xs flex items-center justify-center gap-2 px-4 py-4 cursor-pointer transition-colors flex-1 md:flex-1 min-w-max md:min-w-0 ${activeTab === 'jobs' ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
                  onClick={() => setActiveTab('jobs')}
                >
                  <Briefcase className="w-4 h-4" />
                  {isJobMatchEnabled ? 'Job Applied & Matched' : 'Job Applied'}
                  {(() => {
                    if (!isJobMatchEnabled) return '';
                    const jobMatches = applicantJobMatches || [];
                    const matchCount = jobMatches.length;
                    return matchCount > 0 ? ` (${matchCount})` : '';
                  })()}
                </div>
                <div
                  className={`text-xs flex items-center justify-center gap-2 px-4 py-4 cursor-pointer transition-colors flex-1 md:flex-1 min-w-max md:min-w-0 ${activeTab === 'applicant-info' ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
                  onClick={() => setActiveTab('applicant-info')}
                >
                  <User className="w-4 h-4" />
                  Applicant Info
                </div>
                <div
                  className={`text-xs flex items-center justify-center gap-2 px-4 py-4 cursor-pointer transition-colors flex-1 md:flex-1 min-w-max md:min-w-0 ${activeTab === 'education' ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
                  onClick={() => setActiveTab('education')}
                >
                  <GraduationCap className="w-4 h-4" />
                  Education
                  {(() => {
                    const education = (applicant.parsedData as any)?.education || [];
                    const educationCount = education.length;
                    return educationCount > 0 ? ` (${educationCount})` : '';
                  })()}
                </div>
                <div
                  className={`text-xs flex items-center justify-center gap-2 px-4 py-4 cursor-pointer transition-colors flex-1 md:flex-1 min-w-max md:min-w-0 ${activeTab === 'experience' ? 'border-b-2 border-primary bg-background' : 'bg-transparent'}`}
                  onClick={() => setActiveTab('experience')}
                >
                  <Clock className="w-4 h-4" />
                  Experience
                  {(() => {
                    const experience = (applicant.parsedData as any)?.experience || [];
                    const totalDuration = (() => {
                      let totalMonths = 0;
                      experience.forEach((exp: any) => {
                        let startDate: Date | null = null;
                        let endDate: Date | null = null;

                        if (exp.startYear && exp.startMonth) {
                          startDate = new Date(exp.startYear, exp.startMonth - 1);
                        }

                        if (exp.endYear && exp.endMonth) {
                          endDate = new Date(exp.endYear, exp.endMonth - 1);
                        } else if (exp.isCurrent) {
                          endDate = new Date();
                        }

                        if (startDate && endDate) {
                          const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
                          if (months > 0) {
                            totalMonths += months;
                          }
                        }
                      });

                      const years = Math.floor(totalMonths / 12);
                      const months = totalMonths % 12;

                      if (years === 0 && months === 0) return '';

                      const parts = [];
                      if (years > 0) parts.push(`${years}Y`);
                      if (months > 0) parts.push(`${months}M`);
                      return parts.join(' ');
                    })();
                    return totalDuration ? ` (${totalDuration})` : '';
                  })()}
                </div>

              </div>
            </div>

            <div className={cn("flex-1 overflow-y-auto bg-secondary/50 h-full pointer-events-auto", isMobile ? "p-4 pb-48" : "p-8")}>
              <form id="applicant-edit-form" onSubmit={handleSubmit(handleSaveDetails)} className="h-full">
                <ApplicantTabsContent
                  key={applicant?.id}
                  activeTab={activeTab}
                  applicant={applicant}
                  allDbPositions={allDbPositions}
                  isEditing={isEditing}
                  applicantJobMatches={applicantJobMatches}
                  onJobMatchClick={handleJobMatchClick}
                  onCopyJobMatch={copyJobMatchToClipboard}
                  copiedJobMatchIndex={copiedJobMatchIndex}
                  onCopyJobApplied={copyJobAppliedToClipboard}
                  copiedJobApplied={copiedJobApplied}
                  appliedJobId={appliedJobId}
                  appliedFitScore={appliedFitScore}
                  appliedJustification={appliedJustification}
                  appliedJobBadge={appliedJobBadge}
                  onOpenPositionDrawer={handleOpenPositionDrawer}
                  // Pass form control and field arrays to tabs for editing
                  control={control}
                  register={register}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                  educationFields={educationFields}
                  appendEducation={appendEducation}
                  removeEducation={removeEducation}
                  experienceFields={experienceFields}
                  appendExperience={appendExperience}
                  removeExperience={removeExperience}
                  skillsFields={skillsFields}
                  appendSkill={appendSkill}
                  removeSkill={removeSkill}
                  jobSuitableFields={jobSuitableFields}
                  appendJobSuitable={appendJobSuitable}
                  removeJobSuitable={removeJobSuitable}
                  jobMatchesFields={jobMatchesFields}
                  appendJobMatch={appendJobMatch}
                  removeJobMatch={removeJobMatch}
                  // Pass duration calculation functions
                  calculateTotalExperienceDuration={calculateTotalExperienceDuration}
                  // Pass comments and resumes for new tabs
                  comments={comments}
                  resumes={resumes}
                  onRefresh={onRefresh}
                  onCustomFieldChange={handleCustomFieldChange}
                  customFieldsRefreshTrigger={customFieldsRefreshTrigger}
                />
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={cn("flex flex-col min-h-0 pointer-events-auto", isMobile ? "lg:col-span-12 border-t border-border pb-48" : "lg:col-span-4")}>
          <ApplicantSidebar
            applicant={applicant}
            comments={comments}
            resumes={resumes}
            isEditing={isEditing}
            onRefresh={onRefresh}
            calculateTotalExperienceDuration={calculateTotalExperienceDuration}
            calculateAverageDurationPerCompany={calculateAverageDurationPerCompany}
          />
        </div>
      </div>

      {/* Modals */}
      <UploadResumeModal
        isOpen={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        applicant={applicant}
        onUploadSuccess={(updatedApplicant) => {
          setIsUploadModalOpen(false);
        }}
      />

      <ManageTransitionsModal
        isOpen={isTransitionsModalOpen}
        onOpenChange={(open) => {
          setIsTransitionsModalOpen(open);
          if (!open) setPreselectedStage(null);
        }}
        applicant={applicant}
        availableStages={availableStages}
        onUpdateApplicant={async (id: string, status: string, notes?: string, suppressToast?: boolean): Promise<boolean | undefined> => {
          return handleStatusUpdate(status, notes, suppressToast);
        }}
        onRefreshApplicantData={async (applicantId: string) => {
          // Refresh Applicant data
          await onRefresh();
        }}
        preselectedStage={preselectedStage}
        comments={comments}
        onCommentsChange={handleCommentsChange}

      />

      {isJobMatchEnabled && (
        <JobMatchModal
          isOpen={isJobMatchModalOpen}
          onClose={() => setIsJobMatchModalOpen(false)}
          jobMatch={selectedJobMatch}
        />
      )}



      <ApplicantAttachmentUploadModal
        applicantId={applicantId}
        open={isAttachmentModalOpen}
        onClose={() => setIsAttachmentModalOpen(false)}
        onUploadSuccess={onRefresh}
      />

      {applicant && (
        <ReprocessModal
          isOpen={isReprocessModalOpen}
          onOpenChange={setIsReprocessModalOpen}
          applicantId={applicant.id}
          applicantName={applicant.name || 'Unknown Applicant'}
          applicantPositionId={applicant.positionId}
          applicantSourceId={applicant.sourceId}
          attachments={resumes}
          positions={allDbPositions}
        />
      )}

      {applicant && (
        <GenerativeAIModal
          isOpen={isGenerativeAIModalOpen}
          onOpenChange={setIsGenerativeAIModalOpen}
          applicantId={applicant.id}
          applicantName={applicant.name || 'Unknown applicant'}
          onRefresh={onRefresh}
        />
      )}

      {applicant && headcountWarningData && (
        <HeadcountWarningModal
          isOpen={isHeadcountWarningModalOpen}
          onClose={closeHeadcountWarningModal}
          applicantName={headcountWarningData.applicantName}
          positionTitle={headcountWarningData.positionTitle}
          errorMessage={headcountWarningData.errorMessage}
        />
      )}

      {/* Delete Applicant Modal */}
      <DeleteApplicantModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        applicant={applicant}
        onConfirm={handleDeleteApplicant}
        isDeleting={isDeleting}
      />

      {/* Applicant Evaluation Modal */}
      <ApplicantEvaluationModal
        isOpen={isEvaluationModalOpen}
        onOpenChange={setIsEvaluationModalOpen}
        applicant={applicant}
        position={applicant.position || undefined}
      />

      {/* Send Interview Invitation Modal */}
      <SendInterviewInvitationModal
        isOpen={isSendInvitationModalOpen}
        onOpenChange={setIsSendInvitationModalOpen}
        applicant={applicant}
      />

      {/* Evaluation Link Popup */}
      <Dialog open={isEvalLinkModalOpen} onOpenChange={(open) => {
        setIsEvalLinkModalOpen(open);
        if (!open) {
          setEvalLinkUrl(null);
          setEvalLinkExpiresAt(null);
          setEvalLinkCreatedBy(null);
        }
      }}>
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>Evaluation link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {evalLinkUrl && (
              <>
                <div className="text-sm text-muted-foreground">Share this link to evaluate the Applicant.</div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={evalLinkUrl || ''}
                    className="flex-1 border rounded px-2 py-2 text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => evalLinkUrl && navigator.clipboard.writeText(evalLinkUrl).then(() => toastSuccess('Link copied'))}
                  >Copy</Button>
                  <Button onClick={() => {
                    const safeUrl = evalLinkUrl ? sanitizeUrl(evalLinkUrl) : null;
                    if (safeUrl) {
                      window.open(safeUrl, '_blank');
                    }
                  }}>Open</Button>
                </div>
                {evalLinkExpiresAt && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Expires at: {new Date(evalLinkExpiresAt).toLocaleString()}</div>
                    {evalLinkCreatedBy && (
                      <div>Created by: {evalLinkCreatedBy.name || evalLinkCreatedBy.email}</div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-3">
                  <label className="text-sm text-muted-foreground">Extend by (days)</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={evalExpireDays}
                    onChange={(e) => setEvalExpireDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                    className="w-24 border rounded px-2 py-1 text-sm"
                  />
                  <Button
                    variant="outline"
                    disabled={!canManageEvalLink(evalLinkCreatedBy?.id)}
                    onClick={async () => {
                      if (!applicant?.id || !canManageEvalLink(evalLinkCreatedBy?.id)) return;
                      try {
                        const res = await fetch(`/api/v1/applicants/${applicant.id}/evaluation-link`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ days: evalExpireDays }),
                        });
                        if (!res.ok) {
                          let serverMsg = 'Failed to extend link';
                          try {
                            const details = await res.json();
                            serverMsg = details?.message || details?.error || serverMsg;
                            if (details?.hint) serverMsg += ` - ${details.hint}`;
                          } catch { }
                          throw new Error(serverMsg);
                        }
                        const data = await res.json();
                        setEvalLinkUrl(data.url);
                        setEvalLinkExpiresAt(data.expiresAt);
                        setEvalLinkCreatedBy(data.createdBy || null);
                        toastSuccess('Expiry extended');
                      } catch (e) {
                        toastError(e instanceof Error ? e.message : 'Failed to extend link');
                      }
                    }}
                  >Extend</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>


      {/* Position Detail Drawer */}
      <PositionDetailDrawer
        isOpen={isPositionDrawerOpen}
        onOpenChange={(open) => {
          setIsPositionDrawerOpen(open);
          if (!open) {
            setSelectedPositionId(null);
          }
        }}
        positionId={selectedPositionId}
      />

      {/* Unified Create Evaluate Link Modal */}
      {applicant && (
        <CreateEvaluateLinkModal
          isOpen={isCreateEvalLinkModalOpen}
          onOpenChange={(open) => {
            setIsCreateEvalLinkModalOpen(open);
            if (!open) {
              setIsEditingEvalLink(false);
            }
          }}
          applicant={{
            id: applicant.id,
            name: applicant.name,
            email: applicant.email,
            avatarUrl: applicant.avatarUrl || null,
            positionId: applicant.positionId,
            position: applicant.position ? { id: applicant.position.id, title: applicant.position.title } : null
          }}
          editMode={isEditingEvalLink}
          initialData={isEditingEvalLink ? {
            interviewDateTime: (applicant.customAttributes as any)?.interviewDateTime,
            interviewLocation: (applicant.customAttributes as any)?.interviewLocation,
            interviewers: (applicant.customAttributes as any)?.interviewers,
          } : undefined}
          onSuccess={(linkInfo) => {
            setEvalLinkUrl(linkInfo.url);
            setEvalLinkExpiresAt(linkInfo.expiresAt);

            // Set QR data and open modal
            setQrData({
              name: applicant.name,
              url: linkInfo.url,
              expiresAt: linkInfo.expiresAt,
              avatarUrl: applicant.avatarUrl || null
            });
            setIsCreateEvalLinkModalOpen(false);
            setIsQrModalOpen(true);
            setIsEditingEvalLink(false);

            // Refresh parent's knowledge
            fetch(`/api/v1/applicants/${applicant.id}/evaluation-link`, { credentials: 'include' })
              .then(res => res.json())
              .then(data => {
                if (data.url) {
                  setEvalLinkUrl(data.url);
                  setEvalLinkExpiresAt(data.expiresAt);
                  setEvalLinkCreatedBy(data.createdBy || null);
                }
              })
              .catch(console.error);
          }}
        />
      )}

      {/* QR Code Modal - Added for FullApplicantDetail */}
      {isMobile ? (
        <Sheet open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
          <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl" forceZIndex={5005} hideCloseButton>
            <SheetHeader>
              <div className="relative flex items-center justify-center py-1">
                <SheetTitle className="text-center">Evaluation Link QR Code</SheetTitle>
                <SheetClose className="absolute right-0 top-1/2 -translate-y-1/2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </SheetClose>
              </div>
            </SheetHeader>
            {renderQrCodeContent()}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">Evaluation Link QR Code</DialogTitle>
            </DialogHeader>
            {renderQrCodeContent()}
          </DialogContent>
        </Dialog>
      )}

      {/* Floating Save/Cancel buttons when editing */}
      {isEditing && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-2 applicant-edit-buttons" style={{ zIndex: 2000 }}>
          {/* Validation error display removed */}

          <div className="flex gap-2">
            <Button
              type="submit"
              form="applicant-edit-form"
              disabled={isSaving}
              className="shadow-lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="shadow-lg"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Footer Actions - Reject and Next Stage */}
      {!isEditing && applicant && availableStages.length > 0 && (
        <div className="border-t bg-background p-4 flex justify-end items-center gap-3 flex-shrink-0 z-[50]">
          {(() => {
            const rejectedStage = availableStages.find(s => s.name.toLowerCase() === 'rejected');
            const currentStatusId = applicant.statusId;
            const currentStatusName = (applicant.status || '').toLowerCase();
            
            const currentStageIndex = availableStages.findIndex(s => 
              s.id === currentStatusId || s.name.toLowerCase() === currentStatusName
            );
            
            const nextStage = currentStageIndex !== -1 && currentStageIndex < availableStages.length - 1
              ? availableStages[currentStageIndex + 1]
              : null;

            return (
              <>
                {rejectedStage && currentStatusId !== rejectedStage.id && currentStatusName !== 'rejected' && (
                  <Popover open={isRejectPopoverOpen} onOpenChange={setIsRejectPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isStatusUpdating}
                        className="text-destructive hover:text-white hover:bg-destructive border-destructive/20 font-medium transition-all"
                      >
                        Reject
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4 border-destructive/20 shadow-lg shadow-destructive/5" align="start" side="top" sideOffset={10}>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold leading-none text-destructive flex items-center gap-2">
                            <Ban className="h-4 w-4" />
                            Confirm Rejection
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            This will move the applicant to the <span className="font-semibold text-foreground">Reject</span> stage.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="reject-note" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            REASON / NOTE (OPTIONAL)
                          </label>
                          <Textarea
                            id="reject-note"
                            placeholder="Add a reason for rejection..."
                            value={footerRejectNote}
                            onChange={(e) => setFooterRejectNote(e.target.value)}
                            className="min-h-[100px] text-sm resize-none focus:ring-1 focus:ring-destructive/20"
                          />
                        </div>
                        <div className="flex justify-start gap-2 pt-2">
                          <Button 
                            size="sm" 
                            variant="destructive"
                            disabled={isStatusUpdating}
                            onClick={async () => {
                              const result = await handleStatusUpdate(rejectedStage.id, footerRejectNote);
                              if (result) {
                                setFooterRejectNote('');
                                setIsRejectPopoverOpen(false);
                              }
                            }}
                            className="h-8 px-4 text-xs font-semibold"
                          >
                            {isStatusUpdating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Confirm Rejection'
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setIsRejectPopoverOpen(false);
                              setFooterRejectNote('');
                            }}
                            disabled={isStatusUpdating}
                            className="h-8 px-3 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {nextStage && (
                  <Popover open={isFooterPopoverOpen} onOpenChange={setIsFooterPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        disabled={isStatusUpdating}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-all"
                      >
                        {isStatusUpdating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Move to {nextStage.name}
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="end" side="top" sideOffset={10}>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold leading-none text-foreground">Confirm Next Step</h4>
                          <p className="text-sm text-muted-foreground">
                            Move applicant to <strong>{nextStage.name}</strong> stage.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="footer-note" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            OPTIONAL NOTE
                          </label>
                          <Textarea
                            id="footer-note"
                            placeholder="Add a note about this transition..."
                            value={footerStatusNote}
                            onChange={(e) => setFooterStatusNote(e.target.value)}
                            className="min-h-[100px] text-sm resize-none focus:ring-1 focus:ring-primary/20"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setIsFooterPopoverOpen(false);
                              setFooterStatusNote('');
                            }}
                            disabled={isStatusUpdating}
                            className="h-8 px-3 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button 
                            size="sm" 
                            disabled={isStatusUpdating}
                            onClick={async () => {
                              const result = await handleStatusUpdate(nextStage.id, footerStatusNote);
                              if (result) {
                                setFooterStatusNote('');
                                setIsFooterPopoverOpen(false);
                              }
                            }}
                            className="h-8 px-4 text-xs font-semibold"
                          >
                            {isStatusUpdating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Confirm'
                            )}
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default FullApplicantDetail;
