"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface LiveBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function LiveBadge({ className, size = 'sm', showText = false }: LiveBadgeProps) {
  const dotSizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1",
      className
    )}>
      <div className={cn(
        "rounded-full bg-green-500 animate-pulse shadow-sm",
        "ring-1 ring-green-400/30",
        dotSizeClasses[size]
      )} />
      {showText && (
        <span className="text-xs font-medium text-green-600 dark:text-green-400">LIVE</span>
      )}
    </div>
  );
}
