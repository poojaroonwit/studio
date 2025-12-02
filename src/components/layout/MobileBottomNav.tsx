"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Briefcase, ListTodo, UploadCloud, Settings, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/applicants", label: "Applicants", icon: Users },
  { href: "/positions", label: "Positions", icon: Briefcase },
  { href: "/evaluate", label: "Evaluate", icon: FileCheck },
  // Tasks removed from mobile navigation
  // { href: "/my-tasks", label: "Tasks", icon: ListTodo },
  // Queue removed from mobile navigation (will be shown in avatar modal)
  // { href: "/process-queue", label: "Queue", icon: UploadCloud },
  // Settings removed from mobile navigation (will be shown in avatar modal)
  // { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  // Hide on larger screens
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-md md:hidden no-print">
      <div className="flex justify-around items-stretch h-14">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center text-[10px] gap-0.5",
                "transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive && "stroke-[2.2]")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


