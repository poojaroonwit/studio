import { toast } from 'react-hot-toast';

export async function updateCandidateStatusWithNotes(candidateId: string, status: string, notes?: string) {
  try {
    const payload: { status: string; transitionNotes?: string } = { status };
    if (notes) payload.transitionNotes = notes;
    const response = await fetch(`/api/candidates/${candidateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
      throw new Error(errorData.message || `Failed to update candidate: ${response.statusText || `Status: ${response.status}`}`);
    }
    toast.success('Candidate status updated.');
    return await response.json();
  } catch (error: any) {
    toast.error(error.message || 'Failed to update candidate.');
    throw error;
  }
} 