"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Edit3, Trash2, GripVertical, Save, Loader2, ServerCrash, ShieldAlert, Settings2, X, Upload, Image as ImageIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';
import type { ApplicantSource } from '@/lib/types';
import { convertMinIOUrlToSecureUrl } from '@/lib/imageUtils';

const ApplicantSourceFormSchema = z.object({
  name: z.string().min(1, "Source name is required"),
  description: z.string().optional(),
  email: z.string().optional(),
  allowSubSource: z.boolean().default(false),
  sortOrder: z.coerce.number().int().optional().default(0),
  isActive: z.boolean().default(true),
  logo: z.any().optional(), // For file upload
});

type ApplicantSourceFormValues = z.infer<typeof ApplicantSourceFormSchema>;

export default function ApplicantSourcesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [showLogoOnly, setShowLogoOnly] = useState<boolean>(false);
  const router = useRouter();

  const [sources, setSources] = useState<ApplicantSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<ApplicantSource | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<ApplicantSource | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ApplicantSourceFormValues>({
    resolver: zodResolver(ApplicantSourceFormSchema),
    defaultValues: { 
      name: '', 
      description: '', 
      email: '', 
      allowSubSource: false, 
      sortOrder: 0, 
      isActive: true 
    },
  });

  const fetchSources = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const response = await fetch('/api/settings/Applicant-sources');
      if (!response.ok) {
        throw new Error(`Failed to fetch sources: ${response.status}`);
      }
      const data = await response.json();
      setSources(data);
    } catch (error: any) {
      console.error('Failed to fetch sources:', error);
      setFetchError(error.message);
      toast.error('Failed to load Applicant sources');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchSources();
    }
  }, [sessionStatus, fetchSources]);

  // Fetch showLogoOnly setting
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      const fetchShowLogoOnly = async () => {
        try {
          const response = await fetch('/api/settings/system-settings');
          if (response.ok) {
            const data = await response.json();
            setShowLogoOnly(data.showLogoOnly === 'true' || data.showLogoOnly === true);
          }
        } catch (error) {
          console.error('Error fetching showLogoOnly setting:', error);
        }
      };
      fetchShowLogoOnly();
    }
  }, [sessionStatus]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Set form value
      form.setValue('logo', file);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    form.setValue('logo', undefined);
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'Applicant-source-logo');

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload logo');
      }

      const result = await response.json();
      return result.url;
    } catch (error) {
      console.error('Failed to upload logo:', error);
      throw error;
    }
  };

  const handleSubmit = async (data: ApplicantSourceFormValues) => {
    try {
      setIsUploading(true);
      
      let logoUrl = editingSource?.logo || null;
      
      // Upload logo if provided
      if (data.logo && data.logo instanceof File) {
        logoUrl = await uploadLogo(data.logo);
      }

      const url = editingSource 
        ? `/api/settings/Applicant-sources/${editingSource.id}`
        : '/api/settings/Applicant-sources';
      
      const method = editingSource ? 'PUT' : 'POST';
      
      const payload = {
        ...data,
        logo: logoUrl,
      };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save source');
      }

      const result = await response.json();
      
      if (editingSource) {
        setSources(prev => prev.map(s => s.id === editingSource.id ? result : s));
        toast.success('Applicant source updated successfully');
      } else {
        setSources(prev => [...prev, result]);
        toast.success('Applicant source created successfully');
      }

      setIsModalOpen(false);
      setEditingSource(null);
      setLogoPreview(null);
      form.reset();
    } catch (error: any) {
      console.error('Failed to save source:', error);
      toast.error(error.message || 'Failed to save Applicant source');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (source: ApplicantSource) => {
    try {
      const response = await fetch(`/api/settings/Applicant-sources/${source.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete source');
      }

      setSources(prev => prev.filter(s => s.id !== source.id));
      toast.success('Applicant source deleted successfully');
      setSourceToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete source:', error);
      toast.error(error.message || 'Failed to delete Applicant source');
    }
  };

  const handleReorder = async (sourceId: string, newSortOrder: number) => {
    try {
      setIsReordering(true);
      const response = await fetch(`/api/settings/Applicant-sources/${sourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: newSortOrder }),
      });

      if (!response.ok) {
        throw new Error('Failed to update sort order');
      }

      await fetchSources(); // Refresh the list
      toast.success('Order updated successfully');
    } catch (error: any) {
      console.error('Failed to reorder:', error);
      toast.error('Failed to update order');
    } finally {
      setIsReordering(false);
    }
  };

  const openCreateModal = () => {
    setEditingSource(null);
    setLogoPreview(null);
    form.reset({ name: '', description: '', email: '', allowSubSource: false, sortOrder: 0, isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (source: ApplicantSource) => {
    setEditingSource(source);
    setLogoPreview(source.logo || null);
    form.reset({
      name: source.name,
      description: source.description || '',
      email: source.email || '',
      allowSubSource: source.allowSubSource,
      sortOrder: source.sortOrder,
      isActive: source.isActive,
    });
    setIsModalOpen(true);
  };

  if (sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (sessionStatus === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          {!showLogoOnly && (
            <h1 className="text-3xl font-bold tracking-tight">Applicant Sources</h1>
          )}
          <p className="text-muted-foreground mt-2">
            Manage Applicant source options and settings for tracking where Applicants come from.
          </p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Add Source
        </Button>
      </div>

      {fetchError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <ServerCrash className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Failed to load Applicant sources</p>
            <p className="text-sm text-destructive/80">{fetchError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSources}>
            Retry
          </Button>
        </div>
      )}

      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Logo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Sub Source</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No Applicant sources found. Create your first source to get started.
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source, index) => (
                <TableRow key={source.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  </TableCell>
                  <TableCell>
                    {source.logo ? (
                                                          <img 
                                      src={convertMinIOUrlToSecureUrl(source.logo) || source.logo} 
                                      alt={`${source.name} logo`}
                                      className="h-8 w-8 object-contain rounded-full"
                                    />
                    ) : (
                                              <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {source.description || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {source.email || '-'}
                  </TableCell>
                  <TableCell>
                    {source.allowSubSource ? (
                      <Badge variant="secondary">Enabled</Badge>
                    ) : (
                      <Badge variant="outline">Disabled</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={index === 0 || isReordering}
                        onClick={() => handleReorder(source.id, source.sortOrder - 1)}
                      >
                        ↑
                      </Button>
                      <span className="w-8 text-center">{source.sortOrder}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={index === sources.length - 1 || isReordering}
                        onClick={() => handleReorder(source.id, source.sortOrder + 1)}
                      >
                        ↓
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {source.isActive ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(source)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSourceToDelete(source)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Applicant Source</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{source.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(source)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingSource ? 'Edit Applicant Source' : 'Create Applicant Source'}
            </DialogTitle>
            <DialogDescription>
              {editingSource 
                ? 'Update the Applicant source settings below.'
                : 'Create a new Applicant source to track where Applicants come from.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting || isUploading}>
                {(form.formState.isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSource ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
