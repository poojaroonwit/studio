import { useState } from "react";
import { toast } from "react-hot-toast";

import type { Applicant } from "@/lib/types";
import {
  assignMobileApplicantRecruiter,
  changeMobileApplicantStatus,
  deleteMobileApplicant,
  reprocessMobileApplicant,
  updateMobileApplicantPin,
  updateMobileApplicantStatus,
} from "./mobile-applicant-detail-api";
import { getMobileApplicantDetailErrorMessage } from "./mobile-applicant-detail-errors";

interface UseMobileApplicantDetailActionsOptions {
  applicant: Applicant | null;
  handleRefresh: () => void;
  newRecruiterId: string | null;
  newStatus: string;
  onClose?: () => void;
  onRefresh?: () => void;
  setIsActionsModalOpen: (open: boolean) => void;
  setIsDeleteModalOpen: (open: boolean) => void;
  setIsRecruiterModalOpen: (open: boolean) => void;
  setIsStatusModalOpen: (open: boolean) => void;
  setNewRecruiterId: (recruiterId: string | null) => void;
  setNewStatus: (status: string) => void;
  setTransitionNotes: (notes: string) => void;
  transitionNotes: string;
}

export function useMobileApplicantDetailActions({
  applicant,
  handleRefresh,
  newRecruiterId,
  newStatus,
  onClose,
  onRefresh,
  setIsActionsModalOpen,
  setIsDeleteModalOpen,
  setIsRecruiterModalOpen,
  setIsStatusModalOpen,
  setNewRecruiterId,
  setNewStatus,
  setTransitionNotes,
  transitionNotes,
}: UseMobileApplicantDetailActionsOptions) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const handleDelete = async () => {
    if (!applicant?.id) return;

    setIsDeleting(true);
    try {
      await deleteMobileApplicant(applicant.id);
      toast.success("Applicant deleted");
      setIsDeleteModalOpen(false);
      setIsActionsModalOpen(false);
      onClose?.();
      onRefresh?.();
    } catch (error) {
      toast.error(getMobileApplicantDetailErrorMessage(error, "Failed to delete Applicant"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!applicant?.id || !newStatus) return;

    setIsStatusUpdating(true);
    try {
      await changeMobileApplicantStatus({
        applicantId: applicant.id,
        newStatus,
        notes: transitionNotes || undefined,
      });
      toast.success("Status updated");
      setIsStatusModalOpen(false);
      setIsActionsModalOpen(false);
      setNewStatus("");
      setTransitionNotes("");
      handleRefresh();
    } catch (error) {
      toast.error(getMobileApplicantDetailErrorMessage(error, "Failed to update status"));
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleStatusUpdate = async (statusId: string, notes?: string): Promise<boolean> => {
    if (!applicant?.id) return false;

    setIsStatusUpdating(true);
    try {
      await updateMobileApplicantStatus({
        applicantId: applicant.id,
        statusId,
        notes,
      });
      toast.success("Status updated");
      handleRefresh();
      return true;
    } catch (error) {
      toast.error(getMobileApplicantDetailErrorMessage(error, "Failed to update status"));
      return false;
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleAssignRecruiter = async () => {
    if (!applicant?.id) return;

    try {
      await assignMobileApplicantRecruiter(applicant.id, newRecruiterId);
      toast.success("Recruiter assigned");
      setIsRecruiterModalOpen(false);
      setIsActionsModalOpen(false);
      setNewRecruiterId(null);
      handleRefresh();
    } catch (error) {
      toast.error(getMobileApplicantDetailErrorMessage(error, "Failed to assign recruiter"));
    }
  };

  const handleTogglePin = async () => {
    if (!applicant?.id) return;

    try {
      await updateMobileApplicantPin(applicant.id, !applicant.isPinned);
      toast.success(applicant.isPinned ? "Unpinned" : "Pinned");
      setIsActionsModalOpen(false);
      handleRefresh();
    } catch (error) {
      toast.error(getMobileApplicantDetailErrorMessage(error, "Failed to update pin status"));
    }
  };

  const handleReprocess = async () => {
    if (!applicant?.id) return;

    try {
      await reprocessMobileApplicant(applicant.id);
      toast.success("Reprocessing Applicant...");
      setIsActionsModalOpen(false);
      handleRefresh();
    } catch (error) {
      toast.error(getMobileApplicantDetailErrorMessage(error, "Failed to reprocess"));
    }
  };

  return {
    isDeleting,
    isStatusUpdating,
    handleDelete,
    handleChangeStatus,
    handleStatusUpdate,
    handleAssignRecruiter,
    handleTogglePin,
    handleReprocess,
  };
}
