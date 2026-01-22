import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Building2, Shield, RefreshCw, Loader2 } from 'lucide-react';
import { TeamSelector } from './TeamSelector';
import { UnifiedUserFormValues } from './types';
import { UserGroup } from '@/lib/types';

interface UserManagementFormProps {
    form: UseFormReturn<UnifiedUserFormValues>;
    userGroups: UserGroup[];
    isLoadingGroups: boolean;
    canManageUsers: boolean;
    isEditingSelf: boolean;
    canManageTeams: boolean;
    userTeams: { id: string, name: string }[];
    canManageAuthentication: boolean;
    isLookingUpAD: boolean;
    handleLookupAzureAD: () => Promise<void>;
}

export function UserManagementForm({
    form,
    userGroups,
    isLoadingGroups,
    canManageUsers,
    isEditingSelf,
    canManageTeams,
    userTeams,
    canManageAuthentication,
    isLookingUpAD,
    handleLookupAzureAD
}: UserManagementFormProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Role & Permissions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="h-4 w-4 text-primary" />
                        Role & Groups
                    </CardTitle>
                    <CardDescription>
                        Manage user access levels and group assignments
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>System Role</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    disabled={!canManageUsers || isEditingSelf}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Admin">Admin</SelectItem>
                                        <SelectItem value="Recruiter">Recruiter</SelectItem>
                                        <SelectItem value="Hiring Manager">Hiring Manager</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                {isEditingSelf && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        You cannot change your own role.
                                    </p>
                                )}
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="userGroupIds"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>User Group</FormLabel>
                                <Select
                                    onValueChange={(val) => field.onChange([val])}
                                    value={field.value?.[0] || ''}
                                    disabled={!canManageUsers || isLoadingGroups}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={isLoadingGroups ? "Loading groups..." : "Select User Group"} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {userGroups.map((group) => (
                                            <SelectItem key={group.id} value={group.id}>
                                                {group.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Separator />

                    <div className="space-y-3">
                        <Label>Team Assignments</Label>
                        {canManageTeams ? (
                            <TeamSelector
                                teams={userTeams}
                                selectedIds={form.watch('userTeamIds') || []}
                                onSelect={(ids) => form.setValue('userTeamIds', ids, { shouldDirty: true })}
                            />
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {userTeams.filter(t => form.watch('userTeamIds')?.includes(t.id)).map(team => (
                                    <Badge key={team.id} variant="secondary">
                                        {team.name}
                                    </Badge>
                                ))}
                                {(form.watch('userTeamIds') || []).length === 0 && (
                                    <span className="text-sm text-muted-foreground italic">No teams assigned</span>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Authentication Methods */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Shield className="h-4 w-4 text-primary" />
                        Authentication
                    </CardTitle>
                    <CardDescription>
                        Configure how this user logs in
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                        control={form.control}
                        name="authenticationMethods"
                        render={() => (
                            <FormItem>
                                <div className="mb-4">
                                    <FormLabel className="text-base">Allowed Methods</FormLabel>
                                    <FormDescription>
                                        Select the methods this user can use to sign in.
                                    </FormDescription>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <FormField
                                        control={form.control}
                                        name="authenticationMethods"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50 transition-colors">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes('basic')}
                                                        disabled={!canManageAuthentication}
                                                        onCheckedChange={(checked) => {
                                                            const current = field.value || [];
                                                            return checked
                                                                ? field.onChange([...current, 'basic'])
                                                                : field.onChange(current.filter(v => v !== 'basic'));
                                                        }}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>
                                                        Basic Authentication
                                                    </FormLabel>
                                                    <FormDescription>
                                                        Standard email and password login
                                                    </FormDescription>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="authenticationMethods"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50 transition-colors">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes('azure_ad')}
                                                        disabled={!canManageAuthentication}
                                                        onCheckedChange={(checked) => {
                                                            const current = field.value || [];
                                                            return checked
                                                                ? field.onChange([...current, 'azure_ad'])
                                                                : field.onChange(current.filter(v => v !== 'azure_ad'));
                                                        }}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>
                                                        Azure Active Directory
                                                    </FormLabel>
                                                    <FormDescription>
                                                        Microsoft SSO login (Requires configuration)
                                                    </FormDescription>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={handleLookupAzureAD}
                            disabled={isLookingUpAD}
                        >
                            {isLookingUpAD ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Sync with Azure AD
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
