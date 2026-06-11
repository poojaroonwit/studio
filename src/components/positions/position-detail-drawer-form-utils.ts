import type { Position } from "@/lib/types";
import type {
  JobDescriptionRequiredFields,
  PositionDrawerSheetOpenChangeAction,
  PositionEditFormDefaults,
} from "./position-detail-drawer-types";

export function getPositionEditFormDefaults(position?: Partial<Position> | null): PositionEditFormDefaults {
  return {
    title: position?.title || "",
    department: position?.department || "",
    description: position?.description || "",
    matchCriteria: position?.matchCriteria || "",
    isOpen: position?.isOpen ?? true,
    positionLevel: position?.positionLevel || "",
    gradeId: position?.gradeId || null,
    recruiterId: position?.recruiterId || null,
  };
}

export function getMissingJobDescriptionFields({
  title,
  department,
  positionLevel,
}: JobDescriptionRequiredFields) {
  const missingFields: string[] = [];

  if (!title?.trim()) {
    missingFields.push("Position Title");
  }
  if (!department?.trim()) {
    missingFields.push("Department");
  }
  if (!positionLevel?.trim()) {
    missingFields.push("Position Level");
  }

  return missingFields;
}

export function getPositionDrawerSheetOpenChangeAction({
  nextOpen,
  isMobile,
  manualCloseRequested,
}: {
  nextOpen: boolean;
  isMobile: boolean;
  manualCloseRequested: boolean;
}): PositionDrawerSheetOpenChangeAction {
  if (isMobile && !nextOpen) {
    return {
      shouldNotifyOpenChange: manualCloseRequested,
      nextOpen: false,
      shouldResetManualCloseRequest: manualCloseRequested,
    };
  }

  if (!nextOpen && manualCloseRequested) {
    return {
      shouldNotifyOpenChange: true,
      nextOpen: false,
      shouldResetManualCloseRequest: true,
    };
  }

  return {
    shouldNotifyOpenChange: true,
    nextOpen,
    shouldResetManualCloseRequest: false,
  };
}
