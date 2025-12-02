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

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent 
        dialogId={`candidate-detail-modal-${candidateId}`}
        className={
          isMobile
            ? "fixed inset-0 w-screen h-screen max-w-none p-0 overflow-hidden border-0 shadow-2xl rounded-none"
            : "max-w-7xl w-[95vw] h-[95vh] p-0 overflow-hidden rounded-xl"
        }
      >
        <VisuallyHidden>
          <DialogTitle>Candidate Details</DialogTitle>
        </VisuallyHidden>
        <div className="h-full overflow-hidden">
          {isMobile ? (
            <MobileCandidateDetailView 
              candidateId={candidateId} 
              onClose={onClose}
              onRefresh={onRefresh}
            />
          ) : (
            <CandidateDetailView 
              candidateId={candidateId} 
              onClose={onClose}
              isModal={true}
              onRefresh={onRefresh}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
