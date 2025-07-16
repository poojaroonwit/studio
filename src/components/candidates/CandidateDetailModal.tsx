"use client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import FullCandidateDetail from "./FullCandidateDetail";

interface CandidateDetailModalProps {
  candidateId: string | null;
  open: boolean;
  onClose: () => void;
}

const CandidateDetailModal = ({ candidateId, open, onClose }: CandidateDetailModalProps) => {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent 
        className="relative flex flex-col overflow-hidden max-w-[90vw] max-h-[90vh] w-[1200px] h-[800px]"
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