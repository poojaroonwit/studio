import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ServerCrash, UserX } from 'lucide-react';
import FullCandidateDetail from './FullCandidateDetail';

interface CandidateDetailViewProps {
  candidateId: string;
  onClose?: () => void;
  isModal?: boolean;
}

const CandidateDetailView: React.FC<CandidateDetailViewProps> = ({ candidateId, onClose, isModal }) => {
  const [comments, setComments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidateExists, setCandidateExists] = useState<boolean | null>(null);

  // Simple data loading function
  const loadData = useCallback(async () => {
    if (!candidateId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load all data in parallel with simple error handling
      const [commentsRes, attachmentsRes] = await Promise.allSettled([
        fetch(`/api/candidates/${candidateId}/comments?limit=5&offset=0`, {
          credentials: 'include'
        }),
        fetch(`/api/candidates/${candidateId}/resumes?limit=20&offset=0`, {
          credentials: 'include'
        })
      ]);

      // Handle comments
      if (commentsRes.status === 'fulfilled' && commentsRes.value.ok) {
        const commentsData = await commentsRes.value.json();
        setComments(Array.isArray(commentsData) ? commentsData : (commentsData.data || []));
      } else {
        setComments([]);
      }

      // Handle attachments
      if (attachmentsRes.status === 'fulfilled' && attachmentsRes.value.ok) {
        const attachmentsData = await attachmentsRes.value.json();
        setAttachments(Array.isArray(attachmentsData) ? attachmentsData : (attachmentsData.data || []));
      } else {
        setAttachments([]);
      }

      // Check if candidate exists by trying to load basic candidate data
      try {
        const candidateRes = await fetch(`/api/candidates/${candidateId}`, {
          credentials: 'include'
        });
        
        if (candidateRes.ok) {
          setCandidateExists(true);
        } else if (candidateRes.status === 404) {
          setCandidateExists(false);
          setError('Candidate not found');
        } else {
          setCandidateExists(true); // Assume exists if we can't determine
        }
      } catch (candidateError) {
        setCandidateExists(true);
      }

    } catch (error: any) {
      setError('Failed to load candidate data. Please try again.');
      setCandidateExists(false);
    } finally {
      setIsLoading(false);
    }
  }, [candidateId]);

  // Load data when component mounts or candidateId changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    loadData();
  }, [loadData]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <p className="text-muted-foreground">Loading candidate details...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4 text-center">
          <ServerCrash className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="text-lg font-medium text-foreground">Error Loading Candidate</h3>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <div className="flex gap-2">
              <Button 
                onClick={handleRefresh} 
                variant="outline"
                size="sm"
              >
                <Loader2 className="h-4 w-4 mr-2" />
                Retry
              </Button>
              {onClose && (
                <Button 
                  onClick={onClose} 
                  variant="outline"
                  size="sm"
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show candidate not found
  if (candidateExists === false) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4 text-center">
          <UserX className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="text-lg font-medium text-foreground">Candidate Not Found</h3>
            <p className="text-muted-foreground text-sm mb-4">The candidate you're looking for doesn't exist or you don't have permission to view it.</p>
            {onClose && <Button onClick={onClose}>Close</Button>}
          </div>
        </div>
      </div>
    );
  }

  // Show candidate details
  return (
    <FullCandidateDetail
      candidateId={candidateId}
      isModal={isModal}
      onClose={onClose}
      comments={comments}
      resumes={attachments}
      onRefresh={handleRefresh}
    />
  );
};

export default CandidateDetailView; 