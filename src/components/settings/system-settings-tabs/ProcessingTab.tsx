"use client";

import React from 'react';
import { Database, Zap, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'react-hot-toast';

interface ProcessingTabProps {
    maxConcurrentProcessors: number;
    setMaxConcurrentProcessors: (val: number) => void;
    resumeProcessingWebhookUrl: string;
    setResumeProcessingWebhookUrl: (val: string) => void;
    resumeProcessingWebhookToken: string;
    setResumeProcessingWebhookToken: (val: string) => void;
    resumeProcessingWebhookResponseMode: string;
    setResumeProcessingWebhookResponseMode: (val: string) => void;
    resumeProcessingWebhookTimeout: number;
    setResumeProcessingWebhookTimeout: (val: number) => void;
    showWebhookToken: boolean;
    setShowWebhookToken: (val: boolean) => void;
    isSaving: boolean;
}

export default function ProcessingTab({
    maxConcurrentProcessors,
    setMaxConcurrentProcessors,
    resumeProcessingWebhookUrl,
    setResumeProcessingWebhookUrl,
    resumeProcessingWebhookToken,
    setResumeProcessingWebhookToken,
    resumeProcessingWebhookResponseMode,
    setResumeProcessingWebhookResponseMode,
    resumeProcessingWebhookTimeout,
    setResumeProcessingWebhookTimeout,
    showWebhookToken,
    setShowWebhookToken,
    isSaving,
}: ProcessingTabProps) {

    const handleTestWebhook = async () => {
        if (!resumeProcessingWebhookUrl) {
            toast.error('Please enter a webhook URL first');
            return;
        }
        try {
            const response = await fetch('/api/settings/webhook-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    webhookUrl: resumeProcessingWebhookUrl,
                    webhookToken: resumeProcessingWebhookToken
                })
            });
            const result = await response.json();
            if (result.success) {
                toast.success(`Webhook test successful! Response time: ${result.responseTime}`);
            } else {
                toast.error(`Webhook test failed: ${result.error}`);
            }
        } catch (error) {
            toast.error('Failed to test webhook');
        }
    };

    return (
        <ScrollArea className="h-full">
            <Accordion type="multiple" defaultValue={['processing-config', 'webhook']} className="w-full">
                {/* System Configuration */}
                <AccordionItem value="processing-config" className="border-b">
                    <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-primary" />
                            <div className="text-left">
                                <div className="font-semibold">Processing Configuration</div>
                                <div className="text-xs text-muted-foreground font-normal">Configure system performance and processing settings</div>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="max-concurrent-processors">Max Concurrent Processors</Label>
                            <Input
                                id="max-concurrent-processors"
                                type="number"
                                min={1}
                                max={100}
                                value={maxConcurrentProcessors}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxConcurrentProcessors(Number(e.target.value))}
                                className="w-32"
                                disabled={isSaving}
                            />
                            <p className="text-xs text-muted-foreground">
                                Maximum number of concurrent resume processing jobs
                            </p>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Resume Processing Webhook */}
                <AccordionItem value="webhook" className="border-b">
                    <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            <div className="text-left">
                                <div className="font-semibold">PDF Processing Webhook</div>
                                <div className="text-xs text-muted-foreground font-normal">Configure webhook for all PDF processing including resume uploads and automated Applicant creation</div>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="resume-processing-webhook">Webhook URL</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="resume-processing-webhook"
                                        type="url"
                                        placeholder="https://your-webhook-endpoint/receive-resume"
                                        value={resumeProcessingWebhookUrl}
                                        onChange={(e) => setResumeProcessingWebhookUrl(e.target.value)}
                                        className="flex-1"
                                        disabled={isSaving}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleTestWebhook}
                                        disabled={isSaving || !resumeProcessingWebhookUrl}
                                    >
                                        Test
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    This URL will receive a POST request with the uploaded resume file (as FormData). You can use any compatible webhook service (Zapier, Make, custom API, etc.). This webhook is used for all PDF processing including resume uploads and the "Create via Resume (Automated)" feature.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="resume-processing-webhook-token">Authentication Token (Optional)</Label>
                                <div className="relative">
                                    <Input
                                        id="resume-processing-webhook-token"
                                        type={showWebhookToken ? "text" : "password"}
                                        placeholder="Bearer token for webhook authentication"
                                        value={resumeProcessingWebhookToken}
                                        onChange={(e) => setResumeProcessingWebhookToken(e.target.value)}
                                        disabled={isSaving}
                                        className="pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowWebhookToken(!showWebhookToken)}
                                        disabled={isSaving}
                                    >
                                        {showWebhookToken ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Optional Bearer token for webhook authentication. Leave empty if no authentication is required.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="resume-processing-webhook-response-mode">Response Mode</Label>
                                <Select value={resumeProcessingWebhookResponseMode} onValueChange={(value) => setResumeProcessingWebhookResponseMode(value)} disabled={isSaving}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select response mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="blocking">Blocking (waits for completion, max 100s)</SelectItem>
                                        <SelectItem value="streaming">Streaming (real-time updates)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Blocking mode waits for the workflow to complete before returning. Streaming mode provides real-time updates. Note: Cloudflare has a 100-second timeout limit for blocking requests.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="resume-processing-webhook-timeout">Webhook Timeout (seconds)</Label>
                                <Input
                                    id="resume-processing-webhook-timeout"
                                    type="number"
                                    placeholder="1800"
                                    value={resumeProcessingWebhookTimeout}
                                    onChange={(e) => setResumeProcessingWebhookTimeout(parseInt(e.target.value) || 1800)}
                                    disabled={isSaving}
                                    min="30"
                                    max="36000"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Timeout for webhook requests in seconds. Default is 1800 seconds (30 minutes). Minimum 30 seconds, maximum 36000 seconds (10 hours).
                                </p>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </ScrollArea>
    );
}
