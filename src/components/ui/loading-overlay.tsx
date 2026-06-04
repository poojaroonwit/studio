"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'overlay' | 'inline' | 'skeleton';
  className?: string;
  children?: React.ReactNode;
}

export function LoadingOverlay({
  isLoading,
  text = 'Loading...',
  size = 'md',
  variant = 'overlay',
  className,
  children
}: LoadingOverlayProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-2">
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && (
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {text}
        </p>
      )}
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center justify-center p-4', className)}>
        {spinner}
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-4 bg-muted rounded mb-2" />
        <div className="h-4 bg-muted rounded mb-2 w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    );
  }

  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}
      <div
        className={cn(
          'absolute inset-0 z-50 flex items-center justify-center',
          'bg-black/20 backdrop-blur-sm',
          'transition-opacity duration-200',
          className
        )}
        role="status"
        aria-live="polite"
        aria-label={text}
      >
        {spinner}
      </div>
    </div>
  );
}

// Skeleton components for different content types
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`rounded-lg border bg-card p-6 space-y-4 content-fade-in ${className || ''}`}>
      <div className="flex items-center space-x-4">
        <div className="h-12 w-12 bg-muted rounded-md animate-pulse flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded animate-pulse" />
        <div className="h-4 bg-muted rounded w-5/6 animate-pulse" />
        <div className="h-4 bg-muted rounded w-4/6 animate-pulse" />
      </div>
    </div>
  );
}

// Skeleton card for kanban views
export function SkeletonKanbanCard() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 content-fade-in">
      <div className="flex items-center space-x-3">
        <div className="h-8 w-8 bg-muted rounded-full animate-pulse flex-shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 bg-muted rounded w-2/3 animate-pulse" />
          <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded animate-pulse" />
        <div className="h-3 bg-muted rounded w-4/5 animate-pulse" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <div className="h-5 bg-muted rounded w-16 animate-pulse" />
        <div className="h-5 bg-muted rounded w-20 animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex space-x-4 p-4 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-muted rounded animate-pulse flex-1"
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4 p-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-muted rounded animate-pulse flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Enhanced skeleton table with proper table structure
export function SkeletonTableRows({ rows = 10, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={`skeleton-row-${i}`} className="content-fade-in">
          {Array.from({ length: columns }).map((_, j) => (
            <td key={`skeleton-cell-${i}-${j}`} className="p-4">
              <div className="h-4 bg-muted rounded animate-pulse w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonList({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3 stagger-fade-in">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
          <div className="h-10 w-10 bg-muted rounded-md animate-pulse flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Page loading component
export function PageLoading({ 
  text = 'Loading page...',
  size = 'lg'
}: {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div className="min-flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className={cn(
          'animate-spin text-primary mx-auto',
          size === 'sm' ? 'h-6 w-6' : size === 'md' ? 'h-8 w-8' : 'h-12 w-12'
        )} />
        <p className="text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

// Button loading state
export function LoadingButton({
  isLoading,
  children,
  loadingText = 'Loading...',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  loadingText?: string;
}) {
  return (
    <button
      {...props}
      type={props.type || 'button'}
      disabled={isLoading || props.disabled}
      className={cn(
        'inline-flex items-center justify-center',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        props.className
      )}
    >
      {isLoading && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      )}
      {isLoading ? loadingText : children}
    </button>
  );
} 
