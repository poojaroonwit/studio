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
        className="relative flex flex-col overflow-hidden max-w-[95vw] max-h-[95vh] w-[1200px] h-[800px] p-0"
      >
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
      </DialogContent>
    </Dialog>
  );
};

export default CandidateDetailModal;