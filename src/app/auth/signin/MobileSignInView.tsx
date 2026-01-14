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

    return (
        <div style={loginPageStyle} className="min-h-screen w-full h-screen flex flex-col p-0 overflow-hidden">
            {/* Header - uses same background as login page */}
            <div
                className="h-[100px] flex items-center justify-between px-6 sm:px-10 flex-shrink-0 w-full login-transition"
                style={{
                    ...loginPageStyle,
                    color: mobileHeaderFontColor,
                }}
            >
                <div>
                    <div className="text-xs sm:text-sm uppercase tracking-wide opacity-80 font-medium" style={{ color: 'inherit' }}>Welcome to</div>
                    {!showLogoOnly ? (
                        <h1 className="text-xl sm:text-3xl font-semibold leading-tight" style={{ color: 'inherit' }}>
                            {appName}
                        </h1>
                    ) : (
                        <h1 className="text-xl sm:text-3xl font-semibold leading-tight" style={{ color: 'inherit' }}>
                            Sign In
                        </h1>
                    )}
                </div>
                {secureLogoUrl ? (
                    <img src={secureLogoUrl} alt="App Logo" className="h-[35px] w-[90px] rounded-md" />
                ) : (
                    <div className="bg-gradient-to-br from-primary to-primary/80 rounded-md flex items-center justify-center" style={{ width: '48px', height: '48px' }}>
                        <span className="text-base font-bold text-primary-foreground">CT</span>
                    </div>
                )}
            </div>

            {/* Main Content Card - mimics evaluate page mobile layout */}
            <Card className="evaluate-card-rounded-top flex-1 border-0 shadow-lg mt-4">
                <CardContent className="h-full p-8 sm:p-12 overflow-y-auto">
                    <div className="w-full max-w-md mx-auto space-y-6">
                        {loginPageContent && (
                            <div className="mb-4 text-center" dangerouslySetInnerHTML={{ __html: sanitizeHtml(loginPageContent) }} />
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
                            />
                        )}

                        {(basicAuthEnabled && isAzureAdConfigured) && (
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

                        {(!basicAuthEnabled && isAzureAdConfigured) && (
                            <div className="mt-4">
                                <AzureAdSignInButton />
                            </div>
                        )}

                        <div className="mt-8 text-center pt-8">
                            <p className="text-xs text-muted-foreground">{loginPageFooter}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
