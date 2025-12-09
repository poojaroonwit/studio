"use client";

import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import CandidateDetailView from './CandidateDetailView';
import MobileCandidateDetailView from './MobileCandidateDetailView';
import { useIsMobile } from '@/hooks/use-mobile';

interface CandidateDetailModalProps {
  candidateId: string;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function CandidateDetailModal({
  candidateId,
  open,
  onClose,
  onRefresh
}: CandidateDetailModalProps) {
  const isMobile = useIsMobile();

  if (isMobile && open) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col w-full h-full overflow-hidden">
        <MobileCandidateDetailView
          candidateId={candidateId}
          onClose={onClose}
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent
        dialogId={`candidate-detail-modal-${candidateId}`}
        className="max-w-7xl w-[95vw] h-[95vh] p-0 overflow-hidden rounded-xl"
      >
        <VisuallyHidden>
          <DialogTitle>Candidate Details</DialogTitle>
        </VisuallyHidden>
        <div className="h-full w-full overflow-hidden">
          <CandidateDetailView
            candidateId={candidateId}
            onClose={onClose}
            isModal={true}
            onRefresh={onRefresh}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

