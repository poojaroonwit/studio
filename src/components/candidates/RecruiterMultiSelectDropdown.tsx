import React, { useState } from 'react';
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface RecruiterMultiSelectDropdownProps {
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  placeholder?: string;
  className?: string;
  recruiters: { id: string; name: string }[];
}

export function RecruiterMultiSelectDropdown({
  selectedIds,
  onSelectionChange,
  placeholder = "Select recruiters...",
  className,
  recruiters
}: RecruiterMultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  

  


  // Filter recruiters based on search term
  const filteredRecruiters = recruiters.filter(recruiter => 
    recruiter.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedRecruiters = recruiters.filter(recruiter => selectedIds.has(recruiter.id));
  const hasUnassigned = selectedIds.has('unassigned');

  const handleToggleRecruiter = (recruiterId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(recruiterId)) {
      newSelected.delete(recruiterId);
    } else {
      newSelected.add(recruiterId);
    }
    onSelectionChange(newSelected);
  };

  const handleRemoveRecruiter = (recruiterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    newSelected.delete(recruiterId);
    onSelectionChange(newSelected);
  };

  const renderTrigger = () => {
    if (selectedIds.size === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    if (selectedIds.size === 1) {
      const recruiterId = Array.from(selectedIds)[0];
      if (recruiterId === 'unassigned') {
        return (
          <div className="flex items-center gap-1">
            <span className="text-foreground">Unassigned</span>
            <X
              className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={(e: React.MouseEvent) => handleRemoveRecruiter('unassigned', e)}
            />
          </div>
        );
      }
      const recruiter = recruiters.find(r => r.id === recruiterId);
      if (recruiter) {
        return (
          <div className="flex items-center gap-1">
            <span className="text-foreground">{recruiter.name}</span>
            <X
              className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={(e: React.MouseEvent) => handleRemoveRecruiter(recruiterId, e)}
            />
          </div>
        );
      }
    }

    return (
      <div className="flex items-center gap-1 flex-wrap">
        {hasUnassigned && (
          <Badge variant="secondary" className="text-xs">
            Unassigned
            <X
              className="h-3 w-3 ml-1 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={(e: React.MouseEvent) => handleRemoveRecruiter('unassigned', e)}
            />
          </Badge>
        )}
        {selectedRecruiters.slice(0, 2).map((recruiter) => (
          <Badge key={recruiter.id} variant="secondary" className="text-xs">
            {recruiter.name}
            <X
              className="h-3 w-3 ml-1 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={(e: React.MouseEvent) => handleRemoveRecruiter(recruiter.id, e)}
            />
          </Badge>
        ))}
        {selectedIds.size > 3 && (
          <Badge variant="secondary" className="text-xs">
            +{selectedIds.size - 3} more
          </Badge>
        )}
      </div>
    );
  };

  console.log('RecruiterMultiSelectDropdown render - open state:', open);
  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      console.log('Popover onOpenChange called with:', newOpen);
      console.log('Popover open state after change:', newOpen);
      setOpen(newOpen);
    }}>
      <PopoverTrigger>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground [&>*]:!text-foreground pointer-events-auto cursor-pointer", className)}
          onClick={() => {
            console.log('Button clicked! open was:', open);
            console.log('Setting open to:', !open);
            setOpen(!open);
          }}
        >
          {renderTrigger()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover border-border shadow-lg z-[9999] opacity-100" align="start">
        <Command className="opacity-100">
          <div className="flex items-center border-b px-3 py-2">
            <Input
              placeholder="Search recruiters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground text-foreground focus-visible:ring-0 cursor-text"
            />
          </div>
          <CommandList className="max-h-[200px]">
            <CommandEmpty>No recruiters found.</CommandEmpty>
            {/* Unassigned option */}
            <CommandItem
              key="unassigned"
              onSelect={() => handleToggleRecruiter('unassigned')}
              className="cursor-pointer hover:bg-accent hover:text-accent-foreground pointer-events-auto opacity-100"
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  selectedIds.has('unassigned') ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="font-medium">Unassigned</span>
              <span className="text-xs text-muted-foreground ml-2">Candidates not assigned to any recruiter</span>
            </CommandItem>
            {/* Regular recruiters */}
            {filteredRecruiters.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {recruiters.length === 0 ? (
                  <div>
                    <p>No recruiters available in the system.</p>
                    <p className="text-xs mt-1">You can still filter by unassigned candidates above.</p>
                  </div>
                ) : (
                  "No recruiters found matching your search."
                )}
              </div>
            ) : (
              filteredRecruiters.map((recruiter) => (
                <CommandItem
                  key={recruiter.id}
                  onSelect={() => handleToggleRecruiter(recruiter.id)}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground pointer-events-auto opacity-100"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedIds.has(recruiter.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-medium text-foreground">{recruiter.name}</span>
                </CommandItem>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
