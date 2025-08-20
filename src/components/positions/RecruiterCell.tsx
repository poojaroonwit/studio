"use client";

import React, { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, Loader2, User, UserPlus, UserX, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecruiterCellProps {
  position: {
    id: string;
    recruiterId?: string | null;
    recruiterName?: string | null;
  };
  availableRecruiters: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
    personalColor?: string;
  }>;
  canManagePositions: boolean;
  isAssigning: boolean;
  onAssignRecruiter: (positionId: string, recruiterId: string | null) => Promise<void>;
  onResetAssigning?: () => void;
}

export function RecruiterCell({
  position,
  availableRecruiters,
  canManagePositions,
  isAssigning,
  onAssignRecruiter,
  onResetAssigning
}: RecruiterCellProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentRecruiter = availableRecruiters.find(r => r.id === position.recruiterId);

  // Filter recruiters based on search term
  const filteredRecruiters = useMemo(() => {
    if (!searchTerm.trim()) {
      return availableRecruiters;
    }
    
    const searchLower = searchTerm.toLowerCase();
    const filtered = availableRecruiters.filter(recruiter => 
      recruiter.name.toLowerCase().includes(searchLower)
    );
    
    return filtered;
  }, [availableRecruiters, searchTerm]);

  // Auto-reset if stuck in assigning state for too long
  React.useEffect(() => {
    if (isAssigning) {
      const timeout = setTimeout(() => {
    
        if (onResetAssigning) {
          onResetAssigning();
        }
      }, 2000); // Reset after 2 seconds

      return () => clearTimeout(timeout);
    }
  }, [isAssigning, position.id, onResetAssigning]);

  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearchTerm('');
    }
  }, [open]);

  // Focus search input when popover opens
  React.useEffect(() => {
    if (open) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select(); // Select all text if any
        }
      }, 100);
    }
  }, [open]);

  const handleSelect = async (recruiterId: string | null) => {

    
    if (isAssigning) {
  
      return;
    }
    
    setOpen(false);
    await onAssignRecruiter(position.id, recruiterId);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  // Read-only view for users without manage permissions
  if (!canManagePositions) {
    return (
      <div className="flex items-center gap-2">
        {position.recruiterName ? (
          <>
                         <Avatar className="h-6 w-6 rounded-full">
              <AvatarImage src={currentRecruiter?.avatarUrl} />
              <AvatarFallback className="text-xs font-medium rounded-full">
                {position.recruiterName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground truncate">
              {position.recruiterName}
            </span>
          </>
        ) : (
          <>
            <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <UserX className="h-3 w-3 text-gray-500" />
            </div>
            <span className="text-sm text-muted-foreground">Unassigned</span>
          </>
        )}
      </div>
    );
  }

  // Editable view for users with manage permissions
  return (
    <div className="flex items-center gap-2">
      <Popover open={open && !isAssigning} onOpenChange={(newOpen) => {
        if (!isAssigning) {
          setOpen(newOpen);
        }
      }}>
        <PopoverTrigger asChild>
                     <Button
             variant="ghost"
             role="combobox"
             aria-expanded={open && !isAssigning}
             className={cn(
               "h-auto p-2 justify-start text-left w-full max-w-[200px] border-0 shadow-none",
               "hover:bg-accent/50 transition-colors",
               isAssigning && "opacity-50 cursor-not-allowed"
             )}
           >
          {isAssigning ? (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
              <span className="text-xs text-muted-foreground">Updating... (auto-reset in 2s)</span>
            </div>
          ) : position.recruiterName ? (
            <div className="flex items-center gap-2 min-w-0">
                             <Avatar className="h-6 w-6 flex-shrink-0 rounded-full">
                <AvatarImage src={currentRecruiter?.avatarUrl} />
                <AvatarFallback className="text-xs font-medium rounded-full">
                  {position.recruiterName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground truncate flex-1">
                {position.recruiterName}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <UserPlus className="h-3 w-3 text-gray-500" />
              </div>
              <span className="text-sm text-muted-foreground">Assign recruiter</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-2">
          <div className="text-sm font-medium mb-2">Select Recruiter</div>
          
          {/* Search Input */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              placeholder="Search recruiters..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10 pr-10 h-8 text-sm focus:ring-2 focus:ring-primary/20"
              data-search-input
              autoComplete="off"
              spellCheck="false"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 hover:bg-accent"
                onClick={handleClearSearch}
                type="button"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {/* Scrollable content area */}
          <div className="max-h-[300px] overflow-y-auto">
            {/* Unassign option - always show */}
            <button
              onClick={() => handleSelect(null)}
              className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
            >
              <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <UserX className="h-3 w-3 text-gray-500" />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-sm">Unassigned</span>
                <span className="text-xs text-muted-foreground">Remove recruiter assignment</span>
              </div>
              {!position.recruiterId && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>

            {/* Divider */}
            {filteredRecruiters.length > 0 && (
              <div className="border-t border-border my-2"></div>
            )}

            {/* Available recruiters */}
            {filteredRecruiters.length > 0 ? (
              filteredRecruiters.map((recruiter) => (
                <button
                  key={recruiter.id}
                  onClick={() => handleSelect(recruiter.id)}
                  className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
                >
                                 <Avatar className="h-6 w-6 rounded-full">
                    <AvatarImage src={recruiter.avatarUrl} />
                    <AvatarFallback className="text-xs font-medium rounded-full">
                      {recruiter.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">{recruiter.name}</span>
                    <span className="text-xs text-muted-foreground">Recruiter</span>
                  </div>
                  {position.recruiterId === recruiter.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))
            ) : searchTerm.trim() ? (
              <div className="p-2 text-center">
                <p className="text-sm text-muted-foreground">
                  No recruiters found matching "{searchTerm}"
                </p>
              </div>
            ) : (
              <div className="p-2 text-center">
                <p className="text-sm text-muted-foreground">
                  No recruiters available
                </p>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
    </div>
  );
}