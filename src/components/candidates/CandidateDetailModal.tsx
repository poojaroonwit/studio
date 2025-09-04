"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import CandidateDetailView from './CandidateDetailView';
import { zIndexManager } from '@/lib/z-index-manager';

interface CandidateDetailModalProps {
  candidateId: string;
  open: boolean;
  onClose: () => void;
}

export default function CandidateDetailModal({ candidateId, open, onClose }: CandidateDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [zIndex, setZIndex] = useState({ overlay: 10002, content: 10003 });
  const portalContainerRef = useRef<HTMLDivElement | null>(null);
  const modalIdRef = useRef<string | null>(null);

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

  // Handle modal opening/closing and z-index management
  useEffect(() => {
    if (open && candidateId) {
      // Generate unique modal ID
      modalIdRef.current = zIndexManager.generateId('custom-modal');
      const { overlayZIndex, contentZIndex } = zIndexManager.registerModal(modalIdRef.current, 'custom-modal');
      setZIndex({ overlay: overlayZIndex, content: contentZIndex });
      
      console.log(`[CandidateDetailModal] Opened with z-index ${overlayZIndex}/${contentZIndex}`);
    } else if (modalIdRef.current) {
      // Unregister modal when closing
      zIndexManager.unregisterModal(modalIdRef.current);
      modalIdRef.current = null;
      console.log(`[CandidateDetailModal] Closed and unregistered`);
    }
  }, [open, candidateId]);

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
      // Clean up modal registration
      if (modalIdRef.current) {
        zIndexManager.unregisterModal(modalIdRef.current);
      }
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
      style={{ zIndex: zIndex.overlay }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-[95vw] h-full max-h-[95vh] flex flex-col bg-background rounded-lg shadow-2xl border border-border overflow-hidden relative pointer-events-auto"
        style={{ zIndex: zIndex.content }}
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
