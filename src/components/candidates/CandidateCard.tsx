"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ApplicantAvatarCompact } from '@/components/ui/applicant-avatar';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { Mail, Phone, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { normalizeFitScore } from '@/lib/scoreUtils';
import type { Applicant } from '@/lib/types';

interface CandidateCardProps {
  candidate: Applicant;
  onClick?: () => void;
}

export function CandidateCard({ candidate, onClick }: CandidateCardProps) {
  const applicationDate = candidate.applicationDate ? (
    typeof candidate.applicationDate === 'string' 
      ? parseISO(candidate.applicationDate) 
      : new Date(candidate.applicationDate)
  ) : null;

  const timeAgo = applicationDate && isValid(applicationDate) 
    ? formatDistanceToNow(applicationDate, { addSuffix: true }) 
    : 'Recently';

  const fitScore = candidate.fitScore !== null && candidate.fitScore !== undefined 
    ? normalizeFitScore(candidate.fitScore)
    : null;

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-full"
    >
      <Card 
        className={cn(
          "h-full overflow-hidden transition-all duration-300 hover:shadow-xl border-zinc-100 group cursor-pointer dark:bg-zinc-900/50 dark:border-zinc-800",
          "hover:border-primary/20 bg-white"
        )}
        onClick={onClick}
      >
        <CardContent className="p-0 flex flex-col h-full">
          {/* Top Bar with Score */}
          <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 relative">
            {fitScore !== null && (
              <div 
                className={cn(
                  "absolute h-full transition-all duration-1000",
                  fitScore >= 80 ? "bg-emerald-500" : 
                  fitScore >= 60 ? "bg-blue-500" : 
                  fitScore >= 40 ? "bg-amber-500" : "bg-zinc-400"
                )} 
                style={{ width: `${fitScore}%` }}
              />
            )}
          </div>

          <div className="p-5 flex flex-col gap-4 flex-1">
            {/* Header info */}
            <div className="flex justify-between items-start gap-3">
              <div className="flex gap-3 items-center">
                <div className="relative">
                  <ApplicantAvatarCompact 
                    user={candidate} 
                    className="h-12 w-12 border-2 border-white shadow-sm ring-1 ring-zinc-100"
                  />
                  {candidate.isPinned && (
                    <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full h-4 w-4 flex items-center justify-center border border-white">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 leading-tight group-hover:text-primary transition-colors line-clamp-1">
                    {candidate.name}
                  </h3>
                  <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    Applied {timeAgo}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                {fitScore !== null && (
                  <div className={cn(
                    "text-lg font-bold",
                    fitScore >= 80 ? "text-emerald-600" : 
                    fitScore >= 60 ? "text-blue-600" : 
                    fitScore >= 40 ? "text-amber-600" : "text-zinc-500"
                  )}>
                    {fitScore}%
                  </div>
                )}
                <Badge variant="outline" className={cn(
                  "mt-1 text-[10px] px-1.5 py-0 font-normal uppercase tracking-wider",
                  candidate.statusId ? "border-primary/20 text-primary bg-primary/5" : "text-zinc-400"
                )}>
                  {(candidate as any).statusName || 'No Status'}
                </Badge>
              </div>
            </div>

            {/* Justification */}
            <div className="pt-2 flex-1">
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed italic line-clamp-3">
                {candidate.assignmentJustification || "No justification provided for this candidate."}
              </p>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-4 flex items-center justify-between border-t border-zinc-50 dark:border-zinc-800/50">
               <div className="flex gap-1">
                  {candidate.isRead === false && (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-none text-[10px] h-5">New</Badge>
                  )}
               </div>
               <button
                 type="button"
                 onClick={(event) => {
                   event.stopPropagation();
                   onClick?.();
                 }}
                 className="text-xs text-zinc-400 hover:text-primary flex items-center gap-1 transition-colors"
               >
                 View Profile <ExternalLink className="h-3 w-3" />
               </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
