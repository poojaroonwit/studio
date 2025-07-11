"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit3, Users, Loader2, Save } from 'lucide-react';
import type { Position, Candidate } from '@/lib/types';
import { toast } from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// Import the new WYSIWYG editors
import { 
  TipTapEditor, 
  MinimalistEditor, 
  MarkdownEditor, 
  CompactEditor 
} from '@/components/ui/wysiwyg-editors';

const editPositionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().min(1, "Department is required"),
  description: z.string().optional().nullable(),
  isOpen: z.boolean().default(true),
  position_level: z.string().optional().nullable(),
});

export type EditPositionFormValues = z.infer<typeof editPositionFormSchema>;

interface EditPositionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onEditPosition: (positionId: string, data: EditPositionFormValues) => Promise<void>;
  position: Position | null;
  editorType?: 'tiptap' | 'minimalist' | 'markdown' | 'compact';
}

export function EditPositionModal({ 
  isOpen, 
  onOpenChange, 
  onEditPosition, 
  position,
  editorType = 'tiptap' 
}: EditPositionModalProps) {
  const [associatedCandidates, setAssociatedCandidates] = useState<Candidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);

  const form = useForm<EditPositionFormValues>({
    resolver: zodResolver(editPositionFormSchema),
    defaultValues: {
      title: '',
      department: '',
      description: '',
      isOpen: true,
      position_level: '',
    },
  });

  useEffect(() => {
    if (position && isOpen && position.title && position.department) {
      form.reset({
        title: position.title ?? '',
        department: position.department ?? '',
        description: position.description ?? '',
        isOpen: typeof position.isOpen === 'boolean' ? position.isOpen : true,
        position_level: position.position_level ?? '',
      });

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
          toast.error((error as Error).message || "Could not load candidates for this position.");
          setAssociatedCandidates([]);
        } finally {
          setIsLoadingCandidates(false);
        }
      };
      fetchCandidates();

    } else if (!isOpen) {
        form.reset({ title: '', department: '', description: '', isOpen: true, position_level: '' });
        setAssociatedCandidates([]);
    }
  }, [position?.id, isOpen, form]);

  const onSubmit = async (data: EditPositionFormValues) => {
    if (!position) return;
    await onEditPosition(position.id, data);
  };
  
  if (!position && isOpen) return null; 

  // Render the appropriate editor based on editorType
  const renderEditor = (field: any) => {
    const commonProps = {
      value: field.value || '',
      onChange: field.onChange,
      placeholder: "Enter job description...",
      className: "bg-background flex-1 min-h-[200px]"
    };

    switch (editorType) {
      case 'tiptap':
        return <TipTapEditor {...commonProps} />;
      case 'minimalist':
        return <MinimalistEditor {...commonProps} />;
      case 'markdown':
        return <MarkdownEditor {...commonProps} />;
      case 'compact':
        return <CompactEditor {...commonProps} />;
      default:
        return <TipTapEditor {...commonProps} />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        form.reset();
        setAssociatedCandidates([]);
      }
    }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center">
            <Edit3 className="mr-2 h-5 w-5 text-primary" /> 
            Edit Position: {position?.title}
          </DialogTitle>
          <DialogDescription>
            Update the details for this job position using the {editorType} editor.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6 flex-grow overflow-hidden p-6">
          {/* Left Column: Form */}
          <ScrollArea className="h-full">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="title-edit">Position Title *</Label>
                <Input id="title-edit" {...form.register('title')} className="mt-1" />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="department-edit">Department *</Label>
                <Input id="department-edit" {...form.register('department')} className="mt-1" />
                {form.formState.errors.department && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.department.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="position_level-edit">Position Level</Label>
                <Input 
                  id="position_level-edit" 
                  {...form.register('position_level')} 
                  className="mt-1" 
                  placeholder="e.g., Senior, Mid-Level, L3"
                />
                {form.formState.errors.position_level && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.position_level.message}</p>
                )}
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Controller
                  name="isOpen"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      id="is-active"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="is-active">Position is Open</Label>
              </div>
            </form>
          </ScrollArea>
          
          {/* Right Column: Job Description Card */}
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Job Description
                <span className="text-xs text-muted-foreground capitalize">
                  {editorType} Editor
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <Controller
                name="description"
                control={form.control}
                render={({ field }) => (
                  <div className="mt-1 flex-1 flex flex-col">
                    {renderEditor(field)}
                    {form.formState.errors.description && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.description.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter className="p-6 pt-4 border-t mt-auto">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={form.formState.isSubmitting} 
            className="btn-primary-gradient"
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 