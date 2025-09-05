// src/components/tasks/TaskDetailModal.tsx
"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, User, Tag, Clock, Edit3, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from './TaskCard';

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: (taskId: string, updates: Partial<Task>) => void;
  stages?: { id: string; name: string; color?: string }[];
  assignees?: { id: string; name: string; avatarUrl?: string }[];
}

export function TaskDetailModal({
  task,
  open,
  onClose,
  onUpdate,
  stages = [],
  assignees = [],
}: TaskDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task | null>(null);

  React.useEffect(() => {
    if (task) {
      setEditedTask({ ...task });
    }
  }, [task]);

  const handleSave = () => {
    if (editedTask && onUpdate) {
      onUpdate(editedTask.id, editedTask);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedTask(task ? { ...task } : null);
    setIsEditing(false);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (!task) return null;

  const currentStage = stages.find(stage => stage.id === task.status);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              {isEditing ? 'Edit Task' : 'Task Details'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Title */}
          <div>
            <Label className="text-sm font-medium">Title</Label>
            {isEditing ? (
              <Input
                value={editedTask?.title || ''}
                onChange={(e) => setEditedTask(prev => prev ? { ...prev, title: e.target.value } : null)}
                className="mt-1"
              />
            ) : (
              <h3 className="text-lg font-medium mt-1">{task.title}</h3>
            )}
          </div>

          {/* Task Description */}
          <div>
            <Label className="text-sm font-medium">Description</Label>
            {isEditing ? (
              <Textarea
                value={editedTask?.description || ''}
                onChange={(e) => setEditedTask(prev => prev ? { ...prev, description: e.target.value } : null)}
                className="mt-1"
                rows={4}
              />
            ) : (
              <p className="text-muted-foreground mt-1">
                {task.description || 'No description provided'}
              </p>
            )}
          </div>

          {/* Task Status */}
          <div>
            <Label className="text-sm font-medium">Status</Label>
            {isEditing ? (
              <Select
                value={editedTask?.status || ''}
                onValueChange={(value) => setEditedTask(prev => prev ? { ...prev, status: value } : null)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color || '#6b7280' }}
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: currentStage?.color || '#6b7280' }}
                />
                <Badge variant="outline">
                  {currentStage?.name || task.status}
                </Badge>
              </div>
            )}
          </div>

          {/* Task Priority */}
          <div>
            <Label className="text-sm font-medium">Priority</Label>
            {isEditing ? (
              <Select
                value={editedTask?.priority || ''}
                onValueChange={(value) => setEditedTask(prev => prev ? { ...prev, priority: value as any } : null)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1">
                {task.priority ? (
                  <Badge className={cn("text-xs", getPriorityColor(task.priority))}>
                    {task.priority}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">No priority set</span>
                )}
              </div>
            )}
          </div>

          {/* Task Assignee */}
          <div>
            <Label className="text-sm font-medium">Assignee</Label>
            {isEditing ? (
              <Select
                value={editedTask?.assignee?.id || 'unassigned'}
                onValueChange={(value) => {
                  const assignee = value === 'unassigned' ? undefined : assignees.find(a => a.id === value);
                  setEditedTask(prev => prev ? { ...prev, assignee } : null);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6 rounded-full">
                          <AvatarImage src={assignee.avatarUrl} alt={assignee.name} className="rounded-full" />
                          <AvatarFallback className="text-xs rounded-full">
                            {assignee.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {assignee.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                {task.assignee ? (
                  <>
                    <Avatar className="w-8 h-8 rounded-full">
                      <AvatarImage
                        src={task.assignee.avatarUrl}
                        alt={task.assignee.name}
                        className="rounded-full"
                      />
                      <AvatarFallback className="rounded-full">
                        {task.assignee.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{task.assignee.name}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </div>
            )}
          </div>

          {/* Due Date */}
          <div>
            <Label className="text-sm font-medium">Due Date</Label>
            {isEditing ? (
              <Input
                type="date"
                value={editedTask?.dueDate ? new Date(editedTask.dueDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setEditedTask(prev => prev ? { ...prev, dueDate: e.target.value } : null)}
                className="mt-1"
              />
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {task.dueDate ? (
                  <span className={cn(
                    isOverdue(task.dueDate) && "text-red-600 font-medium"
                  )}>
                    {formatDate(task.dueDate)}
                    {isOverdue(task.dueDate) && " (Overdue)"}
                  </span>
                ) : (
                  <span className="text-muted-foreground">No due date set</span>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Tags</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {task.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Created/Updated Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
            <div className="flex items-center gap-4">
              {task.createdAt && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Created: {formatDate(task.createdAt)}
                </div>
              )}
              {task.updatedAt && task.updatedAt !== task.createdAt && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Updated: {formatDate(task.updatedAt)}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
