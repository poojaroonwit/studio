"use client";

import { BellRing, Link, MailWarning, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { EmailChipInput } from '@/components/ui/email-chip-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import type { SecurityControlItem } from './security-controls-tab-config';

export function SecurityControlsAccordion({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Accordion type="multiple" defaultValue={['security-controls']} className="w-full">
      <AccordionItem value="security-controls" className="border-b">
        <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <div className="text-left">
              <div className="font-semibold">Security Controls</div>
              <div className="text-xs text-muted-foreground font-normal">Configure application security and content protection settings</div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-4 pt-2">
          <div className="space-y-4">
            {children}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function SecurityControlSwitchRow({
  checked,
  disabled,
  item,
  onCheckedChange,
}: {
  checked: boolean;
  disabled: boolean;
  item: SecurityControlItem;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
      <div className="space-y-1">
        <Label htmlFor={item.id} className="text-base font-medium">
          {item.label}
        </Label>
        <p className="text-sm text-muted-foreground">
          {item.description}
          {item.note && (
            <>
              <br />
              <span className="text-xs italic">{item.note}</span>
            </>
          )}
        </p>
      </div>
      <Switch
        id={item.id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export function AccountLockoutAlertsSection({
  isSaving,
  lockoutAlertEmails,
  lockoutWebhookUrl,
  setLockoutAlertEmails,
  setLockoutWebhookUrl,
}: {
  isSaving: boolean;
  lockoutAlertEmails: string[];
  lockoutWebhookUrl: string;
  setLockoutAlertEmails: (value: string[]) => void;
  setLockoutWebhookUrl: (value: string) => void;
}) {
  return (
    <div className="pt-4 border-t">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BellRing className="h-5 w-5 text-primary" />
        Account Lockout Alerts
      </h3>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MailWarning className="h-4 w-4 text-muted-foreground" />
            Alert Emails
          </Label>
          <p className="text-sm text-muted-foreground mb-2">
            Administrators will be notified at these addresses when a user account is locked.
          </p>
          <EmailChipInput
            value={lockoutAlertEmails}
            onChange={setLockoutAlertEmails}
            placeholder="Add administrator email..."
          />
          <p className="text-xs text-muted-foreground italic">
            Type an email and press Enter, comma, or space to add.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Link className="h-4 w-4 text-muted-foreground" />
            Alert Webhook URL (Optional)
          </Label>
          <p className="text-sm text-muted-foreground mb-2">
            Send a POST request to this URL when a lockout occurs.
          </p>
          <Input
            value={lockoutWebhookUrl}
            onChange={(event) => setLockoutWebhookUrl(event.target.value)}
            placeholder="https://your-server.com/api/webhooks/lockout"
            className="font-mono text-sm"
            disabled={isSaving}
          />
        </div>
      </div>
    </div>
  );
}
