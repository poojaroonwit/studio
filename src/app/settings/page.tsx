// src/app/settings/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings/appearance");
  }, [router]);
  return null;
}
