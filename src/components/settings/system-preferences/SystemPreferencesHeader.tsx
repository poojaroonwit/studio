"use client";

import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SystemPreferencesHeaderProps {
  showLogoOnly: boolean;
  saving: boolean;
  canEdit: boolean;
  onSave: () => void;
}

export function SystemPreferencesHeader({
  showLogoOnly,
  saving,
  canEdit,
  onSave,
}: SystemPreferencesHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        {!showLogoOnly && (
          <h1 className="text-2xl font-bold text-foreground">System Preferences</h1>
        )}
        <p className="text-muted-foreground">Manage application appearance, branding, and global settings</p>
      </div>
      <Button
        onClick={onSave}
        disabled={saving || !canEdit}
        variant="default"
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
}
