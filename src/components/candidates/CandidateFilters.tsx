"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';

import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Filter, 
  X, 
  SlidersHorizontal, 
  Target, 
  User, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  RefreshCw, 
  FileText, 
  BarChart3, 
  Users, 
  Check, 
  ChevronsUpDown,
  Sparkles,
  Brain,
  Zap,
  Lightbulb,
  BookOpen,
  Code,
  Database,
  Globe,
  Clock,
  Star,
  Award,
  Trophy,
  Target as TargetIcon,
  UserCheck,
  UserX,
  UserPlus,
  UserMinus,
  UserCog,
  UserEdit,
  UserSearch,
  UserList,
  UserCheck2,
  UserClock,
  UserStar,
  UserAward,
  UserTrophy,
  UserTarget,
  UserTrendingUp,
  UserTrendingDown,
  UserActivity,
  UserHeart,
  UserSmile,
  UserFrown,
  UserMeh,
  UserX2,
  UserCheck3,
  UserClock2,
  UserStar2,
  UserAward2,
  UserTrophy2,
  UserTarget2,
  UserTrendingUp2,
  UserTrendingDown2,
  UserActivity2,
  UserHeart2,
  UserSmile2,
  UserFrown2,
  UserMeh2,
  FilterX,
  Loader2,
  ListFilter,
  Play,
  Briefcase,
  MultiSelect // Assume you have or will create a MultiSelect component
} from 'lucide-react';
import { getScoreRangesForChart } from "@/lib/scoreUtils";
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { PositionMultiSelectDropdown } from './PositionMultiSelectDropdown';
import { RecruiterMultiSelectDropdown } from './RecruiterMultiSelectDropdown';
import { StatusMultiSelectDropdown } from './StatusMultiSelectDropdown';
import type { Position, RecruitmentStage, UserProfile } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogTrigger } from '@/components/ui/dialog';

export interface CandidateFilterValues {
  name?: string;
  nameOperator?: 'contains' | 'is' | 'startsWith' | 'endsWith';
  email?: string;
  emailOperator?: 'contains' | 'is' | 'startsWith' | 'endsWith';
  phone?: string;
  phoneOperator?: 'contains' | 'is' | 'startsWith' | 'endsWith';
  selectedPositionIds?: string[];
  selectedStatuses?: string[];
  education?: string; // Education Keywords
  skills?: string; // Skills Keywords
  location?: string; // Location
  cvLanguage?: string; // CV Language
  jobSuitableCareer?: string; // Job Suitable Career
  jobSuitableLevel?: string; // Job Suitable Level
  jobSuitablePosition?: string; // Job Suitable Position
  minExperienceYears?: number; // Minimum Experience Years
  maxExperienceYears?: number; // Maximum Experience Years
  minAppliedJobFitScore?: number; // Min fit score for applied job
  maxAppliedJobFitScore?: number; // Max fit score for applied job
  minMatchingJobFitScore?: number; // Min fit score for matching jobs
  maxMatchingJobFitScore?: number; // Max fit score for matching jobs
  applicationDateStart?: Date;
  applicationDateEnd?: Date;
  selectedRecruiterIds?: string[];
  aiSearchQuery?: string;
  aiSearchType?: 'semantic' | 'exact' | 'hybrid';
  aiSearchFilters?: {
    positionIds?: string[];
    statuses?: string[];
    minAppliedJobFitScore?: number;
    maxAppliedJobFitScore?: number;
    dateRange?: {
      start: string;
      end: string;
    };
  };
  locationOperator?: 'contains' | 'is' | 'startsWith' | 'endsWith' | 'other';
}

interface CandidateFiltersProps {
  initialFilters?: CandidateFilterValues;
  onFilterChange: (filters: CandidateFilterValues) => void;
  onAiSearch: (query: string, type: 'semantic' | 'exact' | 'hybrid', filters?: any) => void;
  onClearAllFilters?: () => void;
  availablePositions: Position[];
  availableStages: RecruitmentStage[];
  availableRecruiters: Pick<UserProfile, 'id' | 'name'>[];
  isLoading?: boolean;
  isAiSearching?: boolean;
  aiSearchResults?: any;
  advancedQuery?: string;
  candidateScoreCounts?: {
    applied: { letter: string; count: number }[];
    matching: { letter: string; count: number }[];
  };
  candidateCounts?: { [stageName: string]: number };
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
    advancedQuery,
    candidateScoreCounts,
    candidateCounts = {}
}: CandidateFiltersProps) {
  const [name, setName] = useState(initialFilters.name || '');
  const [email, setEmail] = useState(initialFilters.email || '');
  const [phone, setPhone] = useState(initialFilters.phone || '');
  const [selectedPositionIds, setSelectedPositionIds] = useState<Set<string>>(new Set(initialFilters.selectedPositionIds || []));
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(() => {
    // If initial filters have specific statuses, use those
    if (initialFilters.selectedStatuses && initialFilters.selectedStatuses.length > 0) {
      return new Set(initialFilters.selectedStatuses);
    }
    // Otherwise, select all stages by default (empty set means all stages)
    return new Set();
  });
  // Replace skills state with a Set for multi-select
  const [skills, setSkills] = useState<Set<string>>(new Set(initialFilters.skills ? initialFilters.skills.split(',').filter(Boolean) : []));
  const [location, setLocation] = useState(initialFilters.location || '');
  const [experienceYearsRange, setExperienceYearsRange] = useState<[number, number]>([
    initialFilters.minExperienceYears ?? -1,
    initialFilters.maxExperienceYears || 50,
  ]);
  const [appliedJobFitScoreRange, setAppliedJobFitScoreRange] = useState<[number, number]>([
    initialFilters.minAppliedJobFitScore ?? 0,
    initialFilters.maxAppliedJobFitScore ?? 100,
  ]);
  const [matchingJobFitScoreRange, setMatchingJobFitScoreRange] = useState<[number, number]>([
    initialFilters.minMatchingJobFitScore ?? 0,
    initialFilters.maxMatchingJobFitScore ?? 100,
  ]);

  // Checkbox states for fit score grades - start with no grades selected for better UX
  const [selectedFitScoreGrades, setSelectedFitScoreGrades] = useState<Set<string>>(new Set());
  const [selectedMatchingFitScoreGrades, setSelectedMatchingFitScoreGrades] = useState<Set<string>>(new Set());
  
  // Add refs for debouncing multiselect changes
  const multiselectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const isInitialLoadRef = useRef(true);

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
      name: "No Status Candidates",
      query: "status:Off",
      description: "Candidates with no status assigned"
    },
    {
      name: "Multiple Positions",
      query: "positionId:pos1,pos2,pos3",
      description: "Candidates from specific positions"
    },
    {
      name: "Complex Query",
      query: "minFitScore:70 maxFitScore:90 status:Applied,Screening education:Engineering",
      description: "High-scoring engineering candidates in early stages"
    }
  ]);



  



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

  // Add operator state for name, email, phone
  const [nameOperator, setNameOperator] = useState<'contains' | 'is' | 'startsWith' | 'endsWith'>('contains');
  const [emailOperator, setEmailOperator] = useState<'contains' | 'is' | 'startsWith' | 'endsWith'>('contains');
  const [phoneOperator, setPhoneOperator] = useState<'contains' | 'is' | 'startsWith' | 'endsWith'>('contains');

  // Add locationOperator state
  const [locationOperator, setLocationOperator] = useState<'contains' | 'is' | 'startsWith' | 'endsWith' | 'other'>(initialFilters.locationOperator || 'contains');

  // Initialize checkbox states based on initial filters
  useEffect(() => {
    const scoreRanges = getScoreRangesForChart();
    
    // Initialize applied candidates fit score checkboxes
    if (initialFilters.minAppliedJobFitScore !== undefined || initialFilters.maxAppliedJobFitScore !== undefined) {
      const minScore = initialFilters.minAppliedJobFitScore ?? 0;
      const maxScore = initialFilters.maxAppliedJobFitScore ?? 100;
      
      // Handle special case for "no fit score" filter
      if (minScore === -1) {
        setSelectedFitScoreGrades(new Set(['no-score']));
      } else {
        const selectedGrades = scoreRanges
          .filter(range => 
            (range.min >= minScore && range.min <= maxScore) ||
            (range.max >= minScore && range.max <= maxScore) ||
            (range.min <= minScore && range.max >= maxScore)
          )
          .map(range => range.letter);
        setSelectedFitScoreGrades(new Set(selectedGrades));
      }
    } else {
      // Start with no grades selected when no filter is applied
      // This provides better UX for multi-select behavior
      setSelectedFitScoreGrades(new Set());
    }
    
    // Initialize matching candidates fit score checkboxes
    if (initialFilters.minMatchingJobFitScore !== undefined || initialFilters.maxMatchingJobFitScore !== undefined) {
      const minScore = initialFilters.minMatchingJobFitScore ?? 0;
      const maxScore = initialFilters.maxMatchingJobFitScore ?? 100;
      
      // Handle special case for "no fit score" filter
      if (minScore === -1) {
        setSelectedMatchingFitScoreGrades(new Set(['no-score']));
      } else {
        const selectedGrades = scoreRanges
          .filter(range => 
            (range.min >= minScore && range.min <= maxScore) ||
            (range.max >= minScore && range.max <= maxScore) ||
            (range.min <= minScore && range.max >= maxScore)
          )
          .map(range => range.letter);
        setSelectedMatchingFitScoreGrades(new Set(selectedGrades));
      }
    } else {
      // Start with no grades selected when no filter is applied
      // This provides better UX for multi-select behavior
      setSelectedMatchingFitScoreGrades(new Set());
    }
  }, [initialFilters.minAppliedJobFitScore, initialFilters.maxAppliedJobFitScore, initialFilters.minMatchingJobFitScore, initialFilters.maxMatchingJobFitScore]);

  // Define a list of common skills
  const skillOptions = [
    'React', 'Python', 'AWS', 'Java', 'SQL', 'JavaScript', 'TypeScript', 'Node.js', 'Docker', 'Kubernetes', 'C#', 'C++', 'Go', 'Ruby', 'PHP', 'HTML', 'CSS', 'Angular', 'Vue', 'Swift', 'Objective-C', 'Scala', 'Perl', 'R', 'MATLAB', 'Azure', 'GCP', 'Linux', 'Windows', 'iOS', 'Android', 'Flutter', 'Spring', 'Django', 'Flask', 'Express', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'GraphQL', 'REST', 'SOAP', 'Jenkins', 'CI/CD', 'Terraform', 'Ansible', 'Puppet', 'Figma', 'Sketch', 'Zeplin', 'Jira', 'Confluence', 'Salesforce', 'SAP', 'PowerBI', 'Tableau', 'Excel', 'Other'
  ];

  // Parse advanced query string into filter values
  const parseAdvancedQuery = (query: string): Partial<CandidateFilterValues> => {
    const filters: Partial<CandidateFilterValues> = {};
    const parts = query.split(' ').filter(part => part.includes(':'));
    
    parts.forEach(part => {
      const colonIndex = part.indexOf(':');
      if (colonIndex === -1) return;
      
      const key = part.substring(0, colonIndex);
      const value = part.substring(colonIndex + 1);
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
        case 'skills':
          filters.skills = value;
          break;
        case 'location':
          filters.location = value;
          break;
        case 'minexperienceyears':
          const minExpYears = parseInt(value, 10);
          if (!isNaN(minExpYears)) {
            filters.minExperienceYears = minExpYears;
          }
          break;
        case 'maxexperienceyears':
          const maxExpYears = parseInt(value, 10);
          if (!isNaN(maxExpYears)) {
            filters.maxExperienceYears = maxExpYears;
          }
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
        case 'minappliedjobfitscore':
          const minScore = parseInt(value, 10);
          if (!isNaN(minScore)) {
            filters.minAppliedJobFitScore = minScore;
          }
          break;
        case 'maxfitscore':
        case 'maxappliedjobfitscore':
          const maxScore = parseInt(value, 10);
          if (!isNaN(maxScore)) {
            filters.maxAppliedJobFitScore = maxScore;
          }
          break;
        case 'matchingfitscore':
          const matchingScore = parseInt(value, 10);
          if (!isNaN(matchingScore)) {
            // Set matching fit score range
            filters.minMatchingJobFitScore = matchingScore;
            filters.maxMatchingJobFitScore = 100;
          }
          break;
        case 'matchingfitscoremin':
        case 'minmatchingjobfitscore':
          const matchingMinScore = parseInt(value, 10);
          if (!isNaN(matchingMinScore)) {
            filters.minMatchingJobFitScore = matchingMinScore;
          }
          break;
        case 'matchingfitscoremax':
        case 'maxmatchingjobfitscore':
          const matchingMaxScore = parseInt(value, 10);
          if (!isNaN(matchingMaxScore)) {
            filters.maxMatchingJobFitScore = matchingMaxScore;
          }
          break;
        case 'applicationdatestart':
          try {
            // Handle URL-encoded dates and various date formats
            const decodedValue = decodeURIComponent(value);
            console.log('Parsing applicationDateStart:', { original: value, decoded: decodedValue });
            const startDate = parseISO(decodedValue);
            if (!isNaN(startDate.getTime())) {
              filters.applicationDateStart = startDate;
              console.log('Successfully parsed start date:', startDate);
            } else {
              console.warn('Invalid start date format:', decodedValue);
            }
          } catch (error) {
            console.error('Error parsing start date:', value, error);
          }
          break;
        case 'applicationdateend':
          try {
            // Handle URL-encoded dates and various date formats
            const decodedValue = decodeURIComponent(value);
            console.log('Parsing applicationDateEnd:', { original: value, decoded: decodedValue });
            const endDate = parseISO(decodedValue);
            if (!isNaN(endDate.getTime())) {
              filters.applicationDateEnd = endDate;
              console.log('Successfully parsed end date:', endDate);
            } else {
              console.warn('Invalid end date format:', decodedValue);
            }
          } catch (error) {
            console.error('Error parsing end date:', value, error);
          }
          break;
        case 'location':
          filters.location = value;
          break;
        case 'locationoperator':
          filters.locationOperator = value as 'contains' | 'is' | 'startsWith' | 'endsWith' | 'other';
          break;
      }
    });
    
    return filters;
  };

  // Apply advanced query
  const handleApplyAdvancedQuery = () => {
    if (!advancedQueryInput.trim()) return;
    
    const parsedFilters = parseAdvancedQuery(advancedQueryInput);
    
    // Update local state to reflect the parsed filters
    if (parsedFilters.name) setName(parsedFilters.name);
    if (parsedFilters.email) setEmail(parsedFilters.email);
    if (parsedFilters.phone) setPhone(parsedFilters.phone);
    if (parsedFilters.selectedPositionIds) setSelectedPositionIds(new Set(parsedFilters.selectedPositionIds));
    if (parsedFilters.selectedStatuses) setSelectedStatuses(new Set(parsedFilters.selectedStatuses));
    if (parsedFilters.selectedRecruiterIds) setSelectedRecruiterIds(new Set(parsedFilters.selectedRecruiterIds));
    if (parsedFilters.minAppliedJobFitScore !== undefined || parsedFilters.maxAppliedJobFitScore !== undefined) {
      setAppliedJobFitScoreRange([
        parsedFilters.minAppliedJobFitScore ?? appliedJobFitScoreRange[0],
        parsedFilters.maxAppliedJobFitScore ?? appliedJobFitScoreRange[1]
      ]);
    }
    if (parsedFilters.minMatchingJobFitScore !== undefined || parsedFilters.maxMatchingJobFitScore !== undefined) {
      setMatchingJobFitScoreRange([
        parsedFilters.minMatchingJobFitScore ?? matchingJobFitScoreRange[0],
        parsedFilters.maxMatchingJobFitScore ?? matchingJobFitScoreRange[1]
      ]);
    }
    if (parsedFilters.applicationDateStart || parsedFilters.applicationDateEnd) {
      setApplicationDateRange({
        from: parsedFilters.applicationDateStart,
        to: parsedFilters.applicationDateEnd
      });
    }
    if (parsedFilters.location) setLocation(parsedFilters.location);
    if (parsedFilters.locationOperator) setLocationOperator(parsedFilters.locationOperator);
    
    // Apply the filters
    onFilterChange({
      ...parsedFilters,
      minAppliedJobFitScore: parsedFilters.minAppliedJobFitScore ?? appliedJobFitScoreRange[0],
      maxAppliedJobFitScore: parsedFilters.maxAppliedJobFitScore ?? appliedJobFitScoreRange[1],
      minMatchingJobFitScore: parsedFilters.minMatchingJobFitScore ?? matchingJobFitScoreRange[0],
      maxMatchingJobFitScore: parsedFilters.maxMatchingJobFitScore ?? matchingJobFitScoreRange[1],
      applicationDateStart: parsedFilters.applicationDateStart,
      applicationDateEnd: parsedFilters.applicationDateEnd,
      location: parsedFilters.location,
      locationOperator: parsedFilters.locationOperator,
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
    if (skills.size > 0) parts.push(`skills:${Array.from(skills).join(',')}`);
    if (location) parts.push(`location:${location}`);
    if (locationOperator !== 'other') {
      parts.push(`locationOperator:${locationOperator}`);
    }
    if (experienceYearsRange[0] > 0) parts.push(`minExperienceYears:${experienceYearsRange[0]}`);
    if (experienceYearsRange[1] < 50) parts.push(`maxExperienceYears:${experienceYearsRange[1]}`);
    if (selectedPositionIds.size > 0) parts.push(`positionId:${Array.from(selectedPositionIds).join(',')}`);
    if (selectedStatuses.size > 0) parts.push(`status:${Array.from(selectedStatuses).join(',')}`);
    if (selectedRecruiterIds.size > 0) parts.push(`recruiterId:${Array.from(selectedRecruiterIds).join(',')}`);
    if (appliedJobFitScoreRange[0] > 0) parts.push(`minFitScore:${appliedJobFitScoreRange[0]}`);
    if (appliedJobFitScoreRange[1] < 100) parts.push(`maxFitScore:${appliedJobFitScoreRange[1]}`);
    if (matchingJobFitScoreRange[0] > 70 || matchingJobFitScoreRange[1] < 100) {
      parts.push(`matchingFitScoreMin:${matchingJobFitScoreRange[0]}`);
      parts.push(`matchingFitScoreMax:${matchingJobFitScoreRange[1]}`);
    }
    if (applicationDateRange?.from) parts.push(`applicationDateStart:${applicationDateRange.from.toISOString().slice(0, 10)}`);
    if (applicationDateRange?.to) parts.push(`applicationDateEnd:${applicationDateRange.to.toISOString().slice(0, 10)}`);
    
    setAdvancedQueryInput(parts.join(' '));
  };

  // Handle advanced query from URL
  const processedAdvancedQueryRef = useRef<string>('');
  
  useEffect(() => {
    if (advancedQuery && advancedQuery.trim() && processedAdvancedQueryRef.current !== advancedQuery) {
      try {
        console.log('Processing advanced query from URL:', advancedQuery);
        processedAdvancedQueryRef.current = advancedQuery;
        setAdvancedQueryInput(advancedQuery);
        // Switch to advanced tab when query comes from URL
        setActiveTab('advanced');
        // Automatically apply the query if it's from URL
        const parsedFilters = parseAdvancedQuery(advancedQuery);
        console.log('Parsed filters from advanced query:', parsedFilters);
        if (Object.keys(parsedFilters).length > 0) {
          // Apply the filters first to avoid state update conflicts
          onFilterChange({
            ...parsedFilters,
            minAppliedJobFitScore: parsedFilters.minAppliedJobFitScore ?? appliedJobFitScoreRange[0],
            maxAppliedJobFitScore: parsedFilters.maxAppliedJobFitScore ?? appliedJobFitScoreRange[1],
            applicationDateStart: parsedFilters.applicationDateStart,
            applicationDateEnd: parsedFilters.applicationDateEnd,
            location: parsedFilters.location,
            locationOperator: parsedFilters.locationOperator,
            aiSearchQuery: undefined,
          });
          
          // Update local state to reflect the parsed filters
          if (parsedFilters.name) setName(parsedFilters.name);
          if (parsedFilters.email) setEmail(parsedFilters.email);
          if (parsedFilters.phone) setPhone(parsedFilters.phone);
          if (parsedFilters.selectedPositionIds) setSelectedPositionIds(new Set(parsedFilters.selectedPositionIds));
          if (parsedFilters.selectedStatuses) setSelectedStatuses(new Set(parsedFilters.selectedStatuses));
          if (parsedFilters.selectedRecruiterIds) setSelectedRecruiterIds(new Set(parsedFilters.selectedRecruiterIds));
          if (parsedFilters.minAppliedJobFitScore !== undefined || parsedFilters.maxAppliedJobFitScore !== undefined) {
            setAppliedJobFitScoreRange([
              parsedFilters.minAppliedJobFitScore ?? appliedJobFitScoreRange[0],
              parsedFilters.maxAppliedJobFitScore ?? appliedJobFitScoreRange[1]
            ]);
          }
          if (parsedFilters.minMatchingJobFitScore !== undefined || parsedFilters.maxMatchingJobFitScore !== undefined) {
            setMatchingJobFitScoreRange([
              parsedFilters.minMatchingJobFitScore ?? matchingJobFitScoreRange[0],
              parsedFilters.maxMatchingJobFitScore ?? matchingJobFitScoreRange[1]
            ]);
          }
          if (parsedFilters.applicationDateStart || parsedFilters.applicationDateEnd) {
            setApplicationDateRange({
              from: parsedFilters.applicationDateStart,
              to: parsedFilters.applicationDateEnd
            });
          }
          if (parsedFilters.location) setLocation(parsedFilters.location);
          if (parsedFilters.locationOperator) setLocationOperator(parsedFilters.locationOperator);
        }
      } catch (error) {
        console.error('Error parsing advanced query:', error);
        // Fallback: just set the input without applying
        setAdvancedQueryInput(advancedQuery);
        setActiveTab('advanced');
      }
    }
  }, [advancedQuery, appliedJobFitScoreRange, matchingJobFitScoreRange]); // Removed onFilterChange from dependencies

  // Clear all filters function
  const handleClearAll = () => {
    // Reset all local state
    setName('');
    setEmail('');
    setPhone('');
    setSelectedPositionIds(new Set());
    setSelectedStatuses(new Set());
    setSelectedRecruiterIds(new Set());
          setSkills(new Set()); // Clear skills selection
    setAppliedJobFitScoreRange([0, 100]);
    setMatchingJobFitScoreRange([0, 100]);
    setExperienceYearsRange([0, 50]); // Added missing experience years clear (will reset no-experience checkbox)
    setApplicationDateRange(undefined);
    setLocation('');
    setLocationOperator('contains');
    setAiSearchQueryInput('');
    setAiSearchType('hybrid'); // Added missing AI search type clear
    setAiSearchFilters({}); // Added missing AI search filters clear
    setAdvancedQueryInput('');
    
    // Clear fit score checkboxes (including no-score options)
    setSelectedFitScoreGrades(new Set());
    setSelectedMatchingFitScoreGrades(new Set());
    
    // Reset to filters tab
    setActiveTab('filters');
    
    // Clear search states

    
    
    
    // Apply empty filters to clear everything (this will trigger URL parameter clearing)
    onFilterChange({
      name: undefined,
      email: undefined,
      phone: undefined,
      skills: undefined, // Added missing skills in filter change
      education: undefined, // Added missing education
      cvLanguage: undefined, // Added missing CV language
      jobSuitableCareer: undefined, // Added missing job suitable fields
      jobSuitableLevel: undefined,
      jobSuitablePosition: undefined,
      minExperienceYears: undefined, // Added missing experience years
      maxExperienceYears: undefined,
      selectedPositionIds: undefined,
      selectedStatuses: undefined,
      selectedRecruiterIds: undefined,
      minAppliedJobFitScore: undefined,
      maxAppliedJobFitScore: undefined,
      minMatchingJobFitScore: undefined,
      maxMatchingJobFitScore: undefined,
      applicationDateStart: undefined,
      applicationDateEnd: undefined,
      location: undefined,
      locationOperator: 'contains',
      aiSearchQuery: undefined,
    });
  };

  // Only reset state on initial load or when initialFilters actually change
  useEffect(() => {
    if (isInitialLoadRef.current) {
      setName(initialFilters.name || '');
      setEmail(initialFilters.email || '');
      setPhone(initialFilters.phone || '');
      setSelectedPositionIds(new Set(initialFilters.selectedPositionIds || []));
      setSelectedStatuses(new Set(initialFilters.selectedStatuses || []));
      setSkills(new Set(initialFilters.skills ? initialFilters.skills.split(',').filter(Boolean) : []));
      setLocation(initialFilters.location || '');
      setLocationOperator(initialFilters.locationOperator || 'contains');
      setExperienceYearsRange([initialFilters.minExperienceYears ?? 0, initialFilters.maxExperienceYears || 50]);
      setAppliedJobFitScoreRange([initialFilters.minAppliedJobFitScore ?? 0, initialFilters.maxAppliedJobFitScore ?? 100]);
      setMatchingJobFitScoreRange([initialFilters.minMatchingJobFitScore ?? 0, initialFilters.maxMatchingJobFitScore ?? 100]);
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
      isInitialLoadRef.current = false;
    }
  }, [initialFilters]);

  // Handle initialFilters changes after initial load (e.g., when clear all is clicked)
  useEffect(() => {
    if (!isInitialLoadRef.current) {
      console.log('CandidateFilters: initialFilters changed, updating component state');
      console.log('CandidateFilters: new initialFilters.selectedPositionIds:', initialFilters.selectedPositionIds);
      
      // Update component state to match the new initialFilters
      setName(initialFilters.name || '');
      setEmail(initialFilters.email || '');
      setPhone(initialFilters.phone || '');
      setSelectedPositionIds(new Set(initialFilters.selectedPositionIds || []));
      setSelectedStatuses(new Set(initialFilters.selectedStatuses || []));
      setSkills(new Set(initialFilters.skills ? initialFilters.skills.split(',').filter(Boolean) : []));
      setLocation(initialFilters.location || '');
      setLocationOperator(initialFilters.locationOperator || 'contains');
      setExperienceYearsRange([initialFilters.minExperienceYears ?? 0, initialFilters.maxExperienceYears || 50]);
      setAppliedJobFitScoreRange([initialFilters.minAppliedJobFitScore ?? 0, initialFilters.maxAppliedJobFitScore ?? 100]);
      setMatchingJobFitScoreRange([initialFilters.minMatchingJobFitScore ?? 0, initialFilters.maxMatchingJobFitScore ?? 100]);
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
      
      // Clear fit score checkboxes when filters are cleared
      if (!initialFilters.minAppliedJobFitScore && !initialFilters.maxAppliedJobFitScore) {
        setSelectedFitScoreGrades(new Set());
      }
      if (!initialFilters.minMatchingJobFitScore && !initialFilters.maxMatchingJobFitScore) {
        setSelectedMatchingFitScoreGrades(new Set());
      }
    }
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
                         initialFilters.skills ||
                         initialFilters.location ||
                         initialFilters.aiSearchQuery ||
                         initialFilters.locationOperator;
    
        if (hasUrlFilters) {
      // Use a small delay to prevent multiple rapid calls
      const timeoutId = setTimeout(() => {
        onFilterChange(initialFilters);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [initialFilters, onFilterChange]); // Added onFilterChange back to dependencies

  // Auto-apply filters when input values change (debounced)
  // Note: Fit score ranges are now handled separately through debounced handlers
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Skip if there's an advanced query active
      if (advancedQueryInput.trim()) return;
      
      // Only apply filters if we have meaningful changes (excluding fit score ranges)
      const hasFilters = name || email || phone || 
                        selectedPositionIds.size > 0 || 
                        selectedStatuses.size > 0 || 
                        skills.size > 0 || 
                        location ||
                        experienceYearsRange[0] > 0 || 
                        experienceYearsRange[1] < 50 ||
                        applicationDateRange?.from ||
                        applicationDateRange?.to ||
                        selectedRecruiterIds.size > 0;
      
      if (hasFilters) {
        // Use the debounced function to apply all filters including fit score ranges
        handleApplyStandardFiltersDebounced();
      }
    }, 150); // Reduced to 150ms for faster response

    return () => clearTimeout(timeoutId);
  }, [name, email, phone, selectedPositionIds, selectedStatuses, skills, location, experienceYearsRange, applicationDateRange, selectedRecruiterIds, advancedQueryInput, onFilterChange, nameOperator, emailOperator, phoneOperator, locationOperator]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (multiselectTimeoutRef.current) {
        clearTimeout(multiselectTimeoutRef.current);
      }
    };
  }, []);

  const handleApplyStandardFilters = () => {
    console.log('handleApplyStandardFilters called');
    
    // Clear any pending multiselect timeout
    if (multiselectTimeoutRef.current) {
      clearTimeout(multiselectTimeoutRef.current);
      multiselectTimeoutRef.current = null;
    }

    // Calculate fit score filters based on selected grades
    let minAppliedJobFitScore: number | undefined = undefined;
    let maxAppliedJobFitScore: number | undefined = undefined;
    let minMatchingJobFitScore: number | undefined = undefined;
    let maxMatchingJobFitScore: number | undefined = undefined;

    // Handle applied job fit score grades
    if (selectedFitScoreGrades.size > 0) {
      const scoreRanges = getScoreRangesForChart();
      const selectedRanges = scoreRanges.filter(range => selectedFitScoreGrades.has(range.letter));
      const hasNoScore = selectedFitScoreGrades.has('no-score');
      
      if (selectedRanges.length > 0) {
        const minScore = Math.min(...selectedRanges.map(r => r.min));
        const maxScore = Math.max(...selectedRanges.map(r => r.max));
        minAppliedJobFitScore = minScore;
        maxAppliedJobFitScore = maxScore;
      } else if (hasNoScore) {
        minAppliedJobFitScore = -1; // Special marker for no fit score
        maxAppliedJobFitScore = undefined;
      }
    } else {
      // Use range slider values if no grades are selected
      minAppliedJobFitScore = appliedJobFitScoreRange[0] === 0 ? undefined : appliedJobFitScoreRange[0];
      maxAppliedJobFitScore = appliedJobFitScoreRange[1] === 100 ? undefined : appliedJobFitScoreRange[1];
    }

    // Handle matching job fit score grades
    if (selectedMatchingFitScoreGrades.size > 0) {
      const scoreRanges = getScoreRangesForChart();
      const selectedRanges = scoreRanges.filter(range => selectedMatchingFitScoreGrades.has(range.letter));
      const hasNoScore = selectedMatchingFitScoreGrades.has('no-score');
      
      if (selectedRanges.length > 0) {
        const minScore = Math.min(...selectedRanges.map(r => r.min));
        const maxScore = Math.max(...selectedRanges.map(r => r.max));
        minMatchingJobFitScore = minScore;
        maxMatchingJobFitScore = maxScore;
      } else if (hasNoScore) {
        minMatchingJobFitScore = -1; // Special marker for no matching fit score
        maxMatchingJobFitScore = undefined;
      }
    } else {
      // Use range slider values if no grades are selected
      minMatchingJobFitScore = matchingJobFitScoreRange[0] === 0 ? undefined : matchingJobFitScoreRange[0];
      maxMatchingJobFitScore = matchingJobFitScoreRange[1] === 100 ? undefined : matchingJobFitScoreRange[1];
    }

    const newFilters: CandidateFilterValues = {
      name: name || undefined,
      nameOperator,
      email: email || undefined,
      emailOperator,
      phone: phone || undefined,
      phoneOperator,
      selectedPositionIds: selectedPositionIds.size > 0 ? Array.from(selectedPositionIds) : undefined,
      // If no stages are selected, it means all stages (don't send status filter)
      selectedStatuses: selectedStatuses.size > 0 ? Array.from(selectedStatuses) : undefined,
      skills: skills.size > 0 ? Array.from(skills).join(',') : undefined,
      location: location || undefined,
      locationOperator,
      minExperienceYears: experienceYearsRange[0] > 0 ? experienceYearsRange[0] : undefined,
      maxExperienceYears: experienceYearsRange[1] < 50 ? experienceYearsRange[1] : undefined,
      minAppliedJobFitScore,
      maxAppliedJobFitScore,
      minMatchingJobFitScore,
      maxMatchingJobFitScore,
      applicationDateStart: applicationDateRange?.from,
      applicationDateEnd: applicationDateRange?.to,
      selectedRecruiterIds: selectedRecruiterIds.size > 0 ? Array.from(selectedRecruiterIds) : undefined,
      aiSearchQuery: undefined,
    };

    console.log('handleApplyStandardFilters - selectedPositionIds state:', Array.from(selectedPositionIds));
    console.log('handleApplyStandardFilters - newFilters.selectedPositionIds:', newFilters.selectedPositionIds);
    console.log('handleApplyStandardFilters - newFilters:', newFilters);
    onFilterChange(newFilters);
    
    // Clear loading state
    setIsApplyingFilters(false);
    console.log('handleApplyStandardFilters - setting isApplyingFilters to false');
  };

  // Debounced version for multiselect changes to improve UX
  const handleApplyStandardFiltersDebounced = () => {
    console.log('handleApplyStandardFiltersDebounced called - current state:', {
      isLoading,
      isAiSearching,
      isApplyingFilters
    });
    
    // Clear any existing timeout
    if (multiselectTimeoutRef.current) {
      clearTimeout(multiselectTimeoutRef.current);
    }
    
    // Show loading state immediately for better UX
    setIsApplyingFilters(true);
    console.log('Setting isApplyingFilters to true');
    
    // Set a new timeout for debounced filter application
    multiselectTimeoutRef.current = setTimeout(() => {
      console.log('Debounced timeout fired - applying filters');
      handleApplyStandardFilters();
      setIsApplyingFilters(false);
      console.log('Setting isApplyingFilters to false');
    }, 300); // 300ms delay for smooth multiselect experience
  };

  const handleAiSearchClick = () => {
    if (aiSearchQueryInput.trim()) {
      const filters = {
        positionIds: aiSearchFilters.positionIds,
        statuses: aiSearchFilters.statuses,
        minAppliedJobFitScore: aiSearchFilters.minAppliedJobFitScore,
        maxAppliedJobFitScore: aiSearchFilters.maxAppliedJobFitScore,
        dateRange: aiSearchFilters.dateRange,
      };
      onAiSearch(aiSearchQueryInput.trim(), aiSearchType, filters);
    }
  };

  const handleAiSearchExample = (example: string) => {
    setAiSearchQueryInput(example);
  };

  // Wrapper functions to apply filters when dropdown values change
  // DEBUGGING: Enhanced with logging to help identify issues with position selection
  const handlePositionChange = (newSelectedIds: Set<string>) => {
    console.log('handlePositionChange called with:', Array.from(newSelectedIds));
    console.log('handlePositionChange - current selectedPositionIds state:', Array.from(selectedPositionIds));
    console.log('handlePositionChange - newSelectedIds contains not-applied:', newSelectedIds.has('not-applied'));
    
    setSelectedPositionIds(newSelectedIds);
    
    // Apply filters immediately with the new selection to ensure state is updated
    // Use the helper function that takes the new selection directly to avoid race conditions
    handleApplyStandardFiltersWithPositions(newSelectedIds);
  };

  // Helper function to apply filters with specific position IDs
  const handleApplyStandardFiltersWithPositions = (positionIds: Set<string>) => {
    console.log('handleApplyStandardFiltersWithPositions called with:', Array.from(positionIds));
    
    // Clear any pending multiselect timeout
    if (multiselectTimeoutRef.current) {
      clearTimeout(multiselectTimeoutRef.current);
      multiselectTimeoutRef.current = null;
    }

    // Calculate fit score filters based on selected grades
    let minAppliedJobFitScore: number | undefined = undefined;
    let maxAppliedJobFitScore: number | undefined = undefined;
    let minMatchingJobFitScore: number | undefined = undefined;
    let maxMatchingJobFitScore: number | undefined = undefined;

    // Handle applied job fit score grades
    if (selectedFitScoreGrades.size > 0) {
      const scoreRanges = getScoreRangesForChart();
      const selectedRanges = scoreRanges.filter(range => selectedFitScoreGrades.has(range.letter));
      const hasNoScore = selectedFitScoreGrades.has('no-score');
      
      if (selectedRanges.length > 0) {
        const minScore = Math.min(...selectedRanges.map(r => r.min));
        const maxScore = Math.max(...selectedRanges.map(r => r.max));
        minAppliedJobFitScore = minScore;
        maxAppliedJobFitScore = maxScore;
      } else if (hasNoScore) {
        minAppliedJobFitScore = -1; // Special marker for no fit score
        maxAppliedJobFitScore = undefined;
      }
    } else {
      // Use range slider values if no grades are selected
      minAppliedJobFitScore = appliedJobFitScoreRange[0] === 0 ? undefined : appliedJobFitScoreRange[0];
      maxAppliedJobFitScore = appliedJobFitScoreRange[1] === 100 ? undefined : appliedJobFitScoreRange[1];
    }

    // Handle matching job fit score grades
    if (selectedMatchingFitScoreGrades.size > 0) {
      const scoreRanges = getScoreRangesForChart();
      const selectedRanges = scoreRanges.filter(range => selectedMatchingFitScoreGrades.has(range.letter));
      const hasNoScore = selectedMatchingFitScoreGrades.has('no-score');
      
      if (selectedRanges.length > 0) {
        const minScore = Math.min(...selectedRanges.map(r => r.min));
        const maxScore = Math.max(...selectedRanges.map(r => r.max));
        minMatchingJobFitScore = minScore;
        maxMatchingJobFitScore = maxScore;
      } else if (hasNoScore) {
        minMatchingJobFitScore = -1; // Special marker for no matching fit score
        maxMatchingJobFitScore = undefined;
      }
    } else {
      // Use range slider values if no grades are selected
      minMatchingJobFitScore = matchingJobFitScoreRange[0] === 0 ? undefined : matchingJobFitScoreRange[0];
      maxMatchingJobFitScore = matchingJobFitScoreRange[1] === 100 ? undefined : matchingJobFitScoreRange[1];
    }

    const newFilters: CandidateFilterValues = {
      name: name || undefined,
      nameOperator,
      email: email || undefined,
      emailOperator,
      phone: phone || undefined,
      phoneOperator,
      selectedPositionIds: positionIds.size > 0 ? Array.from(positionIds) : undefined,
      // If no stages are selected, it means all stages (don't send status filter)
      selectedStatuses: selectedStatuses.size > 0 ? Array.from(selectedStatuses) : undefined,
      skills: skills.size > 0 ? Array.from(skills).join(',') : undefined,
      location: location || undefined,
      locationOperator,
      minExperienceYears: experienceYearsRange[0] > 0 ? experienceYearsRange[0] : undefined,
      maxExperienceYears: experienceYearsRange[1] < 50 ? experienceYearsRange[1] : undefined,
      minAppliedJobFitScore,
      maxAppliedJobFitScore,
      minMatchingJobFitScore,
      maxMatchingJobFitScore,
      applicationDateStart: applicationDateRange?.from,
      applicationDateEnd: applicationDateRange?.to,
      selectedRecruiterIds: selectedRecruiterIds.size > 0 ? Array.from(selectedRecruiterIds) : undefined,
      aiSearchQuery: undefined,
    };

    console.log('handleApplyStandardFiltersWithPositions - newFilters.selectedPositionIds:', newFilters.selectedPositionIds);
    console.log('handleApplyStandardFiltersWithPositions - newFilters:', newFilters);
    onFilterChange(newFilters);
    
    // Clear loading state
    setIsApplyingFilters(false);
    console.log('handleApplyStandardFiltersWithPositions - setting isApplyingFilters to false');
  };

  const handleStatusChange = (newSelectedStatuses: Set<string>) => {
    setSelectedStatuses(newSelectedStatuses);
    // Apply filters with debouncing for smooth multiselect experience
    handleApplyStandardFiltersDebounced();
  };

  const handleRecruiterChange = (newSelectedRecruiterIds: Set<string>) => {
    setSelectedRecruiterIds(newSelectedRecruiterIds);
    // Apply filters with debouncing for smooth multiselect experience
    handleApplyStandardFiltersDebounced();
  };

  const handleExperienceYearsChange = (newRange: [number, number]) => {
    setExperienceYearsRange(newRange);
    // Apply filters with debouncing for smooth experience years change
    handleApplyStandardFiltersDebounced();
  };

  const handleFitScoreRangeChange = (newRange: [number, number]) => {
    setAppliedJobFitScoreRange(newRange);
    // Apply filters with debouncing for smooth experience
    handleApplyStandardFiltersDebounced();
  };

  const handleMatchingFitScoreRangeChange = (newRange: [number, number]) => {
    setMatchingJobFitScoreRange(newRange);
    // Apply filters with debouncing for smooth experience
    handleApplyStandardFiltersDebounced();
  };

  const handleFitScoreGradeChange = (grade: string, checked: boolean) => {
    // Multi-select behavior: toggle only the clicked grade, keep others unchanged
    const newSelected = new Set(selectedFitScoreGrades);
    if (checked) {
      newSelected.add(grade);
    } else {
      newSelected.delete(grade);
    }
    setSelectedFitScoreGrades(newSelected);
    
    // Convert selected grades to min/max fit score range
    const scoreRanges = getScoreRangesForChart();
    const selectedRanges = scoreRanges.filter(range => newSelected.has(range.letter));
    const hasNoScore = newSelected.has('no-score');
    
    let minFitScore: number | undefined = undefined;
    let maxFitScore: number | undefined = undefined;
    
    if (selectedRanges.length > 0) {
      const minScore = Math.min(...selectedRanges.map(r => r.min));
      const maxScore = Math.max(...selectedRanges.map(r => r.max));
      setAppliedJobFitScoreRange([minScore, maxScore]);
      minFitScore = minScore;
      maxFitScore = maxScore;
    } else if (hasNoScore) {
      // Only "no-score" is selected
      setAppliedJobFitScoreRange([0, 100]); // Reset visual range
      minFitScore = -1; // Special marker for no fit score
      maxFitScore = undefined;
    } else {
      // No grades selected - don't apply any fit score filtering
      setAppliedJobFitScoreRange([0, 100]);
      minFitScore = undefined;
      maxFitScore = undefined;
    }
    
    // Apply filters with debouncing for smooth experience (same as other filters)
    handleApplyStandardFiltersDebounced();
  };

  const handleMatchingFitScoreGradeChange = (grade: string, checked: boolean) => {
    // Multi-select behavior: toggle only the clicked grade, keep others unchanged
    const newSelected = new Set(selectedMatchingFitScoreGrades);
    if (checked) {
      newSelected.add(grade);
    } else {
      newSelected.delete(grade);
    }
    setSelectedMatchingFitScoreGrades(newSelected);
    
    // Convert selected grades to min/max matching fit score range
    const scoreRanges = getScoreRangesForChart();
    const selectedRanges = scoreRanges.filter(range => newSelected.has(range.letter));
    const hasNoScore = newSelected.has('no-score');
    
    let minMatchingJobFitScore: number | undefined = undefined;
    let maxMatchingJobFitScore: number | undefined = undefined;
    
    if (selectedRanges.length > 0) {
      const minScore = Math.min(...selectedRanges.map(r => r.min));
      const maxScore = Math.max(...selectedRanges.map(r => r.max));
      setMatchingJobFitScoreRange([minScore, maxScore]);
      minMatchingJobFitScore = minScore;
      maxMatchingJobFitScore = maxScore;
    } else if (hasNoScore) {
      // Only "no-score" is selected for matching
      setMatchingJobFitScoreRange([0, 100]); // Reset visual range
      minMatchingJobFitScore = -1; // Special marker for no matching fit score
      maxMatchingJobFitScore = undefined;
    } else {
      // No grades selected - don't apply any matching fit score filtering
      setMatchingJobFitScoreRange([0, 100]);
      minMatchingJobFitScore = undefined;
      maxMatchingJobFitScore = undefined;
    }
    
    // Apply filters with debouncing for smooth experience (same as other filters)
    handleApplyStandardFiltersDebounced();
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
    setSkills(new Set());
    setLocation('');
    setLocationOperator('contains');
    setExperienceYearsRange([0, 50]);
    setAppliedJobFitScoreRange([0, 100]);
    setMatchingJobFitScoreRange([0, 100]);
    setSelectedFitScoreGrades(new Set());
    setSelectedMatchingFitScoreGrades(new Set());
    setApplicationDateRange(undefined);
    setSelectedRecruiterIds(new Set());
    setAiSearchQueryInput('');
    setAiSearchType('hybrid');
    setAiSearchFilters({});
    onFilterChange({
      selectedPositionIds: undefined,
      selectedStatuses: undefined,
      selectedRecruiterIds: undefined,
      applicationDateStart: undefined,
      applicationDateEnd: undefined,
      location: undefined,
      locationOperator: 'contains',
      aiSearchQuery: undefined,
    });
  };
  
  const renderMultiSelectTrigger = (placeholder: string, selectedItems: Set<string>, allItems: {id: string; title?: string; name?: string}[], itemType: 'position' | 'status' | 'recruiter') => {
    // Defensive checks to prevent temporal dead zone issues
    if (!selectedItems || selectedItems.size === 0) return <span>{placeholder}</span>;
    if (!Array.isArray(allItems)) return <span>{placeholder}</span>;
    
    if (selectedItems.size === 1) {
      const firstId = Array.from(selectedItems)[0];
      if (!firstId) return <span>{placeholder}</span>;
      
      let itemName = '';
      if (itemType === 'position') {
        itemName = (allItems as Position[]).find(p => p && p.id === firstId)?.title || placeholder;
      } else if (itemType === 'status') {
        // Handle "Off" status specially
        if (firstId === 'Off') {
          itemName = 'Off';
        } else {
          itemName = (allItems as RecruitmentStage[]).find(s => s && s.name === firstId)?.name || placeholder;
        }
      } else if (itemType === 'recruiter') {
        if (firstId === 'unassigned') {
          itemName = 'Unassigned';
        } else {
          itemName = (allItems as UserProfile[]).find(r => r && r.id === firstId)?.name || placeholder;
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
  
  // Debug logging to help identify data loading issues
  useEffect(() => {
    console.log('CandidateFilters: Data received:', {
      availablePositions: availablePositions?.length || 0,
      availableStages: availableStages?.length || 0,
      availableRecruiters: availableRecruiters?.length || 0,
      isLoading,
      isAiSearching
    });
  }, [availablePositions, availableStages, availableRecruiters, isLoading, isAiSearching]);
  
  // Add loading states for better UX
  const [isStagesLoading, setIsStagesLoading] = useState(false);
  const [isRecruitersLoading, setIsRecruitersLoading] = useState(false);
  const [stagesError, setStagesError] = useState<string | null>(null);
  const [recruitersError, setRecruitersError] = useState<string | null>(null);

  // Retry loading data if it's empty
  useEffect(() => {
    if (safeAvailableStages.length === 0 && !isStagesLoading && !stagesError) {
      setIsStagesLoading(true);
      // You can add a retry mechanism here if needed
      setTimeout(() => setIsStagesLoading(false), 1000);
    }
  }, [safeAvailableStages.length, isStagesLoading, stagesError]);

  useEffect(() => {
    if (safeAvailableRecruiters.length === 0 && !isRecruitersLoading && !recruitersError) {
      setIsRecruitersLoading(true);
      // You can add a retry mechanism here if needed
      setTimeout(() => setIsRecruitersLoading(false), 1000);
    }
  }, [safeAvailableRecruiters.length, isRecruitersLoading, recruitersError]);



  



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
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearAll();
                    }}
                    className={cn(
                      "h-6 px-2 hover:bg-accent/50 rounded-md flex items-center cursor-pointer transition-colors",
                      (isLoading || isAiSearching) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <FilterX className="h-3 w-3 mr-1" />
                    Clear All
                  </div>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      // Allow Ctrl+Enter or Cmd+Enter for new line
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (aiSearchQueryInput.trim() && !isLoading && !isAiSearching) {
                        handleAiSearchClick();
                      }
                    }
                  }}
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
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearAll();
                    }}
                    className={cn(
                      "h-6 px-2 hover:bg-accent/50 rounded-md flex items-center cursor-pointer transition-colors",
                      (isLoading || isAiSearching) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <FilterX className="h-3 w-3 mr-1" />
                    Clear All
                  </div>
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
                  <div>
                    <Accordion type="multiple" className="w-full" defaultValue={["application-status"]}>
                      {/* Candidate Information Section */}
                    <AccordionItem value="candidate-info">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <h4 className="text-sm font-medium">Candidate Information</h4>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <Label htmlFor="name-search" className="text-xs">Name</Label>
                            <div className="flex gap-2 items-center mt-1">
                              <Select value={nameOperator} onValueChange={v => setNameOperator(v as 'contains' | 'is' | 'startsWith' | 'endsWith')} disabled={false}>
                                <SelectTrigger className="w-24 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="contains">contains</SelectItem>
                                  <SelectItem value="is">is</SelectItem>
                                  <SelectItem value="startsWith">starts with</SelectItem>
                                  <SelectItem value="endsWith">ends with</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input 
                                id="name-search" 
                                placeholder="Filter by name..." 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleApplyStandardFilters();
                                  }
                                }}
                                className="flex-1 h-8 text-sm" 
                                disabled={false}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="email-search" className="text-xs">Email</Label>
                            <div className="flex gap-2 items-center mt-1">
                              <Select value={emailOperator} onValueChange={v => setEmailOperator(v as 'contains' | 'is' | 'startsWith' | 'endsWith')} disabled={isLoading || isAiSearching}>
                                <SelectTrigger className="w-24 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="contains">contains</SelectItem>
                                  <SelectItem value="is">is</SelectItem>
                                  <SelectItem value="startsWith">starts with</SelectItem>
                                  <SelectItem value="endsWith">ends with</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input 
                                id="email-search" 
                                placeholder="Filter by email..." 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !isLoading && !isAiSearching) {
                                    e.preventDefault();
                                    handleApplyStandardFilters();
                                  }
                                }}
                                className="flex-1 h-8 text-sm" 
                                disabled={isLoading || isAiSearching}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="phone-search" className="text-xs">Phone</Label>
                            <div className="flex gap-2 items-center mt-1">
                              <Select value={phoneOperator} onValueChange={v => setPhoneOperator(v as 'contains' | 'is' | 'startsWith' | 'endsWith')} disabled={isLoading || isAiSearching}>
                                <SelectTrigger className="w-24 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="contains">contains</SelectItem>
                                  <SelectItem value="is">is</SelectItem>
                                  <SelectItem value="startsWith">starts with</SelectItem>
                                  <SelectItem value="endsWith">ends with</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input 
                                id="phone-search" 
                                placeholder="Filter by phone..." 
                                value={phone} 
                                onChange={(e) => setPhone(e.target.value)} 
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !isLoading && !isAiSearching) {
                                    e.preventDefault();
                                    handleApplyStandardFilters();
                                  }
                                }}
                                className="flex-1 h-8 text-sm" 
                                disabled={isLoading || isAiSearching}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="skills-search" className="text-xs">Skills Keywords</Label>
                            <div
                              className="flex flex-wrap items-center gap-1 mt-1 min-h-[40px] border rounded-md px-2 py-1 bg-background focus-within:ring-2 focus-within:ring-ring"
                              style={{ cursor: isLoading || isAiSearching ? 'not-allowed' : 'text' }}
                              onClick={e => {
                                if (!isLoading && !isAiSearching) {
                                  (document.getElementById('skills-tag-input') as HTMLInputElement)?.focus();
                                }
                              }}
                            >
                              {Array.from(skills).map((skill) => (
                                <Badge key={skill} variant="secondary" className="flex items-center gap-1 px-2 py-0.5 text-xs">
                                  {skill}
                                  <span
                                    role="button"
                                    className="ml-1 text-muted-foreground hover:text-destructive focus:outline-none cursor-pointer"
                                    onClick={e => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (isLoading || isAiSearching) return;
                                      const newSkills = new Set(skills);
                                      newSkills.delete(skill);
                                      setSkills(newSkills);
                                      // Apply filters after removing skill
                                      setTimeout(() => handleApplyStandardFilters(), 100);
                                    }}
                                    onMouseDown={e => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    aria-label={`Remove ${skill}`}
                                    tabIndex={-1}
                                  >
                                    <X className="w-3 h-3" />
                                  </span>
                                </Badge>
                              ))}
                              <input
                                id="skills-tag-input"
                                type="text"
                                className="flex-1 min-w-[120px] border-0 outline-none bg-transparent text-sm py-1 px-2 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="e.g., React, Python, AWS..."
                                disabled={isLoading || isAiSearching}
                                onKeyDown={e => {
                                  if (isLoading || isAiSearching) return;
                                  
                                  // Always prevent default for Enter key to avoid form submission
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }
                                  
                                  const value = (e.target as HTMLInputElement).value.trim();
                                  if ((e.key === 'Enter' || e.key === ',' || e.key === 'Tab') && value) {
                                    if (!skills.has(value)) {
                                      const newSkills = new Set(skills);
                                      newSkills.add(value);
                                      setSkills(newSkills);
                                      // Apply filters after adding skill
                                      setTimeout(() => handleApplyStandardFilters(), 100);
                                    }
                                    (e.target as HTMLInputElement).value = '';
                                    // Apply filters after adding skill
                                    if (e.key === 'Enter') {
                                      handleApplyStandardFilters();
                                    }
                                  } else if (e.key === 'Enter' && !value) {
                                    // If Enter is pressed with empty input, apply filters
                                    handleApplyStandardFilters();
                                  } else if (e.key === 'Backspace' && !value && skills.size > 0) {
                                    // Remove last skill if input is empty and backspace is pressed
                                    const arr = Array.from(skills);
                                    const last = arr[arr.length - 1];
                                    const newSkills = new Set(skills);
                                    newSkills.delete(last);
                                    setSkills(newSkills);
                                    // Apply filters after removing skill
                                    setTimeout(() => handleApplyStandardFilters(), 100);
                                  }
                                }}
                                onChange={e => {
                                  // Handle input change without preventing default
                                  // The input value is managed by the onKeyDown handler
                                }}
                                onPaste={e => {
                                  if (isLoading || isAiSearching) return;
                                  const paste = e.clipboardData.getData('text');
                                  if (paste) {
                                    e.preventDefault();
                                    let hasChanges = false;
                                    paste.split(',').map(s => s.trim()).filter(Boolean).forEach(skill => {
                                      if (!skills.has(skill)) {
                                        const newSkills = new Set(skills);
                                        newSkills.add(skill);
                                        setSkills(newSkills);
                                        hasChanges = true;
                                      }
                                    });
                                    // Apply filters after pasting skills
                                    if (hasChanges) {
                                      setTimeout(() => handleApplyStandardFilters(), 100);
                                    }
                                  }
                                }}
                              />
                            </div>

                          </div>
                          <div>
                            <Label htmlFor="location-search" className="text-xs">Location</Label>
                            <div className="flex gap-2 items-center mt-1">
                              <Select value={locationOperator} onValueChange={v => setLocationOperator(v as 'contains' | 'is' | 'startsWith' | 'endsWith' | 'other')} disabled={isLoading || isAiSearching}>
                                <SelectTrigger className="w-24 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="contains">contains</SelectItem>
                                  <SelectItem value="is">is</SelectItem>
                                  <SelectItem value="startsWith">starts with</SelectItem>
                                  <SelectItem value="endsWith">ends with</SelectItem>
                                  <SelectItem value="other">other</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input 
                                id="location-search" 
                                placeholder="e.g., Bangkok, Thailand..." 
                                value={location} 
                                onChange={(e) => setLocation(e.target.value)} 
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !isLoading && !isAiSearching) {
                                    e.preventDefault();
                                    handleApplyStandardFilters();
                                  }
                                }}
                                className="flex-1 h-8 text-sm" 
                                disabled={isLoading || isAiSearching}
                              />
                            </div>

                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Application Status Section */}
                    <AccordionItem value="application-status">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <h4 className="text-sm font-medium">Application Status</h4>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <Label htmlFor="position-select" className="text-xs">Position(s)</Label>
                            <PositionMultiSelectDropdown
                              selectedIds={selectedPositionIds}
                              onSelectionChange={handlePositionChange}
                              placeholder="All positions..."
                              disabled={isLoading || isAiSearching || isApplyingFilters}
                              showOpenStatus={true}
                              filterOpenOnly={false}
                              showUnassignedOption={true}
                            />
                            {isApplyingFilters && (
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                                Applying filters...
                              </div>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="status-select" className="text-xs">Recruitment Pipeline</Label>
                            {isStagesLoading ? (
                              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                                <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs text-muted-foreground">Loading pipeline stages...</span>
                              </div>
                            ) : stagesError ? (
                              <div className="p-2 border rounded-md bg-destructive/10 border-destructive/20">
                                <span className="text-xs text-destructive">Error loading stages: {stagesError}</span>
                              </div>
                            ) : safeAvailableStages.length === 0 ? (
                              <div className="p-2 border rounded-md bg-muted/20">
                                <span className="text-xs text-muted-foreground">No pipeline stages available</span>
                              </div>
                            ) : (
                              <StatusMultiSelectDropdown
                                selectedIds={selectedStatuses}
                                onSelectionChange={handleStatusChange}
                                placeholder="Select pipeline stages..."
                                stages={safeAvailableStages}
                                candidateCounts={candidateCounts}
                                disabled={isLoading || isAiSearching || isApplyingFilters}
                              />
                            )}
                            {isApplyingFilters && (
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                                Applying filters...
                              </div>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="recruiter-select" className="text-xs">Assigned Recruiter(s)</Label>
                            {isRecruitersLoading ? (
                              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                                <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs text-muted-foreground">Loading recruiters...</span>
                              </div>
                            ) : recruitersError ? (
                              <div className="p-2 border rounded-md bg-destructive/10 border-destructive/20">
                                <span className="text-xs text-destructive">Error loading recruiters: {recruitersError}</span>
                              </div>
                            ) : safeAvailableRecruiters.length === 0 ? (
                              <div className="p-2 border rounded-md bg-muted/20">
                                <span className="text-xs text-muted-foreground">No recruiters available - can filter unassigned</span>
                              </div>
                            ) : (
                              <RecruiterMultiSelectDropdown
                                selectedIds={selectedRecruiterIds}
                                onSelectionChange={handleRecruiterChange}
                                placeholder={`All recruiters`}
                                recruiters={safeAvailableRecruiters}
                                disabled={isLoading || isAiSearching || isApplyingFilters}
                              />
                            )}
                            {isApplyingFilters && (
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                                Applying filters...
                              </div>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Experience Section */}
                    <AccordionItem value="experience">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <h4 className="text-sm font-medium">Experience</h4>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-xs font-medium pt-2">Experience Years</Label>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="flex-1">
                                  <Label className="text-xs text-muted-foreground">Min</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={experienceYearsRange[0] === -1 ? '' : experienceYearsRange[0]}
                                    onChange={(e) => {
                                      const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                                      if (!isNaN(value) && value >= 0 && value <= 50) {
                                        const currentMax = experienceYearsRange[1];
                                        const newMax = Math.max(value, currentMax);
                                        handleExperienceYearsChange([value, newMax]);
                                      }
                                    }}
                                    placeholder="Min"
                                    className="h-8 text-xs"
                                    disabled={isLoading || isAiSearching || experienceYearsRange[0] === -1}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">to</span>
                                <div className="flex-1">
                                  <Label className="text-xs text-muted-foreground">Max</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={experienceYearsRange[1]}
                                    onChange={(e) => {
                                      const value = e.target.value === '' ? 50 : parseInt(e.target.value);
                                      if (!isNaN(value) && value >= 0 && value <= 50) {
                                        const currentMin = experienceYearsRange[0] === -1 ? 0 : experienceYearsRange[0];
                                        const newMin = Math.min(currentMin, value);
                                        handleExperienceYearsChange([newMin, value]);
                                      }
                                    }}
                                    placeholder="Max"
                                    className="h-8 text-xs"
                                    disabled={isLoading || isAiSearching}
                                  />
                                </div>
                              </div>
                              <span className="text-xs w-20 text-muted-foreground">
                                {experienceYearsRange[0] === -1 ? 'No exp' : experienceYearsRange[0]}-{experienceYearsRange[1]} years
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              <input
                                type="checkbox"
                                id="no-experience-checkbox"
                                checked={experienceYearsRange[0] === -1}
                                onChange={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (e.target.checked) {
                                    setExperienceYearsRange([-1, 50]); // Use -1 as special marker for "no experience"
                                  } else {
                                    setExperienceYearsRange([0, 50]); // Reset to default
                                  }
                                  // Apply filters when checkbox changes
                                  setTimeout(() => handleApplyStandardFilters(), 100);
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                disabled={isLoading || isAiSearching}
                                className="rounded border-border text-primary focus:ring-primary"
                              />
                              <Label 
                                htmlFor="no-experience-checkbox" 
                                className="text-xs text-muted-foreground cursor-pointer"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                              >
                                Include candidates with no experience listed
                              </Label>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Fit Score Section */}
                    <AccordionItem value="fit-score">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-muted-foreground" />
                          <h4 className="text-sm font-medium">Fit Score Ranges</h4>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          {/* Applied Candidates Fit Score */}
                          <div>
                            <Label className="text-xs font-medium pt-2">Applied Candidates</Label>
                            <div className="space-y-2">
                              {getScoreRangesForChart().map((grade) => {
                                const count = candidateScoreCounts?.applied?.find(c => c.letter === grade.letter)?.count || 0;
                                return (
                                  <div key={grade.letter} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`fit-score-${grade.letter}`}
                                        checked={selectedFitScoreGrades.has(grade.letter)}
                                        onCheckedChange={(checked) => handleFitScoreGradeChange(grade.letter, checked as boolean)}
                                        disabled={isLoading || isAiSearching}
                                      />
                                      <Label 
                                        htmlFor={`fit-score-${grade.letter}`} 
                                        className="text-xs font-normal cursor-pointer"
                                      >
                                        {grade.label}
                                      </Label>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      {count}
                                    </Badge>
                                  </div>
                                );
                              })}
                              {/* No Fit Score Option for Applied Candidates */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="applied-no-fit-score"
                                    checked={selectedFitScoreGrades.has('no-score')}
                                    onCheckedChange={(checked) => handleFitScoreGradeChange('no-score', checked as boolean)}
                                    disabled={isLoading || isAiSearching}
                                  />
                                  <Label 
                                    htmlFor="applied-no-fit-score" 
                                    className="text-xs font-normal cursor-pointer"
                                  >
                                    No Fit Score
                                  </Label>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {candidateScoreCounts?.applied?.find(c => c.letter === 'no-score')?.count || 0}
                                </Badge>
                              </div>
                            </div>

                          </div>

                          {/* Matching Candidates Fit Score */}
                          <div>
                            <Label className="text-xs font-medium pt-2">Matching Candidates</Label>
                            <div className="space-y-2">
                              {getScoreRangesForChart().map((grade) => {
                                const count = candidateScoreCounts?.matching?.find(c => c.letter === grade.letter)?.count || 0;
                                return (
                                  <div key={`matching-${grade.letter}`} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`matching-fit-score-${grade.letter}`}
                                        checked={selectedMatchingFitScoreGrades.has(grade.letter)}
                                        onCheckedChange={(checked) => handleMatchingFitScoreGradeChange(grade.letter, checked as boolean)}
                                        disabled={isLoading || isAiSearching}
                                      />
                                      <Label 
                                        htmlFor={`matching-fit-score-${grade.letter}`} 
                                        className="text-xs font-normal cursor-pointer"
                                      >
                                        {grade.label}
                                      </Label>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      {count}
                                    </Badge>
                                  </div>
                                );
                              })}
                              {/* No Fit Score Option for Matching Candidates */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="matching-no-fit-score"
                                    checked={selectedMatchingFitScoreGrades.has('no-score')}
                                    onCheckedChange={(checked) => handleMatchingFitScoreGradeChange('no-score', checked as boolean)}
                                    disabled={isLoading || isAiSearching}
                                  />
                                  <Label 
                                    htmlFor="matching-no-fit-score" 
                                    className="text-xs font-normal cursor-pointer"
                                  >
                                    No Fit Score
                                  </Label>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {candidateScoreCounts?.matching?.find(c => c.letter === 'no-score')?.count || 0}
                                </Badge>
                              </div>
                            </div>
                           
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>


                    </Accordion>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={handleApplyStandardFilters}
                        disabled={false}
                        size="sm"
                        className="flex-1 transition-all duration-200 ease-in-out hover:scale-105"
                      >
                        <Filter className="mr-2 h-4 w-4" />
                        Apply Filters
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleResetFilters}
                        disabled={false}
                        size="sm"
                        className="flex-1 transition-all duration-200 ease-in-out hover:scale-105"
                      >
                        <FilterX className="mr-2 h-4 w-4" />
                        Clear All
                      </Button>
                    </div>
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
                              <li><b>skills</b>: Skills keywords. <code>skills:React,Python</code></li>
                              <li><b>location</b>: Location. <code>location:Bangkok,Thailand</code></li>
                              <li><b>locationOperator</b>: Location operator (contains, is, startsWith, endsWith, other). <code>locationOperator:contains</code></li>
                              <li><b>minexperienceyears</b>: Minimum experience years. <code>minExperienceYears:5</code></li>
                              <li><b>maxexperienceyears</b>: Maximum experience years. <code>maxExperienceYears:10</code></li>
                              <li><b>positionid</b>: Position IDs (comma separated). <code>positionId:pos1,pos2</code></li>
                              <li><b>status</b>: Statuses (comma separated). <code>status:Applied,Screening</code></li>
                              <li><b>recruiterid</b>: Recruiter IDs or <code>unassigned</code>. <code>recruiterId:unassigned</code></li>
                              <li><b>minfitscore</b>: Minimum fit score. <code>minFitScore:80</code></li>
                              <li><b>maxfitscore</b>: Maximum fit score. <code>maxFitScore:95</code></li>
                              <li><b>matchingfitscore</b>: Matching fit score range. <code>matchingFitScoreMin:70 matchingFitScoreMax:100</code></li>
                              <li><b>applicationdatestart</b>: Start date (YYYY-MM-DD). <code>applicationDateStart:2024-01-01</code></li>
                              <li><b>applicationdateend</b>: End date (YYYY-MM-DD). <code>applicationDateEnd:2024-01-31</code></li>
                              <li><b>location</b>: Location. <code>location:Bangkok,Thailand</code></li>
                              <li><b>locationoperator</b>: Location operator (contains, is, startsWith, endsWith, other). <code>locationOperator:contains</code></li>
                            </ul>
                            <div className="mt-4">
                              <b>Examples:</b>
                              <ul className="list-disc pl-5 mt-1">
                                <li><code>minFitScore:80 status:Applied,Screening</code> <span className="text-muted-foreground">// High fit score in active stages</span></li>
                                <li><code>applicationDateStart:2024-01-01 applicationDateEnd:2024-01-31</code> <span className="text-muted-foreground">// Applied in January 2024</span></li>
                                <li><code>recruiterId:unassigned</code> <span className="text-muted-foreground">// Not assigned to any recruiter</span></li>
                                <li><code>status:Off</code> <span className="text-muted-foreground">// Candidates with no status assigned</span></li>
                                <li><code>positionId:pos1,pos2 status:Screening</code> <span className="text-muted-foreground">// Candidates in specific positions and status</span></li>
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            // Allow Ctrl+Enter or Cmd+Enter for new line
                            return;
                          }
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (advancedQueryInput.trim()) {
                              handleApplyAdvancedQuery();
                            }
                          }
                        }}
                        className="flex-1 min-h-[80px]"
                        disabled={false}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      onClick={handleApplyAdvancedQuery}
                      disabled={!advancedQueryInput.trim()}
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