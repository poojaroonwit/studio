"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { UnifiedUserModalContent } from './unified-user-modal/UnifiedUserModalContent';
import { UserProfile } from '@/lib/types';
import {
  UnifiedUserFormValues,
  ModalMode
} from './unified-user-modal/types';

interface UnifiedUserModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: ModalMode;
  user?: UserProfile | null;
  onSave: (data: UnifiedUserFormValues) => Promise<void>;
  onEditUser?: (userId: string, data: UnifiedUserFormValues) => Promise<void>;
  onAddUser?: (data: UnifiedUserFormValues) => Promise<void>;
}

export function UnifiedUserModal(props: UnifiedUserModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={props.isOpen} onOpenChange={props.onOpenChange}>
        <DrawerContent className="h-[95vh] p-0" drawerId="unified-user-drawer" hideCloseButton>
          <UnifiedUserModalContent {...props} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] sm:max-w-4xl h-[85vh] sm:h-[90vh] p-0 flex flex-col gap-0 rounded-lg overflow-hidden" 
        dialogId="unified-user-dialog"
        hideCloseButton
      >
        <UnifiedUserModalContent {...props} />
      </DialogContent>
    </Dialog>
  );
}

// Export for use in other components
export type { UnifiedUserFormValues, ModalMode } from './unified-user-modal/types';
