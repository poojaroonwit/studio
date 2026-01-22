"use client";

import React from 'react';
import { Building, ImageUp, X } from 'lucide-react';
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
import { toast } from 'react-hot-toast';

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

    const handleOrganizationLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500000) {
                toast.error('Logo file size exceeds 500KB');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setOrganizationLogoPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <ScrollArea className="h-full">
            <Accordion type="multiple" defaultValue={['organization']} className="w-full">
                {/* Organization Information (Moved from system-preferences) */}
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
                            {/* Organization Logo */}
                            <div className="space-y-4">
                                <Label>Organization Logo</Label>
                                <div className="flex items-center gap-4">
                                    {organizationLogoPreviewUrl && (
                                        <div className="relative">
                                            <img
                                                src={organizationLogoPreviewUrl}
                                                alt="Organization logo preview"
                                                className="h-20 w-auto object-contain rounded-md border p-2"
                                            />
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                className="absolute -top-2 -right-2 h-6 w-6"
                                                onClick={() => {
                                                    setOrganizationLogoPreviewUrl(null);
                                                    setSavedOrganizationLogoUrl(null);
                                                }}
                                                disabled={isSaving}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleOrganizationLogoChange}
                                            disabled={isSaving}
                                            className="hidden"
                                            id="organization-logo-upload"
                                        />
                                        <Label
                                            htmlFor="organization-logo-upload"
                                            className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                                        >
                                            <ImageUp className="mr-2 h-4 w-4" />
                                            {organizationLogoPreviewUrl ? 'Replace Logo' : 'Upload Logo'}
                                        </Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Recommended: PNG or SVG, max 500KB.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="organization-name">Organization Name</Label>
                                <Input
                                    id="organization-name"
                                    value={organizationName}
                                    onChange={(e) => setOrganizationName(e.target.value)}
                                    placeholder="Enter organization name"
                                    disabled={isSaving}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="organization-address">Organization Address</Label>
                                <Input
                                    id="organization-address"
                                    value={organizationAddress}
                                    onChange={(e) => setOrganizationAddress(e.target.value)}
                                    placeholder="Enter organization address"
                                    disabled={isSaving}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="organization-contact">Contact Information</Label>
                                <Input
                                    id="organization-contact"
                                    value={organizationContact}
                                    onChange={(e) => setOrganizationContact(e.target.value)}
                                    placeholder="Enter contact information"
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
