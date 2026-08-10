"use client";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  UserPreferencesLoadingState,
  UserPreferencesModalFooter,
  UserPreferencesModalHeader,
} from "./UserPreferencesModalParts";
import { UserPreferencesTabs } from "./UserPreferencesModalTabs";
import type { UserPreferencesModalProps } from "./UserPreferencesModalTypes";
import { useUserPreferencesModal } from "./use-user-preferences-modal";

export function UserPreferencesModal({
  isOpen,
  onOpenChange,
  user,
}: UserPreferencesModalProps) {
  const state = useUserPreferencesModal({ isOpen, onOpenChange, user });

  if (!user) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-hidden"
        dialogId="user-preferences-modal"
      >
        <UserPreferencesModalHeader user={user} />

        {state.isLoading ? (
          <UserPreferencesLoadingState />
        ) : state.preferences ? (
          <div className="flex flex-col h-full">
            <UserPreferencesTabs
              actions={state.actions}
              preferences={state.preferences}
            />
            <UserPreferencesModalFooter
              actions={state.actions}
              hasChanges={state.hasChanges}
              isSaving={state.isModalSaving}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
