"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Users, Building2, Info, AlertCircle } from 'lucide-react';

interface HeadcountWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  positionTitle?: string;
  errorMessage: string;
  onProceed?: () => void;
}

export function HeadcountWarningModal({
  isOpen,
  onClose,
  candidateName,
  positionTitle,
  errorMessage,
  onProceed
}: HeadcountWarningModalProps) {
  // Parse headcount status from error message
  const headcountMatch = errorMessage.match(/\(Total: (\d+), Vacant: (\d+), Filled: (\d+)\)/);
  const headcountStatus = headcountMatch ? {
    total: parseInt(headcountMatch[1]),
    vacant: parseInt(headcountMatch[2]),
    filled: parseInt(headcountMatch[3])
  } : null;

  // Clean error message by removing headcount status info
  const cleanErrorMessage = errorMessage.replace(/\s*\(Total: \d+, Vacant: \d+, Filled: \d+\)/, '');

  // Determine the type of headcount constraint
  const isNoPosition = cleanErrorMessage.includes('must be assigned to a position');
  const isNoHeadcount = cleanErrorMessage.includes('no headcount defined');
  const isHeadcountFull = cleanErrorMessage.includes('already filled');
  const isValidationError = cleanErrorMessage.includes('Error validating headcount');

  const getSpecificGuidance = () => {
    if (isNoPosition) {
      return {
        title: "Position Assignment Required",
        description: "The candidate must be assigned to a position before they can be hired.",
        solutions: [
          "Assign the candidate to a specific position first",
          "Contact the hiring manager to determine the correct position",
          "Review the candidate's application for position preferences"
        ]
      };
    } else if (isNoHeadcount || isHeadcountFull) {
      return {
        title: "Headcount Limit Reached",
        description: "This position has reached its maximum headcount allocation.",
        solutions: [
          "Contact HR to increase headcount allocation for this position",
          "Check if there are other similar positions with available headcount",
          "Review current hiring pipeline to see if any positions can be reallocated",
          "Consider creating a new position or department if needed"
        ]
      };
    } else if (isValidationError) {
      return {
        title: "Headcount Validation Error",
        description: "There was an error validating the headcount availability.",
        solutions: [
          "Contact the system administrator to check headcount configuration",
          "Verify that the position and headcount data are properly set up",
          "Try the operation again after a few minutes",
          "Check if there are any pending headcount changes"
        ]
      };
    } else {
      return {
        title: "Headcount Constraint",
        description: "The status update cannot be completed due to headcount limitations.",
        solutions: [
          "Check if there are available headcount slots for this position",
          "Contact HR to increase headcount allocation",
          "Consider moving the candidate to a different position",
          "Review current hiring pipeline for this role"
        ]
      };
    }
  };

  const guidance = getSpecificGuidance();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {guidance.title}
          </DialogTitle>
          <DialogDescription className="text-left">
            The status update for <strong>{candidateName}</strong> cannot be completed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Position Information */}
          {positionTitle && (
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Position</div>
                <div className="text-muted-foreground">{positionTitle}</div>
              </div>
            </div>
          )}

          {/* Error Details */}
          <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-destructive">Issue</div>
              <div className="text-muted-foreground">{cleanErrorMessage}</div>
            </div>
          </div>

          {/* Headcount Status */}
          {headcountStatus && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <Users className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-amber-600 dark:text-amber-400">Current Headcount Status</div>
                <div className="text-muted-foreground mt-1">
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="font-medium">Total</div>
                      <div className="text-amber-600 dark:text-amber-400">{headcountStatus.total}</div>
                    </div>
                    <div>
                      <div className="font-medium">Vacant</div>
                      <div className="text-green-600 dark:text-green-400">{headcountStatus.vacant}</div>
                    </div>
                    <div>
                      <div className="font-medium">Filled</div>
                      <div className="text-red-600 dark:text-red-400">{headcountStatus.filled}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Specific Guidance */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-blue-600 dark:text-blue-400">Recommended Actions</div>
              <ul className="text-muted-foreground mt-1 space-y-1">
                {guidance.solutions.map((solution, index) => (
                  <li key={index}>• {solution}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {onProceed && !isNoPosition && (
            <Button 
              variant="destructive" 
              onClick={() => {
                onProceed();
                onClose();
              }}
            >
              Proceed Anyway
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
