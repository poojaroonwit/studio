"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AzureAdSignInButton } from "@/components/auth/AzureAdSignInButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import Image from 'next/image';
import { CredentialsSignInForm } from "@/components/auth/CredentialsSignInForm";
import type { SystemSetting, LoginPageBackgroundType, LoginPageLayoutType } from '@/lib/types';
import { setThemeAndColors } from '@/lib/themeUtils';
import { sanitizeHtml } from '@/lib/utils';
import { convertMinIOUrlToSecureUrl } from '@/lib/imageUtils';

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

// Login background settings keys
const LOGIN_BACKGROUND_TYPE_KEY = 'loginPageBackgroundType';
const LOGIN_BACKGROUND_IMAGE_KEY = 'loginPageBackgroundImageUrl';
const LOGIN_BACKGROUND_GRADIENT_START_KEY = 'loginPageBackgroundColor1';
const LOGIN_BACKGROUND_GRADIENT_END_KEY = 'loginPageBackgroundColor2';
const LOGIN_BACKGROUND_COLOR_KEY = 'loginPageBackgroundColor1';

export default function SignInClient({ initialSettings }: SignInClientProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
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

  // SECURITY: Validate callback URL to prevent open redirect attacks
  const rawCallbackUrl = nextSearchParams.get('callbackUrl');
  // Only allow relative URLs starting with / (not // or absolute URLs)
  const callbackUrl = rawCallbackUrl && rawCallbackUrl.startsWith('/') && !rawCallbackUrl.startsWith('//') 
    ? rawCallbackUrl 
    : '/';

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

        try {
          const response = await fetch('/api/settings/system-settings');
          if (response.ok) {
            const data = await response.json();
            
            // Handle both response formats (GET returns {settings: [...], isAzureAdConfigured: boolean})
            let settings: any = {};
            if (data.settings && Array.isArray(data.settings)) {
              // Convert array format to object format
              settings = Object.fromEntries(data.settings.map((setting: any) => [setting.key, setting.value]));
            } else {
              // Already in object format
              settings = data;
            }
            
            appName = settings.appName || DEFAULT_APP_NAME;
            logoUrl = settings.appLogoDataUrl || null;
            
            // Load contextual logos
            const contextualLogoData = {
              loginPageLogoLightMode: settings.loginPageLogoLightMode || null,
              loginPageLogoDarkMode: settings.loginPageLogoDarkMode || null,
            };
            setContextualLogos(contextualLogoData);
            
            loginBgType = settings[LOGIN_BACKGROUND_TYPE_KEY] as LoginPageBackgroundType || 'gradient';
            const loginBgImageUrlRaw = settings[LOGIN_BACKGROUND_IMAGE_KEY] || null;
            // Convert MinIO URLs to public endpoints (login page doesn't require auth)
            loginBgImageUrl = loginBgImageUrlRaw ? convertMinIOUrlToSecureUrl(loginBgImageUrlRaw, true) : null;
            loginBgColor1 = settings[LOGIN_BACKGROUND_GRADIENT_START_KEY] || null;
            loginBgColor2 = settings[LOGIN_BACKGROUND_GRADIENT_END_KEY] || null;
            loginLayoutTypeSetting = settings.loginPageLayoutType as LoginPageLayoutType || DEFAULT_LOGIN_LAYOUT_TYPE;
            primaryStart = settings.primaryGradientStart || DEFAULT_PRIMARY_GRADIENT_START_SIGNIN;
            primaryEnd = settings.primaryGradientEnd || DEFAULT_PRIMARY_GRADIENT_END_SIGNIN;
            loginPageLogoSizeSetting = settings.loginPageLogoSize || DEFAULT_LOGIN_PAGE_LOGO_SIZE;

            setCurrentAppName(appName);
            setAppLogoUrl(logoUrl);
            setShowLogoOnly(settings.showLogoOnly === 'true' || settings.showLogoOnly === true);
            setLoginLayoutType(loginLayoutTypeSetting);
            setLoginPageLogoSize(loginPageLogoSizeSetting);
            
            // Debug logging

            // Apply primary colors and theme dynamically for login page
            if (typeof document !== 'undefined') {
              const themePref = (settings.appThemePreference as 'system' | 'light' | 'dark') || 'system';
              const primaryGradient = settings.primaryGradient;
              setThemeAndColors({
                themePreference: themePref,
                primaryGradient: primaryGradient || null,
                primaryGradientStart: primaryStart, // Legacy support
                primaryGradientEnd: primaryEnd, // Legacy support
              });
            }
          }
        } catch (error) {
          console.warn("Failed to fetch system settings for login page, using defaults/localStorage.", error);
          // Fallback to localStorage for app name/logo if API fails
          appName = localStorage.getItem(APP_CONFIG_APP_NAME_KEY) || DEFAULT_APP_NAME;
          logoUrl = localStorage.getItem(APP_LOGO_DATA_URL_KEY) || null;
        }
        
        // Determine login page style
        const newStyle: React.CSSProperties = {
          minHeight: '100vh',
          height: '100%',
          display: 'flex',
          flexDirection: loginLayoutTypeSetting === '2column' ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          transition: 'background 0.5s ease-in-out',
        };

        if (loginBgType === 'image' && loginBgImageUrl) {
          newStyle.backgroundImage = `url(${loginBgImageUrl})`;
          newStyle.backgroundSize = 'cover';
          newStyle.backgroundPosition = 'center';
          newStyle.backgroundRepeat = 'no-repeat';
        } else if (loginBgType === 'color' && loginBgColor1) {
          newStyle.backgroundColor = `hsl(${loginBgColor1})`;
        } else if (loginBgType === 'gradient' && loginBgColor1 && loginBgColor2) {
          newStyle.backgroundImage = `linear-gradient(135deg, hsl(${loginBgColor1}), hsl(${loginBgColor2}))`;
        } else { // Default
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
      let loginBgType: LoginPageBackgroundType = initialSettings.find(s => s.key === LOGIN_BACKGROUND_TYPE_KEY)?.value as LoginPageBackgroundType || 'gradient';
      const loginBgImageUrlRaw = initialSettings.find(s => s.key === LOGIN_BACKGROUND_IMAGE_KEY)?.value || null;
      // Convert MinIO URLs to public endpoints (login page doesn't require auth)
      let loginBgImageUrl: string | null = loginBgImageUrlRaw ? convertMinIOUrlToSecureUrl(loginBgImageUrlRaw, true) : null;
      let loginBgColor1: string | null = initialSettings.find(s => s.key === LOGIN_BACKGROUND_GRADIENT_START_KEY)?.value || null;
      let loginBgColor2: string | null = initialSettings.find(s => s.key === LOGIN_BACKGROUND_GRADIENT_END_KEY)?.value || null;
      let loginLayoutTypeSetting: LoginPageLayoutType = (initialSettings.find(s => s.key === 'loginPageLayoutType')?.value as LoginPageLayoutType) || DEFAULT_LOGIN_LAYOUT_TYPE;
              let loginPageLogoSizeSetting: number = parseInt(initialSettings.find(s => s.key === LOGIN_PAGE_LOGO_SIZE_KEY)?.value || DEFAULT_LOGIN_PAGE_LOGO_SIZE.toString());
      // Set style
      const newStyle: React.CSSProperties = {
        minHeight: '100vh',
        height: '100%',
        display: 'flex',
        flexDirection: loginLayoutTypeSetting === '2column' ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        transition: 'background 0.5s ease-in-out',
      };
      if (loginBgType === 'image' && loginBgImageUrl) {
        newStyle.backgroundImage = `url(${loginBgImageUrl})`;
        newStyle.backgroundSize = 'cover';
        newStyle.backgroundPosition = 'center';
        newStyle.backgroundRepeat = 'no-repeat';
      } else if (loginBgType === 'color' && loginBgColor1) {
        newStyle.backgroundColor = `hsl(${loginBgColor1})`;
      } else if (loginBgType === 'gradient') {
        // Try to use full gradient string first
        const loginGradient = initialSettings.find(s => s.key === 'loginBackgroundGradient')?.value;
        if (loginGradient) {
          newStyle.background = loginGradient;
        } else if (loginBgColor1 && loginBgColor2) {
          // Legacy: fallback to start/end
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
      setLoginPageLogoSize(loginPageLogoSizeSetting);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isThemeDark, initialSettings]);

  // Set browser tab title to currentAppName
  useEffect(() => {
    if (typeof document !== 'undefined' && currentAppName) {
      document.title = currentAppName;
    }
  }, [currentAppName]);

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
      // Perform redirect - use window.location directly for reliability
      // This ensures a full page navigation and prevents any client-side routing issues
      try {
        // Use window.location.replace to avoid adding to history (prevents back button issues)
        window.location.replace(redirectUrl);
      } catch (error) {
        console.error('[SIGNIN CLIENT] Redirect error:', error);
        // Last resort fallback
        window.location.href = redirectUrl;
      }
    }, 100); // Small delay to ensure cookies are set
  }, [status, session, router]); // Removed nextSearchParams from dependencies to prevent re-triggers

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
  const errorDescription = nextSearchParams.get('errorDescription');
  let errorMessage = '';
  if (errorParam) {
    if (errorParam === "CredentialsSignin") {
      errorMessage = "Invalid email or password. Please try again.";
    } else if (errorParam === "SessionExpired") {
      errorMessage = "Your session has expired. Please sign in again.";
    } else if (errorParam === "Configuration") {
      // Use the errorDescription if provided, otherwise use a generic message
      errorMessage = errorDescription 
        ? decodeURIComponent(errorDescription)
        : "There is a problem with the server configuration. Check the server logs for more information.";
    } else if (errorParam === "OAuthSignin" || errorParam === "OAuthCallback" || errorParam === "OAuthCreateAccount" || errorParam === "EmailCreateAccount" || errorParam === "Callback" || errorParam === "OAuthAccountNotLinked" || errorParam === "EmailSignin" || errorParam === "SessionRequired") {
      errorMessage = "There was an error signing in with Azure AD. Please try again or contact support.";
    } else {
      errorMessage = decodeURIComponent(errorParam as string);
    }
  }

  // Extract loginPageContent and loginPageFooter from settings
  const loginPageContent = initialSettings?.find(s => s.key === 'loginPageContent')?.value || '';
  const loginPageFooter = initialSettings?.find(s => s.key === 'loginPageFooter')?.value || 'By signing in, you agree to our Terms of Service and Privacy Policy';

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

  // Render login form based on layout type
  const renderLoginForm = () => (
    <Card className="w-full max-w-md bg-card dark:bg-card">
      <CardHeader className="flex flex-col items-center justify-center text-center">
        {isClient && (() => {
          // Determine which logo to use based on theme
          let logoToUse = appLogoUrl;
          if (isThemeDark && contextualLogos.loginPageLogoDarkMode && contextualLogos.loginPageLogoDarkMode.trim() !== '') {
            logoToUse = contextualLogos.loginPageLogoDarkMode;
          } else if (!isThemeDark && contextualLogos.loginPageLogoLightMode && contextualLogos.loginPageLogoLightMode.trim() !== '') {
            logoToUse = contextualLogos.loginPageLogoLightMode;
          }
          
          // Convert MinIO URLs to public endpoints (login page doesn't require auth)
          const secureLogoUrl = logoToUse ? convertMinIOUrlToSecureUrl(logoToUse, true) : null;
          
          return secureLogoUrl ? (
            <Image
              src={secureLogoUrl}
              alt="Application Logo"
              width={80}
              height={80}
              className="rounded-md mb-2"
            />
          ) : null;
        })()}
        <CardTitle className="mt-0 text-2xl font-bold">{currentAppName}</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        {basicAuthEnabled && (
          <CredentialsSignInForm activeFontColor={activeFontColor} activeBgStart={activeBgStart} activeBgEnd={activeBgEnd} />
        )}
        {basicAuthEnabled && isAzureAdConfigured && (
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
        {!basicAuthEnabled && isAzureAdConfigured && (
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
      </CardContent>
    </Card>
  );

  if (loginLayoutType === '2column') {
    // Get the background image URL from settings
    const loginBgImageUrlRaw = initialSettings?.find(s => s.key === 'loginPageBackgroundImageUrl')?.value || null;
    // Convert MinIO URLs to public endpoints (login page doesn't require auth)
    const loginBgImageUrl = loginBgImageUrlRaw ? convertMinIOUrlToSecureUrl(loginBgImageUrlRaw, true) : null;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row' }} className="h-full min-flex flex-row">
        {/* Left column: Image from settings, centered and contained, with overlay */}
        <div className="hidden lg:flex flex-col items-center justify-center relative basis-[60%] max-w-[60%] bg-muted overflow-hidden">
          {loginBgImageUrl && (
            <>
              <img
                src={loginBgImageUrl}
                alt="Login Visual"
                className="w-full h-full object-cover mx-auto z-10"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  console.error('[SIGNIN] Background image failed to load:', {
                    url: loginBgImageUrl,
                    original: loginBgImageUrlRaw
                  });
                }}
              />
              {/* Overlay for contrast */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent z-20 pointer-events-none" />
            </>
          )}
        </div>

        {/* Right column: Login panel (40%) */}
        <div className="w-full lg:basis-[40%] lg:max-w-[40%] flex flex-col justify-center items-center bg-background shadow-2xl p-8 lg:p-12 h-full min-h-screen">
          <div className="w-full max-w-md">
            {loginPageContent && (
              <div className="mb-8 text-center" dangerouslySetInnerHTML={{ __html: sanitizeHtml(loginPageContent) }} />
            )}
            {/* Application Logo and Name */}
            <div className="text-center mb-8">
              {isClient && (() => {
                // Determine which logo to use based on theme
                let logoToUse = appLogoUrl;
                if (isThemeDark && contextualLogos.loginPageLogoDarkMode && contextualLogos.loginPageLogoDarkMode.trim() !== '') {
                  logoToUse = contextualLogos.loginPageLogoDarkMode;
                } else if (!isThemeDark && contextualLogos.loginPageLogoLightMode && contextualLogos.loginPageLogoLightMode.trim() !== '') {
                  logoToUse = contextualLogos.loginPageLogoLightMode;
                }
                
                // Convert MinIO URLs to public endpoints (login page doesn't require auth)
                const secureLogoUrl = logoToUse ? convertMinIOUrlToSecureUrl(logoToUse, true) : null;
                
                return secureLogoUrl ? (
                  <img
                    src={secureLogoUrl}
                    alt="Application Logo"
                    width={loginPageLogoSize}
                    height={loginPageLogoSize}
                    className="rounded-xl mx-auto mb-4 feature-icon"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-xl mx-auto mb-4 flex items-center justify-center feature-icon">
                    <span className="text-2xl font-bold text-primary-foreground">CT</span>
                  </div>
                );
              })()}
              {!showLogoOnly && (
                <h2 className="text-2xl font-bold text-foreground">{currentAppName}</h2>
              )}
            </div>

                {errorMessage && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/50 dark:border-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Authentication Error</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
                {basicAuthEnabled && (
                  <CredentialsSignInForm activeFontColor={activeFontColor} activeBgStart={activeBgStart} activeBgEnd={activeBgEnd} />
                )}
                {basicAuthEnabled && isAzureAdConfigured && (
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
                {!basicAuthEnabled && isAzureAdConfigured && (
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
         
            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-muted-foreground">
                {loginPageFooter}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: center box layout
  return (
    <div style={loginPageStyle} className="h-full min-flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {loginPageContent && (
          <div className="mb-8 text-center" dangerouslySetInnerHTML={{ __html: sanitizeHtml(loginPageContent) }} />
        )}
        
        {/* Logo and Brand */}
        <div className="text-center mb-8 login-transition">
          {isClient && (() => {
            // Determine which logo to use based on theme
            let logoToUse = appLogoUrl;
            if (isThemeDark && contextualLogos.loginPageLogoDarkMode && contextualLogos.loginPageLogoDarkMode.trim() !== '') {
              logoToUse = contextualLogos.loginPageLogoDarkMode;
            } else if (!isThemeDark && contextualLogos.loginPageLogoLightMode && contextualLogos.loginPageLogoLightMode.trim() !== '') {
              logoToUse = contextualLogos.loginPageLogoLightMode;
            }
            
            // Convert MinIO URLs to public endpoints (login page doesn't require auth)
            const secureLogoUrl = logoToUse ? convertMinIOUrlToSecureUrl(logoToUse, true) : null;
            
            return secureLogoUrl ? (
              <img
                src={secureLogoUrl}
                alt="Application Logo"
                width={loginPageLogoSize}
                height={loginPageLogoSize}
                className="rounded-2xl mx-auto mb-6 feature-icon"
              />
            ) : (
              <div 
                className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl mx-auto mb-6 flex items-center justify-center feature-icon"
                style={{
                  width: `${loginPageLogoSize}px`,
                  height: `${loginPageLogoSize}px`,
                }}
              >
                <span className="text-3xl font-bold text-primary-foreground">CT</span>
              </div>
            );
          })()}
          {!showLogoOnly && (
            <>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent mb-2">
                {currentAppName}
              </h1>
              <p className="text-lg text-muted-foreground">
                Professional Recruitment Management
              </p>
            </>
          )}
        </div>

        <Card className="w-full bg-card/50 backdrop-blur-sm border border-border/50 pro-card-shadow login-transition">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-foreground">Welcome back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {errorMessage && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/50 dark:border-red-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            {basicAuthEnabled && (
              <CredentialsSignInForm activeFontColor={activeFontColor} activeBgStart={activeBgStart} activeBgEnd={activeBgEnd} />
            )}
            
            {basicAuthEnabled && isAzureAdConfigured && (
              <div className="mt-4">
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card/50 px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                <AzureAdSignInButton />
              </div>
            )}
            {!basicAuthEnabled && isAzureAdConfigured && (
              <div className="mt-4">
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card/50 px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                <AzureAdSignInButton />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            {loginPageFooter}
          </p>
        </div>
      </div>
    </div>
  );
} 