import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, Edit3, MoreHorizontal, RefreshCw, Users, X, BrainCircuit } from 'lucide-react';
import { formatCandidateNameWithLang } from "@/lib/candidateUtils";
import type { Candidate, UserProfile, RecruitmentStage, CandidateSource } from '@/lib/types';
import { CandidateRecruiterCell } from './CandidateRecruiterCell';
import { CandidateSourceCell } from './CandidateSourceCell';

interface CandidateHeaderProps {
  candidate: Candidate;
  isModal?: boolean;
  onClose?: () => void;
  isEditing: boolean;
  availableStages: RecruitmentStage[];
  availableRecruiters: UserProfile[];
  availableSources: CandidateSource[];
  isAssigningRecruiter: boolean;
  isAssigningSource: boolean;
  onAssignRecruiter: (recruiterId: string | null) => void;
  onAssignSource: (candidateId: string, sourceId: string | null, subSource?: string | null) => void;
  onResetAssigning: () => void;
  onResetSourceAssigning: () => void;
  onEditClick: () => void;
  onManageTransitions: () => void;
  onReprocess: () => void;
  onGenerativeAI: () => void;
  avatarInputRef: React.RefObject<HTMLInputElement>;
  avatarUploading: boolean;
  avatarError: string | null;
  onAvatarUpload: (file: File) => void;
}

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Hired': case 'Offer Accepted': return 'default';
    case 'Applied': case 'Screening': case 'Shortlisted': case 'On Hold': return 'secondary';
    case 'Interview Scheduled': case 'Interviewing': case 'Offer Extended': return 'secondary';
    case 'Rejected': return 'destructive';
    default: return 'outline';
  }
};

export const CandidateHeader: React.FC<CandidateHeaderProps> = ({
  candidate,
  isModal,
  onClose,
  isEditing,
  availableStages,
  availableRecruiters,
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
  avatarInputRef,
  avatarUploading,
  avatarError,
  onAvatarUpload
}) => {
  const nameInfo = formatCandidateNameWithLang(candidate);

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/20 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-700/30 shadow-lg backdrop-blur-sm border-b border-border p-4 sticky top-0 z-50 pointer-events-auto">
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 relative">
        {/* Modal Close Button in header */}
        {isModal && typeof onClose === 'function' && (
          <button
            type="button"
            className="absolute top-0 right-0 mt-2 mr-2 z-50 p-2 rounded-full hover:bg-muted transition pointer-events-auto"
            title="Close"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
          >
            <X className="w-6 h-6 text-muted-foreground" />
          </button>
        )}
        
        {/* Column 1: Candidate Header (7 cols) */}
        <div className="lg:col-span-7">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0 relative">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <Avatar className="w-20 h-20 text-3xl relative ring-4 ring-background/80 shadow-xl bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-800/30">
                  {candidate.avatarUrl ? (
                    <AvatarImage src={candidate.avatarUrl} alt={nameInfo.name} className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-700 dark:text-blue-300 font-bold">
                      {nameInfo.name?.[0] || '?'}
                    </AvatarFallback>
                  )}
                  {/* Pencil icon button for avatar upload */}
                  <div
                    role="button"
                    tabIndex={0}
                    className="absolute -bottom-1 -right-1 p-2 bg-background/95 backdrop-blur-sm border border-border/50 rounded-full hover:bg-primary/10 hover:scale-110 transition-all duration-200 z-10 flex items-center justify-center shadow-lg"
                    title="Change profile picture"
                    onClick={() => {
                      if (avatarInputRef?.current) avatarInputRef.current.click();
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
                      if (file) await onAvatarUpload(file);
                      e.target.value = '';
                    }}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  {avatarUploading && !isEditing && (
                    <div className="animate-spin text-primary h-7 w-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 border-2 border-current border-t-transparent rounded-full" />
                  )}
                </Avatar>
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
                </span>
                <div className="flex items-center gap-2">
                  {candidate.id && (
                    <Badge variant="outline" className="text-xs px-3 py-1 rounded-full bg-background/50 backdrop-blur-sm border-border/50 shadow-sm">
                      <span className="text-muted-foreground">ID:</span> {candidate.id}
                    </Badge>
                  )}

                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                {candidate.email && (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium text-foreground">{candidate.email}</span>
                  </div>
                )}
                {candidate.phone && (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="font-medium text-foreground">{candidate.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Column 2: Source and Recruiter Assignment (3 cols) */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-end gap-4 mt-8">
            {/* Candidate Source */}
            <div className="border border-border rounded-lg">
              <CandidateSourceCell
                candidate={candidate}
                availableSources={availableSources}
                canManageCandidates={true}
                isAssigning={isAssigningSource}
                onAssignSource={onAssignSource}
                onResetAssigning={onResetSourceAssigning}
              />
            </div>

            {/* Recruiter Assignment */}
            <div className="border border-border rounded-lg">
              <CandidateRecruiterCell
                candidate={candidate}
                availableRecruiters={availableRecruiters}
                canManageCandidates={true}
                isAssigning={isAssigningRecruiter}
                onAssignRecruiter={(candidateId, recruiterId) => onAssignRecruiter(recruiterId)}
                onResetAssigning={onResetAssigning}
              />
            </div>
            
            {/* Action Buttons */}
            <div>
              {!isEditing ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-10 px-3">
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      Action
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEditClick}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit Candidate Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onManageTransitions} disabled={availableStages.length === 0}>
                      <Users className="mr-2 h-4 w-4" />
                      Manage Transitions
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onReprocess}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Re-process
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onGenerativeAI}>
                      <BrainCircuit className="mr-2 h-4 w-4" />
                      Generative AI
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
    </div>
  );
};
