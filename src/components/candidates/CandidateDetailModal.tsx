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
  console.log('CandidateDetailModal render:', { candidateId, open, mounted });
  
  // Use dynamic modal manager for proper z-index sequencing
  const modalId = candidateId ? `candidate-detail-${candidateId}` : 'candidate-detail-unknown';
  const { zIndex, overlayZIndex } = useModalManager(modalId, 'custom');
  
  // Enhanced debug logging for z-index
  console.log('Modal z-index values:', { modalId, zIndex, overlayZIndex, open });

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
      // Ensure portal container doesn't constrain overlays
      portalContainerRef.current.style.position = 'fixed';
      portalContainerRef.current.style.top = '0';
      portalContainerRef.current.style.left = '0';
      portalContainerRef.current.style.width = '100vw';
      portalContainerRef.current.style.height = '100vh';
      portalContainerRef.current.style.pointerEvents = 'none';
      portalContainerRef.current.style.zIndex = '1';
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
  }, []);

  // Ensure portal container exists when modal is open
  useEffect(() => {
    if (open && !portalContainerRef.current) {
      portalContainerRef.current = document.createElement('div');
      portalContainerRef.current.setAttribute('data-candidate-modal-portal', 'true');
      portalContainerRef.current.style.position = 'fixed';
      portalContainerRef.current.style.top = '0';
      portalContainerRef.current.style.left = '0';
      portalContainerRef.current.style.width = '100vw';
      portalContainerRef.current.style.height = '100vh';
      portalContainerRef.current.style.pointerEvents = 'none';
      portalContainerRef.current.style.zIndex = '1';
      document.body.appendChild(portalContainerRef.current);
    }
  }, [open]); // FIXED: Empty dependency array since this should only run once

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

  // Debug effect to check DOM elements after render
  useEffect(() => {
    if (open && mounted && portalContainerRef.current) {
      const checkModalInDOM = () => {
        const overlay = document.querySelector(`[data-modal-overlay="${modalId}"]`);
        const content = document.querySelector(`[data-modal-content="${modalId}"]`);
        
        if (overlay && content) {
          const overlayStyles = window.getComputedStyle(overlay);
          const contentStyles = window.getComputedStyle(content);
          
          console.log('Modal DOM elements found:', {
            modalId,
            overlayExists: !!overlay,
            contentExists: !!content,
            overlayDisplay: overlayStyles.display,
            overlayVisibility: overlayStyles.visibility,
            overlayOpacity: overlayStyles.opacity,
            overlayZIndex: overlayStyles.zIndex,
            contentDisplay: contentStyles.display,
            contentVisibility: contentStyles.visibility,
            contentOpacity: contentStyles.opacity,
            contentZIndex: contentStyles.zIndex,
            overlayPosition: overlayStyles.position,
            overlayTop: overlayStyles.top,
            overlayLeft: overlayStyles.left,
            overlayWidth: overlayStyles.width,
            overlayHeight: overlayStyles.height
          });
        } else {
          console.log('Modal DOM elements NOT found:', { modalId, overlayExists: !!overlay, contentExists: !!content });
        }
      };
      
      // Check after a short delay to allow DOM to update
      setTimeout(checkModalInDOM, 100);
      setTimeout(checkModalInDOM, 500);
    }
  }, [open, mounted, modalId]);

  console.log('Early return check:', { open, candidateId, mounted, portalContainer: !!portalContainerRef.current });
  if (!open || !candidateId) {
    console.log('Early return triggered - modal not rendering');
    return null;
  }

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
      style={{ 
        zIndex: overlayZIndex,
        width: '100vw',
        height: '100vh',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        position: 'fixed',
        margin: 0,
        padding: 0,
        border: 'none',
        boxSizing: 'border-box'
      }}
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

  console.log('Modal content created:', { modalId, zIndex, overlayZIndex, open });

  // Use Portal to render outside the current component tree
  console.log('Portal container:', portalContainerRef.current);
  if (!portalContainerRef.current) {
    console.error('Portal container not found!');
    return null;
  }
  return createPortal(modalContent, portalContainerRef.current);
}