
import React from 'react';
import { ImageUp, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface BrandingTabProps {
    canEdit: boolean;
    handleLogoFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    logoPreviewUrl: string | null;
    removeSelectedLogo: (shouldRemoveSaved: boolean) => void;

    handleLoginPageLogoLightModeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    loginPageLogoLightModePreviewUrl: string | null;
    setLoginPageLogoLightModePreviewUrl: (url: string | null) => void;
    setSavedLoginPageLogoLightModeUrl: (url: string | null) => void;

    handleLoginPageLogoDarkModeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    loginPageLogoDarkModePreviewUrl: string | null;
    setLoginPageLogoDarkModePreviewUrl: (url: string | null) => void;
    setSavedLoginPageLogoDarkModeUrl: (url: string | null) => void;

    handleSidebarLogoCollapsedLightModeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    sidebarLogoCollapsedLightModePreviewUrl: string | null;
    setSidebarLogoCollapsedLightModePreviewUrl: (url: string | null) => void;
    setSavedSidebarLogoCollapsedLightModeUrl: (url: string | null) => void;

    handleSidebarLogoExpandedLightModeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    sidebarLogoExpandedLightModePreviewUrl: string | null;
    setSidebarLogoExpandedLightModePreviewUrl: (url: string | null) => void;
    setSavedSidebarLogoExpandedLightModeUrl: (url: string | null) => void;

    handleSidebarLogoCollapsedDarkModeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    sidebarLogoCollapsedDarkModePreviewUrl: string | null;
    setSidebarLogoCollapsedDarkModePreviewUrl: (url: string | null) => void;
    setSavedSidebarLogoCollapsedDarkModeUrl: (url: string | null) => void;

    handleSidebarLogoExpandedDarkModeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    sidebarLogoExpandedDarkModePreviewUrl: string | null;
    setSidebarLogoExpandedDarkModePreviewUrl: (url: string | null) => void;
    setSavedSidebarLogoExpandedDarkModeUrl: (url: string | null) => void;

    // Splash Screen Props
    splashBackgroundColor: string;
    setSplashBackgroundColor: (color: string) => void;
    splashAnimationType: string;
    setSplashAnimationType: (type: string) => void;
    handleSplashLogoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    splashLogoPreviewUrl: string | null;
    removeSplashLogo: (shouldRemoveSaved: boolean) => void;
}

export function BrandingTab({
    canEdit,
    handleLogoFileChange,
    logoPreviewUrl,
    removeSelectedLogo,

    handleLoginPageLogoLightModeChange,
    loginPageLogoLightModePreviewUrl,
    setLoginPageLogoLightModePreviewUrl,
    setSavedLoginPageLogoLightModeUrl,

    handleLoginPageLogoDarkModeChange,
    loginPageLogoDarkModePreviewUrl,
    setLoginPageLogoDarkModePreviewUrl,
    setSavedLoginPageLogoDarkModeUrl,

    handleSidebarLogoCollapsedLightModeChange,
    sidebarLogoCollapsedLightModePreviewUrl,
    setSidebarLogoCollapsedLightModePreviewUrl,
    setSavedSidebarLogoCollapsedLightModeUrl,

    handleSidebarLogoExpandedLightModeChange,
    sidebarLogoExpandedLightModePreviewUrl,
    setSidebarLogoExpandedLightModePreviewUrl,
    setSavedSidebarLogoExpandedLightModeUrl,

    handleSidebarLogoCollapsedDarkModeChange,
    sidebarLogoCollapsedDarkModePreviewUrl,
    setSidebarLogoCollapsedDarkModePreviewUrl,
    setSavedSidebarLogoCollapsedDarkModeUrl,

    handleSidebarLogoExpandedDarkModeChange,
    sidebarLogoExpandedDarkModePreviewUrl,
    setSidebarLogoExpandedDarkModePreviewUrl,
    setSavedSidebarLogoExpandedDarkModeUrl,

    splashBackgroundColor,
    setSplashBackgroundColor,
    splashAnimationType,
    setSplashAnimationType,
    handleSplashLogoChange,
    splashLogoPreviewUrl,
    removeSplashLogo,
}: BrandingTabProps) {
    return (
        <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
                {/* Logo Management */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ImageUp className="h-5 w-5 text-primary" />
                            Logo Management
                        </CardTitle>
                        <CardDescription>
                            Configure your company logos for different contexts throughout the application
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Primary Logo */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-base font-semibold">Primary Logo</Label>
                                    <p className="text-sm text-muted-foreground">Main company branding used in header, favicon, and as fallback</p>
                                </div>
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                    Required
                                </Badge>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Logo Preview */}
                                <div className="flex-shrink-0">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoFileChange}
                                        disabled={!canEdit}
                                        className="hidden"
                                        id="app-logo-upload"
                                    />
                                    <Label
                                        htmlFor="app-logo-upload"
                                        className="cursor-pointer block"
                                    >
                                        <div className="w-32 h-20 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                            {logoPreviewUrl ? (
                                                <div className="relative group">
                                                    <img
                                                        src={logoPreviewUrl}
                                                        alt="Primary logo preview"
                                                        className="max-w-full max-h-full object-contain p-2 transition-transform group-hover:scale-105"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="absolute -top-2 -right-2 h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            removeSelectedLogo(true);
                                                        }}
                                                        disabled={!canEdit}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="text-center text-muted-foreground">
                                                    <ImageUp className="h-8 w-8 mx-auto mb-1 opacity-60" />
                                                    <p className="text-xs">Click to upload</p>
                                                </div>
                                            )}
                                        </div>
                                    </Label>
                                </div>

                                {/* Upload Section */}
                                <div className="flex-1 space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        Recommended: 200x80px, max 500MB • PNG, JPG, or SVG format
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Contextual Logos */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-base font-semibold">Contextual Logos</Label>
                                    <p className="text-sm text-muted-foreground">Specialized logos for different contexts and themes</p>
                                </div>
                                <Badge variant="outline">Optional</Badge>
                            </div>

                            {/* Login Page Logos */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-muted-foreground">Login Page</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Light Mode */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium">Light Mode</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLoginPageLogoLightModeChange}
                                                disabled={!canEdit}
                                                className="hidden"
                                                id="login-logo-light-upload"
                                            />
                                            <Label
                                                htmlFor="login-logo-light-upload"
                                                className="cursor-pointer block"
                                            >
                                                <div className="w-20 h-12 bg-muted/50 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                                    {loginPageLogoLightModePreviewUrl ? (
                                                        <div className="relative group">
                                                            <img
                                                                src={loginPageLogoLightModePreviewUrl}
                                                                alt="Login light mode logo"
                                                                className="max-w-full max-h-full object-contain p-1 transition-transform group-hover:scale-105"
                                                            />
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="absolute -top-1 -right-1 h-4 w-4 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setLoginPageLogoLightModePreviewUrl(null);
                                                                    setSavedLoginPageLogoLightModeUrl(null);
                                                                }}
                                                                disabled={!canEdit}
                                                            >
                                                                <X className="h-2.5 w-2.5" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <ImageUp className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                            </Label>
                                        </div>
                                    </div>

                                    {/* Dark Mode */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium">Dark Mode</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLoginPageLogoDarkModeChange}
                                                disabled={!canEdit}
                                                className="hidden"
                                                id="login-logo-dark-upload"
                                            />
                                            <Label
                                                htmlFor="login-logo-dark-upload"
                                                className="cursor-pointer block"
                                            >
                                                <div className="w-20 h-12 bg-muted/50 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                                    {loginPageLogoDarkModePreviewUrl ? (
                                                        <div className="relative group">
                                                            <img
                                                                src={loginPageLogoDarkModePreviewUrl}
                                                                alt="Login dark mode logo"
                                                                className="max-w-full max-h-full object-contain p-1 transition-transform group-hover:scale-105"
                                                            />
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="absolute -top-1 -right-1 h-4 w-4 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setLoginPageLogoDarkModePreviewUrl(null);
                                                                    setSavedLoginPageLogoDarkModeUrl(null);
                                                                }}
                                                                disabled={!canEdit}
                                                            >
                                                                <X className="h-2.5 w-2.5" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <ImageUp className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Logos */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-muted-foreground">Sidebar</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Light Mode */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium">Light Mode</Label>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleSidebarLogoCollapsedLightModeChange}
                                                    disabled={!canEdit}
                                                    className="hidden"
                                                    id="sidebar-collapsed-light-upload"
                                                />
                                                <Label
                                                    htmlFor="sidebar-collapsed-light-upload"
                                                    className="cursor-pointer block"
                                                >
                                                    <div className="w-20 h-12 bg-muted/50 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                                        {sidebarLogoCollapsedLightModePreviewUrl ? (
                                                            <div className="relative group">
                                                                <img
                                                                    src={sidebarLogoCollapsedLightModePreviewUrl}
                                                                    alt="Sidebar collapsed light logo"
                                                                    className="max-w-full max-h-full object-contain p-1 transition-transform group-hover:scale-105"
                                                                />
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="absolute -top-1 -right-1 h-3 w-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setSidebarLogoCollapsedLightModePreviewUrl(null);
                                                                        setSavedSidebarLogoCollapsedLightModeUrl(null);
                                                                    }}
                                                                    disabled={!canEdit}
                                                                >
                                                                    <X className="h-2 w-2" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <ImageUp className="h-3 w-3 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                </Label>
                                                <span className="text-xs text-muted-foreground">Collapsed</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleSidebarLogoExpandedLightModeChange}
                                                    disabled={!canEdit}
                                                    className="hidden"
                                                    id="sidebar-expanded-light-upload"
                                                />
                                                <Label
                                                    htmlFor="sidebar-expanded-light-upload"
                                                    className="cursor-pointer block"
                                                >
                                                    <div className="w-20 h-12 bg-muted/50 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                                        {sidebarLogoExpandedLightModePreviewUrl ? (
                                                            <div className="relative group">
                                                                <img
                                                                    src={sidebarLogoExpandedLightModePreviewUrl}
                                                                    alt="Sidebar expanded light logo"
                                                                    className="max-w-full max-h-full object-contain p-1 transition-transform group-hover:scale-105"
                                                                />
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="absolute -top-1 -right-1 h-3 w-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setSidebarLogoExpandedLightModePreviewUrl(null);
                                                                        setSavedSidebarLogoExpandedLightModeUrl(null);
                                                                    }}
                                                                    disabled={!canEdit}
                                                                >
                                                                    <X className="h-2 w-2" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <ImageUp className="h-3 w-3 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                </Label>
                                                <span className="text-xs text-muted-foreground">Expanded</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dark Mode */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium">Dark Mode</Label>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleSidebarLogoCollapsedDarkModeChange}
                                                    disabled={!canEdit}
                                                    className="hidden"
                                                    id="sidebar-collapsed-dark-upload"
                                                />
                                                <Label
                                                    htmlFor="sidebar-collapsed-dark-upload"
                                                    className="cursor-pointer block"
                                                >
                                                    <div className="w-20 h-12 bg-muted/50 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                                        {sidebarLogoCollapsedDarkModePreviewUrl ? (
                                                            <div className="relative group">
                                                                <img
                                                                    src={sidebarLogoCollapsedDarkModePreviewUrl}
                                                                    alt="Sidebar collapsed dark logo"
                                                                    className="max-w-full max-h-full object-contain p-1 transition-transform group-hover:scale-105"
                                                                />
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="absolute -top-1 -right-1 h-3 w-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setSidebarLogoCollapsedDarkModePreviewUrl(null);
                                                                        setSavedSidebarLogoCollapsedDarkModeUrl(null);
                                                                    }}
                                                                    disabled={!canEdit}
                                                                >
                                                                    <X className="h-2 w-2" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <ImageUp className="h-3 w-3 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                </Label>
                                                <span className="text-xs text-muted-foreground">Collapsed</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleSidebarLogoExpandedDarkModeChange}
                                                    disabled={!canEdit}
                                                    className="hidden"
                                                    id="sidebar-expanded-dark-upload"
                                                />
                                                <Label
                                                    htmlFor="sidebar-expanded-dark-upload"
                                                    className="cursor-pointer block"
                                                >
                                                    <div className="w-20 h-12 bg-muted/50 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                                        {sidebarLogoExpandedDarkModePreviewUrl ? (
                                                            <div className="relative group">
                                                                <img
                                                                    src={sidebarLogoExpandedDarkModePreviewUrl}
                                                                    alt="Sidebar expanded dark logo"
                                                                    className="max-w-full max-h-full object-contain p-1 transition-transform group-hover:scale-105"
                                                                />
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="absolute -top-1 -right-1 h-3 w-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setSidebarLogoExpandedDarkModePreviewUrl(null);
                                                                        setSavedSidebarLogoExpandedDarkModeUrl(null);
                                                                    }}
                                                                    disabled={!canEdit}
                                                                >
                                                                    <X className="h-2 w-2" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <ImageUp className="h-3 w-3 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                </Label>
                                                <span className="text-xs text-muted-foreground">Expanded</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Splash Screen Configuration */}
                        <Separator />
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-base font-semibold">Splash Screen</Label>
                                    <p className="text-sm text-muted-foreground">Customize the loading screen shown during page navigation</p>
                                </div>
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                    New
                                </Badge>
                            </div>

                            <div className="grid gap-6">
                                {/* Background Color */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Background Color</Label>
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-10 h-10 rounded border shadow-sm cursor-pointer"
                                            style={{ backgroundColor: splashBackgroundColor }}
                                            onClick={() => document.getElementById('splash-bg-color-picker')?.click()}
                                        />
                                        <Input
                                            id="splash-bg-color-picker"
                                            type="color"
                                            value={splashBackgroundColor}
                                            onChange={(e) => setSplashBackgroundColor(e.target.value)}
                                            className="w-20 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            type="text"
                                            value={splashBackgroundColor}
                                            onChange={(e) => setSplashBackgroundColor(e.target.value)}
                                            className="w-32 font-mono"
                                            placeholder="#ffffff"
                                        />
                                    </div>
                                </div>

                                {/* Animation Type */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Animation Style</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {['spinner', 'pulse', 'bar', 'dots', 'none'].map((type) => (
                                            <Button
                                                key={type}
                                                variant={splashAnimationType === type ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setSplashAnimationType(type)}
                                                className="capitalize"
                                            >
                                                {type}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {/* Splash Logo */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Splash Logo (Optional)</Label>
                                    <p className="text-xs text-muted-foreground mb-2">Overrides primary logo if set</p>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleSplashLogoChange}
                                                disabled={!canEdit}
                                                className="hidden"
                                                id="splash-logo-upload"
                                            />
                                            <Label
                                                htmlFor="splash-logo-upload"
                                                className="cursor-pointer block"
                                            >
                                                <div className="w-32 h-20 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                                    {splashLogoPreviewUrl ? (
                                                        <div className="relative group w-full h-full flex items-center justify-center">
                                                            <img
                                                                src={splashLogoPreviewUrl}
                                                                alt="Splash logo preview"
                                                                className="max-w-full max-h-full object-contain p-2"
                                                            />
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="absolute -top-2 -right-2 h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full bg-background border shadow-sm"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    removeSplashLogo(true);
                                                                }}
                                                                disabled={!canEdit}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center text-muted-foreground">
                                                            <ImageUp className="h-6 w-6 mx-auto mb-1 opacity-60" />
                                                            <p className="text-[10px]">Upload</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
    );
}
