"use client";

import { PWAInstallPromptBanner } from "./PWAInstallPromptBanner";
import { usePwaInstallPrompt } from "./use-pwa-install-prompt";

export function PWAInstallPrompt() {
  const {
    handleDismiss,
    handleInstallClick,
    isMobileOrTablet,
    isPromptVisible,
  } = usePwaInstallPrompt();

  if (!isPromptVisible || !isMobileOrTablet) {
    return null;
  }

  return (
    <PWAInstallPromptBanner
      onDismiss={handleDismiss}
      onInstall={handleInstallClick}
    />
  );
}
