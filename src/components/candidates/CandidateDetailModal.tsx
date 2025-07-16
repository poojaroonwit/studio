"use client";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { X } from "lucide-react";
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
      <DialogContent className="w-[90vw] h-[90vh] max-w-5xl max-h-[90vh] relative flex flex-col overflow-auto left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full hover:bg-muted transition"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
        {candidateId ? (
          <FullCandidateDetail candidateId={candidateId} isModal onClose={onClose} />
        ) : (
          <div className="flex-1 flex items-center justify-center">No candidate found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CandidateDetailModal;