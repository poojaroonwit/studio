"use client";

import { useState, useEffect } from 'react';
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
import { updateCandidateStatusWithNotes } from '@/lib/candidateTransitionUtils';
import CandidateCommentsSection from './CandidateCommentsSection';
import { StageSelect } from './StageSelect';

const transitionFormSchema = z.object({
  newStatus: z.string().min(1, "New status is required"),
  notes: z.string().optional(),
});

type TransitionFormValues = z.infer<typeof transitionFormSchema>;

interface ManageTransitionsModalProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateCandidate: (candidateId: string, status: CandidateStatus, notes?: string, suppressToast?: boolean) => Promise<void>; // Modified to accept notes and suppressToast
  onRefreshCandidateData: (candidateId: string) => Promise<void>;
  availableStages: RecruitmentStage[];
  preselectedStage?: string | null;
  comments: any[];
  onCommentsChange: () => void;
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
}: ManageTransitionsModalProps) {
  const [editingTransitionId, setEditingTransitionId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [transitionToDelete, setTransitionToDelete] = useState<TransitionRecord | null>(null);
  const [statusSearchOpen, setStatusSearchOpen] = useState(false);
  const [statusSearchQuery, setStatusSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [stages, setStages] = useState<RecruitmentStage[]>(initialAvailableStages || []);
  const [loadingStages, setLoadingStages] = useState(false);

  // Fetch latest stages every time modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingStages(true);
      fetch('/api/settings/recruitment-stages')
        .then(res => res.json())
        .then(data => {
          setStages(Array.isArray(data) ? data : []);
          console.log('Fetched stages:', data); // Debug log
        })
        .catch(() => setStages([]))
        .finally(() => setLoadingStages(false));
    }
  }, [isOpen]);

  const form = useForm<TransitionFormValues>({
    resolver: zodResolver(transitionFormSchema),
    defaultValues: {
      newStatus: candidate?.status || (stages[0]?.name || 'Applied'),
      notes: '',
    },
  });

  useEffect(() => {
    if (candidate && isOpen) {
      form.reset({
        newStatus: preselectedStage || candidate.status,
        notes: '',
      });
      setEditingTransitionId(null);
      setStatusSearchQuery('');
    }
  }, [candidate, isOpen, form, stages, preselectedStage]);

  if (!candidate) return null;

  const handleAddTransitionSubmit = async (data: TransitionFormValues) => {
    const trimmedNotes = data.notes?.trim() || '';
    const noChangeCondition = data.newStatus === candidate.status && !trimmedNotes;
    
    if (noChangeCondition) {
        toast("Please select a new status or add notes to create a transition.");
        return;
    }
    setIsSaving(true);
    try {
        await updateCandidateStatusWithNotes(candidate.id, data.newStatus, trimmedNotes);
        form.reset({ newStatus: data.newStatus, notes: '' }); 
        setStatusSearchQuery(''); 
        setIsSaving(false);
        onOpenChange(false); // Close modal on success
        await onRefreshCandidateData(candidate.id); // Refresh data after update
        onCommentsChange(); // Refresh comments after transition
        toast.success("Candidate details updated successfully.");
    } catch (error) {
        setIsSaving(false);
        toast("Failed to save transition. Please try again.");
    }
  };

  const handleEditNotesClick = (transition: TransitionRecord) => {
    setEditingTransitionId(transition.id);
    setEditingNotes(transition.notes || '');
  };

  const handleSaveNotes = async (transitionId: string) => {
    try {
      const response = await fetch(`/api/transitions/${transitionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editingNotes }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred" }));
        throw new Error(errorData.message || `Failed to update notes: ${response.statusText}`);
      }
      toast("Transition notes have been successfully updated.");
      setEditingTransitionId(null);
      await onRefreshCandidateData(candidate.id);
    } catch (error) {
      toast("Error Updating Notes", {
        icon: "❌",
        duration: 5000,
        style: {
          background: "#ff0000",
          color: "#fff",
        },
      });
    }
  };

  const confirmDeleteTransition = (transition: TransitionRecord) => {
    setTransitionToDelete(transition);
  };

  const handleDeleteTransition = async () => {
    if (!transitionToDelete) return;
    try {
      const response = await fetch(`/api/transitions/${transitionToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred" }));
        throw new Error(errorData.message || `Failed to delete transition: ${response.statusText}`);
      }
      toast("The transition record has been successfully deleted.");
      await onRefreshCandidateData(candidate.id);
    } catch (error) {
      toast("Error Deleting Transition", {
        icon: "❌",
        duration: 5000,
        style: {
          background: "#ff0000",
          color: "#fff",
        },
      });
    } finally {
      setTransitionToDelete(null);
    }
  };

  const filteredStages = statusSearchQuery
    ? stages.filter(stage => stage.name.toLowerCase().includes(statusSearchQuery.toLowerCase()))
    : stages;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setEditingTransitionId(null);
          setStatusSearchQuery('');
        }
      }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Transitions for {candidate.name}</DialogTitle>
            <DialogDescription>
              Track and update the candidate&apos;s progress. Current status: <strong>{candidate.status}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1  gap-x-6 gap-y-4 py-4">
              <h3 className="text-lg font-semibold mb-1 text-foreground">Add New Transition</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Select a new stage and add notes. This will update the candidate&#39;s current status and record the change.
              </p>
              <form id="transition-form" onSubmit={form.handleSubmit(handleAddTransitionSubmit)} className="space-y-4">
                <div>
                  <StageSelect
                    value={form.watch('newStatus')}
                    onChange={val => form.setValue('newStatus', val)}
                    availableStages={stages}
                    label="New Stage"
                    error={form.formState.errors.newStatus?.message}
                  />
                  {loadingStages && <div className="text-xs text-muted-foreground mt-1">Loading stages...</div>}
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
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" form="transition-form" variant="default" disabled={isSaving}>
              {isSaving ? <Save className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSaving ? 'Saving...' : 'Save Transition'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!transitionToDelete} onOpenChange={(open) => { if(!open) setTransitionToDelete(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Deleting this transition for stage &quot;<strong>{transitionToDelete?.stage}</strong>&quot; (dated {transitionToDelete ? format(parseISO(transitionToDelete.date), "MMM d, yyyy") : 'N/A'}) will permanently remove it.
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
