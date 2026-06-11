"use client";

import { RefreshCw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AiApiKeysFooterProps } from "./AiApiKeysTabTypes";

export function AiApiKeysFooter({
  apiKeys,
  isSaving,
  onRefresh,
  onSave,
}: AiApiKeysFooterProps) {
  return (
    <div className="flex justify-end gap-4">
      <Button variant="outline" onClick={onRefresh} disabled={isSaving}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
      <Button onClick={onSave} disabled={isSaving || apiKeys.length === 0}>
        {isSaving ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
}

export function AiApiKeysLoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
