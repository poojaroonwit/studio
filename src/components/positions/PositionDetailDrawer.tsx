"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Loader2, Briefcase, Users, Search, X, Eye, Edit, ChevronUp, ChevronDown, Save, XCircle, BrainCircuit, Target, MoreVertical } from 'lucide-react';
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
import { getPositionStatusBadge } from '@/lib/positionUtils';
import { ScoreBadge } from '@/components/ui/score-color';
import { formatScoreWithGrade } from '@/lib/scoreUtils';
import { Pagination } from '@/components/ui/pagination';
import CandidateDetailModal from '@/components/candidates/CandidateDetailModal';
import { HeadcountTab } from './HeadcountTab';

// Form schema
const editPositionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().min(1, "Department is required"),
  description: z.string().optional().nullable(),
  matchCriteria: z.string().optional().nullable(),
  isOpen: z.boolean().default(true),
  positionLevel: z.string().optional().nullable(),
  gradeId: z.string().uuid().optional().nullable(),
  hiringDate: z.string().optional().nullable(),
});

export type EditPositionFormValues = z.infer<typeof editPositionFormSchema>;

interface PositionDetailDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  positionId: string | null;
}

export function PositionDetailDrawer({ isOpen, onOpenChange, positionId }: PositionDetailDrawerProps) {
  const { data: session, status: sessionStatus } = useSession();
  
  // State for position and general data
  const [position, setPosition] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // State for candidates
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [allCandidatesPage, setAllCandidatesPage] = useState(1);
  const [allCandidatesPageSize, setAllCandidatesPageSize] = useState(20);
  const [allCandidatesTotal, setAllCandidatesTotal] = useState(0);
  const [allCandidatesSearchTerm, setAllCandidatesSearchTerm] = useState('');
  const [allCandidatesSortColumn, setAllCandidatesSortColumn] = useState<string | null>('applicationDate');
  const [allCandidatesSortDirection, setAllCandidatesSortDirection] = useState<'asc' | 'desc'>('desc');

  // State for applied candidates
  const [appliedCandidates, setAppliedCandidates] = useState<Candidate[]>([]);
  const [appliedCandidatesPage, setAppliedCandidatesPage] = useState(1);
  const [appliedCandidatesPageSize, setAppliedCandidatesPageSize] = useState(20);
  const [appliedCandidatesTotal, setAppliedCandidatesTotal] = useState(0);
  const [appliedCandidatesSearchTerm, setAppliedCandidatesSearchTerm] = useState('');
  const [appliedCandidatesSortColumn, setAppliedCandidatesSortColumn] = useState<string | null>('applicationDate');
  const [appliedCandidatesSortDirection, setAppliedCandidatesSortDirection] = useState<'asc' | 'desc'>('desc');

  // State for potential candidates
  const [potentialCandidates, setPotentialCandidates] = useState<Candidate[]>([]);
  const [potentialCandidatesPage, setPotentialCandidatesPage] = useState(1);
  const [potentialCandidatesPageSize, setPotentialCandidatesPageSize] = useState(20);
  const [potentialCandidatesTotal, setPotentialCandidatesTotal] = useState(0);
  const [potentialCandidatesSearchTerm, setPotentialCandidatesSearchTerm] = useState('');

  // Modal states
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  
  // Edit states
  const [isEditMode, setIsEditMode] = useState(false);
  const [defaultMatchCriteria, setDefaultMatchCriteria] = useState<string>('');
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [isDrawerReady, setIsDrawerReady] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);

  // Sorting state for applied candidates table
  const [appliedCandidatesOpenMenu, setAppliedCandidatesOpenMenu] = useState<string | null>(null);

  // Sorting state for potential candidates table
  const [potentialCandidatesSortColumn, setPotentialCandidatesSortColumn] = useState<string | null>('matchScore');
  const [potentialCandidatesSortDirection, setPotentialCandidatesSortDirection] = useState<'asc' | 'desc'>('desc');
  const [potentialCandidatesOpenMenu, setPotentialCandidatesOpenMenu] = useState<string | null>(null);

  // Sorting state for all candidates table
  const [allCandidatesOpenMenu, setAllCandidatesOpenMenu] = useState<string | null>(null);

  // Tab states
  const [activeTab, setActiveTab] = useState('details');
  const [activeCandidateTab, setActiveCandidateTab] = useState('applied');

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
      hiringDate: null,
    },
  });

  // Sorting handlers
  const handleAppliedCandidatesSort = (column: string | null, direction?: 'asc' | 'desc' | null) => {
    if (!column) {
      setAppliedCandidatesSortColumn(null);
      setAppliedCandidatesSortDirection('asc');
      return;
    }
    if (appliedCandidatesSortColumn === column && direction == null) {
      setAppliedCandidatesSortDirection(appliedCandidatesSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setAppliedCandidatesSortColumn(column);
      setAppliedCandidatesSortDirection(direction || 'asc');
    }
  };

  const handlePotentialCandidatesSort = (column: string | null, direction?: 'asc' | 'desc' | null) => {
    if (!column) {
      setPotentialCandidatesSortColumn(null);
      setPotentialCandidatesSortDirection('asc');
      return;
    }
    if (potentialCandidatesSortColumn === column && direction == null) {
      setPotentialCandidatesSortDirection(potentialCandidatesSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setPotentialCandidatesSortColumn(column);
      setPotentialCandidatesSortDirection(direction || 'asc');
    }
  };

  const handleAllCandidatesSort = (column: string | null, direction?: 'asc' | 'desc' | null) => {
    if (!column) {
      setAllCandidatesSortColumn(null);
      setAllCandidatesSortDirection('asc');
      return;
    }
    if (allCandidatesSortColumn === column && direction == null) {
      setAllCandidatesSortDirection(allCandidatesSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setAllCandidatesSortColumn(column);
      setAllCandidatesSortDirection(direction || 'asc');
    }
  };

  // Sortable value getters
  const getSortableValue = (candidate: Candidate, column: string) => {
    switch (column) {
      case 'name': return candidate.name?.toLowerCase() || '';
      case 'email': return candidate.email?.toLowerCase() || '';
      case 'fitScore': return candidate.fitScore || 0;
      case 'status': return candidate.status?.toLowerCase() || '';
      case 'applicationDate': return candidate.applicationDate || '';
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

  // Sorted candidates
  const sortedAppliedCandidates = useMemo(() => {
    if (!appliedCandidatesSortColumn) return appliedCandidates;
    
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
    if (!allCandidatesSortColumn) return allCandidates;
    
    return [...allCandidates].sort((a, b) => {
      const aValue = getSortableValue(a, allCandidatesSortColumn);
      const bValue = getSortableValue(b, allCandidatesSortColumn);
      if (aValue < bValue) return allCandidatesSortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return allCandidatesSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [allCandidates, allCandidatesSortColumn, allCandidatesSortDirection]);

  // Level options

  const levelOptions = [
    'Intern',
    'Junior',
    'Mid-Level',
    'Senior',
    'Lead',
    'Principal',
    'Manager',
    'Senior Manager',
    'Director',
    'Senior Director',
    'VP',
    'C-Level'
  ];

  // Fetch position data
  const fetchPosition = useCallback(async () => {
    if (!positionId) return;
    
    setIsLoading(true);
    setFetchError(null);
    
    try {
      const response = await fetch(`/api/positions/${positionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch position');
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
          hiringDate: data.hiringDate || null,
        });
       
       // Set drawer as ready for WYSIWYG editors
       setIsDrawerReady(true);
     } catch (error) {
      console.error('Error fetching position:', error);
      setFetchError((error as Error).message || 'Could not load position.');
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
      console.error('Error fetching grades:', error);
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
      if (appliedCandidatesSortColumn) {
        query.append('sortColumn', appliedCandidatesSortColumn);
      }
      if (appliedCandidatesSortDirection) {
        query.append('sortDirection', appliedCandidatesSortDirection);
      }
      
      const response = await fetch(`/api/positions/${positionId}/candidates?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch applied candidates');
      
      const data = await response.json();
      const candidates = Array.isArray(data.data) ? data.data : [];
      
      setAppliedCandidates(candidates);
      setAppliedCandidatesTotal(data.pagination?.total || candidates.length);
    } catch (error) {
      console.error('Error fetching applied candidates:', error);
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
      if (allCandidatesSortColumn) {
        query.append('sortColumn', allCandidatesSortColumn);
      }
      if (allCandidatesSortDirection) {
        query.append('sortDirection', allCandidatesSortDirection);
      }
      
      const response = await fetch(`/api/positions/${positionId}/candidates?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch all candidates');
      
      const data = await response.json();
      const candidates = Array.isArray(data.data) ? data.data : [];
      
      setAllCandidates(candidates);
      setAllCandidatesTotal(data.pagination?.total || candidates.length);
    } catch (error) {
      console.error('Error fetching all candidates:', error);
      setAllCandidates([]);
      setAllCandidatesTotal(0);
    }
  }, [positionId, allCandidatesPage, allCandidatesPageSize, allCandidatesSearchTerm, allCandidatesSortColumn, allCandidatesSortDirection, sessionStatus]);

  // Fetch potential candidates (candidates with job matches for this position but not applied)
  const fetchPotentialCandidates = useCallback(async () => {
    if (!positionId) return;
    
    try {
      const query = new URLSearchParams();
      query.append('page', String(potentialCandidatesPage));
      query.append('limit', String(potentialCandidatesPageSize));
      query.append('hasJobMatch', 'true'); // Only candidates with job matches
      query.append('notApplied', 'true'); // Exclude candidates who already applied
      if (potentialCandidatesSearchTerm) {
        query.append('searchTerm', potentialCandidatesSearchTerm);
      }
      if (potentialCandidatesSortColumn) {
        query.append('sortColumn', potentialCandidatesSortColumn);
      }
      if (potentialCandidatesSortDirection) {
        query.append('sortDirection', potentialCandidatesSortDirection);
      }
      
      // Fetch candidates who have job matches associated with this position but haven't applied
      const response = await fetch(`/api/positions/${positionId}/job-matches?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch potential candidates');
      
      const data = await response.json();
      const candidates = Array.isArray(data.data) ? data.data : [];
      
      setPotentialCandidates(candidates);
      setPotentialCandidatesTotal(data.pagination?.total || candidates.length);
    } catch (error) {
      console.error('Error fetching potential candidates:', error);
      setPotentialCandidates([]);
      setPotentialCandidatesTotal(0);
    }
  }, [positionId, potentialCandidatesPage, potentialCandidatesPageSize, potentialCandidatesSearchTerm, potentialCandidatesSortColumn, potentialCandidatesSortDirection]);

  // Handle candidate click
  const handleCandidateClick = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setIsCandidateModalOpen(true);
  };

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
        hiringDate: position.hiringDate || (position.createdAt ? new Date(position.createdAt).toISOString().split('T')[0] : null),
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
      console.error('Error updating position:', error);
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
        hiringDate: position.hiringDate || (position.createdAt ? new Date(position.createdAt).toISOString().split('T')[0] : null),
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
      console.error('Error generating job description:', error);
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
        console.error('Failed to fetch default match criteria:', error);
      }
    };
    fetchDefaultMatchCriteria();
  }, []);

  // Fetch data when drawer opens or positionId changes
  useEffect(() => {
    if (isOpen && positionId && sessionStatus === 'authenticated') {
      fetchPosition();
      fetchGrades();
      fetchAppliedCandidates();
      fetchAllCandidates();
      fetchPotentialCandidates();
    }
  }, [isOpen, positionId, sessionStatus, fetchPosition, fetchGrades, fetchAppliedCandidates, fetchAllCandidates, fetchPotentialCandidates]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      setAllCandidates([]);
      setAllCandidatesTotal(0);
      setAppliedCandidates([]);
      setAppliedCandidatesTotal(0);
      setPotentialCandidates([]);
      setPotentialCandidatesTotal(0);
      setFetchError(null);
      setAllCandidatesSearchTerm('');
      setAllCandidatesPage(1);
      setAppliedCandidatesSearchTerm('');
      setAppliedCandidatesPage(1);
      setPotentialCandidatesSearchTerm('');
      setPotentialCandidatesPage(1);
      setIsEditMode(false);
      setIsDrawerReady(false);
      form.reset();
      
      // Reset sorting state
      setAppliedCandidatesSortColumn(null);
      setAppliedCandidatesSortDirection('asc');
      setAppliedCandidatesOpenMenu(null);
      setPotentialCandidatesSortColumn(null);
      setPotentialCandidatesSortDirection('asc');
      setPotentialCandidatesOpenMenu(null);
      setAllCandidatesOpenMenu(null);
    }
  }, [isOpen, form]);

  // Refetch applied candidates when sorting or search changes
  useEffect(() => {
    if (isOpen && positionId && sessionStatus === 'authenticated') {
      fetchAppliedCandidates();
    }
  }, [appliedCandidatesPage, appliedCandidatesPageSize, appliedCandidatesSearchTerm, appliedCandidatesSortColumn, appliedCandidatesSortDirection, fetchAppliedCandidates]);

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
        hiringDate: position.hiringDate || (position.createdAt ? new Date(position.createdAt).toISOString().split('T')[0] : null),
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

  // Render applied candidates table
  const renderAppliedCandidatesTable = () => {
    if (sortedAppliedCandidates.length === 0) {
      return (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Applied Candidates</h3>
          <p className="text-muted-foreground">No candidates have applied to this position yet.</p>
        </div>
      );
    }

    let rowNumber = 1;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead className="cursor-pointer select-none group" onClick={() => handleAppliedCandidatesSort('name')}>
              <span className="inline-flex items-center gap-1">
                Candidate
                <DropdownMenu open={appliedCandidatesOpenMenu === 'name'} onOpenChange={open => setAppliedCandidatesOpenMenu(open ? 'name' : null)}>
                  <DropdownMenuTrigger asChild>
                    {appliedCandidatesSortColumn === 'name' ? (
                      <button
                        type="button"
                        className="text-primary font-bold p-1 rounded hover:bg-muted"
                        onClick={e => { e.stopPropagation(); setAppliedCandidatesOpenMenu('name'); }}
                        aria-label="Sort options"
                      >
                        {appliedCandidatesSortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                        onClick={e => { e.stopPropagation(); setAppliedCandidatesOpenMenu('name'); }}
                        aria-label="Sort options"
                      >
                        <MoreVertical size={16} />
                      </button>
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { handleAppliedCandidatesSort('name', 'asc'); setAppliedCandidatesOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { handleAppliedCandidatesSort('name', 'desc'); setAppliedCandidatesOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { handleAppliedCandidatesSort(null, null); setAppliedCandidatesOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </TableHead>
            <TableHead className="cursor-pointer select-none group" onClick={() => handleAppliedCandidatesSort('fitScore')}>
              <span className="inline-flex items-center gap-1">
                Fit Score
                <DropdownMenu open={appliedCandidatesOpenMenu === 'fitScore'} onOpenChange={open => setAppliedCandidatesOpenMenu(open ? 'fitScore' : null)}>
                  <DropdownMenuTrigger asChild>
                    {appliedCandidatesSortColumn === 'fitScore' ? (
                      <button
                        type="button"
                        className="text-primary font-bold p-1 rounded hover:bg-muted"
                        onClick={e => { e.stopPropagation(); setAppliedCandidatesOpenMenu('fitScore'); }}
                        aria-label="Sort options"
                      >
                        {appliedCandidatesSortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                        onClick={e => { e.stopPropagation(); setAppliedCandidatesOpenMenu('fitScore'); }}
                        aria-label="Sort options"
                      >
                        <MoreVertical size={16} />
                      </button>
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { handleAppliedCandidatesSort('fitScore', 'asc'); setAppliedCandidatesOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { handleAppliedCandidatesSort('fitScore', 'desc'); setAppliedCandidatesOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { handleAppliedCandidatesSort(null, null); setAppliedCandidatesOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </TableHead>
            <TableHead className="cursor-pointer select-none group" onClick={() => handleAppliedCandidatesSort('status')}>
              <span className="inline-flex items-center gap-1">
                Status
                <DropdownMenu open={appliedCandidatesOpenMenu === 'status'} onOpenChange={open => setAppliedCandidatesOpenMenu(open ? 'status' : null)}>
                  <DropdownMenuTrigger asChild>
                    {appliedCandidatesSortColumn === 'status' ? (
                      <button
                        type="button"
                        className="text-primary font-bold p-1 rounded hover:bg-muted"
                        onClick={e => { e.stopPropagation(); setAppliedCandidatesOpenMenu('status'); }}
                        aria-label="Sort options"
                      >
                        {appliedCandidatesSortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                        onClick={e => { e.stopPropagation(); setAppliedCandidatesOpenMenu('status'); }}
                        aria-label="Sort options"
                      >
                        <MoreVertical size={16} />
                      </button>
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { handleAppliedCandidatesSort('status', 'asc'); setAppliedCandidatesOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { handleAppliedCandidatesSort('status', 'desc'); setAppliedCandidatesOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { handleAppliedCandidatesSort(null, null); setAppliedCandidatesOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAppliedCandidates.map((candidate) => (
            <TableRow key={candidate.id}>
              <TableCell>{rowNumber++}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{candidate.name}</div>
                  <div className="text-xs text-muted-foreground">{candidate.email}</div>
                </div>
              </TableCell>
              <TableCell>
                {candidate.fitScore !== undefined && candidate.fitScore !== null ? (
                  <ScoreBadge score={candidate.fitScore}>
                    {formatScoreWithGrade(candidate.fitScore)}
                  </ScoreBadge>
                ) : (
                  <Badge variant="outline">No Score</Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{candidate.status || 'New'}</Badge>
              </TableCell>
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCandidateClick(candidate.id)}
                  className="hover:bg-primary/10"
                >
                  <Eye className="h-4 w-4" />
                  <span className="ml-1 text-xs">View</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Render potential candidates table
  const renderPotentialCandidatesTable = () => {
    if (sortedPotentialCandidates.length === 0) {
      return (
        <div className="text-center py-8">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Job Matches Found</h3>
          <p className="text-muted-foreground">No candidates with job matches for this position who haven't applied yet.</p>
        </div>
      );
    }

    let rowNumber = 1;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead className="cursor-pointer select-none group" onClick={() => handlePotentialCandidatesSort('name')}>
              <span className="inline-flex items-center gap-1">
                Candidate
                <DropdownMenu open={potentialCandidatesOpenMenu === 'name'} onOpenChange={open => setPotentialCandidatesOpenMenu(open ? 'name' : null)}>
                  <DropdownMenuTrigger asChild>
                    {potentialCandidatesSortColumn === 'name' ? (
                      <button
                        type="button"
                        className="text-primary font-bold p-1 rounded hover:bg-muted"
                        onClick={e => { e.stopPropagation(); setPotentialCandidatesOpenMenu('name'); }}
                        aria-label="Sort options"
                      >
                        {potentialCandidatesSortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                        onClick={e => { e.stopPropagation(); setPotentialCandidatesOpenMenu('name'); }}
                        aria-label="Sort options"
                      >
                        <MoreVertical size={16} />
                      </button>
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { handlePotentialCandidatesSort('name', 'asc'); setPotentialCandidatesOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { handlePotentialCandidatesSort('name', 'desc'); setPotentialCandidatesOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { handlePotentialCandidatesSort(null, null); setPotentialCandidatesOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </TableHead>
            <TableHead className="cursor-pointer select-none group" onClick={() => handlePotentialCandidatesSort('fitScore')}>
              <span className="inline-flex items-center gap-1">
                Fit Score
                <DropdownMenu open={potentialCandidatesOpenMenu === 'fitScore'} onOpenChange={open => setPotentialCandidatesOpenMenu(open ? 'fitScore' : null)}>
                  <DropdownMenuTrigger asChild>
                    {potentialCandidatesSortColumn === 'fitScore' ? (
                      <button
                        type="button"
                        className="text-primary font-bold p-1 rounded hover:bg-muted"
                        onClick={e => { e.stopPropagation(); setPotentialCandidatesOpenMenu('fitScore'); }}
                        aria-label="Sort options"
                      >
                        {potentialCandidatesSortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                        onClick={e => { e.stopPropagation(); setPotentialCandidatesOpenMenu('fitScore'); }}
                        aria-label="Sort options"
                      >
                        <MoreVertical size={16} />
                      </button>
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { handlePotentialCandidatesSort('fitScore', 'asc'); setPotentialCandidatesOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { handlePotentialCandidatesSort('fitScore', 'desc'); setPotentialCandidatesOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { handlePotentialCandidatesSort(null, null); setPotentialCandidatesOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </TableHead>
            <TableHead className="cursor-pointer select-none group" onClick={() => handlePotentialCandidatesSort('status')}>
              <span className="inline-flex items-center gap-1">
                Status
                <DropdownMenu open={potentialCandidatesOpenMenu === 'status'} onOpenChange={open => setPotentialCandidatesOpenMenu(open ? 'status' : null)}>
                  <DropdownMenuTrigger asChild>
                    {potentialCandidatesSortColumn === 'status' ? (
                      <button
                        type="button"
                        className="text-primary font-bold p-1 rounded hover:bg-muted"
                        onClick={e => { e.stopPropagation(); setPotentialCandidatesOpenMenu('status'); }}
                        aria-label="Sort options"
                      >
                        {potentialCandidatesSortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                        onClick={e => { e.stopPropagation(); setPotentialCandidatesOpenMenu('status'); }}
                        aria-label="Sort options"
                      >
                        <MoreVertical size={16} />
                      </button>
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { handlePotentialCandidatesSort('status', 'asc'); setPotentialCandidatesOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { handlePotentialCandidatesSort('status', 'desc'); setPotentialCandidatesOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { handlePotentialCandidatesSort(null, null); setPotentialCandidatesOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPotentialCandidates.map((candidate) => (
            <TableRow key={candidate.id}>
              <TableCell>{rowNumber++}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{candidate.name}</div>
                  <div className="text-xs text-muted-foreground">{candidate.email}</div>
                </div>
              </TableCell>
              <TableCell>
                {candidate.fitScore !== undefined && candidate.fitScore !== null ? (
                  <ScoreBadge score={candidate.fitScore}>
                    {formatScoreWithGrade(candidate.fitScore)}
                  </ScoreBadge>
                ) : (
                  <Badge variant="outline">No Score</Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{candidate.status || 'New'}</Badge>
              </TableCell>
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCandidateClick(candidate.id)}
                  className="hover:bg-primary/10"
                >
                  <Eye className="h-4 w-4" />
                  <span className="ml-1 text-xs">View</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Render candidates table (same logic as position detail page)
  const renderCandidatesTable = () => {
    let rowNumber = 1;
    return (
      <div className="space-y-4">
        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              value={allCandidatesSearchTerm}
              onChange={(e) => setAllCandidatesSearchTerm(e.target.value)}
              className="pl-10"
            />
            {allCandidatesSearchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                onClick={() => setAllCandidatesSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 text-center">#</TableHead>
                <TableHead className="cursor-pointer select-none group" onClick={() => handleAllCandidatesSort('name')}>
                  <span className="inline-flex items-center gap-1">
                    Candidate
                    <DropdownMenu open={allCandidatesOpenMenu === 'name'} onOpenChange={open => setAllCandidatesOpenMenu(open ? 'name' : null)}>
                      <DropdownMenuTrigger asChild>
                        {allCandidatesSortColumn === 'name' ? (
                          <button
                            type="button"
                            className="text-primary font-bold p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setAllCandidatesOpenMenu('name'); }}
                            aria-label="Sort options"
                          >
                            {allCandidatesSortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setAllCandidatesOpenMenu('name'); }}
                            aria-label="Sort options"
                          >
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { handleAllCandidatesSort('name', 'asc'); setAllCandidatesOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { handleAllCandidatesSort('name', 'desc'); setAllCandidatesOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { handleAllCandidatesSort(null, null); setAllCandidatesOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TableHead>
                <TableHead className="cursor-pointer select-none group" onClick={() => handleAllCandidatesSort('fitScore')}>
                  <span className="inline-flex items-center gap-1">
                    Fit Score
                    <DropdownMenu open={allCandidatesOpenMenu === 'fitScore'} onOpenChange={open => setAllCandidatesOpenMenu(open ? 'fitScore' : null)}>
                      <DropdownMenuTrigger asChild>
                        {allCandidatesSortColumn === 'fitScore' ? (
                          <button
                            type="button"
                            className="text-primary font-bold p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setAllCandidatesOpenMenu('fitScore'); }}
                            aria-label="Sort options"
                          >
                            {allCandidatesSortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setAllCandidatesOpenMenu('fitScore'); }}
                            aria-label="Sort options"
                          >
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { handleAllCandidatesSort('fitScore', 'asc'); setAllCandidatesOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { handleAllCandidatesSort('fitScore', 'desc'); setAllCandidatesOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { handleAllCandidatesSort(null, null); setAllCandidatesOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TableHead>
                <TableHead className="cursor-pointer select-none group" onClick={() => handleAllCandidatesSort('status')}>
                  <span className="inline-flex items-center gap-1">
                    Status
                    <DropdownMenu open={allCandidatesOpenMenu === 'status'} onOpenChange={open => setAllCandidatesOpenMenu(open ? 'status' : null)}>
                      <DropdownMenuTrigger asChild>
                        {allCandidatesSortColumn === 'status' ? (
                          <button
                            type="button"
                            className="text-primary font-bold p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setAllCandidatesOpenMenu('status'); }}
                            aria-label="Sort options"
                          >
                            {allCandidatesSortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                            onClick={e => { e.stopPropagation(); setAllCandidatesOpenMenu('status'); }}
                            aria-label="Sort options"
                          >
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { handleAllCandidatesSort('status', 'asc'); setAllCandidatesOpenMenu(null); }}>Sort Ascending ▲</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { handleAllCandidatesSort('status', 'desc'); setAllCandidatesOpenMenu(null); }}>Sort Descending ▼</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { handleAllCandidatesSort(null, null); setAllCandidatesOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                // Use sorted candidates for email order
                const sortedEmailOrder = sortedAllCandidates
                  .map((c) => c.email)
                  .filter((email, index, arr) => email && arr.indexOf(email) === index);
                
                return sortedEmailOrder.map((email) => {
                  const group = sortedAllCandidates.filter(c => c.email === email);
                  if (!group || group.length === 0) return null;
                  
                  if (group.length === 1) {
                    const candidate = group[0];
                    return (
                      <TableRow 
                        key={candidate.id} 
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">{rowNumber++}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{candidate.name}</div>
                            <div className="text-xs text-muted-foreground">{candidate.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {candidate.fitScore !== undefined && candidate.fitScore !== null ? (
                            <ScoreBadge score={candidate.fitScore}>
                              {formatScoreWithGrade(candidate.fitScore)}
                            </ScoreBadge>
                          ) : (
                            <Badge variant="outline">No Score</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{candidate.status || 'New'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCandidateClick(candidate.id)}
                            className="hover:bg-primary/10"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="ml-1 text-xs">View</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  } else {
                    // Handle grouped candidates (same email)
                    const isExpanded = expandedEmails[email] !== undefined ? expandedEmails[email] : true;
                    return (
                      <React.Fragment key={email}>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={99} className="p-0">
                            <div className="flex items-center gap-2 px-2 py-1 bg-muted">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setExpandedEmails((prev) => ({ ...prev, [email]: !isExpanded }))}
                                className="border border-primary"
                              >
                                {isExpanded ? <ChevronDown /> : <ChevronUp />}
                              </Button>
                              <span className="font-semibold">{email}</span>
                              <span className="text-xs text-muted-foreground">({group.length} candidates)</span>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && group.map((candidate) => (
                          <TableRow 
                            key={candidate.id} 
                            className="hover:bg-muted/50"
                          >
                            <TableCell className="text-center font-mono text-xs text-muted-foreground">{rowNumber++}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{candidate.name}</div>
                                <div className="text-xs text-muted-foreground">{candidate.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {candidate.fitScore !== undefined && candidate.fitScore !== null ? (
                                <ScoreBadge score={candidate.fitScore}>
                                  {formatScoreWithGrade(candidate.fitScore)}
                                </ScoreBadge>
                              ) : (
                                <Badge variant="outline">No Score</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{candidate.status || 'New'}</Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCandidateClick(candidate.id)}
                                className="hover:bg-primary/10"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="ml-1 text-xs">View</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  }
                });
              })()}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={allCandidatesPage}
          totalPages={allCandidatesTotalPages}
          pageSize={allCandidatesPageSize}
          total={allCandidatesTotal}
          onPageChange={setAllCandidatesPage}
          onPageSizeChange={setAllCandidatesPageSize}
        />
      </div>
    );
  };

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
        <SheetContent side="right" className="w-[50vw] min-w-[800px] max-w-none p-0">
          <div className="h-full flex flex-col">
            <SheetHeader className="p-6 border-b">
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
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">{fetchError}</p>
                  <Button onClick={fetchPosition}>Try Again</Button>
                </div>
              </div>
            ) : position ? (
              <div className="flex-1 overflow-hidden">
                <div className="h-full flex flex-col">
                  <div className="flex w-full border-b border-border/50">
                    <div
                      onClick={() => setActiveTab('details')}
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                        activeTab === 'details'
                          ? "text-primary border-b-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                    >
                      Position Details
                    </div>
                    <div
                      onClick={() => setActiveTab('criteria')}
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                        activeTab === 'criteria'
                          ? "text-primary border-b-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                    >
                      Match Criteria
                    </div>
                    <div
                      onClick={() => setActiveTab('candidates')}
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                        activeTab === 'candidates'
                          ? "text-primary border-b-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                    >
                      Candidates ({allCandidatesTotal})
                    </div>
                    <div
                      onClick={() => setActiveTab('headcount')}
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                        activeTab === 'headcount'
                          ? "text-primary border-b-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                    >
                      Headcount
                    </div>
                  </div>
                  
                  {activeTab === 'details' && (
                    <div className="flex-1 overflow-y-auto p-6">
                    <ScrollArea className="h-full">
                      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                        {/* Header with Edit Button */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                              <Briefcase className="h-6 w-6 text-primary" />
                              Position Details
                            </h2>
                            <p className="mt-2 text-muted-foreground">
                              {isEditMode ? 'Edit position information' : 'View position details'}
                            </p>
                          </div>
                          {!isEditMode ? (
                            <Button variant="outline" onClick={handleEdit}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                              <Button type="submit" disabled={isSaving}>
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4 mr-2" />
                                )}
                                Save
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Position Information Form */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Position Title */}
                          <div className="space-y-2">
                            <Label htmlFor="title">Position Title *</Label>
                            {isEditMode ? (
                              <Controller
                                name="title"
                                control={form.control}
                                render={({ field }) => (
                                  <Input
                                    {...field}
                                    placeholder="Enter position title"
                                    className={form.formState.errors.title ? 'border-red-500' : ''}
                                  />
                                )}
                              />
                            ) : (
                              <div className="text-base font-medium">{position.title}</div>
                            )}
                            {form.formState.errors.title && (
                              <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
                            )}
                          </div>

                          {/* Department */}
                          <div className="space-y-2">
                            <Label htmlFor="department">Department *</Label>
                            {isEditMode ? (
                              <Controller
                                name="department"
                                control={form.control}
                                render={({ field }) => (
                                  <Input
                                    {...field}
                                    placeholder="Enter department"
                                    className={form.formState.errors.department ? 'border-red-500' : ''}
                                  />
                                )}
                              />
                            ) : (
                              <div className="text-base">{position.department}</div>
                            )}
                            {form.formState.errors.department && (
                              <p className="text-sm text-red-500">{form.formState.errors.department.message}</p>
                            )}
                          </div>

                          {/* Position Level */}
                          <div className="space-y-2">
                            <Label htmlFor="positionLevel">Position Level</Label>
                            {isEditMode ? (
                              <Controller
                                name="positionLevel"
                                control={form.control}
                                render={({ field }) => (
                                  <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {levelOptions.map((level) => (
                                        <SelectItem key={level} value={level}>
                                          {level}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            ) : (
                              <div className="text-base">{position.positionLevel || 'Not specified'}</div>
                            )}
                          </div>



                          {/* Grade */}
                          <div className="space-y-2">
                            <Label htmlFor="gradeId">Grade</Label>
                            {isEditMode ? (
                                               <Controller
                   name="gradeId"
                   control={form.control}
                   render={({ field }) => (
                     <Select onValueChange={(value) => field.onChange(value === 'none' ? null : value)} value={field.value || 'none'}>
                       <SelectTrigger>
                         <SelectValue placeholder="Select grade" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="none">No Grade</SelectItem>
                         {grades.map((grade) => (
                           <SelectItem key={grade.id} value={grade.id}>
                             {grade.name} {grade.label && `- ${grade.label}`} ({grade.slaDays} days SLA)
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   )}
                 />
                            ) : (
                              position.gradeId && position.grade ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                      style={{
                                        borderColor: position.grade.color || '#3B82F6',
                                        color: position.grade.color || '#3B82F6'
                                      }}
                                    >
                                      {position.grade.name}
                                    </Badge>
                                    {position.grade.label && (
                                      <span className="text-sm text-muted-foreground">
                                        {position.grade.label}
                                      </span>
                                    )}
                                  </div>
                                  {(() => {
                                    if (position.hiringDate && position.grade?.slaDays) {
                                      const hiringDate = new Date(position.hiringDate);
                                      const slaEndDate = new Date(hiringDate.getTime() + (position.grade.slaDays * 24 * 60 * 60 * 1000));
                                      const now = new Date();
                                      const daysLeft = Math.ceil((slaEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
                                      
                                      if (daysLeft > 0) {
                                        return (
                                          <div className="text-xs text-muted-foreground">
                                            SLA: {daysLeft} days left
                                          </div>
                                        );
                                      } else if (daysLeft === 0) {
                                        return (
                                          <div className="text-xs text-orange-600">
                                            SLA: Due today
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <div className="text-xs text-red-600">
                                            SLA: {Math.abs(daysLeft)} days overdue
                                          </div>
                                        );
                                      }
                                    }
                                    return null;
                                  })()}
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/50 bg-muted/20">
                                  No Grade
                                </Badge>
                              )
                            )}
                          </div>

                          {/* Hiring Date */}
                          <div className="space-y-2">
                            <Label htmlFor="hiringDate">Start Hiring Date</Label>
                            {isEditMode ? (
                              <Controller
                                name="hiringDate"
                                control={form.control}
                                render={({ field }) => (
                                  <Input type="date" value={field.value || ''} onChange={field.onChange} />
                                )}
                              />
                            ) : (
                              position.hiringDate ? (
                                <div className="text-base">{format(parseISO(position.hiringDate), 'PPP')}</div>
                              ) : (
                                <div className="text-base text-muted-foreground">Not set</div>
                              )
                            )}
                          </div>

                          {/* Status */}
                          <div className="space-y-2">
                            <Label htmlFor="isOpen">Status</Label>
                            {isEditMode ? (
                              <Controller
                                name="isOpen"
                                control={form.control}
                                render={({ field }) => (
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                    <span className="text-sm">
                                      {field.value ? 'Open' : 'Closed'}
                                    </span>
                                  </div>
                                )}
                              />
                            ) : (
                              <div className="text-base">
                                {(() => {
                                  const statusBadge = getPositionStatusBadge(position.isOpen, false);
                                  return (
                                    <Badge 
                                      variant={statusBadge.variant}
                                      className={statusBadge.className}
                                    >
                                      {statusBadge.text}
                                    </Badge>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Job Description */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              📄 Job Description
                            </h3>
                            {isEditMode && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={generateJobDescription}
                                disabled={isGeneratingDescription}
                              >
                                {isGeneratingDescription ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <BrainCircuit className="h-4 w-4 mr-2" />
                                )}
                                Generate with AI
                              </Button>
                            )}
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            {isEditMode ? (
                                                             <Controller
                                 name="description"
                                 control={form.control}
                                 render={({ field }) => (
                                   <div className="flex-1 flex flex-col min-h-0">
                                     <TiptapEditorWithExpand
                                       value={field.value || ''}
                                       onChange={field.onChange}
                                       placeholder="Enter job description..."
                                       className="flex-1 min-h-[200px]"
                                       isOpen={isDrawerReady}
                                       expandTitle="Edit Job Description"
                                     />
                                   </div>
                                 )}
                               />
                            ) : (
                              position.description ? (
                                <div 
                                  className="wysiwyg-content prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: position.description }}
                                />
                              ) : (
                                <div className="text-center py-8">
                                  <div className="text-muted-foreground">
                                    <div className="text-4xl mb-4">📄</div>
                                    <h4 className="text-lg font-medium mb-2">No job description</h4>
                                    <p className="text-sm">Click Edit to add a job description for this position.</p>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </form>
                    </ScrollArea>
                    </div>
                  )}
                  
                  {activeTab === 'criteria' && (
                    <div className="flex-1 overflow-y-auto p-6">
                    <ScrollArea className="h-full">
                      <div className="space-y-6">
                        {/* Match Criteria Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                              🎯 Match Criteria
                            </h2>
                            <p className="mt-2 text-muted-foreground">
                              Requirements and criteria for candidate matching
                            </p>
                          </div>
                          {!isEditMode ? (
                            <Button variant="outline" onClick={handleEdit}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={useDefaultCriteria} disabled={!defaultMatchCriteria}>
                                <Target className="h-4 w-4 mr-2" />
                                Set to Default
                              </Button>
                              {!defaultMatchCriteria && (
                                <div className="text-xs text-muted-foreground flex items-center">
                                  (No default criteria set in system settings)
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Match Criteria Content */}
                        <div className="border rounded-lg p-6">
                          {isEditMode ? (
                                                         <Controller
                               name="matchCriteria"
                               control={form.control}
                               render={({ field }) => (
                                 <div className="flex-1 flex flex-col min-h-0">
                                   <TiptapEditorWithExpand
                                     value={field.value || ''}
                                     onChange={field.onChange}
                                     placeholder="Enter match criteria..."
                                     className="flex-1 min-h-[300px]"
                                     isOpen={isDrawerReady}
                                     expandTitle="Edit Match Criteria"
                                   />
                                 </div>
                               )}
                             />
                          ) : (
                            position.matchCriteria ? (
                              <div 
                                className="wysiwyg-content prose prose-base max-w-none"
                                dangerouslySetInnerHTML={{ __html: position.matchCriteria }}
                              />
                            ) : (
                              <div className="text-center py-12">
                                <div className="text-muted-foreground">
                                  <div className="text-4xl mb-4">🎯</div>
                                  <h3 className="text-lg font-medium mb-2">No match criteria defined</h3>
                                  <p className="text-sm">Click Edit to add match criteria for this position.</p>
                                </div>
                              </div>
                            )
                          )}
                        </div>

                        {/* Form Submit Buttons for Criteria Tab */}
                        {isEditMode && (
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                            <Button onClick={form.handleSubmit(handleSave)} disabled={isSaving}>
                              {isSaving ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4 mr-2" />
                              )}
                              Save
                            </Button>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                    </div>
                  )}
                  
                  {activeTab === 'candidates' && (
                    <div className="h-full flex flex-col p-6">
                      {/* Candidates Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-bold flex items-center gap-3">
                            <Users className="h-6 w-6 text-primary" />
                            Candidates ({allCandidatesTotal + potentialCandidatesTotal})
                          </h2>
                          <p className="mt-2 text-muted-foreground">
                            Applied candidates and job matches for this position
                          </p>
                        </div>
                      </div>

                      {/* Candidate Sub-tabs */}
                      <div className="flex-1 overflow-hidden">
                        <div className="h-full flex flex-col">
                          <div className="flex w-full border-b border-border/50 mb-4">
                            <div
                              onClick={() => setActiveCandidateTab('applied')}
                              className={cn(
                                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                                activeCandidateTab === 'applied'
                                  ? "text-primary border-b-2 border-primary"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                              )}
                            >
                              Applied Candidates ({appliedCandidatesCount})
                            </div>
                            <div
                              onClick={() => setActiveCandidateTab('potential')}
                              className={cn(
                                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                                activeCandidateTab === 'potential'
                                  ? "text-primary border-b-2 border-primary"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                              )}
                            >
                              Job Matches ({potentialCandidatesTotal})
                            </div>
                          </div>
                          
                          {activeCandidateTab === 'applied' && (
                            <div className="space-y-4 h-full flex flex-col">
                              {/* Search and Filters for Applied */}
                              <div className="flex items-center gap-4">
                                <div className="relative flex-1">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                  <Input
                                    placeholder="Search applied candidates..."
                                    value={appliedCandidatesSearchTerm}
                                    onChange={(e) => setAppliedCandidatesSearchTerm(e.target.value)}
                                    className="pl-10"
                                  />
                                  {appliedCandidatesSearchTerm && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                                      onClick={() => setAppliedCandidatesSearchTerm('')}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Applied Candidates Table */}
                              <div className="border rounded-lg flex-1 overflow-hidden">
                                <ScrollArea className="h-full">
                                  {renderAppliedCandidatesTable()}
                                </ScrollArea>
                              </div>

                              {/* Pagination for Applied */}
                              {appliedCandidatesTotal > 0 && (
                                <Pagination
                                  currentPage={appliedCandidatesPage}
                                  totalPages={Math.max(1, Math.ceil(appliedCandidatesTotal / appliedCandidatesPageSize))}
                                  pageSize={appliedCandidatesPageSize}
                                  total={appliedCandidatesTotal}
                                  onPageChange={setAppliedCandidatesPage}
                                  onPageSizeChange={setAppliedCandidatesPageSize}
                                />
                              )}
                            </div>
                          )}
                          
                          {activeCandidateTab === 'potential' && (
                            <div className="space-y-4 h-full flex flex-col">
                              {/* Search and Filters for Potential */}
                              <div className="flex items-center gap-4">
                                <div className="relative flex-1">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                  <Input
                                    placeholder="Search job matches..."
                                    value={potentialCandidatesSearchTerm}
                                    onChange={(e) => setPotentialCandidatesSearchTerm(e.target.value)}
                                    className="pl-10"
                                  />
                                </div>
                              </div>

                              {/* Potential Candidates Table */}
                              <div className="border rounded-lg flex-1 overflow-hidden">
                                <ScrollArea className="h-full">
                                  {renderPotentialCandidatesTable()}
                                </ScrollArea>
                              </div>

                              {/* Pagination for Potential */}
                              {potentialCandidatesTotalPages > 1 && (
                                <Pagination
                                  currentPage={potentialCandidatesPage}
                                  totalPages={potentialCandidatesTotalPages}
                                  pageSize={potentialCandidatesPageSize}
                                  total={potentialCandidatesTotal}
                                  onPageChange={setPotentialCandidatesPage}
                                  onPageSizeChange={setPotentialCandidatesPageSize}
                                />
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                    </div>
                  )}
                  
                  {activeTab === 'headcount' && (
                    <div className="h-full flex flex-col p-6">
                      <HeadcountTab 
                        positionId={positionId!} 
                        candidates={allCandidates}
                      />
                    </div>
                  )}
                </div>
              </div>
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
        />
      )}
    </>
  );
}