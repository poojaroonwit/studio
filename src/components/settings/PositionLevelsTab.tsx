"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PlusCircle, Edit3, Trash2, GripVertical, Loader2, ServerCrash, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';
import type { PositionLevel } from '@/lib/types';

interface PositionLevelFormData {
  name: string;
  description: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
}

const defaultFormData: PositionLevelFormData = {
  name: '',
  description: '',
  color: '#6B7280',
  isActive: true,
  sortOrder: 0,
};

export function PositionLevelsTab() {
  const { data: session } = useSession();
  const [levels, setLevels] = useState<PositionLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<PositionLevel | null>(null);
  const [levelToDelete, setLevelToDelete] = useState<PositionLevel | null>(null);
  const [formData, setFormData] = useState<PositionLevelFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLevels = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      
      const response = await fetch('/api/settings/position-levels');
      
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch position levels' }));
        console.error('[PositionLevelsTab] API error:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: PositionLevel[] = await response.json();
      
      setLevels(data);
    } catch (error) {
      console.error('[PositionLevelsTab] Error fetching position levels:', error);
      setFetchError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  const handleOpenModal = (level?: PositionLevel) => {
    if (level) {
      setEditingLevel(level);
      setFormData({
        name: level.name,
        description: level.description || '',
        color: level.color || '#6B7280',
        isActive: level.isActive,
        sortOrder: level.sortOrder,
      });
    } else {
      setEditingLevel(null);
      setFormData(defaultFormData);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLevel(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingLevel ? `/api/settings/position-levels/${editingLevel.id}` : '/api/settings/position-levels';
      const method = editingLevel ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save position level');
      }

      toast.success(editingLevel ? 'Position level updated successfully' : 'Position level created successfully');
      handleCloseModal();
      fetchLevels();
    } catch (error) {
      console.error('Error saving position level:', error);
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!levelToDelete) return;
    try {
      const response = await fetch(`/api/settings/position-levels/${levelToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete position level');
      }
      toast.success('Position level deleted successfully');
      setLevelToDelete(null);
      fetchLevels();
    } catch (error) {
      console.error('Error deleting position level:', error);
      toast.error((error as Error).message);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(levels);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setLevels(items);
    try {
      const updates = items.map((lvl, index) => ({ id: lvl.id, sortOrder: index + 1 }));
      await Promise.all(
        updates.map(update =>
          fetch(`/api/settings/position-levels/${update.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sortOrder: update.sortOrder, name: items.find(x => x.id === update.id)?.name, description: items.find(x => x.id === update.id)?.description || '', color: items.find(x => x.id === update.id)?.color || '#6B7280', isActive: items.find(x => x.id === update.id)?.isActive ?? true }),
          })
        )
      );
    } catch (error) {
      console.error('Error updating sort order:', error);
      toast.error('Failed to update sort order');
      fetchLevels();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <ServerCrash className="h-8 w-8 mx-auto mb-2 text-red-500" />
          <p className="text-red-500">Error loading position levels: {fetchError}</p>
          <Button onClick={fetchLevels} className="mt-2">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 space-y-6 pb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Position Level Management</h2>
            <p className="text-muted-foreground">Manage the list of standardized position levels used across positions.</p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Position Level
          </Button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-4 custom-scrollbar">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="position-levels">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 pb-6">
              {levels.map((level, index) => (
                <Draggable key={level.id} draggableId={level.id} index={index}>
                  {(provided) => (
                    <Card ref={provided.innerRef} {...provided.draggableProps} className={`${!level.isActive ? 'opacity-60' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge style={{ backgroundColor: level.color || '#6B7280' }} className="text-white">
                                {level.name}
                              </Badge>
                              {level.isActive && (
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <BadgeCheck className="h-3 w-3 mr-1" />
                                  Active
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenModal(level)}>
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setLevelToDelete(level)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {level.description && (
                          <p className="text-sm text-muted-foreground mt-2 ml-7">{level.description}</p>
                        )}
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
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLevel ? 'Edit Position Level' : 'Add New Position Level'}</DialogTitle>
            <DialogDescription>Define a standardized position level.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Senior level" required />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" rows={2} />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input id="color" type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="h-10" />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="isActive" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingLevel ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!levelToDelete} onOpenChange={() => setLevelToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Position Level</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{levelToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


