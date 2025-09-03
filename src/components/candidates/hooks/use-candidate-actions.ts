import { useCallback } from 'react';
import { Candidate, CandidateStatus } from '@/lib/types';
import { toast } from "react-hot-toast";

interface UseCandidateActionsProps {
  setFilteredCandidates: (candidates: Candidate[] | ((prev: Candidate[]) => Candidate[])) => void;
  setAllCandidatesForCounts: (candidates: Candidate[] | ((prev: Candidate[]) => Candidate[])) => void;
  fetchTableData: (filters: any, page: number, pageSize: number) => void;
  filters: any;
  page: number;
  pageSize: number;
  aiMatchedCandidateIds: string[] | null;
}

export function useCandidateActions({
  setFilteredCandidates,
  setAllCandidatesForCounts,
  fetchTableData,
  filters,
  page,
  pageSize,
  aiMatchedCandidateIds
}: UseCandidateActionsProps) {
  
  const updateCandidateStatus = useCallback(async (candidateId: string, newStatus: CandidateStatus, notes?: string, suppressToast?: boolean) => {
    if (aiMatchedCandidateIds !== null) {
      toast('AI Search Active: Please clear AI search to perform updates.');
      return;
    }

    // Find the original candidate for potential rollback
    const originalCandidate = (await fetch(`/api/candidates/${candidateId}`).then(res => res.ok ? res.json() : null)) as Candidate | null;
    if (!originalCandidate) {
      toast.error('Candidate not found');
      return;
    }

    // Apply optimistic update immediately
    setFilteredCandidates((prev: Candidate[]) => prev.map(candidate => 
      candidate.id === candidateId 
        ? { ...candidate, status: newStatus, updatedAt: new Date().toISOString() }
        : candidate
    ));
    setAllCandidatesForCounts((prev: Candidate[]) => prev.map(candidate => 
      candidate.id === candidateId 
        ? { ...candidate, status: newStatus, updatedAt: new Date().toISOString() }
        : candidate
    ));
    
    if (!suppressToast) {
      toast.loading('Updating candidate status...', { id: candidateId });
    }

    try {
      // Use the utility function instead of direct API call
      const response = await fetch(`/api/candidates/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_status',
          candidateIds: [candidateId],
          newStatus: newStatus,
          transitionNotes: notes
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update status: ${response.status}`);
      }

      const result = await response.json();
      
      // Check for rejected candidates due to headcount constraints
      if (result.rejectedCandidates && result.rejectedCandidates.length > 0) {
        const rejectedCandidate = result.rejectedCandidates.find((c: any) => c.candidateId === candidateId);
        if (rejectedCandidate) {
          throw new Error(`Headcount constraint: ${rejectedCandidate.message}`);
        }
      }
      
      if (!suppressToast) {
        toast.success(`Status updated to ${newStatus}`, { id: candidateId });
      }
      
      // Refresh the candidate list to ensure consistency
      fetchTableData(filters, page, pageSize);
      
    } catch (error) {
      // Revert optimistic update on error
      setFilteredCandidates((prev: Candidate[]) => prev.map(candidate => 
        candidate.id === candidateId ? originalCandidate : candidate
      ));
      setAllCandidatesForCounts((prev: Candidate[]) => prev.map(candidate => 
        candidate.id === candidateId ? originalCandidate : candidate
      ));
      
      if (!suppressToast) {
        toast.error((error as Error).message || 'Failed to update status', { id: candidateId });
      }
    }
  }, [setFilteredCandidates, setAllCandidatesForCounts, fetchTableData, filters, page, pageSize, aiMatchedCandidateIds]);

  const handleDeleteCandidate = useCallback(async (candidateId: string) => {
    if (aiMatchedCandidateIds !== null) {
      toast('AI Search Active: Please clear AI search to perform updates.');
      return;
    }

    // Find the original candidate for potential rollback
    const originalCandidate = (await fetch(`/api/candidates/${candidateId}`).then(res => res.ok ? res.json() : null)) as Candidate | null;
    if (!originalCandidate) {
      toast.error('Candidate not found');
      return;
    }

    // Apply optimistic update immediately
    setFilteredCandidates((prev: Candidate[]) => prev.filter(c => c.id !== candidateId));
    setAllCandidatesForCounts((prev: Candidate[]) => prev.filter(c => c.id !== candidateId));

    toast.loading('Deleting candidate...', { id: candidateId });

    try {
      const response = await fetch(`/api/candidates/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          candidateIds: [candidateId]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete candidate: ${response.status}`);
      }

      toast.success('Candidate deleted successfully', { id: candidateId });
      
      // Refresh the candidate list to ensure consistency
      fetchTableData(filters, page, pageSize);
      
    } catch (error) {
      // Revert optimistic update on error
      setFilteredCandidates(prev => [...prev, originalCandidate]);
      setAllCandidatesForCounts(prev => [...prev, originalCandidate]);
      
      toast.error((error as Error).message || 'Failed to delete candidate', { id: candidateId });
    }
  }, [setFilteredCandidates, setAllCandidatesForCounts, fetchTableData, filters, page, pageSize, aiMatchedCandidateIds]);

  const handleAssignRecruiter = useCallback(async (candidateId: string, recruiterId: string | null) => {
    if (aiMatchedCandidateIds !== null) {
      toast('AI Search Active: Please clear AI search to perform updates.');
      return;
    }

    // Find the original candidate for potential rollback
    const originalCandidate = (await fetch(`/api/candidates/${candidateId}`).then(res => res.ok ? res.json() : null)) as Candidate | null;
    if (!originalCandidate) {
      toast.error('Candidate not found');
      return;
    }

    const prevRecruiter = originalCandidate?.recruiter || null;
    // Optimistically update recruiter in UI
    setFilteredCandidates(prev =>
      prev.map(c =>
        c.id === candidateId
          ? { ...c, recruiterId, recruiter: recruiterId ? { id: recruiterId, name: 'Loading...', email: '', avatarUrl: null } : null, updatedAt: new Date().toISOString() }
          : c
      )
    );
    setAllCandidatesForCounts(prev =>
      prev.map(c =>
        c.id === candidateId
          ? { ...c, recruiterId, recruiter: recruiterId ? { id: recruiterId, name: 'Loading...', email: '', avatarUrl: null } : null, updatedAt: new Date().toISOString() }
          : c
      )
    );

    toast.loading('Assigning recruiter...', { id: candidateId });

    try {
      const response = await fetch(`/api/candidates/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_recruiter',
          candidateIds: [candidateId],
          newRecruiterId: recruiterId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to assign recruiter: ${response.status}`);
      }

      toast.success(recruiterId ? 'Recruiter assigned successfully' : 'Recruiter unassigned successfully', { id: candidateId });
      
      // Refresh the candidate list to ensure consistency
      fetchTableData(filters, page, pageSize);
      
    } catch (error) {
      // Revert recruiter in UI
      setFilteredCandidates(prev =>
        prev.map(c =>
          c.id === candidateId
            ? { ...c, recruiterId: prevRecruiter?.id || null, recruiter: prevRecruiter, updatedAt: new Date().toISOString() }
            : c
        )
      );
      setAllCandidatesForCounts(prev =>
        prev.map(c =>
          c.id === candidateId
            ? { ...c, recruiterId: prevRecruiter?.id || null, recruiter: prevRecruiter, updatedAt: new Date().toISOString() }
            : c
        )
      );
      
      toast.error((error as Error).message || 'Failed to assign recruiter', { id: candidateId });
    }
  }, [setFilteredCandidates, setAllCandidatesForCounts, fetchTableData, filters, page, pageSize, aiMatchedCandidateIds]);

  const handleAssignSource = useCallback(async (candidateId: string, sourceId: string | null) => {
    if (aiMatchedCandidateIds !== null) {
      toast('AI Search Active: Please clear AI search to perform updates.');
      return;
    }

    // Find the original candidate for potential rollback
    const originalCandidate = (await fetch(`/api/candidates/${candidateId}`).then(res => res.ok ? res.json() : null)) as Candidate | null;
    if (!originalCandidate) {
      toast.error('Candidate not found');
      return;
    }

    const prevSource = originalCandidate?.source || null;
    
    // Optimistically update source in UI
    setFilteredCandidates(prev =>
      prev.map(c =>
        c.id === candidateId
          ? { ...c, sourceId, source: sourceId ? { id: sourceId, name: 'Loading...', description: '', allowSubSource: false, sortOrder: 0, isActive: true } : null, updatedAt: new Date().toISOString() }
          : c
      )
    );
    setAllCandidatesForCounts(prev =>
      prev.map(c =>
        c.id === candidateId
          ? { ...c, sourceId, source: sourceId ? { id: sourceId, name: 'Loading...', description: '', allowSubSource: false, sortOrder: 0, isActive: true } : null, updatedAt: new Date().toISOString() }
          : c
      )
    );

    toast.loading('Assigning source...', { id: candidateId });

    try {
      // Use individual candidate update API instead of bulk action
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: sourceId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to assign source: ${response.status}`);
      }

      toast.success(sourceId ? 'Source assigned successfully' : 'Source unassigned successfully', { id: candidateId });
      
      // Refresh the candidate list to ensure consistency
      fetchTableData(filters, page, pageSize);
      
    } catch (error) {
      // Revert source in UI
      setFilteredCandidates(prev =>
        prev.map(c =>
          c.id === candidateId
            ? { ...c, sourceId: prevSource?.id || null, source: prevSource, updatedAt: new Date().toISOString() }
            : c
        )
      );
      setAllCandidatesForCounts(prev =>
        prev.map(c =>
          c.id === candidateId
            ? { ...c, sourceId: prevSource?.id || null, source: prevSource, updatedAt: new Date().toISOString() }
            : c
        )
      );
      
      toast.error((error as Error).message || 'Failed to assign source', { id: candidateId });
    }
  }, [setFilteredCandidates, setAllCandidatesForCounts, fetchTableData, filters, page, pageSize, aiMatchedCandidateIds]);

  return {
    updateCandidateStatus,
    handleDeleteCandidate,
    handleAssignRecruiter,
    handleAssignSource
  };
}
