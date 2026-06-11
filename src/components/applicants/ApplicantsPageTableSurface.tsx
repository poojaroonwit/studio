"use client";

import React from 'react';
import { motion } from 'framer-motion';

import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh-indicator';
import { ApplicantsPageTableSurfaceContent } from './ApplicantsPageTableSurfaceContent';
import type { ApplicantsPageTableSurfaceProps } from './ApplicantsPageTableSurfaceTypes';

export function ApplicantsPageTableSurface(props: ApplicantsPageTableSurfaceProps) {
  const {
  isMobile,
  pullProgress,
  isRefreshing,
  pullToRefreshRef,
  } = props;

  return (
    <div className="flex-1 overflow-hidden relative flex flex-col">
      {isMobile && (
        <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
          <PullToRefreshIndicator pullProgress={pullProgress} isRefreshing={isRefreshing} />
        </div>
      )}
      <div ref={pullToRefreshRef} className="flex-1 overflow-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          <ApplicantsPageTableSurfaceContent {...props} />
        </motion.div>
      </div>
    </div>
  );
}

export type { ApplicantsPageTableSurfaceProps } from './ApplicantsPageTableSurfaceTypes';
