"use client";
import { useEffect } from "react";
import FullCandidateDetail from "./FullCandidateDetail";
import { X } from "lucide-react";

interface CandidateDetailModalProps {
  candidateId: string | null;
  open: boolean;
  onClose: () => void;
}

const CandidateDetailModal = ({ candidateId, open, onClose }: CandidateDetailModalProps) => {
  console.log('CandidateDetailModal: Props received:', { candidateId, open, onClose });
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed top-[80px] left-1/2 transform -translate-x-1/2 z-50 bg-background border border-border rounded-lg shadow-lg max-w-[95vw] max-h-[90vh] w-[1200px] h-[800px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        
        {/* Content */}
        {candidateId ? (
          <div className="flex flex-col h-full overflow-hidden">
            <FullCandidateDetail candidateId={candidateId} isModal onClose={onClose} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <p className="text-muted-foreground">No candidate found.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CandidateDetailModal;