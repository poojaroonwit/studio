import { toast } from 'react-hot-toast';

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
    const response = await fetch('/api/candidates/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'status update failed');
    
    // Check for rejected candidates due to headcount constraints
    if (result.rejectedCandidates && result.rejectedCandidates.length > 0) {
      const rejectedCandidate = result.rejectedCandidates[0]; // For single candidate updates
      const headcountInfo = rejectedCandidate.headcountStatus 
        ? ` (Total: ${rejectedCandidate.headcountStatus.totalHeadcounts}, Vacant: ${rejectedCandidate.headcountStatus.vacantHeadcounts}, Filled: ${rejectedCandidate.headcountStatus.filledHeadcounts})`
        : '';
      throw new Error(`Headcount constraint: ${rejectedCandidate.message || 'Cannot update status due to headcount limitations'}${headcountInfo}`);
    }
    
    if (!suppressToast) {
      toast.success(`${result.updatedCount || candidateIds.length} candidate(s) updated. ${result.rejectedCount > 0 ? `${result.rejectedCount} failed.` : ''}`);
    }
    return result;
  } catch (error: any) {
    if (!suppressToast) {
      toast.error(error.message || 'Failed to update candidate(s).');
    }
    throw error;
  }
} 