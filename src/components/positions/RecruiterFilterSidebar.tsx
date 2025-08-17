"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users, UserCheck, UserX, TrendingUp } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { RecruiterCard } from './RecruiterCard';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface RecruiterStats {
  totalActivePositions: number;
}

interface RecruiterWithStats extends UserProfile {
  stats: RecruiterStats;
}

interface RecruiterFilterSidebarProps {
  selectedRecruiterId: string | null;
  onRecruiterSelect: (recruiterId: string | null) => void;
  recruiterStats: { [key: string]: number };
}

// All Recruiters Card Component
function AllRecruitersCard({ 
  totalPositions, 
  isSelected, 
  onSelect,
  personalColor
}: { 
  totalPositions: number; 
  isSelected: boolean; 
  onSelect: () => void;
  personalColor: string;
}) {
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
      onClick={onSelect}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative p-3">
        {/* Modern Header */}
        <div className="flex items-center gap-3">
          {/* Enhanced Icon with Background */}
          <div className="relative">
            <div className={cn(
              "w-8 h-8 ring-2 ring-white dark:ring-gray-800 shadow-lg rounded-full",
              "flex items-center justify-center",
              "group-hover:shadow-xl group-hover:ring-blue-500/20 transition-all duration-300"
            )}
            style={{
              backgroundColor: personalColor,
              boxShadow: `0 4px 6px -1px ${personalColor}25`
            }}>
              <UserCheck className="h-4 w-4 text-white" />
            </div>
          </div>
          
          {/* Name and Selection */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
              All Recruiters
            </h3>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {totalPositions} total position{totalPositions !== 1 ? 's' : ''}
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

// Unassigned Positions Card Component
function UnassignedPositionsCard({ 
  unassignedPositions, 
  isSelected, 
  onSelect,
  personalColor
}: { 
  unassignedPositions: number; 
  isSelected: boolean; 
  onSelect: () => void;
  personalColor: string;
}) {
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
      onClick={onSelect}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative p-3">
        {/* Modern Header */}
        <div className="flex items-center gap-3">
          {/* Enhanced Icon with Background */}
          <div className="relative">
            <div className={cn(
              "w-8 h-8 ring-2 ring-white dark:ring-gray-800 shadow-lg rounded-full",
              "flex items-center justify-center",
              "group-hover:shadow-xl group-hover:ring-gray-500/20 transition-all duration-300"
            )}
            style={{
              backgroundColor: personalColor,
              boxShadow: `0 4px 6px -1px ${personalColor}25`
            }}>
              <UserX className="h-4 w-4 text-white" />
            </div>
          </div>
          
          {/* Name and Selection */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
              No recruiter assign
            </h3>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {unassignedPositions} unassigned position{unassignedPositions !== 1 ? 's' : ''}
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

export function RecruiterFilterSidebar({ 
  selectedRecruiterId, 
  onRecruiterSelect, 
  recruiterStats 
}: RecruiterFilterSidebarProps) {
  const { data: session } = useSession();
  const [recruitersWithStats, setRecruitersWithStats] = useState<RecruiterWithStats[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalRecruiters: 0,
    totalPositions: 0,
    totalCandidates: 0,
    unassignedPositions: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current user's personal color
  const currentUserPersonalColor = session?.user?.personalColor || '#3B82F6';

  const fetchRecruiterStatistics = async (recruiterId: string) => {
    try {
      // Fetch positions for recruiter
      const positionsResponse = await fetch(`/api/positions?recruiterId=${recruiterId}&includeStats=true`);
      const positionsData = await positionsResponse.json();
      const activePositions = positionsData.data?.filter((p: any) => p.isOpen) || [];
      
      // Calculate statistics
      const totalActivePositions = activePositions.length;

      return {
        totalActivePositions,
      };
    } catch (error) {
      console.error(`Error fetching statistics for recruiter ${recruiterId}:`, error);
      return {
        totalActivePositions: 0,
      };
    }
  };

  useEffect(() => {
    const fetchRecruitersWithStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all recruiters
        const response = await fetch('/api/users?role=Recruiter');
        if (!response.ok) {
          throw new Error('Failed to fetch recruiters');
        }
        const recruitersData = await response.json();
        
        // Fetch statistics for each recruiter
        const recruitersWithStatsPromises = recruitersData.map(async (recruiter: UserProfile) => {
          const stats = await fetchRecruiterStatistics(recruiter.id);
          return {
            ...recruiter,
            stats
          };
        });
        
        const recruitersWithStats = await Promise.all(recruitersWithStatsPromises);
        setRecruitersWithStats(recruitersWithStats);
        
        // Calculate total statistics
        const totalRecruiters = recruitersWithStats.length;
        const totalPositions = recruitersWithStats.reduce((sum, r) => sum + r.stats.totalActivePositions, 0);
        const totalCandidates = recruitersWithStats.reduce((sum, r) => sum + r.stats.totalCandidates, 0);
        const unassignedPositions = recruiterStats.unassigned || 0;
        
        setTotalStats({
          totalRecruiters,
          totalPositions,
          totalCandidates,
          unassignedPositions
        });
        
      } catch (error) {
        console.error('Error fetching recruiters with stats:', error);
        setError('Failed to load recruiters');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecruitersWithStats();
  }, [recruiterStats]);

  const handleRecruiterClick = (recruiterId: string | null) => {
    onRecruiterSelect(recruiterId);
  };

  if (isLoading) {
    return (
      <div className="h-full">
        <div className="pb-2 mb-2 border-b">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <Users className="h-4 w-4" />
            Recruitments
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full">
        <div className="pb-2 mb-2 border-b">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <Users className="h-4 w-4" />
            Recruitments
          </h2>
        </div>
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Minimal Header */}
      <div className="pb-2 mb-2 border-b">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold mb-2">
          <Users className="h-4 w-4" />
          Recruitments
        </h2>
        
        {/* Ultra Minimal Stats - Single Row */}
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{totalStats.totalRecruiters} recruiters</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="space-y-3 pr-2">
            {/* All Recruiters Option */}
            <AllRecruitersCard
              totalPositions={totalStats.totalPositions}
              isSelected={selectedRecruiterId === null}
              onSelect={() => handleRecruiterClick(null)}
              personalColor={currentUserPersonalColor}
            />

            {/* Unassigned Positions */}
            <UnassignedPositionsCard
              unassignedPositions={totalStats.unassignedPositions}
              isSelected={selectedRecruiterId === 'unassigned'}
              onSelect={() => handleRecruiterClick('unassigned')}
              personalColor={currentUserPersonalColor}
            />

            {/* Individual Recruiter Cards */}
            {recruitersWithStats.map((recruiter) => (
              <RecruiterCard
                key={recruiter.id}
                recruiter={{
                  id: recruiter.id,
                  name: recruiter.name,
                  avatar: recruiter.avatarUrl,
                  personalColor: recruiter.personalColor
                }}
                stats={recruiter.stats}
                isSelected={selectedRecruiterId === recruiter.id}
                onSelect={handleRecruiterClick}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
