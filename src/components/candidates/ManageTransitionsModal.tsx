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
import type { Candidate, TransitionRecord, CandidateStatus, RecruitmentStage } from '@/lib/types';
import { PlusCircle, CalendarDays, Edit3, Trash2, Save, X, User, ChevronsUpDown, Check } from 'lucide-react';
import { format } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

import CandidateCommentsSection from './CandidateCommentsSection';
import { StageSelect } from './StageSelect';
import { getRecruitmentStageNameClient } from '@/lib/recruitmentStageUtils';

const transitionFormSchema = z.object({
  newStatus: z.string().min(1, "New status is required"),
  notes: z.string().optional(),
});

type TransitionFormValues = z.infer<typeof transitionFormSchema>;

interface ManageTransitionsModalProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateCandidate: (candidateId: string, status: CandidateStatus, notes?: string, suppressToast?: boolean) => Promise<void>;
  onRefreshCandidateData: (candidateId: string) => Promise<void>;
  availableStages: RecruitmentStage[];
  preselectedStage?: string | null;
  comments: any[];
  onCommentsChange: () => void;
  onHeadcountConstraintError?: (error: Error) => void;
}

export function ManageTransitionsModal({
  candidate,
  isOpen,
  onOpenChange,
  onUpdateCandidate,
  onRefreshCandidateData,
  availableStages: initialAvailableStages,
  preselectedStage,
  comments,
  onCommentsChange,
  onHeadcountConstraintError,
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
      if (candidate?.status) {
        try {
          const idOrName = candidate.statusId || candidate.status || '';
          const name = await getRecruitmentStageNameClient(idOrName);
          setCurrentStageName(name || '');
        } catch (error) {
          console.error('Error fetching stage name:', error);
          setCurrentStageName((candidate.statusId || candidate.status || ''));
        }
      }
    };
    
    if (isOpen && candidate) {
      fetchStageName();
    }
  }, [isOpen, candidate]);

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
      newStatus: candidate?.statusId || candidate?.status || (stages[0]?.id || ''),
      notes: '',
    },
  });

  // Reset form when modal opens/closes or candidate changes
  useEffect(() => {
    if (isMountedRef.current && candidate && isOpen) {
      form.reset({
        newStatus: (preselectedStage || candidate.statusId || candidate.status || ''),
        notes: '',
      });
      setEditingTransitionId(null);
      setStatusSearchQuery('');
    }
  }, [candidate?.id, isOpen, preselectedStage]); // Removed form and stages from dependencies to prevent infinite loops

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

  if (!candidate) return null;

  const handleAddTransitionSubmit = useCallback(async (data: TransitionFormValues) => {
    if (!isMountedRef.current) return;

    const trimmedNotes = data.notes?.trim() || '';
    const noChangeCondition = data.newStatus === (candidate.statusId || candidate.status) && !trimmedNotes;
    
    if (noChangeCondition) {
        toast("Please select a new status or add notes to create a transition.");
        return;
    }

    setIsSaving(true);
    
    // Create abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
        // Call the onUpdateCandidate function
        if (onUpdateCandidate) {
            await onUpdateCandidate(candidate.id, data.newStatus, trimmedNotes, true);
        } else {
            console.error('onUpdateCandidate function is not provided');
            throw new Error('Update function not available');
        }
        
        if (!isMountedRef.current) return;
        
        // Reset form and state
        form.reset({ newStatus: data.newStatus, notes: '' }); 
        setStatusSearchQuery(''); 
        
        // Refresh data and comments
        if (onRefreshCandidateData) {
            await onRefreshCandidateData(candidate.id);
        }
        
        if (onCommentsChange) {
            onCommentsChange();
        }
        
        // Show success message and close modal
        toast.success("Candidate details updated successfully.");
        
        // Close modal - simplified approach
        onOpenChange(false);
        
    } catch (error) {
        if (!isMountedRef.current) return;
        
        console.error('Transition save error:', error);
        
        // Check if it's a headcount constraint error
        if (error instanceof Error && error.message.includes('Headcount constraint:')) {
            // Call the headcount constraint error callback if provided
            if (onHeadcountConstraintError) {
                onHeadcountConstraintError(error);
            } else {
                // Fallback to showing the error in a toast
                toast.error(error.message);
            }
        } else {
            // Handle other types of errors
            const errorMessage = error instanceof Error ? error.message : 'Failed to save transition. Please try again.';
            toast.error(errorMessage);
        }
    } finally {
        if (isMountedRef.current) {
            setIsSaving(false);
        }
        abortControllerRef.current = null;
    }
  }, [candidate, onUpdateCandidate, onRefreshCandidateData, onCommentsChange, onOpenChange, form, onHeadcountConstraintError]);

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
      
      toast("Transition notes have been successfully updated.");
      setEditingTransitionId(null);
      await onRefreshCandidateData(candidate.id);
    } catch (error) {
      if (!isMountedRef.current) return;
      
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      toast("Error Updating Notes", {
        icon: "❌",
        duration: 5000,
        style: {
          background: "#ff0000",
          color: "#fff",
        },
      });
    } finally {
      abortControllerRef.current = null;
    }
  }, [editingNotes, onRefreshCandidateData, candidate?.id]);

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
      
      toast("The transition record has been successfully deleted.");
      await onRefreshCandidateData(candidate.id);
    } catch (error) {
      if (!isMountedRef.current) return;
      
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      toast("Error Deleting Transition", {
        icon: "❌",
        duration: 5000,
        style: {
          background: "#ff0000",
          color: "#fff",
        },
      });
    } finally {
      if (isMountedRef.current) {
        setTransitionToDelete(null);
      }
      abortControllerRef.current = null;
    }
  }, [transitionToDelete, onRefreshCandidateData, candidate?.id]);

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
    if (candidate) {
      form.reset({
        newStatus: (preselectedStage || candidate.statusId || candidate.status || ''),
        notes: '',
      });
    }
    setEditingTransitionId(null);
    setStatusSearchQuery('');
    cleanup();
    onOpenChange(false);
  }, [candidate, preselectedStage, form, cleanup, onOpenChange]);

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
          toast.error(`Please fix the following errors: ${errorMessages.join(', ')}`);
        } else {
          toast.error('Please fix the form errors before submitting');
        }
      }
    } catch (error) {
      console.error('Error in handleSaveClick:', error);
      toast.error('An unexpected error occurred. Please try again.');
    }
  }, [form, handleAddTransitionSubmit]);

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

  return (
    <>
      <Dialog 
        open={isOpen} 
        onOpenChange={handleModalOpenChange}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Transitions for {candidate.name}</DialogTitle>
            <DialogDescription>
              Track and update the candidate&apos;s progress. Current status: <strong>{currentStageName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 py-4">
              <h3 className="text-lg font-semibold mb-1 text-foreground">Add New Transition</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Select a new stage and add notes. This will update the candidate&#39;s current status and record the change.
              </p>
              <form id="transition-form" className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <StageSelect
                    value={form.watch('newStatus')}
                    onChange={val => form.setValue('newStatus', val)}
                    availableStages={stages}
                    label="New Stage"
                    error={form.formState.errors.newStatus?.message}
                    loading={false}
                  />
                </div>
                <div>
                  <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any relevant notes for this transition..."
                    {...form.register('notes')}
                    className="mt-1 min-h-[80px]"
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
