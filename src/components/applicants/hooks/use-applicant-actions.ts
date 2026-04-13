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
  
  const updateApplicantStatus = useCallback(async (applicantId: string, newStatus: ApplicantStatus, notes?: string, suppressToast?: boolean) => {
    if (aiMatchedApplicantIds !== null) {
      toast('AI Search Active: Please clear AI search to perform updates.');
      return;
    }

    // Find the original applicant for potential rollback
    let originalApplicant: Applicant | null = null;
    try {
      const res = await fetch(`/api/applicants/${applicantId}`);
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
      app.id === applicantId 
        ? { ...app, status: newStatus, updatedAt: new Date().toISOString() }
        : app
    ));
    setAllApplicantsForCounts((prev: Applicant[]) => prev.map(app => 
      app.id === applicantId 
        ? { ...app, status: newStatus, updatedAt: new Date().toISOString() }
        : app
    ));
    
    if (!suppressToast) {
      toast.loading('Updating applicant status...', { id: applicantId });
    }

    try {
      // Use the utility function instead of direct API call
      const response = await fetch(`/api/applicants/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_status',
          applicantIds: [applicantId],
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
        const rejectedApplicant = result.rejectedApplicants.find((c: any) => c.applicantId === applicantId);
        if (rejectedApplicant) {
          throw new Error(`Headcount constraint: ${rejectedApplicant.message}`);
        }
      }
      
      if (!suppressToast) {
        toast.success(`Status updated to ${newStatus}`, { id: applicantId });
      }
      
      // Refresh the applicant list to ensure consistency
      fetchTableData(filters, page, pageSize);
      
      return true;
    } catch (error) {
      // Revert optimistic update on error
      setFilteredApplicants((prev: Applicant[]) => prev.map(app => 
        app.id === applicantId ? (originalApplicant as Applicant) : app
      ));
      setAllApplicantsForCounts((prev: Applicant[]) => prev.map(app => 
        app.id === applicantId ? (originalApplicant as Applicant) : app
      ));
      
      if (!suppressToast) {
        toast.error(getErrorMessage(error), { id: applicantId });
      }
    }
  }, [setFilteredApplicants, setAllApplicantsForCounts, fetchTableData, filters, page, pageSize, aiMatchedApplicantIds]);

  const handleDeleteApplicant = useCallback(async (applicantId: string) => {
    if (aiMatchedApplicantIds !== null) {
      toast('AI Search Active: Please clear AI search to perform updates.');
      return;
    }

    // Find the original applicant for potential rollback
    let originalApplicant: Applicant | null = null;
    try {
      const res = await fetch(`/api/applicants/${applicantId}`);
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
    setFilteredApplicants((prev: Applicant[]) => prev.filter(c => c.id !== applicantId));
    setAllApplicantsForCounts((prev: Applicant[]) => prev.filter(c => c.id !== applicantId));

    toast.loading('Deleting applicant...', { id: applicantId });

    try {
      const response = await fetch(`/api/applicants/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          applicantIds: [applicantId]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete applicant: ${response.status}`);
      }

      toast.success('Applicant deleted successfully', { id: applicantId });
      
      // Refresh the applicant list to ensure consistency
      fetchTableData(filters, page, pageSize);
      
    } catch (error) {
      // Revert optimistic update on error
      setFilteredApplicants(prev => [...prev, originalApplicant as Applicant]);
      setAllApplicantsForCounts(prev => [...prev, originalApplicant as Applicant]);
      
      toast.error(getErrorMessage(error), { id: applicantId });
    }
  }, [setFilteredApplicants, setAllApplicantsForCounts, fetchTableData, filters, page, pageSize, aiMatchedApplicantIds]);

  const handleAssignRecruiter = useCallback(async (applicantId: string, recruiterId: string | null) => {
    if (aiMatchedApplicantIds !== null) {
      toast('AI Search Active: Please clear AI search to perform updates.');
      return;
    }

    // Find the original applicant for potential rollback
    let originalApplicant: Applicant | null = null;
    try {
      const res = await fetch(`/api/applicants/${applicantId}`);
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
        c.id === applicantId
          ? { ...c, recruiterId, recruiter: recruiterId ? { id: recruiterId, name: 'Loading...', email: '', avatarUrl: null } : null, updatedAt: new Date().toISOString() }
          : c
      )
    );
    setAllApplicantsForCounts(prev =>
      prev.map(c =>
        c.id === applicantId
          ? { ...c, recruiterId, recruiter: recruiterId ? { id: recruiterId, name: 'Loading...', email: '', avatarUrl: null } : null, updatedAt: new Date().toISOString() }
          : c
      )
    );

    toast.loading('Assigning recruiter...', { id: applicantId });

    try {
      const response = await fetch(`/api/applicants/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_recruiter',
          applicantIds: [applicantId],
          newRecruiterId: recruiterId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to assign recruiter: ${response.status}`);
      }

      toast.success(recruiterId ? 'Recruiter assigned successfully' : 'Recruiter unassigned successfully', { id: applicantId });
      
      // Refresh the applicant list to ensure consistency
      fetchTableData(filters, page, pageSize);
      
    } catch (error) {
      // Revert recruiter in UI
      setFilteredApplicants(prev =>
        prev.map(c =>
          c.id === applicantId
            ? { ...c, recruiterId: prevRecruiter?.id || null, recruiter: prevRecruiter, updatedAt: new Date().toISOString() }
            : c
        )
      );
      setAllApplicantsForCounts(prev =>
        prev.map(c =>
          c.id === applicantId
            ? { ...c, recruiterId: prevRecruiter?.id || null, recruiter: prevRecruiter, updatedAt: new Date().toISOString() }
            : c
        )
      );
      
      toast.error(getErrorMessage(error), { id: applicantId });
    }
  }, [setFilteredApplicants, setAllApplicantsForCounts, fetchTableData, filters, page, pageSize, aiMatchedApplicantIds]);

  const handleAssignSource = useCallback(async (applicantId: string, sourceId: string | null) => {
    if (aiMatchedApplicantIds !== null) {
      toast('AI Search Active: Please clear AI search to perform updates.');
      return;
    }

    // Find the original applicant for potential rollback
    let originalApplicant: Applicant | null = null;
    try {
      const res = await fetch(`/api/applicants/${applicantId}`);
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
        c.id === applicantId
          ? { ...c, sourceId, source: sourceId ? { id: sourceId, name: 'Loading...', description: '', allowSubSource: false, sortOrder: 0, isActive: true } : null, updatedAt: new Date().toISOString() }
          : c
      )
    );
    setAllApplicantsForCounts(prev =>
      prev.map(c =>
        c.id === applicantId
          ? { ...c, sourceId, source: sourceId ? { id: sourceId, name: 'Loading...', description: '', allowSubSource: false, sortOrder: 0, isActive: true } : null, updatedAt: new Date().toISOString() }
          : c
      )
    );

    toast.loading('Assigning source...', { id: applicantId });

    try {
      // Use individual applicant update API instead of bulk action
      const response = await fetch(`/api/applicants/${applicantId}`, {
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

      toast.success(sourceId ? 'Source assigned successfully' : 'Source unassigned successfully', { id: applicantId });
      
      // Refresh the applicant list to ensure consistency
      fetchTableData(filters, page, pageSize);
      
    } catch (error) {
      // Revert source in UI
      setFilteredApplicants(prev =>
        prev.map(c =>
          c.id === applicantId
            ? { ...c, sourceId: prevSource?.id || null, source: prevSource, updatedAt: new Date().toISOString() }
            : c
        )
      );
      setAllApplicantsForCounts(prev =>
        prev.map(c =>
          c.id === applicantId
            ? { ...c, sourceId: prevSource?.id || null, source: prevSource, updatedAt: new Date().toISOString() }
            : c
        )
      );
      
      toast.error(getErrorMessage(error), { id: applicantId });
    }
  }, [setFilteredApplicants, setAllApplicantsForCounts, fetchTableData, filters, page, pageSize, aiMatchedApplicantIds]);

  return {
    updateApplicantStatus,
    handleDeleteApplicant,
    handleAssignRecruiter,
    handleAssignSource
  };
}
