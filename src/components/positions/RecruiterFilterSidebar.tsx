"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users, UserCheck, UserX } from "lucide-react";
import type { UserProfile } from "@/lib/types";

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
  const [recruiters, setRecruiters] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecruiters = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/users?role=Recruiter');
        if (!response.ok) {
          throw new Error('Failed to fetch recruiters');
        }
        const recruitersData = await response.json();
        setRecruiters(recruitersData);
      } catch (error) {
        console.error('Error fetching recruiters:', error);
        setError('Failed to load recruiters');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecruiters();
  }, []);

  const handleRecruiterClick = (recruiterId: string | null) => {
    onRecruiterSelect(recruiterId);
  };

  if (isLoading) {
    return (
      <Card className="h-fit border-0 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Recruiters
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-2">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-fit border-0 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Recruiters
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-2">
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Recruiters
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-2">
        <ScrollArea className="h-[400px]">
          <div className="space-y-1">
            {/* All Recruiters Option */}
            <Button
              variant={selectedRecruiterId === null ? "default" : "ghost"}
              className="w-full justify-start h-auto p-2"
              onClick={() => handleRecruiterClick(null)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  <span className="font-medium">All Recruiters</span>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  {Object.values(recruiterStats).reduce((sum, count) => sum + count, 0)}
                </Badge>
              </div>
            </Button>

            {/* Unassigned Positions */}
            <Button
              variant={selectedRecruiterId === 'unassigned' ? "default" : "ghost"}
              className="w-full justify-start h-auto p-2"
              onClick={() => handleRecruiterClick('unassigned')}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <UserX className="h-4 w-4" />
                  <span className="font-medium">Unassigned</span>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  {recruiterStats.unassigned || 0}
                </Badge>
              </div>
            </Button>

            {/* Individual Recruiters */}
            {recruiters.map((recruiter) => (
              <Button
                key={recruiter.id}
                variant={selectedRecruiterId === recruiter.id ? "default" : "ghost"}
                className="w-full justify-start h-auto p-2"
                onClick={() => handleRecruiterClick(recruiter.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-medium truncate">{recruiter.name}</span>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {recruiterStats[recruiter.id] || 0}
                  </Badge>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
