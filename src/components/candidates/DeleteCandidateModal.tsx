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
} from '@/components/ui/alert-dialog';
import { TrashIcon as Trash2 } from '@heroicons/react/24/outline';
import type { Candidate } from '@/lib/types';

interface DeleteCandidateModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate | null;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteCandidateModal({
  isOpen,
  onOpenChange,
  candidate,
  onConfirm,
  isDeleting = false
}: DeleteCandidateModalProps) {
  if (!candidate) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                Are you sure you want to delete this candidate? This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="bg-muted/50 rounded-lg p-4 border">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {candidate.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate">
                  {candidate.name || 'Unknown Candidate'}
                </h4>
                {candidate.email && (
                  <p className="text-sm text-muted-foreground truncate">
                    {candidate.email}
                  </p>
                )}
                {candidate.id && (
                  <p className="text-xs text-muted-foreground">
                    ID: {candidate.id}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Candidate
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
