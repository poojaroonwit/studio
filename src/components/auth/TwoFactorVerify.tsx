
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';

import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Loader2, ShieldCheck } from 'lucide-react';


interface TwoFactorVerifyProps {
  email: string; // Used for context/resending email if needed
  method?: 'totp' | 'email'; // Method determines UI messaging
  onVerify: (code: string) => Promise<void>;
  onCancel?: () => void;
  onResend?: () => Promise<void>; // Optional callback to resend email OTP
  error?: string | null;
  isLoading?: boolean;
}

export function TwoFactorVerify({ email, method, onVerify, onCancel, onResend, error, isLoading }: TwoFactorVerifyProps) {
  const [code, setCode] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length >= 6) {
      await onVerify(code);
    }
  };

  const handleResend = async () => {
    if (!onResend || isResending) return;
    setIsResending(true);
    setResendSuccess(false);
    try {
      await onResend();
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000); // Hide success message after 3s
    } catch (e) {
      console.error('Failed to resend code:', e);
    } finally {
      setIsResending(false);
    }
  };

  // Determine message based on method
  const isEmailMethod = method === 'email' || !method; // Default to email if not specified

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform hover:scale-105">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-xl font-bold">Verify identity</CardTitle>
        <CardDescription className="text-sm">
          {isEmailMethod ? (
            <>We've sent a code to <span className="font-medium text-foreground">{email}</span>. Enter it below to continue.</>
          ) : (
            <>Enter the 6-digit code from your <span className="font-medium text-foreground">authenticator app</span> to continue.</>
          )}
        </CardDescription>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="relative group">
            <Label htmlFor="2fa-code" className="sr-only">Verification Code</Label>
            <div className="flex justify-center my-6">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
                disabled={isLoading}
                autoFocus
                containerClassName="gap-3"
              >
                <InputOTPGroup className="gap-3">
                  <InputOTPSlot index={0} className="w-14 h-16 text-2xl font-bold shadow-sm" />
                  <InputOTPSlot index={1} className="w-14 h-16 text-2xl font-bold shadow-sm" />
                  <InputOTPSlot index={2} className="w-14 h-16 text-2xl font-bold shadow-sm" />
                  <InputOTPSlot index={3} className="w-14 h-16 text-2xl font-bold shadow-sm" />
                  <InputOTPSlot index={4} className="w-14 h-16 text-2xl font-bold shadow-sm" />
                  <InputOTPSlot index={5} className="w-14 h-16 text-2xl font-bold shadow-sm" />
                </InputOTPGroup>
              </InputOTP>
            </div>
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
            className="w-full h-10 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
            disabled={isLoading || code.length < 6}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              'Verify & Continue'
            )}
          </Button>

          <div className="flex flex-col items-center space-y-2">
            {/* Only show resend option for email method */}
            {isEmailMethod && (
              <p className="text-sm text-muted-foreground">
                {resendSuccess ? (
                  <span className="text-green-600 font-medium">Code sent! Check your email.</span>
                ) : (
                  <>
                    Didn't receive the code?{' '}
                    <button
                      type="button"
                      className="text-primary hover:underline font-medium disabled:opacity-50"
                      onClick={handleResend}
                      disabled={isResending || !onResend}
                    >
                      {isResending ? 'Sending...' : 'Resend code'}
                    </button>
                  </>
                )}
              </p>
            )}
            {onCancel && (
              <Button type="button" variant="ghost" className="w-full text-muted-foreground hover:text-foreground" onClick={onCancel}>
                {isEmailMethod ? 'Use a different email' : 'Cancel'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
