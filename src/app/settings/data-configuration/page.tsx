"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Settings2, 
  KanbanSquare, 
  MapPin, 
  Loader2, 
  ServerCrash, 
  PlusCircle,
  Edit3,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Upload,
  X,
  AlertCircle,
  Users,
  User,
  Building,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { 
  CustomFieldDefinition, 
  CustomFieldType, 
  CustomFieldOption,
  RecruitmentStage,
  ApplicantSource 
} from '@/lib/types';
import { CUSTOM_FIELD_TYPES } from '@/lib/types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// Import existing components
import CustomFieldTable from '@/components/settings/CustomFieldTable';
import CustomFieldDrawer from '@/components/settings/CustomFieldDrawer';
import CustomFieldModal from '@/components/settings/CustomFieldModal';
import CustomFieldAlertDialog from '@/components/settings/CustomFieldAlertDialog';
import StagesForm from '@/components/settings/StagesForm';
import ApplicantSourceModal from '@/components/settings/ApplicantSourceModal';
import ApplicantSourceAlertDialog from '@/components/settings/ApplicantSourceAlertDialog';
import { HeadcountTypesTab } from './HeadcountTypesTab';
import { GradesTab } from '@/components/settings/GradesTab';
import { PositionLevelsTab } from '@/components/settings/PositionLevelsTab';
import { hasAnyPermission } from '@/lib/permissions';

// Custom Fields Tab Component
function CustomFieldsTab() {
  const { data: session } = useSession();
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<CustomFieldDefinition | null>(null);
  const [definitionToDelete, setDefinitionToDelete] = useState<CustomFieldDefinition | null>(null);

  // Check permissions for custom fields management
  const canManageCustomFields = hasAnyPermission(session?.user, ['CUSTOM_FIELDS_EDIT']);

  const fetchDefinitions = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/settings/custom-field-definitions');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch definitions' }));
        throw new Error(errorData.message);
      }
      const data: CustomFieldDefinition[] = await response.json();
      setDefinitions(data);
    } catch (error) {
      console.error('Error fetching custom field definitions:', error);
      setFetchError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManageCustomFields) {
      fetchDefinitions();
    }
  }, [fetchDefinitions, canManageCustomFields]);

  // Show permission error if user can't manage custom fields
  if (!canManageCustomFields) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Insufficient Permissions</h3>
          <p className="text-muted-foreground mb-4">
            You don't have permission to manage custom fields. 
            Contact your administrator to request the CUSTOM_FIELDS_EDIT permission.
          </p>
        </div>
      </div>
    );
  }

  const handleOpenDrawer = (definition: CustomFieldDefinition) => {
    setEditingDefinition(definition);
    setIsDrawerOpen(true);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    const url = editingDefinition ? `/api/settings/custom-field-definitions/${editingDefinition.id}` : '/api/settings/custom-field-definitions';
    const method = editingDefinition ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `Failed to ${editingDefinition ? 'update' : 'create'} definition`);
      
      toast.success(`Definition "${result.label}" was successfully ${editingDefinition ? 'updated' : 'created'}.`);
      setIsDrawerOpen(false);
      fetchDefinitions();
    } catch (error) {
      console.error('Error in custom fields:', error);
      toast.error((error as Error).message);
    }
  };

  const confirmDelete = (definition: CustomFieldDefinition) => {
    setDefinitionToDelete(definition);
  };

  const handleDelete = async () => {
    if (!definitionToDelete) return;
    try {
      const response = await fetch(`/api/settings/custom-field-definitions/${definitionToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete definition');
      }
      toast.success('Custom field deleted successfully.');
      fetchDefinitions();
    } catch (error) {
      console.error('Error deleting custom field:', error);
      toast.error((error as Error).message);
    } finally {
      setDefinitionToDelete(null);
    }
  };

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Data</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{fetchError}</p>
        {null}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Custom Field Definitions</h2>
            <p className="text-sm text-muted-foreground">
              Define custom fields that can be associated with Applicants or Positions.
            </p>
          </div>
          <Button onClick={handleOpenModal} className="btn-primary-gradient">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Field
          </Button>
        </div>

        {isLoading && definitions.length === 0 ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading definitions...</p>
          </div>
        ) : definitions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-base font-semibold text-foreground mb-2">No Custom Fields</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Create your first custom field to get started.
              </p>
              <Button onClick={handleOpenModal}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create First Field
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden">
            <CustomFieldTable
              fields={definitions}
              isLoading={isLoading}
              onEdit={handleOpenDrawer}
              onDelete={setDefinitionToDelete}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <CustomFieldModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
      />
      <CustomFieldDrawer
        open={isDrawerOpen}
        definition={editingDefinition}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleFormSubmit}
      />
      <CustomFieldAlertDialog
        open={!!definitionToDelete}
        onConfirm={handleDelete}
        onCancel={() => setDefinitionToDelete(null)}
        definition={definitionToDelete}
      />
    </ScrollArea>
  );
}

// Recruitment Stages Tab Component
function RecruitmentStagesTab() {
  const { data: session } = useSession();
  const [stages, setStages] = useState<RecruitmentStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<RecruitmentStage | null>(null);
  const [stageToDelete, setStageToDelete] = useState<RecruitmentStage | null>(null);
  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
  const [replacementStageName, setReplacementStageName] = useState<string>('');

  // Check permissions for recruitment stages management
  const canManageStages = hasAnyPermission(session?.user, ['RECRUITMENT_STAGES_EDIT']);

  const fetchStages = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (canManageStages) {
      fetchStages();
    }
  }, [fetchStages, canManageStages]);

  // Show permission error if user can't manage stages
  if (!canManageStages) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Insufficient Permissions</h3>
          <p className="text-muted-foreground mb-4">
            You don't have permission to manage recruitment stages. 
            Contact your administrator to request the RECRUITMENT_STAGES_EDIT permission.
          </p>
        </div>
      </div>
    );
  }

  const handleOpenModal = (stage?: RecruitmentStage) => {
    setEditingStage(stage || null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
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

  // Check if a stage can be deleted (not protected by business logic)
  const canDeleteStage = (stage: RecruitmentStage) => {
    const PROTECTED_STAGES = ['Applied', 'Hired', 'Rejected'];
    return !PROTECTED_STAGES.includes(stage.name);
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

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(stages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

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
      fetchStages();
    }
  };

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Data</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{fetchError}</p>
        {null}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Recruitment Stages</h2>
            <p className="text-sm text-muted-foreground">
              Manage the stages in your recruitment pipeline. Most stages can be deleted, except those with core business logic dependencies.
            </p>
          </div>
          <Button onClick={() => handleOpenModal()} variant="default">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Stage
          </Button>
        </div>

        {isLoading && stages.length === 0 ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-sm text-muted-foreground">Loading stages...</p>
          </div>
        ) : stages.length === 0 ? (
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

             <StagesForm
         open={isModalOpen}
         stage={editingStage}
         onClose={() => setIsModalOpen(false)}
         onSubmit={handleFormSubmit}
       />

       {/* Replacement Modal */}
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
     </ScrollArea>
   );
 }

// Applicant Sources Tab Component
function ApplicantSourcesTab() {
  const [sources, setSources] = useState<ApplicantSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<ApplicantSource | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<ApplicantSource | null>(null);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
    fetchSources();
  }, [fetchSources]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
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

  const handleSubmit = async (data: any) => {
    try {
      setIsUploading(true);
      
      let logoUrl = editingSource?.logo || null;
      
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

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(sources);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      sortOrder: index + 1,
    }));

    setSources(updatedItems);

    try {
      const response = await fetch('/api/settings/Applicant-sources/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: updatedItems.map(item => item.id) }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 403) {
          toast.error('Access denied: You do not have permission to reorder Applicant sources. Please contact your administrator.');
        } else if (response.status === 401) {
          toast.error('Session expired: Please refresh the page and try again.');
        } else {
          toast.error(errorData.message || 'Failed to update source order');
        }
        
        // Revert to original order on error
        fetchSources();
        return;
      }

      toast.success('Source order updated successfully');
    } catch (error: any) {
      console.error('Failed to reorder:', error);
      
      if (error.message.includes('Failed to fetch')) {
        toast.error('Network error: Please check your connection and try again.');
      } else {
        toast.error('Failed to update source order');
      }
      
      // Revert to original order on error
      fetchSources();
    }
  };

  const openCreateModal = () => {
    setEditingSource(null);
    setLogoPreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (source: ApplicantSource) => {
    setEditingSource(source);
    setLogoPreview(source.logo || null);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (data: any) => {
    try {
      setIsUploading(true);
      
      let logoUrl = editingSource?.logo || null;
      
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
    } catch (error: any) {
      console.error('Failed to save source:', error);
      toast.error(error.message || 'Failed to save Applicant source');
    } finally {
      setIsUploading(false);
    }
  };

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Data</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{fetchError}</p>
        {null}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Applicant Sources</h2>
            <p className="text-sm text-muted-foreground">
              Manage Applicant source options and settings for tracking where Applicants come from.
            </p>
          </div>
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Source
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading sources...</p>
          </div>
        ) : sources.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-base font-semibold text-foreground mb-2">No Applicant Sources</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Create your first Applicant source to get started.
              </p>
              <Button onClick={openCreateModal}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create First Source
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sources-list">
              {(provided) => (
                <div 
                  ref={provided.innerRef} 
                  {...provided.droppableProps}
                  className="space-y-4"
                >
                  {sources.map((source, index) => (
                    <Draggable key={source.id} draggableId={source.id} index={index}>
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
                                
                                <div className="flex items-center gap-3">
                                  {source.logo ? (
                                    <img 
                                      src={source.logo} 
                                      alt={`${source.name} logo`}
                                      className="h-8 w-8 object-contain rounded-full"
                                    />
                                  ) : (
                                    <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
                                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  
                                  <div>
                                    <h3 className="text-sm font-medium text-foreground">{source.name}</h3>
                                    {source.description && (
                                      <p className="text-xs text-muted-foreground">
                                        {source.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => openEditModal(source)}
                                  className="h-7 w-7"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setSourceToDelete(source)}
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
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

       {/* Modals */}
       <ApplicantSourceModal
         open={isModalOpen}
         onClose={() => setIsModalOpen(false)}
         onSubmit={handleModalSubmit}
         source={editingSource}
       />
       <ApplicantSourceAlertDialog
         open={!!sourceToDelete}
         onConfirm={() => sourceToDelete && handleDelete(sourceToDelete)}
         onCancel={() => setSourceToDelete(null)}
         source={sourceToDelete}
       />
     </ScrollArea>
   );
 }

// Main Component
export default function DataConfigurationPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [showLogoOnly, setShowLogoOnly] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Flattened state for active page
  const [activePage, setActivePage] = useState<string>('recruitment-stages');

  // Check permissions for different tabs
  const canManageStages = hasAnyPermission(session?.user, ['RECRUITMENT_STAGES_EDIT']);
  const canManageCustomFields = hasAnyPermission(session?.user, ['CUSTOM_FIELDS_EDIT']);

  // Set default page based on permissions
  useEffect(() => {
    if (activePage === 'recruitment-stages' && !canManageStages) {
      setActivePage('Applicant-sources');
    }
  }, [activePage, canManageStages]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      signIn(undefined, { callbackUrl: pathname });
    }
  }, [sessionStatus, pathname]);

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

  if (sessionStatus === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (sessionStatus === 'unauthenticated') {
    return null;
  }

  // Navigation Structure
  const navigationGroups = [
    {
      title: 'Applicant',
      items: [
        ...(canManageStages ? [{
          id: 'recruitment-stages',
          label: 'Recruitment Stages',
          icon: KanbanSquare,
        }] : []),
        {
          id: 'Applicant-sources',
          label: 'Applicant Sources',
          icon: MapPin,
        }
      ]
    },
    {
      title: 'Position',
      items: [
        {
          id: 'position-headcount',
          label: 'Headcount Types',
          icon: Users,
        },
        {
          id: 'position-grades',
          label: 'Grades',
          icon: Users,
        },
        {
          id: 'position-levels',
          label: 'Position Levels',
          icon: Users,
        }
      ]
    },
    ...(canManageCustomFields ? [{
      title: 'System',
      items: [
        {
          id: 'custom-fields',
          label: 'Custom Fields',
          icon: Settings2,
        }
      ]
    }] : [])
  ];

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          {!showLogoOnly && (
            <h1 className="text-2xl font-bold text-foreground">Data Configuration</h1>
          )}
          <p className="text-muted-foreground">Manage custom fields, recruitment stages, and Applicant sources</p>
        </div>
      </div>

      {/* Permission Warning Banner */}
      {(!canManageStages || !canManageCustomFields) && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <h4 className="font-medium text-amber-800 mb-1">Limited Access</h4>
              <p className="text-amber-700">
                {!canManageStages && !canManageCustomFields && "You don't have permission to manage recruitment stages or custom fields. "}
                {!canManageStages && canManageCustomFields && "You don't have permission to manage recruitment stages. "}
                {canManageStages && !canManageCustomFields && "You don't have permission to manage custom fields. "}
                Contact your administrator to request the necessary permissions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex gap-6">
          {/* Vertical Tabs Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-muted/30 rounded-lg p-3 space-y-6">
              {navigationGroups.map((group, groupIndex) => (
                <div key={group.title}>
                  <h3 className="text-sm font-semibold text-foreground mb-2 px-4 uppercase tracking-wider text-xs bg-muted/50 py-1 rounded w-fit">
                    {group.title}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setActivePage(item.id)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 relative cursor-pointer rounded-md",
                            activePage === item.id
                              ? "bg-background text-primary shadow-sm border border-border"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden bg-card rounded-lg border shadow-sm">
            <div className="h-full p-6">
              {activePage === 'recruitment-stages' && canManageStages && <RecruitmentStagesTab />}
              {activePage === 'Applicant-sources' && <ApplicantSourcesTab />}
              
              {activePage === 'position-headcount' && <HeadcountTypesTab />}
              {activePage === 'position-grades' && <GradesTab />}
              {activePage === 'position-levels' && <PositionLevelsTab />}

              {activePage === 'custom-fields' && canManageCustomFields && <CustomFieldsTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

