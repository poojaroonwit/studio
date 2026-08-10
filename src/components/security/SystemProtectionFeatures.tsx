"use client";

import { useGlobalSettings } from "@/contexts/GlobalSettingsContext";
import { getBooleanSystemSetting } from "./security-protection-utils";
import { RightClickProtection } from "./RightClickProtection";
import { ScreenCaptureProtection } from "./ScreenCaptureProtection";

export function SystemProtectionFeatures() {
  const { settings } = useGlobalSettings();

  return (
    <>
      <RightClickProtection enabled={settings.rightClickProtectionEnabled} />
      <ScreenCaptureProtection enabled={settings.screenCaptureProtectionEnabled} />
    </>
  );
}
