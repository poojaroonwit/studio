"use client";

import React, { useState, useEffect } from 'react';
import { LayoutGrid, Table as TableIcon, Search, Filter, AlertCircle, ChevronDown, Check, User, Briefcase, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PositionGroup } from './PositionGroup';
import ApplicantDetailModal from '@/components/applicants/ApplicantDetailModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import type { RecruitmentStage } from '@/lib/types';

type GroupedPosition = Position & { applicants: Applicant[] };

export function CandidatesPageClient() {
  const [data, setData] = useState<GroupedPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table' | 'list'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Applicant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const isMobile = useIsMobile();

  // Filters
  const [isOpenFilter, setIsOpenFilter] = useState<boolean | 'any'>(true); // Default to open
  const [mineOnlyFilter, setMineOnlyFilter] = useState(true); // Default to my positions
  const [pipelineOnlyFilter, setPipelineOnlyFilter] = useState<string[]>([]); // Default will be set after stages fetch
  const [stages, setStages] = useState<RecruitmentStage[]>([]);
  const [isStagesLoading, setIsStagesLoading] = useState(false);

  // Set default view mode based on device
  useEffect(() => {
    if (isMobile) {
      setViewMode('list');
    }
  }, [isMobile]);

  const fetchStages = async () => {
    setIsStagesLoading(true);
    try {
      const response = await fetch('/api/recruitment-stages');
      if (!response.ok) throw new Error('Failed to fetch stages');
      const result: RecruitmentStage[] = await response.json();
      setStages(result);
      
      // Default filter: all except applied and screening
      const defaultStages = result.filter(s => 
        s.name.toLowerCase() !== 'applied' && 
        s.name.toLowerCase() !== 'screening'
      ).map(s => s.id);
      setPipelineOnlyFilter(defaultStages);
    } catch (err: any) {
      console.error('Error fetching stages:', err);
    } finally {
      setIsStagesLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (isOpenFilter !== 'any') {
        params.append('isOpen', String(isOpenFilter));
      } else {
        params.append('isOpen', 'any');
      }
      params.append('mineOnly', String(mineOnlyFilter));
      
      if (pipelineOnlyFilter.length > 0) {
        params.append('pipelineOnly', pipelineOnlyFilter.join(','));
      } else {
        // If nothing is selected, we might want to show nothing or everything.
        // The user said "by default exclude applied and screening", 
        // suggesting they usually want a filter active.
        // We'll send "false" or empty if it's explicitly cleared.
        params.append('pipelineOnly', 'false');
      }

      const response = await fetch(`/api/candidates?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch candidates');
      const result = await response.json();
      setData(result.positions || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Could not load candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isOpenFilter, mineOnlyFilter, pipelineOnlyFilter]);

  const handleCandidateClick = (candidate: Applicant) => {
    setSelectedCandidate(candidate);
    setIsDetailOpen(true);
  };

  const filteredData = data.map(pos => ({
    ...pos,
    applicants: pos.applicants.filter(app => 
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(pos => pos.applicants.length > 0 || searchQuery === '');

  return (
    <div className="flex flex-col h-full bg-zinc-50/30 dark:bg-zinc-950/20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 p-6">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input 
                placeholder="Search candidates..." 
                className="pl-10 h-10 border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50">
              <Button 
                variant={viewMode === 'card' ? 'secondary' : 'ghost'} 
                size="sm" 
                className={cn(
                  "h-8 px-3 gap-2 transition-all",
                  viewMode === 'card' && "bg-white shadow-sm hover:bg-white text-primary"
                )}
                onClick={() => setViewMode('card')}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Cards</span>
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="sm" 
                className={cn(
                  "h-8 px-3 gap-2 transition-all",
                  viewMode === 'list' && "bg-white shadow-sm hover:bg-white text-primary"
                )}
                onClick={() => setViewMode('list')}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </Button>
              <Button 
                variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                size="sm" 
                className={cn(
                  "h-8 px-3 gap-2 transition-all",
                  viewMode === 'table' && "bg-white shadow-sm hover:bg-white text-primary"
                )}
                onClick={() => setViewMode('table')}
              >
                <TableIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Table</span>
              </Button>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 gap-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                  <Filter className="h-4 w-4 text-zinc-500" />
                  <span className="font-medium">Filter</span>
                  {(isOpenFilter !== 'any' || !mineOnlyFilter || pipelineOnlyFilter.length > 0) && (
                    <span className="flex h-2 w-2 rounded-full bg-primary" />
                  )}
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="start">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-zinc-500">
                      <Briefcase className="h-3.5 w-3.5" /> Position Status
                    </h4>
                    <div className="flex flex-col gap-1">
                      {[
                        { label: 'Open Positions', value: true },
                        { label: 'Closed Positions', value: false },
                        { label: 'All Statuses', value: 'any' }
                      ].map((opt) => (
                        <button
                          key={String(opt.value)}
                          onClick={() => setIsOpenFilter(opt.value as any)}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                            isOpenFilter === opt.value 
                              ? "bg-primary/10 text-primary font-bold" 
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          )}
                        >
                          {opt.label}
                          {isOpenFilter === opt.value && <Check className="h-4 w-4" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-zinc-500">
                      <User className="h-3.5 w-3.5" /> Relationship Scope
                    </h4>
                    <div className="flex flex-col gap-1">
                      {[
                        { label: 'My Assigned Positions', value: true },
                        { label: 'All Shared Scope', value: false }
                      ].map((opt) => (
                        <button
                          key={String(opt.value)}
                          onClick={() => setMineOnlyFilter(opt.value)}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                            mineOnlyFilter === opt.value 
                              ? "bg-primary/10 text-primary font-bold" 
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          )}
                        >
                          {opt.label}
                          {mineOnlyFilter === opt.value && <Check className="h-4 w-4" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-bold flex items-center gap-2">
                          <Zap className="h-3.5 w-3.5 text-amber-500" /> Pipeline Focus
                        </Label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Filter candidates by recruitment stages.
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-[10px] uppercase font-bold tracking-wider"
                        onClick={() => {
                          if (pipelineOnlyFilter.length === stages.length) {
                             setPipelineOnlyFilter([]);
                          } else {
                             setPipelineOnlyFilter(stages.map(s => s.id));
                          }
                        }}
                      >
                        {pipelineOnlyFilter.length === stages.length ? 'Unselect All' : 'Select All'}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {isStagesLoading ? (
                        <div className="space-y-2 py-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      ) : stages.map((stage) => (
                        <div key={stage.id} className="flex items-center space-x-2 group">
                          <Checkbox 
                            id={`stage-${stage.id}`}
                            checked={pipelineOnlyFilter.includes(stage.id)} 
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setPipelineOnlyFilter([...pipelineOnlyFilter, stage.id]);
                              } else {
                                setPipelineOnlyFilter(pipelineOnlyFilter.filter(id => id !== stage.id));
                              }
                            }}
                          />
                          <label 
                            htmlFor={`stage-${stage.id}`}
                            className="text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer flex-1 group-hover:text-zinc-900 dark:group-hover:text-zinc-200"
                          >
                            {stage.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-[1600px] mx-auto">
          {loading ? (
            <div className="space-y-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-4">
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
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Connection Error</h3>
              <p className="text-zinc-500 max-w-xs mx-auto mt-2">
                We couldn't retrieve your candidates. Please check your network and try again.
              </p>
              <Button variant="outline" className="mt-6" onClick={fetchData}>
                Retry Connection
              </Button>
            </div>
          ) : filteredData.length === 0 ? (
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
                  : "You are not currently assigned to any positions with active applicants."}
              </p>
              {searchQuery && (
                <Button variant="link" className="mt-2 text-primary" onClick={() => setSearchQuery('')}>
                  Clear Search
                </Button>
              )}
            </div>
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
                      onCandidateClick={handleCandidateClick}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCandidate && (
        <ApplicantDetailModal 
          applicantId={selectedCandidate.id}
          open={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setTimeout(() => setSelectedCandidate(null), 300);
          }}
        />
      )}
    </div>
  );
}
