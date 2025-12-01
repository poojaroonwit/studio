"use client";

import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import CandidateDetailView from './CandidateDetailView';
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

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent 
        dialogId={`candidate-detail-modal-${candidateId}`}
        className={
          isMobile
            ? "fixed bottom-0 left-1/2 top-auto translate-x-[-50%] translate-y-0 w-screen max-w-none h-[90vh] p-0 overflow-hidden rounded-t-2xl rounded-b-none border-0"
            : "max-w-7xl w-[95vw] h-[95vh] p-0 overflow-hidden"
        }
      >
        <VisuallyHidden>
          <DialogTitle>Candidate Details</DialogTitle>
        </VisuallyHidden>
        <div className="h-full overflow-hidden">
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
