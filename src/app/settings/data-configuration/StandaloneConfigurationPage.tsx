"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { cn } from "@/lib/utils";

export function StandaloneConfigurationPage({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const embedded = searchParams.get("adminCenterEmbed") === "1";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
    }
  }, [router, status]);

  if (status === "loading") {
    return <PageLoadingState className="min-h-[50vh]" message="Loading configuration..." />;
  }

  if (status === "unauthenticated") {
    return <PageLoadingState className="min-h-[50vh]" message="Redirecting to sign in..." />;
  }

  return (
    <main className={cn("h-full", embedded ? "w-full" : "container mx-auto px-4 py-8")}>
      <div className={cn(
        "min-h-full bg-card p-6",
        embedded ? "rounded-none border-0 shadow-none" : "rounded-lg border shadow-sm",
      )}>
        {children}
      </div>
    </main>
  );
}
