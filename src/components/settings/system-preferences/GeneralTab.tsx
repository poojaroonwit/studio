
import React from 'react';
import { PenSquare, Sun, Moon, RotateCcw, BrainCircuit } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemePreference } from './constants';

interface GeneralTabProps {
    canEdit: boolean;
    appName: string;
    setAppName: (value: string) => void;
    themePreference: ThemePreference;
    setThemePreference: (value: ThemePreference) => void;
    generativeAICanvasMode: boolean;
    setGenerativeAICanvasMode: (value: boolean) => void;
}

export function GeneralTab({
    canEdit,
    appName,
    setAppName,
    themePreference,
    setThemePreference,
    generativeAICanvasMode,
    setGenerativeAICanvasMode
}: GeneralTabProps) {
    return (
        <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
                {/* App Name Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PenSquare className="h-5 w-5 text-primary" />
                            Application Name
                        </CardTitle>
                        <CardDescription>
                            Set the name that appears throughout the application
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor="app-name-input">Application Name</Label>
                            <Input
                                id="app-name-input"
                                type="text"
                                value={appName}
                                onChange={(e) => setAppName(e.target.value)}
                                placeholder="e.g., FitScan Pro"
                                disabled={!canEdit}
                            />
                            <p className="text-xs text-muted-foreground">
                                This name will be displayed in the header, browser tab, and other locations
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Theme Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sun className="h-5 w-5 text-primary" />
                            Theme Settings
                        </CardTitle>
                        <CardDescription>
                            Configure the default theme for new users
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="theme-preference">Default Theme</Label>
                                <Select
                                    value={themePreference}
                                    onValueChange={(value) => setThemePreference(value as ThemePreference)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger id="theme-preference" className="w-full">
                                        <SelectValue placeholder="Select default theme" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="light">
                                            <div className="flex items-center gap-2">
                                                <Sun className="h-4 w-4" />
                                                Light
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="dark">
                                            <div className="flex items-center gap-2">
                                                <Moon className="h-4 w-4" />
                                                Dark
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="system">
                                            <div className="flex items-center gap-2">
                                                <RotateCcw className="h-4 w-4" />
                                                System
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Users can still override this setting in their personal preferences
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Generative AI Canvas Mode Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BrainCircuit className="h-5 w-5 text-primary" />
                            Generative AI Assistant
                        </CardTitle>
                        <CardDescription>
                            Configure advanced features for the Generative AI Assistant
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="generative-ai-canvas-mode">Canvas Mode</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Enable canvas mode with WYSIWYG editor and chart generation (BI) features
                                    </p>
                                </div>
                                <Switch
                                    id="generative-ai-canvas-mode"
                                    checked={generativeAICanvasMode}
                                    onCheckedChange={setGenerativeAICanvasMode}
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
    );
}
