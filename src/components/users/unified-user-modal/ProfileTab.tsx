import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import { Separator } from '@/components/ui/separator';
import {
    Building2, Building, Briefcase, MapPin, BadgeInfo, Mail, Phone, Calendar
} from 'lucide-react';
import { PersonalColorPicker } from '@/components/settings/PersonalColorPicker';
import { CustomFieldEdit } from '@/components/candidates/CustomFieldEdit';
import { UserProfile } from '@/lib/types';
import { UnifiedUserFormValues } from './types';

interface ProfileTabProps {
    form: UseFormReturn<UnifiedUserFormValues>;
    user?: UserProfile | null;
    customFields: { [key: string]: any };
    customFieldDefinitions: any[];
    onCustomFieldChange: (fieldCode: string, value: any) => void;
}

export function ProfileTab({
    form,
    user,
    customFields,
    customFieldDefinitions,
    onCustomFieldChange
}: ProfileTabProps) {
    return (
        <div className="space-y-6 mt-0 focus-visible:ring-0 focus-visible:outline-none">
            {/* Organization Details */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Organization Details
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                        <span>Synced from Azure AD</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1">Read Only</Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-card border rounded-xl p-5 shadow-sm">
                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5" /> Department
                        </Label>
                        <div className="font-medium p-3 bg-muted/30 rounded-lg border border-transparent">
                            {user?.department || <span className="text-muted-foreground font-normal italic">Not specified</span>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5" /> Job Title
                        </Label>
                        <div className="font-medium p-3 bg-muted/30 rounded-lg border border-transparent">
                            {user?.positionTitle || user?.jobTitle || <span className="text-muted-foreground font-normal italic">Not specified</span>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" /> Office Location
                        </Label>
                        <div className="font-medium p-3 bg-muted/30 rounded-lg border border-transparent">
                            {user?.office_location || customFields['OFFICE_LOCATION'] || <span className="text-muted-foreground font-normal italic">Not specified</span>}
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Basic Information */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BadgeInfo className="h-5 w-5 text-primary" />
                    Basic Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card border rounded-xl p-5 shadow-sm">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input {...field} className="pl-9" placeholder="email@company.com" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="personalColor"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Personal Theme Color</FormLabel>
                                <FormControl>
                                    <PersonalColorPicker
                                        color={field.value || '#3B82F6'}
                                        onChange={field.onChange}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Additional Fields from Custom Fields */}
                    <div className="space-y-2">
                        <Label>Mobile Phone</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={user?.phone_number || customFields['MOBILE_PHONE'] || ''}
                                readOnly
                                className="pl-9 bg-muted/30"
                                placeholder="Not specified"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Information (Custom Fields) */}
            {customFieldDefinitions.length > 0 && (
                <>
                    <Separator />
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Additional Information
                        </h3>
                        <div className="bg-card border rounded-xl p-5 shadow-sm">
                            <CustomFieldEdit
                                entityType="User"
                                entityId={user?.id || 'new'}
                                section="personal"
                                values={customFields}
                                onChange={onCustomFieldChange}
                                definitions={customFieldDefinitions}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
