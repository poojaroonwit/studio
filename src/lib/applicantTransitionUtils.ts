import { toast } from 'react-hot-toast';
import { getErrorMessage } from './networkUtils';

interface ToastFunctions {
  success?: (message: string) => void;
  error?: (message: string) => void;
}

export async function updateApplicantStatusWithNotes(applicantId: string, status: string, notes?: string, suppressToast?: boolean, toastFunctions?: ToastFunctions) {
  // Use the bulk endpoint for consistency
  return updateApplicantsStatusBulk([applicantId], status, notes, suppressToast, toastFunctions);
}

export async function updateApplicantsStatusBulk(applicantIds: string[], status: string, notes?: string, suppressToast?: boolean, toastFunctions?: ToastFunctions) {
  try {
    const payload: any = {
      action: 'change_status',
      applicantIds,
      newStatus: status,
    };
    if (notes) payload.transitionNotes = notes;
    
    console.log('Sending bulk status update request:', payload);
    
    const response = await fetch('/api/applicants/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    console.log('Bulk action response:', result);
    
    if (!response.ok) {
      console.error('Bulk action failed:', result);
      if (response.status === 403) {
        throw new Error('Permission denied: You do not have permission to update Applicant status. Please contact your administrator.');
      }
      throw new Error(result.message || `Applicant status update failed: HTTP ${response.status}`);
    }
    
    // Check for rejected Applicants (this should not happen with our new upfront validation)
    if (result.rejectedApplicants && result.rejectedApplicants.length > 0) {
      const rejectedApplicant = result.rejectedApplicants[0];
      console.warn('Applicant rejected during status update:', rejectedApplicant);
      throw new Error(rejectedApplicant.message || 'Applicant status update was rejected');
    }
    
    if (!suppressToast) {
      const message = `${result.updatedCount || applicantIds.length} Applicant(s) updated. ${result.rejectedCount > 0 ? `${result.rejectedCount} failed.` : ''}`;
      if (toastFunctions?.success) {
        toastFunctions.success(message);
      } else {
        toast.success(message);
      }
    }
    return result;
  } catch (error: any) {
    console.error('Error in updateApplicantsStatusBulk:', error);
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
