
import React from 'react';
import { ImageUp, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PersonalColorPicker } from '@/components/settings/PersonalColorPicker';
import { HeaderBackgroundType, DEFAULT_PRIMARY_GRADIENT_START, DEFAULT_PRIMARY_GRADIENT_END } from './constants';
import { hslGradientToGradientString, gradientStringToHslGradient } from './utils';


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
    loginPageLogoSize: number;
    setLoginPageLogoSize: (size: number) => void;

    // Header Branding Props
    headerBackgroundType: HeaderBackgroundType;
    setHeaderBackgroundType: (type: HeaderBackgroundType) => void;
    headerImagePreviewUrl: string | null;
    removeSelectedHeaderImage: (shouldRemoveSaved: boolean) => void;
    handleHeaderImageFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    headerBackgroundGradient: string | null;
    setHeaderBackgroundGradient: (gradient: string | null) => void;
    headerBackgroundColor: string;
    setHeaderBackgroundColor: (color: string) => void;
    headerTextColor: string;
    setHeaderTextColor: (color: string) => void;
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
    loginPageLogoSize,
    setLoginPageLogoSize,

    headerBackgroundType,
    setHeaderBackgroundType,
    headerImagePreviewUrl,
    removeSelectedHeaderImage,
    handleHeaderImageFileChange,
    headerBackgroundGradient,
    setHeaderBackgroundGradient,
    headerBackgroundColor,
    setHeaderBackgroundColor,
    headerTextColor,
    setHeaderTextColor,
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
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                            <div className="md:col-span-4 space-y-1">
                                <div className="flex items-center gap-2">
                                    <Label className="text-base font-semibold">Primary Logo</Label>
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                        Required
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">Main company branding used in header, favicon, and as fallback</p>
                            </div>

                            <div className="md:col-span-8 flex items-center gap-4">
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
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <Label className="text-lg font-semibold">Contextual Logos</Label>
                                <Badge variant="outline">Optional</Badge>
                            </div>
                            
                            {/* Login Page Logos */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                <div className="md:col-span-4 space-y-1">
                                    <Label className="text-base font-medium">Login Page</Label>
                                    <p className="text-sm text-muted-foreground">Logos displayed on the authentication screen</p>
                                </div>
                                <div className="md:col-span-8 grid grid-cols-2 gap-4">
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
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                <div className="md:col-span-4 space-y-1">
                                    <Label className="text-base font-medium">Sidebar</Label>
                                    <p className="text-sm text-muted-foreground">Logos displayed in the navigation sidebar (collapsed & expanded)</p>
                                </div>
                                <div className="md:col-span-8 grid grid-cols-2 gap-4">
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

                            {/* Logo Size Control */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                <div className="md:col-span-4 space-y-1">
                                    <Label className="text-base font-medium">Logo Size</Label>
                                    <p className="text-sm text-muted-foreground">Adjust the width and height of the login page logo</p>
                                </div>
                                <div className="md:col-span-8 flex items-center gap-4">
                                    <Input
                                        type="range"
                                        min="40"
                                        max="300"
                                        step="10"
                                        value={loginPageLogoSize}
                                        onChange={(e) => setLoginPageLogoSize(parseInt(e.target.value))}
                                        disabled={!canEdit}
                                        className="flex-1"
                                    />
                                    <div className="w-16 text-center text-sm font-medium bg-muted py-1 rounded">
                                        {loginPageLogoSize}px
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <Separator />


                        {/* Header Branding Configuration */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <Label className="text-lg font-semibold">Header Branding</Label>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                    New
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground -mt-4 mb-4">Configure the background and appearance of the application header</p>

                            <div className="grid gap-8">
                                {/* Header Background Type */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                    <div className="md:col-span-4 space-y-1">
                                        <Label className="text-base font-medium">Background Style</Label>
                                        <p className="text-sm text-muted-foreground">Choose the background style for the header</p>
                                    </div>
                                    <div className="md:col-span-8 flex gap-4">
                                        {(['solid', 'gradient', 'image'] as HeaderBackgroundType[]).map((type) => (
                                            <Button
                                                key={type}
                                                variant={headerBackgroundType === type ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setHeaderBackgroundType(type)}
                                                className="capitalize"
                                                disabled={!canEdit}
                                            >
                                                {type}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {/* Background Color / Gradient / Image picker based on type */}
                                {headerBackgroundType === 'solid' && (
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                        <div className="md:col-span-4 space-y-1">
                                            <Label className="text-base font-medium">Background Color</Label>
                                            <p className="text-sm text-muted-foreground">Pick a solid color for the header background</p>
                                        </div>
                                        <div className="md:col-span-8">
                                            <PersonalColorPicker 
                                                personalColor={headerBackgroundColor}
                                                onColorChange={setHeaderBackgroundColor}
                                                className="w-full max-w-sm"
                                                disabled={!canEdit}
                                            />
                                        </div>
                                    </div>
                                )}

                                {headerBackgroundType === 'gradient' && (
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                        <div className="md:col-span-4 space-y-1">
                                            <Label className="text-base font-medium">Background Gradient</Label>
                                            <p className="text-sm text-muted-foreground">Define a custom gradient for the header</p>
                                        </div>
                                        <div className="md:col-span-8 space-y-4">
                                            <div className="flex gap-4 items-center">
                                                <div className="flex-1">
                                                    <Label className="text-xs mb-2 block">Start Color</Label>
                                                    <PersonalColorPicker 
                                                        personalColor={gradientStringToHslGradient(headerBackgroundGradient || '')?.start || DEFAULT_PRIMARY_GRADIENT_START}
                                                        onColorChange={(color) => {
                                                            const current = gradientStringToHslGradient(headerBackgroundGradient || '') || { start: DEFAULT_PRIMARY_GRADIENT_START, end: DEFAULT_PRIMARY_GRADIENT_END };
                                                            setHeaderBackgroundGradient(hslGradientToGradientString(color, current.end));
                                                        }}
                                                        disabled={!canEdit}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <Label className="text-xs mb-2 block">End Color</Label>
                                                    <PersonalColorPicker 
                                                        personalColor={gradientStringToHslGradient(headerBackgroundGradient || '')?.end || DEFAULT_PRIMARY_GRADIENT_END}
                                                        onColorChange={(color) => {
                                                            const current = gradientStringToHslGradient(headerBackgroundGradient || '') || { start: DEFAULT_PRIMARY_GRADIENT_START, end: DEFAULT_PRIMARY_GRADIENT_END };
                                                            setHeaderBackgroundGradient(hslGradientToGradientString(current.start, color));
                                                        }}
                                                        disabled={!canEdit}
                                                    />
                                                </div>
                                            </div>
                                            <div 
                                                className="w-full h-12 rounded-lg border shadow-inner"
                                                style={{ 
                                                    background: `linear-gradient(to right, ${(() => {
                                                        const g = gradientStringToHslGradient(headerBackgroundGradient || '') || { start: DEFAULT_PRIMARY_GRADIENT_START, end: DEFAULT_PRIMARY_GRADIENT_END };
                                                        return `hsl(${g.start}), hsl(${g.end})`;
                                                    })()})`
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {headerBackgroundType === 'image' && (
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                        <div className="md:col-span-4 space-y-1">
                                            <Label className="text-base font-medium">Background Image</Label>
                                            <p className="text-sm text-muted-foreground">Upload an image to use as the header background</p>
                                        </div>
                                        <div className="md:col-span-8 flex items-center gap-4">
                                            <div className="flex-shrink-0">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleHeaderImageFileChange}
                                                    disabled={!canEdit}
                                                    className="hidden"
                                                    id="header-bg-upload"
                                                />
                                                <Label
                                                    htmlFor="header-bg-upload"
                                                    className="cursor-pointer block"
                                                >
                                                    <div className="w-32 h-20 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:bg-muted/70 hover:border-muted-foreground/40 transition-colors">
                                                        {headerImagePreviewUrl ? (
                                                            <div className="relative group w-full h-full">
                                                                <img
                                                                    src={headerImagePreviewUrl}
                                                                    alt="Header background preview"
                                                                    className="w-full h-full object-cover rounded p-1"
                                                                />
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="absolute -top-2 -right-2 h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full bg-background border shadow-sm"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        removeSelectedHeaderImage(true);
                                                                    }}
                                                                    disabled={!canEdit}
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center text-muted-foreground">
                                                                <ImageUp className="h-8 w-8 mx-auto mb-1 opacity-60" />
                                                                <p className="text-xs">Upload Image</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Header Text Color */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                    <div className="md:col-span-4 space-y-1">
                                        <Label className="text-base font-medium">Text & Icon Color</Label>
                                        <p className="text-sm text-muted-foreground">Adjust text/icon color for readability on background</p>
                                    </div>
                                    <div className="md:col-span-8">
                                        <PersonalColorPicker 
                                            personalColor={headerTextColor}
                                            onColorChange={setHeaderTextColor}
                                            className="w-full max-w-sm"
                                            disabled={!canEdit}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Splash Screen Configuration */}
                        <Separator />
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <Label className="text-lg font-semibold">Splash Screen</Label>
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                    New
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground -mt-4 mb-4">Customize the loading screen shown during page navigation</p>

                            <div className="grid gap-8">
                                {/* Background Color */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                    <div className="md:col-span-4 space-y-1">
                                        <Label className="text-base font-medium">Background Color</Label>
                                        <p className="text-sm text-muted-foreground">The solid background color of the loading screen</p>
                                    </div>
                                    <div className="md:col-span-8">
                                        <PersonalColorPicker 
                                            personalColor={splashBackgroundColor}
                                            onColorChange={setSplashBackgroundColor}
                                            className="w-full max-w-sm"
                                        />
                                    </div>
                                </div>

                                {/* Animation Type */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                    <div className="md:col-span-4 space-y-1">
                                        <Label className="text-base font-medium">Animation Style</Label>
                                        <p className="text-sm text-muted-foreground">The loading indicator style</p>
                                    </div>
                                    <div className="md:col-span-8">
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
                                </div>

                                {/* Splash Logo */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                    <div className="md:col-span-4 space-y-1">
                                        <Label className="text-base font-medium">Splash Logo (Optional)</Label>
                                        <p className="text-sm text-muted-foreground">Overrides primary logo if set</p>
                                    </div>
                                    
                                    <div className="md:col-span-8 flex items-center gap-4">
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
