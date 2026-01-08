
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldCheck } from 'lucide-react';

interface TwoFactorVerifyProps {
  email: string; // Used for context/resending email if needed (resend logic not implemented yet)
  method?: 'totp' | 'email'; // Hint if known, or generic
  onVerify: (code: string) => Promise<void>;
  onCancel?: () => void;
  error?: string | null;
  isLoading?: boolean;
}

export function TwoFactorVerify({ email, method, onVerify, onCancel, error, isLoading }: TwoFactorVerifyProps) {
  const [code, setCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length >= 6) {
      await onVerify(code);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enter the verification code from your {method === 'email' ? 'email' : 'authenticator app'}.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="2fa-code" className="sr-only">Verification Code</Label>
            <Input
              id="2fa-code"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').trim())}
              className="text-center text-2xl tracking-widest h-14"
              maxLength={8} // Allow backup codes (8 chars) too
              autoFocus
              autoComplete="one-time-code"
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Verification Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button type="submit" className="w-full h-10" disabled={isLoading || code.length < 6}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" className="w-full text-sm" onClick={onCancel}>
              Back to Login
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
