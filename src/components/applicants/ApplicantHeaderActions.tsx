import {
  ArrowPathIcon as RefreshCw,
  CalendarIcon as Calendar,
  CpuChipIcon as BrainCircuit,
  EllipsisVerticalIcon as MoreVertical,
  FlagIcon as Target,
  PencilSquareIcon as Edit3,
  TrashIcon as Trash2,
  UsersIcon as Users,
} from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Applicant, RecruitmentStage } from "@/lib/types";
import {
  ApplicantBlacklistMenuItem,
  ApplicantPinMenuItem,
  ApplicantReadMenuItem,
} from "./ApplicantHeaderActionItems";

interface ApplicantHeaderActionsProps {
  applicant: Applicant;
  availableStages: RecruitmentStage[];
  contentZIndex: number;
  isEditing: boolean;
  onDelete: () => void;
  onEditClick: () => void;
  onEvaluate: () => void;
  onGenerativeAI: () => void;
  onManageTransitions: () => void;
  onReprocess: () => void;
  onSendInterviewInvitation?: () => void;
  onToggleBlacklist: () => void;
  onTogglePin?: () => void;
  onToggleRead?: () => void;
}

export function ApplicantHeaderActions({
  applicant,
  availableStages,
  contentZIndex,
  isEditing,
  onDelete,
  onEditClick,
  onEvaluate,
  onGenerativeAI,
  onManageTransitions,
  onReprocess,
  onSendInterviewInvitation,
  onToggleBlacklist,
  onTogglePin,
  onToggleRead,
}: ApplicantHeaderActionsProps) {
  return (
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
              <ApplicantPinMenuItem applicant={applicant} onClick={onTogglePin} />
            )}
            {onToggleRead && (
              <ApplicantReadMenuItem applicant={applicant} onClick={onToggleRead} />
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
            <ApplicantBlacklistMenuItem applicant={applicant} onClick={onToggleBlacklist} />
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex gap-2" />
      )}
    </div>
  );
}
