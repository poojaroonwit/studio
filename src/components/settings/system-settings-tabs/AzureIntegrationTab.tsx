"use client";

import React from 'react';
import { UploadCloud, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from 'react-hot-toast';

interface AzureIntegrationTabProps {
    azureAdClientId: string;
    setAzureAdClientId: (val: string) => void;
    azureAdClientSecret: string;
    setAzureAdClientSecret: (val: string) => void;
    azureAdTenantId: string;
    setAzureAdTenantId: (val: string) => void;
    azureMeetingRoomsEnabled: boolean;
    setAzureMeetingRoomsEnabled: (val: boolean) => void;
    showAzureSecret: boolean;
    setShowAzureSecret: (val: boolean) => void;
    testingAzureRooms: boolean;
    setTestingAzureRooms: (val: boolean) => void;
    isSaving: boolean;
}

export default function AzureIntegrationTab({
    azureAdClientId,
    setAzureAdClientId,
    azureAdClientSecret,
    setAzureAdClientSecret,
    azureAdTenantId,
    setAzureAdTenantId,
    azureMeetingRoomsEnabled,
    setAzureMeetingRoomsEnabled,
    showAzureSecret,
    setShowAzureSecret,
    testingAzureRooms,
    setTestingAzureRooms,
    isSaving,
}: AzureIntegrationTabProps) {

    const handleTestAzureConnection = async () => {
        setTestingAzureRooms(true);
        try {
            const response = await fetch('/api/azure/meeting-rooms?test=true');
            const result = await response.json();
            if (result.success) {
                toast.success(`Connection successful! Found ${result.roomCount} meeting rooms.`);
            } else {
                toast.error(result.error || 'Connection test failed');
            }
        } catch (error) {
            toast.error('Failed to test Azure connection');
        } finally {
            setTestingAzureRooms(false);
        }
    };

    return (
        <ScrollArea className="h-full">
            <Accordion type="multiple" defaultValue={['azure']} className="w-full">
                <AccordionItem value="azure" className="border-b">
                    <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                            <UploadCloud className="h-5 w-5 text-primary" />
                            <div className="text-left">
                                <div className="font-semibold">Azure Integration</div>
                                <div className="text-xs text-muted-foreground font-normal">Configure Azure AD integration settings</div>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Credentials</h4>
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="azure-ad-client-id">Client ID (Application ID)</Label>
                                        <Input
                                            id="azure-ad-client-id"
                                            value={azureAdClientId}
                                            onChange={(e) => setAzureAdClientId(e.target.value)}
                                            placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                                            disabled={isSaving}
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="azure-ad-client-secret">Client Secret</Label>
                                        <div className="relative">
                                            <Input
                                                id="azure-ad-client-secret"
                                                type={showAzureSecret ? "text" : "password"}
                                                value={azureAdClientSecret}
                                                onChange={(e) => setAzureAdClientSecret(e.target.value)}
                                                placeholder="Your Azure AD Client Secret"
                                                disabled={isSaving}
                                                className="font-mono text-sm pr-10"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowAzureSecret(!showAzureSecret)}
                                                disabled={isSaving}
                                            >
                                                {showAzureSecret ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="azure-ad-tenant-id">Tenant ID (Directory ID)</Label>
                                        <Input
                                            id="azure-ad-tenant-id"
                                            value={azureAdTenantId}
                                            onChange={(e) => setAzureAdTenantId(e.target.value)}
                                            placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                                            disabled={isSaving}
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="azure-meeting-rooms">Azure AD Meeting Rooms</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Fetch interview locations from Microsoft 365 meeting rooms. Requires Places.Read.All permission in Azure AD.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={!azureMeetingRoomsEnabled || testingAzureRooms || isSaving}
                                                onClick={handleTestAzureConnection}
                                            >
                                                {testingAzureRooms ? (
                                                    <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Testing...</>
                                                ) : 'Test'}
                                            </Button>
                                            <Switch
                                                id="azure-meeting-rooms"
                                                checked={azureMeetingRoomsEnabled}
                                                onCheckedChange={setAzureMeetingRoomsEnabled}
                                                disabled={isSaving}
                                            />
                                        </div>
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
