"use client";

import Image from "next/image";
import { ChevronLeftIcon as ChevronLeft } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { HeaderUniversalSearch } from "@/components/search/HeaderUniversalSearch";
import { convertMinIOUrlToSecureUrl } from "@/lib/imageUtils";

interface HeaderBrandSectionProps {
  currentAppName: string;
  appLogoUrl: string | null;
  showLogoOnly: boolean;
  isMobile: boolean;
  pathname?: string | null;
  supportsHeaderSearch: boolean;
  headerSearchLabel: string;
  onLogoClick: () => void;
  onMobileBack: () => void;
}

export function HeaderBrandSection({
  currentAppName,
  appLogoUrl,
  showLogoOnly,
  isMobile,
  pathname,
  supportsHeaderSearch,
  headerSearchLabel,
  onLogoClick,
  onMobileBack,
}: HeaderBrandSectionProps) {
  return (
    <div className="flex min-w-0 items-center space-x-4 lg:space-x-6">
      <button
        type="button"
        onClick={onLogoClick}
        className="flex min-w-0 items-center group text-left transition-transform duration-200 active:scale-95"
      >
        {appLogoUrl ? (
          <div className="relative mr-4 h-12 w-12 flex-shrink-0">
            <Image
              src={convertMinIOUrlToSecureUrl(appLogoUrl, false) ?? ""}
              alt={currentAppName}
              fill
              unoptimized
              sizes="48px"
              className="object-contain"
            />
            <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center font-bold text-white text-base shadow-[0_4px_12px_rgba(37,99,235,0.3)] mr-4 group-hover:shadow-[0_8px_20px_rgba(37,99,235,0.4)] group-hover:-translate-y-0.5 transition-all duration-300 overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700">
            {currentAppName?.[0] || "F"}
          </div>
        )}
        <div className="hidden lg:flex items-center gap-3 overflow-hidden whitespace-nowrap">
          {!showLogoOnly && (
            <div className="flex flex-col justify-center overflow-hidden">
              <h1 className="font-bold tracking-tight text-lg leading-tight truncate" style={{ color: "var(--header-foreground, inherit)" }}>
                {currentAppName}
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] leading-none mt-0.5 text-blue-600 dark:text-blue-400">
                Platform
              </p>
            </div>
          )}
        </div>
      </button>

      {isMobile && pathname?.includes("/evaluate") && (
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
          onClick={onMobileBack}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      )}

      <div className="hidden lg:block h-8 w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent dark:via-zinc-800 mx-6" />
      {supportsHeaderSearch && (
        <div className="hidden md:flex items-center w-[300px] lg:w-[400px] ml-4">
          <HeaderUniversalSearch placeholder={headerSearchLabel} />
        </div>
      )}
    </div>
  );
}
