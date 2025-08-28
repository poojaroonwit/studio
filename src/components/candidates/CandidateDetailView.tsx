import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import FullCandidateDetail from './FullCandidateDetail';
import { useUnifiedRealtime } from '@/hooks/use-unified-realtime';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/error-boundary';

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

  const fetchComments = useCallback(async (limit = 10, offset = 0) => {
    if (!isMountedRef.current) return [];
    
    console.log('[CandidateDetailView] Fetching comments for candidate:', candidateId);
    
    let controller: AbortController | null = null;
    try {
      // Create dedicated controller for this request
      controller = new AbortController();
      
      console.log('[CandidateDetailView] Making comments API request');
      const res = await fetch(`/api/candidates/${candidateId}/comments?limit=${limit}&offset=${offset}`, {
        signal: controller.signal
      });
      
      if (!isMountedRef.current) return [];
      
      console.log('[CandidateDetailView] Comments API response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('[CandidateDetailView] Comments API response data:', data);
        return Array.isArray(data.data) ? data.data : [];
      } else {
        console.error(`[CandidateDetailView] Comments API error: ${res.status} ${res.statusText}`);
        return [];
      }
    } catch (error) {
      if (!isMountedRef.current) return [];
      
      if (error instanceof Error && error.name === 'AbortError') {
        return [];
      }
      console.error('Error fetching comments:', error);
      return [];
    } finally {
      controller = null; // Clear reference to prevent leaks
    }
  }, [candidateId]);

  const fetchResumes = useCallback(async (limit = 20, offset = 0) => {
    if (!isMountedRef.current) return [];
    
    console.log('[CandidateDetailView] Fetching resumes for candidate:', candidateId);
    
    let controller: AbortController | null = null;
    try {
      // Create dedicated controller for this request
      controller = new AbortController();
      
      console.log('[CandidateDetailView] Making resumes API request');
      const res = await fetch(`/api/candidates/${candidateId}/resumes?limit=${limit}&offset=${offset}`, {
        signal: controller.signal
      });
      
      if (!isMountedRef.current) return [];
      
      console.log('[CandidateDetailView] Resumes API response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('[CandidateDetailView] Resumes API response data:', data);
        return Array.isArray(data.data) ? data.data : [];
      } else {
        console.error(`[CandidateDetailView] Resumes API error: ${res.status} ${res.statusText}`);
        return [];
      }
    } catch (error) {
      if (!isMountedRef.current) return [];
      
      if (error instanceof Error && error.name === 'AbortError') {
        return [];
      }
      console.error('Error fetching resumes:', error);
      return [];
    } finally {
      controller = null; // Clear reference to prevent leaks
    }
  }, [candidateId]);

  // Merge attachments from resumes and comments (same logic as candidate ID page)
  const loadAllAttachments = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    console.log('[CandidateDetailView] Starting to load all attachments');
    setIsLoading(true);
    
    try {
      console.log('[CandidateDetailView] Fetching resumes and comments in parallel');
      
      // Use Promise.allSettled to prevent one failed request from blocking the other
      const results = await Promise.allSettled([
        fetchResumes().catch(err => {
          console.error('[CandidateDetailView] Resume fetch failed:', err);
          return [];
        }),
        fetchComments().catch(err => {
          console.error('[CandidateDetailView] Comments fetch failed:', err);
          return [];
        })
      ]);
      
      console.log('[CandidateDetailView] Promise.allSettled completed. Results:', results.map(r => r.status));
      
      // Extract results safely
      const resumeAttachments = results[0].status === 'fulfilled' ? results[0].value : [];
      const commentList = results[1].status === 'fulfilled' ? results[1].value : [];
      
      console.log('[CandidateDetailView] Resumes and comments fetched successfully. Resumes:', resumeAttachments?.length, 'Comments:', commentList?.length);
      
      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }
      
      // Set individual states for backward compatibility
      setResumes(resumeAttachments || []);
      setComments(commentList || []);
      
      // Extract attachments from comments safely
      const commentAttachments = (commentList || []).flatMap((comment: any) => {
        if (!comment || !Array.isArray(comment.attachments)) return [];
        return comment.attachments.map((att: any) => ({
          ...att,
          label: att.label || 'comment',
          updatedAt: att.updatedAt || comment.createdAt || new Date().toISOString(),
        }));
      });
      
      // Merge and remove duplicates safely
      const all = [...(resumeAttachments || []), ...commentAttachments];
      const unique: any[] = [];
      const seen = new Set();
      
      for (const att of all) {
        if (!att) continue;
        const key = att.filePath || att.id || att.url || JSON.stringify(att);
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(att);
        }
      }
      
      // Sort safely
      unique.sort((a, b) => {
        const dateA = new Date(b.updatedAt || 0).getTime();
        const dateB = new Date(a.updatedAt || 0).getTime();
        return dateA - dateB;
      });
      
      console.log('[CandidateDetailView] Final attachments processed:', unique.length);
      setAttachments(unique);
    } catch (error) {
      console.error('[CandidateDetailView] Error loading attachments:', error);
      // Always set empty arrays to prevent hanging
      if (isMountedRef.current) {
        setResumes([]);
        setComments([]);
        setAttachments([]);
        setError(`Failed to load attachments: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      if (isMountedRef.current) {
        console.log('[CandidateDetailView] Setting loading to false');
        setIsLoading(false);
      }
    }
  }, [fetchResumes, fetchComments]);

  const handleRefresh = useCallback(() => {
    if (isMountedRef.current) {
      loadAllAttachments();
    }
  }, [loadAllAttachments]);

  useEffect(() => {
    // Prevent multiple initializations
    if (!candidateId || !isMountedRef.current) return;
    
    isMountedRef.current = true;
    
    const initialize = async () => {
      try {
        console.log('[CandidateDetailView] Starting candidate detail initialization');
        
        // Load attachments directly without validation step
        await loadAllAttachments();
        
      } catch (error) {
        console.error('Error during candidate detail initialization:', error);
        if (isMountedRef.current) {
          setError(`Failed to load candidate details: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsLoading(false);
        }
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
  }, [candidateId, loadAllAttachments]); // Include loadAllAttachments in dependencies

  // Comprehensive cleanup on unmount
  useEffect(() => {
    return () => {
      // Mark as unmounted first
      isMountedRef.current = false;
      
      // Abort any ongoing requests
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch (e) {
          console.warn('Error aborting request:', e);
        } finally {
          abortControllerRef.current = null;
        }
      }
      
      // Note: Individual timeouts are cleaned up in their respective functions
      // No need for global timeout cleanup as it can interfere with other components
    };
  }, []);

  // Show error if candidate doesn't exist
  if (error && !isLoading) {
    console.error('[CandidateDetailView] Loading error:', error);
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div>
            <h3 className="text-lg font-medium text-foreground">Loading Error</h3>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                Retry
              </Button>
              {onClose && (
                <Button onClick={onClose} variant="outline" size="sm">
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    console.log('[CandidateDetailView] Loading state - validating candidate and loading attachments');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <p className="text-muted-foreground">Loading candidate details...</p>
          {isModal && (
            <p className="text-xs text-muted-foreground opacity-75">
              If this takes too long, try closing and reopening the modal
            </p>
          )}
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
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('[CandidateDetailView] FullCandidateDetail error:', error, errorInfo);
      }}
      fallback={(
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div>
              <h3 className="text-lg font-medium text-foreground">Component Error</h3>
              <p className="text-muted-foreground text-sm mb-4">FullCandidateDetail failed to load</p>
              <div className="flex gap-2">
                <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                  Retry
                </Button>
                {onClose && (
                  <Button onClick={onClose} variant="outline" size="sm">
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    >
      <FullCandidateDetail
        candidateId={candidateId}
        isModal={isModal}
        onClose={onClose}
        comments={comments}
        resumes={Array.isArray(attachments) ? attachments : []}
        onRefresh={handleRefresh}
      />
    </ErrorBoundary>
  );
};

export default CandidateDetailView;