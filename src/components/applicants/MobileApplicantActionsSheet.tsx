"use client";

import { Pin } from "lucide-react";
import {
  ArrowPathIcon as RefreshCw,
  NoSymbolIcon as Ban,
  PencilIcon as Edit,
  TrashIcon as Trash2,
  UsersIcon as Users,
} from "@heroicons/react/24/outline";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import type { MobileApplicantActionDialogsProps } from "./MobileApplicantActionDialogsTypes";

type MobileApplicantActionsSheetProps = Pick<
  MobileApplicantActionDialogsProps,
  | "applicant"
  | "nameInfo"
  | "isActionsModalOpen"
  | "onActionsModalOpenChange"
  | "onStatusModalOpenChange"
  | "onRecruiterModalOpenChange"
  | "onTogglePin"
  | "onRefresh"
  | "onRequestDelete"
>;

export function MobileApplicantActionsSheet({
  applicant,
  nameInfo,
  isActionsModalOpen,
  onActionsModalOpenChange,
  onStatusModalOpenChange,
  onRecruiterModalOpenChange,
  onTogglePin,
  onRefresh,
  onRequestDelete,
}: MobileApplicantActionsSheetProps) {
  return (
    <Dialog open={isActionsModalOpen} onOpenChange={onActionsModalOpenChange}>
      <DialogContent
        className="fixed bottom-0 left-1/2 top-auto translate-x-[-50%] translate-y-0 w-screen max-w-none h-[90vh] p-0 overflow-hidden rounded-t-3xl rounded-b-none border-0 shadow-2xl bg-background flex flex-col"
        dialogId="applicant-actions-modal"
      >
        <VisuallyHidden>
          <DialogTitle>Applicant Actions</DialogTitle>
        </VisuallyHidden>

        <MobileApplicantActionsHeader applicant={applicant} nameInfo={nameInfo} />

        <ScrollArea className="flex-1 px-4 py-2">
          <div className="space-y-0">
            <MobileActionButton
              icon={<Edit className="h-4 w-4" />}
              label="Change Status"
              onClick={() => {
                onActionsModalOpenChange(false);
                onStatusModalOpenChange(true);
              }}
            />
            <MobileActionButton
              icon={<Users className="h-4 w-4" />}
              label="Assign Recruiter"
              onClick={() => {
                onActionsModalOpenChange(false);
                onRecruiterModalOpenChange(true);
              }}
            />

            <div className="border-t border-border/60 my-1" />

            <MobileActionButton
              icon={<Pin className="h-4 w-4" />}
              label={`${applicant.isPinned ? "Unpin" : "Pin"} applicant`}
              onClick={onTogglePin}
            />
            <MobileActionButton
              icon={<RefreshCw className="h-4 w-4" />}
              label="Refresh Data"
              onClick={() => {
                onActionsModalOpenChange(false);
                onRefresh();
              }}
            />

            <div className="border-t border-border/60 my-1" />

            <MobileActionButton
              icon={<Trash2 className="h-4 w-4" />}
              label="Delete Applicant"
              destructive
              onClick={() => {
                onActionsModalOpenChange(false);
                onRequestDelete();
              }}
            />
          </div>
        </ScrollArea>

        <div className="border-t px-4 py-4">
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl"
            onClick={() => onActionsModalOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type MobileApplicantActionsHeaderProps = Pick<
  MobileApplicantActionDialogsProps,
  "applicant" | "nameInfo"
>;

function MobileApplicantActionsHeader({
  applicant,
  nameInfo,
}: MobileApplicantActionsHeaderProps) {
  return (
    <DialogHeader className="border-b px-4 pt-6 pb-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11 flex-shrink-0">
          <AvatarImage src={applicant.avatarUrl || undefined} alt={applicant.name || ""} />
          <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
            {applicant.name?.charAt(0)?.toUpperCase() || "C"}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span
            className={cn(
              "text-sm font-semibold truncate",
              nameInfo.fontClass,
              applicant.isBlacklisted && "text-destructive",
            )}
            lang={nameInfo.lang}
          >
            {applicant.name || "Applicant"}
          </span>
          {applicant.email && (
            <span className="text-xs text-muted-foreground truncate">{applicant.email}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {applicant.isBlacklisted && (
            <Badge
              variant="destructive"
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full"
            >
              <Ban className="h-3 w-3" />
              Blacklisted
            </Badge>
          )}
          {applicant.isPinned && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full"
            >
              <Pin className="h-3 w-3 fill-current" />
              Pinned
            </Badge>
          )}
        </div>
      </div>
    </DialogHeader>
  );
}

interface MobileActionButtonProps {
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
  onClick: () => void;
}

function MobileActionButton({
  icon,
  label,
  destructive,
  onClick,
}: MobileActionButtonProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start h-12 rounded-none border-0 text-left gap-3 hover:bg-muted/50 active:bg-muted/70",
        destructive && "text-destructive hover:text-destructive",
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}
