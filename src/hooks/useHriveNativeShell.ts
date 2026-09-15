"use client";

import * as React from 'react';

import { isHriveNativeClient } from '@/lib/native-mobile';

export function useHriveNativeShell(): boolean | null {
  const [isNativeShell, setIsNativeShell] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    setIsNativeShell(isHriveNativeClient());
  }, []);

  return isNativeShell;
}
