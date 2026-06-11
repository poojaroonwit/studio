"use client";

import { useCallback, useState } from 'react';
import type { Applicant } from '@/lib/types';
import type { ApplicantTableProps, ApplicantTableSelectedSummary } from './ApplicantTableTypes';

interface UseApplicantTableDialogStateOptions {
  onDeleteApplicant: ApplicantTableProps['onDeleteApplicant'];
}

export function useApplicantTableDialogState({
  onDeleteApplicant,
}: UseApplicantTableDialogStateOptions) {
  const [applicantToDelete, setApplicantToDelete] = useState<Applicant | null>(null);
  const [selectedApplicantSummary, setSelectedApplicantSummary] = useState<ApplicantTableSelectedSummary | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const openApplicantDetail = useCallback((applicantId: string, applicantName: string) => {
    setSelectedApplicantSummary({ id: applicantId, name: applicantName });
    setIsDetailModalOpen(true);
  }, []);

  const closeApplicantDetail = useCallback(() => {
    setIsDetailModalOpen(false);
    setTimeout(() => {
      setSelectedApplicantSummary(null);
    }, 100);
  }, []);

  const confirmDelete = useCallback((applicant: Applicant) => {
    setApplicantToDelete(applicant);
  }, []);

  const cancelDelete = useCallback(() => {
    setApplicantToDelete(null);
  }, []);

  const executeDelete = useCallback(() => {
    if (!applicantToDelete) return;

    void onDeleteApplicant(applicantToDelete.id);
    setApplicantToDelete(null);
  }, [applicantToDelete, onDeleteApplicant]);

  return {
    applicantToDelete,
    cancelDelete,
    closeApplicantDetail,
    confirmDelete,
    executeDelete,
    isDetailModalOpen,
    openApplicantDetail,
    selectedApplicantSummary,
  };
}
