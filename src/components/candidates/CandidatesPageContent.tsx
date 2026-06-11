"use client";

import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { CandidateDisplayApplicant, CandidateViewMode } from './candidate-display-utils';
import type { GroupedCandidatePosition } from './candidates-page-utils';
import { PositionGroup } from './PositionGroup';

interface CandidatesPageContentProps {
  error: string | null;
  filteredData: GroupedCandidatePosition[];
  loading: boolean;
  onCandidateClick: (candidate: CandidateDisplayApplicant) => void;
  onClearSearch: () => void;
  onRetry: () => void;
  searchQuery: string;
  viewMode: CandidateViewMode;
}

export function CandidatesPageContent({
  error,
  filteredData,
  loading,
  onCandidateClick,
  onClearSearch,
  onRetry,
  searchQuery,
  viewMode,
}: CandidatesPageContentProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        {loading ? (
          <CandidatesLoadingState />
        ) : error ? (
          <CandidatesErrorState onRetry={onRetry} />
        ) : filteredData.length === 0 ? (
          <CandidatesEmptyState
            onClearSearch={onClearSearch}
            searchQuery={searchQuery}
          />
        ) : (
          <div className="space-y-12">
            <AnimatePresence mode="popLayout">
              {filteredData.map((position, index) => (
                <motion.div
                  key={position.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <PositionGroup
                    position={position}
                    viewMode={viewMode}
                    onCandidateClick={onCandidateClick}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function CandidatesLoadingState() {
  return (
    <div className="space-y-8">
      {[1, 2, 3].map(index => (
        <div key={index} className="space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CandidatesErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Connection Error</h3>
      <p className="text-zinc-500 max-w-xs mx-auto mt-2">
        We couldn't retrieve your candidates. Please check your network and try again.
      </p>
      <Button variant="outline" className="mt-6" onClick={onRetry}>
        Retry Connection
      </Button>
    </div>
  );
}

function CandidatesEmptyState({
  onClearSearch,
  searchQuery,
}: {
  onClearSearch: () => void;
  searchQuery: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
        <Filter className="h-10 w-10 text-zinc-400" />
      </div>
      <h3 className="text-2xl font-black text-zinc-800 dark:text-zinc-200 uppercase">
        No Results <span className="text-primary">Found</span>
      </h3>
      <p className="text-zinc-500 max-w-sm mx-auto mt-3">
        {searchQuery
          ? `No candidates match "${searchQuery}". Try different keywords.`
          : 'You are not currently assigned to any positions with active applicants.'}
      </p>
      {searchQuery && (
        <Button variant="link" className="mt-2 text-primary" onClick={onClearSearch}>
          Clear Search
        </Button>
      )}
    </div>
  );
}
