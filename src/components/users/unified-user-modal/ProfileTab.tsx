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
import { CustomFieldEdit } from '@/components/applicants/CustomFieldEdit';
import { UserProfile } from '@/lib/types';
import { UnifiedUserFormValues, ModalMode } from './types';

interface ProfileTabProps {
    form: UseFormReturn<UnifiedUserFormValues>;
    mode: ModalMode;
    user?: UserProfile | null;
    customFields: { [key: string]: any };
    customFieldDefinitions: any[];
    onCustomFieldChange: (fieldCode: string, value: any) => void;
}

export function ProfileTab({
    form,
    mode,
    user,
    customFields,
    customFieldDefinitions,
    onCustomFieldChange
}: ProfileTabProps) {
    return (
        <div className="space-y-4 mt-2 focus-visible:ring-0 focus-visible:outline-none">
            {/* Unified Profile Information */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BadgeInfo className="h-5 w-5 text-primary" />
                        Profile Information
                    </h3>
                    {(mode === 'edit' || mode === 'profile') && (
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                            <Building2 className="h-3 w-3" />
                            <span>Synced from Azure AD</span>
                        </div>
                    )}
                </div>

                <div className="space-y-4 px-2">
                    {/* Organization Details Fields */}
                    <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-1 md:grid-cols-[200px,1fr] items-center gap-2 md:gap-8 space-y-0">
                                <FormLabel className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                    <Building className="h-4 w-4" /> Department
                                </FormLabel>
                                <div className="space-y-1">
                                    <FormControl>
                                        <Input {...field} value={field.value || ''} placeholder="e.g. Engineering" className="bg-muted/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20" />
                                    </FormControl>
                                    <FormMessage />
                                </div>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="positionTitle"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-1 md:grid-cols-[200px,1fr] items-center gap-2 md:gap-8 space-y-0">
                                <FormLabel className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                    <Briefcase className="h-4 w-4" /> Job Title
                                </FormLabel>
                                <div className="space-y-1">
                                    <FormControl>
                                        <Input {...field} value={field.value || ''} placeholder="e.g. Senior Recruiter" className="bg-muted/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20" />
                                    </FormControl>
                                    <FormMessage />
                                </div>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="officeLocation"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-1 md:grid-cols-[200px,1fr] items-center gap-2 md:gap-8 space-y-0">
                                <FormLabel className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                    <MapPin className="h-4 w-4" /> Office Location
                                </FormLabel>
                                <div className="space-y-1">
                                    <FormControl>
                                        <Input {...field} value={field.value || ''} placeholder="e.g. New York HQ" className="bg-muted/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20" />
                                    </FormControl>
                                    <FormMessage />
                                </div>
                            </FormItem>
                        )}
                    />

                    <Separator className="opacity-50" />

                    {/* Basic Information Fields */}
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-1 md:grid-cols-[200px,1fr] items-center gap-2 md:gap-8 space-y-0">
                                <FormLabel className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                    <Mail className="h-4 w-4" /> Email Address
                                </FormLabel>
                                <div className="space-y-1">
                                    <FormControl>
                                        <Input {...field} placeholder="email@company.com" className="bg-muted/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20" />
                                    </FormControl>
                                    <FormMessage />
                                </div>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-1 md:grid-cols-[200px,1fr] items-center gap-2 md:gap-8 space-y-0">
                                <FormLabel className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                    <Phone className="h-4 w-4" /> Mobile Phone
                                </FormLabel>
                                <div className="space-y-1">
                                    <FormControl>
                                        <Input {...field} value={field.value || ''} placeholder="+1 (555) 000-0000" className="bg-muted/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20" />
                                    </FormControl>
                                    <FormMessage />
                                </div>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="personalColor"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-1 md:grid-cols-[200px,1fr] items-center gap-2 md:gap-8 space-y-0">
                                <FormLabel className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: field.value || '#3B82F6' }} /> Theme Color
                                </FormLabel>
                                <FormControl>
                                    <PersonalColorPicker
                                        personalColor={field.value || '#3B82F6'}
                                        onColorChange={field.onChange}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            {/* Additional Information (Custom Fields) */}
            {customFieldDefinitions.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Additional Information
                    </h3>
                    <div className="px-2">
                        <CustomFieldEdit
                            modelName="User"
                            entityId={user?.id || 'new'}
                            section="personal"
                            customFields={customFields}
                            onFieldChange={onCustomFieldChange}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
