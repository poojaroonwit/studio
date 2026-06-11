"use client";

import { useState } from 'react';
import type { Applicant, ApplicantFilterValues, Position } from '@/lib/types';
import ApplicantDetailModal from './ApplicantDetailModal';
import { ApplicantsPageSearchDrawer } from './ApplicantsPageSearchDrawer';

interface ApplicantsPageSearchExperienceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ApplicantFilterValues;
  onFilterChange: (filters: ApplicantFilterValues) => void;
  applicants: Applicant[];
  tableLoading: boolean;
  stageNames: Record<string, string>;
  stageColors: Record<string, string>;
  allDbPositions: Position[];
}

export function ApplicantsPageSearchExperience({
  open,
  onOpenChange,
  filters,
  onFilterChange,
  applicants,
  tableLoading,
  stageNames,
  stageColors,
  allDbPositions,
}: ApplicantsPageSearchExperienceProps) {
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  return (
    <>
      <ApplicantsPageSearchDrawer
        open={open}
        onOpenChange={onOpenChange}
        filters={filters}
        onFilterChange={onFilterChange}
        applicants={applicants}
        tableLoading={tableLoading}
        stageNames={stageNames}
        stageColors={stageColors}
        allDbPositions={allDbPositions}
        onApplicantClick={(applicant) => {
          setSelectedApplicantId(applicant.id);
          setIsDetailModalOpen(true);
          onOpenChange(false);
        }}
      />

      {selectedApplicantId && (
        <ApplicantDetailModal
          applicantId={selectedApplicantId}
          open={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setTimeout(() => setSelectedApplicantId(null), 100);
          }}
        />
      )}
    </>
  );
}
