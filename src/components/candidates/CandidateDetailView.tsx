import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import FullCandidateDetail from './FullCandidateDetail';

interface CandidateDetailViewProps {
  candidateId: string;
  onClose?: () => void;
  isModal?: boolean;
}

const CandidateDetailView: React.FC<CandidateDetailViewProps> = ({ candidateId, onClose, isModal }) => {
  const [comments, setComments] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data.data) ? data.data : []);
      } else {
        setComments([]);
      }
    } catch {
      setComments([]);
    }
  }, [candidateId]);

  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/resumes`);
      if (res.ok) {
        const data = await res.json();
        setResumes(Array.isArray(data.data) ? data.data : []);
      } else {
        setResumes([]);
      }
    } catch {
      setResumes([]);
    }
  }, [candidateId]);

  const handleRefresh = useCallback(() => {
    fetchComments();
    fetchResumes();
  }, [fetchComments, fetchResumes]);

  useEffect(() => {
    fetchComments();
    fetchResumes();
  }, [fetchComments, fetchResumes]);

  return (
    <FullCandidateDetail
      candidateId={candidateId}
      isModal={isModal}
      onClose={onClose}
      comments={comments}
      resumes={resumes}
      onRefresh={handleRefresh}
    />
  );
};

export default CandidateDetailView; 