"use client";

import React from "react";

import { cn } from "@/lib/utils";
import { ApplicantHeaderActions } from "./ApplicantHeaderActions";
import { ApplicantHeaderAvatar } from "./ApplicantHeaderAvatar";
import {
  ApplicantAvatarDialog,
  ApplicantHeaderAssignments,
  ApplicantHeaderModalControls,
  ApplicantIdentityBlock,
} from "./ApplicantHeaderParts";
import type { ApplicantHeaderProps } from "./ApplicantHeaderTypes";
import { useApplicantHeader } from "./use-applicant-header";

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
}) => {
  const header = useApplicantHeader(applicant, isModal);

  return (
    <div
      className={cn(
        "bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/20 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-700/30 shadow-lg backdrop-blur-sm border-b border-border p-4 sticky pointer-events-auto",
        header.headerTopClass,
      )}
      style={{ zIndex: header.contentZIndex }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 relative">
        {isModal && (
          <ApplicantHeaderModalControls
            applicantId={applicant.id}
            contentZIndex={header.contentZIndex}
            onClose={onClose}
          />
        )}

        <div className="lg:col-span-7">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ApplicantHeaderAvatar
              applicant={applicant}
              avatarError={avatarError}
              avatarForceRefresh={avatarForceRefresh}
              avatarInputRef={avatarInputRef}
              avatarUploading={avatarUploading}
              isEditing={isEditing}
              isMobile={header.isMobile}
              onAvatarClick={header.handleAvatarClick}
              onAvatarUpload={onAvatarUpload}
            />
            <ApplicantIdentityBlock
              applicant={applicant}
              isMobile={header.isMobile}
              nameInfo={header.nameInfo}
              onCopyId={header.handleCopyId}
            />
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="flex items-center justify-end gap-4 mt-8">
            <ApplicantHeaderAssignments
              applicant={applicant}
              availableRecruiter={availableRecruiter}
              availableSources={availableSources}
              isAssigningRecruiter={isAssigningRecruiter}
              isAssigningSource={isAssigningSource}
              onAssignRecruiter={onAssignRecruiter}
              onAssignSource={onAssignSource}
              onResetAssigning={onResetAssigning}
              onResetSourceAssigning={onResetSourceAssigning}
            />
            <ApplicantHeaderActions
              applicant={applicant}
              availableStages={availableStages}
              contentZIndex={header.contentZIndex}
              isEditing={isEditing}
              onDelete={onDelete}
              onEditClick={onEditClick}
              onEvaluate={onEvaluate}
              onGenerativeAI={onGenerativeAI}
              onManageTransitions={onManageTransitions}
              onReprocess={onReprocess}
              onSendInterviewInvitation={onSendInterviewInvitation}
              onToggleBlacklist={onToggleBlacklist}
              onTogglePin={onTogglePin}
              onToggleRead={onToggleRead}
            />
          </div>
        </div>
      </div>

      <ApplicantAvatarDialog
        applicant={applicant}
        avatarImageUrl={header.avatarImageUrl}
        contentZIndex={header.contentZIndex}
        onOpenChange={header.setIsAvatarModalOpen}
        open={header.isAvatarModalOpen}
      />
    </div>
  );
};
