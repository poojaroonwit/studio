"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Database, Loader2, Save, Settings, X } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import type { UserPreferencesActions } from "./UserPreferencesModalTypes";

export function UserPreferencesModalHeader({ user }: { user: UserProfile }) {
  return (
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Settings className="w-5 h-5" />
        User Preferences - {user.name}
      </DialogTitle>
      <DialogDescription>
        Manage user preferences and personal settings
      </DialogDescription>
    </DialogHeader>
  );
}

export function UserPreferencesLoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading preferences...</p>
      </div>
    </div>
  );
}

export function UserPreferencesModalFooter({
  actions,
  hasChanges,
  isSaving,
}: {
  actions: UserPreferencesActions;
  hasChanges: boolean;
  isSaving: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-muted/30 backdrop-blur-sm sticky bottom-0 z-20">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Database className="w-4 h-4" />
        <span>Database Storage</span>
        {hasChanges && (
          <Badge variant="secondary" className="text-xs">
            Unsaved Changes
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={actions.cancel}
          disabled={isSaving}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={actions.save}
          disabled={isSaving || !hasChanges}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
