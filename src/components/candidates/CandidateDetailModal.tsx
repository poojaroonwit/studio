"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import CandidateDetailView from './CandidateDetailView';
import { useSafeEffect, useInfiniteLoopPrevention } from '@/hooks/use-safe-effect';

interface CandidateDetailModalProps {
  candidateId: string;
  open: boolean;
  onClose: () => void;
}

export default function CandidateDetailModal({ candidateId, open, onClose }: CandidateDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const portalContainerRef = useRef<HTMLDivElement | null>(null);

  // Add infinite loop prevention
  const { trackRun: trackModalOpen } = useInfiniteLoopPrevention('CandidateDetailModal_open', 50, () => {
    console.error('🚨 Excessive modal open/close cycles detected in CandidateDetailModal');
  });

  // Create portal container on mount with safe effect
  useSafeEffect(() => {
    setMounted(true);
    
    // Create portal container if it doesn't exist
    if (!portalContainerRef.current) {
      portalContainerRef.current = document.createElement('div');
      portalContainerRef.current.setAttribute('data-candidate-modal-portal', 'true');
      document.body.appendChild(portalContainerRef.current);
    }

    return () => {
      setMounted(false);
      // Clean up portal container on unmount
      if (portalContainerRef.current && portalContainerRef.current.parentNode) {
        portalContainerRef.current.parentNode.removeChild(portalContainerRef.current);
        portalContainerRef.current = null;
      }
    };
  }, [], 'portalSetup', 1);

  // Handle escape key with safe effect
  useSafeEffect(() => {
    if (!trackModalOpen()) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // Restore body scroll when modal closes
      document.body.style.overflow = '';
    };
  }, [open, onClose], 'escapeKeyHandler', 10);

  // Cleanup on unmount with safe effect
  useSafeEffect(() => {
    return () => {
      // Ensure body scroll is restored
      document.body.style.overflow = '';
    };
  }, [], 'bodyScrollCleanup', 1);

  if (!open || !candidateId || !mounted || !portalContainerRef.current) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Prevent event from bubbling up to parent components
    e.stopPropagation();
    onClose();
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 pointer-events-auto"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-[95vw] h-full max-h-[95vh] flex flex-col bg-background rounded-lg shadow-2xl border border-border overflow-hidden relative pointer-events-auto"
        onClick={handleModalClick}
      >
        <CandidateDetailView 
          candidateId={candidateId} 
          isModal={true} 
          onClose={onClose}
        />
      </div>
    </div>
  );

  // Use Portal to render outside the current component tree
  return createPortal(modalContent, portalContainerRef.current);
}