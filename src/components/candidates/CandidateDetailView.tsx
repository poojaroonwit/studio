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
    
    let controller: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      // Create dedicated controller with timeout
      controller = new AbortController();
      
      // Set timeout for the request
      timeoutId = setTimeout(() => {
        if (controller) controller.abort();
      }, 8000); // 8 second timeout (shorter for modal)
      
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: 'HEAD', // Just check if it exists, don't fetch data
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!isMountedRef.current) return false;
      
      if (res.ok) {
        setCandidateExists(true);
        return true;
      } else if (res.status === 404) {
        setCandidateExists(false);
        setError('Candidate not found');
        return false;
      } else if (res.status === 401) {
        setCandidateExists(false);
        setError('Authentication required. Please sign in again.');
        return false;
      } else if (res.status === 403) {
        setCandidateExists(false);
        setError('Access denied to this candidate');
        return false;
      } else if (res.status >= 500) {
        setCandidateExists(false);
        setError(`Server error (${res.status}). Cannot load candidate details.`);
        return false;
      } else {
        setCandidateExists(false);
        setError(`Failed to validate candidate (status: ${res.status})`);
        return false;
      }
    } catch (error) {
      if (!isMountedRef.current) return false;
      
      if (error instanceof Error && error.name === 'AbortError') {
        setCandidateExists(false);
        setError('Request timed out. The server may be slow or unreachable.');
        return false;
      }
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        setCandidateExists(false);
        setError('Network error. Check your connection or try again later.');
        return false;
      }
      console.error('Error validating candidate:', error);
      setCandidateExists(false);
      setError(`Failed to validate candidate: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      // Critical: Always clean up resources
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      controller = null;
    }
  }, [candidateId]);

  const fetchComments = useCallback(async (limit = 10, offset = 0) => {
    if (!isMountedRef.current || !candidateExists) return [];
    
    let controller: AbortController | null = null;
    try {
      // Create dedicated controller for this request
      controller = new AbortController();
      
      const res = await fetch(`/api/candidates/${candidateId}/comments?limit=${limit}&offset=${offset}`, {
        signal: controller.signal
      });
      
      if (!isMountedRef.current) return [];
      
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.data) ? data.data : [];
      } else {
        console.error(`Comments API error: ${res.status} ${res.statusText}`);
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
  }, [candidateId, candidateExists]);

  const fetchResumes = useCallback(async (limit = 20, offset = 0) => {
    if (!isMountedRef.current || !candidateExists) return [];
    
    let controller: AbortController | null = null;
    try {
      // Create dedicated controller for this request
      controller = new AbortController();
      
      const res = await fetch(`/api/candidates/${candidateId}/resumes?limit=${limit}&offset=${offset}`, {
        signal: controller.signal
      });
      
      if (!isMountedRef.current) return [];
      
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.data) ? data.data : [];
      } else {
        console.error(`Resumes API error: ${res.status} ${res.statusText}`);
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
  }, [candidateId, candidateExists]);

  // Merge attachments from resumes and comments (same logic as candidate ID page)
  const loadAllAttachments = useCallback(async () => {
    if (!isMountedRef.current || !candidateExists) return;
    
    setIsLoading(true);
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      // Add timeout for the entire attachment loading process
      let hasTimedOut = false;
      timeoutId = setTimeout(() => {
        hasTimedOut = true;
      }, 10000); // Reduced to 10 seconds for faster failure
      
      const [resumeAttachments, commentList] = await Promise.all([
        fetchResumes().catch(err => {
          console.error('Resume fetch failed:', err);
          return [];
        }),
        fetchComments().catch(err => {
          console.error('Comments fetch failed:', err);
          return [];
        })
      ]);
      
      // Check if we timed out
      if (hasTimedOut || !isMountedRef.current) {
        if (hasTimedOut) {
          console.warn('Attachment loading timed out');
          setError('Loading timed out. Some attachments may not be visible.');
        }
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
      
      setAttachments(unique);
    } catch (error) {
      console.error('Error loading attachments:', error);
      // Always set empty arrays to prevent hanging
      if (isMountedRef.current) {
        setResumes([]);
        setComments([]);
        setAttachments([]);
        setError(`Failed to load attachments: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      // Critical: Always clean up resources
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
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
    // Prevent multiple initializations
    if (!candidateId || !isMountedRef.current) return;
    
    isMountedRef.current = true;
    let initTimeoutId: NodeJS.Timeout | null = null;
    let isInitializing = false;
    
    const initialize = async () => {
      // Prevent multiple simultaneous initializations
      if (isInitializing) return;
      isInitializing = true;
      
      try {
        // Set overall timeout for initialization (no promises - direct timeout)
        let hasTimedOut = false;
        initTimeoutId = setTimeout(() => {
          hasTimedOut = true;
          console.warn('Candidate detail initialization timed out');
        }, 15000); // Reduced timeout
        
        // First validate the candidate exists
        const exists = await validateCandidate();
        
        // Check timeout before proceeding
        if (hasTimedOut || !isMountedRef.current) {
          if (hasTimedOut) {
            setError('Loading timed out. The server may be experiencing issues.');
          }
          setIsLoading(false);
          return;

        }
        
        if (exists && isMountedRef.current) {
          // Only load attachments if candidate exists and we haven't timed out
          await loadAllAttachments();
        } else if (isMountedRef.current) {
          // If candidate doesn't exist, stop loading
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error during candidate detail initialization:', error);
        if (isMountedRef.current) {
          setError(`Failed to load candidate details: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsLoading(false);
        }
      } finally {
        isInitializing = false;
        // Critical: Always clean up timeout
        if (initTimeoutId) {
          clearTimeout(initTimeoutId);
          initTimeoutId = null;
        }
      }
    };
    
    initialize();
    
    return () => {
      isMountedRef.current = false;
      isInitializing = false;
      
      // Critical: Clean up all resources
      if (initTimeoutId) {
        clearTimeout(initTimeoutId);
        initTimeoutId = null;
      }
      
      // Abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [candidateId]); // Only depend on candidateId to prevent re-initialization

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

  // Show error state
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