"use client";

import React from 'react';
import { Settings } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { FeatureFlagSettingList, type FeatureFlagSetting } from './FeatureFlagsTabParts';

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
    const featureSettings: FeatureFlagSetting[] = [
        {
            id: 'job-match-feature',
            title: 'Job Match Feature',
            description: 'Enable or disable the job match functionality. When disabled, all job match related UI components will be hidden.',
            checked: jobMatchFeatureEnabled,
            onCheckedChange: setJobMatchFeatureEnabled,
            disabled: isSaving,
        },
        {
            id: 'export-import-feature',
            title: 'Export/Import Feature',
            description: 'Enable or disable the data export and import functionality.',
            checked: exportImportFeatureEnabled,
            onCheckedChange: setExportImportFeatureEnabled,
            disabled: isSaving,
        },
        {
            id: 'hiring-manager-restrict',
            title: 'Hiring Manager Access Control',
            description: 'When enabled, hiring managers can only see positions and Applicants for positions where they are assigned as interviewers. When disabled, hiring managers can see all positions and Applicants.',
            checked: hiringManagerRestrictToAssignedPositions,
            onCheckedChange: setHiringManagerRestrictToAssignedPositions,
            disabled: isSaving,
        },
        {
            id: 'interview-invitation-feature',
            title: 'Interview Invitation Feature',
            description: 'Enable or disable the interview invitation feature. When disabled, the "Send Interviewer Invitation" button will be hidden.',
            checked: interviewInvitationFeatureEnabled,
            onCheckedChange: setInterviewInvitationFeatureEnabled,
            disabled: isSaving,
        },
    ];

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
                        <FeatureFlagSettingList settings={featureSettings} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </ScrollArea>
    );
}
