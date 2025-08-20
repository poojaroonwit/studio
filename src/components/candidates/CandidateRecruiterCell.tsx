"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown, Loader2, User, UserPlus, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CandidateRecruiterCellProps {
  candidate: {
    id: string;
    recruiterId?: string | null;
    recruiter?: {
      id: string;
      name: string;
      avatar?: string;
    } | null;
  };
  availableRecruiters: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  canManageCandidates: boolean;
  isAssigning: boolean;
  onAssignRecruiter: (candidateId: string, recruiterId: string | null) => void;
  onResetAssigning?: () => void;
}

export function CandidateRecruiterCell({
  candidate,
  availableRecruiters,
  canManageCandidates,
  isAssigning,
  onAssignRecruiter,
  onResetAssigning
}: CandidateRecruiterCellProps) {
  const [open, setOpen] = useState(false);

  const currentRecruiter = availableRecruiters.find(r => r.id === candidate.recruiterId);



  // Auto-reset if stuck in assigning state for too long
  React.useEffect(() => {
    if (isAssigning) {
      const timeout = setTimeout(() => {
        console.log('Auto-resetting stuck assigning state for candidate:', candidate.id);
        if (onResetAssigning) {
          onResetAssigning();
        }
      }, 2000); // Reset after 2 seconds

      return () => clearTimeout(timeout);
    }
  }, [isAssigning, candidate.id]); // Removed onResetAssigning to prevent infinite loop

  const handleSelect = async (recruiterId: string | null) => {
    console.log('CandidateRecruiterCell handleSelect called:', {
      candidateId: candidate.id,
      recruiterId,
      isAssigning,
      canManageCandidates
    });
    
    if (isAssigning) {
      console.log('Assignment in progress, ignoring selection');
      return;
    }
    
    setOpen(false);
    onAssignRecruiter(candidate.id, recruiterId);
  };

  // Read-only view for users without manage permissions
  if (!canManageCandidates) {
    return (
      <div className="flex items-center gap-2">
        {candidate.recruiter?.name ? (
          <>
            <Avatar className="h-6 w-6">
              <AvatarImage src={currentRecruiter?.avatar} />
              <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {candidate.recruiter.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground truncate">
              {candidate.recruiter.name}
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
              "h-auto p-2 justify-start text-left w-full max-w-[200px]",
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
          ) : candidate.recruiter?.name ? (
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={currentRecruiter?.avatar} />
                <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {candidate.recruiter.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground truncate flex-1">
                {candidate.recruiter.name}
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
          
          {/* Unassign option */}
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
            {!candidate.recruiterId && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </button>

          {/* Available recruiters */}
          {availableRecruiters.map((recruiter) => (
            <button
              key={recruiter.id}
              onClick={() => handleSelect(recruiter.id)}
              className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={recruiter.avatar} />
                <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {recruiter.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1">
                <span className="text-sm font-medium">{recruiter.name}</span>
                <span className="text-xs text-muted-foreground">Recruiter</span>
              </div>
              {candidate.recruiterId === recruiter.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
    </div>
  );
}
