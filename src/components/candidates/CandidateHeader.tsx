import React from 'react';
import { CandidateAvatar } from '@/components/ui/candidate-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, Edit3, MoreHorizontal, RefreshCw, Users, X, BrainCircuit, Upload, Trash2 } from 'lucide-react';
import { formatCandidateNameWithLang } from "@/lib/candidateUtils";
import type { Candidate, UserProfile, RecruitmentStage, CandidateSource } from '@/lib/types';
import { CandidateRecruiterCell } from './CandidateRecruiterCell';
import { CandidateSourceCell } from './CandidateSourceCell';
import { StatusBadge } from './CandidateKanbanView';
import { useStageColors } from '@/hooks/use-stage-colors';

interface CandidateHeaderProps {
  candidate: Candidate;
  isModal?: boolean;
  onClose?: () => void;
  isEditing: boolean;
  availableStages: RecruitmentStage[];
  availableRecruiter: UserProfile[];
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
  onDelete: () => void;
  avatarInputRef: React.RefObject<HTMLInputElement>;
  avatarUploading: boolean;
  avatarError: string | null;
  avatarForceRefresh: boolean;
  onAvatarUpload: (file: File) => void;
  realtimeConnected?: boolean;
}



export const CandidateHeader: React.FC<CandidateHeaderProps> = ({
  candidate,
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
  onDelete,
  avatarInputRef,
  avatarUploading,
  avatarError,
  avatarForceRefresh,
  onAvatarUpload,
  realtimeConnected
}) => {
  const nameInfo = formatCandidateNameWithLang(candidate);
  const stageId = candidate.statusId || candidate.status || '';
  const { stageColors } = useStageColors(stageId ? [stageId] : []);
  const stageNames = React.useMemo(() => {
    const map: Record<string, string> = {};
    availableStages.forEach((s) => { if (s.id && s.name) map[s.id] = s.name; });
    return map;
  }, [availableStages]);

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/20 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-700/30 shadow-lg backdrop-blur-sm border-b border-border p-4 sticky top-0 z-50 pointer-events-auto">
     
      
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 relative">
        {/* Modal Close Button in header */}
        {isModal && typeof onClose === 'function' && (
          <button
            type="button"
            className="absolute top-0 right-0  z-50 p-2 rounded-full hover:bg-muted transition pointer-events-auto"
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
                <div className="relative">
                                     <CandidateAvatar 
                     user={candidate}
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
                    onClick={() => {
                      // console.log(`[CandidateHeader] Avatar upload button clicked`);
                      if (avatarInputRef?.current) {
                        console.log(`[CandidateHeader] File input ref exists, clicking it`);
                        avatarInputRef.current.click();
                      } else {
                        console.error(`[CandidateHeader] File input ref is null`);
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        console.log(`[CandidateHeader] Avatar upload button key pressed: ${e.key}`);
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
                      console.log(`[CandidateHeader] File input changed:`, e.target.files);
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log(`[CandidateHeader] Calling onAvatarUpload with file:`, file);
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
                availableRecruiter={availableRecruiter}
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-3 hover:bg-muted/50 transition-colors duration-200"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground mr-2" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onClick={onEditClick}
                      className="text-sm py-2"
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit Candidate Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={onManageTransitions} 
                      disabled={availableStages.length === 0}
                      className="text-sm py-2"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Manage Transitions
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={onReprocess}
                      className="text-sm py-2"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Re-process
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={onGenerativeAI}
                      className="text-sm py-2"
                    >
                      <BrainCircuit className="mr-2 h-4 w-4" />
                      Generative AI
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={onDelete}
                      className="text-sm py-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Candidate
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
