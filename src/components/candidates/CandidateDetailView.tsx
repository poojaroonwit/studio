import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import FullCandidateDetail from './FullCandidateDetail';
import { useUnifiedRealtime } from '@/hooks/use-unified-realtime';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface CandidateDetailViewProps {
  candidateId: string;
  onClose?: () => void;
  isModal?: boolean;
}

const CandidateDetailView: React.FC<CandidateDetailViewProps> = ({ candidateId, onClose, isModal }) => {
  const [comments, setComments] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [candidateExists, setCandidateExists] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Unified realtime hook
  const { isConnected: realtimeConnected } = useUnifiedRealtime({
    onCandidateUpdate: (updatedCandidate) => {
      if (updatedCandidate.id === candidateId && isMountedRef.current) {
        // Update the candidate data
        // setCandidate(prev => ({ ...prev, ...updatedCandidate })); // This line was removed as per the new_code
      }
    },
    onNotification: (notification) => {
      // Handle notifications if needed
    },
    showNotifications: false, // Disable notifications to prevent conflicts
    showErrorNotifications: false // Disable error toast notifications
  });

  const { status } = useSession();
  const router = useRouter();

  // First, validate that the candidate exists
  const validateCandidate = useCallback(async () => {
    if (!candidateId || !isMountedRef.current) return false;
    
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: 'HEAD', // Just check if it exists, don't fetch data
        signal: abortControllerRef.current?.signal
      });
      
      if (!isMountedRef.current) return false;
      
      if (res.ok) {
        setCandidateExists(true);
        return true;
      } else if (res.status === 404) {
        setCandidateExists(false);
        setError('Candidate not found');
        return false;
      } else {
        setCandidateExists(false);
        setError(`Failed to validate candidate: ${res.status}`);
        return false;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return false;
      }
      console.error('Error validating candidate:', error);
      setCandidateExists(false);
      setError('Failed to validate candidate');
      return false;
    }
  }, [candidateId]);

  const fetchComments = useCallback(async (limit = 10, offset = 0) => {
    if (!isMountedRef.current || !candidateExists) return [];
    
    try {
      // Create new abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      const res = await fetch(`/api/candidates/${candidateId}/comments?limit=${limit}&offset=${offset}`, {
        signal: controller.signal
      });
      
      if (!isMountedRef.current) return [];
      
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.data) ? data.data : [];
      }
      return [];
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return [];
      }
      console.error('Error fetching comments:', error);
      return [];
    }
  }, [candidateId, candidateExists]);

  const fetchResumes = useCallback(async (limit = 20, offset = 0) => {
    if (!isMountedRef.current || !candidateExists) return [];
    
    try {
      // Create new abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      const res = await fetch(`/api/candidates/${candidateId}/resumes?limit=${limit}&offset=${offset}`, {
        signal: controller.signal
      });
      
      if (!isMountedRef.current) return [];
      
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.data) ? data.data : [];
      }
      return [];
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return [];
      }
      console.error('Error fetching resumes:', error);
      return [];
    }
  }, [candidateId, candidateExists]);

  // Merge attachments from resumes and comments (same logic as candidate ID page)
  const loadAllAttachments = useCallback(async () => {
    if (!isMountedRef.current || !candidateExists) return;
    
    setIsLoading(true);
    
    try {
      const [resumeAttachments, commentList] = await Promise.all([
        fetchResumes(),
        fetchComments(),
      ]);
      
      if (!isMountedRef.current) return;
      
      // Set individual states for backward compatibility
      setResumes(resumeAttachments);
      setComments(commentList);
      
      // Extract attachments from comments
      const commentAttachments = (commentList || []).flatMap((comment: any) =>
        (comment.attachments || []).map((att: any) => ({
          ...att,
          label: att.label || 'comment',
          updatedAt: att.updatedAt || comment.createdAt || new Date().toISOString(),
        }))
      );
      
      // Merge and remove duplicates by filePath, id, or url
      const all = [...(resumeAttachments || []), ...commentAttachments];
      const unique: any[] = [];
      const seen = new Set();
      for (const att of all) {
        const key = att.filePath || att.id || att.url;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(att);
        }
      }
      unique.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setAttachments(unique);
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchResumes, fetchComments, candidateExists]);

  const handleRefresh = useCallback(() => {
    if (isMountedRef.current) {
      loadAllAttachments();
    }
  }, [loadAllAttachments]);

  useEffect(() => {
    isMountedRef.current = true;
    
    const initialize = async () => {
      // First validate the candidate exists
      const exists = await validateCandidate();
      if (exists && isMountedRef.current) {
        // Only load attachments if candidate exists
        await loadAllAttachments();
      } else if (isMountedRef.current) {
        // If candidate doesn't exist, stop loading
        setIsLoading(false);
      }
    };
    
    initialize();
    
    return () => {
      isMountedRef.current = false;
      // Abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [validateCandidate, loadAllAttachments]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Show error if candidate doesn't exist
  if (candidateExists === false) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div>
            <h3 className="text-lg font-medium text-foreground">Candidate Not Found</h3>
            <p className="text-muted-foreground text-sm mb-4">{error || 'The requested candidate could not be found.'}</p>
            {onClose && (
              <Button onClick={onClose} variant="outline" size="sm">
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

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

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div>
            <h3 className="text-lg font-medium text-foreground">Authentication Required</h3>
            <p className="text-muted-foreground text-sm mb-4">Please sign in to view candidate details.</p>
            <button 
              onClick={() => router.push('/auth/signin')} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FullCandidateDetail
      candidateId={candidateId}
      isModal={isModal}
      onClose={onClose}
      comments={comments}
      resumes={Array.isArray(attachments) ? attachments : []}
      onRefresh={handleRefresh}
    />
  );
};

export default CandidateDetailView; 