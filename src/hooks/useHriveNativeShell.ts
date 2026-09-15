"use client";

import * as React from 'react';

import { isHriveNativeClient } from '@/lib/native-mobile';

export function useHriveNativeShell(): boolean {
  const [isNativeShell, setIsNativeShell] = React.useState(false);

  React.useEffect(() => {
    setIsNativeShell(isHriveNativeClient());
  }, []);

  return isNativeShell;
}
