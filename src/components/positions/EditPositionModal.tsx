"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Added Card imports
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Edit3, Save, Loader2, Briefcase, FileText, Target, Users, BrainCircuit, ChevronDown, UserX } from 'lucide-react';
import type { Position, Candidate, UserProfile, Grade } from '@/lib/types';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Import Tiptap editor with expand functionality
import { TiptapEditorWithExpand } from '@/components/ui/wysiwyg-editors';

const editPositionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().min(1, "Department is required"),
  description: z.string().optional().nullable(),
  matchCriteria: z.string().optional().nullable(),
  isOpen: z.boolean().default(true),
  positionLevel: z.string().optional().nullable(),
  gradeId: z.string().uuid().optional().nullable(),
  hiringDate: z.string().optional().nullable(),
  recruiterId: z.string().uuid().optional().nullable(),
});

export type EditPositionFormValues = z.infer<typeof editPositionFormSchema>;

interface EditPositionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onEditPosition: (positionId: string, data: EditPositionFormValues) => Promise<void>;
  position: Position | null;
}

export function EditPositionModal({ isOpen, onOpenChange, onEditPosition, position }: EditPositionModalProps) {
  const [associatedCandidates, setAssociatedCandidates] = useState<Candidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isModalReady, setIsModalReady] = useState(false);
  const [defaultMatchCriteria, setDefaultMatchCriteria] = useState<string>('');
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [showReplaceConfirmation, setShowReplaceConfirmation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recruiters, setRecruiters] = useState<UserProfile[]>([]);
  const [isLoadingRecruiters, setIsLoadingRecruiters] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const { error: showError, success: showSuccess } = useToast();

  const form = useForm<EditPositionFormValues>({
    resolver: zodResolver(editPositionFormSchema),
    defaultValues: {
      title: '',
      department: '',
      description: '',
      matchCriteria: '',
      isOpen: true,
      positionLevel: '',
      recruiterId: null,
    },
  });

  useEffect(() => {
    if (position && isOpen && position.title && position.department) {
      // Set modal as ready immediately
      setIsModalReady(true);

      // Fetch default match criteria
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

      const fetchGrades = async () => {
        try {
          const response = await fetch('/api/settings/grades');
          if (response.ok) {
            const data = await response.json();
            setGrades(data);
          }
        } catch (error) {
          console.error('Error fetching grades:', error);
        }
      };
      fetchGrades();

      const fetchRecruiters = async () => {
        setIsLoadingRecruiters(true);
        try {
          const response = await fetch('/api/users?role=Recruiter');
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to fetch recruiters' }));
            throw new Error(errorData.message || `Failed to fetch recruiters: ${response.status} ${response.statusText}`);
          }
          const recruitersData = await response.json();
          if (!Array.isArray(recruitersData)) {
            throw new Error('Invalid recruiter data format received');
          }
          setRecruiters(recruitersData);
        } catch (error) {
          console.error('Error fetching recruiters:', error);
          showError(`Could not load recruiters: ${(error as Error).message}`);
          setRecruiters([]);
        } finally {
          setIsLoadingRecruiters(false);
        }
      };
      fetchRecruiters();

      const fetchCandidates = async () => {
        if (!position.id) return;
        setIsLoadingCandidates(true);
        try {
          const response = await fetch(`/api/candidates?positionId=${position.id}`);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch associated candidates');
          }
          const result = await response.json();
          const candidates: Candidate[] = result.data || [];
          setAssociatedCandidates(candidates.sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0)));
        } catch (error) {
          console.error("Error fetching associated candidates:", error);
          showError((error as Error).message || "Could not load candidates for this position.");
          setAssociatedCandidates([]);
        } finally {
          setIsLoadingCandidates(false);
        }
      };
      fetchCandidates();

    } else if (!isOpen) {
        form.reset({ title: '', department: '', description: '', matchCriteria: '', isOpen: true, positionLevel: '', recruiterId: null });
        setAssociatedCandidates([]);
        setIsModalReady(false);
        setIsSaving(false); // Reset saving state when modal closes
        setApiError(null); // Clear any API errors
    }
  }, [position?.id, isOpen, form]);

  // Separate effect for form reset
  useEffect(() => {
    if (position && isOpen && !isModalReady) {
      const newValues = {
        title: position.title ?? '',
        department: position.department ?? '',
        description: position.description ?? '',
        matchCriteria: position.matchCriteria ?? '',
        isOpen: typeof position.isOpen === 'boolean' ? position.isOpen : true,
        positionLevel: position.positionLevel ?? '',
        gradeId: position.gradeId ?? null,
        hiringDate: position.hiringDate ?? null,
        recruiterId: position.recruiterId ?? null,
      };
      

      form.reset(newValues);
    }
  }, [position, isOpen, isModalReady, form]);

  const onSubmit = async (data: EditPositionFormValues) => {
    setApiError(null);
    if (!position) {
      return;
    }
    
    // Use our own saving state instead of form.formState.isSubmitting
    if (isSaving) {
      return;
    }
    
    setIsSaving(true);
    // Always send custom_attributes for API compatibility
    const payload = { ...data, custom_attributes: {} };
    
    try {
      await onEditPosition(position.id, payload);
    } catch (err: any) {
      setApiError(err?.message || 'Failed to update position.');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if all required fields for AI generation are filled
  const areRequiredFieldsFilled = () => {
    const title = form.getValues('title');
    const department = form.getValues('department');
    const positionLevel = form.getValues('positionLevel');
    
    return title && title.trim() !== '' && 
           department && department.trim() !== '' && 
           positionLevel && positionLevel.trim() !== '';
  };

  // AI Generation function for job description
  const generateJobDescription = async () => {
    const title = form.getValues('title');
    const department = form.getValues('department');
    const positionLevel = form.getValues('positionLevel');
    const currentDescription = form.getValues('description');

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
      showError(`Please fill in the following fields first: ${missingFields.join(', ')}`);
      return;
    }

    // Check if there's existing content and show confirmation
    if (currentDescription && currentDescription.trim() !== '') {
      setShowReplaceConfirmation(true);
      return;
    }

    // If no existing content, generate directly
    await performJobDescriptionGeneration(title, department, positionLevel || '');
  };

  // Separate function to perform the actual generation
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
        
        // Add a small delay to allow Editor.js to properly render the HTML content
        setTimeout(() => {
          // Force a re-render by triggering the onChange
          const currentValue = form.getValues('description');
          if (currentValue === data.description) {
            // The value was set successfully, trigger onChange to ensure Editor.js updates
            form.trigger('description');
          }
        }, 100);
        
        showSuccess('Job description generated successfully!');
      } else {
        throw new Error('No description generated');
      }
    } catch (error) {
      console.error('Error generating job description:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate job description. Please try again.';
      showError(errorMessage);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Handle confirmation for replacing existing content
  const handleConfirmReplace = async () => {
    const title = form.getValues('title');
    const department = form.getValues('department');
    const positionLevel = form.getValues('positionLevel');
    
    setShowReplaceConfirmation(false);
    await performJobDescriptionGeneration(title, department, positionLevel || '');
  };

  // Handle cancellation of replacement
  const handleCancelReplace = () => {
    setShowReplaceConfirmation(false);
  };
  
  // Don't render anything if no position and modal is not open
  if (!position || !isOpen) return null; 

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] flex flex-col p-0"> {/* Expanded to use 95% of viewport */}
          <DialogHeader className="px-8 pt-8 pb-6">
            <DialogTitle className="flex items-center">
              <Briefcase className="mr-2 h-5 w-5 text-primary" /> Edit Position
            </DialogTitle>
            <DialogDescription>
              Update the details for this job position.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            {/* Show API error if present */}
            {apiError && (
              <div className="mx-6 mt-4 p-2 bg-destructive/10 text-destructive text-sm rounded">
                {apiError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 px-8 pb-6">
              {/* First Column: Basic Information */}
              <div className="flex flex-col min-h-0">
                <ScrollArea className="flex-1 bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <h3 className="font-medium text-sm">Basic Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title-edit" className="font-medium">Position Title *</Label>
                      <Input
                        id="title-edit"
                        placeholder="Enter position title"
                        {...form.register('title')}
                        disabled={isSaving}
                      />
                      {form.formState.errors.title && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department-edit" className="font-medium">Department *</Label>
                      <Input
                        id="department-edit"
                        placeholder="Enter department"
                        {...form.register('department')}
                        disabled={isSaving}
                      />
                      {form.formState.errors.department && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.department.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="position-level-edit" className="font-medium">Position Level *</Label>
                      <Input
                        id="position-level-edit"
                        placeholder="Enter position level (e.g., Entry Level, Senior, Manager)"
                        {...form.register('positionLevel')}
                        disabled={isSaving}
                      />
                      {form.formState.errors.positionLevel && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.positionLevel.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="grade-edit" className="font-medium">Grade</Label>
                      <Controller
                        name="gradeId"
                        control={form.control}
                        render={({ field }) => (
                          <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a grade" />
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hiring-date-edit" className="font-medium">Hiring Date</Label>
                      <Input
                        id="hiring-date-edit"
                        type="date"
                        {...form.register('hiringDate')}
                        disabled={isSaving}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recruiter-edit" className="font-medium">Assigned Recruiter</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                            disabled={isSaving || isLoadingRecruiters}
                          >
                            {isLoadingRecruiters ? (
                              <span className="text-muted-foreground">Loading recruiters...</span>
                            ) : form.watch('recruiterId') ? (
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const selectedRecruiter = recruiters.find(r => r.id === form.watch('recruiterId'));
                                  return selectedRecruiter ? (
                                    <>
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage src={selectedRecruiter.avatarUrl} />
                                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                          {selectedRecruiter.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>{selectedRecruiter.name}</span>
                                    </>
                                  ) : (
                                    <span>Unknown recruiter</span>
                                  );
                                })()}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Select a recruiter</span>
                            )}
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <div className="p-2">
                            <div className="text-sm font-medium mb-2">Select Recruiter</div>
                            
                            {/* No recruiter assigned option */}
                            <button
                              onClick={() => form.setValue('recruiterId', null)}
                              className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
                            >
                              <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <UserX className="h-3 w-3 text-gray-500" />
                              </div>
                              <div className="flex flex-col flex-1">
                                <span className="text-sm">No recruiter assigned</span>
                                <span className="text-xs text-muted-foreground">Leave position unassigned</span>
                              </div>
                              {!form.watch('recruiterId') && (
                                <div className="w-4 h-4 rounded-full bg-primary" />
                              )}
                            </button>

                            {/* Available recruiters */}
                            {recruiters.map((recruiter) => (
                              <button
                                key={recruiter.id}
                                onClick={() => form.setValue('recruiterId', recruiter.id)}
                                className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
                              >
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={recruiter.avatarUrl} />
                                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                    {recruiter.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col flex-1">
                                  <span className="text-sm font-medium">{recruiter.name}</span>
                                  <span className="text-xs text-muted-foreground">Recruiter</span>
                                </div>
                                {form.watch('recruiterId') === recruiter.id && (
                                  <div className="w-4 h-4 rounded-full bg-primary" />
                                )}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      {form.formState.errors.recruiterId && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.recruiterId.message}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <Controller
                        name="isOpen"
                        control={form.control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label htmlFor="is-active">Position is Open</Label>
                    </div>
                      
                    {/* Helper text for AI generation */}
                    <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-2">
                        <BrainCircuit className="h-3 w-3 mt-0.5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">AI Generation Requirements</p>
                          <p>Fill in Position Title, Department, and Position Level to enable AI job description generation.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
              
              {/* Second Column: Job Description */}
              <div className="flex flex-col min-h-0">
                <Card className="flex flex-col min-h-0 bg-muted/20">
                  <CardHeader className="flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <CardTitle>Job Description</CardTitle>
                        {isGeneratingDescription && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Generating...
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateJobDescription}
                        disabled={isGeneratingDescription || !areRequiredFieldsFilled()}
                        className="flex items-center gap-2"
                        title={!areRequiredFieldsFilled() ? "Please fill in Position Title, Department, and Position Level first" : "Generate job description using AI"}
                      >
                        <BrainCircuit className="h-3 w-3" />
                        {isGeneratingDescription ? 'Generating...' : "Let's AI Generate"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                    <Controller
                      name="description"
                      control={form.control}
                      render={({ field }) => (
                        <div className="flex-1 flex flex-col min-h-0">
                          <TiptapEditorWithExpand
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Enter job description"
                            className="flex-1 min-h-0"
                            isOpen={isModalReady}
                            expandTitle="Edit Job Description"
                          />
                          {form.formState.errors.description && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>
                          )}
                        </div>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Third Column: Match Criteria */}
              <div className="flex flex-col min-h-0">
                <Card className="flex flex-col min-h-0 bg-muted/20">
                  <CardHeader className="flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <CardTitle>Match Criteria</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => form.setValue('matchCriteria', defaultMatchCriteria)}
                          disabled={!defaultMatchCriteria}
                        >
                          Set to Default
                        </Button>
                        {!defaultMatchCriteria && (
                          <div className="text-xs text-muted-foreground">
                            (No default criteria set)
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                    <Controller
                      name="matchCriteria"
                      control={form.control}
                      render={({ field }) => (
                        <div className="flex-1 flex flex-col min-h-0">
                          <TiptapEditorWithExpand
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Enter match criteria for this position..."
                            className="flex-1 min-h-0"
                            isOpen={isModalReady}
                            expandTitle="Edit Match Criteria"
                          />
                          {form.formState.errors.matchCriteria && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.matchCriteria.message}</p>
                          )}
                        </div>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <DialogFooter className="p-6 pt-4 border-t mt-auto"> {/* Added padding */}
              <div className="flex items-center justify-between w-full">
                {/* Date Information */}
                {position && (position.createdAt || position.updatedAt) && (
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {position.createdAt && (
                      <div>
                        <span className="font-semibold">Created:</span> {new Date(position.createdAt).toLocaleString()}
                      </div>
                    )}
                    {position.updatedAt && (
                      <div>
                        <span className="font-semibold">Updated:</span> {new Date(position.updatedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Buttons */}
                <div className="flex gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button 
                    type="submit" 
                    disabled={isSaving} 
                    variant="default"
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Replacing Job Description */}
      <AlertDialog open={showReplaceConfirmation} onOpenChange={setShowReplaceConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Existing Job Description?</AlertDialogTitle>
            <AlertDialogDescription>
              You already have a job description for this position. Generating a new one will replace the existing content. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReplace}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplace} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Replace Description
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

