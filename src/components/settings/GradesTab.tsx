"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  PlusCircle,
  Edit3,
  Trash2,
  GripVertical,
  Loader2,
  ServerCrash,
  AlertCircle,
  Clock,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ColorPicker } from '@/components/ui/color-picker';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { Grade } from '@/lib/types';

interface GradeFormData {
  name: string;
  label: string;
  description: string;
  minLevel: number;
  maxLevel: number;
  slaDays: number;
  color: string;
  isActive: boolean;
  sortOrder: number;
}

const defaultGradeData: GradeFormData = {
  name: '',
  label: '',
  description: '',
  minLevel: 1,
  maxLevel: 1,
  slaDays: 30,
  color: '#3B82F6',
  isActive: true,
  sortOrder: 0,
};

export function GradesTab() {
  const { data: session } = useSession();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);
  const [formData, setFormData] = useState<GradeFormData>(defaultGradeData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGrades = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/settings/grades');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch grades' }));
        throw new Error(errorData.message);
      }
      const data: Grade[] = await response.json();
      setGrades(data);
    } catch (error) {
      console.error('Error fetching grades:', error);
      setFetchError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  const handleOpenModal = (grade?: Grade) => {
    if (grade) {
      setEditingGrade(grade);
      setFormData({
        name: grade.name,
        label: grade.label || '',
        description: grade.description || '',
        minLevel: grade.minLevel,
        maxLevel: grade.maxLevel,
        slaDays: grade.slaDays,
        color: grade.color || '#3B82F6',
        isActive: grade.isActive,
        sortOrder: grade.sortOrder,
      });
    } else {
      setEditingGrade(null);
      setFormData(defaultGradeData);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGrade(null);
    setFormData(defaultGradeData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingGrade 
        ? `/api/settings/grades/${editingGrade.id}`
        : '/api/settings/grades';
      
      const method = editingGrade ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save grade');
      }

      toast.success(editingGrade ? 'Grade updated successfully' : 'Grade created successfully');
      handleCloseModal();
      fetchGrades();
    } catch (error) {
      console.error('Error saving grade:', error);
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!gradeToDelete) return;

    try {
      const response = await fetch(`/api/settings/grades/${gradeToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete grade');
      }

      toast.success('Grade deleted successfully');
      setGradeToDelete(null);
      fetchGrades();
    } catch (error) {
      console.error('Error deleting grade:', error);
      toast.error((error as Error).message);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(grades);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setGrades(items);

    // Update sort order in database
    try {
      const updates = items.map((grade, index) => ({
        id: grade.id,
        sortOrder: index + 1,
      }));

      await Promise.all(
        updates.map(update =>
          fetch(`/api/settings/grades/${update.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sortOrder: update.sortOrder }),
          })
        )
      );
    } catch (error) {
      console.error('Error updating sort order:', error);
      toast.error('Failed to update sort order');
      fetchGrades(); // Refresh to get correct order
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
          <p className="text-red-500">Error loading grades: {fetchError}</p>
          <Button onClick={fetchGrades} className="mt-2">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Grade Management</h2>
          <p className="text-muted-foreground">
            Configure position grades and their SLA requirements for hiring timelines.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Grade
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="grades">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3 pr-4"
              >
                {grades.map((grade, index) => (
                  <Draggable key={grade.id} draggableId={grade.id} index={index}>
                    {(provided) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${!grade.isActive ? 'opacity-60' : ''}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex items-center space-x-3">
                                <Badge 
                                  style={{ backgroundColor: grade.color || '#3B82F6' }}
                                  className="text-white"
                                >
                                  {grade.name}
                                </Badge>
                                {grade.label && (
                                  <div className="text-sm font-medium text-foreground">
                                    {grade.label}
                                  </div>
                                )}
                                <div className="text-sm text-muted-foreground">
                                  Level {grade.minLevel}-{grade.maxLevel}
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {grade.slaDays} days SLA
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {!grade.isActive && (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenModal(grade)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setGradeToDelete(grade)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {grade.description && (
                            <p className="text-sm text-muted-foreground mt-2 ml-7">
                              {grade.description}
                            </p>
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
      </ScrollArea>

      {/* Add/Edit Grade Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGrade ? 'Edit Grade' : 'Add New Grade'}
            </DialogTitle>
            <DialogDescription>
              Configure grade settings and SLA requirements.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Grade Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Grade 8+"
                required
              />
            </div>
            <div>
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Senior"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., ระดับเกรด 8 ขึ้นไป"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minLevel">Min Level *</Label>
                <Input
                  id="minLevel"
                  type="number"
                  value={formData.minLevel}
                  onChange={(e) => setFormData({ ...formData, minLevel: parseInt(e.target.value) })}
                  min="1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="maxLevel">Max Level *</Label>
                <Input
                  id="maxLevel"
                  type="number"
                  value={formData.maxLevel}
                  onChange={(e) => setFormData({ ...formData, maxLevel: parseInt(e.target.value) })}
                  min="1"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="slaDays">SLA Days *</Label>
              <Input
                id="slaDays"
                type="number"
                value={formData.slaDays}
                onChange={(e) => setFormData({ ...formData, slaDays: parseInt(e.target.value) })}
                min="1"
                placeholder="e.g., 60"
                required
              />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <ColorPicker
                value={formData.color || '#3B82F6'}
                onChange={(color) => setFormData({ ...formData, color })}
                className="w-full"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingGrade ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!gradeToDelete} onOpenChange={() => setGradeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Grade</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{gradeToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
