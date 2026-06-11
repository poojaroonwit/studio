"use client";

import type React from 'react';
import { CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { EmailServerTabProps } from './email-server-tab-types';
import { EmailTextField, SwitchRow } from './EmailServerFieldPrimitives';

type EmailServerFieldsProps = Omit<
  EmailServerTabProps,
  'emailServiceEnabled' | 'setEmailServiceEnabled' | 'setTestingEmail'
> & {
  onTestConnection: () => void;
};

export function EmailServerFields(props: EmailServerFieldsProps): React.ReactElement {
  const {
    emailSmtpHost,
    setEmailSmtpHost,
    emailSmtpPort,
    setEmailSmtpPort,
    emailSmtpSecure,
    setEmailSmtpSecure,
    emailSmtpUser,
    setEmailSmtpUser,
    emailSmtpPassword,
    setEmailSmtpPassword,
    emailFromAddress,
    setEmailFromAddress,
    emailFromName,
    setEmailFromName,
    showSmtpPassword,
    setShowSmtpPassword,
    isSaving,
  } = props;

  return (
    <>
      <EmailTextField
        id="email-smtp-host"
        label="SMTP Host"
        placeholder="smtp.gmail.com"
        value={emailSmtpHost}
        onChange={setEmailSmtpHost}
        disabled={isSaving}
        description="SMTP server hostname (e.g., smtp.gmail.com, smtp.office365.com)"
      />
      <SmtpPortField
        emailSmtpPort={emailSmtpPort}
        setEmailSmtpPort={setEmailSmtpPort}
        isSaving={isSaving}
      />
      <SwitchRow
        id="email-smtp-secure"
        label="Use Secure Connection (TLS/SSL)"
        description="Enable for TLS/SSL encrypted connections (recommended)"
        checked={emailSmtpSecure}
        onCheckedChange={setEmailSmtpSecure}
        disabled={isSaving}
      />
      <EmailTextField
        id="email-smtp-user"
        label="SMTP Username"
        placeholder="your-email@example.com"
        value={emailSmtpUser}
        onChange={setEmailSmtpUser}
        disabled={isSaving}
        description="Username for SMTP authentication (usually your email address)"
      />
      <SmtpPasswordField
        emailSmtpPassword={emailSmtpPassword}
        setEmailSmtpPassword={setEmailSmtpPassword}
        showSmtpPassword={showSmtpPassword}
        setShowSmtpPassword={setShowSmtpPassword}
        isSaving={isSaving}
      />
      <EmailTextField
        id="email-from-address"
        label="From Email Address"
        type="email"
        placeholder="noreply@example.com"
        value={emailFromAddress}
        onChange={setEmailFromAddress}
        disabled={isSaving}
        description="Email address that will appear as the sender"
      />
      <EmailTextField
        id="email-from-name"
        label="From Name"
        placeholder="Recruitment System"
        value={emailFromName}
        onChange={setEmailFromName}
        disabled={isSaving}
        description="Display name for the sender (optional)"
      />
      <TestConnectionButton {...props} />
    </>
  );
}

function SmtpPortField({
  emailSmtpPort,
  setEmailSmtpPort,
  isSaving,
}: Pick<EmailServerFieldsProps, 'emailSmtpPort' | 'setEmailSmtpPort' | 'isSaving'>): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label htmlFor="email-smtp-port">SMTP Port</Label>
      <Input
        id="email-smtp-port"
        type="number"
        min="1"
        max="65535"
        placeholder="587"
        value={emailSmtpPort}
        onChange={(event) => setEmailSmtpPort(parseInt(event.target.value) || 587)}
        disabled={isSaving}
      />
      <p className="text-xs text-muted-foreground">
        SMTP server port (587 for TLS, 465 for SSL, 25 for unencrypted)
      </p>
    </div>
  );
}

function SmtpPasswordField({
  emailSmtpPassword,
  setEmailSmtpPassword,
  showSmtpPassword,
  setShowSmtpPassword,
  isSaving,
}: Pick<
  EmailServerFieldsProps,
  'emailSmtpPassword' | 'setEmailSmtpPassword' | 'showSmtpPassword' | 'setShowSmtpPassword' | 'isSaving'
>): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label htmlFor="email-smtp-password">SMTP Password</Label>
      <div className="relative">
        <Input
          id="email-smtp-password"
          type={showSmtpPassword ? 'text' : 'password'}
          placeholder="your-password"
          value={emailSmtpPassword}
          onChange={(event) => setEmailSmtpPassword(event.target.value)}
          disabled={isSaving}
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
          disabled={isSaving}
        >
          {showSmtpPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Password or app-specific password for SMTP authentication
      </p>
    </div>
  );
}

function TestConnectionButton({
  isSaving,
  testingEmail,
  emailSmtpHost,
  emailSmtpUser,
  onTestConnection,
}: Pick<
  EmailServerFieldsProps,
  'isSaving' | 'testingEmail' | 'emailSmtpHost' | 'emailSmtpUser' | 'onTestConnection'
>): React.ReactElement {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Button
        type="button"
        variant="outline"
        onClick={onTestConnection}
        disabled={isSaving || testingEmail || !emailSmtpHost || !emailSmtpUser}
      >
        {testingEmail ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Testing...
          </>
        ) : (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Test Connection
          </>
        )}
      </Button>
    </div>
  );
}
