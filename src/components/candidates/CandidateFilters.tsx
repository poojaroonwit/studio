"use client";

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Search, FilterX, Check, ChevronsUpDown, Loader2, CalendarIcon, Brain, Users, Briefcase, Tag, Star, Building, ListFilter, Zap, Target, Lightbulb, Sparkles, Code, Play, Save, FileText, User, BarChart3 } from 'lucide-react';
import { getScoreRangesForChart } from "@/lib/scoreUtils";
import type { Position, CandidateStatus, RecruitmentStage, UserProfile } from '@/lib/types';
import { cn } from "@/lib/utils";
import { ScrollArea } from '../ui/scroll-area';
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import type { DateRange } from "react-day-picker";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';

export interface CandidateFilterValues {
  name?: string;
  email?: string;
  phone?: string;
  selectedPositionIds?: string[];
  selectedStatuses?: string[];
  education?: string; // Education Keywords
  minFitScore?: number;
  maxFitScore?: number;
  matchingMinFitScore?: number;
  matchingMaxFitScore?: number;
  applicationDateStart?: Date;
  applicationDateEnd?: Date;
  selectedRecruiterIds?: string[];
  aiSearchQuery?: string;
  aiSearchType?: 'semantic' | 'exact' | 'hybrid';
  aiSearchFilters?: {
    positionIds?: string[];
    statuses?: string[];
    minFitScore?: number;
    maxFitScore?: number;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

interface CandidateFiltersProps {
  initialFilters?: CandidateFilterValues;
  onFilterChange: (filters: CandidateFilterValues) => void;
  onAiSearch: (query: string, type: 'semantic' | 'exact' | 'hybrid', filters?: any) => void;
  onClearAllFilters?: () => void;
  availablePositions: Position[];
  availableStages: RecruitmentStage[];
  availableRecruiters: UserProfile[];
  isLoading?: boolean;
  isAiSearching?: boolean;
  aiSearchResults?: any;
  advancedQuery?: string;
}

export function CandidateFilters({
    initialFilters = {},
    onFilterChange,
    onAiSearch,
    onClearAllFilters,
    availablePositions,
    availableStages,
    availableRecruiters,
    isLoading,
    isAiSearching,
    aiSearchResults,
    advancedQuery
}: CandidateFiltersProps) {
  const [name, setName] = useState(initialFilters.name || '');
  const [email, setEmail] = useState(initialFilters.email || '');
  const [phone, setPhone] = useState(initialFilters.phone || '');
  const [selectedPositionIds, setSelectedPositionIds] = useState<Set<string>>(new Set(initialFilters.selectedPositionIds || []));
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set(initialFilters.selectedStatuses || []));
  const [education, setEducation] = useState(initialFilters.education || '');
  const [fitScoreRange, setFitScoreRange] = useState<[number, number]>([
    initialFilters.minFitScore || 0,
    initialFilters.maxFitScore || 100,
  ]);
  const [matchingFitScoreRange, setMatchingFitScoreRange] = useState<[number, number]>([70, 100]);
  
  const [applicationDateRange, setApplicationDateRange] = useState<DateRange | undefined>(
    initialFilters.applicationDateStart && initialFilters.applicationDateEnd
      ? { from: initialFilters.applicationDateStart, to: initialFilters.applicationDateEnd }
      : undefined
  );

  const [selectedRecruiterIds, setSelectedRecruiterIds] = useState<Set<string>>(new Set(initialFilters.selectedRecruiterIds || []));
  const [aiSearchQueryInput, setAiSearchQueryInput] = useState(initialFilters.aiSearchQuery || '');
  const [aiSearchType, setAiSearchType] = useState<'semantic' | 'exact' | 'hybrid'>(initialFilters.aiSearchType || 'hybrid');
  const [aiSearchFilters, setAiSearchFilters] = useState(initialFilters.aiSearchFilters || {});

  // Advanced Query State
  const [advancedQueryInput, setAdvancedQueryInput] = useState('');
  const [activeTab, setActiveTab] = useState<'filters' | 'advanced'>('filters');
  const [queryExamples] = useState([
    {
      name: "High Priority Candidates",
      query: "minFitScore:80 status:Applied,Screening,Interview Scheduled,Interviewing",
      description: "Candidates with high fit scores in active stages"
    },
    {
      name: "Matching Candidates",
      query: "matchingFitScoreMin:70 matchingFitScoreMax:100",
      description: "Candidates with good fit scores for positions"
    },
    {
      name: "Recent Applications",
      query: "applicationDateStart:2024-01-01 applicationDateEnd:2024-01-31",
      description: "Candidates who applied in January 2024"
    },
    {
      name: "Unassigned Candidates",
      query: "recruiterId:unassigned",
      description: "Candidates not assigned to any recruiter"
    },
    {
      name: "Multiple Positions",
      query: "positionId:pos1,pos2,pos3",
      description: "Candidates from specific positions"
    },
    {
      name: "Education Filter",
      query: "education:MBA,Computer Science",
      description: "Candidates with specific education keywords"
    },
    {
      name: "Complex Query",
      query: "minFitScore:70 maxFitScore:90 status:Applied,Screening education:Engineering",
      description: "High-scoring engineering candidates in early stages"
    }
  ]);

  const [positionSearch, setPositionSearch] = useState('');
  const [statusSearch, setStatusSearch] = useState('');
  const [recruiterSearch, setRecruiterSearch] = useState('');
  
  const [positionPopoverOpen, setPositionPopoverOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [recruiterPopoverOpen, setRecruiterPopoverOpen] = useState(false);

  // AI Search examples
  const aiSearchExamples = [
    "React developers with 5+ years experience",
    "Python developers who worked at Google or Microsoft",
    "Marketing managers with MBA from top universities",
    "Senior engineers with machine learning experience",
    "Sales professionals with SaaS background",
    "Designers with portfolio in fintech",
    "Product managers with agile experience",
    "Data scientists with PhD in statistics",
  ];

  const currentYear = new Date().getFullYear();
  const fromYear = currentYear - 10;
  const toYear = currentYear + 1;

  // Parse advanced query string into filter values
  const parseAdvancedQuery = (query: string): Partial<CandidateFilterValues> => {
    const filters: Partial<CandidateFilterValues> = {};
    const parts = query.split(' ').filter(part => part.includes(':'));
    
    parts.forEach(part => {
      const [key, value] = part.split(':');
      if (!key || !value) return;
      
      switch (key.toLowerCase()) {
        case 'name':
          filters.name = value;
          break;
        case 'email':
          filters.email = value;
          break;
        case 'phone':
          filters.phone = value;
          break;
        case 'education':
          filters.education = value;
          break;
        case 'positionid':
          filters.selectedPositionIds = value.split(',');
          break;
        case 'status':
          filters.selectedStatuses = value.split(',');
          break;
        case 'recruiterid':
          filters.selectedRecruiterIds = value.split(',');
          break;
        case 'minfitscore':
          const minScore = parseInt(value, 10);
          if (!isNaN(minScore)) {
            filters.minFitScore = minScore;
          }
          break;
        case 'maxfitscore':
          const maxScore = parseInt(value, 10);
          if (!isNaN(maxScore)) {
            filters.maxFitScore = maxScore;
          }
          break;
        case 'matchingfitscore':
          const matchingScore = parseInt(value, 10);
          if (!isNaN(matchingScore)) {
            // Set matching fit score range
            filters.matchingMinFitScore = matchingScore;
            filters.matchingMaxFitScore = 100;
          }
          break;
        case 'matchingfitscoremin':
          const matchingMinScore = parseInt(value, 10);
          if (!isNaN(matchingMinScore)) {
            filters.matchingMinFitScore = matchingMinScore;
          }
          break;
        case 'matchingfitscoremax':
          const matchingMaxScore = parseInt(value, 10);
          if (!isNaN(matchingMaxScore)) {
            filters.matchingMaxFitScore = matchingMaxScore;
          }
          break;
        case 'applicationdatestart':
          const startDate = new Date(value);
          if (!isNaN(startDate.getTime())) {
            filters.applicationDateStart = startDate;
          }
          break;
        case 'applicationdateend':
          const endDate = new Date(value);
          if (!isNaN(endDate.getTime())) {
            filters.applicationDateEnd = endDate;
          }
          break;
      }
    });
    
    return filters;
  };

  // Apply advanced query
  const handleApplyAdvancedQuery = () => {
    console.log('CandidateFilters: handleApplyAdvancedQuery called');
    if (!advancedQueryInput.trim()) return;
    
    const parsedFilters = parseAdvancedQuery(advancedQueryInput);
    
    // Update local state to reflect the parsed filters
    if (parsedFilters.name) setName(parsedFilters.name);
    if (parsedFilters.email) setEmail(parsedFilters.email);
    if (parsedFilters.phone) setPhone(parsedFilters.phone);
    if (parsedFilters.education) setEducation(parsedFilters.education);
    if (parsedFilters.selectedPositionIds) setSelectedPositionIds(new Set(parsedFilters.selectedPositionIds));
    if (parsedFilters.selectedStatuses) setSelectedStatuses(new Set(parsedFilters.selectedStatuses));
    if (parsedFilters.selectedRecruiterIds) setSelectedRecruiterIds(new Set(parsedFilters.selectedRecruiterIds));
    if (parsedFilters.minFitScore !== undefined || parsedFilters.maxFitScore !== undefined) {
      setFitScoreRange([
        parsedFilters.minFitScore ?? fitScoreRange[0],
        parsedFilters.maxFitScore ?? fitScoreRange[1]
      ]);
    }
    if (parsedFilters.matchingMinFitScore !== undefined || parsedFilters.matchingMaxFitScore !== undefined) {
      setMatchingFitScoreRange([
        parsedFilters.matchingMinFitScore ?? matchingFitScoreRange[0],
        parsedFilters.matchingMaxFitScore ?? matchingFitScoreRange[1]
      ]);
    }
    if (parsedFilters.applicationDateStart || parsedFilters.applicationDateEnd) {
      setApplicationDateRange({
        from: parsedFilters.applicationDateStart,
        to: parsedFilters.applicationDateEnd
      });
    }
    
    // Apply the filters
    onFilterChange({
      ...parsedFilters,
      minFitScore: parsedFilters.minFitScore ?? fitScoreRange[0],
      maxFitScore: parsedFilters.maxFitScore ?? fitScoreRange[1],
      matchingMinFitScore: parsedFilters.matchingMinFitScore ?? matchingFitScoreRange[0],
      matchingMaxFitScore: parsedFilters.matchingMaxFitScore ?? matchingFitScoreRange[1],
      applicationDateStart: parsedFilters.applicationDateStart,
      applicationDateEnd: parsedFilters.applicationDateEnd,
      aiSearchQuery: undefined,
    });
  };

  // Load example query
  const loadExampleQuery = (example: typeof queryExamples[0]) => {
    setAdvancedQueryInput(example.query);
  };

  // Generate query from current filters
  const generateQueryFromFilters = () => {
    const parts: string[] = [];
    
    if (name) parts.push(`name:${name}`);
    if (email) parts.push(`email:${email}`);
    if (phone) parts.push(`phone:${phone}`);
    if (education) parts.push(`education:${education}`);
    if (selectedPositionIds.size > 0) parts.push(`positionId:${Array.from(selectedPositionIds).join(',')}`);
    if (selectedStatuses.size > 0) parts.push(`status:${Array.from(selectedStatuses).join(',')}`);
    if (selectedRecruiterIds.size > 0) parts.push(`recruiterId:${Array.from(selectedRecruiterIds).join(',')}`);
    if (fitScoreRange[0] > 0) parts.push(`minFitScore:${fitScoreRange[0]}`);
    if (fitScoreRange[1] < 100) parts.push(`maxFitScore:${fitScoreRange[1]}`);
    if (matchingFitScoreRange[0] > 70 || matchingFitScoreRange[1] < 100) {
      parts.push(`matchingFitScoreMin:${matchingFitScoreRange[0]}`);
      parts.push(`matchingFitScoreMax:${matchingFitScoreRange[1]}`);
    }
    if (applicationDateRange?.from) parts.push(`applicationDateStart:${applicationDateRange.from.toISOString().slice(0, 10)}`);
    if (applicationDateRange?.to) parts.push(`applicationDateEnd:${applicationDateRange.to.toISOString().slice(0, 10)}`);
    
    setAdvancedQueryInput(parts.join(' '));
  };

  // Handle advanced query from URL
  useEffect(() => {
    if (advancedQuery && advancedQuery.trim()) {
      setAdvancedQueryInput(advancedQuery);
      // Switch to advanced tab when query comes from URL
      setActiveTab('advanced');
      // Automatically apply the query if it's from URL
      const parsedFilters = parseAdvancedQuery(advancedQuery);
      if (Object.keys(parsedFilters).length > 0) {
        // Update local state to reflect the parsed filters
        if (parsedFilters.name) setName(parsedFilters.name);
        if (parsedFilters.email) setEmail(parsedFilters.email);
        if (parsedFilters.phone) setPhone(parsedFilters.phone);
        if (parsedFilters.education) setEducation(parsedFilters.education);
        if (parsedFilters.selectedPositionIds) setSelectedPositionIds(new Set(parsedFilters.selectedPositionIds));
        if (parsedFilters.selectedStatuses) setSelectedStatuses(new Set(parsedFilters.selectedStatuses));
        if (parsedFilters.selectedRecruiterIds) setSelectedRecruiterIds(new Set(parsedFilters.selectedRecruiterIds));
        if (parsedFilters.minFitScore !== undefined || parsedFilters.maxFitScore !== undefined) {
          setFitScoreRange([
            parsedFilters.minFitScore ?? fitScoreRange[0],
            parsedFilters.maxFitScore ?? fitScoreRange[1]
          ]);
        }
        if (parsedFilters.matchingMinFitScore !== undefined || parsedFilters.matchingMaxFitScore !== undefined) {
          setMatchingFitScoreRange([
            parsedFilters.matchingMinFitScore ?? matchingFitScoreRange[0],
            parsedFilters.matchingMaxFitScore ?? matchingFitScoreRange[1]
          ]);
        }
        if (parsedFilters.applicationDateStart || parsedFilters.applicationDateEnd) {
          setApplicationDateRange({
            from: parsedFilters.applicationDateStart,
            to: parsedFilters.applicationDateEnd
          });
        }
        
        // Apply the filters
        onFilterChange({
          ...parsedFilters,
          minFitScore: parsedFilters.minFitScore ?? fitScoreRange[0],
          maxFitScore: parsedFilters.maxFitScore ?? fitScoreRange[1],
          applicationDateStart: parsedFilters.applicationDateStart,
          applicationDateEnd: parsedFilters.applicationDateEnd,
          aiSearchQuery: undefined,
        });
      }
    }
  }, [advancedQuery]);

  // Clear all filters function
  const handleClearAll = () => {
    console.log('CandidateFilters: handleClearAll called');
    // Reset all local state
    setName('');
    setEmail('');
    setPhone('');
    setEducation('');
    setSelectedPositionIds(new Set());
    setSelectedStatuses(new Set());
    setSelectedRecruiterIds(new Set());
    setFitScoreRange([0, 100]);
    setMatchingFitScoreRange([70, 100]);
    setApplicationDateRange(undefined);
    setAiSearchQueryInput('');
    setAdvancedQueryInput('');
    
    // Reset to filters tab
    setActiveTab('filters');
    
    // Clear search states
    setPositionSearch('');
    setStatusSearch('');
    setRecruiterSearch('');
    
    // Close all popovers
    setPositionPopoverOpen(false);
    setStatusPopoverOpen(false);
    setRecruiterPopoverOpen(false);
    
    // Apply empty filters to clear everything (this will trigger URL parameter clearing)
    onFilterChange({
      name: undefined,
      email: undefined,
      phone: undefined,
      education: undefined,
      selectedPositionIds: undefined,
      selectedStatuses: undefined,
      selectedRecruiterIds: undefined,
      minFitScore: 0,
      maxFitScore: 100,
      matchingMinFitScore: 70,
      matchingMaxFitScore: 100,
      applicationDateStart: undefined,
      applicationDateEnd: undefined,
      aiSearchQuery: undefined,
    });
  };

  useEffect(() => {
    setName(initialFilters.name || '');
    setEmail(initialFilters.email || '');
    setPhone(initialFilters.phone || '');
    setSelectedPositionIds(new Set(initialFilters.selectedPositionIds || []));
    setSelectedStatuses(new Set(initialFilters.selectedStatuses || []));
    setEducation(initialFilters.education || '');
    setFitScoreRange([initialFilters.minFitScore || 0, initialFilters.maxFitScore || 100]);
    setApplicationDateRange(
      initialFilters.applicationDateStart && initialFilters.applicationDateEnd
        ? { from: parseISO(String(initialFilters.applicationDateStart)), to: parseISO(String(initialFilters.applicationDateEnd)) }
        : initialFilters.applicationDateStart
        ? { from: parseISO(String(initialFilters.applicationDateStart)), to: undefined }
        : undefined
    );
    setSelectedRecruiterIds(new Set(initialFilters.selectedRecruiterIds || []));
    setAiSearchQueryInput(initialFilters.aiSearchQuery || '');
    setAiSearchType(initialFilters.aiSearchType || 'hybrid');
    setAiSearchFilters(initialFilters.aiSearchFilters || {});
  }, [initialFilters]);

  // Auto-apply filters when they are set from URL parameters
  useEffect(() => {
    // Check if we have any filters set from URL parameters
    const hasUrlFilters = (initialFilters.selectedPositionIds && initialFilters.selectedPositionIds.length > 0) || 
                         (initialFilters.selectedRecruiterIds && initialFilters.selectedRecruiterIds.length > 0) || 
                         (initialFilters.selectedStatuses && initialFilters.selectedStatuses.length > 0) ||
                         initialFilters.name ||
                         initialFilters.email ||
                         initialFilters.phone ||
                         initialFilters.education ||
                         initialFilters.aiSearchQuery;
    
        if (hasUrlFilters) {
      // Use a small delay to prevent multiple rapid calls
      const timeoutId = setTimeout(() => {
        console.log('CandidateFilters: Applying initial filters from URL');
        onFilterChange(initialFilters);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [initialFilters]); // Removed onFilterChange from dependencies to prevent infinite loop

  const handleApplyStandardFilters = () => {
    console.log('CandidateFilters: handleApplyStandardFilters called');
    
    // If there's an advanced query, parse and apply it
    if (advancedQueryInput.trim()) {
      const parsedFilters = parseAdvancedQuery(advancedQueryInput);
      onFilterChange({
        ...parsedFilters,
        minFitScore: parsedFilters.minFitScore ?? fitScoreRange[0],
        maxFitScore: parsedFilters.maxFitScore ?? fitScoreRange[1],
        applicationDateStart: parsedFilters.applicationDateStart,
        applicationDateEnd: parsedFilters.applicationDateEnd,
        aiSearchQuery: undefined,
      });
    } else {
      // Apply standard filters
      onFilterChange({
        name: name || undefined,
        email: email || undefined,
        phone: phone || undefined,
        selectedPositionIds: selectedPositionIds.size > 0 ? Array.from(selectedPositionIds) : undefined,
        selectedStatuses: selectedStatuses.size > 0 ? Array.from(selectedStatuses) : undefined,
        education: education || undefined,
        minFitScore: fitScoreRange[0],
        maxFitScore: fitScoreRange[1],
        applicationDateStart: applicationDateRange?.from,
        applicationDateEnd: applicationDateRange?.to,
        selectedRecruiterIds: selectedRecruiterIds.size > 0 ? Array.from(selectedRecruiterIds) : undefined,
        aiSearchQuery: undefined,
      });
    }
  };

  const handleAiSearchClick = () => {
    if (aiSearchQueryInput.trim()) {
      const filters = {
        positionIds: aiSearchFilters.positionIds,
        statuses: aiSearchFilters.statuses,
        minFitScore: aiSearchFilters.minFitScore,
        maxFitScore: aiSearchFilters.maxFitScore,
        dateRange: aiSearchFilters.dateRange,
      };
      onAiSearch(aiSearchQueryInput.trim(), aiSearchType, filters);
    }
  };

  const handleAiSearchExample = (example: string) => {
    setAiSearchQueryInput(example);
  };

  const handleResetFilters = () => {
    // If onClearAllFilters is provided, use it to properly clear all filters and URL parameters
    if (onClearAllFilters) {
      onClearAllFilters();
      return;
    }
    
    // Fallback to local state clearing only
    setName('');
    setEmail('');
    setPhone('');
    setSelectedPositionIds(new Set());
    setSelectedStatuses(new Set());
    setEducation('');
    setFitScoreRange([0, 100]);
    setMatchingFitScoreRange([70, 100]);
    setApplicationDateRange(undefined);
    setSelectedRecruiterIds(new Set());
    setAiSearchQueryInput('');
    setAiSearchType('hybrid');
    setAiSearchFilters({});
    onFilterChange({
      minFitScore: 0,
      maxFitScore: 100,
      matchingMinFitScore: 70,
      matchingMaxFitScore: 100,
      selectedPositionIds: undefined,
      selectedStatuses: undefined,
      selectedRecruiterIds: undefined,
      applicationDateStart: undefined,
      applicationDateEnd: undefined,
      aiSearchQuery: undefined,
    });
  };
  
  const renderMultiSelectTrigger = (placeholder: string, selectedItems: Set<string>, allItems: {id: string; title?: string; name?: string}[], itemType: 'position' | 'status' | 'recruiter') => {
    if (selectedItems.size === 0) return <span>{placeholder}</span>;
    if (selectedItems.size === 1) {
      const firstId = Array.from(selectedItems)[0];
      let itemName = '';
      if (itemType === 'position') {
        itemName = (allItems as Position[]).find(p => p.id === firstId)?.title || placeholder;
      } else if (itemType === 'status') {
        itemName = (allItems as RecruitmentStage[]).find(s => s.name === firstId)?.name || placeholder;
      } else if (itemType === 'recruiter') {
        if (firstId === 'unassigned') {
          itemName = 'Unassigned';
        } else {
          itemName = (allItems as UserProfile[]).find(r => r.id === firstId)?.name || placeholder;
        }
      }
      return <span>{itemName}</span>;
    }
    return <span>{`${selectedItems.size} selected`}</span>;
  };

  // Defensive defaults for arrays
  const safeAvailablePositions = Array.isArray(availablePositions) ? availablePositions : [];
  const safeAvailableStages = Array.isArray(availableStages) ? availableStages : [];
  const safeAvailableRecruiters = Array.isArray(availableRecruiters) ? availableRecruiters : [];

  const filteredPositions = safeAvailablePositions.filter(pos => pos.title.toLowerCase().includes(positionSearch.toLowerCase()));
  const filteredStages = safeAvailableStages.filter(stage => stage.name.toLowerCase().includes(statusSearch.toLowerCase()));
  const filteredRecruiters = safeAvailableRecruiters.filter(rec => rec.name.toLowerCase().includes(recruiterSearch.toLowerCase()));

  return (
    <div>
      <Accordion type="multiple" defaultValue={["ai-search", "filters"]} className="w-full">
        
        {/* AI Power Search Accordion */}
        <AccordionItem value="ai-search" className={cn("bg-card", isAiSearching && "animate-pulse")}>
          <AccordionTrigger className={cn("px-3 py-2.5 hover:no-underline hover:bg-accent/50 transition-colors", isAiSearching && "bg-blue-50 dark:bg-blue-950/20")}>
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                {isAiSearching ? (
                  <div className="relative">
                    <Brain className="w-4 h-4 text-blue-600 animate-pulse" />
                    <div className="absolute inset-0 w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <Brain className="w-4 h-4 text-primary" />
                )}
                <span className={cn("font-medium text-sm", isAiSearching ? "text-blue-700 dark:text-blue-300" : "text-foreground")}>
                  {isAiSearching ? "AI Power Search (Searching...)" : "AI Power Search"}
                </span>
                <Tooltip>
                  <TooltipTrigger>
                    <Lightbulb className={cn("w-3 h-3 ml-1", isAiSearching ? "text-blue-500 animate-pulse" : "text-muted-foreground")} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Use natural language to search across all candidate attributes including skills, experience, education, and parsed resume data.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearAll();
                    }}
                    disabled={isLoading || isAiSearching}
                    className="h-6 px-2 hover:bg-accent/50"
                  >
                    <FilterX className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear all filters</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 bg-muted/20">
            <div className="flex flex-col gap-3 pt-3">
              <div className="relative">
                <Textarea
                  id="ai-search"
                  placeholder="e.g., 'React developers with 5+ years experience at tech companies'"
                  value={aiSearchQueryInput}
                  onChange={(e) => setAiSearchQueryInput(e.target.value)}
                  className={cn("min-h-[80px] text-base transition-all duration-300", isAiSearching && "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20")}
                  disabled={isLoading || isAiSearching}
                />
                {isAiSearching && (
                  <div className="absolute top-2 right-2">
                    <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <Button
                  onClick={handleAiSearchClick}
                  disabled={!aiSearchQueryInput.trim() || isLoading || isAiSearching}
                  className={cn("w-full transition-all duration-300", isAiSearching && "bg-blue-600 hover:bg-blue-700 shadow-lg")}
                  size="sm"
                >
                  {isAiSearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      AI Search
                    </>
                  )}
                </Button>

                {isAiSearching && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span>Analyzing candidates with AI...</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                      <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                )}
              </div>

              {aiSearchResults && (
                <Card className="bg-background animate-in slide-in-from-bottom-2 duration-300">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="w-4 h-4 text-green-600" />
                      AI Search Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Found:</span>
                        <Badge variant="secondary" className="animate-in zoom-in-50 duration-300">{aiSearchResults.totalFound} candidates</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <strong>Query:</strong> &quot;{aiSearchResults.searchQuery}&quot;
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <strong>Type:</strong> {aiSearchResults.searchType}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <strong>Reasoning:</strong> {aiSearchResults.reasoning}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Filters & Advanced Query Accordion */}
        <AccordionItem value="filters" className="bg-card">
          <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm text-foreground">Filters</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearAll();
                    }}
                    disabled={isLoading || isAiSearching}
                    className="h-6 px-2 hover:bg-accent/50"
                  >
                    <FilterX className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear all filters</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 bg-muted/20">
            <div className="pt-3">
              {/* Tabs for Filters and Advanced Query */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'filters' | 'advanced')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="filters" className="text-xs">Filters</TabsTrigger>
                  <TabsTrigger value="advanced" className="text-xs">Advanced Query</TabsTrigger>
                </TabsList>
                
                {/* Filters Tab */}
                <TabsContent value="filters" className="space-y-4 mt-3">
                  
                  {/* Basic Information Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium">Basic Information</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Label htmlFor="name-search" className="text-xs">Name</Label>
                        <Input id="name-search" placeholder="Filter by name..." value={name} onChange={(e) => setName(e.target.value)} className="mt-1" disabled={isLoading || isAiSearching}/>
                      </div>
                      <div>
                        <Label htmlFor="email-search" className="text-xs">Email</Label>
                        <Input id="email-search" placeholder="Filter by email..." value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" disabled={isLoading || isAiSearching}/>
                      </div>
                      <div>
                        <Label htmlFor="phone-search" className="text-xs">Phone</Label>
                        <Input id="phone-search" placeholder="Filter by phone..." value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" disabled={isLoading || isAiSearching}/>
                      </div>
                      <div>
                        <Label htmlFor="education-search" className="text-xs">Education Keywords</Label>
                        <Input id="education-search" placeholder="e.g., MBA, Computer Science..." value={education} onChange={(e) => setEducation(e.target.value)} className="mt-1" disabled={isLoading || isAiSearching}/>
                      </div>
                    </div>
                  </div>

                  {/* Application Status Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium">Application Status</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Label htmlFor="position-select" className="text-xs">Position(s)</Label>
                        <Popover open={positionPopoverOpen} onOpenChange={setPositionPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={positionPopoverOpen}
                              className="w-full justify-between mt-1"
                              disabled={isLoading || isAiSearching}
                            >
                              {renderMultiSelectTrigger("Select positions...", selectedPositionIds, safeAvailablePositions, 'position')}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search positions..." value={positionSearch} onChange={e => setPositionSearch(e.target.value)} />
                              <CommandList>
                                <CommandEmpty>No position found.</CommandEmpty>
                                {filteredPositions.map((position) => (
                                  <CommandItem
                                    key={position.id}
                                    onSelect={() => {
                                      const newSelected = new Set(selectedPositionIds);
                                      if (newSelected.has(position.id)) {
                                        newSelected.delete(position.id);
                                      } else {
                                        newSelected.add(position.id);
                                      }
                                      setSelectedPositionIds(newSelected);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedPositionIds.has(position.id) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {position.title}
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label htmlFor="status-select" className="text-xs">Status(es)</Label>
                        <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={statusPopoverOpen}
                              className="w-full justify-between mt-1"
                              disabled={isLoading || isAiSearching}
                            >
                              {renderMultiSelectTrigger("Select statuses...", selectedStatuses, safeAvailableStages, 'status')}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search statuses..." value={statusSearch} onChange={e => setStatusSearch(e.target.value)} />
                              <CommandList>
                                <CommandEmpty>No status found.</CommandEmpty>
                                {filteredStages.map((stage) => (
                                  <CommandItem
                                    key={stage.name}
                                    onSelect={() => {
                                      const newSelected = new Set(selectedStatuses);
                                      if (newSelected.has(stage.name)) {
                                        newSelected.delete(stage.name);
                                      } else {
                                        newSelected.add(stage.name);
                                      }
                                      setSelectedStatuses(newSelected);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedStatuses.has(stage.name) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {stage.name}
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-xs">Application Date Range</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal mt-1",
                                !applicationDateRange && "text-muted-foreground"
                              )}
                              disabled={isLoading || isAiSearching}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {applicationDateRange?.from ? (
                                applicationDateRange.to ? (
                                  <>
                                    {format(applicationDateRange.from, "LLL dd, y")} -{" "}
                                    {format(applicationDateRange.to, "LLL dd, y")}
                                  </>
                                ) : (
                                  format(applicationDateRange.from, "LLL dd, y")
                                )
                              ) : (
                                <span>Pick a date range</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={applicationDateRange?.from}
                              selected={applicationDateRange}
                              onSelect={setApplicationDateRange}
                              numberOfMonths={2}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>

                  {/* Fit Score Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium">Fit Score Ranges</h4>
                    </div>
                    <div className="space-y-4">
                      {/* Applied Candidates Fit Score */}
                      <div>
                        <Label className="text-xs font-medium">Applied Candidates</Label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={fitScoreRange}
                            onValueChange={val => setFitScoreRange([val[0], val[1]])}
                            max={100}
                            step={1}
                            className="flex-1"
                            disabled={isLoading || isAiSearching}
                          />
                          <span className="text-xs w-16">
                            {fitScoreRange[0]}-{fitScoreRange[1]}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(() => {
                            const scoreRanges = getScoreRangesForChart();
                            const selectedRanges = scoreRanges.filter(range => 
                              (range.min >= fitScoreRange[0] && range.min <= fitScoreRange[1]) ||
                              (range.max >= fitScoreRange[0] && range.max <= fitScoreRange[1]) ||
                              (range.min <= fitScoreRange[0] && range.max >= fitScoreRange[1])
                            );
                            return selectedRanges.length > 0 ? 
                              `Grades: ${selectedRanges.map(r => r.letter).join(', ')}` : 
                              'No grades in range';
                          })()}
                        </div>
                      </div>

                      {/* Matching Candidates Fit Score */}
                      <div>
                        <Label className="text-xs font-medium">Matching Candidates</Label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={matchingFitScoreRange}
                            onValueChange={val => setMatchingFitScoreRange([val[0], val[1]])}
                            max={100}
                            step={1}
                            className="flex-1"
                            disabled={isLoading || isAiSearching}
                          />
                          <span className="text-xs w-16">
                            {matchingFitScoreRange[0]}-{matchingFitScoreRange[1]}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          High potential candidates for this position
                        </div>
                      </div>


                    </div>
                  </div>

                  {/* Assignment Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium">Assignment</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="recruiter-select" className="text-xs">Assigned Recruiter(s)</Label>
                        <Popover open={recruiterPopoverOpen} onOpenChange={setRecruiterPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={recruiterPopoverOpen}
                              className="w-full justify-between mt-1"
                              disabled={isLoading || isAiSearching}
                            >
                              {renderMultiSelectTrigger("Select recruiters...", selectedRecruiterIds, safeAvailableRecruiters, 'recruiter')}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search recruiters..." value={recruiterSearch} onChange={e => setRecruiterSearch(e.target.value)} />
                              <CommandList>
                                <CommandEmpty>No recruiter found.</CommandEmpty>
                                {/* Unassigned option */}
                                <CommandItem
                                  key="unassigned"
                                  onSelect={() => {
                                    const newSelected = new Set(selectedRecruiterIds);
                                    if (newSelected.has('unassigned')) {
                                      newSelected.delete('unassigned');
                                    } else {
                                      newSelected.add('unassigned');
                                    }
                                    setSelectedRecruiterIds(newSelected);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedRecruiterIds.has('unassigned') ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  Unassigned
                                </CommandItem>
                                {/* Regular recruiters */}
                                {filteredRecruiters.map((recruiter) => (
                                  <CommandItem
                                    key={recruiter.id}
                                    onSelect={() => {
                                      const newSelected = new Set(selectedRecruiterIds);
                                      if (newSelected.has(recruiter.id)) {
                                        newSelected.delete(recruiter.id);
                                      } else {
                                        newSelected.add(recruiter.id);
                                      }
                                      setSelectedRecruiterIds(newSelected);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedRecruiterIds.has(recruiter.id) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {recruiter.name}
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={handleApplyStandardFilters}
                      disabled={isLoading || isAiSearching}
                      className="flex-1"
                      size="sm"
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Apply Filters
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleResetFilters}
                      disabled={isLoading || isAiSearching}
                      size="sm"
                    >
                      <FilterX className="mr-2 h-4 w-4" />
                      Clear All
                    </Button>
                  </div>
                </TabsContent>

                {/* Advanced Query Tab */}
                <TabsContent value="advanced" className="space-y-3 mt-3">
                  {/* Advanced Query Syntax */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-medium">Advanced Query Syntax</Label>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="p-1 h-6 w-6" type="button">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Advanced Query Syntax Guide</DialogTitle>
                            <DialogDescription>
                              Use advanced query syntax to filter candidates with powerful expressions. Combine multiple filters with spaces. Supported keys:
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-2 space-y-2 text-sm">
                            <ul className="list-disc pl-5">
                              <li><b>name</b>: Filter by candidate name. <code>name:John</code></li>
                              <li><b>email</b>: Filter by email. <code>email:gmail.com</code></li>
                              <li><b>phone</b>: Filter by phone. <code>phone:555</code></li>
                              <li><b>education</b>: Education keywords. <code>education:MBA,Computer Science</code></li>
                              <li><b>positionId</b>: Position IDs (comma separated). <code>positionId:pos1,pos2</code></li>
                              <li><b>status</b>: Statuses (comma separated). <code>status:Applied,Screening</code></li>
                              <li><b>recruiterId</b>: Recruiter IDs or <code>unassigned</code>. <code>recruiterId:unassigned</code></li>
                              <li><b>minFitScore</b>: Minimum fit score. <code>minFitScore:80</code></li>
                              <li><b>maxFitScore</b>: Maximum fit score. <code>maxFitScore:95</code></li>
                              <li><b>applicationDateStart</b>: Start date (YYYY-MM-DD). <code>applicationDateStart:2024-01-01</code></li>
                              <li><b>applicationDateEnd</b>: End date (YYYY-MM-DD). <code>applicationDateEnd:2024-01-31</code></li>
                            </ul>
                            <div className="mt-4">
                              <b>Examples:</b>
                              <ul className="list-disc pl-5 mt-1">
                                <li><code>minFitScore:80 status:Applied,Screening</code> <span className="text-muted-foreground">// High fit score in active stages</span></li>
                                <li><code>applicationDateStart:2024-01-01 applicationDateEnd:2024-01-31</code> <span className="text-muted-foreground">// Applied in January 2024</span></li>
                                <li><code>recruiterId:unassigned</code> <span className="text-muted-foreground">// Not assigned to any recruiter</span></li>
                                <li><code>positionId:pos1,pos2 status:Screening</code> <span className="text-muted-foreground">// Candidates in specific positions and status</span></li>
                                <li><code>education:MBA,Computer Science</code> <span className="text-muted-foreground">// Education keywords</span></li>
                              </ul>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="e.g., minFitScore:80 status:Applied,Screening"
                        value={advancedQueryInput}
                        onChange={(e) => setAdvancedQueryInput(e.target.value)}
                        className="flex-1 min-h-[80px]"
                        disabled={isLoading || isAiSearching}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      onClick={handleApplyAdvancedQuery}
                      disabled={!advancedQueryInput.trim() || isLoading || isAiSearching}
                      className="flex-1"
                      size="sm"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Apply Query
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

