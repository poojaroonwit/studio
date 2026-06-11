
"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  canEditSystemPreferences,
} from "@/components/settings/system-preferences/utils";
import { SystemPreferencesLoadedPageView } from "./SystemPreferencesLoadedPageView";
import {
  buildSystemPreferenceImageActionsInput,
  buildSystemPreferenceLoaderInput,
  buildSystemPreferenceSaveActionInput,
  buildSystemPreferenceStyleEffectsInput,
} from "./system-preference-page-inputs";
import { useSystemPreferenceImageActions } from "./use-system-preference-image-actions";
import { useSystemPreferenceLoader } from "./use-system-preference-loader";
import { useSystemPreferencePageState } from "./use-system-preference-page-state";
import { useSystemPreferenceSaveAction } from "./use-system-preference-save-action";
import { useSystemPreferenceStyleEffects } from "./use-system-preference-style-effects";

export default function SystemPreferencesPage() {
  const { success, error: showError } = useToast();
  const { data: session, status: sessionStatus } = useSession();
  const currentPath =
    typeof window !== "undefined"
      ? window.location.pathname
      : "/settings/system-preferences";
  const preferenceState = useSystemPreferencePageState();
  const canEdit = canEditSystemPreferences(session?.user);

  const imageActions = useSystemPreferenceImageActions(
    buildSystemPreferenceImageActionsInput({
      showError,
      state: preferenceState,
    }),
  );
  const { cleanupObjectUrls } = imageActions;

  useSystemPreferenceLoader(
    buildSystemPreferenceLoaderInput({
      sessionStatus,
      currentPath,
      cleanupObjectUrls,
      state: preferenceState,
    }),
  );

  useSystemPreferenceStyleEffects(
    buildSystemPreferenceStyleEffectsInput(preferenceState),
  );

  const handleSavePreferences = useSystemPreferenceSaveAction(
    buildSystemPreferenceSaveActionInput({
      success,
      showError,
      state: preferenceState,
    }),
  );

  if (
    !preferenceState.isClient ||
    preferenceState.loading ||
    sessionStatus === "loading"
  ) {
    return (
      <div className="flex w-screen items-center justify-center bg-background fixed inset-0 z-50">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (preferenceState.errorMsg) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-semibold mb-2">
            {preferenceState.errorMsg}
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const canEditPreferences = canEdit ?? false;

  return (
    <SystemPreferencesLoadedPageView
      state={preferenceState}
      imageActions={imageActions}
      canEdit={canEditPreferences}
      onSave={handleSavePreferences}
    />
  );
}
