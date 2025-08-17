"use client";
import React, { useEffect, useState } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { UserAvatarCompact } from "@/components/ui/user-avatar";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sun, Moon, LogOut, LogIn, Edit3, KeyRound } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { usePathname } from 'next/navigation';
import { NotificationIcon } from '@/components/ui/notification-icon';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { RedesignedUserModal } from '@/components/users/RedesignedUserModal';
import { UserProfile, UserFormValues } from '@/lib/types';
import { toast } from 'react-hot-toast';
import { AutoFont } from '@/components/ui/auto-font';
import { DEFAULT_APP_NAME } from '@/lib/constants';
import { useAvatarRefresh } from '@/hooks/use-avatar-refresh';

// Function to generate breadcrumb items based on pathname
function getBreadcrumbItems(pathname: string) {
  const items = [{ label: "Home", href: "/" }];
  
  if (pathname === "/") {
    return [{ label: "Dashboard", href: "/" }];
  }
  
  if (pathname.startsWith("/candidates")) {
    items.push({ label: "Candidates", href: "/candidates" });
    
    if (pathname === "/candidates/upload") {
      items.push({ label: "Process queue", href: "/candidates/upload" });
    } else if (pathname.split('/').length === 3 && pathname.split('/')[2] !== '' && !pathname.includes('create-via-automation')) {
      items.push({ label: "Candidate Details", href: pathname });
    }
  }
  
  if (pathname.startsWith("/positions")) {
    items.push({ label: "Positions", href: "/positions" });
    
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
}

export function Header({ pageTitle: initialPageTitle }: { pageTitle: string }) {
  const { isMobile, open } = useSidebar();
  const { data: session, status, update: updateSession } = useSession();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [currentAppName, setCurrentAppName] = useState<string>(DEFAULT_APP_NAME);
  const [effectivePageTitle, setEffectivePageTitle] = useState(initialPageTitle);
  const { refreshKey, forceRefresh } = useAvatarRefresh();

  useEffect(() => {
    setMounted(true);
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
        console.error('Failed to fetch app name:', error);
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

  const toggleTheme = () => {
    const root = document.documentElement;
    const willBeDark = !root.classList.contains('dark');
    root.classList.toggle('dark');
    
    // Re-apply sidebar colors with explicit theme information
    requestAnimationFrame(() => {
      import('@/lib/themeUtils').then(({ reapplyCurrentSidebarColors }) => {
        reapplyCurrentSidebarColors();
      });
    });
  };

  const handleEditProfile = async (data: UserFormValues) => {
    if (!session?.user) return;
    console.log('Header handleEditProfile - Sending data:', data);
    console.log('Header handleEditProfile - Current session avatarUrl:', session.user.avatarUrl);
    
    try {
      const response = await fetch(`/api/users/${session.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      console.log('Header handleEditProfile - API response:', result);
      
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
        
      console.log('Header handleEditProfile - Avatar URL changed:', session.user.avatarUrl !== result.avatarUrl);
      console.log('Header handleEditProfile - Old avatarUrl:', session.user.avatarUrl);
      console.log('Header handleEditProfile - New avatarUrl:', result.avatarUrl);
        
      if (needsSessionUpdate) {
        // Force refresh the avatar if it was updated
        if (session.user.avatarUrl !== result.avatarUrl) {
          console.log('Header handleEditProfile - Forcing avatar refresh');
          forceRefresh();
        }
        
        // Trigger a session refresh to update the session with new data
        console.log('Header handleEditProfile - Triggering session refresh');
        await updateSession();
      }
      setIsUserModalOpen(false);
    } catch (error) {
      console.error('Header handleEditProfile - Error:', error);
      toast.error((error as Error).message);
    }
  };


  if (!mounted || status === "loading") { 
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

  const user = session?.user;

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 sticky top-0 z-30">
        <div className={`flex items-center gap-2 ${!open ? 'ml-5' : ''}`}>
          <Breadcrumb items={getBreadcrumbItems(pathname)} />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          {user && <NotificationIcon />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-lg p-0">
                  <UserAvatarCompact user={user} size="md" forceRefresh={refreshKey > 0} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <AutoFont className="text-sm font-medium leading-none">{user.name || "User"}</AutoFont>
                    {user.email && ( <p className="text-xs leading-none text-muted-foreground"> {user.email} </p> )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                 <DropdownMenuItem onSelect={() => setIsUserModalOpen(true)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsChangePasswordModalOpen(true)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Change Password
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
        </>
      )}
    </>
  );
}
