"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Briefcase, Users, Search, X, Eye, Edit, ChevronUp, ChevronDown, Save, XCircle, BrainCircuit, Target } from 'lucide-react';
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
import type { Position, Candidate } from '@/lib/types';
import { getPositionStatusBadge } from '@/lib/positionUtils';
import { ScoreBadge } from '@/components/ui/score-color';
import { formatScoreWithGrade } from '@/lib/scoreUtils';
import { Pagination } from '@/components/ui/pagination';
import CandidateDetailModal from '@/components/candidates/CandidateDetailModal';

// Form schema
const editPositionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().min(1, "Department is required"),
  description: z.string().optional().nullable(),
  matchCriteria: z.string().optional().nullable(),
  isOpen: z.boolean().default(true),
  positionLevel: z.string().optional().nullable(),
});

export type EditPositionFormValues = z.infer<typeof editPositionFormSchema>;

interface PositionDetailDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  positionId: string | null;
}

export function PositionDetailDrawer({ isOpen, onOpenChange, positionId }: PositionDetailDrawerProps) {
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
  const [allCandidatesSortColumn, setAllCandidatesSortColumn] = useState<string>('applicationDate');
  const [allCandidatesSortDirection, setAllCandidatesSortDirection] = useState<'asc' | 'desc'>('desc');

  // State for potential candidates
  const [potentialCandidates, setPotentialCandidates] = useState<Candidate[]>([]);
  const [potentialCandidatesPage, setPotentialCandidatesPage] = useState(1);
  const [potentialCandidatesPageSize, setPotentialCandidatesPageSize] = useState(20);
  const [potentialCandidatesTotal, setPotentialCandidatesTotal] = useState(0);
  const [potentialCandidatesSearchTerm, setPotentialCandidatesSearchTerm] = useState('');
  const [potentialCandidatesSortColumn, setPotentialCandidatesSortColumn] = useState<string>('matchScore');
  const [potentialCandidatesSortDirection, setPotentialCandidatesSortDirection] = useState<'asc' | 'desc'>('desc');

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
    },
  });

  // Calculate total pages for pagination
  const allCandidatesTotalPages = useMemo(() => 
    Math.max(1, Math.ceil(allCandidatesTotal / allCandidatesPageSize)), 
    [allCandidatesTotal, allCandidatesPageSize]
  );

  const potentialCandidatesTotalPages = useMemo(() => 
    Math.max(1, Math.ceil(potentialCandidatesTotal / potentialCandidatesPageSize)), 
    [potentialCandidatesTotal, potentialCandidatesPageSize]
  );

  // Department and level options
  const departmentOptions = [
    'Engineering',
    'Product',
    'Design',
    'Marketing',
    'Sales',
    'Operations',
    'Finance',
    'Human Resources',
    'Customer Success',
    'Legal',
    'Other'
  ];

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

  // Fetch all candidates related to this position
  const fetchAllCandidates = useCallback(async () => {
    if (!positionId) return;
    
    try {
      const query = new URLSearchParams();
      query.append('page', String(allCandidatesPage));
      query.append('limit', String(allCandidatesPageSize));
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
  }, [positionId, allCandidatesPage, allCandidatesPageSize, allCandidatesSearchTerm, allCandidatesSortColumn, allCandidatesSortDirection]);

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
    allCandidates.forEach((c) => {
      if (!c.email) return;
      if (!groups[c.email]) groups[c.email] = [];
      groups[c.email].push(c);
    });
    return groups;
  }, [allCandidates]);

  const emailOrder = useMemo(() => {
    const seen = new Set<string>();
    return allCandidates
      .map((c) => c.email)
      .filter((email) => email && !seen.has(email) && seen.add(email));
  }, [allCandidates]);

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
    if (isOpen && positionId) {
      fetchPosition();
      fetchAllCandidates();
      fetchPotentialCandidates();
    }
  }, [isOpen, positionId, fetchPosition, fetchAllCandidates, fetchPotentialCandidates]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      setAllCandidates([]);
      setPotentialCandidates([]);
      setFetchError(null);
      setAllCandidatesSearchTerm('');
      setAllCandidatesPage(1);
      setPotentialCandidatesSearchTerm('');
      setPotentialCandidatesPage(1);
      setIsEditMode(false);
      setIsDrawerReady(false);
      form.reset();
    }
  }, [isOpen, form]);

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
    if (allCandidates.length === 0) {
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
            <TableHead>Candidate</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Experience</TableHead>
            <TableHead>Applied Date</TableHead>
            <TableHead>Match Score</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allCandidates.map((candidate) => (
            <TableRow key={candidate.id}>
              <TableCell>{rowNumber++}</TableCell>
              <TableCell className="cursor-pointer" onClick={() => handleCandidateClick(candidate.id)}>
                <div>
                  <div className="font-medium">{candidate.firstName} {candidate.lastName}</div>
                  <div className="text-sm text-muted-foreground">{candidate.title || 'No title'}</div>
                </div>
              </TableCell>
              <TableCell>{candidate.email}</TableCell>
              <TableCell>{candidate.experience || 'N/A'}</TableCell>
              <TableCell>{candidate.appliedAt ? format(parseISO(candidate.appliedAt), 'MMM dd, yyyy') : 'N/A'}</TableCell>
              <TableCell>
                {candidate.matchScore ? (
                  <ScoreBadge score={candidate.matchScore} />
                ) : (
                  <Badge variant="outline">No Score</Badge>
                )}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => handleCandidateClick(candidate.id)}>
                  <Eye className="h-4 w-4" />
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
    if (potentialCandidates.length === 0) {
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
            <TableHead>Candidate</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Experience</TableHead>
            <TableHead>Job Match Score</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {potentialCandidates.map((candidate) => (
            <TableRow key={candidate.id}>
              <TableCell>{rowNumber++}</TableCell>
              <TableCell className="cursor-pointer" onClick={() => handleCandidateClick(candidate.id)}>
                <div>
                  <div className="font-medium">{candidate.firstName} {candidate.lastName}</div>
                  <div className="text-sm text-muted-foreground">{candidate.title || 'No title'}</div>
                </div>
              </TableCell>
              <TableCell>{candidate.email}</TableCell>
              <TableCell>{candidate.experience || 'N/A'}</TableCell>
              <TableCell>
                {candidate.matchScore ? (
                  <ScoreBadge score={candidate.matchScore} />
                ) : (
                  <Badge variant="outline">No Score</Badge>
                )}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => handleCandidateClick(candidate.id)}>
                  <Eye className="h-4 w-4" />
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
                <TableHead>Name / Email</TableHead>
                <TableHead>Fit Score</TableHead>
                <TableHead>Recruiter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied Date</TableHead>
                <TableHead>Association</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emailOrder.map((email) => {
                const group = candidatesByEmail[email];
                if (!group || group.length === 0) return null;
                
                if (group.length === 1) {
                  const candidate = group[0];
                  return (
                    <TableRow 
                      key={candidate.id} 
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleCandidateClick(candidate.id)}
                    >
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">{rowNumber++}</TableCell>
                      <TableCell>
                        <div>
                          {candidate.name}
                          <div className="text-xs text-muted-foreground">{candidate.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {candidate.fitScore !== undefined && candidate.fitScore !== null ? (
                          <ScoreBadge score={candidate.fitScore}>
                            {formatScoreWithGrade(candidate.fitScore)}
                          </ScoreBadge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{candidate.recruiter?.name || 'Unassigned'}</TableCell>
                      <TableCell><Badge variant="outline">{candidate.status || 'New'}</Badge></TableCell>
                      <TableCell>
                        {candidate.applicationDate ? (
                          <span title={format(parseISO(candidate.applicationDate), 'PPP')}>
                            {format(parseISO(candidate.applicationDate), 'MMM dd, yyyy')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          if (candidate.associationType) {
                            switch (candidate.associationType) {
                              case 'applied_and_matched':
                                return <Badge variant="default">Applied & Matched</Badge>;
                              case 'applied':
                                return <Badge variant="default">Applied</Badge>;
                              case 'matched':
                                return <Badge variant="secondary">Matched</Badge>;
                              default:
                                return <Badge variant="outline">Unknown</Badge>;
                            }
                          }
                          return <Badge variant="outline">Unknown</Badge>;
                        })()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCandidateClick(candidate.id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
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
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleCandidateClick(candidate.id)}
                        >
                          <TableCell className="text-center font-mono text-xs text-muted-foreground">{rowNumber++}</TableCell>
                          <TableCell>
                            <div>
                              {candidate.name}
                              <div className="text-xs text-muted-foreground">{candidate.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {candidate.fitScore !== undefined && candidate.fitScore !== null ? (
                              <ScoreBadge score={candidate.fitScore}>
                                {formatScoreWithGrade(candidate.fitScore)}
                              </ScoreBadge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>{candidate.recruiter?.name || 'Unassigned'}</TableCell>
                          <TableCell><Badge variant="outline">{candidate.status || 'New'}</Badge></TableCell>
                          <TableCell>
                            {candidate.applicationDate ? (
                              <span title={format(parseISO(candidate.applicationDate), 'PPP')}>
                                {format(parseISO(candidate.applicationDate), 'MMM dd, yyyy')}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              if (candidate.associationType) {
                                switch (candidate.associationType) {
                                  case 'applied_and_matched':
                                    return <Badge variant="default">Applied & Matched</Badge>;
                                  case 'applied':
                                    return <Badge variant="default">Applied</Badge>;
                                  case 'matched':
                                    return <Badge variant="secondary">Matched</Badge>;
                                  default:
                                    return <Badge variant="outline">Unknown</Badge>;
                                }
                              }
                              return <Badge variant="outline">Unknown</Badge>;
                            })()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCandidateClick(candidate.id);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                }
              })}
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
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
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
                <Tabs defaultValue="details" className="h-full flex flex-col">
                  <TabsList className="mx-6 mt-4 grid w-full grid-cols-3">
                    <TabsTrigger value="details">Position Details</TabsTrigger>
                    <TabsTrigger value="criteria">Match Criteria</TabsTrigger>
                    <TabsTrigger value="candidates">Candidates ({allCandidatesTotal})</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details" className="flex-1 overflow-y-auto p-6 m-0">
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
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className={form.formState.errors.department ? 'border-red-500' : ''}>
                                      <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {departmentOptions.map((dept) => (
                                        <SelectItem key={dept} value={dept}>
                                          {dept}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
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
                  </TabsContent>
                  
                  <TabsContent value="criteria" className="flex-1 overflow-y-auto p-6 m-0">
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
                                Use Default
                              </Button>
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
                  </TabsContent>
                  
                  <TabsContent value="candidates" className="flex-1 overflow-hidden p-6 m-0">
                    <div className="h-full flex flex-col">
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
                        <Tabs defaultValue="applied" className="h-full flex flex-col">
                          <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="applied">Applied Candidates ({allCandidatesTotal})</TabsTrigger>
                            <TabsTrigger value="potential">Job Matches ({potentialCandidatesTotal})</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="applied" className="flex-1 overflow-hidden m-0">
                            <div className="space-y-4 h-full flex flex-col">
                              {/* Search and Filters for Applied */}
                              <div className="flex items-center gap-4">
                                <div className="relative flex-1">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                  <Input
                                    placeholder="Search applied candidates..."
                                    value={allCandidatesSearchTerm}
                                    onChange={(e) => setAllCandidatesSearchTerm(e.target.value)}
                                    className="pl-10"
                                  />
                                </div>
                              </div>

                              {/* Applied Candidates Table */}
                              <div className="border rounded-lg flex-1 overflow-hidden">
                                <ScrollArea className="h-full">
                                  {renderAppliedCandidatesTable()}
                                </ScrollArea>
                              </div>

                              {/* Pagination for Applied */}
                              {allCandidatesTotalPages > 1 && (
                                <Pagination
                                  currentPage={allCandidatesPage}
                                  totalPages={allCandidatesTotalPages}
                                  onPageChange={setAllCandidatesPage}
                                />
                              )}
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="potential" className="flex-1 overflow-hidden m-0">
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
                                  onPageChange={setPotentialCandidatesPage}
                                />
                              )}
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
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