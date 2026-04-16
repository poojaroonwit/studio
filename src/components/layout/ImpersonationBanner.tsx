"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { EyeIcon as Eye } from '@heroicons/react/24/outline';

/**
 * ImpersonationBanner
 * 
 * Displayed at the very top of the application when an administrator
 * is impersonating another user or role.
 */
export function ImpersonationBanner() {
  const { data: session, update } = useSession();

  // Only show if impersonating
  if (!session?.user?.impersonatedUserId && !session?.user?.impersonatedRole) {
    return null;
  }

  const handleExit = async () => {
    try {
      await update({
        impersonatedUserId: null,
        impersonatedRole: null,
      });
      // Forces a full refresh to ensure all permission-gated components re-evaluate
      window.location.reload();
    } catch (error) {
      console.error('Failed to exit impersonation:', error);
    }
  };

  // We show the name with a "Preview:" prefix if we're in impersonation mode
  // The prefix is already added in the session callback in auth.ts
  const displayName = session.user.name || 'Unknown User';

  return (
    <div className="sticky top-0 bg-amber-600 dark:bg-amber-700 text-white px-4 py-1.5 flex items-center justify-between text-sm font-medium z-[100] border-b border-amber-500 shadow-sm transition-all duration-300 h-8">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 animate-pulse" />
        <span>
          You are currently in <strong>Preview Mode</strong>: viewing as <span>{displayName}</span>
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-white/70 text-[10px] uppercase tracking-wider hidden sm:inline">
          Original Account: Admin
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExit}
          className="bg-white/10 hover:bg-white/25 border-white/40 text-white h-6 py-0 px-3 text-xs font-semibold whitespace-nowrap transition-colors"
        >
          Exit Preview
        </Button>
      </div>
    </div>
  );
}
