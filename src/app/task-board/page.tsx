// src/app/task-board/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TaskBoard, TaskStage } from '@/components/tasks/TaskBoard';
import { Task } from '@/components/tasks/TaskCard';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Filter, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useUnifiedRealtime } from '@/hooks/use-unified-realtime';
import { RealtimeIndicator } from '@/components/ui/realtime-indicator';
import { useSafeEffect, useInfiniteLoopPrevention } from '@/hooks/use-safe-effect';

// Default stages - will be populated from real data source
const defaultStages: TaskStage[] = [];

// Default tasks - will be populated from real data source
const defaultTasks: Task[] = [];

// Default assignees - will be populated from real data source
const defaultAssignees: { id: string; name: string; avatarUrl: string }[] = [];

// Error boundary component for task board
class TaskBoardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TaskBoard Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col h-screen bg-background">
          <div className="bg-card border-b border-border shadow-sm">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">Task Board</h1>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
              <p className="text-muted-foreground mb-4">
                There was an error loading the task board. Please try reloading the page.
              </p>
              <Button onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function TaskBoardContent() {
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [stages] = useState<TaskStage[]>(defaultStages);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Use persistent user preferences
  const { 
    taskBoard: preferences, 
    updateTaskBoardPreferences, 
    resetTaskBoardPreferences,
    isLoaded 
  } = useUserPreferences();

  // Add infinite loop prevention
  const { trackRun: trackPreferenceUpdate } = useInfiniteLoopPrevention('TaskBoardPreferences', 50, () => {
    console.error('🚨 Excessive preference updates detected in TaskBoard');
    setHasError(true);
  });

  // Unified realtime hook with optimized configuration to prevent memory leaks
  const { isConnected: realtimeConnected, isReconnecting, reconnectAttempts } = useUnifiedRealtime({
    onCandidateUpdate: useCallback((updatedCandidate: any) => {
      try {
        // Handle candidate updates if needed
        // console.log('Candidate updated:', updatedCandidate);
      } catch (error) {
        console.error('Error handling candidate update:', error);
        setHasError(true);
      }
    }, []),
    onPositionUpdate: useCallback((updatedPosition: any) => {
      try {
        // Handle position updates if needed
        // console.log('Position updated:', updatedPosition);
      } catch (error) {
        console.error('Error handling position update:', error);
        setHasError(true);
      }
    }, []),
    onNotification: useCallback((notification: any) => {
      try {
        // Handle notifications if needed
        // console.log('Notification received:', notification);
      } catch (error) {
        console.error('Error handling notification:', error);
        setHasError(true);
      }
    }, []),
    showNotifications: false, // Disable notifications to prevent conflicts
    showErrorNotifications: false, // Disable error toast notifications
  });

  // Local state for immediate UI updates
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  
  // Add refs to track initialization and prevent circular updates
  const isInitializedRef = useRef(false);
  const lastSavedPreferencesRef = useRef({
    searchTerm: '',
    filterPriority: 'all',
    filterAssignee: 'all'
  });
  const preferenceUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingPreferencesRef = useRef(false);

  // Update local state when preferences are loaded - only once
  useSafeEffect(() => {
    if (isLoaded && !isInitializedRef.current) {
      isInitializedRef.current = true;
      setSearchTerm(preferences.searchTerm);
      setFilterPriority(preferences.filterPriority);
      setFilterAssignee(preferences.filterAssignee);
      
      // Update the last saved preferences to match what we just loaded
      lastSavedPreferencesRef.current = {
        searchTerm: preferences.searchTerm,
        filterPriority: preferences.filterPriority,
        filterAssignee: preferences.filterAssignee
      };
    }
  }, [isLoaded, preferences.searchTerm, preferences.filterPriority, preferences.filterAssignee], 'TaskBoardInitialization', 10);

  // Update preferences when local state changes, but only if they differ from current preferences
  // and only after the initial load is complete
  useSafeEffect(() => {
    if (!trackPreferenceUpdate()) return;
    
    if (isLoaded && isInitializedRef.current && !isUpdatingPreferencesRef.current) {
      const currentPreferences = {
        searchTerm,
        filterPriority,
        filterAssignee
      };
      const lastSaved = lastSavedPreferencesRef.current;
      
      // Only update if preferences actually changed
      if (currentPreferences.searchTerm !== lastSaved.searchTerm ||
          currentPreferences.filterPriority !== lastSaved.filterPriority ||
          currentPreferences.filterAssignee !== lastSaved.filterAssignee) {
        
        // Clear any existing timeout
        if (preferenceUpdateTimeoutRef.current) {
          clearTimeout(preferenceUpdateTimeoutRef.current);
        }
        
        // Debounce the preference update
        preferenceUpdateTimeoutRef.current = setTimeout(() => {
          isUpdatingPreferencesRef.current = true;
          updateTaskBoardPreferences({
            searchTerm,
            filterPriority,
            filterAssignee,
          });
          // Update the last saved preferences
          lastSavedPreferencesRef.current = {
            searchTerm,
            filterPriority,
            filterAssignee
          };
          isUpdatingPreferencesRef.current = false;
        }, 300); // 300ms debounce
      }
    }
  }, [searchTerm, filterPriority, filterAssignee, isLoaded, updateTaskBoardPreferences], 'TaskBoardPreferenceUpdate', 20);

  // Cleanup timeouts on unmount
  useSafeEffect(() => {
    return () => {
      if (preferenceUpdateTimeoutRef.current) {
        clearTimeout(preferenceUpdateTimeoutRef.current);
      }
    };
  }, [], 'TaskBoardCleanup', 5);

  // Filter tasks based on search and filters
  const filteredTasks = React.useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesAssignee = filterAssignee === 'all' || task.assignee?.id === filterAssignee;
      
      return matchesSearch && matchesPriority && matchesAssignee;
    });
  }, [tasks, searchTerm, filterPriority, filterAssignee]);

  // Handle task movement with error handling
  const handleMoveTask = useCallback((task: Task, newStatus: string) => {
    try {
      // Prevent moving to the same status to avoid unnecessary updates
      if (task.status === newStatus) {
        return;
      }
      
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
      ));
      toast.success(`Moved "${task.title}" to ${stages.find(s => s.id === newStatus)?.name}`);
    } catch (error) {
      console.error('Error moving task:', error);
      toast.error('Failed to move task. Please try again.');
    }
  }, [stages]);

  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    try {
      setSelectedTask(task);
    } catch (error) {
      console.error('Error opening task details:', error);
      toast.error('Failed to open task details. Please try again.');
    }
  }, []);

  // Handle task update
  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
    try {
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ));
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task. Please try again.');
    }
  }, []);

  // Handle adding new task
  const handleAddTask = useCallback((stageId: string) => {
    try {
      setIsAddTaskModalOpen(true);
    } catch (error) {
      console.error('Error opening add task modal:', error);
      toast.error('Failed to open add task modal. Please try again.');
    }
  }, []);

  // Add new task
  const handleCreateTask = useCallback((taskData: Partial<Task>) => {
    try {
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
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task. Please try again.');
    }
  }, []);

  // Cleanup effect to prevent memory leaks
  useSafeEffect(() => {
    return () => {
      // Clean up any pending state updates
      setSelectedTask(null);
      setTasks([]);
      setHasError(false);
    };
  }, [], 'TaskBoardUnmount', 5);

  // If there's an error, show a fallback UI
  if (hasError) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="bg-card border-b border-border shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Task Board</h1>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              There was an error loading the task board. Please try reloading the page.
            </p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm sticky top-0 z-20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Task Board</h1>
              <RealtimeIndicator 
                isConnected={realtimeConnected}
                isReconnecting={isReconnecting}
                reconnectAttempts={reconnectAttempts}
                size="sm"
                showText={true}
              />
              {!realtimeConnected && !isReconnecting && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.reload()}
                  title="Manual reconnect"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reconnect
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={resetTaskBoardPreferences}
                title="Reset filters to defaults"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Filters
              </Button>
              <Button onClick={() => setIsAddTaskModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>
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
                {defaultAssignees.length > 0 ? (
                  defaultAssignees.map(assignee => (
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
        assignees={defaultAssignees}
      />

      {/* Add Task Modal */}
      <AddTaskModal
        open={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onCreateTask={handleCreateTask}
        stages={stages}
        assignees={defaultAssignees}
      />
    </div>
  );
}

export default function TaskBoardPage() {
  return (
    <TaskBoardErrorBoundary>
      <TaskBoardContent />
    </TaskBoardErrorBoundary>
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
