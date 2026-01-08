"use client";

import React from 'react';
import MobileCandidateDetail from './MobileCandidateDetail';

interface MobileCandidateDetailViewProps {
  candidateId: string;
  onClose?: () => void;
  onRefresh?: () => void;
}

export default function MobileCandidateDetailView({ 
  candidateId, 
  onClose,
  onRefresh
}: MobileCandidateDetailViewProps) {
  return (
    <MobileCandidateDetail
      candidateId={candidateId}
      onClose={onClose}
      onRefresh={onRefresh}
    />
  );
}

