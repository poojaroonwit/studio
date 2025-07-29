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
import { Briefcase, Save, Loader2, Edit3, Users, FileText, Target } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { Position } from '@/lib/types';

// Import Editor.js
import { EditorJSEditor } from '@/components/ui/wysiwyg-editors';

const addPositionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().min(1, "Department is required"),
  description: z.string().optional().nullable(),
  matchCriteria: z.string().optional().nullable(),
  isOpen: z.boolean().default(true),
  positionLevel: z.string().optional().nullable(),
});

export type AddPositionFormValues = z.infer<typeof addPositionFormSchema>;

interface AddPositionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddPosition: (data: AddPositionFormValues) => Promise<void>;
}

export function AddPositionModal({ isOpen, onOpenChange, onAddPosition }: AddPositionModalProps) {
  const [isModalReady, setIsModalReady] = useState(false);
  const [defaultMatchCriteria, setDefaultMatchCriteria] = useState<string>('');
  
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

  useEffect(() => {
    if (isOpen) {
      setIsModalReady(true);
      // Fetch default match criteria
      const fetchDefaultMatchCriteria = async () => {
        try {
          const response = await fetch('/api/settings/system-settings');
          if (response.ok) {
            const data = await response.json();
            const defaultCriteria = data.defaultMatchCriteria || '';
            setDefaultMatchCriteria(defaultCriteria);
            // Set the default match criteria in the form
            form.setValue('matchCriteria', defaultCriteria);
          }
        } catch (error) {
          console.error('Failed to fetch default match criteria:', error);
        }
      };
      fetchDefaultMatchCriteria();
      
      form.reset({
        title: '',
        department: '',
        description: '',
        matchCriteria: '',
        isOpen: true,
        positionLevel: '',
      });
    } else {
      setIsModalReady(false);
    }
  }, [isOpen, form]);

  const onSubmit = async (data: AddPositionFormValues) => {
    await onAddPosition(data);
  };

  // Don't render anything if modal is not open
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-7xl w-full max-h-[90vh] flex flex-col p-0"> {/* Increased width for 3-column layout */}
          <DialogHeader className="px-8 pt-8 pb-6">
            <DialogTitle className="flex items-center">
              <Briefcase className="mr-2 h-5 w-5 text-primary" /> Add New Position
            </DialogTitle>
            <DialogDescription>
              Enter the details for the new job position.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 px-8 pb-6">
              {/* First Column: Basic Information */}
              <div className="space-y-6 bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <h3 className="font-medium text-sm">Basic Information</h3>
                </div>
                <div>
                  <Label htmlFor="title-add">Position Title *</Label>
                  <Input 
                    id="title-add" 
                    {...form.register('title')} 
                    className="mt-2" 
                    placeholder="Enter position title"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="department-add">Department *</Label>
                  <Input 
                    id="department-add" 
                    {...form.register('department')} 
                    className="mt-2" 
                    placeholder="Enter department name"
                  />
                  {form.formState.errors.department && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.department.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="positionLevel-add">Position Level</Label>
                  <Input 
                    id="positionLevel-add" 
                    {...form.register('positionLevel')} 
                    className="mt-2" 
                    placeholder="e.g., Senior, Mid-Level, L3"
                  />
                  {form.formState.errors.positionLevel && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.positionLevel.message}</p>
                  )}
                </div>
                <div className="flex items-center space-x-3 pt-2">
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
                  <Label htmlFor="isOpen-add">Position is Open</Label>
                </div>
              </div>
              
              {/* Second Column: Job Description */}
              <div className="flex flex-col min-h-0 bg-muted/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <Label htmlFor="description-add" className="font-medium">Job Description</Label>
                </div>
                <Controller
                  name="description"
                  control={form.control}
                  render={({ field }) => (
                    <div className="flex-1 flex flex-col min-h-0">
                      <EditorJSEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Enter job description"
                        className="flex-1 min-h-0"
                        isOpen={isModalReady}
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
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => form.setValue('matchCriteria', defaultMatchCriteria)}
                    disabled={!defaultMatchCriteria}
                  >
                    Set to Default
                  </Button>
                </div>
                <Controller
                  name="matchCriteria"
                  control={form.control}
                  render={({ field }) => (
                    <div className="flex-1 flex flex-col min-h-0">
                      <EditorJSEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Enter match criteria for this position..."
                        className="flex-1 min-h-0"
                        isOpen={isModalReady}
                      />
                    </div>
                  )}
                />
              </div>
            </div>
            
            <DialogFooter className="px-8 py-6 border-t mt-auto">
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
  );
}

