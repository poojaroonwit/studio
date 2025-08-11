import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { RecruitmentStage } from "@/lib/types";

interface StatusMultiSelectDropdownProps {
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  placeholder?: string;
  className?: string;
  stages: RecruitmentStage[];
}

export function StatusMultiSelectDropdown({
  selectedIds,
  onSelectionChange,
  placeholder = "Select pipeline stages...",
  className,
  stages
}: StatusMultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Filter stages based on search term
  const filteredStages = stages.filter(stage => 
    stage.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStages = stages.filter(stage => selectedIds.has(stage.name));

  const handleToggleStage = (stageName: string) => {
    console.log('handleToggleStage called with:', stageName);
    const newSelected = new Set(selectedIds);
    if (newSelected.has(stageName)) {
      newSelected.delete(stageName);
    } else {
      newSelected.add(stageName);
    }
    console.log('New selected stages:', Array.from(newSelected));
    onSelectionChange(newSelected);
  };

  const handleRemoveStage = (stageName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    newSelected.delete(stageName);
    onSelectionChange(newSelected);
  };

  const renderTrigger = () => {
    if (selectedIds.size === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    if (selectedIds.size === 1) {
      const stageName = Array.from(selectedIds)[0];
      const stage = stages.find(s => s.name === stageName);
      if (stage) {
        return (
          <div className="flex items-center gap-1">
            <span className="text-foreground">{stage.name}</span>
            <X
              className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={(e: React.MouseEvent) => handleRemoveStage(stageName, e)}
            />
          </div>
        );
      }
    }

    return (
      <div className="flex items-center gap-1 flex-wrap">
        {selectedStages.slice(0, 2).map((stage) => (
          <Badge key={stage.name} variant="secondary" className="text-xs">
            {stage.name}
            <X
              className="h-3 w-3 ml-1 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={(e: React.MouseEvent) => handleRemoveStage(stage.name, e)}
            />
          </Badge>
        ))}
        {selectedIds.size > 2 && (
          <Badge variant="secondary" className="text-xs">
            +{selectedIds.size - 2} more
          </Badge>
        )}
      </div>
    );
  };

  console.log('StatusMultiSelectDropdown render - open state:', open);
  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn("w-full justify-between bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground [&>*]:!text-foreground pointer-events-auto cursor-pointer", className)}
        onClick={() => {
          console.log('Status button clicked! open was:', open);
          console.log('Setting open to:', !open);
          setOpen(!open);
        }}
      >
        {renderTrigger()}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-foreground" />
      </Button>
      
      {open && (
        <div 
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-[300px] overflow-hidden" 
          style={{
            display: 'block', 
            minHeight: '100px',
            position: 'absolute',
            top: '100%',
            left: '0',
            right: '0',
            marginTop: '4px',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 999999
          }}
        >
          <div className="p-2 border-b border-border">
            <Input
              placeholder="Search pipeline stages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border-0 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground text-foreground focus-visible:ring-0 cursor-text"
            />
          </div>
          <div className="max-h-[250px] overflow-y-auto">
            <div className="p-2 text-sm text-gray-600 bg-blue-100 border border-blue-300">
              🎯 PIPELINE DROPDOWN IS OPEN! Click stages below:
            </div>
            
            {filteredStages.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No pipeline stages found.
              </div>
            ) : (
              filteredStages.map((stage) => (
                <div
                  key={stage.name}
                  className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleToggleStage(stage.name)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedIds.has(stage.name) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-medium text-foreground">{stage.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
