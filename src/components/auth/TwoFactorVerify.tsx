
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
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform hover:scale-105">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Verify your identity</CardTitle>
        <CardDescription className="text-base">
          We've sent a code to <span className="font-medium text-foreground">{email}</span>.
          Enter it below to continue.
        </CardDescription>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="relative group">
            <Label htmlFor="2fa-code" className="sr-only">Verification Code</Label>
            <Input
              id="2fa-code"
              placeholder="0 0 0 0 0 0"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').substring(0, 8))}
              className="text-center text-3xl tracking-[0.5em] font-mono h-16 border-2 focus:border-primary transition-all rounded-xl focus:ring-4 focus:ring-primary/10"
              autoFocus
              autoComplete="one-time-code"
              disabled={isLoading}
            />
          </div>

          {error && (
            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertTitle className="flex items-center">
                <ShieldCheck className="h-4 w-4 mr-2" />
                Invalid Code
              </AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-4">
          <Button
            type="submit"
            className="w-full h-12 text-lg font-semibold rounded-xl bg-primary hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
            disabled={isLoading || code.length < 6}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              'Verify & Continue'
            )}
          </Button>

          <div className="flex flex-col items-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?{' '}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => {/* Resend logic would go here */ }}
              >
                Resend code
              </button>
            </p>
            {onCancel && (
              <Button type="button" variant="ghost" className="w-full text-muted-foreground hover:text-foreground" onClick={onCancel}>
                Use a different email
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
