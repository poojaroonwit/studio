"use client";

import { ScrollArea } from '@/components/ui/scroll-area';

import {
  AccountLockoutAlertsSection,
  SecurityControlsAccordion,
  SecurityControlSwitchRow,
} from './SecurityControlsTabParts';
import {
  SECURITY_CONTROL_ITEMS,
  type SecurityControlKey,
} from './security-controls-tab-config';

interface SecurityControlsTabProps {
  screenCaptureProtectionEnabled: boolean;
  setScreenCaptureProtectionEnabled: (val: boolean) => void;
  rightClickProtectionEnabled: boolean;
  setRightClickProtectionEnabled: (val: boolean) => void;
  loginPageDevToolsProtectionEnabled: boolean;
  setLoginPageDevToolsProtectionEnabled: (val: boolean) => void;
  globalTwoFactorEnabled: boolean;
  setGlobalTwoFactorEnabled: (val: boolean) => void;
  lockoutAlertEmails: string[];
  setLockoutAlertEmails: (val: string[]) => void;
  lockoutWebhookUrl: string;
  setLockoutWebhookUrl: (val: string) => void;
  isSaving: boolean;
}

export default function SecurityControlsTab({
  screenCaptureProtectionEnabled,
  setScreenCaptureProtectionEnabled,
  rightClickProtectionEnabled,
  setRightClickProtectionEnabled,
  loginPageDevToolsProtectionEnabled,
  setLoginPageDevToolsProtectionEnabled,
  globalTwoFactorEnabled,
  setGlobalTwoFactorEnabled,
  lockoutAlertEmails,
  setLockoutAlertEmails,
  lockoutWebhookUrl,
  setLockoutWebhookUrl,
  isSaving,
}: SecurityControlsTabProps) {
  const values: Record<SecurityControlKey, boolean> = {
    screenCaptureProtectionEnabled,
    rightClickProtectionEnabled,
    loginPageDevToolsProtectionEnabled,
    globalTwoFactorEnabled,
  };
  const setters: Record<SecurityControlKey, (value: boolean) => void> = {
    screenCaptureProtectionEnabled: setScreenCaptureProtectionEnabled,
    rightClickProtectionEnabled: setRightClickProtectionEnabled,
    loginPageDevToolsProtectionEnabled: setLoginPageDevToolsProtectionEnabled,
    globalTwoFactorEnabled: setGlobalTwoFactorEnabled,
  };

  return (
    <ScrollArea className="h-full">
      <SecurityControlsAccordion>
        {SECURITY_CONTROL_ITEMS.map((item) => (
          <SecurityControlSwitchRow
            key={item.key}
            checked={values[item.key]}
            disabled={isSaving}
            item={item}
            onCheckedChange={setters[item.key]}
          />
        ))}
        <AccountLockoutAlertsSection
          isSaving={isSaving}
          lockoutAlertEmails={lockoutAlertEmails}
          lockoutWebhookUrl={lockoutWebhookUrl}
          setLockoutAlertEmails={setLockoutAlertEmails}
          setLockoutWebhookUrl={setLockoutWebhookUrl}
        />
      </SecurityControlsAccordion>
    </ScrollArea>
  );
}
