"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getUnderlineNavTriggerClassName } from "@/components/ui/underline-nav";

import type { IconComponent } from "./EvaluationConfigTabTypes";

interface EvaluationConfigSubTabTriggerProps {
  active: boolean;
  icon: IconComponent;
  label: string;
  onSelect: () => void;
}

export function EvaluationConfigSubTabTrigger({
  active,
  icon: Icon,
  label,
  onSelect,
}: EvaluationConfigSubTabTriggerProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        getUnderlineNavTriggerClassName(active),
        "px-6 py-3",
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

interface EvaluationSearchInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

export function EvaluationSearchInput({ placeholder, value, onChange }: EvaluationSearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pl-10"
      />
    </div>
  );
}
