"use client";

import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
