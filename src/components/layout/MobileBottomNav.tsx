"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BanknotesIcon as Banknotes,
  BriefcaseIcon as Briefcase,
  CalendarDaysIcon as CalendarDays,
  Cog6ToothIcon as Settings,
  CurrencyDollarIcon as CurrencyDollar,
  UserGroupIcon as UserGroup,
  UsersIcon as Users,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { isSidebarItemActive } from "./safe-sidebar-nav-utils";
import { isFullPageWorkspacePath } from "@/lib/full-page-routes";

import { useSession } from "next-auth/react";
import { hasAnyPermission, hasPermission, type SessionLikeUser } from "@/lib/permissions";
import { useLocalization } from '@/contexts/LocalizationContext';

export type MobileNavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

export function buildMobileNavItems(
  user: SessionLikeUser,
  localize: (key: string, fallback: string) => string = (_, fallback) => fallback,
): MobileNavItem[] {
  const items: Array<MobileNavItem & { show: boolean }> = [
    { href: "/my-workday", label: localize("navigation.home", "Home"), icon: CalendarDays, show: true },
    { href: "/ess/team", label: localize("navigation.team", "Team"), icon: UserGroup, show: user.role === "Hiring Manager" || hasAnyPermission(user, ["HR_WORKFORCE_VIEW", "HR_WORKFORCE_MANAGE"]) },
    { href: "/settings", label: localize("navigation.admin", "Admin"), icon: Settings, show: hasPermission(user, "SYSTEM_SETTINGS_VIEW") },
    { href: "/people", label: localize("navigation.people", "People"), icon: Users, show: hasAnyPermission(user, ["HR_PEOPLE_VIEW", "HR_PEOPLE_MANAGE"]) },
    { href: "/applicants", label: localize("navigation.recruiting", "Recruiting"), icon: Briefcase, show: hasAnyPermission(user, ["applicantS_VIEW", "POSITIONS_VIEW"]) },
    { href: "/payroll", label: localize("navigation.payroll", "Payroll"), icon: Banknotes, show: hasAnyPermission(user, ["HR_PAYROLL_VIEW", "HR_PAYROLL_MANAGE"]) },
    { href: "/expenses", label: localize("navigation.expenses", "Expenses"), icon: CurrencyDollar, show: hasAnyPermission(user, ["EXPENSES_VIEW", "EXPENSES_APPROVE", "EXPENSES_FINANCE"]) },
    { href: "/ess/leave", label: localize("navigation.leave", "Leave"), icon: CalendarDays, show: true },
  ];

  return items.filter(item => item.show).slice(0, 5).map(({ show: _show, ...item }) => item);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isEmbeddedFrame, setIsEmbeddedFrame] = React.useState(false);
  const { t } = useLocalization();

  React.useEffect(() => {
    setIsEmbeddedFrame(
      window.self !== window.top ||
      new URLSearchParams(window.location.search).get('adminCenterEmbed') === '1',
    );
  }, []);

  // Hide on login page
  if (pathname?.startsWith('/auth/') || !session?.user || isEmbeddedFrame || isFullPageWorkspacePath(pathname)) {
    return null;
  }

  const filteredNavItems = buildMobileNavItems(session.user, t);

  // Hide on larger screens
  return (
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-[100] border-t border-border/80 bg-card/95 backdrop-blur-md md:hidden no-print",
          "shadow-[0_-4px_16px_hsl(var(--foreground)/0.08)]"
        )}
        aria-label={t("navigation.primaryMobile", "Primary mobile navigation")}
      >
      <div className="flex min-h-16 items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {filteredNavItems.map((item) => {
          const isActive = isSidebarItemActive(pathname || "", item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-xs font-medium",
                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isActive && "fill-current stroke-[1.5]"
                )}
                strokeWidth={isActive ? 1.5 : 2}
              />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


