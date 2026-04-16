import React, { useState, useEffect } from 'react';
import { ApplicantAvatar } from '@/components/ui/applicant-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PencilIcon as Edit, PencilSquareIcon as Edit3, EllipsisVerticalIcon as MoreVertical, ArrowPathIcon as RefreshCw, UsersIcon as Users, XMarkIcon as X, CpuChipIcon as BrainCircuit, ArrowUpTrayIcon as Upload, TrashIcon as Trash2, ArrowTopRightOnSquareIcon as ExternalLink, ClipboardDocumentIcon as Copy, FlagIcon as Target, CalendarIcon as Calendar, NoSymbolIcon as Ban, EnvelopeIcon, EnvelopeOpenIcon } from '@heroicons/react/24/outline';
import { Pin } from 'lucide-react';
import { formatApplicantNameWithLang } from "@/lib/applicantUtils";
import { useToast } from '@/hooks/use-toast';
import type { Applicant, UserProfile, RecruitmentStage, ApplicantSource } from '@/lib/types';
import { ApplicantRecruiterCell } from './ApplicantRecruiterCell';
import { ApplicantSourceCell } from './ApplicantSourceCell';
import { BlacklistBadge } from './BlacklistBadge';
import { StatusBadge } from './ApplicantKanbanView';
import { useStageColors } from '@/hooks/use-stage-colors';
import { useDynamicZIndex } from '@/contexts/ZIndexContext';
import { getCachedAvatarUrl, convertMinIOUrlToSecureUrl } from '@/lib/imageUtils';
import { sanitizeUrl, cn } from '@/lib/utils';

interface ApplicantHeaderProps {
  applicant: Applicant;
  isModal?: boolean;
  onClose?: () => void;
  isEditing: boolean;
  availableStages: RecruitmentStage[];
  availableRecruiter: UserProfile[];
  availableSources: ApplicantSource[];
  isAssigningRecruiter: boolean;
  isAssigningSource: boolean;
  onAssignRecruiter: (recruiterId: string | null) => void;
  onAssignSource: (applicantId: string, sourceId: string | null, subSource?: string | null) => void;
  onResetAssigning: () => void;
  onResetSourceAssigning: () => void;
  onEditClick: () => void;
  onManageTransitions: () => void;
  onReprocess: () => void;
  onGenerativeAI: () => void;
  onEvaluate: () => void;
  onSendInterviewInvitation?: () => void;
  onDelete: () => void;
  onTogglePin?: () => void;
  onToggleBlacklist: () => void;
  onToggleRead?: () => void;
  avatarInputRef: React.RefObject<HTMLInputElement>;
  avatarUploading: boolean;
  avatarError: string | null;
  avatarForceRefresh: boolean;
  onAvatarUpload: (file: File) => void;
  realtimeConnected?: boolean;
}



export const ApplicantHeader: React.FC<ApplicantHeaderProps> = ({
  applicant,
  isModal,
  onClose,
  isEditing,
  availableStages,
  availableRecruiter,
  availableSources,
  isAssigningRecruiter,
  isAssigningSource,
  onAssignRecruiter,
  onAssignSource,
  onResetAssigning,
  onResetSourceAssigning,
  onEditClick,
  onManageTransitions,
  onReprocess,
  onGenerativeAI,
  onEvaluate,
  onSendInterviewInvitation,
  onDelete,
  onTogglePin,
  onToggleBlacklist,
  onToggleRead,
  avatarInputRef,
  avatarUploading,
  avatarError,
  avatarForceRefresh,
  onAvatarUpload,
  realtimeConnected
}) => {
  const { data: session } = useSession();
  const { success: toastSuccess } = useToast();
  const { contentZIndex } = useDynamicZIndex('applicant-header', 'overlay');
  const nameInfo = formatApplicantNameWithLang(applicant);
  const stageId = applicant.statusId || applicant.status || '';
  const { stageColors } = useStageColors(stageId ? [stageId] : []);
  const stageNames = React.useMemo(() => {
    const map: Record<string, string> = {};
    availableStages.forEach((s) => { if (s.id && s.name) map[s.id] = s.name; });
    return map;
  }, [availableStages]);

  // Mobile avatar full screen popup state
  const [isMobile, setIsMobile] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load avatar image for modal
  useEffect(() => {
    if (isAvatarModalOpen && applicant) {
      const loadAvatar = async () => {
        try {
          const url = await getCachedAvatarUrl(
            {
              id: applicant.id,
              avatarUrl: applicant.avatarUrl
            },
            false
          );
          setAvatarImageUrl(sanitizeUrl(url || ''));
        } catch (error) {
          console.warn('Failed to load avatar for modal:', error);
          setAvatarImageUrl(null);
        }
      };
      loadAvatar();
    }
  }, [isAvatarModalOpen, applicant]);

  const handleAvatarClick = (e: React.MouseEvent) => {
    // Only open modal on mobile, and don't trigger if clicking the edit button
    if (isMobile && !(e.target as HTMLElement).closest('[role="button"]')) {
      setIsAvatarModalOpen(true);
    }
  };

  const handleCopyId = async () => {
    if (applicant.id) {
      try {
        await navigator.clipboard.writeText(applicant.id);
        toastSuccess('Applicant ID copied to clipboard');
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = applicant.id;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toastSuccess('Applicant ID copied to clipboard');
      }
    }
  };

  return (
    <div
      className={cn(
        "bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/20 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-700/30 shadow-lg backdrop-blur-sm border-b border-border p-4 sticky pointer-events-auto",
        isModal 
          ? "top-0" 
          : (session?.user?.impersonatedUserId || session?.user?.impersonatedRole) 
            ? "top-24" 
            : "top-16"
      )}
      style={{ zIndex: contentZIndex }}
    >


      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 relative">
        {/* Modal Action Buttons in header */}
        {isModal && typeof onClose === 'function' && (
          <div className="absolute top-0 right-0 flex items-center gap-1" style={{ zIndex: contentZIndex + 1 }}>
            {/* Open in new tab button */}
            {applicant?.id && (
              <button
                type="button"
                className="p-2 rounded-full hover:bg-muted transition pointer-events-auto"
                title="Open in new tab"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  window.open(sanitizeUrl(`/applicants/${applicant.id}`), '_blank', 'noopener,noreferrer');
                }}
              >
                <ExternalLink className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            {/* Close button */}
            <button
              type="button"
              className="p-2 rounded-full hover:bg-muted transition pointer-events-auto"
              title="Close"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClose();
              }}
            >
              <X className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Column 1: Applicant Header (7 cols) */}
        <div className="lg:col-span-7">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0 relative">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <div
                  className="relative"
                  onClick={handleAvatarClick}
                  style={{ cursor: isMobile ? 'pointer' : 'default' }}
                >
                  <ApplicantAvatar
                    user={applicant}
                    size="xl"
                    className="w-20 h-20 text-3xl"
                    forceRefresh={avatarForceRefresh}
                  />
                  {/* Pencil icon button for avatar upload */}
                  <div
                    role="button"
                    tabIndex={0}
                    className="absolute -bottom-1 -right-1 p-2 bg-background/95 backdrop-blur-sm border border-border/50 rounded-full hover:bg-primary/10 hover:scale-110 transition-all duration-200 z-10 flex items-center justify-center shadow-lg"
                    title="Change profile picture"
                    onClick={(e) => {
                      e.stopPropagation();

                      if (avatarInputRef?.current) {

                        avatarInputRef.current.click();
                      } else {
                        console.error(`[ApplicantHeader] File input ref is null`);
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {

                        if (avatarInputRef?.current) avatarInputRef.current.click();
                      }
                    }}
                    aria-disabled={avatarUploading}
                    style={{ pointerEvents: avatarUploading ? 'none' : 'auto' }}
                  >
                    <Edit className="w-4 h-4 text-primary" />
                  </div>
                  {/* Hidden file input for avatar upload */}
                  <input
                    type="file"
                    accept="image/*"
                    ref={avatarInputRef}
                    style={{ display: 'none' }}
                    onChange={async (e) => {

                      const file = e.target.files?.[0];
                      if (file) {

                        await onAvatarUpload(file);
                      }
                      e.target.value = '';
                    }}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  {avatarUploading && !isEditing && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-full">
                      <div className="flex flex-col items-center justify-center space-y-2 p-3">
                        <div className="relative">
                          <div className="w-8 h-8 border-2 border-primary/20 rounded-full animate-pulse"></div>
                          <div className="absolute inset-0 w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <Upload className="absolute inset-0 w-8 h-8 text-primary/60 animate-bounce" />
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">Uploading...</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {avatarError && <div className="text-xs text-destructive mt-2 text-center bg-destructive/10 px-2 py-1 rounded-md">{avatarError}</div>}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span
                  className={`text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent line-clamp-1 ${nameInfo.fontClass}`}
                  lang={nameInfo.lang}
                >
                  {nameInfo.name}
                  {applicant.isPinned && <Pin className="inline-block ml-2 h-4 w-4 text-amber-500 fill-current align-text-top" />}
                </span>
                <div className="flex items-center gap-2">
                  {!isMobile && applicant.id && (
                    <button
                      onClick={handleCopyId}
                      className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors duration-200 group"
                      title={`Copy ID: ${applicant.id}`}
                    >
                      <Copy className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">ID</span>
                    </button>
                  )}
                  {applicant.isPinned && (
                    <Badge
                      variant="secondary"
                      className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 flex items-center gap-1"
                    >
                      <Pin className="w-3 h-3 rotate-45 fill-current text-blue-600 dark:text-blue-400" />
                      Pinned
                    </Badge>
                  )}
                  {applicant.isBlacklisted && (
                    <BlacklistBadge className="px-2 py-1 rounded-full flex items-center gap-1" iconClassName="w-3 h-3" />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                {applicant.email && (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium text-foreground">{applicant.email}</span>
                  </div>
                )}
                {applicant.phone && (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="font-medium text-foreground">{applicant.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Source and Recruiter Assignment (3 cols) */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-end gap-4 mt-8">
            {/* Applicant Source */}
            <div className="border border-border rounded-lg">
              <ApplicantSourceCell
                applicant={applicant}
                availableSources={availableSources}
                canManageApplicants={true}
                isAssigning={isAssigningSource}
                onAssignSource={onAssignSource}
                onResetAssigning={onResetSourceAssigning}
              />
            </div>

            {/* Recruiter Assignment */}
            <div className="border border-border rounded-lg">
              <ApplicantRecruiterCell
                applicant={applicant}
                availableRecruiter={availableRecruiter}
                canManageApplicants={true}
                isAssigning={isAssigningRecruiter}
                onAssignRecruiter={(applicantId, recruiterId) => onAssignRecruiter(recruiterId)}
                onResetAssigning={onResetAssigning}
              />
            </div>

            {/* Action Buttons */}
            <div className="relative" style={{ zIndex: contentZIndex + 2 }}>
              {!isEditing ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 hover:bg-muted/50 transition-colors duration-200 pointer-events-auto flex items-center gap-2"
                      style={{ zIndex: contentZIndex + 3 }}
                    >
                      <MoreVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="whitespace-nowrap">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48"
                    style={{ zIndex: contentZIndex + 4 }}
                  >
                    <DropdownMenuItem
                      onClick={onEditClick}
                      className="text-sm py-2 cursor-pointer"
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit Applicant Profile
                    </DropdownMenuItem>
                    {onTogglePin && (
                      <DropdownMenuItem
                        onClick={onTogglePin}
                        className="text-sm py-2 cursor-pointer"
                      >
                        {applicant.isPinned ? (
                          <>
                            <Pin className="mr-2 h-4 w-4 text-blue-600 fill-current rotate-45" />
                            Unpin from top
                          </>
                        ) : (
                          <>
                            <Pin className="mr-2 h-4 w-4 text-muted-foreground rotate-45" />
                            Pin to top
                          </>
                        )}
                      </DropdownMenuItem>
                    )}
                    {onToggleRead && (
                      <DropdownMenuItem
                        onClick={onToggleRead}
                        className="text-sm py-2 cursor-pointer"
                      >
                        {applicant.isRead === false ? (
                          <>
                            <EnvelopeOpenIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            Mark as Read
                          </>
                        ) : (
                          <>
                            <EnvelopeIcon className="mr-2 h-4 w-4 text-blue-600" />
                            Mark as Unread
                          </>
                        )}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={onManageTransitions}
                      disabled={availableStages.length === 0}
                      className="text-sm py-2 cursor-pointer"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Manage Transitions
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onReprocess}
                      className="text-sm py-2 cursor-pointer"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Re-process
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onGenerativeAI}
                      className="text-sm py-2 cursor-pointer"
                    >
                      <BrainCircuit className="mr-2 h-4 w-4" />
                      Generative AI
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={onEvaluate}
                      className="text-sm py-2 cursor-pointer"
                    >
                      <Target className="mr-2 h-4 w-4" />
                      Create Interview Session
                    </DropdownMenuItem>
                    {onSendInterviewInvitation && (
                      <DropdownMenuItem
                        onClick={onSendInterviewInvitation}
                        className="text-sm py-2 cursor-pointer"
                        disabled={!applicant.positionId}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Send Interviewer Invitation
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-sm py-2 text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Applicant
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onToggleBlacklist}
                      className={`text-sm py-2 cursor-pointer ${applicant.isBlacklisted ? "text-muted-foreground" : "text-destructive focus:text-destructive"}`}
                    >
                      {applicant.isBlacklisted ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Remove from Blacklist
                        </>
                      ) : (
                        <>
                          <Ban className="mr-2 h-4 w-4" />
                          Add to Blacklist
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex gap-2">
                  {/* Save/Cancel buttons will be floating */}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Avatar Full Screen Modal */}
      <Dialog open={isAvatarModalOpen} onOpenChange={setIsAvatarModalOpen}>
        <DialogContent
          className="max-w-full w-full h-full max-h-screen p-0 m-0 rounded-none flex flex-col items-center justify-center bg-black/95 fixed inset-0 translate-x-0 translate-y-0"
          dialogId="avatar-fullscreen-modal"
          style={{ zIndex: contentZIndex + 100 }}
        >
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {avatarImageUrl ? (
              <img
                src={avatarImageUrl}
                alt={applicant.name || 'Avatar'}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-700 dark:text-blue-300 font-bold text-4xl flex items-center justify-center">
                {applicant.name ? applicant.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'C'}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
