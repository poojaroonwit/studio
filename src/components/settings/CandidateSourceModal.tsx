"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { CandidateSource } from '@/lib/types';
import { useClickProtection } from '@/hooks/use-click-protection';

const candidateSourceFormSchema = z.object({
  name: z.string().min(1, "Source name is required"),
  description: z.string().optional(),
  email: z.string().optional(),
  allowSubSource: z.boolean().default(false),
  sortOrder: z.coerce.number().int().optional().default(0),
  isActive: z.boolean().default(true),
  logo: z.any().optional(),
});

type CandidateSourceFormValues = z.infer<typeof candidateSourceFormSchema>;

interface CandidateSourceModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CandidateSourceFormValues) => Promise<void>;
  source?: CandidateSource | null;
}

export default function CandidateSourceModal({ 
  open, 
  onClose, 
  onSubmit, 
  source 
}: CandidateSourceModalProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const { isActioning, handleProtectedAsyncClick } = useClickProtection({
    actionName: 'candidate source',
    debounceMs: 200,
    timeoutMs: 500
  });

  const form = useForm<CandidateSourceFormValues>({
    resolver: zodResolver(candidateSourceFormSchema),
    defaultValues: { 
      name: '', 
      description: '', 
      email: '', 
      allowSubSource: false, 
      sortOrder: 0, 
      isActive: true 
    },
  });

  useEffect(() => {
    if (source) {
      form.reset({
        name: source.name,
        description: source.description || '',
        email: source.email || '',
        allowSubSource: source.allowSubSource,
        sortOrder: source.sortOrder,
        isActive: source.isActive,
      });
      setLogoPreview(source.logo || null);
    } else {
      form.reset({ 
        name: '', 
        description: '', 
        email: '', 
        allowSubSource: false, 
        sortOrder: 0, 
        isActive: true 
      });
      setLogoPreview(null);
    }
  }, [source, form, open]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue('logo', file);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    form.setValue('logo', undefined);
  };

  const handleSubmit = async (data: CandidateSourceFormValues) => {
    await handleProtectedAsyncClick(async () => {
      try {
        setIsUploading(true);
        await onSubmit(data);
        onClose();
      } catch (error) {
        console.error('Failed to submit:', error);
      } finally {
        setIsUploading(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {source ? 'Edit Candidate Source' : 'Create Candidate Source'}
          </DialogTitle>
          <DialogDescription>
            {source 
              ? 'Update the candidate source settings below.'
              : 'Create a new candidate source to track where candidates come from.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 max-h-[60vh]">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pr-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="e.g., JobDB, JobThai, Referral"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Optional description of this source"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email List</Label>
              <Input
                id="email"
                {...form.register('email')}
                placeholder="e.g., source@company.com, contact@source.com"
              />
              <p className="text-sm text-muted-foreground">
                Comma-separated list of email addresses for this source
              </p>
            </div>

            <div className="space-y-4">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {logoPreview && (
                  <div className="relative">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="h-16 w-16 object-contain rounded-full border"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <Label 
                    htmlFor="logo" 
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-dashed border-muted-foreground/25 rounded-lg hover:border-muted-foreground/50 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Recommended: 64x64px or larger, PNG/JPG format
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="allowSubSource">Allow Sub Source</Label>
                <p className="text-sm text-muted-foreground">
                  Enable free text input for additional source details
                </p>
              </div>
              <Switch
                id="allowSubSource"
                checked={form.watch('allowSubSource')}
                onCheckedChange={(checked) => form.setValue('allowSubSource', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                {...form.register('sortOrder')}
                placeholder="0"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="isActive">Active</Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable this source option
                </p>
              </div>
              <Switch
                id="isActive"
                checked={form.watch('isActive')}
                onCheckedChange={(checked) => form.setValue('isActive', checked)}
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" disabled={form.formState.isSubmitting || isUploading || isActioning} onClick={form.handleSubmit(handleSubmit)}>
            {(form.formState.isSubmitting || isUploading || isActioning) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {source ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
