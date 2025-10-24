import { toast } from 'react-hot-toast';
import { getErrorMessage } from './networkUtils';

interface ToastFunctions {
  success?: (message: string) => void;
  error?: (message: string) => void;
}

export async function updateCandidateStatusWithNotes(candidateId: string, status: string, notes?: string, suppressToast?: boolean, toastFunctions?: ToastFunctions) {
  // Use the bulk endpoint for consistency
  return updateCandidatesStatusBulk([candidateId], status, notes, suppressToast, toastFunctions);
}

export async function updateCandidatesStatusBulk(candidateIds: string[], status: string, notes?: string, suppressToast?: boolean, toastFunctions?: ToastFunctions) {
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
      if (response.status === 403) {
        throw new Error('Permission denied: You do not have permission to update candidate status. Please contact your administrator.');
      }
      throw new Error(result.message || `Candidate status update failed: HTTP ${response.status}`);
    }
    
    // Check for rejected candidates (this should not happen with our new upfront validation)
    if (result.rejectedCandidates && result.rejectedCandidates.length > 0) {
      const rejectedCandidate = result.rejectedCandidates[0];
      console.warn('Candidate rejected during status update:', rejectedCandidate);
      throw new Error(rejectedCandidate.message || 'Candidate status update was rejected');
    }
    
    if (!suppressToast) {
      const message = `${result.updatedCount || candidateIds.length} candidate(s) updated. ${result.rejectedCount > 0 ? `${result.rejectedCount} failed.` : ''}`;
      if (toastFunctions?.success) {
        toastFunctions.success(message);
      } else {
        toast.success(message);
      }
    }
    return result;
  } catch (error: any) {
    console.error('Error in updateCandidatesStatusBulk:', error);
    if (!suppressToast) {
      const message = getErrorMessage(error);
      if (toastFunctions?.error) {
        toastFunctions.error(message);
      } else {
        toast.error(message);
      }
    }
    throw error;
  }
} 
