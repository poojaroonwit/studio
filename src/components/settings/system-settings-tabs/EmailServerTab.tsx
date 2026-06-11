"use client";

import React from 'react';
import { toast } from 'react-hot-toast';

import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

import {
    EmailServerFields,
    EmailServiceAccordionTitle,
    SwitchRow
} from './EmailServerTabParts';
import { testEmailConnection } from './email-server-test-utils';
import type { EmailServerTabProps } from './email-server-tab-types';

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
            const data = await testEmailConnection({
                host: emailSmtpHost,
                port: emailSmtpPort,
                secure: emailSmtpSecure,
                user: emailSmtpUser,
                password: emailSmtpPassword,
            });

            if (data.success) {
                toast.success('Email connection test successful!');
            } else {
                toast.error(data.error || 'Connection test failed');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Connection test failed');
        } finally {
            setTestingEmail(false);
        }
    };

    return (
        <ScrollArea className="h-full">
            <Accordion type="multiple" defaultValue={['email-service']} className="w-full">
                <AccordionItem value="email-service" className="border-b">
                    <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <EmailServiceAccordionTitle />
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-4">
                            <SwitchRow
                                id="email-service-enabled"
                                label="Enable Email Service"
                                description="Enable or disable email sending functionality. When enabled, the system can send interview invitations and notifications."
                                checked={emailServiceEnabled}
                                onCheckedChange={setEmailServiceEnabled}
                                disabled={isSaving}
                                muted
                            />

                            {emailServiceEnabled && (
                                <EmailServerFields
                                    emailSmtpHost={emailSmtpHost}
                                    setEmailSmtpHost={setEmailSmtpHost}
                                    emailSmtpPort={emailSmtpPort}
                                    setEmailSmtpPort={setEmailSmtpPort}
                                    emailSmtpSecure={emailSmtpSecure}
                                    setEmailSmtpSecure={setEmailSmtpSecure}
                                    emailSmtpUser={emailSmtpUser}
                                    setEmailSmtpUser={setEmailSmtpUser}
                                    emailSmtpPassword={emailSmtpPassword}
                                    setEmailSmtpPassword={setEmailSmtpPassword}
                                    emailFromAddress={emailFromAddress}
                                    setEmailFromAddress={setEmailFromAddress}
                                    emailFromName={emailFromName}
                                    setEmailFromName={setEmailFromName}
                                    showSmtpPassword={showSmtpPassword}
                                    setShowSmtpPassword={setShowSmtpPassword}
                                    isSaving={isSaving}
                                    testingEmail={testingEmail}
                                    onTestConnection={handleTestConnection}
                                />
                            )}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </ScrollArea>
    );
}
