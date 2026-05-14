"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Briefcase, ChevronLeft, ChevronRight, FileText, Target, BrainCircuit, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { Grade } from '@/lib/types';
import { usePositionLevels } from '@/hooks/use-position-levels';
import { TiptapEditorWithExpand } from '@/components/ui/wysiwyg-editors';
import { cn } from '@/lib/utils';

const addPositionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().min(1, "Department is required"),
  description: z.string().optional().nullable(),
  matchCriteria: z.string().optional().nullable(),
  isOpen: z.boolean().default(true),
  positionLevel: z.string().optional().nullable(),
  gradeId: z.string().uuid().optional().nullable(),
  recruiterId: z.string().uuid().optional().nullable(),
});

export type AddPositionFormValues = z.infer<typeof addPositionFormSchema>;

interface AddPositionMobileDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddPosition: (data: AddPositionFormValues) => Promise<void>;
}

type Step = 'basic' | 'description' | 'criteria';

export function AddPositionMobileDrawer({ isOpen, onOpenChange, onAddPosition }: AddPositionMobileDrawerProps) {
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [isModalReady, setIsModalReady] = useState(false);
  const [defaultMatchCriteria, setDefaultMatchCriteria] = useState<string>('');
  const [isLoadingDefaultCriteria, setIsLoadingDefaultCriteria] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [showReplaceConfirmation, setShowReplaceConfirmation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const descriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [availableRecruiter, setAvailableRecruiter] = useState<{id: string, name: string, avatarUrl?: string}[]>([]);
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
    },
  });

  const watchedTitle = form.watch('title');
  const watchedDepartment = form.watch('department');
  const watchedPositionLevel = form.watch('positionLevel');

  useEffect(() => {
    if (isOpen) {
      setIsModalReady(true);
      setCurrentStep('basic');
      
      form.reset({
        title: '',
        department: '',
        description: '',
        matchCriteria: '',
        isOpen: true,
        positionLevel: '',
      });
      
      const fetchData = async () => {
        setIsLoadingDefaultCriteria(true);
        try {
          const [settingsRes, gradesRes, recruitersRes] = await Promise.all([
            fetch('/api/settings/system-settings'),
            fetch('/api/settings/grades'),
            fetch('/api/users?role=Recruiter')
          ]);

          if (settingsRes.ok) {
            const data = await settingsRes.json();
            const defaultCriteria = data.defaultMatchCriteria || '';
            setDefaultMatchCriteria(defaultCriteria);
            if (defaultCriteria && defaultCriteria.trim() !== '') {
              form.setValue('matchCriteria', defaultCriteria);
            }
          }

          if (gradesRes.ok) {
            const data = await gradesRes.json();
            setGrades(data);
          }

          if (recruitersRes.ok) {
            const data = await recruitersRes.json();
            const recruitersArray = data?.users || [];
            const availableRecruiterData = recruitersArray.map((r: any) => ({ 
              id: r.id, 
              name: r.name, 
              avatarUrl: r.avatarUrl 
            }));
            setAvailableRecruiter(availableRecruiterData);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setIsLoadingDefaultCriteria(false);
        }
      };

      fetchData();
    } else {
      setIsModalReady(false);
    }
  }, [isOpen, form]);

  const onSubmit = async (data: AddPositionFormValues) => {
    setIsSaving(true);
    try {
      await onAddPosition(data);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error adding position:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const areRequiredFieldsFilled = () => {
    return (
      watchedTitle && watchedTitle.trim() !== '' &&
      watchedDepartment && watchedDepartment.trim() !== '' &&
      watchedPositionLevel && watchedPositionLevel.trim() !== ''
    );
  };

  const generateJobDescription = async () => {
    const title = form.getValues('title');
    const department = form.getValues('department');
    const positionLevel = form.getValues('positionLevel');
    const currentDescription = form.getValues('description');

    const missingFields = [];
    if (!title || title.trim() === '') missingFields.push('Position Title');
    if (!department || department.trim() === '') missingFields.push('Department');
    if (!positionLevel || positionLevel.trim() === '') missingFields.push('Position Level');

    if (missingFields.length > 0) {
      showError(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    if (currentDescription && currentDescription.trim() !== '') {
      setShowReplaceConfirmation(true);
      return;
    }

    await performJobDescriptionGeneration(title, department, positionLevel || '');
  };

  const performJobDescriptionGeneration = async (title: string, department: string, positionLevel: string) => {
    setIsGeneratingDescription(true);
    try {
      const existingDescription = form.getValues('description');
      const response = await fetch('/api/ai/generate-job-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          department,
          positionLevel: positionLevel || 'Not specified',
          existingDescription: existingDescription || ''
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 503 && data.error?.includes('API Key')) {
          throw new Error('AI features are not configured. Please configure an AI provider and API key in System Settings > AI API Keys.');
        }
        throw new Error(data.error || 'Failed to generate job description');
      }

      if (data.description) {
        form.setValue('description', data.description);
        if (descriptionTimeoutRef.current) clearTimeout(descriptionTimeoutRef.current);
        descriptionTimeoutRef.current = setTimeout(() => {
          form.trigger('description');
        }, 100);
        showSuccess('Job description generated successfully!');
      }
    } catch (error) {
      console.error('Error generating job description:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate job description.';
      showError(errorMessage);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleConfirmReplace = async () => {
    const title = form.getValues('title');
    const department = form.getValues('department');
    const positionLevel = form.getValues('positionLevel');
    setShowReplaceConfirmation(false);
    await performJobDescriptionGeneration(title, department, positionLevel || '');
  };

  const canProceedToNextStep = () => {
    if (currentStep === 'basic') {
      const title = form.getValues('title');
      const department = form.getValues('department');
      return title && title.trim() !== '' && department && department.trim() !== '';
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 'basic') setCurrentStep('description');
    else if (currentStep === 'description') setCurrentStep('criteria');
  };

  const handleBack = () => {
    if (currentStep === 'criteria') setCurrentStep('description');
    else if (currentStep === 'description') setCurrentStep('basic');
  };

  const handleSubmit = () => {
    form.handleSubmit(onSubmit)();
  };

  useEffect(() => {
    return () => {
      if (descriptionTimeoutRef.current) clearTimeout(descriptionTimeoutRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const stepTitles = {
    basic: 'Basic Information',
    description: 'Job Description',
    criteria: 'Match Criteria'
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent 
          side="bottom" 
          className="h-[95vh] p-0 flex flex-col rounded-t-3xl"
          sheetId="add-position-mobile-drawer"
        >
          {/* Header */}
          <SheetHeader className="px-4 pt-4 pb-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <SheetTitle className="text-lg">Add Position</SheetTitle>
              </div>
              <div className="text-xs text-muted-foreground">
                Step {currentStep === 'basic' ? '1' : currentStep === 'description' ? '2' : '3'} of 3
              </div>
            </div>
            <SheetDescription className="text-left">
              {stepTitles[currentStep]}
            </SheetDescription>
          </SheetHeader>

          {/* Progress Indicator */}
          <div className="flex gap-1 px-4 py-2 flex-shrink-0">
            <div className={cn("h-1 flex-1 rounded-full transition-colors", currentStep === 'basic' ? 'bg-primary' : 'bg-primary/30')} />
            <div className={cn("h-1 flex-1 rounded-full transition-colors", currentStep === 'description' ? 'bg-primary' : currentStep === 'criteria' ? 'bg-primary/30' : 'bg-muted')} />
            <div className={cn("h-1 flex-1 rounded-full transition-colors", currentStep === 'criteria' ? 'bg-primary' : 'bg-muted')} />
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 px-4 py-4">
            <form className="space-y-4">
              {/* Step 1: Basic Information */}
              {currentStep === 'basic' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title-mobile">Position Title *</Label>
                    <Input
                      id="title-mobile"
                      placeholder="e.g., Senior Software Engineer"
                      {...form.register('title')}
                      disabled={isSaving}
                    />
                    {form.formState.errors.title && (
                      <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department-mobile">Department *</Label>
                    <Input
                      id="department-mobile"
                      placeholder="e.g., Engineering"
                      {...form.register('department')}
                      disabled={isSaving}
                    />
                    {form.formState.errors.department && (
                      <p className="text-sm text-destructive">{form.formState.errors.department.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position-level-mobile">Position Level</Label>
                    <Controller
                      name="positionLevel"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                          <SelectTrigger disabled={isSaving || isLoadingLevels}>
                            <SelectValue placeholder={isLoadingLevels ? "Loading..." : "Select level"} />
                          </SelectTrigger>
                          <SelectContent selectId="mobile-position-level">
                            <SelectItem value="none">No Level</SelectItem>
                            {positionLevels.map((level) => (
                              <SelectItem key={level.id} value={level.name}>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: level.color || '#6B7280' }} />
                                  {level.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grade-mobile">Grade</Label>
                    <Controller
                      name="gradeId"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                          <SelectContent selectId="mobile-grade">
                            <SelectItem value="none">No Grade</SelectItem>
                            {grades.map((grade) => (
                              <SelectItem key={grade.id} value={grade.id}>
                                {grade.label || grade.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recruiter-mobile">Assigned Recruiter</Label>
                    <Controller
                      name="recruiterId"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select recruiter" />
                          </SelectTrigger>
                          <SelectContent selectId="mobile-recruiter">
                            <SelectItem value="none">No Recruiter</SelectItem>
                            {availableRecruiter.map((recruiter) => (
                              <SelectItem key={recruiter.id} value={recruiter.id}>
                                {recruiter.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <Label htmlFor="isOpen-mobile">Position is Open</Label>
                    <Controller
                      name="isOpen"
                      control={form.control}
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Job Description */}
              {currentStep === 'description' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Job Description</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateJobDescription}
                      disabled={isGeneratingDescription || !areRequiredFieldsFilled()}
                      className="flex items-center gap-2"
                    >
                      <BrainCircuit className="h-3 w-3" />
                      {isGeneratingDescription ? 'Generating...' : 'AI Generate'}
                    </Button>
                  </div>
                  <Controller
                    name="description"
                    control={form.control}
                    render={({ field }) => (
                      <div className="min-h-[400px]">
                        <TiptapEditorWithExpand
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Enter job description..."
                          className="min-h-[400px]"
                          isOpen={isModalReady}
                          expandTitle="Edit Job Description"
                        />
                      </div>
                    )}
                  />
                </div>
              )}

              {/* Step 3: Match Criteria */}
              {currentStep === 'criteria' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Match Criteria</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => form.setValue('matchCriteria', defaultMatchCriteria)}
                      disabled={!defaultMatchCriteria || isLoadingDefaultCriteria}
                    >
                      Set Default
                    </Button>
                  </div>
                  <Controller
                    name="matchCriteria"
                    control={form.control}
                    render={({ field }) => (
                      <div className="min-h-[400px]">
                        <TiptapEditorWithExpand
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Enter match criteria..."
                          className="min-h-[400px]"
                          isOpen={isModalReady}
                          expandTitle="Edit Match Criteria"
                        />
                      </div>
                    )}
                  />
                </div>
              )}
            </form>
          </ScrollArea>

          {/* Footer Navigation */}
          <div className="px-4 py-3 border-t flex-shrink-0 bg-background">
            <div className="flex gap-2">
              {currentStep !== 'basic' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              {currentStep !== 'criteria' ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceedToNextStep()}
                  className="flex-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? 'Adding...' : 'Add Position'}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <AlertDialog open={showReplaceConfirmation} onOpenChange={setShowReplaceConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Existing Description?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your current job description. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplace} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
