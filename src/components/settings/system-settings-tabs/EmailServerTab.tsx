"use client";

import React from 'react';
import { Mail, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from 'react-hot-toast';

interface EmailServerTabProps {
    emailServiceEnabled: boolean;
    setEmailServiceEnabled: (val: boolean) => void;
    emailSmtpHost: string;
    setEmailSmtpHost: (val: string) => void;
    emailSmtpPort: number;
    setEmailSmtpPort: (val: number) => void;
    emailSmtpSecure: boolean;
    setEmailSmtpSecure: (val: boolean) => void;
    emailSmtpUser: string;
    setEmailSmtpUser: (val: string) => void;
    emailSmtpPassword: string;
    setEmailSmtpPassword: (val: string) => void;
    emailFromAddress: string;
    setEmailFromAddress: (val: string) => void;
    emailFromName: string;
    setEmailFromName: (val: string) => void;
    showSmtpPassword: boolean;
    setShowSmtpPassword: (val: boolean) => void;
    isSaving: boolean;
    testingEmail: boolean;
    setTestingEmail: (val: boolean) => void;
}

export default function EmailServerTab({
    emailServiceEnabled,
    setEmailServiceEnabled,
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
    testingEmail,
    setTestingEmail,
}: EmailServerTabProps) {

    const handleTestConnection = async () => {
        setTestingEmail(true);
        try {
            const response = await fetch('/api/settings/test-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    host: emailSmtpHost,
                    port: emailSmtpPort,
                    secure: emailSmtpSecure,
                    user: emailSmtpUser,
                    password: emailSmtpPassword,
                }),
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Email connection test successful!');
            } else {
                toast.error(data.error || 'Connection test failed');
            }
        } catch (error: any) {
            toast.error(error.message || 'Connection test failed');
        } finally {
            setTestingEmail(false);
        }
    };

    return (
        <ScrollArea className="h-full">
            <Accordion type="multiple" defaultValue={['email-service']} className="w-full">
                <AccordionItem value="email-service" className="border-b">
                    <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-primary" />
                            <div className="text-left">
                                <div className="font-semibold">Email Service</div>
                                <div className="text-xs text-muted-foreground font-normal">Configure SMTP settings for sending email notifications and calendar invitations.</div>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                                <div className="space-y-1">
                                    <Label htmlFor="email-service-enabled" className="text-base font-medium">
                                        Enable Email Service
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Enable or disable email sending functionality. When enabled, the system can send interview invitations and notifications.
                                    </p>
                                </div>
                                <Switch
                                    id="email-service-enabled"
                                    checked={emailServiceEnabled}
                                    onCheckedChange={setEmailServiceEnabled}
                                    disabled={isSaving}
                                />
                            </div>

                            {emailServiceEnabled && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="email-smtp-host">SMTP Host</Label>
                                        <Input
                                            id="email-smtp-host"
                                            type="text"
                                            placeholder="smtp.gmail.com"
                                            value={emailSmtpHost}
                                            onChange={(e) => setEmailSmtpHost(e.target.value)}
                                            disabled={isSaving}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            SMTP server hostname (e.g., smtp.gmail.com, smtp.office365.com)
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email-smtp-port">SMTP Port</Label>
                                        <Input
                                            id="email-smtp-port"
                                            type="number"
                                            min="1"
                                            max="65535"
                                            placeholder="587"
                                            value={emailSmtpPort}
                                            onChange={(e) => setEmailSmtpPort(parseInt(e.target.value) || 587)}
                                            disabled={isSaving}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            SMTP server port (587 for TLS, 465 for SSL, 25 for unencrypted)
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="space-y-1">
                                            <Label htmlFor="email-smtp-secure" className="text-base font-medium">
                                                Use Secure Connection (TLS/SSL)
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                Enable for TLS/SSL encrypted connections (recommended)
                                            </p>
                                        </div>
                                        <Switch
                                            id="email-smtp-secure"
                                            checked={emailSmtpSecure}
                                            onCheckedChange={setEmailSmtpSecure}
                                            disabled={isSaving}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email-smtp-user">SMTP Username</Label>
                                        <Input
                                            id="email-smtp-user"
                                            type="text"
                                            placeholder="your-email@example.com"
                                            value={emailSmtpUser}
                                            onChange={(e) => setEmailSmtpUser(e.target.value)}
                                            disabled={isSaving}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Username for SMTP authentication (usually your email address)
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email-smtp-password">SMTP Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="email-smtp-password"
                                                type={showSmtpPassword ? "text" : "password"}
                                                placeholder="your-password"
                                                value={emailSmtpPassword}
                                                onChange={(e) => setEmailSmtpPassword(e.target.value)}
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

                                    <div className="space-y-2">
                                        <Label htmlFor="email-from-address">From Email Address</Label>
                                        <Input
                                            id="email-from-address"
                                            type="email"
                                            placeholder="noreply@example.com"
                                            value={emailFromAddress}
                                            onChange={(e) => setEmailFromAddress(e.target.value)}
                                            disabled={isSaving}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Email address that will appear as the sender
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email-from-name">From Name</Label>
                                        <Input
                                            id="email-from-name"
                                            type="text"
                                            placeholder="Recruitment System"
                                            value={emailFromName}
                                            onChange={(e) => setEmailFromName(e.target.value)}
                                            disabled={isSaving}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Display name for the sender (optional)
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleTestConnection}
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
                                </>
                            )}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </ScrollArea>
    );
}
