"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function StandaloneConfigurationPage({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
    }
  }, [router, status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <main className="container mx-auto h-full px-4 py-8">
      <div className="min-h-full rounded-lg border bg-card p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}
