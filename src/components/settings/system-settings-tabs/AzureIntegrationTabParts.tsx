import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import type { AzureIntegrationTabProps } from './azure-integration-tab-types';
import { isAzureMeetingRoomsTestDisabled } from './azure-integration-tab-utils';

type AzureCredentialsSectionProps = Pick<
    AzureIntegrationTabProps,
    | 'azureAdClientId'
    | 'setAzureAdClientId'
    | 'azureAdClientSecret'
    | 'setAzureAdClientSecret'
    | 'azureAdTenantId'
    | 'setAzureAdTenantId'
    | 'showAzureSecret'
    | 'setShowAzureSecret'
    | 'isSaving'
>;

type AzureMeetingRoomsSectionProps = Pick<
    AzureIntegrationTabProps,
    | 'azureMeetingRoomsEnabled'
    | 'setAzureMeetingRoomsEnabled'
    | 'testingAzureRooms'
    | 'isSaving'
> & {
    onTestAzureConnection: () => void;
};

export function AzureCredentialsSection({
    azureAdClientId,
    setAzureAdClientId,
    azureAdClientSecret,
    setAzureAdClientSecret,
    azureAdTenantId,
    setAzureAdTenantId,
    showAzureSecret,
    setShowAzureSecret,
    isSaving,
}: AzureCredentialsSectionProps) {
    return (
        <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Credentials</h4>
            <div className="grid gap-4">
                <div className="space-y-2">
                    <Label htmlFor="azure-ad-client-id">Client ID (Application ID)</Label>
                    <Input
                        id="azure-ad-client-id"
                        value={azureAdClientId}
                        onChange={(event) => setAzureAdClientId(event.target.value)}
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
                            onChange={(event) => setAzureAdClientSecret(event.target.value)}
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
                        onChange={(event) => setAzureAdTenantId(event.target.value)}
                        placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                        disabled={isSaving}
                        className="font-mono text-sm"
                    />
                </div>
            </div>
        </div>
    );
}

export function AzureMeetingRoomsSection({
    azureMeetingRoomsEnabled,
    setAzureMeetingRoomsEnabled,
    testingAzureRooms,
    isSaving,
    onTestAzureConnection,
}: AzureMeetingRoomsSectionProps) {
    return (
        <>
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
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isAzureMeetingRoomsTestDisabled({
                                azureMeetingRoomsEnabled,
                                testingAzureRooms,
                                isSaving,
                            })}
                            onClick={onTestAzureConnection}
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
        </>
    );
}
