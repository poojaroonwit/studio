"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ServerCrash, UserX, X } from 'lucide-react';
import FullCandidateDetail from './FullCandidateDetail';

interface MobileCandidateDetailViewProps {
  candidateId: string;
  onClose?: () => void;
  onRefresh?: () => void;
}

export default function MobileCandidateDetailView({ 
  candidateId, 
  onClose,
  onRefresh
}: MobileCandidateDetailViewProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidateExists, setCandidateExists] = useState<boolean | null>(null);

  const loadDataCount = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }

    loadDataCount.current++;
    if (!candidateId) {
      setIsLoading(false);
      setError('Invalid candidate ID');
      return;
    }

    isLoadingRef.current = true;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && abortControllerRef.current) {
        console.warn('Loading timeout reached for candidate details:', candidateId);
        setIsLoading(false);
        setError('Loading timeout - please try again');
        abortControllerRef.current.abort();
      }
    }, 60000);

    try {
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

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!mountedRef.current) return;

      if (candidateRes.status === 'fulfilled' && candidateRes.value.ok) {
        const candidateData = await candidateRes.value.json();
        setCandidateExists(!!candidateData);
      } else {
        setCandidateExists(false);
        setError('Candidate not found');
        setIsLoading(false);
        return;
      }

      if (commentsRes.status === 'fulfilled' && commentsRes.value.ok) {
        const commentsData = await commentsRes.value.json();
        setComments(Array.isArray(commentsData) ? commentsData : (commentsData.data || []));
      }

      if (attachmentsRes.status === 'fulfilled' && attachmentsRes.value.ok) {
        const attachmentsData = await attachmentsRes.value.json();
        setAttachments(Array.isArray(attachmentsData) ? attachmentsData : (attachmentsData.data || []));
      }

      setIsLoading(false);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      console.error('Error loading candidate data:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to load candidate data');
        setIsLoading(false);
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, [candidateId]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    loadData();
    if (onRefresh) {
      onRefresh();
    }
  }, [loadData, onRefresh]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || candidateExists === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <ServerCrash className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Candidate</h3>
        <p className="text-muted-foreground text-center mb-4">
          {error || 'Candidate not found'}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            Retry
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Mobile-specific header with close button */}
      {onClose && (
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Candidate Details</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <FullCandidateDetail
          candidateId={candidateId}
          isModal={true}
          onClose={onClose}
          comments={comments}
          resumes={attachments}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
}

