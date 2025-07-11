"use client";

import React, { type ReactNode, useState, useEffect } from "react";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent } from "@/components/ui/sidebar";
import { Header } from "./Header";
import { useSession } from "next-auth/react";
import { GlobalLoadingOverlay } from "./GlobalLoadingOverlay";
import { usePageLoading } from "@/hooks/use-page-loading";
import { useSessionValidation } from "@/hooks/use-session-validation";
import SidebarNav from "./SidebarNav";
import { SidebarStyleInitializer } from "./SidebarStyleInitializer";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from 'next/image';
import { Package2 } from "lucide-react";
import packageJson from '../../../package.json';
import { setThemeAndColors } from '@/lib/themeUtils';

const APP_LOGO_DATA_URL_KEY = 'appLogoDataUrl';
const APP_CONFIG_APP_NAME_KEY = 'appConfigAppName';
const DEFAULT_APP_NAME = "CandiTrack";
const DEFAULT_LOGO_ICON = <Package2 className="h-6 w-6" />;

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/candidates")) { 
    if (pathname === "/candidates/upload") {
      return "Bulk Upload";
    }
    if (pathname.split('/').length === 3 && pathname.split('/')[2] !== '' && !pathname.includes('create-via-automation')) {
        return "Candidate Details";
    }
    return "Candidates";
  }
  if (pathname.startsWith("/positions")) {
     if (pathname.split('/').length === 3 && pathname.split('/')[2] !== '') {
        return "Position Details";
    }
    return "Job Positions";
  }
  if (pathname.startsWith("/users")) return "Manage Users";
  if (pathname.startsWith("/my-tasks")) return "My Task Board";
  if (pathname.startsWith("/settings/preferences")) return "Preferences";
      if (pathname.startsWith("/settings/system-settings")) return "Integrations";
  if (pathname.startsWith("/settings/stages")) return "Recruitment Stages";
  if (pathname.startsWith("/settings/data-models")) return "Data Model Preferences";
  if (pathname.startsWith("/settings/custom-fields")) return "Custom Field Definitions";
  if (pathname.startsWith("/settings/webhook-mapping")) return "Webhook Payload Mapping";
  if (pathname.startsWith("/settings/user-groups")) return "User Groups"; // New
  if (pathname.startsWith("/api-docs")) return "API Documentation";
  if (pathname.startsWith("/logs")) return "Application Logs";
  if (pathname.startsWith("/auth/signin")) return "Sign In";
  return DEFAULT_APP_NAME; // Use dynamic app name as fallback for unknown paths
}

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [currentAppName, setCurrentAppName] = useState<string>(DEFAULT_APP_NAME);
  const pageTitle = pathname === "/auth/signin" ? "Sign In" : getPageTitle(pathname) || currentAppName; // Use currentAppName in title if needed
  
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);

  const { data: session, status } = useSession();
  const isLoading = usePageLoading();
  
  // Add session validation - only validate on authenticated pages
  const shouldValidateSession = pathname !== "/auth/signin" && status === "authenticated";
  const { isValidating: isSessionValidating } = useSessionValidation({
    validateInterval: 5 * 60 * 1000, // 5 minutes
    autoSignOut: true,
    redirectTo: '/auth/signin'
  });

  useEffect(() => {
    setIsClient(true);
    // Fetch global preferences from system-preferences API
    const fetchGlobalSettings = async () => {
      try {
        const res = await fetch('/api/settings/system-preferences');
        const prefs = await res.json();
        setAppLogoUrl(prefs.appLogoDataUrl || null);
        setCurrentAppName(prefs.appName || DEFAULT_APP_NAME);
        setThemeAndColors({
          themePreference: prefs.themePreference || 'system',
          primaryGradientStart: prefs.primaryGradientStart,
          primaryGradientEnd: prefs.primaryGradientEnd,
          sidebarColors: prefs.sidebarColors || {},
        });
      } catch (e) {
        // fallback to defaults
        setAppLogoUrl(null);
        setCurrentAppName(DEFAULT_APP_NAME);
      }
    };
    fetchGlobalSettings();
    const handleAppConfigChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ appName?: string; logoUrl?: string | null, themePreference?: string, primaryGradientStart?: string, primaryGradientEnd?: string, sidebarColors?: Record<string,string> }>;
      if (customEvent.detail) {
        if (customEvent.detail.appName) {
          setCurrentAppName(customEvent.detail.appName);
        }
        if (customEvent.detail.logoUrl !== undefined) {
          setAppLogoUrl(customEvent.detail.logoUrl);
        }
        setThemeAndColors({
          themePreference: (customEvent.detail.themePreference || 'system') as 'system' | 'light' | 'dark',
          primaryGradientStart: customEvent.detail.primaryGradientStart,
          primaryGradientEnd: customEvent.detail.primaryGradientEnd,
          sidebarColors: customEvent.detail.sidebarColors || {},
        });
      } else {
        fetchGlobalSettings();
      }
    };
    window.addEventListener('appConfigChanged', handleAppConfigChange);
    return () => {
      window.removeEventListener('appConfigChanged', handleAppConfigChange);
    };
  }, []);

  // Handle page loading state
  useEffect(() => {
    setIsPageLoading(true);
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 300); // Short delay to show loading state

    return () => clearTimeout(timer);
  }, [pathname]);

  // Show loading while session is being fetched or validated
  if (status === "loading" || (shouldValidateSession && isSessionValidating)) {
    return <GlobalLoadingOverlay />;
  }

  // If not authenticated, show children (auth pages will handle redirect)
  if (!session?.user) {
    return <>{children}</>;
  }

  const isSettingsPage = pathname.startsWith("/settings");

  const renderLogo = (isCollapsed: boolean) => {
    if (isClient && appLogoUrl) {
      return <Image src={appLogoUrl} alt="App Logo" width={isCollapsed ? 32 : 32} height={isCollapsed ? 32 : 32} className={isCollapsed ? "h-8 w-8 object-contain" : "h-8 w-8 object-contain"} data-ai-hint="company logo" />;
    }
    return DEFAULT_LOGO_ICON;
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <SidebarStyleInitializer />
      <div className="flex min-h-screen bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2">
              {renderLogo(false)}
              <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">{currentAppName}</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarNav />
          </SidebarContent>
        </Sidebar>
        <div className="flex-1 flex flex-col min-w-0">
          <Header pageTitle={pageTitle} />
          <main className="flex-1 overflow-auto p-0">
            {isLoading && <GlobalLoadingOverlay />}
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
