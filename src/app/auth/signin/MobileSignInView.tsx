"use client";

import React from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { CredentialsSignInForm } from "@/components/auth/CredentialsSignInForm";
import { AzureAdSignInButton } from "@/components/auth/AzureAdSignInButton";
import { convertMinIOUrlToSecureUrl } from "@/lib/imageUtils";
import { sanitizeHtml, sanitizeUrl } from "@/lib/utils";

interface MobileSignInViewProps {
    loginPageStyle: React.CSSProperties;
    appName: string;
    appLogoUrl: string | null;
    showLogoOnly: boolean;
    isThemeDark: boolean;
    contextualLogos: {
        loginPageLogoLightMode?: string | null;
        loginPageLogoDarkMode?: string | null;
    };
    errorMessage: string;
    basicAuthEnabled: boolean;
    isAzureAdConfigured: boolean;
    activeFontColor: string;
    activeBgStart: string;
    activeBgEnd: string;
    loginPageContent: string;
    loginPageFooter: string;
    loginPageLogoSize: number;
    mobileHeaderGradient1?: string;
    mobileHeaderGradient2?: string;
    mobileHeaderGradient3?: string;
    mobileHeaderGradient4?: string;
    mobileHeaderFontColor?: string;
    mobileHeaderBackgroundType?: 'gradient' | 'transparent' | 'solid';
    mobileLoginLogoDataUrl?: string | null;
    organizationName?: string;
    loginStage: 'email' | 'otp';
    onStageChange: (stage: 'email' | 'otp') => void;
}

export function MobileSignInView({
    loginPageStyle,
    appName,
    appLogoUrl,
    showLogoOnly,
    isThemeDark,
    contextualLogos,
    errorMessage,
    basicAuthEnabled,
    isAzureAdConfigured,
    activeFontColor,
    activeBgStart,
    activeBgEnd,
    loginPageContent,
    loginPageFooter,
    loginPageLogoSize,
    mobileHeaderGradient1 = '#3B82F6',
    mobileHeaderGradient2 = '#2563EB',
    mobileHeaderGradient3 = '#1D4ED8',
    mobileHeaderGradient4 = '#1E40AF',
    mobileHeaderFontColor = '#FFFFFF',
    mobileHeaderBackgroundType = 'gradient',
    mobileLoginLogoDataUrl,
    organizationName,
    loginStage,
    onStageChange,
}: MobileSignInViewProps) {
    // Determine which logo to use based on theme
    let logoToUse = mobileLoginLogoDataUrl || appLogoUrl;
    if (mobileLoginLogoDataUrl) {
        logoToUse = mobileLoginLogoDataUrl;
    } else if (isThemeDark && contextualLogos.loginPageLogoDarkMode && contextualLogos.loginPageLogoDarkMode.trim() !== '') {
        logoToUse = contextualLogos.loginPageLogoDarkMode;
    } else if (!isThemeDark && contextualLogos.loginPageLogoLightMode && contextualLogos.loginPageLogoLightMode.trim() !== '') {
        logoToUse = contextualLogos.loginPageLogoLightMode;
    }
    const secureLogoUrl = logoToUse ? sanitizeUrl(convertMinIOUrlToSecureUrl(logoToUse, true) || '') : null;

    // Determine header background style
    const headerStyle: React.CSSProperties = {
        color: mobileHeaderFontColor,
        backgroundImage: 'none', // Force remove background image
    };

    if (mobileHeaderBackgroundType === 'gradient') {
        headerStyle.background = `linear-gradient(135deg, ${mobileHeaderGradient1} 0%, ${mobileHeaderGradient2} 33%, ${mobileHeaderGradient3} 66%, ${mobileHeaderGradient4} 100%)`;
    } else if (mobileHeaderBackgroundType === 'solid') {
        headerStyle.backgroundColor = mobileHeaderGradient1;
    } else if (mobileHeaderBackgroundType === 'transparent') {
        headerStyle.background = 'transparent';
    }

    return (
        <div style={loginPageStyle} className="min-h-[100dvh]-[100dvh] flex flex-col p-0 overflow-hidden bg-background">
            {/* Header - uses mobile-specific background settings */}
            <div
                className="h-[40vh] flex flex-col items-start justify-end px-2 pb-20 relative flex-shrink-0 w-full login-transition"
                style={headerStyle}
            >
                {/* Background Pattern/Overlay for more premium feel */}
                <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 left-0  h-full bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.2),transparent)]" />
                </div>

                <div className="flex flex-row items-center text-left gap-1 z-10">
                    {secureLogoUrl ? (
                        <div className="relative h-[64px] w-[100px] drop-shadow-xl">
                            <Image
                                src={secureLogoUrl}
                                alt="App Logo"
                                fill
                                unoptimized
                                sizes="140px"
                                className="rounded-lg object-contain"
                                priority
                            />
                        </div>
                    ) : (
                        <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl flex items-center justify-center shadow-lg" style={{ width: '64px', height: '64px' }}>
                            <span className="text-xl font-bold text-white">CT</span>
                        </div>
                    )}
                    
                    <div className="space-y-0.5">
                        <div className="text-[10px] uppercase tracking-[0.2em] opacity-70 font-black" style={{ color: 'inherit' }}>Welcome to</div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight" style={{ color: 'inherit' }}>
                            {appName}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Main Content Card - mimics evaluate page mobile layout */}
            <Card className="flex-1 border-0 shadow-[0_-12px_40px_rgba(0,0,0,0.15)] mt-[-40px] rounded-t-[44px] z-20 relative overflow-hidden bg-card">
                <CardContent className="h-full p-8 overflow-y-auto">
                    <div className="w-full max-w-md mx-auto space-y-6">
                        <div className="space-y-1 mb-2">
                            <h2 className="text-2xl font-black tracking-tight text-foreground uppercase leading-none">
                                Sign <span className="text-primary">In</span>
                            </h2>
                            <p className="text-xs text-muted-foreground font-medium">Please enter your credentials to continue.</p>
                        </div>

                        {loginPageContent && (
                            <div className="mb-2 text-sm text-foreground/70" dangerouslySetInnerHTML={{ __html: sanitizeHtml(loginPageContent) }} />
                        )}

                        {errorMessage && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{errorMessage}</AlertDescription>
                            </Alert>
                        )}

                        {basicAuthEnabled && (
                            <CredentialsSignInForm
                                activeFontColor={activeFontColor}
                                activeBgStart={activeBgStart}
                                activeBgEnd={activeBgEnd}
                                onStageChange={onStageChange}
                            />
                        )}

                        {(basicAuthEnabled && isAzureAdConfigured && loginStage === 'email') && (
                            <div className="mt-4">
                                <div className="relative mb-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-border/50" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-card dark:bg-card px-2 text-muted-foreground">Or continue with</span>
                                    </div>
                                </div>
                                <AzureAdSignInButton />
                            </div>
                        )}

                        {(!basicAuthEnabled && isAzureAdConfigured && loginStage === 'email') && (
                            <div className="mt-4">
                                <AzureAdSignInButton />
                            </div>
                        )}

                        {(loginPageFooter || organizationName) && (
                            <div className="mt-8 text-center pt-8 space-y-1">
                                {loginPageFooter && <p className="text-xs text-muted-foreground">{loginPageFooter}</p>}
                                {organizationName && (
                                    <p className="text-[10px] text-muted-foreground/60">
                                        &copy; {new Date().getFullYear()} {organizationName}. All rights reserved.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
