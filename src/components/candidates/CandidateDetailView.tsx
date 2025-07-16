import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';

interface CandidateDetailViewProps {
  candidateId: string;
  onClose?: () => void;
  isModal?: boolean;
}

const CandidateDetailView: React.FC<CandidateDetailViewProps> = ({ candidateId, onClose, isModal }) => {
  const [candidate, setCandidate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!candidateId) return;
    setIsLoading(true);
    setError(null);
    fetch(`/api/candidates/${candidateId}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.text();
          throw new Error(err || 'Failed to fetch candidate');
        }
        return res.json();
      })
      .then((data) => {
        setCandidate(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Error fetching candidate');
        setIsLoading(false);
      });
  }, [candidateId]);

  return (
    <div className="relative w-full h-full">
      {isModal && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full hover:bg-muted transition"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
      )}
      <div className="flex items-center justify-center min-h-[200px] w-full">
        {isLoading ? (
          <Loader2 className="animate-spin w-8 h-8 text-primary" />
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : candidate ? (
          <Card className="w-full max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>{candidate.name || 'No Name'}</CardTitle>
              <div className="flex gap-2 mt-2">
                {candidate.status && (
                  <Badge>{candidate.status}</Badge>
                )}
                {candidate.position?.title && (
                  <Badge variant="secondary">{candidate.position.title}</Badge>
                )}
                {candidate.fitScore != null && (
                  <Badge variant="outline">Fit: {candidate.fitScore}%</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {candidate.email && (
                  <div><span className="font-semibold">Email:</span> {candidate.email}</div>
                )}
                {candidate.phone && (
                  <div><span className="font-semibold">Phone:</span> {candidate.phone}</div>
                )}
                {candidate.recruiter?.name && (
                  <div><span className="font-semibold">Recruiter:</span> {candidate.recruiter.name}</div>
                )}
                {candidate.applicationDate && (
                  <div><span className="font-semibold">Applied:</span> {new Date(candidate.applicationDate).toLocaleDateString()}</div>
                )}
                {/* Add more fields as needed */}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div>No candidate data found.</div>
        )}
      </div>
    </div>
  );
};

export default CandidateDetailView; 