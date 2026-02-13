/**
 * Headcount Types
 * Type definitions for headcount operations
 */

export interface HeadcountStatus {
  isFilled: boolean;
  totalHeadcounts: number;
  filledHeadcounts: number;
  vacantHeadcounts: number;
  hasHeadcounts: boolean;
}

export interface PositionActionResult {
  success: boolean;
  message: string;
  action: 'closed' | 'opened' | 'reopened' | 'none' | 'error';
  headcountStatus?: HeadcountStatus;
  position?: any;
}

export interface ValidationResult {
  canHire: boolean;
  reason: 'NO_HEADCOUNT' | 'NO_VACANT_HEADCOUNT' | 'ALREADY_ASSIGNED' | 'VACANT_HEADCOUNT_AVAILABLE';
  message: string;
  headcountId?: string;
  availableHeadcountId?: string;
  headcountStatus: {
    hasHeadcounts: boolean;
    totalHeadcounts: number;
    vacantHeadcounts: number;
    filledHeadcounts: number;
  };
}

export interface UnassignWarning {
  hasWarning: boolean;
  warningType?: 'APPLICANT_STATUS_WILL_CHANGE';
  message?: string;
  applicant?: any;
  position?: any;
}

export interface AssignmentResult {
  success: boolean;
  message: string;
  headcountId?: string;
  autoCloseResult?: PositionActionResult | null;
}

export interface UnassignmentResult {
  success: boolean;
  message: string;
  statusUpdateResult?: {
    statusChanged: boolean;
    oldStatus: string;
    newStatus: string;
    transitionId: string;
  } | null;
}

export interface BatchCloseResult extends PositionActionResult {
  positionId: string;
  positionTitle: string;
}
