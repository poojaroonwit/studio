"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import CandidateDetailView from './CandidateDetailView';
import { useModalManager } from '@/lib/modal-manager';
// Removed complex infinite loop prevention - using simple useEffect instead

interface CandidateDetailModalProps {
  candidateId: string;
  open: boolean;
  onClose: () => void;
}

export default function CandidateDetailModal({ candidateId, open, onClose }: CandidateDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const portalContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Debug logging
  // console.log('CandidateDetailModal render:', { candidateId, open, mounted });
  
  // TEMPORARILY DISABLED: Modal manager for debugging
  const modalId = candidateId ? `candidate-detail-${candidateId}` : 'candidate-detail-unknown';
  // const { zIndex, overlayZIndex } = useModalManager(modalId, 'custom');
  
  // Use fixed z-index values for testing
  const zIndex = 60000;
  const overlayZIndex = 59999;

  // Add infinite loop prevention
  // Simple tracking for debugging (removed complex infinite loop prevention)
  const modalOpenCount = useRef(0);

  // Create portal container on mount - FIXED: Use useEffect instead of useSafeEffect
  useEffect(() => {
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
  }, []); // FIXED: Empty dependency array since this should only run once

  // Handle escape key - FIXED: Use useEffect instead of useSafeEffect
  useEffect(() => {
    // Simple tracking (removed complex infinite loop prevention)
    modalOpenCount.current++;

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
  }, [open, onClose]); // FIXED: Removed trackModalOpen dependency

  // Cleanup on unmount - FIXED: Use useEffect instead of useSafeEffect
  useEffect(() => {
    return () => {
      // Ensure body scroll is restored
      document.body.style.overflow = '';
    };
  }, []); // FIXED: Empty dependency array for cleanup

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
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
      style={{ zIndex: overlayZIndex }}
      onClick={handleBackdropClick}
      data-modal-overlay={modalId}
    >
      <div
        className="w-full max-w-[95vw] h-full max-h-[95vh] flex flex-col bg-background rounded-lg shadow-2xl border border-border overflow-hidden relative pointer-events-auto"
        style={{ zIndex }}
        onClick={handleModalClick}
        data-modal-content={modalId}
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