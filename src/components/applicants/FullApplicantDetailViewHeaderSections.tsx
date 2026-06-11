import { ChevronLeftIcon as ChevronLeft } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";

import { ApplicantHeader } from "./ApplicantHeader";
import { ApplicantPipelineSection } from "./ApplicantPipelineSection";
import type { FullApplicantDetailSectionProps } from "./FullApplicantDetailViewTypes";

export function FullApplicantMobileBackBar({
  controller,
}: FullApplicantDetailSectionProps) {
  if (!controller.isMobile || controller.isModal) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-background sticky top-0 z-[100]">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Back to applicants"
        onClick={controller.onClose}
        className="hover:bg-muted"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <span className="font-semibold text-lg">Back</span>
    </div>
  );
}

export function FullApplicantHeaderSection({
  controller,
}: FullApplicantDetailSectionProps) {
  return (
    <div className="relative">
      <ApplicantHeader
        applicant={controller.applicant}
        isModal={controller.isModal}
        onClose={controller.onClose}
        isEditing={controller.isEditing}
        availableStages={controller.availableStages}
        availableRecruiter={controller.availableRecruiter}
        availableSources={controller.availableSources}
        isAssigningRecruiter={controller.isAssigningRecruiter}
        isAssigningSource={controller.isAssigningSource}
        onAssignRecruiter={controller.handleAssignRecruiter}
        onAssignSource={controller.handleAssignSource}
        onResetAssigning={() => controller.setIsAssigningRecruiter(false)}
        onResetSourceAssigning={() => controller.setIsAssigningSource(false)}
        onEditClick={controller.handleEnterEditMode}
        onManageTransitions={controller.openManageTransitionsModal}
        onReprocess={() => controller.setIsReprocessModalOpen(true)}
        onGenerativeAI={() => controller.setIsGenerativeAIModalOpen(true)}
        onEvaluate={controller.handleEvaluate}
        onSendInterviewInvitation={!controller.isInterviewInvitationEnabled
          ? () => controller.setIsSendInvitationModalOpen(true)
          : undefined}
        onDelete={() => controller.setIsDeleteModalOpen(true)}
        onTogglePin={controller.handleTogglePin}
        onToggleBlacklist={controller.handleToggleBlacklist}
        onToggleRead={controller.handleToggleRead}
        avatarInputRef={controller.avatarInputRef}
        avatarUploading={controller.avatarUploading}
        avatarError={controller.avatarError}
        avatarForceRefresh={controller.avatarForceRefresh}
        onAvatarUpload={controller.handleAvatarUpload}
        realtimeConnected={controller.realtimeConnected}
      />
    </div>
  );
}

export function FullApplicantPipeline({
  controller,
}: FullApplicantDetailSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 border-t bg-card flex-shrink-0">
      <div className="lg:col-span-10">
        <ApplicantPipelineSection
          applicant={controller.applicant}
          availableStages={controller.availableStages}
          transitionHistory={controller.transitionHistory}
          onStageClick={controller.openManageTransitionsModal}
          onNoteEdit={controller.handleTransitionNoteEdit}
          applicantId={controller.applicantId}
        />
      </div>
    </div>
  );
}
