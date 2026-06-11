import {
  LayoutGrid,
  List,
  Search,
  Table as TableIcon,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { CandidateViewMode } from './candidate-display-utils';

export function CandidateSearchInput({
  onSearchQueryChange,
  placeholder,
  searchQuery,
}: {
  onSearchQueryChange: (query: string) => void;
  placeholder: string;
  searchQuery: string;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
      <Input
        placeholder={placeholder}
        className="pl-10 h-10 border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 focus:ring-primary/20"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
      />
    </div>
  );
}

export function CandidateViewModeTabs({
  onViewModeChange,
  viewMode,
}: {
  onViewModeChange: (viewMode: CandidateViewMode) => void;
  viewMode: CandidateViewMode;
}) {
  return (
    <Tabs
      value={viewMode}
      onValueChange={(value) => onViewModeChange(value as CandidateViewMode)}
      className="w-auto"
    >
      <TabsList className="grid w-auto grid-cols-3 h-9">
        <TabsTrigger value="card" className="text-xs px-2 gap-1.5">
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">Cards</span>
        </TabsTrigger>
        <TabsTrigger value="list" className="text-xs px-2 gap-1.5">
          <List className="h-4 w-4" />
          <span className="hidden sm:inline">List</span>
        </TabsTrigger>
        <TabsTrigger value="table" className="text-xs px-2 gap-1.5">
          <TableIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Table</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
