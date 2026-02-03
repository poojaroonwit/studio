"use client";

import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import CandidateDetailView from './CandidateDetailView';
import MobileCandidateDetailView from './MobileCandidateDetailView';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDynamicZIndex } from '@/contexts/ZIndexContext';

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

  const { contentZIndex } = useDynamicZIndex(`candidate-detail-modal-${candidateId}`, 'modal');

  if (isMobile && open) {
    return (
      <div 
        className="fixed left-0 right-0 bottom-[3.5rem] top-0 bg-background flex flex-col w-full overflow-hidden"
        style={{ zIndex: contentZIndex }}
      >
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
        className="max-w-[80vw] w-[80vw] h-[95vh] p-0 overflow-hidden rounded-xl"
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

