"use client";

import { Building } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    OrganizationInfoFields,
    OrganizationLogoField,
} from './OrganizationTabParts';

interface OrganizationTabProps {
    organizationName: string;
    setOrganizationName: (val: string) => void;
    organizationAddress: string;
    setOrganizationAddress: (val: string) => void;
    organizationContact: string;
    setOrganizationContact: (val: string) => void;
    organizationLogoPreviewUrl: string | null;
    setOrganizationLogoPreviewUrl: (val: string | null) => void;
    setSavedOrganizationLogoUrl: (val: string | null) => void;
    isSaving: boolean;
}

export default function OrganizationTab({
    organizationName,
    setOrganizationName,
    organizationAddress,
    setOrganizationAddress,
    organizationContact,
    setOrganizationContact,
    organizationLogoPreviewUrl,
    setOrganizationLogoPreviewUrl,
    setSavedOrganizationLogoUrl,
    isSaving,
}: OrganizationTabProps) {
    return (
        <ScrollArea className="h-full">
            <Accordion type="multiple" defaultValue={['organization']} className="w-full">
                <AccordionItem value="organization" className="border-b">
                    <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                            <Building className="h-5 w-5 text-primary" />
                            <div className="text-left">
                                <div className="font-semibold">Organization Information</div>
                                <div className="text-xs text-muted-foreground font-normal">Configure organization details that appear on evaluation reports and documents</div>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-6">
                            <OrganizationLogoField
                                isSaving={isSaving}
                                organizationLogoPreviewUrl={organizationLogoPreviewUrl}
                                setOrganizationLogoPreviewUrl={setOrganizationLogoPreviewUrl}
                                setSavedOrganizationLogoUrl={setSavedOrganizationLogoUrl}
                            />
                            <OrganizationInfoFields
                                isSaving={isSaving}
                                organizationAddress={organizationAddress}
                                organizationContact={organizationContact}
                                organizationName={organizationName}
                                setOrganizationAddress={setOrganizationAddress}
                                setOrganizationContact={setOrganizationContact}
                                setOrganizationName={setOrganizationName}
                            />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </ScrollArea>
    );
}
