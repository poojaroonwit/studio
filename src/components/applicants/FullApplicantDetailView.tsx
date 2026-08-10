import type { CSSProperties } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { ApplicantDetailSkeleton } from "./ApplicantDetailSkeleton";
import { ApplicantReviewDecisionPanel } from "./ApplicantReviewDecisionPanel";
import { ApplicantReviewDrawerContent } from "./ApplicantReviewDrawerContent";
import { FullApplicantDetailErrorState } from "./FullApplicantDetailErrorState";
import {
  FullApplicantBody,
  FullApplicantDetailFloatingActions,
  FullApplicantHeaderSection,
  FullApplicantOverlayModals,
} from "./FullApplicantDetailViewSections";
import type { FullApplicantDetailController } from "./use-full-applicant-detail-controller";

interface FullApplicantDetailViewProps {
  controller: FullApplicantDetailController;
}

const reviewThemeStyle = {
  colorScheme: "light",
  "--app-page-background": "220 23% 97%",
  "--background": "0 0% 100%",
  "--foreground": "220 25% 25%",
  "--card": "0 0% 100%",
  "--card-foreground": "220 25% 25%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "220 25% 25%",
  "--muted": "220 14% 96%",
  "--muted-foreground": "220 25% 45%",
  "--accent": "220 14% 96%",
  "--accent-foreground": "220 25% 25%",
  "--border": "220 13% 91%",
  "--input": "220 13% 91%",
} as CSSProperties;

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
    <div
      className={controller.isModal
        ? "pointer-events-auto relative h-full min-h-0 overflow-hidden bg-white font-[var(--font-dm-sans)] text-[#12213d]"
        : "relative min-h-full overflow-y-auto bg-white font-[var(--font-dm-sans)] text-[#12213d] lg:h-full lg:min-h-0 lg:overflow-hidden"
      }
      data-testid={controller.isModal ? "applicant-review-drawer" : "applicant-review-page"}
      data-theme="applicant-review"
      style={reviewThemeStyle}
    >
      <div className={controller.isModal
        ? "grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_350px]"
        : "grid min-h-full grid-cols-1 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_350px]"
      }>
        <div className="flex min-h-[640px] flex-col bg-white lg:min-h-0 lg:overflow-hidden">
          <FullApplicantHeaderSection controller={loadedController} />
          <section
            aria-label="Applicant profile"
            className="flex min-h-0 flex-1 flex-col bg-background lg:overflow-hidden"
          >
            {loadedController.isEditing ? (
              <FullApplicantBody controller={loadedController} showSidebar={false} />
            ) : (
              <ApplicantReviewDrawerContent controller={loadedController} />
            )}
          </section>
        </div>

        <aside
          aria-label="Applicant review activity"
          className="flex min-h-[520px] flex-col overflow-hidden border-t border-slate-200 bg-white lg:min-h-0 lg:border-l lg:border-t-0"
        >
          <ApplicantReviewDecisionPanel
            applicant={loadedController.applicant}
            availableStages={loadedController.availableStages}
            comments={loadedController.comments}
            isStatusUpdating={loadedController.isStatusUpdating}
            onRefresh={loadedController.onRefresh}
            onStatusUpdate={loadedController.handleStatusUpdate}
            resumes={loadedController.resumes}
          />
        </aside>
      </div>
      {controller.isModal && (
        <button
          type="button"
          aria-label="Close applicant details"
          onClick={loadedController.onClose}
          className="absolute right-2 top-2 z-[120] grid h-8 w-8 place-items-center rounded-md text-[#68758e] transition-colors hover:bg-[#f3f5f8] hover:text-[#12213d]"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
      <FullApplicantOverlayModals controller={loadedController} />
      {loadedController.isEditing && <FullApplicantDetailFloatingActions controller={loadedController} />}
    </div>
  );
}
