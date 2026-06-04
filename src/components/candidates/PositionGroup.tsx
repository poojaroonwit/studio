"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Users, Briefcase, MapPin, BadgeInfo } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { CandidateCard } from './CandidateCard';
import type { Applicant, Position } from '@/lib/types';
import { cn } from '@/lib/utils';
import { normalizeFitScore } from '@/lib/scoreUtils';

interface PositionGroupProps {
  position: Position & { applicants: Applicant[] };
  viewMode: 'table' | 'card' | 'list';
  onCandidateClick: (candidate: Applicant) => void;
}

export function PositionGroup({ position, viewMode, onCandidateClick }: PositionGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const applicantCount = position.applicants.length;

  const getDisplayFitScore = (candidate: Applicant) => (
    candidate.fitScore === null || candidate.fitScore === undefined
      ? null
      : normalizeFitScore(candidate.fitScore)
  );

  const getFitScoreColor = (fitScore: number) => (
    fitScore >= 80
      ? "text-emerald-600 bg-emerald-500"
      : fitScore >= 60
        ? "text-blue-600 bg-blue-500"
        : fitScore >= 40
          ? "text-amber-600 bg-amber-500"
          : "text-zinc-500 bg-zinc-400"
  );

  const renderFitScore = (fitScore: number | null, barWidthClassName: string) => {
    if (fitScore === null) {
      return (
        <span className="text-xs font-medium text-zinc-400 whitespace-nowrap">
          Not scored
        </span>
      );
    }

    const [textColorClassName, barColorClassName] = getFitScoreColor(fitScore).split(' ');

    return (
      <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
        <span className={cn("text-xs font-bold", textColorClassName)}>
          {fitScore}%
        </span>
        <div className={cn("h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden", barWidthClassName)}>
          <div
            className={cn("h-full rounded-full", barColorClassName)}
            style={{ width: `${fitScore}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Position Header */}
      <div 
        className={cn(
          "flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all",
          isExpanded 
            ? "bg-transparent dark:bg-transparent" 
            : "bg-transparent hover:bg-zinc-50 dark:bg-transparent dark:hover:bg-zinc-900/40"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
       role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
        <div className="flex items-center gap-2">
          
          <div className="flex flex-col">
            <h2 className={cn(
              "text-lg font-bold tracking-tight",
              isExpanded ? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"
            )}>
              {position.title}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-zinc-500 flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {applicantCount} {applicantCount === 1 ? 'Candidate' : 'Candidates'}
              </span>
              {(position as any).department && (
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
              )}
              {(position as any).department && (
                <span className="text-sm text-zinc-500">{(position as any).department}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex -space-x-2 mr-2">
            {position.applicants.slice(0, 3).map((app, i) => (
              <div 
                key={app.id} 
                className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex items-center justify-center text-[10px] font-bold"
              >
                {app.name.charAt(0)}
              </div>
            ))}
            {applicantCount > 3 && (
              <div className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                +{applicantCount - 3}
              </div>
            )}
          </div>
          
          <div className={cn(
            "p-2 rounded-full transition-transform duration-300",
            isExpanded ? "bg-zinc-200/50 dark:bg-zinc-800" : ""
          )}>
            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* Candidates List/Card/Table */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {applicantCount > 0 ? (
              <div className={cn(
                "pt-2 pb-8",
                viewMode === 'card' 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                  : viewMode === 'list'
                    ? "flex flex-col gap-3"
                    : "bg-white dark:bg-zinc-900/20 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden"
              )}>
                {viewMode === 'card' ? (
                  position.applicants.map((candidate) => (
                    <CandidateCard 
                      key={candidate.id} 
                      candidate={candidate} 
                      onClick={() => onCandidateClick(candidate)}
                    />
                  ))
                ) : viewMode === 'list' ? (
                  position.applicants.map((candidate) => {
                    const fitScore = getDisplayFitScore(candidate);
                    return (
                      <div 
                        key={candidate.id}
                        className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:border-primary/30 transition-all cursor-pointer group"
                        onClick={() => onCandidateClick(candidate)}
                       role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm uppercase">
                            {candidate.name.charAt(0)}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors truncate">
                              {candidate.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/20 text-primary bg-primary/5 font-normal">
                                {(candidate as any).statusName || 'New'}
                              </Badge>
                              <span className="text-[10px] text-zinc-400">
                                {candidate.applicationDate ? new Date(candidate.applicationDate).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 line-clamp-1 mt-1 italic">
                              {(candidate as any).assignmentJustification || "No justification provided."}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {renderFitScore(fitScore, "w-16")}
                          <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50/50 dark:bg-zinc-800/20 border-b border-zinc-100 dark:border-zinc-800">
                          <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Candidate</th>
                          <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Fit Score</th>
                          <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Justification</th>
                          <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Applied</th>
                        </tr>
                      </thead>
                      <tbody>
                        {position.applicants.map((candidate) => {
                          const fitScore = getDisplayFitScore(candidate);
                          return (
                            <tr 
                              key={candidate.id}
                              className="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-0"
                              onClick={() => onCandidateClick(candidate)}
                             role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase" style={{ background: (candidate as any).statusColor ? `${(candidate as any).statusColor}20` : undefined, color: (candidate as any).statusColor || undefined }}>
                                  {candidate.name.charAt(0)}
                                </div>
                                <span className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
                                  {candidate.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge 
                                variant="outline" 
                                className="font-normal"
                                style={{ 
                                  borderColor: (candidate as any).statusColor ? `${(candidate as any).statusColor}40` : undefined, 
                                  color: (candidate as any).statusColor || undefined,
                                  backgroundColor: (candidate as any).statusColor ? `${(candidate as any).statusColor}10` : undefined
                                }}
                              >
                                {(candidate as any).statusName || 'New'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              {renderFitScore(fitScore, "w-20")}
                            </td>
                            <td className="px-6 py-4">
                              <div className="pt-1 flex-1">
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3 italic">
                                  {(candidate as any).assignmentJustification || "No justification provided."}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right text-xs text-zinc-400">
                               {candidate.applicationDate ? new Date(candidate.applicationDate).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) }
              </div>
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 translate-y-[-10px]">
                <BadgeInfo className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm">No candidates have applied to this position via your scope yet.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
