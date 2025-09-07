"use client";

import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import CandidateDetailView from './CandidateDetailView';

interface CandidateDetailModalProps {
  candidateId: string;
  open: boolean;
  onClose: () => void;
}

export default function CandidateDetailModal({ 
  candidateId, 
  open, 
  onClose 
}: CandidateDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        dialogId={`candidate-detail-modal-${candidateId}`}
        className="max-w-7xl w-[95vw] h-[95vh] p-0 overflow-hidden"
      >
        <VisuallyHidden>
          <DialogTitle>Candidate Details</DialogTitle>
        </VisuallyHidden>
        <div className="h-full overflow-hidden">
          <CandidateDetailView 
            candidateId={candidateId} 
            onClose={onClose}
            isModal={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
