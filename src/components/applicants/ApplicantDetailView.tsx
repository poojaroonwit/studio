"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowPathIcon as Loader2, ExclamationTriangleIcon as ServerCrash, UserMinusIcon as UserX } from '@heroicons/react/24/outline';
import FullApplicantDetail from './FullApplicantDetail';

interface ApplicantDetailViewProps {
  applicantId: string;
  onClose?: () => void;
  isModal?: boolean;
  onRefresh?: () => void;
}

const ApplicantDetailView: React.FC<ApplicantDetailViewProps> = ({ applicantId, onClose, isModal, onRefresh }) => {
  const [comments, setComments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicantExists, setApplicantExists] = useState<boolean | null>(null);

  // Tracking for debugging
  const loadDataCount = useRef(0);

  // Abort controller for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // Data loading function
  const loadData = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isLoadingRef.current) {
      return;
    }

    loadDataCount.current++;
    if (!applicantId) {
      setIsLoading(false);
      setError('Invalid applicant ID');
      return;
    }

    isLoadingRef.current = true;

    // Abort any existing request
    if (abortControllerRef.current) {
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

    // Timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && abortControllerRef.current) {
        console.warn('Loading timeout reached for applicant details:', applicantId);
        setIsLoading(false);
        setError('Loading timeout - please try again');
        abortControllerRef.current.abort();
      }
    }, 60000);

    try {
      // Load all data in parallel
      const [commentsRes, attachmentsRes, applicantRes] = await Promise.allSettled([
        fetch(`/api/applicants/${applicantId}/comments?limit=5&offset=0`, {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        }),
        fetch(`/api/applicants/${applicantId}/resumes?limit=20&offset=0`, {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        }),
        fetch(`/api/applicants/${applicantId}`, {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        })
      ]);

      // Clear timeout since we got a response
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Handle comments
      if (commentsRes.status === 'fulfilled' && commentsRes.value.ok) {
        try {
          const commentsData = await commentsRes.value.json();
          const comments = Array.isArray(commentsData) ? commentsData : (commentsData.data || []);
          setComments(comments);
        } catch (parseError) {
          console.warn('Failed to parse comments response:', parseError);
          setComments([]);
        }
      } else if (commentsRes.status === 'rejected') {
        if (commentsRes.reason?.name === 'AbortError') return;
        setComments([]);
      } else {
        setComments([]);
      }

      // Handle attachments
      if (attachmentsRes.status === 'fulfilled' && attachmentsRes.value.ok) {
        try {
          const attachmentsData = await attachmentsRes.value.json();
          const attachments = Array.isArray(attachmentsData) ? attachmentsData : (attachmentsData.data || []);
          setAttachments(attachments);
        } catch (parseError) {
          console.warn('Failed to parse attachments response:', parseError);
          setAttachments([]);
        }
      } else if (attachmentsRes.status === 'rejected') {
        if (attachmentsRes.reason?.name === 'AbortError') return;
        setAttachments([]);
      } else {
        setAttachments([]);
      }

      // Handle applicant existence check
      if (applicantRes.status === 'fulfilled') {
        if (applicantRes.value.ok) {
          setApplicantExists(true);
        } else if (applicantRes.value.status === 404) {
          setApplicantExists(false);
          setError('Applicant not found');
        } else {
          setApplicantExists(true);
        }
      } else if (applicantRes.status === 'rejected') {
        if (applicantRes.reason?.name === 'AbortError') return;
        setApplicantExists(true);
      }

    } catch (error: any) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (error.name === 'AbortError') return;

      console.error(`ApplicantDetailView error loading applicant data for applicantId: ${applicantId}:`, error);
      setError('Failed to load applicant data. Please try again.');
      setApplicantExists(false);
    } finally {
      isLoadingRef.current = false;
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [applicantId]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      isLoadingRef.current = false;
    };
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadData();
      if (onRefresh) onRefresh();
    }, 300);
  }, [loadData, onRefresh]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <p className="text-muted-foreground">Loading applicant details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4 text-center">
          <ServerCrash className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="text-lg font-medium text-foreground">Error Loading Applicant</h3>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <Loader2 className="h-4 w-4 mr-2" />
                Retry
              </Button>
              {onClose && <Button onClick={onClose} variant="outline" size="sm">Close</Button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (applicantExists === false) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4 text-center">
          <UserX className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="text-lg font-medium text-foreground">Applicant Not Found</h3>
            <p className="text-muted-foreground text-sm mb-4">The applicant you're looking for doesn't exist or you don't have permission to view it.</p>
            {onClose && <Button onClick={onClose}>Close</Button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <FullApplicantDetail
      applicantId={applicantId}
      isModal={isModal}
      onClose={onClose}
      comments={comments}
      resumes={attachments}
      onRefresh={handleRefresh}
    />
  );
};

export default ApplicantDetailView;