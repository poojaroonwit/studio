"use client";

import { MobileSignInCard, MobileSignInHeader } from './MobileSignInViewParts';
import type { MobileSignInViewProps } from './MobileSignInViewTypes';
import {
    buildMobileSignInHeaderStyle,
    buildMobileSignInSecureLogoUrl,
} from './mobile-signin-view-utils';

export function MobileSignInView({
    loginPageStyle,
    appName,
    appLogoUrl,
    isThemeDark,
    contextualLogos,
    errorMessage,
    loginPageContent,
    loginPageFooter,
    mobileHeaderGradient1 = '#3B82F6',
    mobileHeaderGradient2 = '#2563EB',
    mobileHeaderGradient3 = '#1D4ED8',
    mobileHeaderGradient4 = '#1E40AF',
    mobileHeaderFontColor = '#FFFFFF',
    mobileHeaderBackgroundType = 'gradient',
    mobileLoginLogoDataUrl,
    organizationName,
}: MobileSignInViewProps) {
    const secureLogoUrl = buildMobileSignInSecureLogoUrl({
        appLogoUrl,
        contextualLogos,
        isThemeDark,
        mobileLoginLogoDataUrl,
    });
    const headerStyle = buildMobileSignInHeaderStyle({
        mobileHeaderBackgroundType,
        mobileHeaderFontColor,
        mobileHeaderGradient1,
        mobileHeaderGradient2,
        mobileHeaderGradient3,
        mobileHeaderGradient4,
    });

    return (
        <div style={loginPageStyle} className="min-h-[100dvh] h-[100dvh] flex flex-col p-0 overflow-hidden bg-background">
            <MobileSignInHeader
                appName={appName}
                headerStyle={headerStyle}
                secureLogoUrl={secureLogoUrl}
            />
            <MobileSignInCard
                errorMessage={errorMessage}
                loginPageContent={loginPageContent}
                loginPageFooter={loginPageFooter}
                organizationName={organizationName}
            />
        </div>
    );
}
