import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, AlertCircle, Lock } from 'lucide-react';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { UserProfile } from '@/lib/types';
import { UnifiedUserFormValues } from './types';

interface SecurityTabProps {
    form: UseFormReturn<UnifiedUserFormValues>;
    user?: UserProfile | null;
    canForcePasswordChange: boolean;
    show2FASetup: boolean;
    setShow2FASetup: (show: boolean) => void;
    isLoading: boolean;
    handleDisable2FA: () => Promise<void>;
}

export function SecurityTab({
    form,
    user,
    canForcePasswordChange,
    show2FASetup,
    setShow2FASetup,
    isLoading,
    handleDisable2FA
}: SecurityTabProps) {
    return (
        <div className="space-y-4 mt-0 focus-visible:ring-0 focus-visible:outline-none">
            {/* Two-Factor Auth Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Two-Factor Authentication
                    </CardTitle>
                    <CardDescription>
                        Add an extra layer of security to your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {user?.twoFactorEnabled ? (
                        <div className="flex items-center justify-between p-4 bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-green-900 dark:text-green-300">2FA is Enabled</h4>
                                    <p className="text-sm text-green-700 dark:text-green-400">
                                        Your account is protected with {user.twoFactorMethod === 'email' ? 'Email Verification' : 'Authenticator App'}.
                                    </p>
                                </div>
                            </div>
                            <Button variant="destructive" size="sm" onClick={handleDisable2FA} disabled={isLoading}>
                                Disable 2FA
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Not Configured</AlertTitle>
                                <AlertDescription>
                                    Two-factor authentication is not currently enabled for this account.
                                </AlertDescription>
                            </Alert>
                            <Button type="button" onClick={() => setShow2FASetup(true)}>
                                Set Up 2FA
                            </Button>
                        </div>
                    )}

                    {show2FASetup && (
                        <TwoFactorSetup
                            onComplete={() => {
                                setShow2FASetup(false);
                                window.location.reload();
                            }}
                            onCancel={() => setShow2FASetup(false)}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Password Management */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Lock className="h-4 w-4 text-primary" />
                        Password Management
                    </CardTitle>
                    <CardDescription>
                        Update password or force reset on next login
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Change Password Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="Enter new password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Confirm Password could be added here if schema supported it */}
                    </div>

                    {canForcePasswordChange && (
                        <FormField
                            control={form.control}
                            name="forcePasswordChange"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/20">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Force Password Change</FormLabel>
                                        <FormDescription>
                                            Require the user to change their password upon next sign-in.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
