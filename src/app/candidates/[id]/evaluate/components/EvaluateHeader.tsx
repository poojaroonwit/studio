"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface EvaluateHeaderProps {
  candidateName: string;
  appLogoUrl: string | null;
  evaluateHeaderTextColor: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function EvaluateHeader({
  candidateName,
  appLogoUrl,
  evaluateHeaderTextColor,
  onBack,
  showBackButton = false,
}: EvaluateHeaderProps) {
  return (
    <div className="py-12 flex items-center justify-between px-6 sm:px-10">
      <div className="flex items-center gap-2 sm:gap-4">
        {showBackButton && onBack && (
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12"
            style={{ color: `hsl(${evaluateHeaderTextColor})`, borderColor: `hsl(${evaluateHeaderTextColor})` }}
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: `hsl(${evaluateHeaderTextColor})` }} />
          </Button>
        )}
        <div>
          <div className="text-xs sm:text-sm uppercase tracking-wide" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>Candidate</div>
          <h1 className="text-xl sm:text-3xl font-semibold leading-tight" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>{candidateName}</h1>
        </div>
      </div>
      {appLogoUrl && (
        <div>
          <img src={appLogoUrl} alt="App Logo" className="h-8 sm:h-10 w-auto" />
        </div>
      )}
    </div>
  );
}

