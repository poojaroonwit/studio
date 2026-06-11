"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import type { SystemSetting } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { DesktopSignInView } from './DesktopSignInView';
import { MobileSignInView } from './MobileSignInView';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { safeRedirect } from '@/lib/safe-redirect';
import { getSignInErrorMessage } from './signin-error-utils';
import { getSafeSignInRedirectUrl } from './signin-page-utils';
import { useSignInPageProtection } from './use-signin-page-protection';
import { useSignInPageSettings } from './use-signin-page-settings';

interface SignInClientProps {
  initialSettings?: SystemSetting[];
}

export default function SignInClient({ initialSettings }: SignInClientProps) {
  const { data: session, status } = useSession();
  const isMobile = useIsMobile();
  const nextSearchParams = useSearchParams();
  const redirectAttemptedRef = useRef(false);
  const [loginStage, setLoginStage] = useState<'email' | 'otp'>('email');

  const handleSignoutParamCleaned = useCallback(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    url.searchParams.delete('signout');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const {
    activeBgEnd,
    activeBgStart,
    activeFontColor,
    appLogoUrl,
    basicAuthEnabled,
    contextualLogos,
    currentAppName,
    isAzureAdConfigured,
    isClient,
    isThemeDark,
    loginLayoutType,
    loginPageContent,
    loginPageFooter,
    loginPageLogoSize,
    loginPageStyle,
    mobileHeaderBackgroundType,
    mobileHeaderFontColor,
    mobileHeaderGradient1,
    mobileHeaderGradient2,
    mobileHeaderGradient3,
    mobileHeaderGradient4,
    mobileLoginLogoDataUrl,
    organizationName,
    showLogoOnly,
  } = useSignInPageSettings({
    initialSettings,
    isMobile,
    isSignoutRedirect: nextSearchParams.get('signout') === 'true',
    onSignoutParamCleaned: handleSignoutParamCleaned,
  });

  useSignInPageProtection(initialSettings);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.location.pathname !== '/auth/signin') {
      redirectAttemptedRef.current = false;
      return;
    }

    if (redirectAttemptedRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const isSignoutRedirect = urlParams.get('signout') === 'true';
    if (isSignoutRedirect) {
      handleSignoutParamCleaned();
      return;
    }

    if (status !== 'authenticated' || !session?.user?.id) return;

    const hasCallbackUrl = urlParams.get('callbackUrl');
    const redirectUrl = getSafeSignInRedirectUrl(hasCallbackUrl || '/');

    if (redirectUrl === '/' && hasCallbackUrl === '/') {
      const redirectCount = sessionStorage.getItem('signin_redirect_count');
      if (redirectCount && parseInt(redirectCount) > 2) {
        console.warn('[SIGNIN CLIENT] Redirect loop detected, stopping redirect attempts');
        sessionStorage.removeItem('signin_redirect_count');
        redirectAttemptedRef.current = true;
        return;
      }
      sessionStorage.setItem('signin_redirect_count', (parseInt(redirectCount || '0') + 1).toString());
    } else {
      sessionStorage.removeItem('signin_redirect_count');
    }

    redirectAttemptedRef.current = true;
    setTimeout(() => {
      safeRedirect(redirectUrl, '/');
    }, 100);
  }, [handleSignoutParamCleaned, session, status]);

  const errorMessage = getSignInErrorMessage(nextSearchParams.get('error'));

  if (status === "loading" || !isClient) {
    return <SplashScreen persistent />;
  }

  if (status === "authenticated") {
    return <SplashScreen persistent />;
  }

  if (isMobile) {
    return (
      <MobileSignInView
        loginPageStyle={loginPageStyle}
        appName={currentAppName}
        appLogoUrl={appLogoUrl}
        showLogoOnly={showLogoOnly}
        isThemeDark={isThemeDark}
        contextualLogos={contextualLogos}
        errorMessage={errorMessage}
        basicAuthEnabled={basicAuthEnabled}
        isAzureAdConfigured={isAzureAdConfigured}
        activeFontColor={activeFontColor}
        activeBgStart={activeBgStart}
        activeBgEnd={activeBgEnd}
        loginPageContent={loginPageContent}
        loginPageFooter={loginPageFooter}
        loginPageLogoSize={loginPageLogoSize}
        mobileHeaderGradient1={mobileHeaderGradient1}
        mobileHeaderGradient2={mobileHeaderGradient2}
        mobileHeaderGradient3={mobileHeaderGradient3}
        mobileHeaderGradient4={mobileHeaderGradient4}
        mobileHeaderFontColor={mobileHeaderFontColor}
        mobileHeaderBackgroundType={mobileHeaderBackgroundType}
        mobileLoginLogoDataUrl={mobileLoginLogoDataUrl}
        organizationName={organizationName}
        loginStage={loginStage}
        onStageChange={setLoginStage}
      />
    );
  }

  return (
    <DesktopSignInView
      loginPageStyle={loginPageStyle}
      appName={currentAppName}
      appLogoUrl={appLogoUrl}
      showLogoOnly={showLogoOnly}
      isClient={isClient}
      isThemeDark={isThemeDark}
      contextualLogos={contextualLogos}
      errorMessage={errorMessage}
      basicAuthEnabled={basicAuthEnabled}
      isAzureAdConfigured={isAzureAdConfigured}
      activeFontColor={activeFontColor}
      activeBgStart={activeBgStart}
      activeBgEnd={activeBgEnd}
      loginPageFooter={loginPageFooter}
      organizationName={organizationName}
      loginLayoutType={loginLayoutType}
      loginStage={loginStage}
      onStageChange={setLoginStage}
    />
  );
}
