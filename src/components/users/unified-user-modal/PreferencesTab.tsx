import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Palette, Layout } from 'lucide-react';
import { ThemeSelector } from '@/components/settings/ThemeSelector';
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
        <div className="space-y-6 mt-0 focus-visible:ring-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 gap-6">
                {/* UI Customization */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Palette className="h-4 w-4 text-primary" />
                            Interface Settings
                        </CardTitle>
                        <CardDescription>Customize the look and feel of your application</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label>Color Theme</Label>
                            <ThemeSelector
                                themePreference={preferences?.appearance?.themePreference || 'system'}
                                onThemeChange={(themePreference) => updatePreferenceInDB('appearance', { themePreference })}
                            />
                        </div>
                        <Separator />
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Sidebar Appearance</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => handleResetPreference('sidebar')}
                                >
                                    Reset to Default
                                </Button>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Show Assigned Positions Only</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Filter the sidebar to only show positions you are assigned to
                                    </p>
                                </div>
                                <Switch
                                    checked={sidebarShowAssigned}
                                    onCheckedChange={(checked) => saveSidebarPref(Boolean(checked))}
                                    disabled={isPrefsLoading}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Card Customization */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Layout className="h-4 w-4 text-primary" />
                            Task Board Cards
                        </CardTitle>
                        <CardDescription>Choose what information appears on your task board cards</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CardCustomizationSettings
                            preferences={preferences?.taskBoard as any}
                            onUpdatePreferences={(updates) => updatePreferenceInDB('taskBoard', updates)}
                            onResetPreferences={() => handleResetPreference('taskBoard')}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
