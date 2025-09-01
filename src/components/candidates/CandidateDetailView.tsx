"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ServerCrash, UserX } from 'lucide-react';
import FullCandidateDetail from './FullCandidateDetail';
// Removed complex infinite loop prevention - using simple useEffect instead

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

  // Add infinite loop prevention
  const onExcessiveRuns = useCallback(() => {
    console.error('🚨 Excessive data loading detected in CandidateDetailView');
  }, []);
  
  // Simple tracking for debugging (removed complex infinite loop prevention)
  const loadDataCount = useRef(0);

  // Add abort controller for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // Simple data loading function with infinite loop prevention and timeout protection
  const loadData = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isLoadingRef.current) {
      console.log('⚠️ Request already in progress for candidate:', candidateId);
      return;
    }

    // Simple tracking (removed complex infinite loop prevention)
    loadDataCount.current++;
    if (!candidateId) {
      setIsLoading(false);
      setError('Invalid candidate ID');
      return;
    }

    console.log('🔄 Starting to load candidate data for ID:', candidateId);
    isLoadingRef.current = true;

    // Abort any existing request
    if (abortControllerRef.current) {
      console.log('🛑 Aborting existing request for candidate:', candidateId);
      abortControllerRef.current.abort();
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    // Set a longer timeout to prevent infinite loading (increased from 30s to 60s)
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && abortControllerRef.current) {
        console.warn('⏰ Loading timeout reached for candidate details:', candidateId);
        setIsLoading(false);
        setError('Loading timeout - please try again');
        abortControllerRef.current.abort();
      }
    }, 60000); // 60 second timeout (increased from 30s)

    try {
      console.log('📡 Making API requests for candidate:', candidateId);
      
      // Load all data in parallel with better error handling
      const [commentsRes, attachmentsRes, candidateRes] = await Promise.allSettled([
        fetch(`/api/candidates/${candidateId}/comments?limit=5&offset=0`, {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        }),
        fetch(`/api/candidates/${candidateId}/resumes?limit=20&offset=0`, {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        }),
        fetch(`/api/candidates/${candidateId}`, {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        })
      ]);

      console.log('📡 API responses received for candidate:', candidateId, {
        comments: commentsRes.status,
        attachments: attachmentsRes.status,
        candidate: candidateRes.status
      });

      // Clear timeout since we got a response
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Handle comments
      if (commentsRes.status === 'fulfilled' && commentsRes.value.ok) {
        try {
          const commentsData = await commentsRes.value.json();
          setComments(Array.isArray(commentsData) ? commentsData : (commentsData.data || []));
          console.log('✅ Comments loaded successfully');
        } catch (parseError) {
          console.warn('⚠️ Failed to parse comments response:', parseError);
          setComments([]);
        }
      } else if (commentsRes.status === 'rejected') {
        // Check if it's an AbortError
        if (commentsRes.reason?.name === 'AbortError') {
          console.log('🛑 Comments request was aborted');
          return; // Exit early for aborted requests
        }
        console.warn('⚠️ Comments request failed:', commentsRes.reason);
        setComments([]);
      } else {
        console.warn('⚠️ Comments request failed with status:', commentsRes.value.status);
        setComments([]);
      }

      // Handle attachments
      if (attachmentsRes.status === 'fulfilled' && attachmentsRes.value.ok) {
        try {
          const attachmentsData = await attachmentsRes.value.json();
          setAttachments(Array.isArray(attachmentsData) ? attachmentsData : (attachmentsData.data || []));
          console.log('✅ Attachments loaded successfully');
        } catch (parseError) {
          console.warn('⚠️ Failed to parse attachments response:', parseError);
          setAttachments([]);
        }
      } else if (attachmentsRes.status === 'rejected') {
        // Check if it's an AbortError
        if (attachmentsRes.reason?.name === 'AbortError') {
          console.log('🛑 Attachments request was aborted');
          return; // Exit early for aborted requests
        }
        console.warn('⚠️ Attachments request failed:', attachmentsRes.reason);
        setAttachments([]);
      } else {
        console.warn('⚠️ Attachments request failed with status:', attachmentsRes.value.status);
        setAttachments([]);
      }

      // Handle candidate existence check
      if (candidateRes.status === 'fulfilled') {
        if (candidateRes.value.ok) {
          setCandidateExists(true);
          console.log('✅ Candidate exists and is accessible');
        } else if (candidateRes.value.status === 404) {
          setCandidateExists(false);
          setError('Candidate not found');
          console.warn('❌ Candidate not found (404)');
        } else {
          console.warn('⚠️ Candidate request failed with status:', candidateRes.value.status);
          setCandidateExists(true); // Assume exists if we can't determine
        }
      } else if (candidateRes.status === 'rejected') {
        // Check if it's an AbortError
        if (candidateRes.reason?.name === 'AbortError') {
          console.log('🛑 Candidate request was aborted');
          return; // Exit early for aborted requests
        }
        console.warn('⚠️ Candidate request rejected:', candidateRes.reason);
        setCandidateExists(true); // Assume exists if request failed
      }

      console.log('✅ All candidate data loading completed for:', candidateId);

    } catch (error: any) {
      // Clear timeout since we got an error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Don't set error for aborted requests
      if (error.name === 'AbortError') {
        console.log('🛑 Request aborted for candidate:', candidateId);
        return;
      }
      
      console.error('❌ Error loading candidate data:', error);
      setError('Failed to load candidate data. Please try again.');
      setCandidateExists(false);
    } finally {
      isLoadingRef.current = false;
      if (mountedRef.current) {
        setIsLoading(false);
        console.log('🏁 Loading state set to false for candidate:', candidateId);
      }
    }
  }, [candidateId]);

  // Load data when component mounts or candidateId changes - FIXED: Use useEffect instead of useSafeEffect
  useEffect(() => {
    mountedRef.current = true;
    loadData();
    
    return () => {
      mountedRef.current = false;
      // Abort any ongoing requests on cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Clear any pending debounce timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      // Reset loading flag
      isLoadingRef.current = false;
    };
  }, [loadData]);

  // Debounced refresh to prevent rapid successive calls
  const handleRefresh = useCallback(() => {
    // Clear any existing debounce timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set a new debounce timeout
    debounceRef.current = setTimeout(() => {
      loadData();
    }, 300); // 300ms debounce
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