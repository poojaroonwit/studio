"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { Loader2, X } from "lucide-react";

interface CandidateDetailModalProps {
  candidateId: string | null;
  open: boolean;
  onClose: () => void;
}

interface Candidate {
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  // Add more fields as needed
}

const CandidateDetailModal = ({ candidateId, open, onClose }: CandidateDetailModalProps) => {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!candidateId || !open) return;
    setLoading(true);
    setError(null);
    fetch(`/api/candidates/${candidateId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch candidate");
        return res.json();
      })
      .then(data => {
        setCandidate(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [candidateId, open]);

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
        {loading ? (
          <div className="flex items-center justify-center h-40 flex-1">
            <Loader2 className="animate-spin w-8 h-8 text-primary" />
          </div>
        ) : error ? (
          <div className="text-red-500 flex-1 flex items-center justify-center">{error}</div>
        ) : candidate ? (
          <div className="flex-1 overflow-auto p-4">
            <h2 className="text-2xl font-bold mb-2">{candidate.name}</h2>
            <p className="mb-1"><b>Email:</b> {candidate.email}</p>
            <p className="mb-1"><b>Phone:</b> {candidate.phone}</p>
            <p className="mb-1"><b>Status:</b> {candidate.status}</p>
            {/* Add more fields as needed */}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">No candidate found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CandidateDetailModal;