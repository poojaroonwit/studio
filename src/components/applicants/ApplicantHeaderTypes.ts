import type React from "react";

import type {
  Applicant,
  ApplicantSource,
  RecruitmentStage,
  UserProfile,
} from "@/lib/types";

export interface ApplicantHeaderProps {
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
  onAssignSource: (
    applicantId: string,
    sourceId: string | null,
    subSource?: string | null,
  ) => void;
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
