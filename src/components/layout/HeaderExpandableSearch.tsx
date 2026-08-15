"use client"

import * as React from "react"
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline"

import { HeaderSearchDropdown } from "@/components/search/HeaderUniversalSearchParts"
import { useHeaderUniversalSearch } from "@/components/search/use-header-universal-search"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface HeaderExpandableSearchProps {
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  placeholder: string
}

export function HeaderExpandableSearch({
  expanded,
  onExpandedChange,
  placeholder,
}: HeaderExpandableSearchProps) {
  const search = useHeaderUniversalSearch()
  const inputRef = React.useRef<HTMLInputElement>(null)

  const collapse = React.useCallback(() => {
    search.clearSearch()
    onExpandedChange(false)
  }, [onExpandedChange, search])

  React.useEffect(() => {
    if (!expanded) return
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [expanded])

  React.useEffect(() => {
    const handleShortcutOpen = () => onExpandedChange(true)
    window.addEventListener("header-search:open", handleShortcutOpen)
    return () => window.removeEventListener("header-search:open", handleShortcutOpen)
  }, [onExpandedChange])

  React.useEffect(() => {
    if (!expanded) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!search.containerRef.current?.contains(event.target as Node)) {
        collapse()
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [collapse, expanded, search.containerRef])

  const handleSelect = React.useCallback((result: Parameters<typeof search.handleSelect>[0]) => {
    search.handleSelect(result)
    onExpandedChange(false)
  }, [onExpandedChange, search])

  return (
    <div ref={search.containerRef} className="relative z-[90] h-11 w-11 shrink-0 lg:h-10 lg:w-10">
      <button
        type="button"
        aria-label="Search everything"
        aria-expanded={expanded}
        onClick={() => onExpandedChange(true)}
        className={cn(
          "absolute inset-0 grid place-items-center rounded-full text-slate-300 transition-[transform,opacity,background-color,color] duration-150 ease-[cubic-bezier(0.25,1,0.5,1)] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 motion-reduce:transition-none",
          expanded && "pointer-events-none scale-75 opacity-0",
        )}
      >
        <MagnifyingGlassIcon className="h-6 w-6 stroke-[1.7]" />
      </button>

      <div
        className={cn(
          "absolute right-0 top-1/2 w-[min(22rem,calc(100vw-1.5rem))] origin-right -translate-y-1/2 transition-[transform,opacity] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          expanded
            ? "pointer-events-auto scale-x-100 opacity-100"
            : "pointer-events-none scale-x-75 opacity-0",
        )}
      >
        <div className="group relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 stroke-[1.7] text-slate-400 transition-colors group-focus-within:text-sky-300" />
          <Input
            ref={inputRef}
            id="header-search-input"
            value={search.query}
            placeholder={placeholder}
            onFocus={() => {
              onExpandedChange(true)
              search.setOpen(true)
            }}
            onChange={event => search.handleQueryChange(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Escape") {
                event.preventDefault()
                collapse()
              }
            }}
            className="h-10 w-full !rounded-full border-slate-600 bg-[#1b2638] pl-11 pr-11 text-sm font-normal text-white shadow-xl shadow-slate-950/20 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-400 focus:bg-[#202d42] focus-visible:ring-2 focus-visible:ring-sky-400/40"
          />
          <button
            type="button"
            aria-label="Close search"
            onClick={collapse}
            className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <XMarkIcon className="h-4 w-4 stroke-2" />
          </button>

          {expanded && search.open && (
            <HeaderSearchDropdown
              flatResults={search.flatResults}
              loading={search.loading}
              query={search.query}
              onSelect={handleSelect}
            />
          )}
        </div>
      </div>
    </div>
  )
}
