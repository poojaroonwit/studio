"use client";

import type { Dispatch, SetStateAction } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SystemPromptCategory } from "./types";

interface SystemPromptsListToolbarProps {
  categories: SystemPromptCategory[];
  onCreatePrompt: () => void;
  searchTerm: string;
  selectedCategory: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  setSelectedCategory: Dispatch<SetStateAction<string>>;
}

export function SystemPromptsListToolbar({
  categories,
  onCreatePrompt,
  searchTerm,
  selectedCategory,
  setSearchTerm,
  setSelectedCategory,
}: SystemPromptsListToolbarProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex gap-4 flex-1">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="w-48 mr-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.name}>{category.name}</option>
            ))}
          </select>
        </div>
      </div>
      <Button
        onClick={onCreatePrompt}
        className="flex items-center gap-2"
        disabled={categories.length === 0}
        title={categories.length === 0 ? "Create at least one category first" : ""}
      >
        <Plus className="h-4 w-4" />
        Create Prompt
      </Button>
    </div>
  );
}
