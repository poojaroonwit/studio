"use client";

import React, { useState, useMemo } from 'react';
import { Users, UserCheck, UserX, User, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface RecruiterFilterSidebarProps {
  selectedRecruiterId: string | null;
  onRecruiterSelect: (recruiterId: string | null) => void;
  recruiterStats?: {
    unassigned?: number;
    unassignedVacant?: number;
    [key: string]: any;
  };
  recruiters?: { id: string; name: string; avatarUrl?: string; personalColor?: string; vacantHeadcount?: number }[];
}

export function RecruiterFilterSidebar({ 
  selectedRecruiterId, 
  onRecruiterSelect, 
  recruiterStats,
  recruiters = []
}: RecruiterFilterSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Get all recruiter IDs from the recruiters prop, not just from stats
  const recruiterIds = recruiters.map(r => r.id);

  // Filter recruiters based on search term
  const filteredRecruiters = useMemo(() => {
    if (!searchTerm.trim()) {
      return recruiterIds;
    }
    
    const searchLower = searchTerm.toLowerCase();
    const filtered = recruiterIds.filter(recruiterId => {
      const recruiter = recruiters.find(r => r.id === recruiterId);
      return recruiter?.name.toLowerCase().includes(searchLower);
    });
    return filtered;
  }, [recruiterIds, recruiters, searchTerm]);

  // Always show unassigned section, even when there are 0 unassigned positions
  const showUnassigned = recruiterStats?.unassigned !== undefined;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="pb-4 mb-4 border-b border-border/50">
        <h2 className="flex items-center gap-2 text-xl font-bold mb-2">
          <Users className="h-6 w-6 text-primary" />
          Recruiters
        </h2>
        <p className="text-base text-muted-foreground font-medium">
          Filter positions by assigned recruiter
        </p>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recruiters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <nav className="space-y-1">
          {/* All Recruiters Option - Always show when no search or search matches */}
          {(!searchTerm.trim() || 'all recruiters'.includes(searchTerm.toLowerCase())) && (
            <div 
              className={cn(
                "group flex items-center px-3 py-4 text-sm font-semibold transition-all duration-200 hover:bg-muted/80 hover:text-primary relative h-20 cursor-pointer",
                selectedRecruiterId === null
                  ? "bg-muted/60 text-primary font-bold"
                  : "text-muted-foreground"
              )}
              onClick={() => onRecruiterSelect(null)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={cn(
                  "p-2 rounded-lg transition-colors shrink-0",
                  selectedRecruiterId === null 
                    ? "bg-primary/20 text-primary"
                    : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}>
                  <UserCheck className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mb-1">
                    <span className="truncate font-semibold text-base">All Recruiters</span>
                  </div>
                  <p className={cn(
                    "text-sm leading-relaxed break-words line-clamp-2 font-medium",
                    selectedRecruiterId === null ? "text-primary/80" : "text-muted-foreground/80"
                  )}>
                    View all positions across all recruiters
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Only show unassigned section if there are unassigned positions and search matches */}
          {showUnassigned && (
            <>
              <div className="border-b border-border/50 mx-3 my-1"></div>
              
              {/* Unassigned Positions Option */}
              <div 
                className={cn(
                  "group flex items-center px-3 py-4 text-sm font-semibold transition-all duration-200 hover:bg-muted/80 hover:text-primary relative h-20 cursor-pointer",
                  selectedRecruiterId === 'unassigned'
                    ? "bg-muted/60 text-primary font-bold"
                    : "text-muted-foreground"
                )}
                onClick={() => onRecruiterSelect('unassigned')}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn(
                    "p-2 rounded-lg transition-colors shrink-0",
                    selectedRecruiterId === 'unassigned' 
                      ? "bg-orange-500/20 text-orange-600"
                      : "bg-muted/50 text-muted-foreground group-hover:bg-orange-500/10 group-hover:text-orange-600"
                  )}>
                    <UserX className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                      <span className="truncate font-semibold text-base">No Recruiter Assigned</span>
                    </div>
                                        <p className={cn(
                      "text-sm leading-relaxed break-words line-clamp-2 font-medium",
                      selectedRecruiterId === 'unassigned' ? "text-primary/80" : "text-muted-foreground/80"
                    )}>
                      {recruiterStats.unassigned} positions without recruiter • {recruiterStats.unassignedVacant || 0} vacant
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Individual Recruiters - Show filtered recruiters */}
          {filteredRecruiters.length > 0 && (
            <>
              <div className="border-b border-border/50 mx-3 my-1"></div>
              
              {filteredRecruiters.map((recruiterId, index) => {
                const positionCount = recruiterStats?.[recruiterId] || 0;
                const isActive = selectedRecruiterId === recruiterId;
                
                // Find recruiter data by ID
                const recruiter = recruiters.find(r => r.id === recruiterId);
                const recruiterName = recruiter?.name || `Recruiter ${recruiterId}`;
                const recruiterAvatar = recruiter?.avatarUrl;
                const recruiterColor = recruiter?.personalColor || '#3B82F6'; // Default blue if no personal color
                
                // Generate a consistent color based on recruiter ID
                const colors = [
                  'bg-blue-500/20 text-blue-600',
                  'bg-purple-500/20 text-purple-600', 
                  'bg-green-500/20 text-green-600',
                  'bg-pink-500/20 text-pink-600',
                  'bg-indigo-500/20 text-indigo-600',
                  'bg-teal-500/20 text-teal-600'
                ];
                // Use a fallback index if recruiterId is not a valid number
                const parsedId = parseInt(recruiterId);
                const colorIndex = isNaN(parsedId) ? index % colors.length : parsedId % colors.length;
                const activeColor = colors[colorIndex];
                const hoverColor = activeColor.replace('/20', '/10');
                
                return (
                  <React.Fragment key={recruiterId}>
                    <div 
                      className={cn(
                        "group flex items-center px-3 py-4 text-sm font-semibold transition-all duration-200 hover:bg-muted/80 hover:text-primary relative h-20 cursor-pointer",
                        isActive
                          ? "bg-muted/60 text-primary font-bold"
                          : "text-muted-foreground"
                      )}
                      onClick={() => onRecruiterSelect(recruiterId)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div 
                          className={cn(
                            "rounded-full transition-colors shrink-0 border-4",
                            isActive 
                              ? "bg-muted/20"
                              : "bg-muted/20 group-hover:bg-muted/30"
                          )}
                          style={{
                            borderColor: isActive ? recruiterColor : 'transparent'
                          }}
                        >
                          {recruiterAvatar ? (
                            <Avatar className="h-10 w-10 rounded-full">
                              <AvatarImage src={recruiterAvatar} alt={recruiterName} className="rounded-full" />
                              <AvatarFallback className="text-sm font-medium rounded-full">
                                {recruiterName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <User className="h-10 w-10" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-1">
                            <span className="truncate font-semibold text-base">{recruiterName}</span>
                          </div>
                          <p className={cn(
                            "text-sm leading-relaxed break-words line-clamp-2 font-medium",
                            isActive ? "text-primary/80" : "text-muted-foreground/80"
                          )}>
                            {positionCount} active positions • {recruiter?.vacantHeadcount || 0} vacant
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {index < filteredRecruiters.length - 1 && (
                      <div className="border-b border-border/50 mx-3 my-1"></div>
                    )}
                  </React.Fragment>
                );
              })}
            </>
          )}

          {/* Show message when no recruiters match search */}
          {searchTerm.trim() && filteredRecruiters.length === 0 && !showUnassigned && (
            <div className="px-3 py-8 text-center">
              <p className="text-base text-muted-foreground font-medium">
                No recruiters found matching "{searchTerm}"
              </p>
            </div>
          )}

          {/* Show message when no recruiters are available */}
          {!searchTerm.trim() && recruiterIds.length === 0 && recruiterStats?.unassigned === undefined && (
            <div className="px-3 py-8 text-center">
              <p className="text-base text-muted-foreground font-medium">
                No recruiters available
              </p>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}