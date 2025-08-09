"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronDown, Loader2, User, UserPlus, UserX } from 'lucide-react';
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
    avatar?: string;
  }>;
  canManagePositions: boolean;
  isAssigning: boolean;
  onAssignRecruiter: (positionId: string, recruiterId: string | null) => Promise<void>;
}

export function RecruiterCell({
  position,
  availableRecruiters,
  canManagePositions,
  isAssigning,
  onAssignRecruiter
}: RecruiterCellProps) {
  const [open, setOpen] = useState(false);

  const currentRecruiter = availableRecruiters.find(r => r.id === position.recruiterId);

  const handleSelect = async (recruiterId: string | null) => {
    setOpen(false);
    await onAssignRecruiter(position.id, recruiterId);
  };

  // Read-only view for users without manage permissions
  if (!canManagePositions) {
    return (
      <div className="flex items-center gap-2">
        {position.recruiterName ? (
          <>
            <Avatar className="h-6 w-6">
              <AvatarImage src={currentRecruiter?.avatar} />
              <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {position.recruiterName.charAt(0).toUpperCase()}
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-auto p-2 justify-start text-left w-full max-w-[200px]",
            "hover:bg-accent/50 transition-colors",
            isAssigning && "opacity-50 cursor-not-allowed"
          )}
          disabled={isAssigning}
        >
          {isAssigning ? (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
              <span className="text-xs text-muted-foreground">Updating...</span>
            </div>
          ) : position.recruiterName ? (
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={currentRecruiter?.avatar} />
                <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {position.recruiterName.charAt(0).toUpperCase()}
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
              <span className="text-sm text-muted-foreground">Unassign recruiter</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search recruiters..." className="h-9" />
          <CommandList>
            <CommandEmpty>No recruiters found.</CommandEmpty>
            <CommandGroup>
              {/* Unassign option */}
              <CommandItem
                onSelect={() => handleSelect(null)}
                className="flex items-center gap-2 p-2"
              >
                <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <UserX className="h-3 w-3 text-gray-500" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm">Unassigned</span>
                  <span className="text-xs text-muted-foreground">Remove recruiter assignment</span>
                </div>
                <Check
                  className={cn(
                    "h-4 w-4",
                    !position.recruiterId ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>

              {/* Available recruiters */}
              {availableRecruiters.map((recruiter) => (
                <CommandItem
                  key={recruiter.id}
                  onSelect={() => handleSelect(recruiter.id)}
                  className="flex items-center gap-2 p-2"
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
                  <Check
                    className={cn(
                      "h-4 w-4",
                      position.recruiterId === recruiter.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}