"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";

import type { SidebarHeaderUser } from "./sidebar-header-content-types";

export function useSidebarHeaderContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const sidebarContext = useSidebar();
  const { currentTheme } = useTheme();
  const isMountedRef = useRef(true);
  const toggleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastToggleTimeRef = useRef(0);
  const [isToggling, setIsToggling] = useState(false);

  const user = useMemo<SidebarHeaderUser | null>(() => {
    if (!session?.user) {
      return null;
    }

    return {
      id: session.user.id as string,
      name: (session.user.name || session.user.email || "User") as string,
      email: session.user.email ?? undefined,
      role: session.user.role ?? "Recruiter",
      avatarUrl: session.user.avatarUrl ?? null,
      image: session.user.image ?? null,
      personalColor: session.user.personalColor ?? null,
    };
  }, [session?.user]);

  const handleToggle = useCallback(() => {
    if (!isMountedRef.current || isToggling) {
      return;
    }

    const now = Date.now();
    if (now - lastToggleTimeRef.current < 100) {
      return;
    }

    lastToggleTimeRef.current = now;
    setIsToggling(true);

    if (toggleTimeoutRef.current) {
      clearTimeout(toggleTimeoutRef.current);
    }

    toggleTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsToggling(false);
      }
    }, 300);

    sidebarContext?.toggleSidebar?.();
  }, [isToggling, sidebarContext]);

  const handleSettingsSelect = useCallback(() => {
    router.push("/settings");
  }, [router]);

  const handleLogoutSelect = useCallback(() => {
    signOut();
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (toggleTimeoutRef.current) {
        clearTimeout(toggleTimeoutRef.current);
      }
    };
  }, []);

  return {
    user,
    sidebarOpen: Boolean(sidebarContext.open),
    isDarkMode: currentTheme === "dark",
    isToggling,
    handleToggle,
    handleSettingsSelect,
    handleLogoutSelect,
  };
}
