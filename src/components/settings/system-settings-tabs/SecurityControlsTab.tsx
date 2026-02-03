"use client";

import React from 'react';
import { ShieldAlert, BellRing, MailWarning, Link } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { EmailChipInput } from '@/components/ui/email-chip-input';

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
    return (
        <ScrollArea className="h-full">
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
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                                <div className="space-y-1">
                                    <Label htmlFor="screen-capture-protection" className="text-base font-medium">
                                        Screen Capture Protection
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Enable watermark overlay and screenshot attempt logging. <br />
                                        <span className="text-xs italic">Note: Browser-based protection is limited. This adds a visual watermark and logs "PrintScreen" key events.</span>
                                    </p>
                                </div>
                                <Switch
                                    id="screen-capture-protection"
                                    checked={screenCaptureProtectionEnabled}
                                    onCheckedChange={setScreenCaptureProtectionEnabled}
                                    disabled={isSaving}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                                <div className="space-y-1">
                                    <Label htmlFor="right-click-protection" className="text-base font-medium">
                                        Right Click Protection
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Disable right-click context menu to prevent content copying.
                                    </p>
                                </div>
                                <Switch
                                    id="right-click-protection"
                                    checked={rightClickProtectionEnabled}
                                    onCheckedChange={setRightClickProtectionEnabled}
                                    disabled={isSaving}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                                <div className="space-y-1">
                                    <Label htmlFor="login-devtools-protection" className="text-base font-medium">
                                        Login Page Protection
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Disable right-click and DevTools shortcuts (F12, Ctrl+Shift+I) on the sign-in page.
                                    </p>
                                </div>
                                <Switch
                                    id="login-devtools-protection"
                                    checked={loginPageDevToolsProtectionEnabled}
                                    onCheckedChange={setLoginPageDevToolsProtectionEnabled}
                                    disabled={isSaving}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                                <div className="space-y-1">
                                    <Label htmlFor="global-2fa" className="text-base font-medium">
                                        Global Two-Factor Authentication
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Enforce 2FA for all users. Fallback to Email OTP if no method is configured.
                                    </p>
                                </div>
                                <Switch
                                    id="global-2fa"
                                    checked={globalTwoFactorEnabled}
                                    onCheckedChange={setGlobalTwoFactorEnabled}
                                    disabled={isSaving}
                                />
                            </div>

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
                                            onChange={(e) => setLockoutWebhookUrl(e.target.value)}
                                            placeholder="https://your-server.com/api/webhooks/lockout"
                                            className="font-mono text-sm"
                                            disabled={isSaving}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </ScrollArea>
    );
}
