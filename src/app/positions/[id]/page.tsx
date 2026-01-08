"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';

export default function PositionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const positionId = params.id as string;
  const [isOpen, setIsOpen] = useState(true);

  // Use a tri-state boolean: null (loading), true (mobile), false (desktop)
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      // Standard mobile breakdown check (matching your hooks/use-mobile.tsx)
      return window.innerWidth < 768;
    };

    // Initial check
    setIsMobile(checkMobile());

    const handleResize = () => {
      setIsMobile(checkMobile());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirect if definitely not mobile
  useEffect(() => {
    if (isMobile === false) {
      router.push('/positions');
    }
  }, [isMobile, router]);

  const handleClose = (open: boolean) => {
    // Only handle explicit close actions (when open is false)
    if (!open) {
      setIsOpen(false);
      // Small delay to allow any animation to complete before navigation
      setTimeout(() => {
        router.push('/positions');
      }, 200);
    }
  };

  // Show loader while checking device type or if explicitly desktop (before redirect happens)
  if (isMobile === null || isMobile === false) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background">
      {/* 
        PositionDetailDrawer handles its own full-screen layout on mobile 
        with 'fixed inset-0' styling. We just need to render it.
      */}
      <PositionDetailDrawer
        isOpen={isOpen}
        onOpenChange={handleClose}
        positionId={positionId}
        preventClose={true}
      />
    </div>
  );
}
