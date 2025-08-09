"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users, UserCheck, UserX, TrendingUp } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { RecruiterCard } from './RecruiterCard';

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

export function RecruiterFilterSidebar({ 
  selectedRecruiterId, 
  onRecruiterSelect, 
  recruiterStats 
}: RecruiterFilterSidebarProps) {
  const [recruitersWithStats, setRecruitersWithStats] = useState<RecruiterWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalStats, setTotalStats] = useState({
    totalRecruiters: 0,
    totalPositions: 0,
    totalCandidates: 0,
    unassignedPositions: 0
  });

  const fetchRecruiterStatistics = async (recruiterId: string): Promise<RecruiterStats> => {
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
          <span className="text-muted-foreground">{totalStats.totalPositions} positions</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-1 pr-2">
            {/* All Recruiters Option */}
            <div 
              className={`cursor-pointer transition-all duration-200 p-1.5 rounded border text-xs ${
                selectedRecruiterId === null ? 'bg-primary/10 border-primary' : 'hover:bg-accent border-transparent'
              }`}
              onClick={() => handleRecruiterClick(null)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="h-3 w-3 text-primary" />
                  <span className="font-medium">All</span>
                </div>
                <span className="font-semibold text-primary">{totalStats.totalPositions}</span>
              </div>
            </div>

            {/* Unassigned Positions */}
            <div 
              className={`cursor-pointer transition-all duration-200 p-1.5 rounded border text-xs ${
                selectedRecruiterId === 'unassigned' ? 'bg-primary/10 border-primary' : 'hover:bg-accent border-transparent'
              }`}
              onClick={() => handleRecruiterClick('unassigned')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <UserX className="h-3 w-3 text-orange-500" />
                  <span className="font-medium">Unassigned</span>
                </div>
                <span className="font-semibold text-orange-500">{totalStats.unassignedPositions}</span>
              </div>
            </div>

            {/* Individual Recruiter Cards */}
            {recruitersWithStats.map((recruiter) => (
              <RecruiterCard
                key={recruiter.id}
                recruiter={{
                  id: recruiter.id,
                  name: recruiter.name,
                  avatar: recruiter.avatar
                }}
                stats={recruiter.stats}
                isSelected={selectedRecruiterId === recruiter.id}
                onSelect={handleRecruiterClick}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
