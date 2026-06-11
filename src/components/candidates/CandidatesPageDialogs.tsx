"use client";

import { RefreshCw, Search, X } from 'lucide-react';

import ApplicantDetailModal from '@/components/applicants/ApplicantDetailModal';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CandidateDisplayApplicant } from './candidate-display-utils';
import type { GroupedCandidatePosition } from './candidates-page-utils';
import { PositionGroup } from './PositionGroup';

interface CandidatesMobileSearchDrawerProps {
  filteredData: GroupedCandidatePosition[];
  loading: boolean;
  onCandidateClick: (candidate: CandidateDisplayApplicant) => void;
  onOpenChange: (open: boolean) => void;
  onSearchQueryChange: (query: string) => void;
  open: boolean;
  searchQuery: string;
}

export function CandidatesMobileSearchDrawer({
  filteredData,
  loading,
  onCandidateClick,
  onOpenChange,
  onSearchQueryChange,
  open,
  searchQuery,
}: CandidatesMobileSearchDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[92vh] flex flex-col">
        <DrawerHeader className="border-b pb-4 px-4 sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between gap-4">
            <DrawerTitle className="text-xl font-black italic uppercase tracking-tight">
              Search <span className="text-primary not-italic">Candidates</span>
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close candidate search" className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </DrawerClose>
          </div>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                className="pl-10 h-12 text-base border-zinc-200 focus:ring-primary/20"
                autoFocus
              />
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden relative bg-zinc-50/30 dark:bg-zinc-950/20">
          {loading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          <ScrollArea className="h-full">
            <div className="p-4 flex flex-col gap-8">
              {filteredData.length > 0 ? (
                filteredData.map((position) => (
                  <PositionGroup
                    key={position.id}
                    position={position}
                    viewMode="list"
                    onCandidateClick={(candidate) => {
                      onCandidateClick(candidate);
                      onOpenChange(false);
                    }}
                  />
                ))
              ) : !loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Search className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">No results found for "{searchQuery}"</p>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function CandidateDetailDialog({
  candidate,
  open,
  onClose,
}: {
  candidate: CandidateDisplayApplicant | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!candidate) return null;

  return (
    <ApplicantDetailModal
      applicantId={candidate.id}
      open={open}
      onClose={onClose}
    />
  );
}
