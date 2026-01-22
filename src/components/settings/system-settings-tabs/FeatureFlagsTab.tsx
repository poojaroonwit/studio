"use client";

import React from 'react';
import { Settings } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

interface FeatureFlagsTabProps {
    jobMatchFeatureEnabled: boolean;
    setJobMatchFeatureEnabled: (val: boolean) => void;
    exportImportFeatureEnabled: boolean;
    setExportImportFeatureEnabled: (val: boolean) => void;
    hiringManagerRestrictToAssignedPositions: boolean;
    setHiringManagerRestrictToAssignedPositions: (val: boolean) => void;
    interviewInvitationFeatureEnabled: boolean;
    setInterviewInvitationFeatureEnabled: (val: boolean) => void;
    isSaving: boolean;
}

export default function FeatureFlagsTab({
    jobMatchFeatureEnabled,
    setJobMatchFeatureEnabled,
    exportImportFeatureEnabled,
    setExportImportFeatureEnabled,
    hiringManagerRestrictToAssignedPositions,
    setHiringManagerRestrictToAssignedPositions,
    interviewInvitationFeatureEnabled,
    setInterviewInvitationFeatureEnabled,
    isSaving,
}: FeatureFlagsTabProps) {
    return (
        <ScrollArea className="h-full">
            <Accordion type="multiple" defaultValue={['features']} className="w-full">
                <AccordionItem value="features" className="border-b">
                    <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-primary" />
                            <div className="text-left">
                                <div className="font-semibold">Feature Configuration</div>
                                <div className="text-xs text-muted-foreground font-normal">Enable or disable system features</div>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="job-match-feature">Job Match Feature</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Enable or disable the job match functionality. When disabled, all job match related UI components will be hidden.
                                    </p>
                                </div>
                                <Switch
                                    id="job-match-feature"
                                    checked={jobMatchFeatureEnabled}
                                    onCheckedChange={setJobMatchFeatureEnabled}
                                    disabled={isSaving}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="export-import-feature">Export/Import Feature</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Enable or disable the data export and import functionality.
                                    </p>
                                </div>
                                <Switch
                                    id="export-import-feature"
                                    checked={exportImportFeatureEnabled}
                                    onCheckedChange={setExportImportFeatureEnabled}
                                    disabled={isSaving}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="hiring-manager-restrict">Hiring Manager Access Control</Label>
                                    <p className="text-sm text-muted-foreground">
                                        When enabled, hiring managers can only see positions and candidates for positions where they are assigned as interviewers. When disabled, hiring managers can see all positions and candidates.
                                    </p>
                                </div>
                                <Switch
                                    id="hiring-manager-restrict"
                                    checked={hiringManagerRestrictToAssignedPositions}
                                    onCheckedChange={setHiringManagerRestrictToAssignedPositions}
                                    disabled={isSaving}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="interview-invitation-feature">Interview Invitation Feature</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Enable or disable the interview invitation feature. When disabled, the "Send Interviewer Invitation" button will be hidden.
                                    </p>
                                </div>
                                <Switch
                                    id="interview-invitation-feature"
                                    checked={interviewInvitationFeatureEnabled}
                                    onCheckedChange={setInterviewInvitationFeatureEnabled}
                                    disabled={isSaving}
                                />
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </ScrollArea>
    );
}
