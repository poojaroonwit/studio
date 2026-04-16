"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { AzureAdSignInButton } from "@/components/auth/AzureAdSignInButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import Image from 'next/image';
import { CredentialsSignInForm } from "@/components/auth/CredentialsSignInForm";
import type { SystemSetting, LoginPageBackgroundType, LoginPageLayoutType } from '@/lib/types';
import { setThemeAndColors } from '@/lib/themeUtils';
import { sanitizeUrl } from '@/lib/utils';
import { convertMinIOUrlToSecureUrl } from '@/lib/imageUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileSignInView } from './MobileSignInView';
import { safeRedirect } from '@/lib/safe-redirect';

interface SignInClientProps {
  initialSettings?: SystemSetting[];
}

const APP_LOGO_DATA_URL_KEY = 'appLogoDataUrl';
const APP_CONFIG_APP_NAME_KEY = 'appConfigAppName';
const DEFAULT_APP_NAME = "FitScan";
const DEFAULT_LOGIN_BG_GRADIENT = "linear-gradient(90deg, rgba(255, 255, 255, 1) 0%, rgba(245, 245, 255, 1) 100%, rgba(252, 252, 255, 1) 55%)";
const DEFAULT_LOGIN_BG_GRADIENT_DARK = "linear-gradient(90deg, hsl(220, 15%, 9%) 0%, hsl(220, 15%, 11%) 100%, hsl(220, 15%, 10%) 55%)";
const DEFAULT_PRIMARY_GRADIENT_START_SIGNIN = "179 67% 66%";
const DEFAULT_PRIMARY_GRADIENT_END_SIGNIN = "238 74% 61%";
const DEFAULT_LOGIN_LAYOUT_TYPE: LoginPageLayoutType = 'center';

// Login page logo size configuration
const LOGIN_PAGE_LOGO_SIZE_KEY = 'loginPageLogoSize';
const DEFAULT_LOGIN_PAGE_LOGO_SIZE = 100; // Default 100px for login page (reduced from 150px)

// Login background settings keys (Unified)
const LOGIN_BACKGROUND_TYPE_KEY = 'loginBackgroundType';
const LOGIN_BACKGROUND_IMAGE_KEY = 'loginPageBackgroundImageUrl';
const LOGIN_BACKGROUND_GRADIENT_START_KEY = 'loginBackgroundGradientStart';
const LOGIN_BACKGROUND_GRADIENT_END_KEY = 'loginBackgroundGradientEnd';
const LOGIN_BACKGROUND_COLOR_KEY = 'loginBackgroundColor';

// Mobile login background keys
const LOGIN_BACKGROUND_TYPE_MOBILE_KEY = 'loginBackgroundTypeMobile';
const LOGIN_BACKGROUND_IMAGE_MOBILE_KEY = 'loginPageBackgroundImageUrlMobile';
const LOGIN_BACKGROUND_GRADIENT_START_MOBILE_KEY = 'loginBackgroundGradientStartMobile';
const LOGIN_BACKGROUND_GRADIENT_END_MOBILE_KEY = 'loginBackgroundGradientEndMobile';
const LOGIN_BACKGROUND_COLOR_MOBILE_KEY = 'loginBackgroundColorMobile';
const LOGIN_BACKGROUND_GRADIENT_MOBILE_KEY = 'loginBackgroundGradientMobile';

// Legacy keys for backward compatibility
const LEGACY_LOGIN_BG_TYPE_KEY = 'loginPageBackgroundType';
const LEGACY_LOGIN_BG_COLOR1_KEY = 'loginPageBackgroundColor1';
const LEGACY_LOGIN_BG_COLOR2_KEY = 'loginPageBackgroundColor2';

export default function SignInClient({ initialSettings }: SignInClientProps) {
  const { data: session, status } = useSession();
  const isMobile = useIsMobile();
  const nextSearchParams = useSearchParams();
  const redirectAttemptedRef = useRef(false);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(() => {
    if (initialSettings) {
      const logoUrl = initialSettings.find(s => s.key === 'appLogoDataUrl')?.value || null;

      return logoUrl;
    }
    return null;
  });
  const [contextualLogos, setContextualLogos] = useState<{
    loginPageLogoLightMode?: string | null;
    loginPageLogoDarkMode?: string | null;
  }>({});
  const [currentAppName, setCurrentAppName] = useState<string>(() => {
    if (initialSettings) {
      return initialSettings.find(s => s.key === 'appName')?.value || DEFAULT_APP_NAME;
    }
    return DEFAULT_APP_NAME;
  });
  const [showLogoOnly, setShowLogoOnly] = useState<boolean>(() => {
    if (initialSettings) {
      return initialSettings.find(s => s.key === 'showLogoOnly')?.value === 'true';
    }
    return false;
  });
  const [isClient, setIsClient] = useState(false);
  const [loginPageStyle, setLoginPageStyle] = useState<React.CSSProperties>({});
  const [isThemeDark, setIsThemeDark] = useState(false);
  const [loginLayoutType, setLoginLayoutType] = useState<LoginPageLayoutType>(() => {
    if (initialSettings) {
      return (initialSettings.find(s => s.key === 'loginPageLayoutType')?.value as LoginPageLayoutType) || DEFAULT_LOGIN_LAYOUT_TYPE;
    }
    return DEFAULT_LOGIN_LAYOUT_TYPE;
  });
  const [loginPageLogoSize, setLoginPageLogoSize] = useState<number>(() => {
    if (initialSettings) {
      const setting = initialSettings.find(s => s.key === LOGIN_PAGE_LOGO_SIZE_KEY);
      return setting && setting.value ? parseInt(setting.value) || DEFAULT_LOGIN_PAGE_LOGO_SIZE : DEFAULT_LOGIN_PAGE_LOGO_SIZE;
    }
    return DEFAULT_LOGIN_PAGE_LOGO_SIZE;
  });

  // Evaluate Header Settings State
  const [evaluateHeaderBackgroundType, setEvaluateHeaderBackgroundType] = useState<'image' | 'gradient' | 'solid'>('gradient');
  const [evaluateHeaderBackgroundImage, setEvaluateHeaderBackgroundImage] = useState<string | null>(null);
  const [evaluateHeaderBackgroundGradient, setEvaluateHeaderBackgroundGradient] = useState<string | null>(null);
  const [evaluateHeaderBackgroundColor, setEvaluateHeaderBackgroundColor] = useState<string>('220 25% 97%');
  const [evaluateHeaderTextColor, setEvaluateHeaderTextColor] = useState<string>('0 0% 0%');

  // Mobile Header Colors State
  const [mobileHeaderGradient1, setMobileHeaderGradient1] = useState<string>('#3B82F6');
  const [mobileHeaderGradient2, setMobileHeaderGradient2] = useState<string>('#2563EB');
  const [mobileHeaderGradient3, setMobileHeaderGradient3] = useState<string>('#1D4ED8');
  const [mobileHeaderGradient4, setMobileHeaderGradient4] = useState<string>('#1E40AF');
  const [mobileHeaderFontColor, setMobileHeaderFontColor] = useState<string>('#FFFFFF');
  const [mobileHeaderBackgroundType, setMobileHeaderBackgroundType] = useState<'gradient' | 'transparent' | 'solid'>('gradient');
  const [mobileLoginLogoDataUrl, setMobileLoginLogoDataUrl] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');

  const [loginStage, setLoginStage] = useState<'email' | 'otp'>('email');

  useEffect(() => {
    setIsClient(true);

    // Clean up signout parameter from URL if present
    const isSignoutRedirect = nextSearchParams.get('signout') === 'true';
    if (isSignoutRedirect && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('signout');
      window.history.replaceState({}, '', url.toString());
    }
    // Function to update theme status
    const updateThemeStatus = () => {
      setIsThemeDark(document.documentElement.classList.contains('dark'));
    };
    updateThemeStatus(); // Initial check

    // Observe theme changes
    const observer = new MutationObserver(updateThemeStatus);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // If no initialSettings, fetch on client as fallback
    if (!initialSettings) {
      const fetchAppAndLoginConfig = async () => {
        let appName = DEFAULT_APP_NAME;
        let logoUrl = null;
        let loginBgType: LoginPageBackgroundType = 'gradient';
        let loginBgImageUrl: string | null = null;
        let loginBgColor1: string | null = null;
        let loginBgColor2: string | null = null;
        let primaryStart = DEFAULT_PRIMARY_GRADIENT_START_SIGNIN;
        let primaryEnd = DEFAULT_PRIMARY_GRADIENT_END_SIGNIN;
        let loginLayoutTypeSetting: LoginPageLayoutType = DEFAULT_LOGIN_LAYOUT_TYPE;
        let loginPageLogoSizeSetting: number = DEFAULT_LOGIN_PAGE_LOGO_SIZE;
        let settingsObj: any = {};

        try {
          const response = await fetch('/api/settings/system-settings');
          if (response.ok) {
            const data = await response.json();

            // Handle both response formats
            if (data.settings && Array.isArray(data.settings)) {
              settingsObj = Object.fromEntries(data.settings.map((setting: any) => [setting.key, setting.value]));
            } else {
              settingsObj = data;
            }

            appName = settingsObj.appName || DEFAULT_APP_NAME;
            logoUrl = settingsObj.appLogoDataUrl || null;

            // Load contextual logos
            setContextualLogos({
              loginPageLogoLightMode: settingsObj.loginPageLogoLightMode || null,
              loginPageLogoDarkMode: settingsObj.loginPageLogoDarkMode || null,
            });

            // Unified background settings - prioritized over legacy
            const desktopBgType = (settingsObj[LOGIN_BACKGROUND_TYPE_KEY] || settingsObj[LEGACY_LOGIN_BG_TYPE_KEY]) as LoginPageBackgroundType || 'gradient';
            const desktopBgImageUrlRaw = settingsObj[LOGIN_BACKGROUND_IMAGE_KEY] || null;
            const desktopBgImageUrl = desktopBgImageUrlRaw ? sanitizeUrl(convertMinIOUrlToSecureUrl(desktopBgImageUrlRaw, true) || '') : null;
            const desktopBgColor1 = settingsObj[LOGIN_BACKGROUND_GRADIENT_START_KEY] || settingsObj[LEGACY_LOGIN_BG_COLOR1_KEY] || null;
            const desktopBgColor2 = settingsObj[LOGIN_BACKGROUND_GRADIENT_END_KEY] || settingsObj[LEGACY_LOGIN_BG_COLOR2_KEY] || null;
            const desktopBgGradient = settingsObj.loginBackgroundGradient || null;
            const desktopBgSolidColor = settingsObj[LOGIN_BACKGROUND_COLOR_KEY] || null;

            // Mobile specific settings
            const mobileBgType = settingsObj[LOGIN_BACKGROUND_TYPE_MOBILE_KEY] as LoginPageBackgroundType || null;
            const mobileBgImageUrlRaw = settingsObj[LOGIN_BACKGROUND_IMAGE_MOBILE_KEY] || null;
            const mobileBgImageUrl = mobileBgImageUrlRaw ? sanitizeUrl(convertMinIOUrlToSecureUrl(mobileBgImageUrlRaw, true) || '') : null;
            const mobileBgColor1 = settingsObj[LOGIN_BACKGROUND_GRADIENT_START_MOBILE_KEY] || null;
            const mobileBgColor2 = settingsObj[LOGIN_BACKGROUND_GRADIENT_END_MOBILE_KEY] || null;
            const mobileBgGradient = settingsObj[LOGIN_BACKGROUND_GRADIENT_MOBILE_KEY] || null;
            const mobileBgSolidColor = settingsObj[LOGIN_BACKGROUND_COLOR_MOBILE_KEY] || null;

            // Select settings based on device
            if (isMobile && mobileBgType) {
              loginBgType = mobileBgType;
              loginBgImageUrl = mobileBgImageUrl;
              loginBgColor1 = mobileBgColor1;
              loginBgColor2 = mobileBgColor2;
              settingsObj.activeLoginGradient = mobileBgGradient;
              settingsObj.activeLoginSolidColor = mobileBgSolidColor;
            } else {
              loginBgType = desktopBgType;
              loginBgImageUrl = desktopBgImageUrl;
              loginBgColor1 = desktopBgColor1;
              loginBgColor2 = desktopBgColor2;
              settingsObj.activeLoginGradient = desktopBgGradient;
              settingsObj.activeLoginSolidColor = desktopBgSolidColor;
            }
            
            loginLayoutTypeSetting = settingsObj.loginPageLayoutType as LoginPageLayoutType || DEFAULT_LOGIN_LAYOUT_TYPE;
            primaryStart = settingsObj.primaryGradientStart || DEFAULT_PRIMARY_GRADIENT_START_SIGNIN;
            primaryEnd = settingsObj.primaryGradientEnd || DEFAULT_PRIMARY_GRADIENT_END_SIGNIN;
            loginPageLogoSizeSetting = settingsObj.loginPageLogoSize || DEFAULT_LOGIN_PAGE_LOGO_SIZE;

            setCurrentAppName(appName);
            setAppLogoUrl(logoUrl);
            setOrganizationName(settingsObj.organizationName || '');
            setShowLogoOnly(settingsObj.showLogoOnly === 'true' || settingsObj.showLogoOnly === true);
            setLoginLayoutType(loginLayoutTypeSetting);
            setLoginPageLogoSize(loginPageLogoSizeSetting);

            // Load evaluate header settings
            setEvaluateHeaderBackgroundType(settingsObj.evaluateHeaderBackgroundType || 'gradient');
            const evalBgImgRaw = settingsObj.evaluateHeaderBackgroundImageUrl || null;
            setEvaluateHeaderBackgroundImage(evalBgImgRaw ? sanitizeUrl(convertMinIOUrlToSecureUrl(evalBgImgRaw, true) || '') : null);

            if (settingsObj.evaluateHeaderBackgroundGradient) {
              setEvaluateHeaderBackgroundGradient(settingsObj.evaluateHeaderBackgroundGradient);
            } else if (settingsObj.evaluateHeaderBackgroundGradientStart && settingsObj.evaluateHeaderBackgroundGradientEnd) {
              setEvaluateHeaderBackgroundGradient(`linear-gradient(135deg, hsl(${settingsObj.evaluateHeaderBackgroundGradientStart}), hsl(${settingsObj.evaluateHeaderBackgroundGradientEnd}))`);
            } else {
              setEvaluateHeaderBackgroundGradient(`linear-gradient(135deg, hsl(179 67% 66%), hsl(238 74% 61%))`);
            }

            setEvaluateHeaderBackgroundColor(settingsObj.evaluateHeaderBackgroundColor || '220 25% 97%');
            setEvaluateHeaderTextColor(settingsObj.evaluateHeaderTextColor || '0 0% 0%');

            // Load mobile header colors
            setMobileHeaderGradient1(settingsObj.mobileHeaderGradient1 || '#3B82F6');
            setMobileHeaderGradient2(settingsObj.mobileHeaderGradient2 || '#2563EB');
            setMobileHeaderGradient3(settingsObj.mobileHeaderGradient3 || '#1D4ED8');
            setMobileHeaderGradient4(settingsObj.mobileHeaderGradient4 || '#1E40AF');
            setMobileHeaderFontColor(settingsObj.mobileHeaderFontColor || '#FFFFFF');
            setMobileHeaderBackgroundType(settingsObj.mobileHeaderBackgroundType || 'gradient');
            setMobileLoginLogoDataUrl(settingsObj.mobileLoginLogoDataUrl || null);

            if (typeof document !== 'undefined') {
              const themePref = (settingsObj.appThemePreference as 'system' | 'light' | 'dark') || 'system';
              setThemeAndColors({
                themePreference: themePref,
                primaryGradient: settingsObj.primaryGradient || null,
                primaryGradientStart: primaryStart,
                primaryGradientEnd: primaryEnd,
              });
            }
          }
        } catch (error) {
          console.warn("Failed to fetch system settings for login page, using defaults/localStorage.", error);
          appName = localStorage.getItem(APP_CONFIG_APP_NAME_KEY) || DEFAULT_APP_NAME;
          logoUrl = localStorage.getItem(APP_LOGO_DATA_URL_KEY) || null;
        }

        // Determine login page style - Only background-related styles
        const newStyle: React.CSSProperties = {
          transition: 'background 0.5s ease-in-out',
        };

        if (loginBgType === 'image' && loginBgImageUrl) {
          newStyle.backgroundImage = `url("${loginBgImageUrl}")`;
          newStyle.backgroundSize = 'cover';
          newStyle.backgroundPosition = 'center';
          newStyle.backgroundRepeat = 'no-repeat';
        } else if (loginBgType === 'solid') {
          const solidColor = settingsObj.activeLoginSolidColor || loginBgColor1;
          if (solidColor) {
            newStyle.backgroundColor = solidColor.includes(' ') ? `hsl(${solidColor})` : solidColor;
          }
        } else if (loginBgType === 'gradient') {
          // Use full gradient string if available
          const loginGradient = settingsObj.activeLoginGradient;
          if (loginGradient) {
            newStyle.background = loginGradient;
          } else if (loginBgColor1 && loginBgColor2) {
            newStyle.backgroundImage = `linear-gradient(135deg, hsl(${loginBgColor1}), hsl(${loginBgColor2}))`;
          } else {
            newStyle.backgroundImage = isThemeDark ? DEFAULT_LOGIN_BG_GRADIENT_DARK : DEFAULT_LOGIN_BG_GRADIENT;
          }
        } else { // Default fallback
          newStyle.backgroundImage = isThemeDark ? DEFAULT_LOGIN_BG_GRADIENT_DARK : DEFAULT_LOGIN_BG_GRADIENT;
        }
        setLoginPageStyle(newStyle);
      };
      fetchAppAndLoginConfig();

      const handleAppConfigChange = (event: Event) => {
        fetchAppAndLoginConfig();
      };
      window.addEventListener('appConfigChanged', handleAppConfigChange);

      return () => {
        observer.disconnect();
        window.removeEventListener('appConfigChanged', handleAppConfigChange);
      };
    }
    // If initialSettings are present, set up style from them
    else {
      const desktopBgType = (initialSettings.find(s => s.key === LOGIN_BACKGROUND_TYPE_KEY)?.value || 
                             initialSettings.find(s => s.key === LEGACY_LOGIN_BG_TYPE_KEY)?.value) as LoginPageBackgroundType || 'gradient';
      setOrganizationName(initialSettings.find(s => s.key === 'organizationName')?.value || '');
      const desktopBgImageUrlRaw = initialSettings.find(s => s.key === LOGIN_BACKGROUND_IMAGE_KEY)?.value || null;
      const desktopBgImageUrl = desktopBgImageUrlRaw ? sanitizeUrl(convertMinIOUrlToSecureUrl(desktopBgImageUrlRaw, true) || '') : null;
      const desktopBgColor1 = initialSettings.find(s => s.key === LOGIN_BACKGROUND_GRADIENT_START_KEY)?.value || 
                              initialSettings.find(s => s.key === LEGACY_LOGIN_BG_COLOR1_KEY)?.value || null;
      const desktopBgColor2 = initialSettings.find(s => s.key === LOGIN_BACKGROUND_GRADIENT_END_KEY)?.value || 
                              initialSettings.find(s => s.key === LEGACY_LOGIN_BG_COLOR2_KEY)?.value || null;
      const desktopBgGradient = initialSettings.find(s => s.key === 'loginBackgroundGradient')?.value || null;
      const desktopBgSolidColor = initialSettings.find(s => s.key === LOGIN_BACKGROUND_COLOR_KEY)?.value || null;

      // Mobile specific settings
      const mobileBgType = initialSettings.find(s => s.key === LOGIN_BACKGROUND_TYPE_MOBILE_KEY)?.value as LoginPageBackgroundType || null;
      const mobileBgImageUrlRaw = initialSettings.find(s => s.key === LOGIN_BACKGROUND_IMAGE_MOBILE_KEY)?.value || null;
      const mobileBgImageUrl = mobileBgImageUrlRaw ? sanitizeUrl(convertMinIOUrlToSecureUrl(mobileBgImageUrlRaw, true) || '') : null;
      const mobileBgColor1 = initialSettings.find(s => s.key === LOGIN_BACKGROUND_GRADIENT_START_MOBILE_KEY)?.value || null;
      const mobileBgColor2 = initialSettings.find(s => s.key === LOGIN_BACKGROUND_GRADIENT_END_MOBILE_KEY)?.value || null;
      const mobileBgGradient = initialSettings.find(s => s.key === LOGIN_BACKGROUND_GRADIENT_MOBILE_KEY)?.value || null;
      const mobileBgSolidColor = initialSettings.find(s => s.key === LOGIN_BACKGROUND_COLOR_MOBILE_KEY)?.value || null;

      let loginBgType: LoginPageBackgroundType;
      let loginBgImageUrl: string | null;
      let loginBgColor1: string | null;
      let loginBgColor2: string | null;
      let activeLoginGradient: string | null;
      let activeLoginSolidColor: string | null;

      if (isMobile && mobileBgType) {
        loginBgType = mobileBgType;
        loginBgImageUrl = mobileBgImageUrl;
        loginBgColor1 = mobileBgColor1;
        loginBgColor2 = mobileBgColor2;
        activeLoginGradient = mobileBgGradient;
        activeLoginSolidColor = mobileBgSolidColor;
      } else {
        loginBgType = desktopBgType;
        loginBgImageUrl = desktopBgImageUrl;
        loginBgColor1 = desktopBgColor1;
        loginBgColor2 = desktopBgColor2;
        activeLoginGradient = desktopBgGradient;
        activeLoginSolidColor = desktopBgSolidColor;
      }

      // Set style - Only background-related styles
      const newStyle: React.CSSProperties = {
        transition: 'background 0.5s ease-in-out',
      };
      if (loginBgType === 'image' && loginBgImageUrl) {
        newStyle.backgroundImage = `url("${loginBgImageUrl}")`;
        newStyle.backgroundSize = 'cover';
        newStyle.backgroundPosition = 'center';
        newStyle.backgroundRepeat = 'no-repeat';
      } else if (loginBgType === 'solid') {
        const solidColor = activeLoginSolidColor || loginBgColor1;
        if (solidColor) {
           newStyle.backgroundColor = solidColor.includes(' ') ? `hsl(${solidColor})` : solidColor;
        }
      } else if (loginBgType === 'gradient') {
        if (activeLoginGradient) {
          newStyle.background = activeLoginGradient;
        } else if (loginBgColor1 && loginBgColor2) {
          newStyle.backgroundImage = `linear-gradient(135deg, hsl(${loginBgColor1}), hsl(${loginBgColor2}))`;
        } else {
          newStyle.backgroundImage = isThemeDark ? DEFAULT_LOGIN_BG_GRADIENT_DARK : DEFAULT_LOGIN_BG_GRADIENT;
        }
      } else {
        newStyle.backgroundImage = isThemeDark ? DEFAULT_LOGIN_BG_GRADIENT_DARK : DEFAULT_LOGIN_BG_GRADIENT;
      }
      setLoginPageStyle(newStyle);
      // Set theme/colors
      const primaryGradient = initialSettings.find(s => s.key === 'primaryGradient')?.value;
      // Legacy: fallback to start/end if full gradient not available
      let primaryStart = initialSettings.find(s => s.key === 'primaryGradientStart')?.value || DEFAULT_PRIMARY_GRADIENT_START_SIGNIN;
      let primaryEnd = initialSettings.find(s => s.key === 'primaryGradientEnd')?.value || DEFAULT_PRIMARY_GRADIENT_END_SIGNIN;
      const themePref = (initialSettings.find((s: SystemSetting) => s.key === 'appThemePreference')?.value as 'system' | 'light' | 'dark') || 'system';
      setThemeAndColors({
        themePreference: themePref,
        primaryGradient: primaryGradient || null,
        primaryGradientStart: primaryStart, // Legacy support
        primaryGradientEnd: primaryEnd, // Legacy support
      });
      const logoSizeVal = initialSettings.find(s => s.key === 'loginPageLogoSize')?.value;
      const loginPageLogoSizeSetting = logoSizeVal ? parseInt(String(logoSizeVal), 10) : 250;
      setLoginPageLogoSize(loginPageLogoSizeSetting);

      // Load evaluate header settings from initialSettings
      setEvaluateHeaderBackgroundType((initialSettings.find(s => s.key === 'evaluateHeaderBackgroundType')?.value as 'image' | 'gradient' | 'solid') || 'gradient');
      const evalBgImgRaw = initialSettings.find(s => s.key === 'evaluateHeaderBackgroundImageUrl')?.value || null;
      setEvaluateHeaderBackgroundImage(evalBgImgRaw ? sanitizeUrl(convertMinIOUrlToSecureUrl(evalBgImgRaw, true) || '') : null);

      const evalGradient = initialSettings.find(s => s.key === 'evaluateHeaderBackgroundGradient')?.value;
      if (evalGradient) {
        setEvaluateHeaderBackgroundGradient(evalGradient);
      } else {
        const start = initialSettings.find(s => s.key === 'evaluateHeaderBackgroundGradientStart')?.value;
        const end = initialSettings.find(s => s.key === 'evaluateHeaderBackgroundGradientEnd')?.value;
        if (start && end) {
          setEvaluateHeaderBackgroundGradient(`linear-gradient(135deg, hsl(${start}), hsl(${end}))`);
        } else {
          setEvaluateHeaderBackgroundGradient(`linear-gradient(135deg, hsl(179 67% 66%), hsl(238 74% 61%))`);
        }
      }

      setEvaluateHeaderBackgroundColor(initialSettings.find(s => s.key === 'evaluateHeaderBackgroundColor')?.value || '220 25% 97%');
      setEvaluateHeaderTextColor(initialSettings.find(s => s.key === 'evaluateHeaderTextColor')?.value || '0 0% 0%');

      // Load mobile header colors from initialSettings
      setMobileHeaderGradient1(initialSettings.find(s => s.key === 'mobileHeaderGradient1')?.value || '#3B82F6');
      setMobileHeaderGradient2(initialSettings.find(s => s.key === 'mobileHeaderGradient2')?.value || '#2563EB');
      setMobileHeaderGradient3(initialSettings.find(s => s.key === 'mobileHeaderGradient3')?.value || '#1D4ED8');
      setMobileHeaderGradient4(initialSettings.find(s => s.key === 'mobileHeaderGradient4')?.value || '#1E40AF');
      setMobileHeaderFontColor(initialSettings.find(s => s.key === 'mobileHeaderFontColor')?.value || '#FFFFFF');
      setMobileHeaderBackgroundType((initialSettings.find(s => s.key === 'mobileHeaderBackgroundType')?.value as 'gradient' | 'transparent' | 'solid') || 'gradient');
      setMobileLoginLogoDataUrl(initialSettings.find(s => s.key === 'mobileLoginLogoDataUrl')?.value || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isThemeDark, initialSettings]);

  // Set browser tab title to currentAppName
  useEffect(() => {
    if (typeof document !== 'undefined' && currentAppName) {
      document.title = currentAppName;
    }
  }, [currentAppName]);

  // Dev Tools and Right-Click Protection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if protection is enabled
    // Note: loginPageDevToolsProtectionEnabled defaults to true
    // rightClickProtectionEnabled is a global setting that also affects the login page
    const loginProtection = initialSettings?.find(s => s.key === 'loginPageDevToolsProtectionEnabled')?.value !== 'false';
    const globalRightClickProtection = initialSettings?.find(s => s.key === 'rightClickProtectionEnabled')?.value === 'true';

    const shouldDisableRightClick = loginProtection || globalRightClickProtection;
    const shouldDisableDevTools = loginProtection;

    if (!shouldDisableRightClick && !shouldDisableDevTools) return;

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      if (shouldDisableRightClick) {
        e.preventDefault();
        return false;
      }
    };

    // Disable common dev tools keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!shouldDisableDevTools) return;

      // F12 - Dev tools
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I - Inspect element
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+J - Console
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+C - Inspect element
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
      }
      // Ctrl+U - View source
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [initialSettings]);

  // Main redirect effect - handles authenticated users on signin page
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only run redirect logic if we're on the signin page
    if (window.location.pathname !== '/auth/signin') {
      // Reset redirect flag when not on signin page (for future visits)
      redirectAttemptedRef.current = false;
      return;
    }

    // If redirect already attempted, don't try again (prevents loops)
    if (redirectAttemptedRef.current) {
      return;
    }

    // Read search params directly from URL to avoid dependency issues
    const urlParams = new URLSearchParams(window.location.search);

    // Check if this is a signout redirect - if so, don't redirect back
    const isSignoutRedirect = urlParams.get('signout') === 'true';
    if (isSignoutRedirect) {
      // Clear the signout parameter from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('signout');
      window.history.replaceState({}, '', url.toString());
      return;
    }

    // Only proceed if authenticated - don't check API on every render
    if (status !== 'authenticated' || !session?.user?.id) {
      return;
    }

    // Get callback URL from query params
    const hasCallbackUrl = urlParams.get('callbackUrl');
    const rawRedirectUrl = hasCallbackUrl || '/';

    // SECURITY: Validate redirect URL to prevent open redirect attacks
    // Only allow relative URLs starting with / (not // or absolute URLs)
    // Also prevent redirecting to /auth/signin itself to avoid loops
    let redirectUrl = rawRedirectUrl.startsWith('/') && !rawRedirectUrl.startsWith('//')
      ? rawRedirectUrl
      : '/';

    // Prevent redirect loop - never redirect to signin page
    if (redirectUrl === '/auth/signin' || redirectUrl.startsWith('/auth/signin?')) {
      redirectUrl = '/';
    }

    // Additional safety: If callbackUrl is just '/', ensure we're not in a loop
    // by checking if we've been redirected here multiple times
    if (redirectUrl === '/' && hasCallbackUrl === '/') {
      // Check session storage to detect potential loops
      const redirectCount = sessionStorage.getItem('signin_redirect_count');
      if (redirectCount && parseInt(redirectCount) > 2) {
        // Too many redirects, stop trying
        console.warn('[SIGNIN CLIENT] Redirect loop detected, stopping redirect attempts');
        sessionStorage.removeItem('signin_redirect_count');
        redirectAttemptedRef.current = true;
        return;
      }
      // Increment redirect count
      const newCount = (parseInt(redirectCount || '0') + 1).toString();
      sessionStorage.setItem('signin_redirect_count', newCount);
    } else {
      // Clear redirect count if we have a different callback URL
      sessionStorage.removeItem('signin_redirect_count');
    }

    // Mark redirect as attempted immediately to prevent re-triggering
    redirectAttemptedRef.current = true;

    // Small delay to ensure session cookie is set before redirect
    // This helps prevent middleware from not detecting the session
    setTimeout(() => {
      // SECURITY: Use safeRedirect for validated redirection
      safeRedirect(redirectUrl, '/');
    }, 100); // Small delay to ensure cookies are set
  }, [status, session]); // Removed nextSearchParams from dependencies to prevent re-triggers

  // Use backend-provided Azure AD config status
  const [isAzureAdConfigured, setIsAzureAdConfigured] = useState<boolean>(false);
  const [basicAuthEnabled, setBasicAuthEnabled] = useState<boolean>(true); // Default to enabled

  useEffect(() => {
    async function fetchAzureAdConfig() {
      try {
        const res = await fetch('/api/settings/system-settings');
        if (res.ok) {
          const data = await res.json();

          // Handle both response formats (GET returns {settings: [...], isAzureAdConfigured: boolean})
          let settings: any = {};
          if (data.settings && Array.isArray(data.settings)) {
            // Convert array format to object format
            settings = Object.fromEntries(data.settings.map((setting: any) => [setting.key, setting.value]));
            // For Azure AD config, we need to check the original data object
            setIsAzureAdConfigured(data.isAzureAdConfigured === true || data.isAzureAdConfigured === 'true');
            // Check basicAuthEnabled setting (default to true if not set)
            setBasicAuthEnabled(settings.basicAuthEnabled !== 'false');
          } else {
            // Already in object format
            settings = data;
            setIsAzureAdConfigured(settings.isAzureAdConfigured === true || settings.isAzureAdConfigured === 'true');
            // Check basicAuthEnabled setting (default to true if not set)
            setBasicAuthEnabled(settings.basicAuthEnabled !== 'false');
          }
        }
      } catch (e) {
        // Optionally handle error
        setIsAzureAdConfigured(false);
        setBasicAuthEnabled(true); // Default to enabled on error
      }
    }
    fetchAzureAdConfig();
  }, []);


  const errorParam = nextSearchParams.get('error');
  let errorMessage = '';
  if (errorParam) {
    if (errorParam === "CredentialsSignin") {
      errorMessage = "Invalid email or password. Please try again.";
    } else if (errorParam === "SessionExpired") {
      errorMessage = "Your session has expired. Please sign in again.";
    } else if (errorParam === "Configuration") {
      // "Configuration" error usually indicates a credentials issue in some NextAuth versions/configs
      // or a server config issue, but for security/UX we should show a generic login error
      errorMessage = "Invalid email or password. Please try again.";
    } else if (errorParam === "OAuthSignin" || errorParam === "OAuthCallback" || errorParam === "OAuthCreateAccount" || errorParam === "EmailCreateAccount" || errorParam === "Callback" || errorParam === "OAuthAccountNotLinked" || errorParam === "EmailSignin" || errorParam === "SessionRequired") {
      errorMessage = "There was an error signing in with Azure AD. Please try again or contact support.";
    } else {
      errorMessage = decodeURIComponent(errorParam as string);
    }
  }

  // Extract loginPageContent and loginPageFooter from settings
  const loginPageContent = initialSettings?.find(s => s.key === 'loginPageContent')?.value || '';
  const loginPageFooter = initialSettings?.find(s => s.key === 'loginPageFooter')?.value || '';

  // Listen for appConfigChanged and force re-render
  useEffect(() => {
    const handleAppConfigChange = () => {
      // Just force a re-render by updating a dummy state
      setAppLogoUrl(prev => prev ? prev + '' : prev);
      setLoginLayoutType(prev => prev ? prev : DEFAULT_LOGIN_LAYOUT_TYPE);
      setLoginPageLogoSize(prev => prev ? prev : DEFAULT_LOGIN_PAGE_LOGO_SIZE);
      // Optionally, you can refetch settings or reload the page if needed
    };
    window.addEventListener('appConfigChanged', handleAppConfigChange);
    return () => window.removeEventListener('appConfigChanged', handleAppConfigChange);
  }, []);

  // Determine active colors from settings
  const getActiveColors = () => {
    let activeFontColor = '';
    let activeBgStart = '';
    let activeBgEnd = '';
    if (initialSettings) {
      // Use primary gradient colors as the source of truth for sidebar active colors
      const primaryGradient = initialSettings.find(s => s.key === 'primaryGradient')?.value;
      const primaryGradientStart = initialSettings.find(s => s.key === 'primaryGradientStart')?.value;
      const primaryGradientEnd = initialSettings.find(s => s.key === 'primaryGradientEnd')?.value;

      // Parse gradient to get start/end if full gradient is available
      let parsedStart = primaryGradientStart || DEFAULT_PRIMARY_GRADIENT_START_SIGNIN;
      let parsedEnd = primaryGradientEnd || DEFAULT_PRIMARY_GRADIENT_END_SIGNIN;
      if (primaryGradient) {
        const match = primaryGradient.match(/linear-gradient\([^,]+,\s*(.+)\)/);
        if (match) {
          const stopsStr = match[1];
          const colorMatches = Array.from(stopsStr.matchAll(/(#[0-9A-Fa-f]{6})\s+(\d+)%/g));
          if (colorMatches.length >= 2) {
            const sorted = colorMatches.sort((a, b) => parseInt(a[2]) - parseInt(b[2]));
            // Convert first and last hex to HSL (simplified - using defaults if conversion fails)
            parsedStart = primaryGradientStart || DEFAULT_PRIMARY_GRADIENT_START_SIGNIN;
            parsedEnd = primaryGradientEnd || DEFAULT_PRIMARY_GRADIENT_END_SIGNIN;
          }
        }
      }

      if (isThemeDark) {
        activeFontColor = initialSettings.find(s => s.key === 'sidebarActiveTextD')?.value || '#fff';
        activeBgStart = parsedStart;
        activeBgEnd = parsedEnd;
      } else {
        activeFontColor = initialSettings.find(s => s.key === 'sidebarActiveTextL')?.value || '#fff';
        activeBgStart = parsedStart;
        activeBgEnd = parsedEnd;
      }
    } else {
      // fallback to CSS variables or defaults
      activeFontColor = '#fff';
      activeBgStart = DEFAULT_PRIMARY_GRADIENT_START_SIGNIN;
      activeBgEnd = DEFAULT_PRIMARY_GRADIENT_END_SIGNIN;
    }
    return { activeFontColor, activeBgStart, activeBgEnd };
  };
  const { activeFontColor, activeBgStart, activeBgEnd } = getActiveColors();


  if (status === "loading" || !isClient) {
    return (
      <div className="flex h-full min-flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-sky-100 dark:from-slate-900 dark:to-sky-900 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading authentication...</p>
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <div className="flex h-full min-flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-sky-100 dark:from-slate-900 dark:to-sky-900 p-4">
        <p className="text-lg font-medium">Redirecting to dashboard...</p>
        <Loader2 className="h-8 w-8 animate-spin text-primary mt-2" />
        <p className="mt-2 text-sm text-muted-foreground">Please wait while we redirect you</p>
      </div>
    );
  }

  // Main Desktop/Tablet View
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
    <div
      className="relative min-h-[100dvh] h-[100dvh] w-full overflow-hidden"
      style={{
        ...loginPageStyle,
        fontFamily: 'var(--font-inter), sans-serif',
      }}
    >
      <div className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(110deg,rgba(248,250,252,0.06),rgba(15,23,42,0.08))]" />
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.18),transparent_32%)]" />

      <div className="relative z-10 flex h-full w-full flex-col md:flex-row">
        <div className="hidden md:flex flex-1 items-center px-12 lg:px-20">
          <div className="max-w-3xl space-y-6 text-slate-900 dark:text-white">
            <div className="flex items-center gap-4">
              {isClient && (() => {
                let logoToUse = appLogoUrl;
                if (isThemeDark && contextualLogos.loginPageLogoDarkMode && contextualLogos.loginPageLogoDarkMode.trim() !== '') {
                  logoToUse = contextualLogos.loginPageLogoDarkMode;
                } else if (!isThemeDark && contextualLogos.loginPageLogoLightMode && contextualLogos.loginPageLogoLightMode.trim() !== '') {
                  logoToUse = contextualLogos.loginPageLogoLightMode;
                }
                const secureLogoUrl = logoToUse ? sanitizeUrl(convertMinIOUrlToSecureUrl(logoToUse, true) || '') : null;

                return secureLogoUrl ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-white/70 shadow-xl dark:bg-white/10">
                    <Image
                      src={secureLogoUrl}
                      alt={currentAppName}
                      fill
                      unoptimized
                      sizes="64px"
                      className="object-contain p-2"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-xl font-bold shadow-xl dark:border-white/10 dark:bg-white/10">
                    {currentAppName.slice(0, 2).toUpperCase()}
                  </div>
                );
              })()}
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-600/80 dark:text-white/60">Welcome back</p>
                <h1 className="text-4xl font-bold tracking-tight lg:text-6xl">{currentAppName}</h1>
              </div>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-slate-700/85 dark:text-white/75 lg:text-2xl">
              Access your workspace, review candidates, and keep hiring workflows moving from one secure console.
            </p>
          </div>
        </div>

        <div className={`flex w-full items-center justify-center px-4 py-6 md:w-[46%] md:min-w-[420px] md:px-6 lg:px-8 ${loginLayoutType === '2column' ? 'md:justify-end' : 'md:justify-center'}`}>
          <div className="w-full max-w-[580px]">
            {/* Mobile Header (Hidden on Desktop) */}
        <div className="block md:hidden py-6 flex items-center justify-start gap-4 px-6 sm:px-10 flex-shrink-0 w-full mb-4">






           {isClient && (() => {
             // Mobile Logo Logic
            let logoToUse = appLogoUrl;
            if (isThemeDark && contextualLogos.loginPageLogoDarkMode && contextualLogos.loginPageLogoDarkMode.trim() !== '') {
              logoToUse = contextualLogos.loginPageLogoDarkMode;
            } else if (!isThemeDark && contextualLogos.loginPageLogoLightMode && contextualLogos.loginPageLogoLightMode.trim() !== '') {
              logoToUse = contextualLogos.loginPageLogoLightMode;
            }
            const secureLogoUrl = logoToUse ? sanitizeUrl(convertMinIOUrlToSecureUrl(logoToUse, true) || '') : null;

            return secureLogoUrl ? (
              <div className="relative h-8 w-20 sm:h-10 sm:w-24">
                <Image
                  src={secureLogoUrl}
                  alt="App Logo"
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 80px, 96px"
                  className="rounded-md object-contain"
                />
              </div>
            ) : (
              <div className="bg-gradient-to-br from-primary to-primary/80 rounded-md flex items-center justify-center" style={{ width: '40px', height: '40px' }}>
                <span className="text-sm font-bold text-primary-foreground">CT</span>
              </div>
            );
           })()}
           <div>
            <div className="text-xs sm:text-sm uppercase tracking-wide opacity-80 font-medium text-foreground">Welcome to</div>
             <h1 className="text-xl sm:text-3xl font-semibold leading-tight text-foreground">
               {currentAppName}
             </h1>
           </div>

        </div>

        {/* Login Card Panel - Single Unified Card */}
        <Card className="flex w-full flex-col overflow-hidden border border-slate-200/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-white md:min-h-[calc(100dvh-3rem)] md:rounded-[2rem]">
          <CardContent className="flex flex-1 flex-col justify-center space-y-6 overflow-y-auto p-6 sm:p-8 md:px-10">
            {!showLogoOnly && (
              <div className="space-y-2 text-center">
                <CardTitle className="text-3xl font-bold tracking-tight text-foreground">Sign in</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Continue to {currentAppName}
                </CardDescription>
              </div>
            )}

             {errorMessage && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/50 dark:border-red-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {basicAuthEnabled && (
              <CredentialsSignInForm 
                activeFontColor={activeFontColor} 
                activeBgStart={activeBgStart} 
                activeBgEnd={activeBgEnd} 
                onStageChange={setLoginStage}
              />
            )}

            {(isAzureAdConfigured && loginStage === 'email') && (
              <div className="mt-2">
                 {(basicAuthEnabled) && (
                    <div className="relative mb-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/50" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                      </div>
                    </div>
                 )}
                 <AzureAdSignInButton />
              </div>
            )}

              {/* Footer */}
             {(loginPageFooter || organizationName) && (
               <div className="mt-4 text-center space-y-1">
                 {loginPageFooter && (
                   <p className="text-xs text-muted-foreground">
                     {loginPageFooter}
                   </p>
                 )}
                 {organizationName && (
                   <p className="text-[10px] text-muted-foreground/60">
                     &copy; {new Date().getFullYear()} {organizationName}. All rights reserved.
                   </p>
                 )}
               </div>
             )}
          </CardContent>
        </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
