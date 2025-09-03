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
  candidate?: any; // Add candidate prop for position ID access
}

export function HeadcountWarningModal({
  isOpen,
  onClose,
  candidateName,
  positionTitle,
  errorMessage,
  onProceed
}: HeadcountWarningModalProps) {
  // Add debugging to track modal state changes
  React.useEffect(() => {
    console.log('HeadcountWarningModal - isOpen changed:', isOpen);
    if (isOpen) {
      console.log('HeadcountWarningModal - Modal opened');
    } else {
      console.log('HeadcountWarningModal - Modal closed');
    }
  }, [isOpen]);

  // Parse headcount status from error message
  const headcountMatch = errorMessage.match(/\(Total: (\d+), Vacant: (\d+), Filled: (\d+)\)/);
  const headcountStatus = headcountMatch ? {
    total: parseInt(headcountMatch[1]),
    vacant: parseInt(headcountMatch[2]),
    filled: parseInt(headcountMatch[3])
  } : null;

  const isNoPosition = !positionTitle;

  // Prevent automatic closing by handling onOpenChange properly
  const handleOpenChange = (open: boolean) => {
    console.log('HeadcountWarningModal - handleOpenChange called with:', open);
    if (!open) {
      console.log('HeadcountWarningModal - User requested to close modal');
      onClose();
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={handleOpenChange}
      modal={true}
    >
      <DialogContent 
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => {
          console.log('HeadcountWarningModal - Escape key pressed, preventing default');
          e.preventDefault();
        }}
        onOpenAutoFocus={(e) => {
          console.log('HeadcountWarningModal - Auto-focus event, preventing default');
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          console.log('HeadcountWarningModal - Pointer down outside, preventing default');
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          console.log('HeadcountWarningModal - Interact outside, preventing default');
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Headcount Constraint Warning
          </DialogTitle>
          <DialogDescription>
            Cannot proceed with this action due to headcount limitations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-800">
                  {candidateName} cannot be hired for {positionTitle || 'this position'}
                </p>
                <p className="text-sm text-amber-700">
                  {errorMessage}
                </p>
              </div>
            </div>
          </div>

          {headcountStatus && (
            <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Current Headcount Status</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{headcountStatus.total}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-600">{headcountStatus.vacant}</div>
                  <div className="text-xs text-gray-500">Vacant</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-600">{headcountStatus.filled}</div>
                  <div className="text-xs text-gray-500">Filled</div>
                </div>
              </div>
            </div>
          )}

          {isNoPosition && (
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800">No Position Assigned</p>
                  <p className="text-sm text-blue-700">
                    This candidate is not assigned to any position. Please assign a position first before attempting to hire.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => {
            console.log('HeadcountWarningModal - Close button clicked');
            onClose();
          }}>
            Close
          </Button>
          {onProceed && !isNoPosition && (
            <Button 
              variant="destructive" 
              onClick={() => {
                console.log('HeadcountWarningModal - Proceed button clicked');
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
