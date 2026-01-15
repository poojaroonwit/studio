"use client";
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserAvatarCompact } from "@/components/ui/user-avatar";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sun, Moon, LogOut, LogIn, Edit3, KeyRound, AlertTriangle, Trash2, RefreshCw, Monitor, ChevronDown, Menu, Settings, UploadCloud, Package2, ChevronLeft, Search } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { usePathname } from 'next/navigation';
import { NotificationIcon } from '@/components/ui/notification-icon';
import { WarningIcon } from '@/components/ui/warning-icon';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { UnifiedUserModal } from '@/components/users/UnifiedUserModal';
import { useTheme } from '@/hooks/use-theme';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { UserProfile } from '@/lib/types';
import type { UnifiedUserFormValues } from '@/components/users/UnifiedUserModal';
import { toast } from 'react-hot-toast';
import { AutoFont } from '@/components/ui/auto-font';
import { DEFAULT_APP_NAME } from '@/lib/constants';
import { useAvatarRefresh } from '@/hooks/use-avatar-refresh';
import { UserPresenceIndicator } from '@/components/ui/user-presence-indicator';
import { APP_VERSION } from '@/lib/version';
import { convertMinIOUrlToSecureUrl } from '@/lib/imageUtils';

// Function to generate breadcrumb items based on pathname
function getBreadcrumbItems(pathname: string, showLogoOnly: boolean = false) {
  const items = [{ label: "Home", href: "/" }];

  if (pathname === "/") {
    // Always show Dashboard breadcrumb to allow realtime indicator to appear
    return [{ label: "Dashboard", href: "/" }];
  }

  if (pathname.startsWith("/candidates") || pathname.startsWith("/applicants")) {
    // Always show Candidates breadcrumb to allow realtime indicator to appear
    items.push({ label: "Applicants", href: "/applicants" });

    if (pathname.split('/').length === 3 && pathname.split('/')[2] !== '' && !pathname.includes('create-via-automation')) {
      items.push({ label: "Candidate Details", href: pathname });
    }
  }

  if (pathname === "/process-queue") {
    items.push({ label: "Process Queue", href: "/process-queue" });
  }

  if (pathname.startsWith("/positions")) {
    // Always show Positions breadcrumb to allow realtime indicator to appear
    items.push({ label: "Job Positions", href: "/positions" });

    if (pathname.split('/').length === 3 && pathname.split('/')[2] !== '') {
      items.push({ label: "Position Details", href: pathname });
    }
  }

  if (pathname.startsWith("/users")) {
    items.push({ label: "Manage Users", href: "/users" });
  }

  if (pathname.startsWith("/my-tasks")) {
    items.push({ label: "My Task Board", href: "/my-tasks" });
  }

  if (pathname.startsWith("/settings")) {
    // Always show Settings breadcrumb to allow realtime indicator to appear
    items.push({ label: "Settings", href: "/settings" });

    if (pathname.startsWith("/settings/system-settings")) {
      items.push({ label: "System Settings", href: "/settings/system-settings" });
    } else if (pathname.startsWith("/settings/system-preferences")) {
      items.push({ label: "System Preferences", href: "/settings/system-preferences" });
    } else if (pathname.startsWith("/settings/stages")) {
      items.push({ label: "Recruitment Stages", href: "/settings/stages" });
    } else if (pathname.startsWith("/settings/custom-fields")) {
      items.push({ label: "Custom Fields", href: "/settings/custom-fields" });
    } else if (pathname.startsWith("/settings/user-groups")) {
      items.push({ label: "User Groups", href: "/settings/user-groups" });
    } else if (pathname.startsWith("/settings/users")) {
      items.push({ label: "Users", href: "/settings/users" });
    } else if (pathname.startsWith("/settings/webhooks")) {
      items.push({ label: "Webhooks", href: "/settings/webhooks" });
    } else if (pathname.startsWith("/settings/logs")) {
      items.push({ label: "Application Logs", href: "/settings/logs" });
    } else if (pathname.startsWith("/settings/api-docs")) {
      items.push({ label: "API Documentation", href: "/settings/api-docs" });
    }
  }

  if (pathname.startsWith("/api-docs")) {
    items.push({ label: "API Documentation", href: "/api-docs" });
  }

  if (pathname.startsWith("/logs")) {
    items.push({ label: "Application Logs", href: "/logs" });
  }

  if (pathname.startsWith("/auth/signin")) {
    return [{ label: "Sign In", href: "/auth/signin" }];
  }

  return items;
}

interface HeaderProps {
  pageTitle: string;
  showLogoOnly?: boolean;
}

export function Header({ pageTitle: initialPageTitle, showLogoOnly = false }: HeaderProps) {
  const { isMobile: sidebarIsMobile, open, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [fullUserData, setFullUserData] = useState<UserProfile | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [currentAppName, setCurrentAppName] = useState<string>(DEFAULT_APP_NAME);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [warningCriteriaEnabled, setWarningCriteriaEnabled] = useState(true);
  const [effectivePageTitle, setEffectivePageTitle] = useState(initialPageTitle);
  const { refreshKey, forceRefresh } = useAvatarRefresh();

  // Screen size state
  const [currentScreenSize, setCurrentScreenSize] = useState(100);

  // Function to apply zoom using rem units
  const applyRemZoom = useCallback((zoomLevel: number) => {
    try {
      // Set the root font size to scale everything
      // Base font size is 16px, so we multiply by zoom level
      const baseFontSize = 16;
      const scaledFontSize = baseFontSize * zoomLevel;

      // Apply to document element
      document.documentElement.style.fontSize = `${scaledFontSize}px`;

      // Also set CSS custom property for additional scaling
      document.documentElement.style.setProperty('--zoom-scale', zoomLevel.toString());

      // Update body font size to ensure consistency
      document.body.style.fontSize = `${scaledFontSize}px`;

    } catch (error) {
      console.error('Error applying rem zoom:', error);
    }
  }, []);

  // Load saved zoom level on mount
  useEffect(() => {
    try {
      // On mobile, always use 100% screen size and don't allow changes
      if (isMobile) {
        setCurrentScreenSize(100);
        applyRemZoom(1.0);
        return;
      }

      // Check if there's a saved zoom level
      const savedZoom = localStorage.getItem('app-zoom-level');
      if (savedZoom) {
        const zoomLevel = parseFloat(savedZoom);
        const screenSize = Math.round(zoomLevel * 100);
        setCurrentScreenSize(screenSize);

        // Apply the saved zoom level using rem units
        applyRemZoom(zoomLevel);
      } else {
        // Default to 90% zoom (showing as 90% in app)
        setCurrentScreenSize(90);
        const defaultZoom = 0.9;
        applyRemZoom(defaultZoom);

        // Save the default zoom level
        localStorage.setItem('app-zoom-level', defaultZoom.toString());
      }
    } catch (error) {
      console.warn('Failed to load saved zoom level:', error);
    }
  }, [isMobile, applyRemZoom]);

  // Custom signout function that handles cleanup and redirect
  const handleSignOut = useCallback(async () => {
    try {
      // Immediately redirect to prevent any session validation from interfering
      // Set signout flag in URL first to stop validation
      const signoutUrl = '/auth/signin?signout=true';

      // Clear any cached data (don't wait for it)
      if (session?.user?.id) {
        // Removed user cache logging to reduce container logs
        // Clear user validation cache - fire and forget
        fetch('/api/auth/clear-user-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id }),
        }).catch((error) => {
          console.warn('[HEADER] Cache clearing failed:', error);
        });
      }

      // Clear service worker caches and unregister to prevent cached authenticated pages
      if (typeof window !== 'undefined') {
        // Clear all SW caches
        if ('caches' in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          } catch (e) {
            console.warn('[HEADER] Failed to clear SW caches:', e);
          }
        }

        // Unregister all service workers to prevent stale cache serving
        if ('serviceWorker' in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
          } catch (e) {
            console.warn('[HEADER] Failed to unregister service workers:', e);
          }
        }

        // Clear localStorage and sessionStorage
        localStorage.clear();
        sessionStorage.clear();
      }

      // Wait for signout to complete to ensure session is cleared
      await signOut({
        callbackUrl: signoutUrl,
        redirect: false
      });

      // Redirect after signout
      window.location.href = signoutUrl;
    } catch (error) {
      console.error('[HEADER] Signout error:', error);
      // Fallback to window.location if signOut fails
      // Removed fallback logging to reduce container logs
      window.location.href = '/auth/signin?signout=true';
    }
  }, [session?.user?.id]);

  // Memoize user object to prevent unnecessary re-renders
  const user = useMemo(() => {
    if (!session?.user) return null;

    return {
      id: session.user.id as string,
      name: (session.user.name || session.user.email || 'User') as string,
      email: session.user.email ?? undefined,
      role: (session.user as any).role ?? 'Recruiter',
      avatarUrl: ((session.user as any).avatarUrl ?? null) as string | null,
      image: ((session.user as any).image ?? null) as string | null,
      personalColor: ((session.user as any).personalColor ?? null) as string | null,
    };
  }, [
    session?.user?.id,
    session?.user?.name,
    session?.user?.email,
    (session?.user as any)?.role,
    (session?.user as any)?.avatarUrl,
    (session?.user as any)?.image,
    (session?.user as any)?.personalColor,
  ]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      setMounted(true);
    }
  }, []);


  // Use the centralized theme hook instead of local state
  const { mounted: themeMounted, currentTheme, toggleTheme } = useTheme();



  useEffect(() => {
    const fetchAppName = async () => {
      try {
        const response = await fetch('/api/settings/system-settings');
        if (response.ok) {
          const data = await response.json();
          let settings: any = {};
          if (data.settings && Array.isArray(data.settings)) {
            settings = Object.fromEntries(data.settings.map((setting: any) => [setting.key, setting.value]));
          } else {
            settings = data;
          }
          const appName = settings.appName || DEFAULT_APP_NAME;
          const logoUrl = settings.appLogoDataUrl || null;
          const warningEnabled = settings.warningCriteriaEnabled !== 'false';

          setCurrentAppName(appName);
          setAppLogoUrl(logoUrl);
          setWarningCriteriaEnabled(warningEnabled);
        }
      } catch (error) {
        console.warn('[HEADER] Failed to fetch app name:', error);
      }
    };

    fetchAppName();
  }, []);

  useEffect(() => {
    if (initialPageTitle === DEFAULT_APP_NAME && currentAppName !== DEFAULT_APP_NAME) {
      setEffectivePageTitle(currentAppName);
      document.title = currentAppName;
    } else {
      setEffectivePageTitle(initialPageTitle);
      document.title = initialPageTitle;
    }
  }, [initialPageTitle, currentAppName]);

  // Theme switch handler using the centralized theme hook
  const handleThemeSwitch = useCallback((checked: boolean) => {
    // Use the toggleTheme function from useTheme hook
    toggleTheme();
  }, [toggleTheme]);

  // Handle screen size change
  const handleScreenSizeChange = useCallback((size: number) => {
    // On mobile, prevent screen size changes
    if (isMobile) {
      toast.error('Screen size adjustment is not available on mobile');
      return;
    }

    setCurrentScreenSize(size);

    // Convert percentage to zoom level (75% = 0.75, 100% = 1.0, etc.)
    const zoomLevel = size / 100;

    // Apply zoom using rem units
    applyRemZoom(zoomLevel);

    // Store the zoom level for persistence
    localStorage.setItem('app-zoom-level', zoomLevel.toString());

    // Show success message
    toast.success(`Screen size set to ${size}%`);
  }, [applyRemZoom, isMobile]);

  const handleEditProfile = useCallback(async (data: UnifiedUserFormValues) => {
    if (!session?.user) return;

    try {
      const response = await fetch(`/api/users/${session.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to update profile');
      }

      const result = await response.json();
      toast.success("Profile Updated");

      // Check if session update is needed
      const needsSessionUpdate =
        session.user.name !== result.name ||
        session.user.email !== result.email ||
        session.user.avatarUrl !== result.avatarUrl ||
        session.user.personalColor !== result.personalColor;

      if (needsSessionUpdate) {
        await updateSession();

        // Force refresh the avatar after session update if it was updated
        if (session.user.avatarUrl !== result.avatarUrl) {
          forceRefresh();
        }
      }
      setIsUserModalOpen(false);
    } catch (error) {
      console.error('[HEADER] Profile update error:', error);
      toast.error((error as Error).message);
    }
  }, [session?.user, updateSession, forceRefresh]);

  const handleClearCache = () => {
    if (typeof window !== 'undefined') {
      // Clear localStorage
      localStorage.clear();

      // Clear sessionStorage
      sessionStorage.clear();

      // Clear IndexedDB
      if ('indexedDB' in window) {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }

      // Clear Service Worker caches
      if ('serviceWorker' in navigator) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName);
          });
        });
      }

      // Force refresh avatars
      forceRefresh();


      toast.success('Cache cleared successfully');
    }
  };

  const handleOpenProfileModal = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // Fetch complete user data including userGroupId
      const response = await fetch(`/api/users/${session.user.id}`);
      if (response.ok) {
        const userData = await response.json();
        setFullUserData(userData);
        setIsUserModalOpen(true);
      } else {
        console.error('Failed to fetch user data for profile modal');
        // Fallback to using session data
        setIsUserModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching user data for profile modal:', error);
      // Fallback to using session data
      setIsUserModalOpen(true);
    }
  }, [session?.user?.id]);

  // Use a more robust mounting strategy to prevent double rendering in StrictMode
  // Only render the actual header once we're fully mounted and have session data
  const isLoading = !mounted || status === "loading";

  // Check if we should hide the header on mobile for detail pages
  const isDetailPage = useMemo(() => {
    if (!pathname) return false;
    const parts = pathname.split('/').filter(Boolean);

    // Check for candidate/applicant detail (e.g., /applicants/[id])
    const isCandidateDetail = (parts[0] === 'candidates' || parts[0] === 'applicants') && parts.length >= 2;

    // Check for position detail (e.g., /positions/[id])
    const isPositionDetail = parts[0] === 'positions' && parts.length >= 2;

    return isCandidateDetail || isPositionDetail;
  }, [pathname]);

  // Hide header on mobile for detail pages
  if (isMobile && isDetailPage) {
    return null;
  }

  return (
    <>
      <header className="flex h-16 items-center justify-between bg-card/80 backdrop-blur-md px-4 md:px-6 sticky top-0 border-b border-border/40" style={{ zIndex: 100 }}>
        <div className={`flex items-center gap-2 ${!open ? 'ml-5' : ''}`}>
          {/* Back button - only visible on mobile */}
          {isMobile && pathname.includes('/evaluate') && (
            <Button variant="ghost" size="icon" className="-ml-2 rounded-none shadow-none" onClick={() => router.back()}>
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}

          {/* Mobile logo - only visible on mobile */}
          {!isLoading && sidebarIsMobile && (
            <div className="md:hidden flex items-center h-8 relative">
              {appLogoUrl ? (
                <>
                  <img
                    src={convertMinIOUrlToSecureUrl(appLogoUrl, false) ?? ''}
                    alt={currentAppName}
                    className="h-8 w-auto object-contain"
                    style={{ maxHeight: '32px', maxWidth: '120px' }}
                    onError={(e) => {
                      // Fallback to icon if logo fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) {
                        fallback.style.display = 'block';
                      }
                    }}
                  />
                  <Package2 className="h-6 w-6 hidden" />
                </>
              ) : (
                <Package2 className="h-6 w-6" />
              )}
            </div>
          )}
          {isLoading ? (
            <>
              <div className="h-8 w-8 rounded-md bg-muted animate-pulse hidden md:block" />
              <div className="h-6 w-32 rounded bg-muted animate-pulse hidden md:block" />
            </>
          ) : (
            <div className="hidden md:block">
              <Breadcrumb items={getBreadcrumbItems(pathname, showLogoOnly)} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isLoading ? (
            <>
              <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
              <div className="h-10 w-10 rounded-md bg-muted animate-pulse" />
            </>
          ) : (
            <>
              {/* User Presence Indicator */}
              {user && <div className="hidden md:block"><UserPresenceIndicator /></div>}



              {/* Theme switch is shown inside avatar dropdown, not here */}


              {user && !isMobile && warningCriteriaEnabled && <WarningIcon />}
              {user && <NotificationIcon />}
              {user ? (
                <>
                  {/* On mobile, use button to open modal instead of dropdown */}
                  {isMobile ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsAvatarModalOpen(true)}
                        className="h-8 w-8 rounded-full"
                      >
                        <UserAvatarCompact user={user} size="sm" forceRefresh={refreshKey > 0} />
                      </Button>
                      <Dialog open={isAvatarModalOpen} onOpenChange={setIsAvatarModalOpen}>
                        <DialogContent
                          className="fixed bottom-0 left-1/2 top-auto translate-x-[-50%] translate-y-0 w-screen max-w-none h-[90vh] p-0 overflow-hidden rounded-t-3xl rounded-b-none border-0 shadow-2xl bg-background flex flex-col"
                          dialogId="avatar-modal"
                        >
                          <VisuallyHidden>
                            <DialogTitle>User Menu</DialogTitle>
                          </VisuallyHidden>
                          <DialogHeader className="border-b px-4 pt-6 pb-6 flex-shrink-0">
                            <DialogTitle className="flex items-center gap-2">
                              <UserAvatarCompact user={user} size="md" forceRefresh={refreshKey > 0} />
                              <div className="flex flex-col">
                                <AutoFont className="text-base font-medium">{user.name || "User"}</AutoFont>
                                {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                              </div>
                            </DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="flex-1 px-4 py-0">
                            <div className="space-y-0">
                              {/* Settings and Queue - only on mobile */}
                              <Button
                                variant="ghost"
                                className="w-full justify-start h-12 rounded-none border-0 hover:bg-transparent active:bg-muted/50"
                                onClick={() => {
                                  setIsAvatarModalOpen(false);
                                  router.push('/settings');
                                }}
                              >
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                              </Button>
                              <div className="border-t border-border/50" />
                              <Button
                                variant="ghost"
                                className="w-full justify-start h-12 rounded-none border-0 hover:bg-transparent active:bg-muted/50"
                                onClick={() => {
                                  setIsAvatarModalOpen(false);
                                  router.push('/process-queue');
                                }}
                              >
                                <UploadCloud className="mr-2 h-4 w-4" />
                                Queue
                              </Button>

                              {/* Appearance - Hidden on mobile */}
                              {!isMobile && (
                                <>
                                  <div className="border-t border-border/50" />
                                  <div className="px-2 py-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-sm text-muted-foreground">Appearance</span>
                                      <div className="flex items-center gap-2">
                                        <Sun className="h-4 w-4 text-yellow-500" />
                                        <Switch
                                          checked={currentTheme === 'dark'}
                                          onCheckedChange={handleThemeSwitch}
                                          aria-label="Toggle dark mode"
                                        />
                                        <Moon className="h-4 w-4 text-blue-400" />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Screen Size - Hidden on mobile */}
                                  <div className="px-2 py-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-sm text-muted-foreground">Screen Size</span>
                                      <span className="text-sm font-medium">{currentScreenSize}%</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {[50, 75, 90, 100, 110, 125, 150].map((size) => (
                                        <Button
                                          key={size}
                                          variant={currentScreenSize === size ? "default" : "outline"}
                                          size="sm"
                                          className="h-8 px-3"
                                          onClick={() => handleScreenSizeChange(size)}
                                        >
                                          {size}%
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Separator */}
                              <div className="border-t border-border/50" />

                              {/* Profile Actions */}
                              <Button
                                variant="ghost"
                                className="w-full justify-start h-12 rounded-none border-0 hover:bg-transparent active:bg-muted/50"
                                onClick={() => {
                                  setIsAvatarModalOpen(false);
                                  handleOpenProfileModal();
                                }}
                              >
                                <Edit3 className="mr-2 h-4 w-4" />
                                Edit My Profile
                              </Button>
                              {!isMobile && (
                                <>
                                  <div className="border-t border-border/50" />
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start h-12 rounded-none border-0 hover:bg-transparent active:bg-muted/50"
                                    onClick={() => {
                                      setIsAvatarModalOpen(false);
                                      router.push(`/settings/users/${user.id}/warning-configurations`);
                                    }}
                                  >
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    My Warning Configurations
                                  </Button>
                                </>
                              )}
                              <div className="border-t border-border/50" />
                              <Button
                                variant="ghost"
                                className="w-full justify-start h-12 rounded-none border-0 hover:bg-transparent active:bg-muted/50"
                                onClick={() => {
                                  setIsAvatarModalOpen(false);
                                  setIsChangePasswordModalOpen(true);
                                }}
                              >
                                <KeyRound className="mr-2 h-4 w-4" />
                                Change Password
                              </Button>

                              <div className="border-t border-border/50" />

                              <Button
                                variant="ghost"
                                className="w-full justify-start h-12 rounded-none border-0 hover:bg-transparent active:bg-muted/50"
                                onClick={() => {
                                  setIsAvatarModalOpen(false);
                                  handleClearCache();
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Clear Cache
                              </Button>

                              <div className="border-t border-border/50" />

                              <Button
                                variant="ghost"
                                className="w-full justify-start h-12 rounded-none border-0 hover:bg-transparent active:bg-muted/50 text-destructive"
                                onClick={() => {
                                  setIsAvatarModalOpen(false);
                                  handleSignOut().catch((error) => {
                                    console.error('[HEADER] Signout handler error:', error);
                                  });
                                }}
                              >
                                <LogOut className="mr-2 h-4 w-4" />
                                Log out
                              </Button>

                              <div className="border-t border-border/50" />
                              <div className="px-2 py-4 text-center">
                                <p className="text-xs text-muted-foreground font-mono">v{APP_VERSION}</p>
                              </div>
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="relative h-8 w-8 rounded-full cursor-pointer hover:bg-accent/20 transition-colors">
                          <UserAvatarCompact user={user} size="sm" forceRefresh={refreshKey > 0} />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-50">
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <AutoFont className="text-sm font-medium leading-none">{user.name || "User"}</AutoFont>
                            {user.email && (<p className="text-xs leading-none text-muted-foreground"> {user.email} </p>)}
                          </div>
                        </DropdownMenuLabel>
                        <div role="separator" aria-orientation="horizontal" className="-mx-1 my-1 h-px bg-muted"></div>
                        {/* Appearance - Hidden on mobile */}
                        {!isMobile && (
                          <div className="px-2 py-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">Appearance</span>
                              <div className="flex items-center gap-2">
                                <Sun className="h-3.5 w-3.5 text-yellow-500" />
                                <Switch
                                  checked={currentTheme === 'dark'}
                                  onCheckedChange={handleThemeSwitch}
                                  onClick={(e) => e.stopPropagation()}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  aria-label="Toggle dark mode"
                                />
                                <Moon className="h-3.5 w-3.5 text-blue-400" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Screen Size Dropdown - Hidden on mobile */}
                        {!isMobile && (
                          <div className="px-2 py-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">Screen Size</span>
                              <div className="flex items-center gap-2">
                                <Monitor className="h-3.5 w-3.5 text-green-500" />
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className="text-xs px-2 py-1 h-6">
                                    {currentScreenSize}%
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem onSelect={() => handleScreenSizeChange(50)}>
                                      50%
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleScreenSizeChange(75)}>
                                      75%
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleScreenSizeChange(90)}>
                                      90%
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleScreenSizeChange(100)}>
                                      100%
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleScreenSizeChange(110)}>
                                      110%
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleScreenSizeChange(125)}>
                                      125%
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleScreenSizeChange(150)}>
                                      150%
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              </div>
                            </div>
                          </div>
                        )}


                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={handleOpenProfileModal}>
                          <Edit3 className="mr-2 h-4 w-4" />
                          Edit My Profile
                        </DropdownMenuItem>
                        {!isMobile && (
                          <DropdownMenuItem onSelect={() => router.push(`/settings/users/${user.id}/warning-configurations`)}>
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            My Warning Configurations
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem onSelect={() => setIsChangePasswordModalOpen(true)}>
                          <KeyRound className="mr-2 h-4 w-4" />
                          Change Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem onSelect={handleClearCache}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Clear Cache
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => {
                            handleSignOut().catch((error) => {
                              console.error('[HEADER] Signout handler error:', error);
                            });
                          }}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Log out
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-center text-xs text-muted-foreground h-7 py-1 px-2 cursor-default hover:bg-transparent font-mono opacity-70"
                            disabled
                          >
                            v{APP_VERSION}
                          </Button>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              ) : (
                <Button variant="outline" onClick={() => signIn()}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              )}
            </>
          )}
        </div>
      </header>
      {user && (
        <>
          <ChangePasswordModal
            isOpen={isChangePasswordModalOpen}
            onOpenChange={setIsChangePasswordModalOpen}
          />
          <UnifiedUserModal
            isOpen={isUserModalOpen}
            onOpenChange={setIsUserModalOpen}
            mode="profile"
            user={fullUserData || session?.user as UserProfile | null}
            onSave={handleEditProfile}
          />
          {/* Mobile Search Modal */}
          <Dialog open={isSearchModalOpen} onOpenChange={(open) => {
            setIsSearchModalOpen(open);
            if (!open) setSearchQuery('');
          }}>
            <DialogContent
              className="fixed bottom-0 left-1/2 top-auto translate-x-[-50%] translate-y-0 w-screen max-w-none h-[90vh] p-0 overflow-hidden rounded-t-3xl rounded-b-none border-0 shadow-2xl bg-background flex flex-col"
              dialogId="search-modal"
            >
              <VisuallyHidden>
                <DialogTitle>
                  {pathname === '/positions' ? 'Search Positions' : 'Search Candidates'}
                </DialogTitle>
              </VisuallyHidden>
              <DialogHeader className="border-b px-4 pt-6 pb-4 flex-shrink-0">
                <DialogTitle className="text-lg font-semibold text-center">
                  {pathname === '/positions' ? 'Search Positions' : 'Search Candidates'}
                </DialogTitle>
              </DialogHeader>
              <div className="p-4 flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={pathname === '/positions' ? 'Search by title, department...' : 'Search by name, email...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-base"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        setIsSearchModalOpen(false);
                        router.push(`${pathname}?q=${encodeURIComponent(searchQuery.trim())}`);
                        setSearchQuery('');
                      }
                    }}
                  />
                </div>
                <Button
                  className="w-full h-12"
                  disabled={!searchQuery.trim()}
                  onClick={() => {
                    if (searchQuery.trim()) {
                      setIsSearchModalOpen(false);
                      router.push(`${pathname}?q=${encodeURIComponent(searchQuery.trim())}`);
                      setSearchQuery('');
                    }
                  }}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

    </>
  );
}
