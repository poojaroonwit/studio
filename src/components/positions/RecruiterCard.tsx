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
  };
  stats: RecruiterStats;
  isSelected: boolean;
  onSelect: (recruiterId: string) => void;
}

export function RecruiterCard({ recruiter, stats, isSelected, onSelect }: RecruiterCardProps) {
  return (
    <div 
      className={cn(
        "group cursor-pointer transition-all duration-300 ease-out",
        "relative overflow-hidden rounded-xl border-2",
        "bg-gradient-to-br from-white to-gray-50/30 dark:from-gray-900 dark:to-gray-800/30",
        "hover:shadow-lg hover:shadow-black/5 hover:scale-[1.02] active:scale-[0.98]",
        isSelected ? [
          "border-primary bg-gradient-to-br from-primary/5 to-primary/10",
          "shadow-lg shadow-primary/10 ring-2 ring-primary/20"
        ] : [
          "border-gray-300 dark:border-gray-600",
          "hover:border-gray-400 dark:hover:border-gray-500"
        ]
      )}
      onClick={() => onSelect(recruiter.id)}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative p-3">
        {/* Modern Header */}
        <div className="flex items-center gap-3 mb-3">
          {/* Enhanced Avatar with Thumbnail */}
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
              <AvatarFallback className={cn(
                "bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500",
                "text-white font-semibold text-sm tracking-wide",
                "shadow-lg shadow-blue-500/25"
              )}>
                {recruiter.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white dark:border-gray-900 shadow-sm" />
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
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </div>


      </div>
    </div>
  );
}