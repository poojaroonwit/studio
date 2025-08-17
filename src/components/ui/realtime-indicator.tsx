import React from 'react';
import { cn } from '@/lib/utils';

interface RealtimeIndicatorProps {
  isConnected: boolean;
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RealtimeIndicator({ 
  isConnected, 
  className, 
  showText = true, 
  size = 'md' 
}: RealtimeIndicatorProps) {
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm'
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50",
      className
    )}>
      <div 
        className={cn(
          "rounded-full transition-colors duration-200",
          sizeClasses[size],
          isConnected 
            ? "bg-green-500 animate-pulse" 
            : "bg-red-500"
        )}
      />
      {showText && (
        <span className={cn(
          "text-muted-foreground font-medium",
          textSizeClasses[size]
        )}>
          {isConnected ? 'Live' : 'Offline'}
        </span>
      )}
    </div>
  );
}
