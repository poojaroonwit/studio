"use client";

import React from 'react';
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
import type { CandidateSource } from '@/lib/types';

interface CandidateSourceAlertDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  source: CandidateSource | null;
}

export default function CandidateSourceAlertDialog({
  open,
  onConfirm,
  onCancel,
  source
}: CandidateSourceAlertDialogProps) {
  if (!source) return null;

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Candidate Source</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{source.name}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
