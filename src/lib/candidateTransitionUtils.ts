import { toast } from 'react-hot-toast';

export async function updateCandidateStatusWithNotes(candidateId: string, status: string, notes?: string) {
  // Use the bulk endpoint for consistency
  return updateCandidatesStatusBulk([candidateId], status, notes);
}

export async function updateCandidatesStatusBulk(candidateIds: string[], status: string, notes?: string) {
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
    if (!response.ok) throw new Error(result.message || 'Bulk status update failed');
    toast.success(`${result.successCount || candidateIds.length} candidate(s) updated. ${result.failCount > 0 ? `${result.failCount} failed.` : ''}`);
    return result;
  } catch (error: any) {
    toast.error(error.message || 'Failed to update candidate(s).');
    throw error;
  }
} 