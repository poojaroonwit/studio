import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import FullCandidateDetail from './FullCandidateDetail';
import { useRealtimeCollaboration } from '@/hooks/use-realtime-collaboration';

interface CandidateDetailViewProps {
  candidateId: string;
  onClose?: () => void;
  isModal?: boolean;
}

const CandidateDetailView: React.FC<CandidateDetailViewProps> = ({ candidateId, onClose, isModal }) => {
  const [comments, setComments] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);

  // Real-time collaboration hook for candidate detail updates
  const { isConnected: realtimeConnected } = useRealtimeCollaboration({
    onCandidateUpdate: (updatedCandidate) => {
      // If this is the candidate we're viewing, refresh the data
      if (updatedCandidate.id === candidateId) {
        loadAllAttachments();
      }
    },
    onCommentUpdate: (commentUpdate) => {
      // Refresh comments when there are new comments
      if (commentUpdate.candidateId === candidateId) {
        loadAllAttachments();
      }
    },
    onAttachmentUpdate: (attachmentUpdate) => {
      // Refresh attachments when there are new attachments
      if (attachmentUpdate.candidateId === candidateId) {
        loadAllAttachments();
      }
    },
    showNotifications: false, // Disable notifications to prevent conflicts
    showErrorNotifications: false
  });

  const fetchComments = useCallback(async (limit = 10, offset = 0) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/comments?limit=${limit}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.data) ? data.data : [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }, [candidateId]);

  const fetchResumes = useCallback(async (limit = 20, offset = 0) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/resumes?limit=${limit}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.data) ? data.data : [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching resumes:', error);
      return [];
    }
  }, [candidateId]);

  // Merge attachments from resumes and comments (same logic as candidate ID page)
  const loadAllAttachments = useCallback(async () => {
    const [resumeAttachments, commentList] = await Promise.all([
      fetchResumes(),
      fetchComments(),
    ]);
    
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
  }, [fetchResumes, fetchComments]);

  const handleRefresh = useCallback(() => {
    loadAllAttachments();
  }, [loadAllAttachments]);

  useEffect(() => {
    loadAllAttachments();
  }, [loadAllAttachments]);

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