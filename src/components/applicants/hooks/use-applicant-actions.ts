import { useCallback } from 'react';
import type { Applicant, ApplicantStatus } from '@/lib/types';
import { toast } from "react-hot-toast";
import { getErrorMessage } from '@/lib/networkUtils';

interface UseApplicantActionsProps {
  setFilteredApplicants: (applicants: Applicant[] | ((prev: Applicant[]) => Applicant[])) => void;
  setAllApplicantsForCounts: (applicants: Applicant[] | ((prev: Applicant[]) => Applicant[])) => void;
  fetchTableData: (filters: any, page: number, pageSize: number) => void;
  filters: any;
  page: number;
  pageSize: number;
  aiMatchedApplicantIds: string[] | null;
}

export function useApplicantActions({
  setFilteredApplicants,
  setAllApplicantsForCounts,
  fetchTableData,
  filters,
  page,
  pageSize,
  aiMatchedApplicantIds
}: UseApplicantActionsProps) {
  
  const updateApplicantStatus = useCallback(async (candidateId: string, newStatus: ApplicantStatus, notes?: string, suppressToast?: boolean) => {
    if (aiMatchedApplicantIds !== null) {
      toast('AI Search Active: Please clear AI search to perform updates.');
      return;
    }

    // Find the original applicant for potential rollback
    let originalApplicant: Applicant | null = null;
    try {
      const res = await fetch(`/api/applicants/${candidateId}`);
      if (res.ok) {
        originalApplicant = await res.json() as Applicant;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching applicant:', error);
      }
    }
    if (!originalApplicant) {
      toast.error('Applicant not found');
      return;
    }

    // Apply optimistic update immediately
    setFilteredApplicants((prev: Applicant[]) => prev.map(app => 
      app.id === candidateId 
        ? { ...app, status: newStatus, updatedAt: new Date().toISOString() }
        : app
    ));
    setAllApplicantsForCounts((prev: Applicant[]) => prev.map(app => 
      app.id === candidateId 
        ? { ...app, status: newStatus, updatedAt: new Date().toISOString() }
        : app
    ));
    
    if (!suppressToast) {
      toast.loading('Updating applicant status...', { id: candidateId });
    }

    try {
      // Use the utility function instead of direct API call
      const response = await fetch(`/api/applicants/bulk-action`, {
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
        if (response.status === 403) {
          throw new Error('Permission denied: You do not have permission to update applicant status. Please contact your administrator.');
        }
        throw new Error(errorData.message || `Failed to update applicant status: HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // Check for rejected applicants due to headcount constraints
      if (result.rejectedApplicants && result.rejectedApplicants.length > 0) {
        const rejectedApplicant = result.rejectedApplicants.find((c: any) => c.candidateId === candidateId);
        if (rejectedApplicant) {
          throw new Error(`Headcount constraint: ${rejectedApplicant.message}`);
        }
      }
      
      if (!suppressToast) {
        toast.success(`Status updated to ${newStatus}`, { id: candidateId });
      }
      
      // Refresh the applicant list to ensure consistency
      fetchTableData(filters, page, pageSize);
      
    } catch (error) {
      // Revert optimistic update on error
      setFilteredApplicants((prev: Applicant[]) => prev.map(app => 
        app.id === candidateId ? (originalApplicant as Applicant) : app
      ));
      setAllApplicantsForCounts((prev: Applicant[]) => prev.map(app => 
        app.id === candidateId ? (originalApplicant as Applicant) : app
      ));
      
      if (!suppressToast) {
        toast.error(getErrorMessage(error), { id: candidateId });
      }
    }
  }, [setFilteredApplicants, setAllApplicantsForCounts, fetchTableData, filters, page, pageSize, aiMatchedApplicantIds]);

  const handleDeleteApplicant = useCallback(async (candidateId: string) => {
    if (aiMatchedApplicantIds !== null) {
      toast('AI Search Active: Please clear AI search to perform updates.');
      return;
    }

    // Find the original applicant for potential rollback
    let originalApplicant: Applicant | null = null;
    try {
      const res = await fetch(`/api/applicants/${candidateId}`);
      if (res.ok) {
        originalApplicant = await res.json() as Applicant;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching applicant:', error);
      }
    }
    if (!originalApplicant) {
      toast.error('Applicant not found');
      return;
    }

    // Apply optimistic update immediately
    setFilteredApplicants((prev: Applicant[]) => prev.filter(c => c.id !== candidateId));
    setAllApplicantsForCounts((prev: Applicant[]) => prev.filter(c => c.id !== candidateId));

    toast.loading('Deleting applicant...', { id: candidateId });

    try {
      const response = await fetch(`/api/applicants/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          candidateIds: [candidateId]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete applicant: ${response.status}`);
      }

      toast.success('Applicant deleted successfully', { id: candidateId });
      
      // Refresh the applicant list to ensure consistency
      fetchTableData(filters, page, pageSize);
      
    } catch (error) {
      // Revert optimistic update on error
      setFilteredApplicants(prev => [...prev, originalApplicant as Applicant]);
      setAllApplicantsForCounts(prev => [...prev, originalApplicant as Applicant]);
      
      toast.error(getErrorMessage(error), { id: candidateId });
    }
  }, [setFilteredApplicants, setAllApplicantsForCounts, fetchTableData, filters, page, pageSize, aiMatchedApplicantIds]);

  const handleAssignRecruiter = useCallback(async (candidateId: string, recruiterId: string | null) => {
    if (aiMatchedApplicantIds !== null) {
      toast('AI Search Active: Please clear AI search to perform updates.');
      return;
    }

    // Find the original applicant for potential rollback
    let originalApplicant: Applicant | null = null;
    try {
      const res = await fetch(`/api/applicants/${candidateId}`);
      if (res.ok) {
        originalApplicant = await res.json() as Applicant;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching applicant:', error);
      }
    }
    if (!originalApplicant) {
      toast.error('Applicant not found');
      return;
    }

    const prevRecruiter = originalApplicant?.recruiter || null;
    // Optimistically update recruiter in UI
    setFilteredApplicants(prev =>
      prev.map(c =>
        c.id === candidateId
          ? { ...c, recruiterId, recruiter: recruiterId ? { id: recruiterId, name: 'Loading...', email: '', avatarUrl: null } : null, updatedAt: new Date().toISOString() }
          : c
      )
    );
    setAllApplicantsForCounts(prev =>
      prev.map(c =>
        c.id === candidateId
          ? { ...c, recruiterId, recruiter: recruiterId ? { id: recruiterId, name: 'Loading...', email: '', avatarUrl: null } : null, updatedAt: new Date().toISOString() }
          : c
      )
    );

    toast.loading('Assigning recruiter...', { id: candidateId });

    try {
      const response = await fetch(`/api/applicants/bulk-action`, {
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
      
      // Refresh the applicant list to ensure consistency
      fetchTableData(filters, page, pageSize);
      
    } catch (error) {
      // Revert recruiter in UI
      setFilteredApplicants(prev =>
        prev.map(c =>
          c.id === candidateId
            ? { ...c, recruiterId: prevRecruiter?.id || null, recruiter: prevRecruiter, updatedAt: new Date().toISOString() }
            : c
        )
      );
      setAllApplicantsForCounts(prev =>
        prev.map(c =>
          c.id === candidateId
            ? { ...c, recruiterId: prevRecruiter?.id || null, recruiter: prevRecruiter, updatedAt: new Date().toISOString() }
            : c
        )
      );
      
      toast.error(getErrorMessage(error), { id: candidateId });
    }
  }, [setFilteredApplicants, setAllApplicantsForCounts, fetchTableData, filters, page, pageSize, aiMatchedApplicantIds]);

  const handleAssignSource = useCallback(async (candidateId: string, sourceId: string | null) => {
    if (aiMatchedApplicantIds !== null) {
      toast('AI Search Active: Please clear AI search to perform updates.');
      return;
    }

    // Find the original applicant for potential rollback
    let originalApplicant: Applicant | null = null;
    try {
      const res = await fetch(`/api/applicants/${candidateId}`);
      if (res.ok) {
        originalApplicant = await res.json() as Applicant;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching applicant:', error);
      }
    }
    if (!originalApplicant) {
      toast.error('Applicant not found');
      return;
    }

    const prevSource = originalApplicant?.source || null;
    
    // Optimistically update source in UI
    setFilteredApplicants(prev =>
      prev.map(c =>
        c.id === candidateId
          ? { ...c, sourceId, source: sourceId ? { id: sourceId, name: 'Loading...', description: '', allowSubSource: false, sortOrder: 0, isActive: true } : null, updatedAt: new Date().toISOString() }
          : c
      )
    );
    setAllApplicantsForCounts(prev =>
      prev.map(c =>
        c.id === candidateId
          ? { ...c, sourceId, source: sourceId ? { id: sourceId, name: 'Loading...', description: '', allowSubSource: false, sortOrder: 0, isActive: true } : null, updatedAt: new Date().toISOString() }
          : c
      )
    );

    toast.loading('Assigning source...', { id: candidateId });

    try {
      // Use individual applicant update API instead of bulk action
      const response = await fetch(`/api/applicants/${candidateId}`, {
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
      
      // Refresh the applicant list to ensure consistency
      fetchTableData(filters, page, pageSize);
      
    } catch (error) {
      // Revert source in UI
      setFilteredApplicants(prev =>
        prev.map(c =>
          c.id === candidateId
            ? { ...c, sourceId: prevSource?.id || null, source: prevSource, updatedAt: new Date().toISOString() }
            : c
        )
      );
      setAllApplicantsForCounts(prev =>
        prev.map(c =>
          c.id === candidateId
            ? { ...c, sourceId: prevSource?.id || null, source: prevSource, updatedAt: new Date().toISOString() }
            : c
        )
      );
      
      toast.error(getErrorMessage(error), { id: candidateId });
    }
  }, [setFilteredApplicants, setAllApplicantsForCounts, fetchTableData, filters, page, pageSize, aiMatchedApplicantIds]);

  return {
    updateApplicantStatus,
    handleDeleteApplicant,
    handleAssignRecruiter,
    handleAssignSource
  };
}
