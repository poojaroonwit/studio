"use client";

import React, { useState, useEffect, useRef } from 'react';
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
import { Briefcase, Save, Loader2, Edit3, Users, FileText, Target, BrainCircuit } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Position, Grade } from '@/lib/types';
import { usePositionLevels } from '@/hooks/use-position-levels';

// Import Tiptap editor with expand functionality
import { TiptapEditorWithExpand } from '@/components/ui/wysiwyg-editors';

const addPositionFormSchema = z.object({
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

export type AddPositionFormValues = z.infer<typeof addPositionFormSchema>;

interface AddPositionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddPosition: (data: AddPositionFormValues) => Promise<void>;
}

export function AddPositionModal({ isOpen, onOpenChange, onAddPosition }: AddPositionModalProps) {
  const [isModalReady, setIsModalReady] = useState(false);
  // Add state for default match criteria
  const [defaultMatchCriteria, setDefaultMatchCriteria] = useState<string>('');
  const [isLoadingDefaultCriteria, setIsLoadingDefaultCriteria] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [showReplaceConfirmation, setShowReplaceConfirmation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const descriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [availableRecruiters, setAvailableRecruiters] = useState<{id: string, name: string, avatarUrl?: string}[]>([]);
  const { error: showError, success: showSuccess } = useToast();
  const { levels: positionLevels, isLoading: isLoadingLevels } = usePositionLevels();
  
  const form = useForm<AddPositionFormValues>({
    resolver: zodResolver(addPositionFormSchema),
    defaultValues: {
      title: '',
      department: '',
      description: '',
      matchCriteria: '',
      isOpen: true,
      positionLevel: '',
      hiringDate: new Date().toISOString().split('T')[0], // Set default to today
    },
  });

  // Use watch for real-time field values
  const watchedTitle = form.watch('title');
  const watchedDepartment = form.watch('department');
  const watchedPositionLevel = form.watch('positionLevel');

  useEffect(() => {
    if (isOpen) {
      setIsModalReady(true);
      
      // Reset form first
      form.reset({
        title: '',
        department: '',
        description: '',
        matchCriteria: '',
        isOpen: true,
        positionLevel: '',
        hiringDate: new Date().toISOString().split('T')[0], // Set default to today
      });
      
      // Fetch default match criteria and grades
      const fetchDefaultMatchCriteria = async () => {
        setIsLoadingDefaultCriteria(true);
        try {
          const response = await fetch('/api/settings/system-settings');
          if (response.ok) {
            const data = await response.json();
            const defaultCriteria = data.defaultMatchCriteria || '';
            setDefaultMatchCriteria(defaultCriteria);
          }
        } catch (error) {
          console.error('Error fetching default match criteria:', error);
        } finally {
          setIsLoadingDefaultCriteria(false);
        }
      };

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

      const fetchRecruiters = async () => {
        try {
          const response = await fetch('/api/users?role=Recruiter');
          if (response.ok) {
            const data = await response.json();
            const recruitersArray = data?.users || [];
            const availableRecruitersData = recruitersArray.map((r: any) => ({ 
              id: r.id, 
              name: r.name, 
              avatarUrl: r.avatarUrl 
            }));
            setAvailableRecruiters(availableRecruitersData);
          }
        } catch (error) {
          console.error('Error fetching recruiters:', error);
        }
      };

      try {
        fetchDefaultMatchCriteria();
        fetchGrades();
        fetchRecruiters();
      } catch (error) {
        console.error('Failed to fetch default match criteria:', error);
      } finally {
        setIsLoadingDefaultCriteria(false);
      }
    } else {
      setIsModalReady(false);
    }
  }, [isOpen, form]);

  const onSubmit = async (data: AddPositionFormValues) => {
    setIsSaving(true);
    try {
      await onAddPosition(data);
    } catch (err: any) {
      console.error('Error adding position:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Check if all required fields for AI generation are filled
  const areRequiredFieldsFilled = () => {
    return (
      watchedTitle && watchedTitle.trim() !== '' &&
      watchedDepartment && watchedDepartment.trim() !== '' &&
      watchedPositionLevel && watchedPositionLevel.trim() !== ''
    );
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
        // Clear any existing timeout
        if (descriptionTimeoutRef.current) {
          clearTimeout(descriptionTimeoutRef.current);
        }
        descriptionTimeoutRef.current = setTimeout(() => {
          // Force a re-render by triggering the onChange
          const currentValue = form.getValues('description');
          if (currentValue === data.description) {
            // The value was set successfully, trigger onChange to ensure Editor.js updates
            form.trigger('description');
          }
        }, 100);
        
        showSuccess('Job description generated successfully!');
      } else {
        console.error('No description in response:', data);
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

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (descriptionTimeoutRef.current) {
        clearTimeout(descriptionTimeoutRef.current);
      }
    };
  }, []);

  // Don't render anything if modal is not open
  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] flex flex-col p-0"> {/* Reduced to 90vh to prevent footer overlap */}
          <DialogHeader className="px-8 pt-8 pb-6 flex-shrink-0">
            <DialogTitle className="flex items-center">
              <Briefcase className="mr-2 h-5 w-5 text-primary" /> Add New Position
            </DialogTitle>
            <DialogDescription>
              Enter the details for the new job position.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 px-8 pb-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                             {/* First Column: Basic Information */}
               <div className="space-y-6 bg-muted/30 p-4 rounded-lg">
                 <div className="flex items-center gap-2 mb-4">
                   <Briefcase className="h-4 w-4 text-primary" />
                   <h3 className="font-medium text-sm">Basic Information</h3>
                 </div>
                 <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
                   <Label htmlFor="title-add" className="font-medium text-sm">Position Title *</Label>
                   <div>
                     <Input
                       id="title-add"
                       placeholder="Enter position title"
                       {...form.register('title')}
                       disabled={isSaving}
                     />
                     {form.formState.errors.title && (
                       <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
                     )}
                   </div>
                 </div>

                 <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
                   <Label htmlFor="department-add" className="font-medium text-sm">Department *</Label>
                   <div>
                     <Input
                       id="department-add"
                       placeholder="Enter department"
                       {...form.register('department')}
                       disabled={isSaving}
                     />
                     {form.formState.errors.department && (
                       <p className="text-sm text-destructive mt-1">{form.formState.errors.department.message}</p>
                     )}
                   </div>
                 </div>

                 <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
                   <Label htmlFor="position-level-add" className="font-medium text-sm">Position Level *</Label>
                   <div>
                     <Controller
                       name="positionLevel"
                       control={form.control}
                       render={({ field }) => (
                         <Select value={field.value || ''} onValueChange={field.onChange}>
                           <SelectTrigger disabled={isSaving || isLoadingLevels}>
                             <SelectValue placeholder={isLoadingLevels ? "Loading levels..." : "Select position level"} />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="">No Level</SelectItem>
                             {positionLevels.map((level) => (
                               <SelectItem key={level.id} value={level.name}>
                                 <div className="flex items-center gap-2">
                                   <div 
                                     className="w-3 h-3 rounded-full" 
                                     style={{ backgroundColor: level.color || '#6B7280' }}
                                   />
                                   {level.name}
                                 </div>
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       )}
                     />
                     {form.formState.errors.positionLevel && (
                       <p className="text-sm text-destructive mt-1">{form.formState.errors.positionLevel.message}</p>
                     )}
                   </div>
                 </div>

                 <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
                   <Label htmlFor="grade-add" className="font-medium text-sm">Grade</Label>
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

                 <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
                   <Label htmlFor="hiring-date-add" className="font-medium text-sm">Hiring Date</Label>
                   <Input
                     id="hiring-date-add"
                     type="date"
                     {...form.register('hiringDate')}
                     disabled={isSaving}
                   />
                 </div>

                 <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
                   <Label htmlFor="recruiter-add" className="font-medium text-sm">Assigned Recruiter</Label>
                   <Controller
                     name="recruiterId"
                     control={form.control}
                     render={({ field }) => (
                       <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                         <SelectTrigger>
                           <SelectValue placeholder="Select a recruiter" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="none">No Recruiter</SelectItem>
                           {availableRecruiters.map((recruiter) => (
                             <SelectItem key={recruiter.id} value={recruiter.id}>
                               {recruiter.name}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     )}
                   />
                 </div>
                 <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
                   <Label htmlFor="isOpen-add" className="font-medium text-sm">Position is Open</Label>
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
                 </div>
               </div>
              
              {/* Second Column: Job Description */}
              <div className="flex flex-col min-h-0 bg-muted/20 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <Label htmlFor="description-add" className="font-medium">Job Description</Label>
                    {isGeneratingDescription && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Generating...
                      </div>
                    )}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateJobDescription}
                          disabled={isGeneratingDescription || !areRequiredFieldsFilled()}
                          className="flex items-center gap-2"
                        >
                          <BrainCircuit className="h-3 w-3" />
                          {isGeneratingDescription ? 'Generating...' : "Let's AI Generate"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs">
                          <p className="font-medium mb-1">AI Generation Requirements</p>
                          <p className="text-sm">Fill in Position Title, Department, and Position Level to enable AI job description generation.</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
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
                    </div>
                  )}
                />
              </div>

              {/* Third Column: Match Criteria */}
              <div className="flex flex-col min-h-0 bg-muted/20 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <Label htmlFor="matchCriteria-add" className="font-medium">Match Criteria</Label>
                    {isLoadingDefaultCriteria && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading default...
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => form.setValue('matchCriteria', defaultMatchCriteria)}
                      disabled={!defaultMatchCriteria || isLoadingDefaultCriteria}
                    >
                      Set to Default
                    </Button>
                    {!defaultMatchCriteria && !isLoadingDefaultCriteria && (
                      <div className="text-xs text-muted-foreground">
                        (No default criteria set)
                      </div>
                    )}
                  </div>
                </div>
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
                    </div>
                  )}
                />
              </div>
            </div>
            </ScrollArea>
            
            <DialogFooter className="px-8 py-6 border-t flex-shrink-0">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting} variant="default">
                {form.formState.isSubmitting ? 'Adding Position...' : 'Add Position'}
              </Button>
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

