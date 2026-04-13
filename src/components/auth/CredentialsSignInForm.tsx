"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Eye, EyeOff, KeyRound, Mail, Lock } from "lucide-react";
import { useClickProtection } from '@/hooks/use-click-protection';
import { TwoFactorVerify } from './TwoFactorVerify';
import { signInWithCredentials } from '@/lib/actions/auth';

const credentialsSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().optional(),
});

type CredentialsFormValues = z.infer<typeof credentialsSchema>;

export function CredentialsSignInForm({
  activeFontColor,
  activeBgStart,
  activeBgEnd,
  submitButtonClassName,
  onStageChange
}: {
  activeFontColor?: string,
  activeBgStart?: string,
  activeBgEnd?: string,
  submitButtonClassName?: string,
  onStageChange?: (stage: 'email' | 'otp') => void
}) {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'totp' | 'email' | undefined>();
  const [credentials, setCredentials] = useState<CredentialsFormValues | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { isActioning, handleProtectedAsyncClick } = useClickProtection({
    actionName: 'sign in',
    debounceMs: 200,
    timeoutMs: 500
  });

  const form = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    const nextAuthError = searchParams?.get('error');
    if (nextAuthError) {
      if (nextAuthError === "CredentialsSignin") {
        setError("Invalid email or verification code. Please try again.");
      } else if (nextAuthError.toLowerCase().includes("invalid") || nextAuthError.toLowerCase().includes("code")) {
        setError("Invalid email or verification code. Please try again.");
      } else {
        setError(decodeURIComponent(nextAuthError));
      }
    }
  }, [searchParams]);

  const onSubmit = async (data: CredentialsFormValues, twoFactorCode?: string) => {
    await handleProtectedAsyncClick(async () => {
      setIsLoading(true);
      setError(null);
      if (!twoFactorCode) setCredentials(data);

      if (twoFactorCode) {
        window.dispatchEvent(new Event('showSplashScreen'));
      }

      try {
        const formData = new FormData();
        formData.append('email', data.email);
        formData.append('password', data.password || '');
        formData.append('twoFactorCode', twoFactorCode || '');
        formData.append('redirectTo', searchParams?.get('callbackUrl') || '/');

        const result = await signInWithCredentials(formData);

        if (result?.error) {
          if (twoFactorCode) {
            window.dispatchEvent(new Event('hideSplashScreen'));
          }

          if (result.error.startsWith('TWO_FACTOR_REQUIRED:')) {
            const method = result.error.split(':')[1] as 'totp' | 'email';
            setTwoFactorMethod(method);
            setShow2FA(true);
            return;
          }

          const errorValue = result.error;
          const errorLower = errorValue.toLowerCase();

          if (errorLower.includes("disabled") || errorValue === "ACCOUNT_DISABLED") {
            setError("This account has been disabled. Please contact an administrator.");
          } else if (
            errorLower.includes("locked") ||
            errorValue === "ACCOUNT_LOCKED" ||
            errorLower.includes("account is locked") ||
            errorLower.includes("account has been locked") ||
            errorLower.includes("blocked")
          ) {
            setError("Account has been locked due to multiple failed login attempts. Please contact an administrator.");
          } else if (
            errorValue === "CredentialsSignin" ||
            errorValue === "Configuration" ||
            errorValue === "CallbackRouteError" ||
            errorLower.includes("invalid") ||
            errorLower.includes("code")
          ) {
            setError("Invalid email or verification code. Please try again.");
          } else {
            console.error("Login error:", errorValue);
            setError("Login failed. Please try again.");
          }
        }
      } catch (e) {
        if ((e as any).digest?.startsWith('NEXT_REDIRECT')) {
          let callbackUrl = searchParams?.get('callbackUrl') || '/';
          if (callbackUrl.includes('/auth/signin')) {
            callbackUrl = '/';
          }
          window.location.href = callbackUrl;
          return;
        }

        console.error("Sign in error:", e);
        setError("An unexpected error occurred. Please try again.");
        if (twoFactorCode) {
          window.dispatchEvent(new Event('hideSplashScreen'));
        }
      } finally {
        setIsLoading(false);
      }
    });
  };

  const onVerify2FA = async (code: string) => {
    if (credentials) {
      await onSubmit(credentials, code);
    }
  };

  useEffect(() => {
    if (show2FA) {
      onStageChange?.('otp');
    } else {
      onStageChange?.('email');
    }
  }, [show2FA, onStageChange]);

  if (show2FA && credentials) {
    const handleResendCode = async () => {
      const res = await fetch('/api/auth/2fa/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: credentials.email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to resend code');
      }
    };

    return (
      <TwoFactorVerify
        email={credentials.email}
        method={twoFactorMethod}
        onVerify={onVerify2FA}
        onCancel={() => { setShow2FA(false); }}
        onResend={twoFactorMethod === 'email' ? handleResendCode : undefined}
        error={error}
        isLoading={isLoading}
      />
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => onSubmit(data))} className="space-y-5">
        {error && !searchParams?.get('error') && (
          <Alert variant="destructive" className="mt-0 mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Login Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-sm font-medium text-foreground/80">Email</FormLabel>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input
                    className="h-12 rounded-2xl border-border/60 bg-background/80 pl-11 shadow-sm transition-all hover:bg-background focus:border-primary/40 focus:bg-background"
                    type="email"
                    placeholder="name@example.com"
                    {...field}
                    onChange={(e) => { field.onChange(e); setError(null); }}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-sm font-medium text-foreground/80">Password</FormLabel>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input
                    className="h-12 rounded-2xl border-border/60 bg-background/80 pl-11 pr-12 shadow-sm transition-all hover:bg-background focus:border-primary/40 focus:bg-background"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    {...field}
                    onChange={(e) => { field.onChange(e); setError(null); }}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className={`w-full h-12 rounded-2xl shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99] ${submitButtonClassName || ''}`}
          style={{
            background: activeBgStart && activeBgEnd ? `linear-gradient(90deg, hsl(${activeBgStart}), hsl(${activeBgEnd}))` : undefined,
            color: activeFontColor || undefined,
            border: 'none',
            boxShadow: activeBgStart ? `0 8px 32px 0 hsla(${activeBgStart}, 0.35), 0 4px 16px 0 hsla(${activeBgStart}, 0.25)` : undefined,
          }}
          disabled={isLoading || isActioning}
        >
          {(isLoading || isActioning) ? (
            <div className="animate-spin rounded-md h-5 w-5 border-b-2 border-primary-foreground"></div>
          ) : (
            <>
              <KeyRound className="mr-2 h-4 w-4" /> Sign in
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
