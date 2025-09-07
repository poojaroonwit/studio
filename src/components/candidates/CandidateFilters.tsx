"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

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
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Calendar
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { PositionMultiSelectDropdown } from './PositionMultiSelectDropdown';
import { RecruiterMultiSelectDropdown } from './RecruiterMultiSelectDropdown';
import { StatusMultiSelectDropdown } from './StatusMultiSelectDropdown';
import { SourceMultiSelectDropdown } from './SourceMultiSelectDropdown';
import type { Position, RecruitmentStage, UserProfile, CandidateSource } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogTrigger } from '@/components/ui/dialog';
import { AdvancedQuerySyntaxModal } from './AdvancedQuerySyntaxModal';
import { CustomFieldFilter } from '@/components/ui/CustomFieldFilter';
import { fetchFilterableCustomFields } from '@/lib/customFieldUtils';
import type { CustomFieldDefinition } from '@/lib/types';


export interface CandidateFilterValues {
  name?: string;
  nameOperator?: 'contains' | 'is' | 'startsWith' | 'endsWith';
  email?: string;
  emailOperator?: 'contains' | 'is' | 'startsWith' | 'endsWith';
  phone?: string;
  phoneOperator?: 'contains' | 'is' | 'startsWith' | 'endsWith';
  selectedPositionIds?: string[];
  selectedStatuses?: string[];
  selectedSourceIds?: string[];
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
  includeNoScoreInApplied?: boolean; // Include no-score candidates in applied job fit score filter
  includeNoScoreInMatching?: boolean; // Include no-score candidates in matching job fit score filter
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
  customFieldFilters?: { [fieldCode: string]: any }; // Custom field filters
}

interface CandidateFiltersProps {
  initialFilters?: CandidateFilterValues;
  onFilterChange: (filters: CandidateFilterValues) => void;
  onAiSearch: (query: string) => void;
  onCancelAiSearch?: () => void;
  onClearAllFilters: () => void;
  availablePositions: Position[];
  availableStages: RecruitmentStage[];
  availableRecruiter: Pick<UserProfile, 'id' | 'name'>[];
  availableSources: CandidateSource[];
  isLoading?: boolean;
  isAiSearching?: boolean;
  advancedQuery?: string;
  candidateScoreCounts?: {
    applied: Array<{ letter: string; count: number }>;
    matching: Array<{ letter: string; count: number }>;
  };
  candidateCounts?: { [stageName: string]: number };
}

export function CandidateFilters({
    initialFilters = {},
    onFilterChange,
    onAiSearch,
    onCancelAiSearch,
    onClearAllFilters,
    availablePositions,
    availableStages,
    availableRecruiter,
    availableSources,
    isLoading,
    isAiSearching,
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
  // Checkbox states for fit score grades - simple state management


  // Add refs for debouncing multiselect changes
  const multiselectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  
  // Remove loading states since they're managed by the parent component
  // const [isStagesLoading, setIsStagesLoading] = useState(false);
  // const [isRecruiterLoading, setIsRecruiterLoading] = useState(false);
  // const [stagesError, setStagesError] = useState<string | null>(null);
  // const [recruitersError, setRecruiterError] = useState<string | null>(null);
  
  const isInitialLoadRef = useRef(true);
  // Guard to avoid triggering auto-apply effects while syncing state from incoming props
  const isSyncingFromInitialFiltersRef = useRef(false);
  // Track last-applied URL/initial filters to avoid re-applying the same payload repeatedly
  const lastAppliedUrlFiltersRef = useRef<string | null>(null);
  // Track if component is fully initialized to prevent premature auto-apply
  const isComponentInitializedRef = useRef(false);
  // Track the last filters we applied to prevent infinite loops
  const lastAppliedFiltersRef = useRef<string>('');

  const [applicationDateRange, setApplicationDateRange] = useState<DateRange | undefined>(
    initialFilters.applicationDateStart && initialFilters.applicationDateEnd
      ? { from: initialFilters.applicationDateStart, to: initialFilters.applicationDateEnd }
      : undefined
  );

  const [selectedRecruiterIds, setSelectedRecruiterIds] = useState<Set<string>>(new Set(initialFilters.selectedRecruiterIds || []));
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set(initialFilters.selectedSourceIds || []));
  const [aiSearchQueryInput, setAiSearchQueryInput] = useState(initialFilters.aiSearchQuery || '');
  const [aiSearchType, setAiSearchType] = useState<'semantic' | 'exact' | 'hybrid'>(initialFilters.aiSearchType || 'hybrid');
  const [aiSearchFilters, setAiSearchFilters] = useState(initialFilters.aiSearchFilters || {});

  // Advanced Query State
  const [advancedQueryInput, setAdvancedQueryInput] = useState('');
  const [activeTab, setActiveTab] = useState<'filters' | 'advanced'>('filters');
  const [isAdvancedQuerySyntaxModalOpen, setIsAdvancedQuerySyntaxModalOpen] = useState(false);

  // Custom Field Filters State
  const [customFieldFilters, setCustomFieldFilters] = useState<{ [fieldCode: string]: any }>(
    initialFilters.customFieldFilters || {}
  );
  const [filterableCustomFields, setFilterableCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [isLoadingCustomFields, setIsLoadingCustomFields] = useState(false);

  // Load filterable custom fields on component mount
  useEffect(() => {
    const loadCustomFields = async () => {
      setIsLoadingCustomFields(true);
      try {
        const fields = await fetchFilterableCustomFields('Candidate');
        setFilterableCustomFields(fields);
      } catch (error) {
        console.error('Error loading custom fields:', error);
      } finally {
        setIsLoadingCustomFields(false);
      }
    };

    loadCustomFields();
  }, []);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [showQueryHistory, setShowQueryHistory] = useState(false);
  const [queryValidationError, setQueryValidationError] = useState<string | null>(null);
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



  



  // // AI Search examples
  // const aiSearchExamples = [
  //   "React developers with 5+ years experience",
  //   "Python developers who worked at Google or Microsoft",
  //   "Marketing managers with MBA from top universities",
  //   "Senior engineers with machine learning experience",
  //   "Sales professionals with SaaS background",
  //   "Designers with portfolio in fintech",
  //   "Product managers with agile experience",
  //   "Data scientists with PhD in statistics",
  // ];

  const currentYear = new Date().getFullYear();
  const fromYear = currentYear - 10;
  const toYear = currentYear + 1;

  // Add operator state for name, email, phone
  const [nameOperator, setNameOperator] = useState<'contains' | 'is' | 'startsWith' | 'endsWith'>('contains');
  const [emailOperator, setEmailOperator] = useState<'contains' | 'is' | 'startsWith' | 'endsWith'>('contains');
  const [phoneOperator, setPhoneOperator] = useState<'contains' | 'is' | 'startsWith' | 'endsWith'>('contains');

  // Add locationOperator state
  const [locationOperator, setLocationOperator] = useState<'contains' | 'is' | 'startsWith' | 'endsWith' | 'other'>(initialFilters.locationOperator || 'contains');

  // Use a ref to store onFilterChange to avoid dependency issues
  const onFilterChangeRef = useRef(onFilterChange);
  
  // Update ref when onFilterChange changes
  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  // Define handleApplyStandardFilters early to avoid temporal dead zone issues
  const handleApplyStandardFilters = useCallback(() => {
    console.log('🔍 Apply Filter button clicked');
    
    // Skip if we're already applying filters
    if (isApplyingFilters) {
      console.log('🔍 Skipping - already applying filters');
      return;
    }
    
    // Rate limiting: prevent applying filters more than once every 300ms to prevent infinite loops
    const now = Date.now();
    if (now - lastFilterApplyTimeRef.current < 300) {
      console.log('🔍 Skipping - rate limited (last apply was', now - lastFilterApplyTimeRef.current, 'ms ago)');
      return;
    }
    
    // Set flag to prevent recursive calls
    setIsApplyingFilters(true);
    
    // Clear any pending multiselect timeout
    if (multiselectTimeoutRef.current) {
      clearTimeout(multiselectTimeoutRef.current);
      multiselectTimeoutRef.current = null;
    }

    const newFilters: CandidateFilterValues = {
      name: name !== undefined ? name : undefined,
      nameOperator: name ? nameOperator : undefined,
      email: email !== undefined ? email : undefined,
      emailOperator: email ? emailOperator : undefined,
      phone: phone !== undefined ? phone : undefined,
      phoneOperator: phone ? phoneOperator : undefined,
      selectedPositionIds: selectedPositionIds.size > 0 ? Array.from(selectedPositionIds) : undefined,
      selectedStatuses: selectedStatuses.size > 0 ? Array.from(selectedStatuses) : undefined,
      selectedSourceIds: selectedSourceIds.size > 0 ? Array.from(selectedSourceIds) : undefined,
      skills: skills.size > 0 ? Array.from(skills).join(',') : undefined,
      location: location !== undefined ? location : undefined,
      locationOperator: location ? locationOperator : undefined,
      minExperienceYears: experienceYearsRange[0] > 0 ? experienceYearsRange[0] : undefined,
      maxExperienceYears: experienceYearsRange[1] < 50 ? experienceYearsRange[1] : undefined,
      applicationDateStart: applicationDateRange?.from,
      applicationDateEnd: applicationDateRange?.to,
      selectedRecruiterIds: selectedRecruiterIds.size > 0 ? Array.from(selectedRecruiterIds) : undefined,
      customFieldFilters: (() => {
        const filteredCustomFields: { [fieldCode: string]: any } = {};
        for (const [fieldCode, value] of Object.entries(customFieldFilters)) {
          if (value !== undefined && value !== null && (value === false || value !== '')) {
            filteredCustomFields[fieldCode] = value;
          }
        }
        return Object.keys(filteredCustomFields).length > 0 ? filteredCustomFields : undefined;
      })(),
      aiSearchQuery: undefined,
    };

    // Remove undefined values to keep the filter object clean, but preserve empty strings
    Object.keys(newFilters).forEach(key => {
      if (newFilters[key as keyof CandidateFilterValues] === undefined) {
        delete newFilters[key as keyof CandidateFilterValues];
      }
    });

    const newFiltersString = JSON.stringify(newFilters);
    if (lastAppliedFiltersRef.current === newFiltersString) {
      setIsApplyingFilters(false);
      return;
    }

    // Check if we have any meaningful filters or explicitly empty strings (to clear filters)
    const hasMeaningfulFilters = Object.values(newFilters).some(value => 
      value !== undefined && 
      value !== null && 
      value !== '' &&
      (Array.isArray(value) ? value.length > 0 : true)
    );

    // Check if we have any explicitly empty strings that should clear previous filters
    const hasEmptyStrings = (name === '' || email === '' || phone === '' || location === '');

    // Always apply filters if we have any values or empty strings
    if (Object.keys(newFilters).length > 0 || hasEmptyStrings) {
      lastAppliedFiltersRef.current = newFiltersString;
      lastFilterApplyTimeRef.current = Date.now();
      console.log('🔍 FILTER DEBUG: Applying filters:', newFilters);
      if (typeof onFilterChangeRef.current === 'function') {
        console.log('🔍 Calling onFilterChange with:', newFilters);
        onFilterChangeRef.current(newFilters);
      } else {
        console.log('🔍 onFilterChangeRef.current is not a function:', typeof onFilterChangeRef.current);
      }
    } else {
      console.log('🔍 FILTER DEBUG: Clearing filters');
      if (typeof onFilterChangeRef.current === 'function') {
        console.log('🔍 Calling onFilterChange with empty object');
        onFilterChangeRef.current({});
      } else {
        console.log('🔍 onFilterChangeRef.current is not a function:', typeof onFilterChangeRef.current);
      }
    }
    
    // Reset flag after a delay - store timeout ID for cleanup
    const timeoutId = setTimeout(() => {
      setIsApplyingFilters(false);
    }, 50); // Reduced to 50ms for better responsiveness
    
    // Store timeout ID for cleanup
    if (applyingFiltersTimeoutRef.current) {
      clearTimeout(applyingFiltersTimeoutRef.current);
    }
    applyingFiltersTimeoutRef.current = timeoutId;
  }, [name, nameOperator, email, emailOperator, phone, phoneOperator, selectedPositionIds, selectedStatuses, selectedSourceIds, skills, location, locationOperator, experienceYearsRange, applicationDateRange, selectedRecruiterIds, isApplyingFilters]); // Added isApplyingFilters to dependencies

  // Single consolidated auto-apply effect for all filter changes
  useEffect(() => {
    // Skip if we're not ready to apply filters
    if (isInitialLoadRef.current || isSyncingFromInitialFiltersRef.current || !isComponentInitializedRef.current) {
      return;
    }
    
    // Skip if we're currently handling position changes directly
    if (isHandlingPositionChangeRef.current) {
      return;
    }
    
    // Skip if we're currently applying filters
    if (isApplyingFilters) {
      return;
    }
    
    // Skip if there's an advanced query active
    if (advancedQueryInput.trim()) {
      return;
    }
    
    // Clear any existing timeout
    if (autoApplyTimeoutRef.current) {
      clearTimeout(autoApplyTimeoutRef.current);
    }
    
    // Debounce filter application to prevent rapid successive calls
    autoApplyTimeoutRef.current = setTimeout(() => {
      handleApplyStandardFilters();
    }, 100); // Reduced debounce time for better user experience
    
    // Cleanup timeout on unmount or dependency change
    return () => {
      if (autoApplyTimeoutRef.current) {
        clearTimeout(autoApplyTimeoutRef.current);
        autoApplyTimeoutRef.current = null;
      }
    };
  }, [
    name, nameOperator,
    email, emailOperator,
    phone, phoneOperator,
    location, locationOperator,
    selectedPositionIds,
    selectedStatuses,
    selectedRecruiterIds,
    selectedSourceIds,
    skills,
    experienceYearsRange,
    applicationDateRange,
    customFieldFilters,
    advancedQueryInput
  ]);

  // Component initialization
  useEffect(() => {
    // Mark component as initialized immediately
    isComponentInitializedRef.current = true;
    isInitialLoadRef.current = false;
    
    // Apply filters immediately to ensure proper state
    handleApplyStandardFilters();

    return () => {
      if (multiselectTimeoutRef.current) {
        clearTimeout(multiselectTimeoutRef.current);
      }
      if (autoApplyTimeoutRef.current) {
        clearTimeout(autoApplyTimeoutRef.current);
      }
      if (skillsTimeoutRef.current) {
        clearTimeout(skillsTimeoutRef.current);
      }
      if (pasteTimeoutRef.current) {
        clearTimeout(pasteTimeoutRef.current);
      }
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      if (syncingTimeoutRef.current) {
        clearTimeout(syncingTimeoutRef.current);
      }
      if (applyingFiltersTimeoutRef.current) {
        clearTimeout(applyingFiltersTimeoutRef.current);
      }
      if (positionChangeTimeoutRef.current) {
        clearTimeout(positionChangeTimeoutRef.current);
      }
      if (urlFiltersTimeoutRef.current) {
        clearTimeout(urlFiltersTimeoutRef.current);
      }
    };
  }, []); // Only run once on mount

  // Cleanup all timeouts on component unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts to prevent memory leaks
      if (multiselectTimeoutRef.current) {
        clearTimeout(multiselectTimeoutRef.current);
        multiselectTimeoutRef.current = null;
      }
      if (autoApplyTimeoutRef.current) {
        clearTimeout(autoApplyTimeoutRef.current);
        autoApplyTimeoutRef.current = null;
      }
      if (skillsTimeoutRef.current) {
        clearTimeout(skillsTimeoutRef.current);
        skillsTimeoutRef.current = null;
      }
      if (pasteTimeoutRef.current) {
        clearTimeout(pasteTimeoutRef.current);
        pasteTimeoutRef.current = null;
      }
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
      if (syncingTimeoutRef.current) {
        clearTimeout(syncingTimeoutRef.current);
        syncingTimeoutRef.current = null;
      }
      if (applyingFiltersTimeoutRef.current) {
        clearTimeout(applyingFiltersTimeoutRef.current);
        applyingFiltersTimeoutRef.current = null;
      }
      if (positionChangeTimeoutRef.current) {
        clearTimeout(positionChangeTimeoutRef.current);
        positionChangeTimeoutRef.current = null;
      }
      if (urlFiltersTimeoutRef.current) {
        clearTimeout(urlFiltersTimeoutRef.current);
        urlFiltersTimeoutRef.current = null;
      }
    };
  }, []);

  // Define a list of common skills
  const skillOptions = [
    'React', 'Python', 'AWS', 'Java', 'SQL', 'JavaScript', 'TypeScript', 'Node.js', 'Docker', 'Kubernetes', 'C#', 'C++', 'Go', 'Ruby', 'PHP', 'HTML', 'CSS', 'Angular', 'Vue', 'Swift', 'Objective-C', 'Scala', 'Perl', 'R', 'MATLAB', 'Azure', 'GCP', 'Linux', 'Windows', 'iOS', 'Android', 'Flutter', 'Spring', 'Django', 'Flask', 'Express', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'GraphQL', 'REST', 'SOAP', 'Jenkins', 'CI/CD', 'Terraform', 'Ansible', 'Puppet', 'Figma', 'Sketch', 'Zeplin', 'Jira', 'Confluence', 'Salesforce', 'SAP', 'PowerBI', 'Tableau', 'Excel', 'Other'
  ];

  // Validate advanced query syntax
  const validateAdvancedQuery = (query: string): { isValid: boolean; error?: string; suggestions?: string[] } => {
    if (!query.trim()) {
      return { isValid: true };
    }

    const parts = query.split(' ').filter(part => part.includes(':'));
    const validFields = [
      'name', 'email', 'phone', 'skills', 'location', 'status', 'position', 'positionid', 
      'recruiter', 'recruiterid', 'selectedsourceids', 'education', 'minfitscore', 'maxfitscore', 
      'minappliedjobfitscore', 'maxappliedjobfitscore', 'minmatchingjobfitscore', 'maxmatchingjobfitscore', 
      'minexperienceyears', 'maxexperienceyears', 'applicationdatestart', 'applicationdateend', 'locationoperator'
    ];

    for (const part of parts) {
      const colonIndex = part.indexOf(':');
      if (colonIndex === -1) {
        return { 
          isValid: false, 
          error: `Invalid syntax: "${part}". Use format "field:value"`,
          suggestions: ['Use format field:value (e.g., name:John)']
        };
      }

      const key = part.substring(0, colonIndex);
      const value = part.substring(colonIndex + 1);
      
      if (!key || !value) {
        return { 
          isValid: false, 
          error: `Empty field or value in "${part}"`,
          suggestions: ['Ensure both field and value are provided (e.g., name:John)']
        };
      }

      if (!validFields.includes(key.toLowerCase())) {
        const suggestions = validFields.filter(field => 
          field.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(field.toLowerCase())
        );
        return { 
          isValid: false, 
          error: `Unknown field: "${key}"`,
          suggestions: suggestions.length > 0 ? [`Did you mean: ${suggestions.join(', ')}?`] : [`Valid fields: ${validFields.slice(0, 5).join(', ')}...`]
        };
      }

      // Validate numeric fields
      if (['minfitscore', 'maxfitscore', 'minappliedjobfitscore', 'maxappliedjobfitscore', 'minmatchingjobfitscore', 'maxmatchingjobfitscore', 'minexperienceyears', 'maxexperienceyears'].includes(key.toLowerCase())) {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 0) {
          return { 
            isValid: false, 
            error: `Invalid number for "${key}": "${value}"`,
            suggestions: ['Use a positive number (e.g., 80 for 80%)']
          };
        }
      }

      // Validate date fields
      if (['applicationdatestart', 'applicationdateend'].includes(key.toLowerCase())) {
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          return { 
            isValid: false, 
            error: `Invalid date for "${key}": "${value}"`,
            suggestions: ['Use format YYYY-MM-DD (e.g., 2024-01-15)']
          };
        }
      }
    }

    return { isValid: true };
  };

  // Parse advanced query string into filter values
  const parseAdvancedQuery = (query: string): Partial<CandidateFilterValues> => {

    const filters: Partial<CandidateFilterValues> = {};
    
    // First, decode the entire query to handle URL encoding
    const decodedQuery = decodeURIComponent(query);

    
    const parts = decodedQuery.split(' ').filter(part => part.includes(':'));

    
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

          // Handle status values that might contain spaces by splitting on commas
          // and then handling each status individually
          const statusValues = value.split(',').map(s => s.trim());

          filters.selectedStatuses = statusValues;

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
            const startDate = parseISO(decodedValue);
            if (!isNaN(startDate.getTime())) {
              filters.applicationDateStart = startDate;
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
            const endDate = parseISO(decodedValue);
            if (!isNaN(endDate.getTime())) {
              filters.applicationDateEnd = endDate;
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
    
    // Mark that we're processing an advanced query to prevent tab switching
    const trimmedQuery = advancedQueryInput.trim();
    processedAdvancedQueryRef.current = trimmedQuery;
    
    // Add to query history (avoid duplicates)
    setQueryHistory(prev => {
      const filtered = prev.filter(q => q !== trimmedQuery);
      return [trimmedQuery, ...filtered].slice(0, 10); // Keep last 10 queries
    });
    
    const parsedFilters = parseAdvancedQuery(advancedQueryInput);
    
    // Update local state to reflect the parsed filters
    if (parsedFilters.name) setName(parsedFilters.name);
    if (parsedFilters.email) setEmail(parsedFilters.email);
    if (parsedFilters.phone) setPhone(parsedFilters.phone);
    if (parsedFilters.selectedPositionIds) setSelectedPositionIds(new Set(parsedFilters.selectedPositionIds));
    if (parsedFilters.selectedStatuses) setSelectedStatuses(new Set(parsedFilters.selectedStatuses));
    if (parsedFilters.selectedRecruiterIds) setSelectedRecruiterIds(new Set(parsedFilters.selectedRecruiterIds));

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

    if (applicationDateRange?.from) parts.push(`applicationDateStart:${applicationDateRange.from.toISOString().slice(0, 10)}`);
    if (applicationDateRange?.to) parts.push(`applicationDateEnd:${applicationDateRange.to.toISOString().slice(0, 10)}`);
    
    setAdvancedQueryInput(parts.join(' '));
  };

  // Handle advanced query from URL
  const processedAdvancedQueryRef = useRef<string>('');
  
  useEffect(() => {
    if (advancedQuery && advancedQuery.trim()) {
      try {
        processedAdvancedQueryRef.current = advancedQuery;
        setAdvancedQueryInput(advancedQuery);
        // Switch to advanced tab when query comes from URL
        setActiveTab('advanced');
        
        // Automatically apply the query if it's from URL
        const parsedFilters = parseAdvancedQuery(advancedQuery);

        if (Object.keys(parsedFilters).length > 0) {
          // Apply the filters first to avoid state update conflicts
          if (typeof onFilterChangeRef.current === 'function') {
            onFilterChangeRef.current({
              ...parsedFilters,
              applicationDateStart: parsedFilters.applicationDateStart,
              applicationDateEnd: parsedFilters.applicationDateEnd,
              location: parsedFilters.location,
              locationOperator: parsedFilters.locationOperator,
              aiSearchQuery: undefined,
            });
          }
          
          // Update local state to reflect the parsed filters
          if (parsedFilters.name) setName(parsedFilters.name);
          if (parsedFilters.email) setEmail(parsedFilters.email);
          if (parsedFilters.phone) setPhone(parsedFilters.phone);
          if (parsedFilters.selectedPositionIds) setSelectedPositionIds(new Set(parsedFilters.selectedPositionIds));
          if (parsedFilters.selectedStatuses) setSelectedStatuses(new Set(parsedFilters.selectedStatuses));
          if (parsedFilters.selectedRecruiterIds) setSelectedRecruiterIds(new Set(parsedFilters.selectedRecruiterIds));
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
  }, [advancedQuery]);

     // Clear all filters function (unused - handleResetFilters is used instead)
   // const handleClearAll = () => { ... };

  // Only reset state on initial load
  useEffect(() => {
    if (isInitialLoadRef.current) {
      setName(initialFilters.name || '');
      setEmail(initialFilters.email || '');
      setPhone(initialFilters.phone || '');
             setSelectedPositionIds(new Set(initialFilters.selectedPositionIds || []));
       setSelectedStatuses(new Set(initialFilters.selectedStatuses || []));
       setSelectedSourceIds(new Set(initialFilters.selectedSourceIds || []));
       setSkills(new Set(initialFilters.skills ? initialFilters.skills.split(',').filter(Boolean) : []));
       setLocation(initialFilters.location || '');
       setLocationOperator(initialFilters.locationOperator || 'contains');
       setExperienceYearsRange([initialFilters.minExperienceYears ?? 0, initialFilters.maxExperienceYears || 50]);
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
      // Mark component as initialized after a brief delay
      // Clear any existing timeout
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      initializationTimeoutRef.current = setTimeout(() => {
        isComponentInitializedRef.current = true;
      }, 50);
    }
  }, []); // Remove initialFilters dependency to prevent infinite loops

  // Handle initialFilters changes after initial load (e.g., when clear all is clicked)
  useEffect(() => {
    if (!isInitialLoadRef.current && isComponentInitializedRef.current) {
      // Mark that we're syncing local state from incoming props to avoid feedback loops
      isSyncingFromInitialFiltersRef.current = true;
      
      // Update component state to match the new initialFilters
      setName(initialFilters.name || '');
      setEmail(initialFilters.email || '');
      setPhone(initialFilters.phone || '');
      setSelectedPositionIds(new Set(initialFilters.selectedPositionIds || []));
      setSelectedStatuses(new Set(initialFilters.selectedStatuses || []));
      setSelectedSourceIds(new Set(initialFilters.selectedSourceIds || []));
      setSkills(new Set(initialFilters.skills ? initialFilters.skills.split(',').filter(Boolean) : []));
      setLocation(initialFilters.location || '');
      setLocationOperator(initialFilters.locationOperator || 'contains');
      setExperienceYearsRange([initialFilters.minExperienceYears ?? 0, initialFilters.maxExperienceYears || 50]);
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
      // Don't clear advanced query input if we have an advanced query from URL
      // Only clear if we're not currently processing an advanced query
      // Also preserve the advanced tab if the user is currently on it and has input
      if (!advancedQuery && !processedAdvancedQueryRef.current) {
        setAdvancedQueryInput('');
        // Only switch to filters tab if user is not currently on advanced tab or has no advanced input
        if (activeTab !== 'advanced' || !advancedQueryInput.trim()) {
          setActiveTab('filters');
        }
      }
      
      // Defer unsetting the syncing flag to the next tick to let dependent effects settle
      // Clear any existing timeout
      if (syncingTimeoutRef.current) {
        clearTimeout(syncingTimeoutRef.current);
      }
      syncingTimeoutRef.current = setTimeout(() => {
        isSyncingFromInitialFiltersRef.current = false;
      }, 0);
    }
  }, [initialFilters]);

  // Auto-apply filters when they are set from URL parameters
  useEffect(() => {
    // Only apply URL filters during initial load to avoid feedback loops with parent component
    if (!isInitialLoadRef.current) {
      return;
    }
    
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
      // Clear any existing timeout to prevent resource leaks
      if (urlFiltersTimeoutRef.current) {
        clearTimeout(urlFiltersTimeoutRef.current);
        urlFiltersTimeoutRef.current = null;
      }
      urlFiltersTimeoutRef.current = setTimeout(() => {
        // Only apply if this unique payload hasn't just been applied
        const payloadKey = JSON.stringify(initialFilters);
        if (lastAppliedUrlFiltersRef.current !== payloadKey) {
          lastAppliedUrlFiltersRef.current = payloadKey;
          onFilterChange(initialFilters);
        }
        urlFiltersTimeoutRef.current = null; // Clear the ref after execution
      }, 100);

      return () => {
        if (urlFiltersTimeoutRef.current) {
          clearTimeout(urlFiltersTimeoutRef.current);
          urlFiltersTimeoutRef.current = null;
        }
      };
    }
  }, []); // Remove initialFilters dependency to prevent infinite loops

  // Add a ref for auto-apply debouncing
  const autoApplyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add refs for timeout cleanup to prevent resource leaks
  const skillsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pasteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const applyingFiltersTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const positionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const urlFiltersTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add a ref to track if we're currently applying filters
  // const isApplyingFiltersRef = useRef(false); // Removed - using state variable instead

  // Add a ref to track the last time we applied filters to prevent rapid successive calls
  const lastFilterApplyTimeRef = useRef<number>(0);

  const handleAiSearchClick = () => {
    if (aiSearchQueryInput.trim()) {
      const filters = {
        positionIds: aiSearchFilters.positionIds,
        statuses: aiSearchFilters.statuses,
        minAppliedJobFitScore: aiSearchFilters.minAppliedJobFitScore,
        maxAppliedJobFitScore: aiSearchFilters.maxAppliedJobFitScore,
        dateRange: aiSearchFilters.dateRange,
      };
      onAiSearch(aiSearchQueryInput.trim());
    }
  };

  const handleAiSearchExample = (example: string) => {
    setAiSearchQueryInput(example);
  };

  // Track whether we're currently handling position changes to prevent auto-apply interference
  const isHandlingPositionChangeRef = useRef(false);
  // Add rate limiting for position changes to prevent resource leaks
  const lastPositionChangeTimeRef = useRef<number>(0);

  // Wrapper functions to apply filters when dropdown values change
  const handlePositionChange = (newSelectedIds: Set<string>) => {
    // Rate limiting: prevent position changes more than once every 200ms to prevent infinite loops
    const now = Date.now();
    if (now - lastPositionChangeTimeRef.current < 200) {
      return;
    }
    lastPositionChangeTimeRef.current = now;
    
    // Set flag to prevent auto-apply useEffect from triggering
    isHandlingPositionChangeRef.current = true;
    
    // Update state
    setSelectedPositionIds(newSelectedIds);
    
    // Apply filters immediately with the new position IDs
    const newFilters: CandidateFilterValues = {
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined,
      selectedPositionIds: newSelectedIds.size > 0 ? Array.from(newSelectedIds) : undefined,
      selectedStatuses: selectedStatuses.size > 0 ? Array.from(selectedStatuses) : undefined,
      selectedSourceIds: selectedSourceIds.size > 0 ? Array.from(selectedSourceIds) : undefined,
      skills: skills.size > 0 ? Array.from(skills).join(',') : undefined,
      location: location || undefined,
      minExperienceYears: experienceYearsRange[0] > 0 ? experienceYearsRange[0] : undefined,
      maxExperienceYears: experienceYearsRange[1] < 50 ? experienceYearsRange[1] : undefined,
      applicationDateStart: applicationDateRange?.from,
      applicationDateEnd: applicationDateRange?.to,
      selectedRecruiterIds: selectedRecruiterIds.size > 0 ? Array.from(selectedRecruiterIds) : undefined,
      aiSearchQuery: undefined,
    };

    // Convert to string to compare and prevent duplicate calls
    const newFiltersString = JSON.stringify(newFilters);
    if (lastAppliedFiltersRef.current === newFiltersString) {
      isHandlingPositionChangeRef.current = false;
      return;
    }

    lastAppliedFiltersRef.current = newFiltersString;
    onFilterChange(newFilters);
    
    // Reset flag after a brief delay to allow state to settle
    // Clear any existing timeout to prevent resource leaks
    if (positionChangeTimeoutRef.current) {
      clearTimeout(positionChangeTimeoutRef.current);
      positionChangeTimeoutRef.current = null;
    }
    positionChangeTimeoutRef.current = setTimeout(() => {
      isHandlingPositionChangeRef.current = false;
      positionChangeTimeoutRef.current = null; // Clear the ref after execution
    }, 150); // Increased delay to prevent conflicts
  };

  const handleStatusChange = (newSelectedStatuses: Set<string>) => {
    setSelectedStatuses(newSelectedStatuses);
    // Apply filters with debouncing for smooth multiselect experience
    // Clear any existing timeout to prevent resource leaks
    if (multiselectTimeoutRef.current) {
      clearTimeout(multiselectTimeoutRef.current);
      multiselectTimeoutRef.current = null;
    }
    multiselectTimeoutRef.current = setTimeout(() => handleApplyStandardFilters(), 200); // Increased debounce time
  };

  const handleRecruiterChange = (newSelectedRecruiterIds: Set<string>) => {
    setSelectedRecruiterIds(newSelectedRecruiterIds);
    // Apply filters with debouncing for smooth multiselect experience
    // Clear any existing timeout to prevent resource leaks
    if (multiselectTimeoutRef.current) {
      clearTimeout(multiselectTimeoutRef.current);
      multiselectTimeoutRef.current = null;
    }
    multiselectTimeoutRef.current = setTimeout(() => handleApplyStandardFilters(), 200); // Increased debounce time
  };

  const handleSourceChange = (newSelectedSourceIds: Set<string>) => {
    setSelectedSourceIds(newSelectedSourceIds);
    // Apply filters with debouncing for smooth multiselect experience
    // Clear any existing timeout to prevent resource leaks
    if (multiselectTimeoutRef.current) {
      clearTimeout(multiselectTimeoutRef.current);
      multiselectTimeoutRef.current = null;
    }
    multiselectTimeoutRef.current = setTimeout(() => handleApplyStandardFilters(), 200); // Increased debounce time
  };

  const handleExperienceYearsChange = (newRange: [number, number]) => {
    setExperienceYearsRange(newRange);
    // Apply filters with debouncing for smooth experience years change
    // Clear any existing timeout to prevent resource leaks
    if (multiselectTimeoutRef.current) {
      clearTimeout(multiselectTimeoutRef.current);
      multiselectTimeoutRef.current = null;
    }
    multiselectTimeoutRef.current = setTimeout(() => handleApplyStandardFilters(), 200); // Increased debounce time
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
    setApplicationDateRange(undefined);
    setSelectedRecruiterIds(new Set());
    setSelectedSourceIds(new Set());
    setAiSearchQueryInput('');
    setAiSearchType('hybrid');
    setAiSearchFilters({});
    setCustomFieldFilters({}); // Clear custom field filters
    onFilterChange({
      name: '',
      email: '',
      phone: '',
      education: '',
      skills: '',
      location: '',
      cvLanguage: '',
      jobSuitableCareer: '',
      jobSuitableLevel: '',
      jobSuitablePosition: '',
      minExperienceYears: undefined,
      maxExperienceYears: undefined,
      selectedPositionIds: undefined,
      selectedStatuses: undefined,
      selectedRecruiterIds: undefined,
      selectedSourceIds: undefined,
      minAppliedJobFitScore: undefined,
      maxAppliedJobFitScore: undefined,
      minMatchingJobFitScore: undefined,
      maxMatchingJobFitScore: undefined,
      includeNoScoreInApplied: false,
      includeNoScoreInMatching: false,
      applicationDateStart: undefined,
      applicationDateEnd: undefined,
      nameOperator: 'contains',
      emailOperator: 'contains',
      phoneOperator: 'contains',
      locationOperator: 'contains',
      aiSearchQuery: undefined,
      aiSearchType: 'hybrid',
      aiSearchFilters: {},
      customFieldFilters: undefined,
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
  const safeAvailableRecruiter = Array.isArray(availableRecruiter) ? availableRecruiter : [];
  


  // Remove the problematic retry mechanisms that cause infinite loading loops
  // The data should be loaded by the parent component, not retried here

    return (
    <div className="space-y-0 candidate-filters bg-muted/50">
             {/* Filters Section */}
       <div className="bg-card overflow-hidden border-t border-border/50">
        <div>
           {/* Standard Tab Design */}
          <div className="flex w-full border-b border-border/50 ">
            <div
              onClick={() => setActiveTab('filters')}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 relative cursor-pointer flex-1",
                activeTab === 'filters'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <ListFilter className="h-4 w-4" />
              Filters
            </div>
            <div
              onClick={() => setActiveTab('advanced')}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 relative cursor-pointer flex-1",
                activeTab === 'advanced'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Code className="h-4 w-4" />
              Advanced
            </div>
          </div>
          
          {/* Filters Tab */}
          {activeTab === 'filters' && (
            <div>
              {/* AI Power Search Section */}
              <Accordion type="multiple" defaultValue={["ai-power-search"]} className="w-full">
                <AccordionItem value="ai-power-search" className="border-b border-border/50">
                  <AccordionTrigger className="px-6 py-3 hover:no-underline rounded-none pl-6 pr-6 pr-6">
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-2">
                        {isAiSearching ? (
                          <div className="relative">
                            <Brain className="w-4 h-4 text-blue-600 animate-pulse" />
                            <div className="absolute inset-0 w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          <Brain className="w-4 h-4 text-muted-foreground" />
                        )}
                        <h4 className="text-sm font-semibold">AI Power Search</h4>
                        <Lightbulb className={cn("w-4 h-4", isAiSearching ? "text-blue-500 animate-pulse" : "text-muted-foreground")} />
                      </div>
                                             <Button
                         variant="ghost"
                         size="sm"
                         onClick={(e) => {
                           e.stopPropagation();
                           handleResetFilters();
                         }}
                         disabled={isLoading || isAiSearching}
                         className="h-6 w-6 p-0 hover:bg-muted/50"
                       >
                         <FilterX className="h-3 w-3" />
                       </Button>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="flex flex-col gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="ai-search" className="text-xs font-medium">Search Query</Label>
                        <div className="relative">
                          <Textarea
                            id="ai-search"
                            placeholder="e.g., 'React developers with 5+ years experience at tech companies'"
                            value={aiSearchQueryInput}
                            onChange={(e) => setAiSearchQueryInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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
                      </div>
                      <div className="space-y-3">
                        <Button
                          onClick={isAiSearching ? onCancelAiSearch : handleAiSearchClick}
                          disabled={!isAiSearching && (!aiSearchQueryInput.trim() || isLoading)}
                          className={cn("w-full transition-all duration-300", isAiSearching && "bg-red-600 hover:bg-red-700 shadow-lg")}
                          size="sm"
                        >
                          {isAiSearching ? (
                            <>
                              <X className="mr-2 h-4 w-4" />
                              Cancel Search
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

                      {/* AI Search Results Display removed - now shown under fit score filter tabs */}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Candidate Information Section */}
               <Accordion type="multiple" defaultValue={["candidate-info"]} className="w-full">
                 <AccordionItem value="candidate-info" className="border-b border-border/50">
                   <AccordionTrigger className="px-6 py-3 hover:no-underline rounded-none pl-6 pr-6">
                     <div className="flex items-center justify-between w-full pr-2">
                       <div className="flex items-center gap-2">
                         <User className="w-4 h-4 text-muted-foreground" />
                         <h4 className="text-sm font-semibold">Candidate Information</h4>
                       </div>
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={(e) => {
                           e.stopPropagation();
                           handleResetFilters();
                         }}
                         disabled={isLoading || isAiSearching}
                         className="h-6 w-6 p-0 hover:bg-muted/50"
                       >
                         <FilterX className="h-3 w-3" />
                       </Button>
                     </div>
                   </AccordionTrigger>
                                       <AccordionContent className="px-4 pb-4 overflow-visible">
                      <div className="space-y-2">
                    <div className="space-y-2">
                      <Label htmlFor="name-search" className="text-xs font-medium">Name</Label>
                                           <div className="grid grid-cols-3 gap-2 w-full">
                        <Select value={nameOperator} onValueChange={v => setNameOperator(v as 'contains' | 'is' | 'startsWith' | 'endsWith')} disabled={false}>
                          <SelectTrigger 
                            className="h-8 text-xs w-full col-span-1"
                          >
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
                         className="h-8 text-sm col-span-2" 
                         disabled={false}
                       />
                     </div>
                   </div>
                   <div className="space-y-2">
                                           <Label htmlFor="email-search" className="text-xs font-medium">Email</Label>
                                           <div className="grid grid-cols-3 gap-2 w-full">
                        <Select value={emailOperator} onValueChange={v => setEmailOperator(v as 'contains' | 'is' | 'startsWith' | 'endsWith')} disabled={isLoading || isAiSearching}>
                          <SelectTrigger 
                            className="h-8 text-xs w-full col-span-1"
                          >
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
                         className="h-8 text-sm col-span-2" 
                         disabled={isLoading || isAiSearching}
                       />
                     </div>
                   </div>
                   <div className="space-y-2">
                                           <Label htmlFor="phone-search" className="text-xs font-medium">Phone</Label>
                                           <div className="grid grid-cols-3 gap-2 w-full">
                        <Select value={phoneOperator} onValueChange={v => setPhoneOperator(v as 'contains' | 'is' | 'startsWith' | 'endsWith')} disabled={isLoading || isAiSearching}>
                          <SelectTrigger 
                            className="h-8 text-xs w-full col-span-1"
                          >
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
                         className="h-8 text-sm col-span-2" 
                         disabled={isLoading || isAiSearching}
                       />
                     </div>
                   </div>
                   <div className="space-y-2">
                                           <Label htmlFor="location-search" className="text-xs font-medium">Location</Label>
                                           <div className="grid grid-cols-3 gap-2 w-full">
                        <Select value={locationOperator} onValueChange={v => setLocationOperator(v as 'contains' | 'is' | 'startsWith' | 'endsWith' | 'other')} disabled={isLoading || isAiSearching}>
                          <SelectTrigger 
                            className="h-8 text-xs w-full col-span-1"
                          >
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
                         className="h-8 text-sm col-span-2" 
                         disabled={isLoading || isAiSearching}
                       />
                     </div>
                   </div>
                 </div>
                <div className="space-y-2 mt-2">
                  <Label htmlFor="skills-search" className="text-xs font-medium">Skills Keywords</Label>
                  <div
                    className="flex flex-wrap items-center gap-1 mt-1 min-h-[40px] border px-2 py-1 bg-background focus-within:ring-2 focus-within:ring-ring"
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
                            // Clear any existing timeout
                            if (skillsTimeoutRef.current) {
                              clearTimeout(skillsTimeoutRef.current);
                            }
                            skillsTimeoutRef.current = setTimeout(() => handleApplyStandardFilters(), 100);
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
                            // Clear any existing timeout
                            if (skillsTimeoutRef.current) {
                              clearTimeout(skillsTimeoutRef.current);
                            }
                            skillsTimeoutRef.current = setTimeout(() => handleApplyStandardFilters(), 100);
                          }
                          (e.target as HTMLInputElement).value = '';
                          if (e.key === 'Enter') {
                            handleApplyStandardFilters();
                          }
                        } else if (e.key === 'Enter' && !value) {
                          handleApplyStandardFilters();
                        } else if (e.key === 'Backspace' && !value && skills.size > 0) {
                          const arr = Array.from(skills);
                          const last = arr[arr.length - 1];
                          const newSkills = new Set(skills);
                          newSkills.delete(last);
                          setSkills(newSkills);
                          // Clear any existing timeout
                          if (skillsTimeoutRef.current) {
                            clearTimeout(skillsTimeoutRef.current);
                          }
                          skillsTimeoutRef.current = setTimeout(() => handleApplyStandardFilters(), 100);
                        }
                      }}
                      onChange={e => {
                        // Handle input change without preventing default
                      }}
                      onPaste={e => {
                        if (isLoading || isAiSearching) return;
                        const paste = e.clipboardData.getData('text');
                        if (paste) {
                          e.preventDefault();
                          let hasChanges = false;
                          paste.split(',').map(skill => skill.trim()).filter(Boolean).forEach(skill => {
                            if (!skills.has(skill)) {
                              const newSkills = new Set(skills);
                              newSkills.add(skill);
                              setSkills(newSkills);
                              hasChanges = true;
                            }
                          });
                          if (hasChanges) {
                            // Clear any existing timeout
                            if (pasteTimeoutRef.current) {
                              clearTimeout(pasteTimeoutRef.current);
                            }
                            pasteTimeoutRef.current = setTimeout(() => handleApplyStandardFilters(), 100);
                          }
                        }
                      }}
                    />
                  </div>
                                     </div>
                   </AccordionContent>
                 </AccordionItem>
               </Accordion>

               {/* Application Status Section */}
               <Accordion type="multiple" defaultValue={["application-status"]} className="w-full">
                 <AccordionItem value="application-status" className="border-b border-border/50">
                   <AccordionTrigger className="px-6 py-3 hover:no-underline rounded-none pl-6 pr-6">
                     <div className="flex items-center justify-between w-full pr-2">
                       <div className="flex items-center gap-2">
                         <FileText className="w-4 h-4 text-muted-foreground" />
                         <h4 className="text-sm font-semibold">Application Status</h4>
                       </div>
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={(e) => {
                           e.stopPropagation();
                           handleResetFilters();
                         }}
                         disabled={isLoading || isAiSearching}
                         className="h-6 w-6 p-0 hover:bg-muted/50"
                       >
                         <FilterX className="h-3 w-3" />
                       </Button>
                     </div>
                   </AccordionTrigger>
                                       <AccordionContent className="px-4 pb-4">
                      <div className="space-y-2">
                        <div className="space-y-2">
                          <Label htmlFor="position-select" className="text-xs">Position(s)</Label>
                         <div className="w-full min-w-full">
                           <PositionMultiSelectDropdown
                             selectedIds={selectedPositionIds}
                             onSelectionChange={handlePositionChange}
                             placeholder="All positions..."
                             disabled={isLoading || isAiSearching || isApplyingFilters}
                             showOpenStatus={true}
                             filterOpenOnly={false}
                             showUnassignedOption={true}
                           />
                         </div>
                         {isApplyingFilters && (
                           <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                             <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                             Applying filters...
                           </div>
                         )}
                       </div>
                       <div className="space-y-2">
                     <Label htmlFor="status-select" className="text-xs">Recruitment Pipeline</Label>
                     {safeAvailableStages.length === 0 ? (
                       <div className="p-2 border bg-muted/20">
                         <span className="text-xs text-muted-foreground">No pipeline stages available</span>
                       </div>
                     ) : (
                       <div className="w-full min-w-full">
                         <StatusMultiSelectDropdown
                           selectedIds={selectedStatuses}
                           onSelectionChange={handleStatusChange}
                           placeholder="All stages..."
                           disabled={isLoading || isAiSearching || isApplyingFilters}
                           stages={safeAvailableStages}
                         />
                       </div>
                     )}
                     {isApplyingFilters && (
                       <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                         <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                         Applying filters...
                       </div>
                     )}
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="recruiter-select" className="text-xs">Assigned Recruiter(s)</Label>
                     {safeAvailableRecruiter.length === 0 ? (
                       <div className="p-2 border bg-muted/20">
                         <span className="text-xs text-muted-foreground">No recruiters available</span>
                       </div>
                     ) : (
                       <div className="w-full min-w-full">
                         <RecruiterMultiSelectDropdown
                           selectedIds={selectedRecruiterIds}
                           onSelectionChange={handleRecruiterChange}
                           placeholder="All recruiters..."
                           disabled={isLoading || isAiSearching || isApplyingFilters}
                           recruiters={safeAvailableRecruiter}
                         />
                       </div>
                     )}
                     {isApplyingFilters && (
                       <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                         <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                         Applying filters...
                       </div>
                     )}
                   </div>
                                       <div className="space-y-2">
                      <Label htmlFor="source-select" className="text-xs">Candidate Source(s)</Label>
                      <div className="w-full min-w-full">
                        <SourceMultiSelectDropdown
                          selectedSourceIds={selectedSourceIds}
                          onSelectionChange={handleSourceChange}
                          placeholder="All sources..."
                          disabled={false}
                          availableSources={availableSources}
                        />
                      </div>
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
               </Accordion>

               {/* Experience Section */}
               <Accordion type="multiple" defaultValue={["experience"]} className="w-full">
                 <AccordionItem value="experience" className="border-b border-border/50">
                   <AccordionTrigger className="px-6 py-3 hover:no-underline rounded-none pl-6 pr-6">
                     <div className="flex items-center justify-between w-full pr-2">
                       <div className="flex items-center gap-2">
                         <Clock className="w-4 h-4 text-muted-foreground" />
                         <h4 className="text-sm font-semibold">Experience</h4>
                       </div>
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={(e) => {
                           e.stopPropagation();
                           handleResetFilters();
                         }}
                         disabled={isLoading || isAiSearching}
                         className="h-6 w-6 p-0 hover:bg-muted/50"
                       >
                         <FilterX className="h-3 w-3" />
                       </Button>
                     </div>
                   </AccordionTrigger>
                                      <AccordionContent className="px-4 pb-4">
                     <div className="space-y-2">
                   <div>
                    <Label className="text-xs font-medium pt-2">Experience Years</Label>
                    <div className="flex items-center gap-2 mt-2">
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
                            setExperienceYearsRange([-1, 50]);
                          } else {
                            setExperienceYearsRange([0, 50]);
                          }
                          // Clear any existing timeout
                          if (autoApplyTimeoutRef.current) {
                            clearTimeout(autoApplyTimeoutRef.current);
                          }
                          autoApplyTimeoutRef.current = setTimeout(() => handleApplyStandardFilters(), 100);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        disabled={isLoading || isAiSearching}
                        className="border-border text-primary focus:ring-primary"
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
               </Accordion>

               {/* Custom Fields Section */}
               {filterableCustomFields.length > 0 && (
                 <Accordion type="multiple" defaultValue={[]} className="w-full">
                   <AccordionItem value="custom-fields" className="border-b border-border/50">
                     <AccordionTrigger className="px-6 py-3 hover:no-underline rounded-none pl-6 pr-6">
                       <div className="flex items-center justify-between w-full pr-2">
                         <div className="flex items-center gap-2">
                           <Database className="w-4 h-4 text-muted-foreground" />
                           <h4 className="text-sm font-semibold">Custom Fields</h4>
                           <Badge variant="secondary" className="text-xs">
                             {filterableCustomFields.length}
                           </Badge>
                         </div>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={(e) => {
                             e.stopPropagation();
                             setCustomFieldFilters({});
                             // Apply filters immediately after clearing
                             setTimeout(() => {
                               handleApplyStandardFilters();
                             }, 0);
                           }}
                           disabled={isLoading || isAiSearching || isLoadingCustomFields}
                           className="h-6 w-6 p-0 hover:bg-muted/50"
                         >
                           <FilterX className="h-3 w-3" />
                         </Button>
                       </div>
                     </AccordionTrigger>
                     <AccordionContent className="px-4 pb-4 overflow-visible">
                       <div className="space-y-4">
                         {isLoadingCustomFields ? (
                           <div className="flex items-center justify-center py-4">
                             <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                             <span className="ml-2 text-sm text-muted-foreground">Loading custom fields...</span>
                           </div>
                         ) : (
                           filterableCustomFields.map((field) => (
                             <CustomFieldFilter
                               key={field.field_code}
                               definition={field}
                               value={customFieldFilters[field.field_code]}
                               onChange={(value) => {
                                 setCustomFieldFilters(prev => {
                                   const newCustomFieldFilters = {
                                     ...prev,
                                     [field.field_code]: value
                                   };
                                   
                                   // Apply filters immediately like other filter fields
                                   setTimeout(() => {
                                     handleApplyStandardFilters();
                                   }, 0);
                                   
                                   return newCustomFieldFilters;
                                 });
                               }}
                               className="w-full"
                             />
                           ))
                         )}
                       </div>
                     </AccordionContent>
                   </AccordionItem>
                 </Accordion>
               )}

               {/* Action Buttons */}
               <div className="flex gap-2 p-4">
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
            )}

            {/* Advanced Query Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 m-4">
                    <Label className="text-xs font-medium">Advanced Query Syntax</Label>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="p-1 h-6 w-6" 
                      type="button"
                      onClick={() => setIsAdvancedQuerySyntaxModalOpen(true)}
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                    </Button>
                  </div>
                  <div className="flex gap-2 px-4">
                    <div className="flex-1">
                      <Textarea
                        placeholder="e.g., minFitScore:80 status:Applied,Screening"
                        value={advancedQueryInput}
                        onChange={(e) => {
                          setAdvancedQueryInput(e.target.value);
                          // Real-time validation
                          const validation = validateAdvancedQuery(e.target.value);
                          setQueryValidationError(validation.isValid ? null : validation.error || null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            return;
                          }
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (advancedQueryInput.trim()) {
                              const validation = validateAdvancedQuery(advancedQueryInput);
                              if (validation.isValid) {
                                handleApplyAdvancedQuery();
                              } else {
                                setQueryValidationError(validation.error || null);
                              }
                            }
                          }
                          if (e.key === '?' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            setIsAdvancedQuerySyntaxModalOpen(true);
                          }
                          if (e.key === ' ' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            setShowQueryHistory(!showQueryHistory);
                          }
                          if (e.key === 'Backspace' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            setAdvancedQueryInput('');
                            setQueryValidationError(null);
                            if (onClearAllFilters) {
                              onClearAllFilters();
                            }
                          }
                        }}
                        className={cn(
                          "flex-1 min-h-[80px]",
                          queryValidationError && "border-red-500 focus:border-red-500"
                        )}
                        disabled={false}
                      />
                      {queryValidationError && (
                        <div className="mt-1 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                          <div className="flex items-center gap-1 mb-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="font-medium">Query Error</span>
                          </div>
                          <p>{queryValidationError}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Quick Command Buttons */}
                  <div className="px-4 pb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-xs font-medium text-muted-foreground">Quick Commands</Label>
                      <div className="flex-1 h-px bg-border"></div>
                    </div>
                    <div className="space-y-1">
                      {[
                        { 
                          label: 'High Priority', 
                          query: 'minFitScore:80', 
                          description: 'Candidates with ≥80% fit score',
                          icon: <Star className="h-3 w-3" />
                        },
                        { 
                          label: 'Active Pipeline', 
                          query: 'status:Applied,Screening', 
                          description: 'Candidates in early stages',
                          icon: <Play className="h-3 w-3" />
                        },
                        { 
                          label: 'Unassigned', 
                          query: 'recruiterId:unassigned', 
                          description: 'Candidates needing assignment',
                          icon: <UserX className="h-3 w-3" />
                        },
                        { 
                          label: 'No Status', 
                          query: 'status:Off', 
                          description: 'Candidates without status',
                          icon: <AlertTriangle className="h-3 w-3" />
                        },
                        { 
                          label: 'Applied Today', 
                          query: `applicationDateStart:${new Date().toISOString().slice(0, 10)}`, 
                          description: 'Candidates who applied today',
                          icon: <Calendar className="h-3 w-3" />
                        },
                        { 
                          label: 'Applied This Week', 
                          query: `applicationDateStart:${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}`, 
                          description: 'Candidates who applied this week',
                          icon: <Calendar className="h-3 w-3" />
                        },
                        { 
                          label: 'Hiring Today', 
                          query: 'status:Offer Extended,Offer Accepted,Hired', 
                          description: 'Candidates in final hiring stages',
                          icon: <UserCheck className="h-3 w-3" />
                        },
                        { 
                          label: 'Hiring This Week', 
                          query: 'status:Interviewing,Offer Extended,Offer Accepted,Hired', 
                          description: 'Candidates in hiring pipeline',
                          icon: <UserCheck className="h-3 w-3" />
                        },
                        { 
                          label: 'No Applied Job', 
                          query: 'positionId:not-applied', 
                          description: 'Candidates without applied positions',
                          icon: <UserMinus className="h-3 w-3" />
                        },
                        { 
                          label: 'Unassigned Recruiter', 
                          query: 'recruiterId:unassigned', 
                          description: 'Candidates without assigned recruiter',
                          icon: <UserX className="h-3 w-3" />
                        },
                        { 
                          label: 'Updated Today', 
                          query: `applicationDateStart:${new Date().toISOString().slice(0, 10)}`, 
                          description: 'Candidates updated today',
                          icon: <RefreshCw className="h-3 w-3" />
                        },
                        { 
                          label: 'Senior Devs', 
                          query: 'minExperienceYears:5 skills:React,Python', 
                          description: 'Experienced developers',
                          icon: <Code className="h-3 w-3" />
                        },
                      ].map((cmd, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full h-auto p-2 flex items-center justify-start gap-2 text-left hover:bg-muted/50"
                          onClick={() => {
                            setAdvancedQueryInput(cmd.query);
                            // Auto-apply the query
                            setTimeout(() => {
                              handleApplyAdvancedQuery();
                            }, 100);
                          }}
                        >
                          <div className="flex-shrink-0">
                            {cmd.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{cmd.label}</div>
                            <div className="text-xs text-muted-foreground truncate">{cmd.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Query History */}
                  {queryHistory.length > 0 && (
                    <div className="px-4 pb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Label className="text-xs font-medium text-muted-foreground">Recent Queries</Label>
                        <div className="flex-1 h-px bg-border"></div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setShowQueryHistory(!showQueryHistory)}
                        >
                          {showQueryHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      </div>
                      {showQueryHistory && (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {queryHistory.map((query, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs hover:bg-muted/50 cursor-pointer"
                              onClick={() => {
                                setAdvancedQueryInput(query);
                                setTimeout(() => {
                                  handleApplyAdvancedQuery();
                                }, 100);
                              }}
                            >
                              <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <code className="flex-1 truncate text-blue-600">{query}</code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 hover:bg-muted"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQueryHistory(prev => prev.filter((_, i) => i !== index));
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2 mx-4">
                   <Button
                     onClick={() => {
                       const validation = validateAdvancedQuery(advancedQueryInput);
                       if (validation.isValid) {
                         handleApplyAdvancedQuery();
                       } else {
                         setQueryValidationError(validation.error || null);
                       }
                     }}
                     disabled={!advancedQueryInput.trim() || !!queryValidationError}
                     className="flex-1"
                     size="sm"
                   >
                     <Play className="mr-2 h-4 w-4" />
                     {queryValidationError ? 'Fix Query' : 'Apply Query'}
                   </Button>
                   <Button
                     variant="outline"
                     onClick={() => {
                       setAdvancedQueryInput('');
                       setQueryValidationError(null);
                       if (onClearAllFilters) {
                         onClearAllFilters();
                       }
                     }}
                     disabled={!advancedQueryInput.trim() && !advancedQuery?.trim()}
                     className="flex-1"
                     size="sm"
                   >
                     <FilterX className="mr-2 h-4 w-4" />
                     Clear All
                   </Button>
                 </div>
                </div>

                {/* Action Buttons */}
                
              </div>
            )}
        </div>
      </div>

      {/* Advanced Query Syntax Modal */}
      <AdvancedQuerySyntaxModal 
        isOpen={isAdvancedQuerySyntaxModalOpen}
        onOpenChange={setIsAdvancedQuerySyntaxModalOpen}
      />
    </div>
  );
}