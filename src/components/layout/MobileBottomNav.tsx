"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Squares2X2Icon as LayoutDashboard,
  UsersIcon as Users,
  BriefcaseIcon as Briefcase,
  ClipboardDocumentListIcon as ListTodo,
  CloudArrowUpIcon as UploadCloud,
  Cog6ToothIcon as Settings,
  ClipboardDocumentCheckIcon as FileCheck,
  CalendarIcon as Calendar
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/applicants", label: "Applicants", icon: Users, permissionId: "applicantS_VIEW" },
  { href: "/candidates", label: "Candidates", icon: Users, permissionId: "applicantS_VIEW" },
  { href: "/positions", label: "Positions", icon: Briefcase, permissionId: "POSITIONS_VIEW" },
  { href: "/calendar", label: "Interview Calendar", icon: Calendar, permissionId: "EVALUATION_LINKS_VIEW" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Hide on login page
  if (pathname === '/auth/signin' || !session) {
    return null;
  }

  // Filter items based on permissions
  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (!item.permissionId) return true;
    return hasPermission(session.user, item.permissionId);
  });

  // Hide on larger screens
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[100] border-t bg-card/95 backdrop-blur-md md:hidden no-print",
        "shadow-[0_-4px_12px_rgba(0,0,0,0.1)]"
      )}
    >
      <div className="flex justify-around items-stretch h-14 safe-area-inset-bottom">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center text-[10px] gap-0.5",
                "transition-colors relative",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive && "fill-current stroke-[1.5]"
                )}
                strokeWidth={isActive ? 1.5 : 2}
              />
              <span className="truncate max-w-full px-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


