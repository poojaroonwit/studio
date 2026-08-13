"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

import { sidebarConfig, type SidebarNavIcon } from "./SidebarNavConfig";
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
    label: "People",
    description: "Employee records, organization, performance, and growth",
    groupIds: ["people", "performance"],
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
    description: "Recruitment and the candidate-facing portal",
    groupIds: ["recruitment", "job-portal"],
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
    label: "Admin Center",
    description: "Organization setup, access, preferences, and platform controls",
    groupIds: ["admin-center"],
  },
  {
    label: "More",
    description: "Communications, policies, releases, and support",
    groupIds: ["broadcast", "privacy-support", "client", "other"],
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
  icon?: SidebarNavIcon;
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
  const searchParams = useSearchParams();
  const currentHrefState = React.useMemo(() => {
    const queryString = searchParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [pathname, searchParams]);
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
  }, [currentHrefState]);

  return (
    <nav aria-label="Primary navigation" className="hidden h-16 min-w-0 items-stretch lg:flex">
      {categories.map(category => {
        const isActive = category.items.some(item => isSidebarItemActive(currentHrefState, item));
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
                          const active = isSidebarItemActive(currentHrefState, item);
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
  const searchParams = useSearchParams();
  const currentHrefState = React.useMemo(() => {
    const queryString = searchParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [pathname, searchParams]);
  const categories = useHeaderNavigationCategories();
  const activeCategory = categories.find(category =>
    category.items.some(item => isSidebarItemActive(currentHrefState, item)),
  ) ?? categories[0];
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = React.useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
  });

  const updateScrollState = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    const hasOverflow = container.scrollWidth > container.clientWidth + 2;

    const nextState = {
      hasOverflow,
      canScrollLeft: hasOverflow && container.scrollLeft > 2,
      canScrollRight: hasOverflow && container.scrollLeft < maxScrollLeft - 2,
    };

    setScrollState(current => (
      current.hasOverflow === nextState.hasOverflow
      && current.canScrollLeft === nextState.canScrollLeft
      && current.canScrollRight === nextState.canScrollRight
        ? current
        : nextState
    ));
  }, []);

  const scrollMenu = React.useCallback((direction: -1 | 1) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollBy({
      left: direction * Math.max(180, container.clientWidth * 0.65),
      behavior: "smooth",
    });
  }, []);

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollLeft = 0;
    const frame = requestAnimationFrame(updateScrollState);
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);
    Array.from(container.children).forEach(child => resizeObserver.observe(child));

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [activeCategory?.label, updateScrollState]);

  if (!activeCategory) return null;

  return (
    <div className="relative z-40 shrink-0 border-b border-white/10 bg-[#182235]/80 pl-3 pr-0 text-white shadow-sm backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[#182235]/70 sm:pl-4 lg:pl-8">
      <div className="flex h-12 min-w-0 items-stretch">
        <div
          ref={scrollContainerRef}
          onScroll={updateScrollState}
          className="flex min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <nav aria-label={`${activeCategory.label} navigation`} className="flex shrink-0 items-stretch">
            {activeCategory.groups.map((group, groupIndex) => (
              <div
                key={`${activeCategory.label}-${group.id}`}
                className={cn(
                  "flex shrink-0 items-stretch",
                  groupIndex > 0 && "border-l border-white/15",
                )}
              >
                {group.items.map(item => {
                  const active = isSidebarItemActive(currentHrefState, item);
                  return (
                    <Link
                      key={`${activeCategory.label}-${group.id}-${item.href}`}
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
              </div>
            ))}
          </nav>
        </div>
        {scrollState.hasOverflow && (
          <div className="order-last ml-auto flex shrink-0 items-stretch border-l border-white/10 bg-[#182235] shadow-[-12px_0_18px_-14px_rgba(0,0,0,0.9)]">
            <button
              type="button"
              aria-label={`Show previous ${activeCategory.label} navigation items`}
              disabled={!scrollState.canScrollLeft}
              onClick={() => scrollMenu(-1)}
              className="grid w-10 place-items-center rounded-none text-slate-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 disabled:cursor-default disabled:text-slate-600 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Show next ${activeCategory.label} navigation items`}
              disabled={!scrollState.canScrollRight}
              onClick={() => scrollMenu(1)}
              className="grid w-10 place-items-center rounded-none border-l border-white/10 text-slate-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 disabled:cursor-default disabled:text-slate-600 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function buildAdminCenterMegaMenuGroups(
  categoryLabel: string,
  groups: ReturnType<typeof buildFilteredSidebarGroups>,
) {
  if (categoryLabel !== "Admin Center" || groups.length !== 1) return groups;

  const [adminGroup] = groups;
  const columnDefinitions = [
    { id: "admin-essentials", label: "Workspace", items: adminGroup.items.slice(0, 5) },
    { id: "admin-controls", label: "Platform controls", items: adminGroup.items.slice(5, 10) },
    { id: "admin-oversight", label: "Integrations & oversight", items: adminGroup.items.slice(10) },
  ];

  return columnDefinitions
    .filter(column => column.items.length > 0)
    .map(column => ({
      ...adminGroup,
      id: column.id,
      label: column.label,
      icon: column.items[0]?.icon ?? adminGroup.icon,
      items: column.items,
    }));
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

      const presentationGroups = buildAdminCenterMegaMenuGroups(category.label, categoryGroups);

      return {
        ...category,
        icon: presentationGroups[0]?.icon,
        groups: presentationGroups,
        items: categoryGroups.flatMap(group => group.items),
      };
    })
    .filter(category => category.groups.length > 0);
}
