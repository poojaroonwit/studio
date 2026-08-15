"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { isSidebarItemActive } from "./safe-sidebar-nav-utils";
import {
  useCurrentHeaderHref,
  useHeaderNavigationCategories,
} from "./use-header-navigation-categories";

interface ScrollState {
  hasOverflow: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

const EMPTY_SCROLL_STATE: ScrollState = {
  hasOverflow: false,
  canScrollLeft: false,
  canScrollRight: false,
};

export function HeaderSecondaryNavigation({ pathname }: { pathname: string }) {
  const currentHrefState = useCurrentHeaderHref(pathname);
  const categories = useHeaderNavigationCategories();
  const activeCategory = categories.find(category =>
    category.items.some(item => isSidebarItemActive(currentHrefState, item)),
  ) ?? categories[0];
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = React.useState<ScrollState>(EMPTY_SCROLL_STATE);

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
    setScrollState(EMPTY_SCROLL_STATE);

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
        {scrollState.hasOverflow ? (
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
        ) : null}
      </div>
    </div>
  );
}
