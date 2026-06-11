import {
  ArrowTopRightOnSquareIcon as ExternalLink,
  XMarkIcon as X,
} from "@heroicons/react/24/outline";

import { sanitizeUrl } from "@/lib/utils";

interface ApplicantHeaderModalControlsProps {
  applicantId?: string;
  contentZIndex: number;
  onClose?: () => void;
}

export function ApplicantHeaderModalControls({
  applicantId,
  contentZIndex,
  onClose,
}: ApplicantHeaderModalControlsProps) {
  if (!onClose) return null;

  return (
    <div
      className="absolute top-0 right-0 flex items-center gap-1"
      style={{ zIndex: contentZIndex + 1 }}
    >
      {applicantId && (
        <button
          type="button"
          className="p-2 rounded-full hover:bg-muted transition pointer-events-auto"
          title="Open in new tab"
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            window.open(
              sanitizeUrl(`/applicants/${applicantId}`),
              "_blank",
              "noopener,noreferrer",
            );
          }}
        >
          <ExternalLink className="w-5 h-5 text-muted-foreground" />
        </button>
      )}
      <button
        type="button"
        className="p-2 rounded-full hover:bg-muted transition pointer-events-auto"
        title="Close"
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          onClose();
        }}
      >
        <X className="w-6 h-6 text-muted-foreground" />
      </button>
    </div>
  );
}
