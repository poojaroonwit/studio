"use client";

import { useMemo } from "react";
import type { SystemSetting } from '@/lib/types';
import { buildSignInActiveColors } from './signin-page-utils';
import {
  buildInitialSignInPageSettingsState,
} from './signin-page-settings-state';
import { useSignInPageSettingsEffects } from './use-signin-page-settings-effects';
import { useSignInPageSettingsStateValues } from './use-signin-page-settings-state-values';

interface UseSignInPageSettingsInput {
  initialSettings?: SystemSetting[];
  isMobile: boolean;
  isSignoutRedirect: boolean;
  onSignoutParamCleaned: () => void;
}

export function useSignInPageSettings({
  initialSettings,
  isMobile,
  isSignoutRedirect,
  onSignoutParamCleaned,
}: UseSignInPageSettingsInput) {
  const initialState = useMemo(
    () => buildInitialSignInPageSettingsState(initialSettings),
    [initialSettings],
  );
  const state = useSignInPageSettingsStateValues(initialState);

  useSignInPageSettingsEffects({
    initialSettings,
    isMobile,
    isSignoutRedirect,
    onSignoutParamCleaned,
    state,
  });

  const { activeFontColor, activeBgStart, activeBgEnd } = buildSignInActiveColors({
    initialSettings,
    isThemeDark: state.isThemeDark,
  });

  return {
    activeBgEnd,
    activeBgStart,
    activeFontColor,
    appLogoUrl: state.appLogoUrl,
    basicAuthEnabled: state.basicAuthEnabled,
    contextualLogos: state.contextualLogos,
    currentAppName: state.currentAppName,
    isAzureAdConfigured: state.isAzureAdConfigured,
    isClient: state.isClient,
    isThemeDark: state.isThemeDark,
    loginLayoutType: state.loginLayoutType,
    loginPageContent: initialSettings?.find(s => s.key === 'loginPageContent')?.value || '',
    loginPageFooter: initialSettings?.find(s => s.key === 'loginPageFooter')?.value || '',
    loginPageLogoSize: state.loginPageLogoSize,
    loginPageStyle: state.loginPageStyle,
    mobileHeaderBackgroundType: state.mobileHeaderBackgroundType,
    mobileHeaderFontColor: state.mobileHeaderFontColor,
    mobileHeaderGradient1: state.mobileHeaderGradient1,
    mobileHeaderGradient2: state.mobileHeaderGradient2,
    mobileHeaderGradient3: state.mobileHeaderGradient3,
    mobileHeaderGradient4: state.mobileHeaderGradient4,
    mobileLoginLogoDataUrl: state.mobileLoginLogoDataUrl,
    organizationName: state.organizationName,
    showLogoOnly: state.showLogoOnly,
  };
}
