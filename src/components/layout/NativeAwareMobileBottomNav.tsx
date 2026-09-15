"use client";

import { MobileBottomNav } from './MobileBottomNav';
import { useHriveNativeShell } from '@/hooks/useHriveNativeShell';

export function NativeAwareMobileBottomNav() {
  const isNativeShell = useHriveNativeShell();

  if (isNativeShell) {
    return null;
  }

  return <MobileBottomNav />;
}
