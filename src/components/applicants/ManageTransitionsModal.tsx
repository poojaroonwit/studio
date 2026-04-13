"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Applicant, TransitionRecord, ApplicantStatus, RecruitmentStage } from '@/lib/types';
import { PlusCircleIcon as PlusCircle, CalendarDaysIcon as CalendarDays, PencilIcon as Edit3, TrashIcon as Trash2, BookmarkSquareIcon as Save, XMarkIcon as X, UserIcon as User, ChevronUpDownIcon as ChevronsUpDown, CheckIcon as Check } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import { cn } from "@/lib/utils";
import { useToastManager } from "@/hooks/use-toast-manager";
import { useToast } from "@/hooks/use-toast";

import ApplicantCommentsSection from './ApplicantCommentsSection';
import { StageSelect } from './StageSelect';
import { getRecruitmentStageNameClient } from '@/lib/recruitmentStageUtils';
import { TiptapEditor } from '../ui/tiptap-editor';

const transitionFormSchema = z.object({
  newStatus: z.string().min(1, "New status is required"),
  notes: z.string().optional(),
});

type TransitionFormValues = z.infer<typeof transitionFormSchema>;

interface ManageTransitionsModalProps {
  applicant: Applicant | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateApplicant: (applicantId: string, status: ApplicantStatus, notes?: string, suppressToast?: boolean) => Promise<boolean | undefined>;
  onRefreshApplicantData: (applicantId: string) => Promise<void>;
  availableStages: RecruitmentStage[];
  preselectedStage?: string | null;
  comments: any[];
  onCommentsChange: () => void;

}

export function ManageTransitionsModal({
  applicant,
  isOpen,
  onOpenChange,
  onUpdateApplicant,
  onRefreshApplicantData,
  availableStages: initialAvailableStages,
  preselectedStage,
  comments,
  onCommentsChange,

}: ManageTransitionsModalProps) {
  const [editingTransitionId, setEditingTransitionId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [transitionToDelete, setTransitionToDelete] = useState<TransitionRecord | null>(null);
  const [statusSearchOpen, setStatusSearchOpen] = useState(false);
  const [statusSearchQuery, setStatusSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [stages, setStages] = useState<RecruitmentStage[]>(initialAvailableStages || []);
  const [currentStageName, setCurrentStageName] = useState<string>('');
  const [deletingStageName, setDeletingStageName] = useState<string>('');

  // Initialize toast manager for better toast handling
  const { success: showSuccessToast, error: showErrorToast, clearAll: dismissAllToasts } = useToastManager({
    deduplicationWindowMs: 2000
  });
  const { dismissById, loadingWithId } = useToast();

  const resolveStageId = useCallback((stageIdOrName?: string | null) => {
    if (!stageIdOrName) {
      return '';
    }

    const matchedStage = stages.find(
      (stage) => stage.id === stageIdOrName || stage.name === stageIdOrName,
    );

    return matchedStage?.id || stageIdOrName;
  }, [stages]);


  // Refs for cleanup and preventing memory leaks
  const modalCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update stages when prop changes (memoized to prevent unnecessary updates)
  useEffect(() => {
    if (isMountedRef.current && initialAvailableStages) {
      setStages(initialAvailableStages);
    }
  }, [initialAvailableStages]);

  // Fetch current stage name when modal opens
  useEffect(() => {
    const fetchStageName = async () => {
      if (applicant?.status) {
        try {
          const idOrName = applicant.statusId || applicant.status || '';
          const name = await getRecruitmentStageNameClient(idOrName);
          setCurrentStageName(name || '');
        } catch (error) {
          console.error('Error fetching stage name:', error);
          setCurrentStageName((applicant.statusId || applicant.status || ''));
        }
      }
    };

    if (isOpen && applicant) {
      fetchStageName();
    }
  }, [isOpen, applicant]);

  // Fetch stage name when setting transition to delete
  const handleSetTransitionToDelete = useCallback(async (transition: TransitionRecord | null) => {
    setTransitionToDelete(transition);
    if (transition?.stage) {
      try {
        const name = await getRecruitmentStageNameClient(transition.stage);
        setDeletingStageName(name || '');
      } catch (error) {
        console.error('Error fetching stage name for deletion:', error);
        setDeletingStageName(transition.stage);
      }
    }
  }, []);

  const form = useForm<TransitionFormValues>({
    resolver: zodResolver(transitionFormSchema),
    defaultValues: {
      newStatus: resolveStageId(applicant?.statusId || applicant?.status || stages[0]?.id || ''),
      notes: '',
    },
  });

  // Reset form when modal opens/closes or applicant changes
  useEffect(() => {
    if (isMountedRef.current && applicant && isOpen) {
      form.reset({
        newStatus: resolveStageId(preselectedStage || applicant.statusId || applicant.status || ''),
        notes: '',
      });
      setEditingTransitionId(null);
      setStatusSearchQuery('');
    }
  }, [applicant?.id, isOpen, preselectedStage, resolveStageId]); // Removed form and stages from dependencies to prevent infinite loops

  // Cleanup function to prevent memory leaks
  const cleanup = useCallback(() => {
    if (modalCloseTimeoutRef.current) {
      clearTimeout(modalCloseTimeoutRef.current);
      modalCloseTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
  }, [isOpen, cleanup]);

  const handleAddTransitionSubmit = useCallback(async (data: TransitionFormValues) => {
    if (!isMountedRef.current) return;

    const trimmedNotes = data.notes?.trim() || '';
    const currentStatus = applicant ? (applicant.statusId || applicant.status || '') : '';
    const noChangeCondition = data.newStatus === currentStatus && !trimmedNotes;

    if (noChangeCondition) {
      showErrorToast("Please select a new status or add notes to create a transition.");
      return;
    }

    setIsSaving(true);

    // Show loading toast for transaction management (capture id for dismissal)
    const loadingToastId = loadingWithId("Managing transaction...");

    // Create abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Call the onUpdateApplicant function
      if (onUpdateApplicant) {
        if (!applicant) {
          dismissById(loadingToastId);
          showErrorToast('Applicant data is unavailable. Please close and reopen the modal.');
          setIsSaving(false);
          return;
        }
        console.log('ManageTransitionsModal - Calling onUpdateApplicant for applicant:', applicant.id, 'with new status:', data.newStatus);
        const result = await onUpdateApplicant(applicant.id, data.newStatus, trimmedNotes, true);
        console.log('ManageTransitionsModal - onUpdateApplicant call completed. Result:', result);

        // Check if the update was blocked (e.g., by headcount warning)
        // If onUpdateApplicant returns undefined or false, it means the update was blocked
        if (result === false || result === undefined) {
          console.warn('ManageTransitionsModal - Update was blocked or returned no result. Not proceeding with success flow.');
          // Dismiss loading toast
          dismissById(loadingToastId);
          setIsSaving(false); // Reset saving state
          return; // Don't show success toast or close modal - the blocking logic should handle user feedback
        }
        console.log('ManageTransitionsModal - Update confirmed success. Proceeding with closing modal.');
      } else {
        console.error('onUpdateApplicant function is not provided');
        throw new Error('Update function not available');
      }

      if (!isMountedRef.current) return;

      // Transaction passed successfully - close the manage transaction toast
      dismissById(loadingToastId);

      // Reset form and state
      form.reset({ newStatus: data.newStatus, notes: '' });
      setStatusSearchQuery('');

      // Refresh data and comments
      if (onRefreshApplicantData) {
        await onRefreshApplicantData(applicant.id);
      }

      if (onCommentsChange) {
        onCommentsChange();
      }

      // Show success toast for update success
      showSuccessToast("Update successful!", {
        duration: 3000,
        icon: "✅"
      });

      // Add a small delay before closing modal for better UX
      setTimeout(() => {
        if (isMountedRef.current) {
          onOpenChange(false);
        }
      }, 500);

    } catch (error) {
      if (!isMountedRef.current) return;

      // Dismiss loading toast
      dismissById(loadingToastId);

      console.error('Transition save error:', error);

      // Handle all errors with better messaging
      const errorMessage = error instanceof Error ? error.message : 'Failed to save transition. Please try again.';
      showErrorToast(errorMessage, {
        duration: 5000
      });
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
      abortControllerRef.current = null;
    }
  }, [applicant, onUpdateApplicant, onRefreshApplicantData, onCommentsChange, onOpenChange, form, showSuccessToast, showErrorToast, loadingWithId]);

  const handleEditNotesClick = useCallback((transition: TransitionRecord) => {
    if (!isMountedRef.current) return;
    setEditingTransitionId(transition.id);
    setEditingNotes(transition.notes || '');
  }, []);

  const handleSaveNotes = useCallback(async (transitionId: string) => {
    if (!isMountedRef.current) return;

    // Create abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`/api/transitions/${transitionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editingNotes }),
        signal: controller.signal,
      });

      if (!isMountedRef.current) return;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred" }));
        throw new Error(errorData.message || `Failed to update notes: ${response.statusText}`);
      }

      showSuccessToast("Transition notes have been successfully updated.");
      setEditingTransitionId(null);
      if (applicant) {
        await onRefreshApplicantData(applicant.id);
      }
    } catch (error) {
      if (!isMountedRef.current) return;

      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      showErrorToast("Error updating notes. Please try again.", {
        duration: 5000
      });
    } finally {
      abortControllerRef.current = null;
    }
  }, [editingNotes, onRefreshApplicantData, applicant?.id, showSuccessToast, showErrorToast]);

  const confirmDeleteTransition = useCallback((transition: TransitionRecord) => {
    if (!isMountedRef.current) return;
    setTransitionToDelete(transition);
  }, []);

  const handleDeleteTransition = useCallback(async () => {
    if (!transitionToDelete || !isMountedRef.current) return;

    // Create abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`/api/transitions/${transitionToDelete.id}`, {
        method: 'DELETE',
        signal: controller.signal,
      });

      if (!isMountedRef.current) return;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred" }));
        throw new Error(errorData.message || `Failed to delete transition: ${response.statusText}`);
      }

      showSuccessToast("The transition record has been successfully deleted.");
      if (applicant) {
        await onRefreshApplicantData(applicant.id);
      }
    } catch (error) {
      if (!isMountedRef.current) return;

      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      showErrorToast("Error deleting transition. Please try again.", {
        duration: 5000
      });
    } finally {
      if (isMountedRef.current) {
        setTransitionToDelete(null);
      }
      abortControllerRef.current = null;
    }
  }, [transitionToDelete, onRefreshApplicantData, applicant?.id, showSuccessToast, showErrorToast]);

  const handleModalOpenChange = useCallback((open: boolean) => {
    if (!isMountedRef.current) return;

    onOpenChange(open);
    if (!open) {
      setEditingTransitionId(null);
      setStatusSearchQuery('');
      cleanup();
    }
  }, [onOpenChange, cleanup]);

  const handleCancelClick = useCallback(() => {
    // Reset form to initial state
    if (applicant) {
      form.reset({
        newStatus: resolveStageId(preselectedStage || applicant.statusId || applicant.status || ''),
        notes: '',
      });
    }
    setEditingTransitionId(null);
    setStatusSearchQuery('');
    cleanup();
    onOpenChange(false);
  }, [applicant, preselectedStage, form, cleanup, onOpenChange, resolveStageId]);

  const handleSaveClick = useCallback(async () => {
    try {
      const formValues = form.getValues();

      // Manually trigger validation
      const isValid = await form.trigger();

      if (isValid) {
        await handleAddTransitionSubmit(formValues);
      } else {
        console.error('Form validation failed:', form.formState.errors);
        // Show specific validation errors
        const errorMessages = Object.values(form.formState.errors).map(error => error?.message).filter(Boolean);
        if (errorMessages.length > 0) {
          showErrorToast(`Please fix the following errors: ${errorMessages.join(', ')}`);
        } else {
          showErrorToast('Please fix the form errors before submitting');
        }
      }
    } catch (error) {
      console.error('Error in handleSaveClick:', error);
      showErrorToast('An unexpected error occurred. Please try again.');
    }
  }, [form, handleAddTransitionSubmit, showErrorToast]);

  const filteredStages = (() => {
    try {
      // Defensive check to prevent filter errors
      if (!Array.isArray(stages)) {
        console.warn('ManageTransitionsModal: stages is not an array:', stages);
        return [];
      }

      if (!statusSearchQuery) {
        return stages;
      }

      return stages.filter(stage => {
        try {
          return stage && stage.name && stage.name.toLowerCase().includes(statusSearchQuery.toLowerCase());
        } catch (error) {
          console.warn('ManageTransitionsModal: Error filtering stage:', error, stage);
          return false;
        }
      });
    } catch (error) {
      console.error('ManageTransitionsModal: Error filtering stages:', error);
      return [];
    }
  })();

  if (!applicant) return null;

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={handleModalOpenChange}
      >
        <DialogContent dialogId="manage-transitions-modal" className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Transitions for {applicant.name}</DialogTitle>
            <DialogDescription>
              Track and update the Applicant&apos;s progress. Current status: <strong>{currentStageName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 py-4">
            <form id="transition-form" className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <Label htmlFor="new-stage-select" className="text-sm font-medium text-muted-foreground">New Stage</Label>
                <StageSelect
                  id="new-stage-select"
                  value={form.watch('newStatus')}
                  onChange={val => form.setValue('newStatus', val)}
                  availableStages={stages}
                  error={form.formState.errors.newStatus?.message}
                  loading={false}
                />
              </div>
              <div>
                <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">Notes (Optional)</Label>
                <Controller
                  name="notes"
                  control={form.control}
                  render={({ field }) => (
                    <TiptapEditor
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Add any relevant notes for this transition..."
                      className="mt-1 min-h-[100px]"
                      showToolbar={true}
                    />
                  )}
                />
              </div>
            </form>
          </div>

          <DialogFooter className="border-t pt-4 flex flex-row gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelClick}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={isSaving}
              onClick={handleSaveClick}
            >
              {isSaving ? <Save className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSaving ? 'Saving...' : 'Save Transition'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!transitionToDelete}
        onOpenChange={(open) => {
          if (!open) setTransitionToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Deleting this transition for stage &quot;<strong>{deletingStageName}</strong>&quot; (dated {transitionToDelete ? format(parseISO(transitionToDelete.date), "MMM d, yyyy") : 'N/A'}) will permanently remove it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransitionToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransition} className={buttonVariants({ variant: "destructive" })}>
              Delete Transition
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
