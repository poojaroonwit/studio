"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserAvatarCompact } from "@/components/ui/user-avatar";
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sun, Moon, LogOut, LogIn, Edit3, KeyRound, AlertTriangle, Database, Trash2, RefreshCw } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { usePathname } from 'next/navigation';
import { NotificationIcon } from '@/components/ui/notification-icon';
import { WarningIcon } from '@/components/ui/warning-icon';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { RedesignedUserModal } from '@/components/users/RedesignedUserModal';

import type { UserProfile } from '@/lib/types';
import type { UserFormValues } from '@/components/users/RedesignedUserModal';
import { toast } from 'react-hot-toast';
import { AutoFont } from '@/components/ui/auto-font';
import { DEFAULT_APP_NAME } from '@/lib/constants';
import { useAvatarRefresh } from '@/hooks/use-avatar-refresh';
import { UserPresenceIndicator } from '@/components/ui/user-presence-indicator';

// Function to generate breadcrumb items based on pathname
function getBreadcrumbItems(pathname: string, showLogoOnly: boolean = false) {
  const items = [{ label: "Home", href: "/" }];
  
  if (pathname === "/") {
    // Always show Dashboard breadcrumb to allow realtime indicator to appear
    return [{ label: "Dashboard", href: "/" }];
  }
  
  if (pathname.startsWith("/candidates")) {
    // Always show Candidates breadcrumb to allow realtime indicator to appear
    items.push({ label: "Candidates", href: "/candidates" });
    
    if (pathname === "/candidates/upload") {
      items.push({ label: "Process queue", href: "/candidates/upload" });
    } else if (pathname.split('/').length === 3 && pathname.split('/')[2] !== '' && !pathname.includes('create-via-automation')) {
      items.push({ label: "Candidate Details", href: pathname });
    }
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
  const { isMobile, open } = useSidebar();
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isCacheDetailsOpen, setIsCacheDetailsOpen] = useState(false);
  const [isLoadingCacheInfo, setIsLoadingCacheInfo] = useState(false);
  const [currentAppName, setCurrentAppName] = useState<string>(DEFAULT_APP_NAME);
  const [effectivePageTitle, setEffectivePageTitle] = useState(initialPageTitle);
  const { refreshKey, forceRefresh } = useAvatarRefresh();

  // Memoize user object to prevent unnecessary re-renders
  const user = useMemo(() => {
    return session?.user
      ? {
          id: session.user.id as string,
          name: (session.user.name || session.user.email || 'User') as string,
          email: session.user.email ?? undefined,
          avatarUrl: ((session.user as any).avatarUrl ?? null) as string | null,
          image: ((session.user as any).image ?? null) as string | null,
          personalColor: ((session.user as any).personalColor ?? null) as string | null,
        }
      : null;
  }, [
    session?.user?.id,
    session?.user?.name,
    session?.user?.email,
    (session?.user as any)?.avatarUrl,
    (session?.user as any)?.image,
    (session?.user as any)?.personalColor,
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Collect cache info when dialog opens
  useEffect(() => {
    if (isCacheDetailsOpen) {
      collectCacheInfo();
    }
  }, [isCacheDetailsOpen]);

  const [isDark, setIsDark] = useState(false);

  // Initialize switch state from current theme / saved preference / system
  useEffect(() => {
    try {
      const root = document.documentElement;
      let initial = root.classList.contains('dark');
      const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
      if (saved === 'dark') initial = true;
      if (saved === 'light') initial = false;
      if (saved == null && !initial && typeof window !== 'undefined' && window.matchMedia) {
        initial = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      if (initial) root.classList.add('dark'); else root.classList.remove('dark');
      setIsDark(initial);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    // Fetch current app name from system settings
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
          setCurrentAppName(appName);
        }
      } catch (error) {
        // Failed to fetch app name
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

  const handleThemeSwitch = (checked: boolean) => {
    setIsDark(checked);
    const root = document.documentElement;
    if (checked) root.classList.add('dark'); else root.classList.remove('dark');
    try { localStorage.setItem('theme', checked ? 'dark' : 'light'); } catch {}
    requestAnimationFrame(() => {
      import('@/lib/themeUtils').then(({ reapplyCurrentSidebarColors }) => {
        reapplyCurrentSidebarColors();
      });
    });
  };

  const handleEditProfile = async (data: UserFormValues) => {
    if (!session?.user) return;
    // Header handleEditProfile - Sending data
    
    try {
      const response = await fetch(`/api/users/${session.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
              // Header handleEditProfile - API response
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update profile');
      }
      toast.success("Profile Updated");
      
      // Trigger session update if name, email, avatar, or personalColor changed
      const needsSessionUpdate = 
        session.user.name !== result.name || 
        session.user.email !== result.email ||
        session.user.avatarUrl !== result.avatarUrl ||
        session.user.personalColor !== result.personalColor;
        
              // Avatar URL changed
        
      if (needsSessionUpdate) {
        // Trigger a session refresh to update the session with new data
                  // Triggering session refresh
        await updateSession();
        
        // Force refresh the avatar after session update if it was updated
        if (session.user.avatarUrl !== result.avatarUrl) {
          // Forcing avatar refresh after session update
          forceRefresh();
        }
      }
      setIsUserModalOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const [cacheInfo, setCacheInfo] = useState({
    localStorageItems: 0,
    sessionStorageItems: 0,
    localStorageSize: 0,
    sessionStorageSize: 0,
    indexedDBAvailable: false,
    serviceWorkersAvailable: false,
    cachesAvailable: false,
    memoryUsage: 0,
    cacheNames: [] as string[]
  });

  const collectCacheInfo = async () => {
    if (typeof window !== 'undefined') {
      setIsLoadingCacheInfo(true);
      try {
        // Calculate storage sizes
        const localStorageSize = new Blob(Object.values(localStorage)).size;
        const sessionStorageSize = new Blob(Object.values(sessionStorage)).size;
        
        // Get cache names if available
        let cacheNames: string[] = [];
        if ('caches' in window) {
          try {
            cacheNames = await caches.keys();
          } catch (error) {
            console.warn('Failed to get cache names:', error);
          }
        }

        setCacheInfo({
          localStorageItems: localStorage.length,
          sessionStorageItems: sessionStorage.length,
          localStorageSize,
          sessionStorageSize,
          indexedDBAvailable: 'indexedDB' in window,
          serviceWorkersAvailable: 'serviceWorker' in navigator,
          cachesAvailable: 'caches' in window,
          memoryUsage: 'memory' in performance ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 0,
          cacheNames
        });
      } finally {
        setIsLoadingCacheInfo(false);
      }
    }
  };

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
      
      // Update cache info
      collectCacheInfo();
      
      toast.success('Cache cleared successfully');
    }
  };

  // Only show loading skeleton if not mounted or if we're loading and have no session data
  // This prevents the avatar from disappearing during session updates
  if (!mounted) { 
    return (
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
          <div className="h-6 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
          <div className="h-10 w-10 rounded-md bg-muted animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 sticky top-0 z-30">
        <div className={`flex items-center gap-2 ${!open ? 'ml-5' : ''}`}>
          <Breadcrumb items={getBreadcrumbItems(pathname, showLogoOnly)} />
        </div>
        <div className="flex items-center gap-3">
          
          {/* User Presence Indicator */}
          {user && <UserPresenceIndicator />}
          
          {/* Theme switch is shown inside avatar dropdown, not here */}
          {user && <WarningIcon />}
          {user && <NotificationIcon />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative h-8 w-8 rounded-full cursor-pointer hover:bg-accent/20 transition-colors">
                  <UserAvatarCompact user={user} size="sm" forceRefresh={refreshKey > 0} />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-50">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <AutoFont className="text-sm font-medium leading-none">{user.name || "User"}</AutoFont>
                    {user.email && ( <p className="text-xs leading-none text-muted-foreground"> {user.email} </p> )}
                  </div>
                </DropdownMenuLabel>
                <div role="separator" aria-orientation="horizontal" className="-mx-1 my-1 h-px bg-muted"></div>
                <div className="px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Appearance</span>
                    <div className="flex items-center gap-2">
                      <Sun className="h-3.5 w-3.5 text-yellow-500" />
                      <Switch
                        checked={isDark}
                        onCheckedChange={handleThemeSwitch}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label="Toggle dark mode"
                      />
                      <Moon className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
                 <DropdownMenuItem onSelect={() => setIsUserModalOpen(true)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push(`/settings/users/${user.id}/warning-configurations`)}>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  My Warning Configurations
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => setIsChangePasswordModalOpen(true)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setIsCacheDetailsOpen(true)}>
                  <Database className="mr-2 h-4 w-4" />
                  Cache Details
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleClearCache}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Cache
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => signOut({ callbackUrl: '/auth/signin' })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" onClick={() => signIn()}>
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </header>
      {user && (
        <>
          <ChangePasswordModal 
            isOpen={isChangePasswordModalOpen} 
            onOpenChange={setIsChangePasswordModalOpen} 
          />
          <RedesignedUserModal
            isOpen={isUserModalOpen}
            onOpenChange={setIsUserModalOpen}
            mode="profile"
            user={session?.user as UserProfile | null}
            onSave={handleEditProfile}
          />
          <Dialog open={isCacheDetailsOpen} onOpenChange={setIsCacheDetailsOpen}>
             <DialogContent>
               <DialogHeader>
                 <DialogTitle className="flex items-center gap-2">
                   <Database className="h-5 w-5" />
                   Cache Details
                 </DialogTitle>
               </DialogHeader>
               <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4 text-sm">
                   <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                     <span>Local Storage:</span>
                     <div className="text-right">
                       <div className="font-mono font-semibold">{cacheInfo.localStorageItems} items</div>
                       <div className="text-xs text-muted-foreground">
                         {Math.round(cacheInfo.localStorageSize / 1024)} KB
                       </div>
                     </div>
                   </div>
                   <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                     <span>Session Storage:</span>
                     <div className="text-right">
                       <div className="font-mono font-semibold">{cacheInfo.sessionStorageItems} items</div>
                       <div className="text-xs text-muted-foreground">
                         {Math.round(cacheInfo.sessionStorageSize / 1024)} KB
                       </div>
                     </div>
                   </div>
                   <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                     <span>Memory Usage:</span>
                     <span className="font-mono font-semibold">{cacheInfo.memoryUsage} MB</span>
                   </div>
                   <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                     <span>IndexedDB:</span>
                     <span className={`font-semibold ${cacheInfo.indexedDBAvailable ? 'text-green-600' : 'text-red-600'}`}>
                       {cacheInfo.indexedDBAvailable ? 'Available' : 'Not Available'}
                     </span>
                   </div>
                   <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                     <span>Service Workers:</span>
                     <span className={`font-semibold ${cacheInfo.serviceWorkersAvailable ? 'text-green-600' : 'text-red-600'}`}>
                       {cacheInfo.serviceWorkersAvailable ? 'Available' : 'Not Available'}
                     </span>
                   </div>
                   <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                     <span>Browser Caches:</span>
                     <div className="text-right">
                       <span className={`font-semibold ${cacheInfo.cachesAvailable ? 'text-green-600' : 'text-red-600'}`}>
                         {cacheInfo.cachesAvailable ? 'Available' : 'Not Available'}
                       </span>
                       {cacheInfo.cacheNames.length > 0 && (
                         <div className="text-xs text-muted-foreground">
                           {cacheInfo.cacheNames.length} cache{cacheInfo.cacheNames.length !== 1 ? 's' : ''}
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
                 {cacheInfo.cacheNames.length > 0 && (
                   <div className="space-y-2">
                     <h4 className="text-sm font-medium">Cache Names:</h4>
                     <div className="grid grid-cols-1 gap-1">
                       {cacheInfo.cacheNames.map((name, index) => (
                         <div key={index} className="text-xs p-2 bg-muted/30 rounded border">
                           {name}
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
                 <div className="flex gap-2 pt-4 border-t">
                   <Button
                     variant="outline"
                     onClick={collectCacheInfo}
                     disabled={isLoadingCacheInfo}
                     className="flex-1"
                   >
                     <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCacheInfo ? 'animate-spin' : ''}`} />
                     {isLoadingCacheInfo ? 'Refreshing...' : 'Refresh'}
                   </Button>
                   <Button
                     variant="destructive"
                     onClick={handleClearCache}
                     className="flex-1"
                   >
                     <Trash2 className="h-4 w-4 mr-2" />
                     Clear All
                   </Button>
                 </div>
               </div>
             </DialogContent>
           </Dialog>
        </>
      )}
    </>
  );
}
