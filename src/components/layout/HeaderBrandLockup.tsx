"use client";

import Image from "next/image";

import { convertMinIOUrlToSecureUrl } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";

const DEFAULT_COMPANY_LOGO_URL = "/brand/default-company-building.svg";

interface HeaderBrandLockupProps {
  appLogoUrl: string | null;
  currentAppName: string;
  compact?: boolean;
}

export function HeaderBrandLockup({
  appLogoUrl,
  currentAppName,
  compact = false,
}: HeaderBrandLockupProps) {
  const configuredCompanyLogoUrl = convertMinIOUrlToSecureUrl(appLogoUrl, false);
  const companyLogoUrl = configuredCompanyLogoUrl || DEFAULT_COMPANY_LOGO_URL;
  const isDefaultCompanyLogo = companyLogoUrl === DEFAULT_COMPANY_LOGO_URL;

  return (
    <span className={cn("flex min-w-0 items-center", compact ? "gap-2" : "gap-2.5")}>
      <span
        className={cn(
          "relative grid shrink-0 place-items-center overflow-hidden",
          compact ? "h-7 w-7" : "h-8 w-8",
          isDefaultCompanyLogo && "rounded-md bg-transparent",
        )}
      >
        <Image
          src={companyLogoUrl}
          alt={`${currentAppName} company logo`}
          fill
          unoptimized
          sizes={compact ? "28px" : "32px"}
          className={cn("object-contain", isDefaultCompanyLogo && "p-0.5 brightness-0 invert")}
        />
      </span>

      <span aria-hidden="true" className="h-6 w-px shrink-0 bg-slate-500/80" />

      <Image
        src="/brand/hrive-wordmark-transparent.png"
        alt="hrive application"
        width={145}
        height={44}
        priority
        className={cn("shrink-0 object-contain", compact ? "h-5 w-auto" : "h-[1.375rem] w-auto")}
      />

    </span>
  );
}
