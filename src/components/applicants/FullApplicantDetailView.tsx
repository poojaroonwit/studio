import { ApplicantDetailSkeleton } from "./ApplicantDetailSkeleton";
import { FullApplicantDetailErrorState } from "./FullApplicantDetailErrorState";
import {
  FullApplicantBody,
  FullApplicantDetailFloatingActions,
  FullApplicantHeaderSection,
  FullApplicantMobileBackBar,
  FullApplicantOverlayModals,
  FullApplicantPipeline,
} from "./FullApplicantDetailViewSections";
import type { FullApplicantDetailController } from "./use-full-applicant-detail-controller";

interface FullApplicantDetailViewProps {
  controller: FullApplicantDetailController;
}

export function FullApplicantDetailView({ controller }: FullApplicantDetailViewProps) {
  if (controller.loading) {
    return <ApplicantDetailSkeleton />;
  }

  if (controller.error || !controller.applicant) {
    return <FullApplicantDetailErrorState error={controller.error} />;
  }

  const loadedController = {
    ...controller,
    applicant: controller.applicant,
  };

  return (
    <div className={controller.isModal ? "h-full flex flex-col bg-background pointer-events-auto" : "h-full flex flex-col bg-background"}>
      <FullApplicantMobileBackBar controller={loadedController} />
      <FullApplicantHeaderSection controller={loadedController} />
      <FullApplicantPipeline controller={loadedController} />
      <FullApplicantBody controller={loadedController} />
      <FullApplicantOverlayModals controller={loadedController} />
      <FullApplicantDetailFloatingActions controller={loadedController} />
    </div>
  );
}
