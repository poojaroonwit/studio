// src/app/settings/stages/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSession, signIn } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import type { RecruitmentStage } from '@/lib/types';
import { PlusCircle, Edit3, Trash2, KanbanSquare, Save, Loader2, ServerCrash, ShieldAlert, AlertCircle, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { toast } from 'react-hot-toast';
import { Session } from 'next-auth';
import StagesTable from '@/components/settings/StagesTable';
import StagesForm from '@/components/settings/StagesForm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
// Remove StagesModal import


const stageFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional().nullable(),
  sort_order: z.coerce.number().int().optional().default(0),
});
type StageFormValues = z.infer<typeof stageFormSchema>;

export default function RecruitmentStagesPage() {
  const { data: session, status: sessionStatus } = useSession() as { data: Session | null, status: 'loading' | 'authenticated' | 'unauthenticated' };
  const router = useRouter();
  const pathname = usePathname();
  const [showLogoOnly, setShowLogoOnly] = useState<boolean>(false);

  const [stages, setStages] = useState<RecruitmentStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoving, setIsMoving] = useState<string | null>(null); // Store ID of stage being moved
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<RecruitmentStage | null>(null);
  const [stageToDelete, setStageToDelete] = useState<RecruitmentStage | null>(null);
  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
  const [replacementStageName, setReplacementStageName] = useState<string>('');


  const form = useForm<StageFormValues>({
    resolver: zodResolver(stageFormSchema),
    defaultValues: { name: '', description: '', sort_order: 0 },
  });

  const fetchStages = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/settings/recruitment-stages');
      if (!response.ok) {
        let messageFromServer = `Failed to fetch stages. Status: ${response.status}`;
        try {
          const errorData = await response.json();
          messageFromServer = errorData.error || errorData.message || messageFromServer;
        } catch (e) {
          messageFromServer = response.statusText || messageFromServer;
        }
        throw new Error(messageFromServer);
      }
      const data = await response.json();
      setStages(data);
    } catch (error) {
      setFetchError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [sessionStatus]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      signIn(undefined, { callbackUrl: pathname });
    } else if (sessionStatus === 'authenticated') {
      fetchStages();
    }
  }, [sessionStatus, pathname, fetchStages]);

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

  const handleOpenModal = (stage?: RecruitmentStage) => {
    setEditingStage(stage || null);
    if (stage) {
      form.reset({
        name: stage.name,
        description: stage.description || '',
        sort_order: stage.sortOrder || 0,
      });
    } else {
      form.reset({ name: '', description: '', sort_order: 0 });
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (data: StageFormValues) => {
    try {
      const url = editingStage 
        ? `/api/settings/recruitment-stages/${editingStage.id}`
        : '/api/settings/recruitment-stages';
      
      const method = editingStage ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save stage');
      }

      toast.success(editingStage ? 'Stage updated successfully' : 'Stage created successfully');
      setIsModalOpen(false);
      fetchStages();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const attemptDeleteStage = async (stage: RecruitmentStage) => {
    try {
      // First try to delete directly to check for protected stages or usage
      const response = await fetch(`/api/settings/recruitment-stages/${stage.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        // Stage was deleted successfully
        toast.success('Stage deleted successfully');
        fetchStages();
        return;
      }

      const errorData = await response.json();
      
      if (response.status === 400) {
        // Protected stage - show error message
        toast.error(errorData.message);
        return;
      }
      
      if (response.status === 409) {
        // Stage in use - show replacement modal
        setStageToDelete(stage);
        setIsReplacementModalOpen(true);
        return;
      }
      
      // Other errors
      throw new Error(errorData.message || 'Failed to delete stage');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleConfirmDeleteWithReplacement = async () => {
    if (!stageToDelete || !replacementStageName) return;
    
    try {
      // First, migrate all Applicants and transition records to the replacement stage
      const migrateResponse = await fetch(`/api/settings/recruitment-stages/${stageToDelete.id}/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replacementStageName }),
      });

      if (!migrateResponse.ok) {
        const errorData = await migrateResponse.json();
        throw new Error(errorData.message || 'Failed to migrate stage data');
      }

      // Now delete the stage
      const deleteResponse = await fetch(`/api/settings/recruitment-stages/${stageToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(errorData.message || 'Failed to delete stage');
      }

      toast.success('Stage deleted successfully');
      setIsReplacementModalOpen(false);
      setStageToDelete(null);
      setReplacementStageName('');
      fetchStages();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  // Check if a stage can be deleted (not protected by business logic)
  const canDeleteStage = (stage: RecruitmentStage) => {
    const PROTECTED_STAGES = ['Applied', 'Hired', 'Rejected'];
    return !PROTECTED_STAGES.includes(stage.name);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(stages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update sort_order for all items
    const updatedItems = items.map((item, index) => ({
      ...item,
      sort_order: index + 1,
    }));

    setStages(updatedItems);

    try {
      const response = await fetch('/api/settings/recruitment-stages/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageIds: updatedItems.map(item => item.id) }),
      });

      if (!response.ok) {
        throw new Error('Failed to update stage order');
      }

      toast.success('Stage order updated successfully');
    } catch (error) {
      toast.error('Failed to update stage order');
      fetchStages(); // Revert to original order
    }
  };

  const updateStageColor = async (stage: RecruitmentStage, colorType: 'color_complete' | 'color_badge', newColor: string) => {
    try {
      const payload = { [colorType]: newColor };
      const response = await fetch(`/api/settings/recruitment-stages/${stage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || 'Failed to update color');
      }
      setStages(prev => prev.map(s => s.id === stage.id ? { ...s, [colorType]: newColor } : s));
      toast.success('Stage color updated');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  if (sessionStatus === 'loading' || (isLoading && !fetchError && stages.length === 0)) {
    return ( <div className="flex w-screen items-center justify-center bg-background fixed inset-0 z-50"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div> );
  }

  if (fetchError) {
    const isPermissionError = fetchError === "You do not have permission to manage recruitment stages.";
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Data</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{fetchError}</p>
        {isPermissionError ? (<Button onClick={() => router.push('/')} className="btn-hover-primary-gradient">Go to Dashboard</Button>) : null}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          {!showLogoOnly && (
            <h1 className="text-xl font-bold text-foreground">Recruitment Stages</h1>
          )}
                     <p className="text-sm text-muted-foreground">Manage the stages in your recruitment pipeline. Most stages can be deleted, except those with core business logic dependencies.</p>
        </div>
        <Button onClick={() => handleOpenModal()} variant="default">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Stage
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-6">
                {isLoading && stages.length === 0 ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-sm text-muted-foreground">Loading stages...</p>
                  </div>
                ) : stages.length === 0 && !fetchError ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <KanbanSquare className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-base font-semibold text-foreground mb-2">No Stages Configured</h3>
                      <p className="text-sm text-muted-foreground text-center mb-4">
                        Get started by creating your first recruitment stage.
                      </p>
                      <Button onClick={() => handleOpenModal()}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Create First Stage
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="stages-list">
                      {(provided) => (
                        <div 
                          ref={provided.innerRef} 
                          {...provided.droppableProps}
                          className="space-y-4"
                        >
                          {stages.map((stage, index) => (
                            <Draggable key={stage.id} draggableId={stage.id} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`transition-all duration-200 ${
                                    snapshot.isDragging ? 'shadow-lg scale-105' : 'hover:shadow-md'
                                  }`}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 flex-1">
                                        <div 
                                          {...provided.dragHandleProps}
                                          className="cursor-move text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                          <GripVertical className="h-4 w-4" />
                                        </div>
                                        
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-sm font-medium text-foreground">{stage.name}</h3>
                                          </div>
                                          
                                          {stage.description && (
                                            <p className="text-xs text-muted-foreground">
                                              {stage.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => handleOpenModal(stage)}
                                          className="h-7 w-7"
                                        >
                                          <Edit3 className="h-3 w-3" />
                                        </Button>
                                        {canDeleteStage(stage) && (
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => attemptDeleteStage(stage)}
                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      <StagesForm
        open={isModalOpen}
        stage={editingStage}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <AlertDialog open={isReplacementModalOpen} onOpenChange={(open) => {
        setIsReplacementModalOpen(open);
        if (!open) {
          setStageToDelete(null); 
          setReplacementStageName('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center"><AlertCircle className="mr-2 h-5 w-5 text-amber-500"/>Stage In Use</AlertDialogTitle>
            <AlertDialogDescription>
              The stage &quot;<strong>{stageToDelete?.name}</strong>&quot; is currently in use by Applicants or in transition history.
              To delete it, please select a new stage to migrate all associated records to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="replacement-stage">Select Replacement Stage</Label>
            <Select value={replacementStageName || ''} onValueChange={setReplacementStageName}>
              <SelectTrigger id="replacement-stage" className="w-full mt-1">
                <SelectValue placeholder="Choose a new stage..." />
              </SelectTrigger>
                             <SelectContent>
                 {stages.filter(s => s.id !== stageToDelete?.id).map(s => (
                   <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                 ))}
               </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsReplacementModalOpen(false); setStageToDelete(null); setReplacementStageName(''); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteWithReplacement} disabled={!replacementStageName}>
              Migrate and Delete Stage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* <StagesModal /> */}
    </div>
  );
}


