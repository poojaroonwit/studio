"use client";

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { isKeyboardActivationKey } from './candidate-display-utils';
import { PositionGroupHeader } from './PositionGroupHeader';
import { PositionGroupContent } from './PositionGroupViews';
import type { PositionGroupProps } from './position-group-types';

export function PositionGroup({ position, viewMode, onCandidateClick }: PositionGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleKeyboardClick = (event: React.KeyboardEvent<HTMLElement>) => {
    if (isKeyboardActivationKey(event.key)) {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PositionGroupHeader
        position={position}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded((current) => !current)}
        onKeyboardClick={handleKeyboardClick}
      />
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <PositionGroupContent
              applicants={position.applicants}
              viewMode={viewMode}
              onCandidateClick={onCandidateClick}
              onKeyboardClick={handleKeyboardClick}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
