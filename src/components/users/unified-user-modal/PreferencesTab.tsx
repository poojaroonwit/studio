import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Layout, Monitor, Sun, Moon } from 'lucide-react';
import { CardCustomizationSettings } from '@/components/tasks/CardCustomizationSettings';
import { UserPreferences } from '@/hooks/use-user-preferences';

interface PreferencesTabProps {
    preferences: UserPreferences | null;
    updatePreferenceInDB: (modelType: string, updates: any) => Promise<void>;
    handleResetPreference: (modelType: string) => Promise<void>;
    sidebarShowAssigned: boolean;
    saveSidebarPref: (checked: boolean) => Promise<void>;
    isPrefsLoading: boolean;
}

export function PreferencesTab({
    preferences,
    updatePreferenceInDB,
    handleResetPreference,
    sidebarShowAssigned,
    saveSidebarPref,
    isPrefsLoading
}: PreferencesTabProps) {
    return (
        <div className="space-y-4 mt-2 focus-visible:ring-0 focus-visible:outline-none">
            {/* UI Customization */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Palette className="h-5 w-5 text-primary" />
                        Interface Settings
                    </h3>
                </div>

                <div className="space-y-4 px-2">
                    {/* Theme Preference Field */}
                    <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] items-center gap-2 md:gap-8 space-y-0">
                        <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                            <Monitor className="h-4 w-4" /> Color Theme
                        </Label>
                        <Select 
                            value={preferences?.appearance?.themePreference || 'system'} 
                            onValueChange={(val: 'light' | 'dark' | 'system') => updatePreferenceInDB('appearance', { themePreference: val })}
                        >
                            <SelectTrigger className="w-full md:max-w-xs bg-muted/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20">
                                <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">
                                    <div className="flex items-center gap-2">
                                        <Sun className="h-4 w-4" />
                                        <span>Light Theme</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="dark">
                                    <div className="flex items-center gap-2">
                                        <Moon className="h-4 w-4" />
                                        <span>Dark Theme</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="system">
                                    <div className="flex items-center gap-2">
                                        <Monitor className="h-4 w-4" />
                                        <span>System Default</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator className="opacity-50" />

                    {/* Sidebar Preference Field */}
                    <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] items-center gap-2 md:gap-8 space-y-0">
                        <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                            <Layout className="h-4 w-4" /> Sidebar Style
                        </Label>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Show Assigned Positions Only</Label>
                                <p className="text-[11px] text-muted-foreground leading-tight">
                                    Only show positions where you are part of the hiring team
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <Switch
                                    checked={sidebarShowAssigned}
                                    onCheckedChange={(checked) => saveSidebarPref(Boolean(checked))}
                                    disabled={isPrefsLoading}
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[10px] px-2 uppercase font-bold tracking-tight text-muted-foreground hover:text-foreground"
                                    onClick={() => handleResetPreference('sidebar')}
                                >
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card Customization */}
            <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Layout className="h-5 w-5 text-primary" />
                        Task Board Cards
                    </h3>
                </div>
                <div className="px-2">
                    <CardCustomizationSettings
                        preferences={preferences?.taskBoard as any}
                        onUpdatePreferences={(updates) => updatePreferenceInDB('taskBoard', updates)}
                        onResetPreferences={() => handleResetPreference('taskBoard')}
                    />
                </div>
            </div>
        </div>
    );
}
