"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import { useIsMobile } from '@/hooks/use-mobile';

export default function PositionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const positionId = params.id as string;
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // Redirect to positions page if not mobile
  useEffect(() => {
    if (!isMobile) {
      router.push('/positions');
    }
  }, [isMobile, router]);

  const handleClose = (open: boolean) => {
    // Prevent multiple close attempts
    if (isClosing) return;
    
    // Only handle explicit close actions (when open is false)
    if (!open) {
      setIsClosing(true);
      setIsOpen(false);
      // Small delay to allow drawer animation to complete
      setTimeout(() => {
        router.push('/positions');
      }, 200);
    }
  };

  if (!isMobile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleClose(false)}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Position Details</h1>
        </div>
      </div>

      {/* Position Detail Content */}
      <div className="pt-[57px] h-full">
        <PositionDetailDrawer
          isOpen={isOpen}
          onOpenChange={handleClose}
          positionId={positionId}
          preventClose={true}
        />
      </div>
    </div>
  );
}
