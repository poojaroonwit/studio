// src/app/task-board/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { TaskBoard, Task, TaskStage } from '@/components/tasks/TaskBoard';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Sample stages data
const sampleStages: TaskStage[] = [
  { id: 'todo', name: 'To Do', color: '#6b7280', description: 'Tasks that need to be started', sortOrder: 0 },
  { id: 'in-progress', name: 'In Progress', color: '#3b82f6', description: 'Tasks currently being worked on', sortOrder: 1 },
  { id: 'review', name: 'Review', color: '#f59e0b', description: 'Tasks ready for review', sortOrder: 2 },
  { id: 'done', name: 'Done', color: '#10b981', description: 'Completed tasks', sortOrder: 3 },
];

// Empty tasks data - will be populated from real data source
const sampleTasks: Task[] = [];

// Empty assignees - will be populated from real data source
const sampleAssignees: { id: string; name: string; avatarUrl: string }[] = [];

export default function TaskBoardPage() {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [stages] = useState<TaskStage[]>(sampleStages);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesAssignee = filterAssignee === 'all' || task.assignee?.id === filterAssignee;
    
    return matchesSearch && matchesPriority && matchesAssignee;
  });

  // Handle task movement
  const handleMoveTask = (task: Task, newStatus: string) => {
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
    ));
    toast.success(`Moved "${task.title}" to ${stages.find(s => s.id === newStatus)?.name}`);
  };

  // Handle task click
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  // Handle task update
  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    ));
    toast.success('Task updated successfully');
  };

  // Handle adding new task
  const handleAddTask = (stageId: string) => {
    setIsAddTaskModalOpen(true);
  };

  // Add new task
  const handleCreateTask = (taskData: Partial<Task>) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: taskData.title || '',
      description: taskData.description || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      assignee: taskData.assignee,
      dueDate: taskData.dueDate,
      tags: taskData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setTasks(prev => [...prev, newTask]);
    setIsAddTaskModalOpen(false);
    toast.success('Task created successfully');
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Task Board</h1>
            <Button onClick={() => setIsAddTaskModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {sampleAssignees.length > 0 ? (
                  sampleAssignees.map(assignee => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-assignees" disabled>
                    No assignees available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Task Board */}
      <div className="flex-1 overflow-hidden">
        <TaskBoard
          tasks={filteredTasks}
          stages={stages}
          onMoveTask={handleMoveTask}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
          showAssignee={true}
          showPriority={true}
          showDueDate={true}
          showTags={true}
          className="h-full"
        />
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleTaskUpdate}
        stages={stages}
        assignees={sampleAssignees}
      />

      {/* Add Task Modal */}
      <AddTaskModal
        open={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onCreateTask={handleCreateTask}
        stages={stages}
        assignees={sampleAssignees}
      />
    </div>
  );
}

// Add Task Modal Component
interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreateTask: (taskData: Partial<Task>) => void;
  stages: TaskStage[];
  assignees: { id: string; name: string; avatarUrl?: string }[];
}

function AddTaskModal({ open, onClose, onCreateTask, stages, assignees }: AddTaskModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium' as const,
    assigneeId: '',
    dueDate: '',
    tags: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    const assignee = formData.assigneeId ? assignees.find(a => a.id === formData.assigneeId) : undefined;
    const tags = formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

    onCreateTask({
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      assignee,
      dueDate: formData.dueDate || undefined,
      tags,
    });

    // Reset form
    setFormData({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      assigneeId: '',
      dueDate: '',
      tags: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter task description"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="assignee">Assignee</Label>
            <Select value={formData.assigneeId || 'unassigned'} onValueChange={(value) => setFormData(prev => ({ ...prev, assigneeId: value === 'unassigned' ? '' : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {assignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
            />
          </div>
          
          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="Enter tags separated by commas"
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
