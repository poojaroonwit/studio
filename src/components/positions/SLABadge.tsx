"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { getSLABadgeVariant } from '@/lib/slaUtils';
import type { Position } from '@/lib/types';

interface SLABadgeProps {
  position: Position;
  className?: string;
}

interface SLAResponse {
  violation: any;
  remainingDays: number | null;
  position: {
    id: string;
    title: string;
    isOpen: boolean;
    hasGrade: boolean;
    slaDays: number | null;
  };
}

export function SLABadge({ position, className }: SLABadgeProps) {
  const [slaResult, setSlaResult] = useState<any>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateSLA = async () => {
      if (!position.isOpen || !position.grade?.slaDays || !position.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/positions/${position.id}/sla`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: SLAResponse = await response.json();
        
        // Handle cases where SLA calculation is not possible
        if (data.error) {
          console.warn('SLA calculation not possible:', data.error);
          setSlaResult(null);
          setRemaining(null);
        } else {
          setSlaResult(data.violation);
          setRemaining(data.remainingDays);
        }
      } catch (error) {
        console.error('Error calculating SLA:', error);
        setSlaResult(null);
        setRemaining(null);
      } finally {
        setLoading(false);
      }
    };

    calculateSLA();
  }, [position]);

  if (loading) {
    return (
      <div className={`ml-2 text-[10px] px-1.5 py-0.5 flex items-center gap-1 ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  if (slaResult && slaResult.isViolated) {
    const variant = getSLABadgeVariant(slaResult.daysOverdue);
    return (
      <Badge variant={variant} className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${className}`}>
        SLA overdue {slaResult.daysOverdue}d
      </Badge>
    );
  }

  if (remaining !== null && remaining <= 3 && remaining > 0) {
    return (
      <Badge variant="warning" className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${className}`}>
        SLA due in {remaining}d
      </Badge>
    );
  }

  return null;
}
