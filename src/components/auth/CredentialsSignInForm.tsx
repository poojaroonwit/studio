
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, KeyRound, Mail, Lock } from "lucide-react";
import { useClickProtection } from '@/hooks/use-click-protection';

const credentialsSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type CredentialsFormValues = z.infer<typeof credentialsSchema>;

export function CredentialsSignInForm({ 
  activeFontColor, 
  activeBgStart, 
  activeBgEnd,
  submitButtonClassName
}: { 
  activeFontColor?: string, 
  activeBgStart?: string, 
  activeBgEnd?: string,
  submitButtonClassName?: string
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { isActioning, handleProtectedAsyncClick } = useClickProtection({
    actionName: 'sign in',
    debounceMs: 200,
    timeoutMs: 500
  });

  // Clear error if user starts typing again
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
        setError("Invalid email or password. Please try again.");
      } else if (nextAuthError.toLowerCase().includes("invalid") || nextAuthError.toLowerCase().includes("password")) {
         setError("Invalid email or password. Please try again.");
      } else {
        // For custom errors thrown in authorize function if they get passed here
        // Or more generic OAuth errors if not handled specifically on the page
        setError(decodeURIComponent(nextAuthError));
      }
    }
  }, [searchParams]);

  const onSubmit = async (data: CredentialsFormValues) => {
    await handleProtectedAsyncClick(async () => {
      setIsLoading(true);
      setError(null); // Clear previous errors

      try {
        const result = await signIn('credentials', {
          redirect: false, // Handle redirect manually to show errors
          email: data.email,
          password: data.password,
          callbackUrl: searchParams?.get('callbackUrl') || '/', // Redirect to intended page or dashboard
        });

        if (result?.error) {
          // Error messages from NextAuth can be a bit generic or internal
          // Map common errors to user-friendly messages
          if (result.error === "CredentialsSignin" || result.error.toLowerCase().includes("invalid") || result.error.toLowerCase().includes("password")) {
            setError("Invalid email or password. Please try again.");
          } else {
            setError(result.error); // Or a generic message: "Login failed. Please try again."
          }
        } else if (result?.ok && result?.url) {
          router.push(result.url); // Navigate to callbackUrl on success
        } else if (result?.ok && !result?.url) {
           router.push('/'); // Fallback if URL is not provided but login is ok
        }
      } catch (e) {
        console.error("Sign in error:", e);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Display error from signIn attempt if not already handled by page error */}
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
            <FormItem>
              <FormLabel>Email</FormLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <FormControl>
                    <Input className="pl-10 h-[35px]" type="email" placeholder="user@example.com" {...field} onChange={(e) => { field.onChange(e); setError(null);}} />
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
            <FormItem>
              <FormLabel>Password</FormLabel>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <FormControl>
                    <Input className="pl-10 h-[35px]" type="password" placeholder="••••••••" {...field} onChange={(e) => { field.onChange(e); setError(null);}}/>
                  </FormControl>
                </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className={`w-full h-10 !rounded-[20px] [border-radius:20px!important] ${submitButtonClassName || ''}`}
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
              <KeyRound className="mr-2 h-4 w-4" /> Sign In with Credentials
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
