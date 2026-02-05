"use client";

import React from 'react';
import { Smartphone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ColorPicker } from '@/components/ui/color-picker';

interface PwaTabProps {
    pwaEnabled: boolean;
    setPwaEnabled: (val: boolean) => void;
    pwaName: string;
    setPwaName: (val: string) => void;
    pwaShortName: string;
    setPwaShortName: (val: string) => void;
    pwaDescription: string;
    setPwaDescription: (val: string) => void;
    pwaThemeColor: string;
    setPwaThemeColor: (val: string) => void;
    pwaBackgroundColor: string;
    setPwaBackgroundColor: (val: string) => void;
    pwaAppleMobileWebAppTitle: string;
    setPwaAppleMobileWebAppTitle: (val: string) => void;
    pwaAppleMobileWebAppStatusBarStyle: string;
    setPwaAppleMobileWebAppStatusBarStyle: (val: string) => void;
    isSaving: boolean;
}

export default function PwaTab({
    pwaEnabled,
    setPwaEnabled,
    pwaName,
    setPwaName,
    pwaShortName,
    setPwaShortName,
    pwaDescription,
    setPwaDescription,
    pwaThemeColor,
    setPwaThemeColor,
    pwaBackgroundColor,
    setPwaBackgroundColor,
    pwaAppleMobileWebAppTitle,
    setPwaAppleMobileWebAppTitle,
    pwaAppleMobileWebAppStatusBarStyle,
    setPwaAppleMobileWebAppStatusBarStyle,
    isSaving,
}: PwaTabProps) {
    return (
        <ScrollArea className="h-full">
            <Accordion type="multiple" defaultValue={['pwa']} className="w-full">
                <AccordionItem value="pwa" className="border-b">
                    <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5 text-primary" />
                            <div className="text-left">
                                <div className="font-semibold">Progressive Web App (PWA)</div>
                                <div className="text-xs text-muted-foreground font-normal">Enable or disable Progressive Web App functionality. When enabled, users can install the app on mobile devices and tablets.</div>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="pwa-enabled">Enable PWA</Label>
                                    <p className="text-sm text-muted-foreground">
                                        When enabled, the app will show install prompts on mobile devices and tablets, allowing users to add it to their home screen.
                                    </p>
                                </div>
                                <Switch
                                    id="pwa-enabled"
                                    checked={pwaEnabled}
                                    onCheckedChange={setPwaEnabled}
                                    disabled={isSaving}
                                />
                            </div>

                            {pwaEnabled && (
                                <>
                                    <Separator />
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold">PWA Metadata</h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="pwa-name">PWA Name</Label>
                                                <Input
                                                    id="pwa-name"
                                                    value={pwaName}
                                                    onChange={(e) => setPwaName(e.target.value)}
                                                    placeholder="FitScan - AI-Powered Recruitment Platform"
                                                    disabled={isSaving}
                                                />
                                                <p className="text-xs text-muted-foreground">Full name displayed when installing the app</p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="pwa-short-name">PWA Short Name</Label>
                                                <Input
                                                    id="pwa-short-name"
                                                    value={pwaShortName}
                                                    onChange={(e) => setPwaShortName(e.target.value)}
                                                    placeholder="FitScan"
                                                    disabled={isSaving}
                                                    maxLength={12}
                                                />
                                                <p className="text-xs text-muted-foreground">Short name for home screen (max 12 characters)</p>
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="pwa-description">PWA Description</Label>
                                                <Input
                                                    id="pwa-description"
                                                    value={pwaDescription}
                                                    onChange={(e) => setPwaDescription(e.target.value)}
                                                    placeholder="Advanced AI-powered recruitment and Applicant management platform"
                                                    disabled={isSaving}
                                                />
                                                <p className="text-xs text-muted-foreground">Description of your PWA</p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="pwa-theme-color">Theme Color</Label>
                                                <div className="flex gap-2">
                                                    <ColorPicker
                                                        value={pwaThemeColor}
                                                        onChange={setPwaThemeColor}
                                                        disabled={isSaving}
                                                    />
                                                    <Input
                                                        id="pwa-theme-color"
                                                        value={pwaThemeColor}
                                                        onChange={(e) => setPwaThemeColor(e.target.value)}
                                                        placeholder="#000000"
                                                        disabled={isSaving}
                                                        className="flex-1"
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground">Color for browser UI elements</p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="pwa-background-color">Background Color</Label>
                                                <div className="flex gap-2">
                                                    <ColorPicker
                                                        value={pwaBackgroundColor}
                                                        onChange={setPwaBackgroundColor}
                                                        disabled={isSaving}
                                                    />
                                                    <Input
                                                        id="pwa-background-color"
                                                        value={pwaBackgroundColor}
                                                        onChange={(e) => setPwaBackgroundColor(e.target.value)}
                                                        placeholder="#171a26"
                                                        disabled={isSaving}
                                                        className="flex-1"
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground">Splash screen background color</p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="pwa-apple-title">Apple Mobile Web App Title</Label>
                                                <Input
                                                    id="pwa-apple-title"
                                                    value={pwaAppleMobileWebAppTitle}
                                                    onChange={(e) => setPwaAppleMobileWebAppTitle(e.target.value)}
                                                    placeholder="FitScan"
                                                    disabled={isSaving}
                                                />
                                                <p className="text-xs text-muted-foreground">Title for iOS home screen</p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="pwa-apple-status-bar">Apple Status Bar Style</Label>
                                                <Select
                                                    value={pwaAppleMobileWebAppStatusBarStyle}
                                                    onValueChange={setPwaAppleMobileWebAppStatusBarStyle}
                                                    disabled={isSaving}
                                                >
                                                    <SelectTrigger id="pwa-apple-status-bar">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="default">Default</SelectItem>
                                                        <SelectItem value="black">Black</SelectItem>
                                                        <SelectItem value="black-translucent">Black Translucent</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-xs text-muted-foreground">iOS status bar appearance</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </ScrollArea>
    );
}
