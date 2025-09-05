import { toast } from 'react-hot-toast';
import { getErrorMessage } from './networkUtils';

export async function updateCandidateStatusWithNotes(candidateId: string, status: string, notes?: string, suppressToast?: boolean) {
  // Use the bulk endpoint for consistency
  return updateCandidatesStatusBulk([candidateId], status, notes, suppressToast);
}

export async function updateCandidatesStatusBulk(candidateIds: string[], status: string, notes?: string, suppressToast?: boolean) {
  try {
    const payload: any = {
      action: 'change_status',
      candidateIds,
      newStatus: status,
    };
    if (notes) payload.transitionNotes = notes;
    
    console.log('Sending bulk status update request:', payload);
    
    const response = await fetch('/api/candidates/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    console.log('Bulk action response:', result);
    
    if (!response.ok) {
      console.error('Bulk action failed:', result);
      const statusText = response.status === 403 ? 'Access denied' : `HTTP ${response.status}`;
      throw new Error(result.message || `Candidate status update failed: ${statusText}`);
    }
    
    // Check for rejected candidates (this should not happen with our new upfront validation)
    if (result.rejectedCandidates && result.rejectedCandidates.length > 0) {
      const rejectedCandidate = result.rejectedCandidates[0];
      console.warn('Candidate rejected during status update:', rejectedCandidate);
      throw new Error(rejectedCandidate.message || 'Candidate status update was rejected');
    }
    
    if (!suppressToast) {
      toast.success(`${result.updatedCount || candidateIds.length} candidate(s) updated. ${result.rejectedCount > 0 ? `${result.rejectedCount} failed.` : ''}`);
    }
    return result;
  } catch (error: any) {
    console.error('Error in updateCandidatesStatusBulk:', error);
    if (!suppressToast) {
      toast.error(getErrorMessage(error));
    }
    throw error;
  }
} 