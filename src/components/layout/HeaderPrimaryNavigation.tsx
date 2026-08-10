"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocalization } from "@/contexts/LocalizationContext";
import { isAdminUser } from "@/lib/permissions";
import type { PlatformModuleId } from "@/lib/types";
import { cn } from "@/lib/utils";

import { sidebarConfig } from "./SidebarNavConfig";
import { hasSidebarItemPermission } from "./safe-sidebar-permissions";
import {
  buildFilteredSidebarGroups,
  formatProcessQueueBadgeCount,
  isSidebarItemActive,
  shouldShowProcessQueueBadge,
} from "./safe-sidebar-nav-utils";
import { localizeSidebarText } from "./sidebar-localization";
import { usePendingCount } from "./use-pending-count";

const megaMenuCategories = [
  {
    label: "Home",
    description: "Daily workspace and employee portal",
    groupIds: ["employee-portal"],
  },
  {
    label: "Admin Center",
    description: "HR configuration, governance, and platform controls",
    groupIds: ["admin-center"],
  },
  {
    label: "People",
    description: "Employee records, organization, and lifecycle",
    groupIds: ["people"],
  },
  {
    label: "ESS",
    description: "Employee self-service, requests, and personal work",
    groupIds: ["ess"],
  },
  {
    label: "Pay",
    description: "Payroll, compensation, benefits, and expenses",
    groupIds: ["payroll", "expenses"],
  },
  {
    label: "Time",
    description: "Attendance, rosters, overtime, and workforce planning",
    groupIds: ["workforce"],
  },
  {
    label: "Leave",
    description: "Leave requests, balances, policies, and allocation",
    groupIds: ["leaves"],
  },
  {
    label: "Hiring",
    description: "Recruitment, clients, and the candidate-facing portal",
    groupIds: ["recruitment", "client", "job-portal"],
  },
  {
    label: "Analytics",
    description: "Data operations, reporting, and monitoring tools",
    groupIds: ["data-and-analytics", "other"],
  },
  {
    label: "Learning",
    description: "Courses, paths, achievements, and certificates",
    groupIds: ["learning"],
  },
  {
    label: "More",
    description: "Communications, policies, releases, and support",
    groupIds: ["broadcast", "privacy-support"],
  },
] as const;

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type HeaderCategoryForNavigation = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: {
    href?: string;
  }[];
  groups: {
    items: {
      href?: string;
    }[];
  }[];
};

function getCategoryFirstHref(category: HeaderCategoryForNavigation) {
  const firstItemHref = category.items.find(item => Boolean(item.href))?.href;
  if (!firstItemHref) return undefined;

  if (category.label === "Home") return firstItemHref;

  const nonPortalFirstItemHref = category.items.find(item => item.href && item.href !== "/employee-portal")?.href;
  return nonPortalFirstItemHref ?? firstItemHref;
}

export function HeaderPrimaryNavigation({ pathname }: { pathname: string }) {
  const categories = useHeaderNavigationCategories();
  const { pendingCount } = usePendingCount();
  const router = useRouter();
  const [openCategory, setOpenCategory] = React.useState<string | null>(null);
  const openTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimer = React.useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleOpen = React.useCallback((label: string) => {
    clearCloseTimer();
    clearOpenTimer();
    openTimerRef.current = setTimeout(() => setOpenCategory(label), 90);
  }, [clearCloseTimer, clearOpenTimer]);

  const scheduleClose = React.useCallback((label: string) => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpenCategory(current => current === label ? null : current);
    }, 160);
  }, [clearCloseTimer, clearOpenTimer]);

  React.useEffect(() => () => {
    clearOpenTimer();
    clearCloseTimer();
  }, [clearCloseTimer, clearOpenTimer]);

  React.useEffect(() => {
    setOpenCategory(null);
  }, [pathname]);

  return (
    <nav aria-label="Primary navigation" className="hidden h-16 min-w-0 items-stretch lg:flex">
      {categories.filter(category => category.label !== "Admin Center").map(category => {
        const isActive = category.items.some(item => isSidebarItemActive(pathname, item));
        const columnCount = Math.min(category.groups.length, 3);
        const firstItemHref = getCategoryFirstHref(category);

        return (
          <DropdownMenu
            key={category.label}
            modal={false}
            open={openCategory === category.label}
            onOpenChange={open => {
              clearOpenTimer();
              clearCloseTimer();
              setOpenCategory(current => {
                if (open) return category.label;
                return current === category.label ? null : current;
              });
            }}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={(event) => {
                  if (firstItemHref) {
                    event.preventDefault();
                    setOpenCategory(null);
                    void router.push(firstItemHref);
                  }
                }}
                onMouseEnter={() => scheduleOpen(category.label)}
                onMouseLeave={() => scheduleClose(category.label)}
                className={cn(
                  "relative flex items-center gap-1.5 px-2 text-sm font-normal leading-6 tracking-[-0.01em] text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 xl:px-3",
                  isActive && "font-medium text-white after:absolute after:inset-x-2.5 after:bottom-0 after:h-[3px] after:bg-[#4d7fff]",
                )}
              >
                {(() => {
                  const CategoryIcon = category.groups?.[0]?.icon;
                  return CategoryIcon ? <CategoryIcon className="h-4 w-4 shrink-0 stroke-[1.7]" /> : null;
                })()}
                {category.label}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              sideOffset={0}
              onMouseEnter={clearCloseTimer}
              onMouseLeave={() => scheduleClose(category.label)}
              className="z-[120] max-h-[72vh] w-[min(92vw,780px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-slate-950 shadow-2xl data-[state=closed]:animate-none data-[state=closed]:opacity-0 motion-reduce:animate-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-zinc-800">
                <div>
                  <p className="text-sm font-semibold">{category.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                    {category.description}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {category.items.length} link{category.items.length === 1 ? "" : "s"}
                </span>
              </div>

              <div
                className="grid items-start gap-5"
                style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
              >
                {category.groups.map(group => {
                  const GroupIcon = group.icon;

                  return (
                    <section key={group.id} className="min-w-0">
                      <div className="mb-2 flex items-center gap-2 px-2">
                        <GroupIcon className="h-4 w-4 shrink-0 stroke-[1.7] text-[#4d7fff]" />
                        <h2 className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-zinc-400">
                          {group.label}
                        </h2>
                      </div>

                      <div className="space-y-0.5">
                        {group.items.map(item => {
                          const ItemIcon = item.icon;
                          const active = isSidebarItemActive(pathname, item);
                          const badge = shouldShowProcessQueueBadge(item, pendingCount)
                            ? formatProcessQueueBadgeCount(pendingCount)
                            : null;

                          return (
                            <DropdownMenuItem key={`${group.id}-${item.href}`} asChild>
                              <Link
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                  "group flex min-h-11 cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 text-sm font-normal text-slate-700 outline-none transition-colors focus:bg-slate-100 focus:text-slate-950 dark:text-zinc-300 dark:focus:bg-zinc-800 dark:focus:text-white",
                                  active && "bg-blue-50 font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
                                )}
                              >
                                <ItemIcon className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.7]" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate leading-5">{item.label}</span>
                                  {item.description && (
                                    <span className="mt-0.5 block line-clamp-2 text-xs font-normal leading-4 text-slate-400 group-focus:text-slate-500 dark:text-zinc-500 dark:group-focus:text-zinc-400">
                                      {item.description}
                                    </span>
                                  )}
                                </span>
                                {badge && (
                                  <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                                    {badge}
                                  </span>
                                )}
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </nav>
  );
}

export function HeaderSecondaryNavigation({ pathname }: { pathname: string }) {
  const categories = useHeaderNavigationCategories();
  const activeCategory = categories.find(category =>
    category.items.some(item => isSidebarItemActive(pathname, item)),
  ) ?? categories[0];

  if (!activeCategory) return null;

  const CategoryIcon = activeCategory.groups[0]?.icon;

  return (
    <div className="relative z-40 shrink-0 border-b border-white/10 bg-[#182235]/80 px-3 text-white shadow-sm backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[#182235]/70 sm:px-4 lg:px-8">
      <div className="flex h-12 min-w-0 items-stretch gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-white/10 bg-[#182235]/80 pr-4 text-xs font-semibold uppercase tracking-[0.08em] text-slate-200 backdrop-blur-xl supports-[backdrop-filter]:bg-[#182235]/70">
          {CategoryIcon && <CategoryIcon className="h-4 w-4 stroke-[1.8] text-[#7ea0ff]" />}
          {activeCategory.label}
        </div>
        <nav aria-label={`${activeCategory.label} navigation`} className="flex shrink-0 items-stretch">
          {activeCategory.items.map(item => {
            const active = isSidebarItemActive(pathname, item);
            return (
              <Link
                key={`${activeCategory.label}-${item.href}`}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex shrink-0 items-center px-3 text-sm font-normal tracking-[-0.01em] text-slate-300 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 sm:px-4",
                  active && "font-semibold text-white after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-[#4d7fff]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function useHeaderNavigationCategories() {
  const { data: session, status } = useSession();
  const { t } = useLocalization();
  const isAdmin = isAdminUser(session?.user);
  const modulePermissions = (session?.user?.modulePermissions ?? []) as PlatformModuleId[];

  const groups = React.useMemo(() => {
    if (status === "loading") return [];

    return buildFilteredSidebarGroups(
      sidebarConfig,
      item => hasSidebarItemPermission(item, isAdmin, modulePermissions, session?.user),
    ).map(group => ({
      ...group,
      label: localizeSidebarText(t, "group", group.id, group.label),
      items: group.items.map(item => ({
        ...item,
        label: localizeSidebarText(t, "item", slug(item.label), item.label),
        description: item.description
          ? localizeSidebarText(t, "description", slug(item.label), item.description)
          : item.description,
      })),
    }));
  }, [isAdmin, modulePermissions, session?.user, status, t]);

  return megaMenuCategories
    .map(category => {
      const categoryGroups = category.groupIds
        .map(groupId => groups.find(group => group.id === groupId))
        .filter((group): group is NonNullable<typeof group> => Boolean(group));

      return {
        ...category,
        icon: categoryGroups[0]?.icon,
        groups: categoryGroups,
        items: categoryGroups.flatMap(group => group.items),
      };
    })
    .filter(category => category.groups.length > 0);
}
