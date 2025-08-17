"use client";

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface RecruiterStats {
  totalActivePositions: number;
}

interface RecruiterCardProps {
  recruiter: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    personalColor?: string;
  };
  stats: RecruiterStats;
  isSelected: boolean;
  onSelect: (recruiterId: string) => void;
}

export function RecruiterCard({ recruiter, stats, isSelected, onSelect }: RecruiterCardProps) {
  const personalColor = recruiter.personalColor || '#3B82F6';
  
  return (
    <div 
      className={cn(
        "group cursor-pointer transition-all duration-300 ease-out",
        "relative overflow-hidden rounded-xl border-2",
        "hover:shadow-lg hover:shadow-black/5 hover:scale-[1.02] active:scale-[0.98]",
        isSelected ? [
          "shadow-lg ring-2 ring-offset-2"
        ] : []
      )}
      style={{
        borderColor: personalColor,
        backgroundColor: undefined,
        boxShadow: isSelected ? `0 10px 15px -3px ${personalColor}20, 0 4px 6px -4px ${personalColor}20` : undefined,
      }}
      onClick={() => onSelect(recruiter.id)}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative p-3">
        {/* Modern Header */}
        <div className="flex items-center gap-3">
          {/* Enhanced Avatar with Background */}
          <div className="relative">
            <Avatar className={cn(
              "w-8 h-8 ring-2 ring-white dark:ring-gray-800 shadow-lg",
              "group-hover:shadow-xl group-hover:ring-primary/20 transition-all duration-300"
            )}>
              <AvatarImage 
                src={recruiter.avatar} 
                alt={recruiter.name}
                className="object-cover"
              />
              <AvatarFallback 
                className="text-white font-semibold text-sm tracking-wide shadow-lg"
                style={{ 
                  backgroundColor: personalColor,
                  boxShadow: `0 4px 6px -1px ${personalColor}25`
                }}
              >
                {recruiter.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Name and Selection */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
              {recruiter.name}
            </h3>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {stats.totalActivePositions} active position{stats.totalActivePositions !== 1 ? 's' : ''}
            </div>
          </div>
          
          {/* Selection Indicator */}
          {isSelected && (
            <div 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: personalColor }}
            />
          )}
        </div>
      </div>
    </div>
  );
}