"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSharedSSE } from '@/hooks/use-shared-sse';
import './position-detail-drawer.css';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { Button } from '@/components/ui/button';
import { cn, sanitizeHtml } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/candidates/CandidateKanbanView';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Loader2, Briefcase, Users, Search, X, Eye, Edit, ChevronUp, ChevronDown, Save, XCircle, BrainCircuit, Target, MoreVertical, Pin as PinIcon, PinOff, Settings } from 'lucide-react';
import { format } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import { toast } from 'react-hot-toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { TiptapEditorWithExpand } from '@/components/ui/wysiwyg-editors';
import type { Position, Candidate, Grade } from '@/lib/types';
import { usePositionLevels } from '@/hooks/use-position-levels';
import { useIsMobile } from '@/hooks/use-mobile';
import { getPositionStatusBadge } from '@/lib/positionUtils';
// Removed direct import of getSLARemainingDays - now using API
import { ScoreBadge } from '@/components/ui/score-color';
import { PositionCustomFieldDisplay } from './PositionCustomFieldDisplay';
import { PositionCustomFieldEdit } from './PositionCustomFieldEdit';
import { formatScoreWithGrade } from '@/lib/scoreUtils';
import { Pagination } from '@/components/ui/pagination';
import CandidateDetailModal from '@/components/candidates/CandidateDetailModal';
import { HeadcountTab } from './HeadcountTab';
import { InterviewerTab } from './InterviewerTab';
import { EvaluationConfigTab } from './EvaluationConfigTab';
import { useJobMatchFeature } from '@/hooks/useJobMatchFeature';
import { AppliedCandidatesTable } from './AppliedCandidatesTable';
import { PotentialCandidatesTable } from './PotentialCandidatesTable';
import { AllCandidatesTable } from './AllCandidatesTable';
import { DetailsTab } from './DetailsTab';
import { CriteriaTab } from './CriteriaTab';
import { CandidatesTab } from './CandidatesTab';

// Form schema
const editPositionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().min(1, "Department is required"),
  description: z.string().optional().nullable(),
  matchCriteria: z.string().optional().nullable(),
  isOpen: z.boolean().default(true),
  positionLevel: z.string().optional().nullable(),
  gradeId: z.string().uuid().optional().nullable(),
});

export type EditPositionFormValues = z.infer<typeof editPositionFormSchema>;

interface PositionDetailDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  positionId: string | null;
  initialEditMode?: boolean;
}

export function PositionDetailDrawer({ isOpen, onOpenChange, positionId, initialEditMode = false }: PositionDetailDrawerProps) {
  const { data: session, status: sessionStatus } = useSession();
  const { isJobMatchEnabled } = useJobMatchFeature();
  const isMobile = useIsMobile();
  
  // Debounce refs for search
  const allCandidatesSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appliedCandidatesSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const potentialCandidatesSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // State for position and general data
  const [position, setPosition] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // State for candidates
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [allCandidatesPage, setFilteredCandidatesPage] = useState(1);
  const [allCandidatesPageSize, setFilteredCandidatesPageSize] = useState(100);
  const [allCandidatesTotal, setFilteredCandidatesTotal] = useState(0);
  const [allCandidatesSearchTerm, setFilteredCandidatesSearchTerm] = useState('');
  const [allCandidatesSortColumn, setFilteredCandidatesSortColumn] = useState<string | null>('fitScore');
  const [allCandidatesSortDirection, setFilteredCandidatesSortDirection] = useState<'asc' | 'desc'>('desc');

  // State for headcount
  const [headcounts, setHeadcounts] = useState<any[]>([]);
  const [headcountsTotal, setHeadcountsTotal] = useState(0);


  // State for applied candidates
  const [appliedCandidates, setAppliedCandidates] = useState<Candidate[]>([]);
  const [appliedCandidatesPage, setAppliedCandidatesPage] = useState(1);
  const [appliedCandidatesPageSize, setAppliedCandidatesPageSize] = useState(100);
  const [appliedCandidatesTotal, setAppliedCandidatesTotal] = useState(0);
  const [appliedCandidatesSearchTerm, setAppliedCandidatesSearchTerm] = useState('');
  const [appliedCandidatesSortColumn, setAppliedCandidatesSortColumn] = useState<string | null>('fitScore');
  const [appliedCandidatesSortDirection, setAppliedCandidatesSortDirection] = useState<'asc' | 'desc'>('desc');

  // State for potential candidates
  const [potentialCandidates, setPotentialCandidates] = useState<Candidate[]>([]);
  const [potentialCandidatesPage, setPotentialCandidatesPage] = useState(1);
  const [potentialCandidatesPageSize, setPotentialCandidatesPageSize] = useState(100);
  const [potentialCandidatesTotal, setPotentialCandidatesTotal] = useState(0);
  const [potentialCandidatesSearchTerm, setPotentialCandidatesSearchTerm] = useState('');

  // Modal states
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  
  // Edit states
  const [isEditMode, setIsEditMode] = useState(false);
  const [defaultMatchCriteria, setDefaultMatchCriteria] = useState<string>('');

  // Reset edit mode when drawer opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsEditMode(initialEditMode);
    } else {
      setIsEditMode(false);
    }
  }, [isOpen, initialEditMode]);

  // State declarations first to avoid TDZ issues
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [isDrawerReady, setIsDrawerReady] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const { levels: positionLevels, isLoading: isLoadingLevels } = usePositionLevels();

  // Sorting state for applied candidates table
  const [appliedCandidatesOpenMenu, setAppliedCandidatesOpenMenu] = useState<string | null>(null);

  // Sorting state for potential candidates table
  const [potentialCandidatesSortColumn, setPotentialCandidatesSortColumn] = useState<string | null>('matchScore');
  const [potentialCandidatesSortDirection, setPotentialCandidatesSortDirection] = useState<'asc' | 'desc'>('desc');
  const [potentialCandidatesOpenMenu, setPotentialCandidatesOpenMenu] = useState<string | null>(null);

  // Sorting state for all candidates table
  const [allCandidatesOpenMenu, setFilteredCandidatesOpenMenu] = useState<string | null>(null);

  // State for recruitment stages
  const [recruitmentStages, setRecruitmentStages] = useState<any[]>([]);

  // Tab states - declare these before using them in useEffect
  const [activeTab, setActiveTab] = useState('details');
  const [activeCandidateTab, setActiveCandidateTab] = useState('applied');

  // When Job Match is disabled, ensure we don't show or stay on the potential tab
  useEffect(() => {
    if (!isJobMatchEnabled && activeCandidateTab !== 'applied') {
      setActiveCandidateTab('applied');
    }
  }, [isJobMatchEnabled, activeCandidateTab]);

  // Form setup
  const form = useForm<EditPositionFormValues>({
    resolver: zodResolver(editPositionFormSchema),
    defaultValues: {
      title: '',
      department: '',
      description: '',
      matchCriteria: '',
      isOpen: true,
      positionLevel: '',
      gradeId: null,
    },
  });

  // Sorting handlers (memoized to avoid changing references on each render)
  const handleAppliedCandidatesSort = useCallback((column: string | null, direction?: 'asc' | 'desc' | null) => {
    if (!column) {
      setAppliedCandidatesSortColumn(null);
      setAppliedCandidatesSortDirection('asc');
      return;
    }
    if (appliedCandidatesSortColumn === column && (direction === null || direction === undefined)) {
      setAppliedCandidatesSortDirection(appliedCandidatesSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setAppliedCandidatesSortColumn(column);
      setAppliedCandidatesSortDirection(direction || (column === 'fitScore' ? 'desc' : 'asc'));
    }
  }, [appliedCandidatesSortColumn, appliedCandidatesSortDirection]);

  const handlePotentialCandidatesSort = useCallback((column: string | null, direction?: 'asc' | 'desc' | null) => {
    if (!column) {
      setPotentialCandidatesSortColumn(null);
      setPotentialCandidatesSortDirection('asc');
      return;
    }
    if (potentialCandidatesSortColumn === column && (direction === null || direction === undefined)) {
      setPotentialCandidatesSortDirection(potentialCandidatesSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setPotentialCandidatesSortColumn(column);
      setPotentialCandidatesSortDirection(direction || (column === 'fitScore' ? 'desc' : 'asc'));
    }
  }, [potentialCandidatesSortColumn, potentialCandidatesSortDirection]);

  const handleAllCandidatesSort = useCallback((column: string | null, direction?: 'asc' | 'desc' | null) => {
    if (!column) {
      setFilteredCandidatesSortColumn(null);
      setFilteredCandidatesSortDirection('asc');
      return;
    }
    if (allCandidatesSortColumn === column && (direction === null || direction === undefined)) {
      setFilteredCandidatesSortDirection(allCandidatesSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setFilteredCandidatesSortColumn(column);
      setFilteredCandidatesSortDirection(direction || (column === 'fitScore' ? 'desc' : 'asc'));
    }
  }, [allCandidatesSortColumn, allCandidatesSortDirection]);

  // Sortable value getters
  const getSortableValue = (candidate: Candidate, column: string) => {
    switch (column) {
      case 'name': return candidate.name?.toLowerCase() || '';
      case 'email': return candidate.email?.toLowerCase() || '';
      case 'fitScore': return candidate.fitScore || 0;
      case 'status': return (candidate.statusId || candidate.status)?.toLowerCase() || '';
      case 'applicationDate': 
        return candidate.applicationDate ? new Date(candidate.applicationDate).getTime() : 0;
      default: return '';
    }
  };

  // Calculate total pages for pagination
  const allCandidatesTotalPages = useMemo(() => 
    Math.max(1, Math.ceil(allCandidatesTotal / allCandidatesPageSize)), 
    [allCandidatesTotal, allCandidatesPageSize]
  );

  const potentialCandidatesTotalPages = useMemo(() => 
    Math.max(1, Math.ceil(potentialCandidatesTotal / potentialCandidatesPageSize)), 
    [potentialCandidatesTotal, potentialCandidatesPageSize]
  );

  // Calculate applied candidates count
  const appliedCandidatesCount = useMemo(() => 
    appliedCandidatesTotal,
    [appliedCandidatesTotal]
  );

  // Create stageNames mapping for StatusBadge components
  const stageNames = useMemo(() => {
    const mapping: Record<string, string> = {};
    recruitmentStages.forEach(stage => {
      if (stage.id && stage.name) {
        mapping[stage.id] = stage.name;
      }
    });
    return mapping;
  }, [recruitmentStages]);

  // Sorted candidates - use server-side sorting for fitScore, client-side for others
  const sortedAppliedCandidates = useMemo(() => {
    if (!appliedCandidatesSortColumn) return appliedCandidates;
    
    // Skip client-side sorting for fitScore since server already sorts it
    if (appliedCandidatesSortColumn === 'fitScore') {
      return appliedCandidates;
    }
    
    return [...appliedCandidates].sort((a, b) => {
      const aValue = getSortableValue(a, appliedCandidatesSortColumn);
      const bValue = getSortableValue(b, appliedCandidatesSortColumn);
      if (aValue < bValue) return appliedCandidatesSortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return appliedCandidatesSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [appliedCandidates, appliedCandidatesSortColumn, appliedCandidatesSortDirection]);

  const sortedPotentialCandidates = useMemo(() => {
    if (!potentialCandidatesSortColumn) return potentialCandidates;
    
    return [...potentialCandidates].sort((a, b) => {
      const aValue = getSortableValue(a, potentialCandidatesSortColumn);
      const bValue = getSortableValue(b, potentialCandidatesSortColumn);
      if (aValue < bValue) return potentialCandidatesSortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return potentialCandidatesSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [potentialCandidates, potentialCandidatesSortColumn, potentialCandidatesSortDirection]);

  const sortedAllCandidates = useMemo(() => {
    if (!allCandidatesSortColumn) return filteredCandidates;
    
    // Skip client-side sorting for fitScore since server already sorts it
    if (allCandidatesSortColumn === 'fitScore') {
      return filteredCandidates;
    }
    
    return [...filteredCandidates].sort((a, b) => {
      const aValue = getSortableValue(a, allCandidatesSortColumn);
      const bValue = getSortableValue(b, allCandidatesSortColumn);
      if (aValue < bValue) return allCandidatesSortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return allCandidatesSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCandidates, allCandidatesSortColumn, allCandidatesSortDirection]);

  // Level options



  // Fetch position data
  const fetchPosition = useCallback(async () => {
    if (!positionId) return;
    
    setIsLoading(true);
    setFetchError(null);
    
    try {
      const response = await fetch(`/api/positions/${positionId}`);
      
      if (!response.ok) {
        let errorMessage = 'Failed to fetch position';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          // Silent parse error
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      setPosition(data);
      
      // Populate form with position data
      form.reset({
        title: data.title || '',
        department: data.department || '',
        description: data.description || '',
        matchCriteria: data.matchCriteria || '',
        isOpen: data.isOpen ?? true,
        positionLevel: data.positionLevel || '',
        gradeId: data.gradeId || null,
      });
      
      // Set drawer as ready for WYSIWYG editors
      setIsDrawerReady(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not load position.';
      setFetchError(errorMessage);
      setPosition(null);
    } finally {
      setIsLoading(false);
    }
  }, [positionId, form]);

  // Fetch grades for the form
  const fetchGrades = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/grades');
      if (response.ok) {
        const data = await response.json();
        setGrades(data);
      }
    } catch (error) {
      // Error fetching grades
    }
  }, []);

  // Fetch applied candidates for this position
  const fetchAppliedCandidates = useCallback(async () => {
    if (!positionId) return;
    
    try {
      const query = new URLSearchParams();
      query.append('page', String(appliedCandidatesPage));
      query.append('limit', String(appliedCandidatesPageSize));
      query.append('type', 'applied');
      if (appliedCandidatesSearchTerm) {
        query.append('searchTerm', appliedCandidatesSearchTerm);
      }
      query.append('sortColumn', appliedCandidatesSortColumn || 'fitScore');
      query.append('sortDirection', appliedCandidatesSortDirection || 'desc');
      
      query.append('showPinSection', 'true');
      
      const url = `/api/positions/${positionId}/candidates?${query.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch applied candidates');
      
      const data = await response.json();
      
      const candidates = Array.isArray(data.data) ? data.data : [];
      
      setAppliedCandidates(candidates);
      setAppliedCandidatesTotal(data.pagination?.total || candidates.length);
    } catch (error) {
      setAppliedCandidates([]);
      setAppliedCandidatesTotal(0);
    }
  }, [positionId, appliedCandidatesPage, appliedCandidatesPageSize, appliedCandidatesSearchTerm, appliedCandidatesSortColumn, appliedCandidatesSortDirection, sessionStatus]);

  // Fetch all candidates related to this position
  const fetchAllCandidates = useCallback(async () => {
    if (!positionId) return;
    
    try {
      const query = new URLSearchParams();
      query.append('page', String(allCandidatesPage));
      query.append('limit', String(allCandidatesPageSize));
      query.append('type', 'all'); // Explicitly request all candidates (applied and matched)
      if (allCandidatesSearchTerm) {
        query.append('searchTerm', allCandidatesSearchTerm);
      }
      query.append('sortColumn', allCandidatesSortColumn || 'fitScore');
      query.append('sortDirection', allCandidatesSortDirection || 'desc');
      
      query.append('showPinSection', 'true');
      
      const response = await fetch(`/api/positions/${positionId}/candidates?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch all candidates');
      
      const data = await response.json();
      const candidates = Array.isArray(data.data) ? data.data : [];
      
      setFilteredCandidates(candidates);
      setFilteredCandidatesTotal(data.pagination?.total || candidates.length);
    } catch (error) {
      setFilteredCandidates([]);
      setFilteredCandidatesTotal(0);
    }
  }, [positionId, allCandidatesPage, allCandidatesPageSize, allCandidatesSearchTerm, allCandidatesSortColumn, allCandidatesSortDirection, sessionStatus]);

  // Fetch potential candidates (candidates with job matches for this position but not applied)
  const fetchPotentialCandidates = useCallback(async () => {
    if (!positionId || !isJobMatchEnabled) return;
    
    try {
      const query = new URLSearchParams();
      query.append('page', String(potentialCandidatesPage));
      query.append('limit', String(potentialCandidatesPageSize));
      query.append('hasJobMatch', 'true'); // Only candidates with job matches
      query.append('notApplied', 'true'); // Exclude candidates who already applied
      if (potentialCandidatesSearchTerm) {
        query.append('searchTerm', potentialCandidatesSearchTerm);
      }
      query.append('sortColumn', potentialCandidatesSortColumn || 'matchScore');
      query.append('sortDirection', potentialCandidatesSortDirection || 'desc');
      
      query.append('showPinSection', 'true');
      
      // Fetch candidates who have job matches associated with this position but haven't applied
      const response = await fetch(`/api/positions/${positionId}/job-matches?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch potential candidates');
      
      const data = await response.json();
      const candidates = Array.isArray(data.data) ? data.data : [];
      
      setPotentialCandidates(candidates);
      setPotentialCandidatesTotal(data.pagination?.total || candidates.length);
    } catch (error) {
      setPotentialCandidates([]);
      setPotentialCandidatesTotal(0);
    }
  }, [positionId, potentialCandidatesPage, potentialCandidatesPageSize, potentialCandidatesSearchTerm, potentialCandidatesSortColumn, potentialCandidatesSortDirection, isJobMatchEnabled]);

  // Fetch headcount count for this position
  const fetchHeadcountCount = useCallback(async () => {
    if (!positionId) return;
    
    try {
      const response = await fetch(`/api/headcount?positionId=${positionId}`);
      if (!response.ok) throw new Error('Failed to fetch headcount count');
      
      const data = await response.json();
      const headcounts = Array.isArray(data) ? data : [];
      setHeadcountsTotal(headcounts.length);
    } catch (error) {
      setHeadcountsTotal(0);
    }
  }, [positionId]);

  // Fetch recruitment stages for status display
  const fetchRecruitmentStages = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return;
    
    try {
      const response = await fetch('/api/recruitment-stages');
      if (!response.ok) throw new Error('Failed to fetch recruitment stages');
      
      const stages = await response.json();
      setRecruitmentStages(Array.isArray(stages) ? stages : []);
    } catch (error) {
      console.error('Error fetching recruitment stages:', error);
    }
  }, [sessionStatus]);

  // Handle candidate click
  const handleCandidateClick = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setIsCandidateModalOpen(true);
  };

  // Calculate SLA days left

  // Handle custom field changes
  const handleCustomFieldChange = useCallback((fieldCode: string, value: any) => {
    if (position) {
      setPosition(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          customFields: {
            ...prev.customFields,
            [fieldCode]: value
          }
        };
      });
    }
  }, [position, setPosition]);

  // Handle edit functions
  const handleEdit = () => {
    // Ensure form has the latest position data before entering edit mode
    if (position) {
      form.reset({
        title: position.title || '',
        department: position.department || '',
        description: position.description || '',
        matchCriteria: position.matchCriteria || '',
        isOpen: position.isOpen ?? true,
        positionLevel: position.positionLevel || '',
        gradeId: position.gradeId || null,
      });
      
      // Force re-render of WYSIWYG editors with new content
      setEditorKey(prev => prev + 1);
    }
    setIsEditMode(true);
  };

  const handleSave = async (data: EditPositionFormValues) => {
    if (!position) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/positions/${position.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to update position');
      
      const updatedPosition = await response.json();
      setPosition(updatedPosition.position || updatedPosition);
      setIsEditMode(false);
      toast.success('Position updated successfully');
    } catch (error) {
      toast.error('Failed to update position');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (position) {
      // Reset form to current position data
      form.reset({
        title: position.title || '',
        department: position.department || '',
        description: position.description || '',
        matchCriteria: position.matchCriteria || '',
        isOpen: position.isOpen ?? true,
        positionLevel: position.positionLevel || '',
        gradeId: position.gradeId || null,
      });
    }
    setIsEditMode(false);
  };

  // AI Generation function for job description
  const generateJobDescription = async () => {
    const title = form.getValues('title');
    const department = form.getValues('department');
    const positionLevel = form.getValues('positionLevel');

    // Check if required fields are filled
    const missingFields = [];
    if (!title || title.trim() === '') {
      missingFields.push('Position Title');
    }
    if (!department || department.trim() === '') {
      missingFields.push('Department');
    }
    if (!positionLevel || positionLevel.trim() === '') {
      missingFields.push('Position Level');
    }

    if (missingFields.length > 0) {
      toast.error(`Please fill in the following fields first: ${missingFields.join(', ')}`);
      return;
    }

    await performJobDescriptionGeneration(title, department, positionLevel || '');
  };

  // Perform the actual generation
  const performJobDescriptionGeneration = async (title: string, department: string, positionLevel: string) => {
    setIsGeneratingDescription(true);
    try {
      const response = await fetch('/api/ai/generate-job-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          department,
          positionLevel: positionLevel || 'Not specified'
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 503 && data.error?.includes('API Key')) {
          throw new Error('AI features are not configured. Please configure the Gemini API Key in System Settings > AI Configuration.');
        }
        throw new Error(data.error || 'Failed to generate job description');
      }

      if (data.description) {
        form.setValue('description', data.description);
        toast.success('Job description generated successfully!');
      } else {
        throw new Error('No description generated');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate job description. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Use default criteria
  const useDefaultCriteria = () => {
    if (defaultMatchCriteria) {
      form.setValue('matchCriteria', defaultMatchCriteria);
      toast.success('Default match criteria applied');
    }
  };

  // Helper: Group candidates by email (same as position detail page)
  const candidatesByEmail = useMemo(() => {
    const groups: Record<string, Candidate[]> = {};
    sortedAllCandidates.forEach((c) => {
      if (!c.email) return;
      if (!groups[c.email]) groups[c.email] = [];
      groups[c.email].push(c);
    });
    return groups;
  }, [sortedAllCandidates]);

  const emailOrder = useMemo(() => {
    const seen = new Set<string>();
    return sortedAllCandidates
      .map((c) => c.email)
      .filter((email) => email && !seen.has(email) && seen.add(email));
  }, [sortedAllCandidates]);

  const [expandedEmails, setExpandedEmails] = useState<Record<string, boolean>>({});

  // Fetch default match criteria
  useEffect(() => {
    const fetchDefaultMatchCriteria = async () => {
      try {
        const response = await fetch('/api/settings/system-settings');
        if (response.ok) {
          const data = await response.json();
          const defaultCriteria = data.defaultMatchCriteria || '';
          setDefaultMatchCriteria(defaultCriteria);
        }
      } catch (error) {
        // Failed to fetch default match criteria
      }
    };
    fetchDefaultMatchCriteria();
  }, []);


  // Fetch data when drawer opens or positionId changes
  // Initial load when drawer opens or position changes
  // Important: do not depend on fetch callbacks here, or this will re-run on search keystrokes
  useEffect(() => {
    if (isOpen && positionId && sessionStatus === 'authenticated') {
      fetchPosition();
      fetchGrades();
      fetchAppliedCandidates();
      fetchAllCandidates();
      fetchPotentialCandidates();
      fetchHeadcountCount();
      fetchRecruitmentStages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, positionId, sessionStatus]);

  // Use shared SSE connection for realtime updates
  const { isConnected: sseConnected, subscribeToEvents } = useSharedSSE();
  
  useEffect(() => {
    let mounted = true;
    let refreshTimeout: NodeJS.Timeout;
    let lastUpdateTime = 0;
    const MIN_UPDATE_INTERVAL = 500; // Minimum 500ms between updates
    
    // Only subscribe to events if user is authenticated and drawer is open
    if (sessionStatus !== 'authenticated' || !positionId || !isOpen) {
      return;
    }
    
    // Subscribe to shared SSE events
    const unsubscribe = subscribeToEvents((event) => {
      if (!mounted) return;
      
      // Debug: SSE event received (remove in production)
      
      // Always log candidate_update events for debugging
      if (event.type === 'candidate_update') {
        // Debug: Candidate update event (remove in production)
      }
      
      if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
        // Debug: SSE event via shared connection (remove in production)
      }
      
      // Handle different event types with improved debouncing and rate limiting
      if (event.type === 'position_update' || event.type === 'dashboard_update' || event.type === 'candidate_update') {
        const now = Date.now();
        
        // Rate limit updates to prevent excessive reloading
        if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) {
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
            // Debug: Update rate limited (remove in production)
          }
          return;
        }
        
        if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
          // Debug: Processing update event (remove in production)
        }
        
        // Clear existing timeout and set new one to prevent rapid successive calls
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
        
        refreshTimeout = setTimeout(() => {
          if (mounted && sessionStatus === 'authenticated' && positionId && isOpen) {
            lastUpdateTime = Date.now();
            // Refresh position data and headcount when position updates are received
            fetchPosition();
            fetchHeadcountCount();
            
            // Also refresh candidate data when candidate updates are received
            if (event.type === 'candidate_update') {
              // Always refresh candidate data for candidate updates, especially status changes
              // Debug: Refreshing candidate data (remove in production)
              fetchAppliedCandidates();
              fetchAllCandidates();
              fetchPotentialCandidates();
            }
          }
        }, 500); // 500ms debounce for better responsiveness
      }
    });
    
    return () => {
      mounted = false;
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      unsubscribe();
    };
  }, [sessionStatus, positionId, isOpen, subscribeToEvents, fetchPosition, fetchHeadcountCount, fetchAppliedCandidates, fetchAllCandidates, fetchPotentialCandidates]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      setFilteredCandidates([]);
      setFilteredCandidatesTotal(0);
      setAppliedCandidates([]);
      setAppliedCandidatesTotal(0);
      setPotentialCandidates([]);
      setPotentialCandidatesTotal(0);
      setHeadcountsTotal(0);
      setFetchError(null);
      setFilteredCandidatesSearchTerm('');
      setFilteredCandidatesPage(1);
      setAppliedCandidatesSearchTerm('');
      setAppliedCandidatesPage(1);
      setPotentialCandidatesSearchTerm('');
      setPotentialCandidatesPage(1);
      setIsEditMode(false);
      setIsDrawerReady(false);
      setRecruitmentStages([]);
      form.reset();
      
      // Reset sorting state to default
      setAppliedCandidatesSortColumn('fitScore');
      setAppliedCandidatesSortDirection('desc');
      setAppliedCandidatesOpenMenu(null);
      setPotentialCandidatesSortColumn('fitScore');
      setPotentialCandidatesSortDirection('desc');
      setPotentialCandidatesOpenMenu(null);
      setFilteredCandidatesOpenMenu(null);
    }
  }, [isOpen, form]);

  // Debounced search for applied candidates
  useEffect(() => {
    if (!isOpen || !positionId || sessionStatus !== 'authenticated') return;
    
    // Clear existing timeout
    if (appliedCandidatesSearchTimeoutRef.current) {
      clearTimeout(appliedCandidatesSearchTimeoutRef.current);
    }

    // Set new timeout for search with debounce
    appliedCandidatesSearchTimeoutRef.current = setTimeout(async () => {
      try {
        await fetchAppliedCandidates();
      } catch (error) {
        console.error('Error fetching applied candidates:', error);
      } finally {
        appliedCandidatesSearchTimeoutRef.current = null;
      }
    }, 500);

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (appliedCandidatesSearchTimeoutRef.current) {
        clearTimeout(appliedCandidatesSearchTimeoutRef.current);
        appliedCandidatesSearchTimeoutRef.current = null;
      }
    };
  }, [appliedCandidatesPage, appliedCandidatesPageSize, appliedCandidatesSearchTerm, appliedCandidatesSortColumn, appliedCandidatesSortDirection, positionId, sessionStatus, fetchAppliedCandidates]);

  // Debounced search for all candidates
  useEffect(() => {
    if (!isOpen || !positionId || sessionStatus !== 'authenticated') return;
    
    // Clear existing timeout
    if (allCandidatesSearchTimeoutRef.current) {
      clearTimeout(allCandidatesSearchTimeoutRef.current);
    }

    // Set new timeout for search with debounce
    allCandidatesSearchTimeoutRef.current = setTimeout(async () => {
      try {
        await fetchAllCandidates();
      } catch (error) {
        console.error('Error fetching all candidates:', error);
      } finally {
        allCandidatesSearchTimeoutRef.current = null;
      }
    }, 500);

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (allCandidatesSearchTimeoutRef.current) {
        clearTimeout(allCandidatesSearchTimeoutRef.current);
        allCandidatesSearchTimeoutRef.current = null;
      }
    };
  }, [allCandidatesPage, allCandidatesPageSize, allCandidatesSearchTerm, allCandidatesSortColumn, allCandidatesSortDirection, positionId, sessionStatus, fetchAllCandidates]);

  // Debounced search for potential candidates
  useEffect(() => {
    if (!isOpen || !positionId || sessionStatus !== 'authenticated') return;
    
    // Clear existing timeout
    if (potentialCandidatesSearchTimeoutRef.current) {
      clearTimeout(potentialCandidatesSearchTimeoutRef.current);
    }

    // Set new timeout for search with debounce
    potentialCandidatesSearchTimeoutRef.current = setTimeout(async () => {
      try {
        await fetchPotentialCandidates();
      } catch (error) {
        console.error('Error fetching potential candidates:', error);
      } finally {
        potentialCandidatesSearchTimeoutRef.current = null;
      }
    }, 500);

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (potentialCandidatesSearchTimeoutRef.current) {
        clearTimeout(potentialCandidatesSearchTimeoutRef.current);
        potentialCandidatesSearchTimeoutRef.current = null;
      }
    };
  }, [potentialCandidatesPage, potentialCandidatesPageSize, potentialCandidatesSearchTerm, potentialCandidatesSortColumn, potentialCandidatesSortDirection, positionId, sessionStatus, fetchPotentialCandidates]);

  // Update form when position changes
  useEffect(() => {
    if (position && !isEditMode) {
      form.reset({
        title: position.title || '',
        department: position.department || '',
        description: position.description || '',
        matchCriteria: position.matchCriteria || '',
        isOpen: position.isOpen ?? true,
        positionLevel: position.positionLevel || '',
        gradeId: position.gradeId || null,
      });
    }
  }, [position, isEditMode, form]);

  // Force editor re-render when entering edit mode with content
  useEffect(() => {
    if (isEditMode && position) {
      // Small delay to ensure form has been reset with position data
      const timer = setTimeout(() => {
        setEditorKey(prev => prev + 1);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isEditMode, position]);

  // Handle pin toggle for applied candidates
  const handleAppliedCandidatePinToggle = useCallback(async (candidate: Candidate) => {
                              try {
                                await fetch(`/api/candidates/${candidate.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ isPinned: !candidate.isPinned })
                                });
                                candidate.isPinned = !candidate.isPinned;
                                setAppliedCandidates((prev) => [...prev]);
                              } catch {}
  }, []);

  // Handle pin toggle for potential candidates
  const handlePotentialCandidatePinToggle = useCallback(async (candidate: Candidate) => {
                      try {
                        await fetch(`/api/candidates/${candidate.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ isPinned: !candidate.isPinned })
                        });
                        if (candidate.isPinned) {
                          candidate.isPinned = false;
                        } else {
                          candidate.isPinned = true;
                        }
                        setAppliedCandidates((prev) => [...prev]);
                        setPotentialCandidates((prev) => [...prev]);
                      } catch {}
  }, []);

  // Handle pin toggle for all candidates
  const handleAllCandidatePinToggle = useCallback(async (candidate: Candidate) => {
                                    try {
                                      const response = await fetch(`/api/candidates/${candidate.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ isPinned: !candidate.isPinned })
                                      });
                                      
                                      if (!response.ok) {
                                        throw new Error(`Failed to ${candidate.isPinned ? 'unpin' : 'pin'} candidate`);
                                      }
                                      
                                      // Update the candidate in the appropriate list
      const updateCandidate = (prev: Candidate[]) => 
                                        prev.map(c => c.id === candidate.id ? { ...c, isPinned: !c.isPinned } : c);
                                      
                                      setAppliedCandidates(updateCandidate);
                                      setPotentialCandidates(updateCandidate);
                                    } catch (error) {
                                      console.error('Error toggling pin status:', error);
                                    }
  }, []);


  // Render position content (shared between mobile and desktop)
  const renderPositionContent = () => (
    <div className="h-full flex flex-col overflow-hidden">

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : fetchError ? (
              <div className={cn("flex-1 flex items-center justify-center", isMobile ? "p-4" : "p-6")}>
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">{fetchError}</p>
                  {null}
                </div>
              </div>
            ) : position ? (
              <div className="flex-1 overflow-hidden">
                <div className="h-full flex flex-col">
                  {/* Tabs Navigation - Scrollable on mobile */}
                  <div className={cn(
                    "w-full border-b border-border/50",
                    isMobile ? "overflow-x-auto scrollbar-thin" : "flex"
                  )}>
                    <div className={cn(
                      "flex",
                      isMobile ? "min-w-max" : "w-full"
                    )}>
                      <div
                        onClick={() => setActiveTab('details')}
                        className={cn(
                          "flex items-center gap-2 text-sm font-medium transition-all duration-200 relative cursor-pointer whitespace-nowrap flex-shrink-0",
                          isMobile ? "px-3 py-2.5" : "px-6 py-3",
                          activeTab === 'details'
                            ? "text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        Details
                      </div>
                      <div
                        onClick={() => setActiveTab('criteria')}
                        className={cn(
                          "flex items-center gap-2 text-sm font-medium transition-all duration-200 relative cursor-pointer whitespace-nowrap flex-shrink-0",
                          isMobile ? "px-3 py-2.5" : "px-6 py-3",
                          activeTab === 'criteria'
                            ? "text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        Criteria
                      </div>
                      <div
                        onClick={() => setActiveTab('candidates')}
                        className={cn(
                          "flex items-center gap-2 text-sm font-medium transition-all duration-200 relative cursor-pointer whitespace-nowrap flex-shrink-0",
                          isMobile ? "px-3 py-2.5" : "px-6 py-3",
                          activeTab === 'candidates'
                            ? "text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        Candidates ({isJobMatchEnabled ? allCandidatesTotal : appliedCandidatesTotal})
                      </div>
                      <div
                        onClick={() => setActiveTab('headcount')}
                        className={cn(
                          "flex items-center gap-2 text-sm font-medium transition-all duration-200 relative cursor-pointer whitespace-nowrap flex-shrink-0",
                          isMobile ? "px-3 py-2.5" : "px-6 py-3",
                          activeTab === 'headcount'
                            ? "text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        Headcount ({headcountsTotal})
                      </div>
                      <div
                        onClick={() => setActiveTab('interviewers')}
                        className={cn(
                          "flex items-center gap-2 text-sm font-medium transition-all duration-200 relative cursor-pointer whitespace-nowrap flex-shrink-0",
                          isMobile ? "px-3 py-2.5" : "px-6 py-3",
                          activeTab === 'interviewers'
                            ? "text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        Interviewers
                      </div>
                      <div
                        onClick={() => setActiveTab('evaluation')}
                        className={cn(
                          "flex items-center gap-2 text-sm font-medium transition-all duration-200 relative cursor-pointer whitespace-nowrap flex-shrink-0",
                          isMobile ? "px-3 py-2.5" : "px-6 py-3",
                          activeTab === 'evaluation'
                            ? "text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        Evaluate
                      </div>
                    </div>
                  </div>
                  
                  {activeTab === 'details' && position && (
                    <DetailsTab
                      position={position}
                      isEditMode={isEditMode}
                      isSaving={isSaving}
                      isGeneratingDescription={isGeneratingDescription}
                      isDrawerReady={isDrawerReady}
                      isLoadingLevels={isLoadingLevels}
                      positionLevels={positionLevels.map(level => ({ id: level.id, name: level.name, color: level.color || undefined }))}
                      grades={grades}
                      form={form}
                      isMobile={isMobile}
                      onEdit={handleEdit}
                      onCancel={handleCancel}
                      onSave={handleSave}
                      onGenerateJobDescription={generateJobDescription}
                      onCustomFieldChange={handleCustomFieldChange}
                    />
                  )}
                  
                  {activeTab === 'criteria' && position && (
                    <CriteriaTab
                      position={position}
                      isEditMode={isEditMode}
                      isSaving={isSaving}
                      isDrawerReady={isDrawerReady}
                      defaultMatchCriteria={defaultMatchCriteria}
                      form={form}
                      isMobile={isMobile}
                      onEdit={handleEdit}
                      onCancel={handleCancel}
                      onSave={handleSave}
                      onUseDefaultCriteria={useDefaultCriteria}
                      onCustomFieldChange={handleCustomFieldChange}
                    />
                  )}
                  
                  {activeTab === 'candidates' && (
                    <CandidatesTab
                      isMobile={isMobile}
                      isJobMatchEnabled={isJobMatchEnabled}
                      activeCandidateTab={activeCandidateTab as 'applied' | 'potential'}
                      onActiveCandidateTabChange={(tab) => setActiveCandidateTab(tab)}
                      appliedCandidates={appliedCandidates}
                      sortedAppliedCandidates={sortedAppliedCandidates}
                      appliedCandidatesSearchTerm={appliedCandidatesSearchTerm}
                      appliedCandidatesSortColumn={appliedCandidatesSortColumn}
                      appliedCandidatesSortDirection={appliedCandidatesSortDirection}
                      appliedCandidatesOpenMenu={appliedCandidatesOpenMenu}
                      appliedCandidatesPage={appliedCandidatesPage}
                      appliedCandidatesPageSize={appliedCandidatesPageSize}
                      appliedCandidatesTotal={appliedCandidatesTotal}
                      appliedCandidatesCount={appliedCandidatesCount}
                      onAppliedCandidatesSearchChange={setAppliedCandidatesSearchTerm}
                      onAppliedCandidatesSort={handleAppliedCandidatesSort}
                      onAppliedCandidatesOpenMenuChange={setAppliedCandidatesOpenMenu}
                      onAppliedCandidatesPageChange={setAppliedCandidatesPage}
                      onAppliedCandidatesPageSizeChange={setAppliedCandidatesPageSize}
                      onAppliedCandidatePinToggle={handleAppliedCandidatePinToggle}
                      potentialCandidates={potentialCandidates}
                      sortedPotentialCandidates={sortedPotentialCandidates}
                      potentialCandidatesSearchTerm={potentialCandidatesSearchTerm}
                      potentialCandidatesSortColumn={potentialCandidatesSortColumn}
                      potentialCandidatesSortDirection={potentialCandidatesSortDirection}
                      potentialCandidatesOpenMenu={potentialCandidatesOpenMenu}
                      potentialCandidatesPage={potentialCandidatesPage}
                      potentialCandidatesPageSize={potentialCandidatesPageSize}
                      potentialCandidatesTotal={potentialCandidatesTotal}
                      onPotentialCandidatesSearchChange={setPotentialCandidatesSearchTerm}
                      onPotentialCandidatesSort={handlePotentialCandidatesSort}
                      onPotentialCandidatesOpenMenuChange={setPotentialCandidatesOpenMenu}
                      onPotentialCandidatesPageChange={setPotentialCandidatesPage}
                      onPotentialCandidatesPageSizeChange={setPotentialCandidatesPageSize}
                      onPotentialCandidatePinToggle={handlePotentialCandidatePinToggle}
                      stageNames={stageNames}
                      onCandidateClick={handleCandidateClick}
                    />
                  )}
                  
                  {activeTab === 'headcount' && (
                    <div className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full pr-4">
                        <div className={cn(isMobile ? "p-4" : "p-6")}>
                          <HeadcountTab 
                            positionId={positionId!} 
                            candidates={filteredCandidates}
                            onHeadcountChange={fetchHeadcountCount}
                          />
                          
                          {/* Custom Fields for Headcount Section */}
                          <div className="mt-6">
                            {isEditMode ? (
                              <PositionCustomFieldEdit
                                section="headcount"
                                positionId={position?.id || ''}
                                customFields={position?.customFields || {}}
                                onFieldChange={handleCustomFieldChange}
                                title="Edit Headcount"
                              />
                            ) : (
                              <PositionCustomFieldDisplay
                                section="headcount"
                                positionId={position?.id || ''}
                                customFields={position?.customFields || {}}
                                title="Edit Headcount"
                              />
                            )}
                          </div>
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                  
                  {activeTab === 'interviewers' && positionId && (
                    <div className="flex-1 overflow-hidden">
                      <InterviewerTab 
                        positionId={positionId} 
                        positionTitle={position?.title || ''}
                      />
                    </div>
                  )}
                  {activeTab === 'interviewers' && !positionId && (
                    <div className={cn("h-full flex items-center justify-center", isMobile ? "p-4" : "p-6")}>
                      <div className="text-center">
                        <p className="text-muted-foreground">Position ID is missing. Please close and reopen this drawer.</p>
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'evaluation' && (
                    <div className="flex-1 overflow-hidden">
                      <EvaluationConfigTab 
                        positionId={positionId!} 
                        positionTitle={position?.title || ''}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
  );

  // On mobile, use Dialog (modal) instead of Sheet (drawer)
  if (isMobile) {
    return (
      <>
        <Dialog 
          open={isOpen} 
          onOpenChange={(open) => {
            // Prevent closing the modal when the candidate modal is open
            if (!open && isCandidateModalOpen) {
              return;
            }
            onOpenChange(open);
          }}
        >
          <DialogContent 
            className={cn(
              "fixed bottom-0 left-1/2 top-auto translate-x-[-50%] translate-y-0 w-screen max-w-none h-[90vh] p-0 overflow-hidden rounded-t-3xl rounded-b-none border-0 shadow-2xl flex flex-col"
            )}
            dialogId={`position-detail-modal-${positionId}`}
          >
            <VisuallyHidden>
              <DialogTitle>Position Details</DialogTitle>
            </VisuallyHidden>
            <DialogHeader className={cn("border-b flex-shrink-0", "p-4")}>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                {position ? position.title : 'Position Details'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {position ? `${position.department} • ${position.positionLevel || 'No level specified'}` : 'Loading position details...'}
              </p>
            </DialogHeader>
            {renderPositionContent()}
          </DialogContent>
        </Dialog>

        {/* Candidate Detail Modal */}
        {selectedCandidateId && isCandidateModalOpen && (
          <CandidateDetailModal
            candidateId={selectedCandidateId}
            open={isCandidateModalOpen}
            onClose={() => {
              setIsCandidateModalOpen(false);
              setSelectedCandidateId(null);
            }}
            onRefresh={() => {
              fetchAppliedCandidates();
              fetchAllCandidates();
              fetchPotentialCandidates();
            }}
          />
        )}
      </>
    );
  }

  // Desktop: Use Sheet (drawer)
  return (
    <>
      <Sheet 
        open={isOpen} 
        onOpenChange={(open) => {
          // Prevent closing the drawer when the candidate modal is open
          if (!open && isCandidateModalOpen) {
            return;
          }
          onOpenChange(open);
        }}
      >
        <SheetContent 
          side="right" 
          className={cn(
            "p-0",
            "w-[50vw] max-w-[50vw]"
          )} 
          sheetId={`position-drawer-${positionId}`}
        >
          <div className="h-full flex flex-col">
            <SheetHeader className={cn("border-b", "p-6")}>
              <SheetTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                {position ? position.title : 'Position Details'}
              </SheetTitle>
              <SheetDescription>
                {position ? `${position.department} • ${position.positionLevel || 'No level specified'}` : 'Loading position details...'}
              </SheetDescription>
            </SheetHeader>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : fetchError ? (
              <div className={cn("flex-1 flex items-center justify-center", "p-6")}>
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">{fetchError}</p>
                  {null}
                </div>
              </div>
            ) : position ? (
              renderPositionContent()
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {/* Candidate Detail Modal */}
      {selectedCandidateId && isCandidateModalOpen && (
        <CandidateDetailModal
          candidateId={selectedCandidateId}
          open={isCandidateModalOpen}
          onClose={() => {
            setIsCandidateModalOpen(false);
            setSelectedCandidateId(null);
          }}
          onRefresh={() => {
            fetchAppliedCandidates();
            fetchAllCandidates();
            fetchPotentialCandidates();
          }}
        />
      )}
    </>
  );
}