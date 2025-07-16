"use client";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import FullCandidateDetail from "./FullCandidateDetail";

interface CandidateDetailModalProps {
  candidateId: string | null;
  open: boolean;
  onClose: () => void;
}

const CandidateDetailModal = ({ candidateId, open, onClose }: CandidateDetailModalProps) => {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogOverlay />
      <DialogContent 
        className="relative flex flex-col overflow-hidden"
        style={{
          width: 'min(90vw, 1200px)',
          height: 'min(90vh, 800px)',
          maxWidth: 'calc(100vw - 2rem)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
      >
        {candidateId ? (
          <FullCandidateDetail candidateId={candidateId} isModal onClose={onClose} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">No candidate found.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CandidateDetailModal;