
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, ShieldCheck, Mail, QrCode, X } from 'lucide-react';
import Image from 'next/image';

interface TwoFactorSetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps) {
  const [method, setMethod] = useState<'totp' | 'email'>('totp');
  const [step, setStep] = useState<'method' | 'setup' | 'verify' | 'success'>('method');
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const initiateSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Setup failed');

      if (method === 'totp') {
        setQrCodeUrl(data.qrCodeUrl);
        setSecret(data.secret);
        setStep('setup');
      } else {
        setStep('verify'); // Email sent immediately
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setBackupCodes(data.backupCodes || []);
      setStep('success');
      if (onComplete) onComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'method') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup defaultValue="totp" onValueChange={(v) => setMethod(v as 'totp' | 'email')}>
            <div className="flex items-center space-x-4 rounded-md border p-4">
              <RadioGroupItem value="totp" id="totp" />
              <Label htmlFor="totp" className="flex flex-1 items-center cursor-pointer">
                <QrCode className="mr-3 h-5 w-5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Authenticator App</p>
                  <p className="text-xs text-muted-foreground">
                    Use Google Authenticator, Microsoft Authenticator, etc.
                  </p>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-4 rounded-md border p-4">
              <RadioGroupItem value="email" id="email" />
              <Label htmlFor="email" className="flex flex-1 items-center cursor-pointer">
                <Mail className="mr-3 h-5 w-5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Email</p>
                  <p className="text-xs text-muted-foreground">
                    Receive verification codes via email.
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={initiateSetup} disabled={loading} className={onCancel ? '' : 'w-full'}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === 'setup' && method === 'totp') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>
            Open your authenticator app and scan the QR code below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {qrCodeUrl && (
            <div className="border p-2 rounded-lg bg-white">
              <Image src={qrCodeUrl} alt="2FA QR Code" width={200} height={200} />
            </div>
          )}
          <div className="text-center text-sm">
            <p className="text-muted-foreground mb-1">Unable to scan?</p>
            <code className="bg-muted px-2 py-1 rounded select-all">{secret}</code>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => setStep('method')}>Back</Button>
          <Button onClick={() => setStep('verify')}>Next</Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === 'verify') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verify Code</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your {method === 'totp' ? 'authenticator app' : 'email'} to confirm setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              placeholder="123456"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-lg tracking-widest"
              maxLength={6}
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => setStep(method === 'totp' ? 'setup' : 'method')}>Back</Button>
          <Button onClick={verifyCode} disabled={loading || verificationCode.length !== 6}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === 'success') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <CardTitle>2FA Enabled</CardTitle>
          </div>
          <CardDescription>
            Two-factor authentication is now active on your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Backup Codes</AlertTitle>
            <AlertDescription>
              Save these backup codes in a secure place. You can use them to log in if you lose access to your device.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-2 gap-2 bg-muted p-4 rounded-md">
            {backupCodes.map((code, index) => (
              <code key={index} className="text-sm font-mono text-center select-all">{code}</code>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={onComplete}>Done</Button>
        </CardFooter>
      </Card>
    );
  }

  return null;
}
