"use client";

import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import ApplicantDetailView from './ApplicantDetailView';
import MobileApplicantDetailView from './MobileApplicantDetailView';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDynamicZIndex } from '@/contexts/ZIndexContext';

interface ApplicantDetailModalProps {
  applicantId: string;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function ApplicantDetailModal({
  applicantId,
  open,
  onClose,
  onRefresh
}: ApplicantDetailModalProps) {
  const isMobile = useIsMobile();

  const { contentZIndex } = useDynamicZIndex(`applicant-detail-modal-${applicantId}`, 'modal');

  if (isMobile && open) {
    return (
      <div 
        className="fixed left-0 right-0 bottom-[3.5rem] top-0 bg-background flex flex-col w-full overflow-hidden"
        style={{ zIndex: contentZIndex }}
      >
        <MobileApplicantDetailView
          applicantId={applicantId}
          onClose={onClose}
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent
        dialogId={`applicant-detail-modal-${applicantId}`}
        className="max-w-[80vw] w-[80vw] h-[95vh] p-0 overflow-hidden rounded-xl"
      >
        <VisuallyHidden>
          <DialogTitle>Applicant Details</DialogTitle>
        </VisuallyHidden>
        <div className="h-full w-full overflow-hidden">
          <ApplicantDetailView
            applicantId={applicantId}
            onClose={onClose}
            isModal={true}
            onRefresh={onRefresh}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

