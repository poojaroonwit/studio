import { Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CustomizeBoardModalFooterProps } from './CustomizeBoardModalTypes';

export function CustomizeBoardModalHeader() {
  return (
    <DialogHeader className="p-6 pb-0 border-b flex-shrink-0 bg-card rounded-t-xl">
      <DialogTitle className="flex items-center gap-2 text-2xl">
        <Settings className="w-6 h-6" />
        Customize Board Layout
      </DialogTitle>
      <DialogDescription className="text-base mt-2">
        Configure how your task board is organized and which fields are visible on each card.
      </DialogDescription>
    </DialogHeader>
  );
}

export function CustomizeBoardModalFooter({
  disabled,
  initializing,
  loading,
  onCancel,
  onSave,
}: CustomizeBoardModalFooterProps) {
  return (
    <DialogFooter className="mt-auto  bottom-0 left-0 right-0 bg-card border-t p-4 flex-shrink-0 rounded-b-xl z-10">
      <div className="flex items-center justify-between w-full">
        <div className="text-xs text-muted-foreground">
          Changes will be applied immediately to your board
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={disabled}
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={disabled}
            className="min-w-[100px]"
          >
            <SaveButtonLabel initializing={initializing} loading={loading} />
          </Button>
        </div>
      </div>
    </DialogFooter>
  );
}

function SaveButtonLabel({
  initializing,
  loading,
}: {
  initializing: boolean;
  loading: boolean;
}) {
  if (loading) {
    return (
      <>
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
        Saving...
      </>
    );
  }

  if (initializing) {
    return (
      <>
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
        Loading...
      </>
    );
  }

  return 'Save Changes';
}
