// src/components/tasks/TaskBoard.tsx
"use client";

import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MoreHorizontal, User, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { ScoreBadge } from '@/components/ui/score-color';
import { formatScoreWithGrade } from '@/lib/scoreUtils';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  dueDate?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  fitScore?: number;
  avatarUrl?: string;
  [key: string]: any; // Allow additional properties
}

export interface TaskStage {
  id: string;
  name: string;
  description?: string;
  color?: string;
  sortOrder?: number;
}

interface TaskBoardProps {
  tasks: Task[];
  stages: TaskStage[];
  onMoveTask: (task: Task, newStatus: string) => void;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (stageId: string) => void;
  className?: string;
  showAssignee?: boolean;
  showPriority?: boolean;
  showDueDate?: boolean;
  showTags?: boolean;
}

export function TaskBoard({
  tasks,
  stages,
  onMoveTask,
  onTaskClick,
  onAddTask,
  className,
  showAssignee = true,
  showPriority = false, // Changed to false to hide priority
  showDueDate = false, // Changed to false to hide due date
  showTags = true,
}: TaskBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Group tasks by stage
  const tasksByStage = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    
    // Initialize all stages with empty arrays
    stages.forEach(stage => {
      grouped[stage.id] = [];
    });
    
    // Group tasks by their status
    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    
    return grouped;
  }, [tasks, stages]);

  // Sort stages by sortOrder
  const sortedStages = useMemo(() => {
    return [...stages].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [stages]);

  // Calculate total number of candidates
  const totalCandidates = useMemo(() => {
    return tasks.length;
  }, [tasks]);

  // Navigation handlers
  const handlePrevious = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -320, // Width of one card + gap
        behavior: 'smooth'
      });
    }
  };

  const handleNext = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 320, // Width of one card + gap
        behavior: 'smooth'
      });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
    setIsDragging(true);
    document.body.style.cursor = 'grabbing';
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverStage(null);
    setIsDragging(false);
    document.body.style.cursor = '';
  };

  const handleDragOver = (stageId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedTask && draggedTask.status !== stageId) {
      setDragOverStage(stageId);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're actually leaving the drop zone
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (stageId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedTask && draggedTask.status !== stageId) {
      onMoveTask(draggedTask, stageId);
    }
    
    setDraggedTask(null);
    setDragOverStage(null);
    setIsDragging(false);
    document.body.style.cursor = '';
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

  if (!stages || stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
            <Plus className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">No stages configured</p>
          <p className="text-sm text-muted-foreground">Please configure stages to display tasks</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Navigation Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
        {/* Previous Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        {/* Center - Total Candidates Count */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {totalCandidates} {totalCandidates === 1 ? 'Candidate' : 'Candidates'}
          </Badge>
        </div>

        {/* Next Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Task Board Content */}
      <div 
        ref={scrollContainerRef}
        className="flex gap-4 h-full overflow-x-auto scroll-smooth"
      >
        {sortedStages.map((stage) => {
          const stageTasks = tasksByStage[stage.id] || [];
          const isDragOver = dragOverStage === stage.id;
          const isCurrentStage = draggedTask?.status === stage.id;

          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-80"
            >
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color || '#6b7280' }}
                      />
                      {stage.name}
                      <Badge variant="secondary" className="text-xs">
                        {stageTasks.length}
                      </Badge>
                    </CardTitle>
                    {onAddTask && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onAddTask(stage.id)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {stage.description && (
                    <p className="text-xs text-muted-foreground">{stage.description}</p>
                  )}
                </CardHeader>
                
                <CardContent className="flex-1 p-0">
                  <div
                    className={cn(
                      "h-full p-3 space-y-3 transition-all duration-200 relative",
                      isDragOver && !isCurrentStage && "bg-primary/5"
                    )}
                    onDragOver={(e) => handleDragOver(stage.id, e)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(stage.id, e)}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      if (draggedTask && draggedTask.status !== stage.id) {
                        setDragOverStage(stage.id);
                      }
                    }}
                  >
                    {/* Drop zone indicator */}
                    {isDragOver && !isCurrentStage && (
                      <div className="absolute inset-0 border-2 border-dashed border-primary/50 bg-primary/5 rounded-lg pointer-events-none z-10 flex items-center justify-center">
                        <div className="text-center">
                          <Plus className="w-8 h-8 mx-auto mb-2 text-primary" />
                          <p className="text-sm font-medium text-primary">Drop here</p>
                          <p className="text-xs text-primary/70">Move to {stage.name}</p>
                        </div>
                      </div>
                    )}

                    <ScrollArea className="h-full">
                      <div className="space-y-3">
                        {stageTasks.map((task) => (
                          <div
                            key={task.id}
                            className={cn(
                              "group cursor-pointer p-3 bg-card border border-border rounded-lg hover:shadow-sm transition-all duration-200",
                              draggedTask?.id === task.id && "opacity-60 scale-95"
                            )}
                            draggable
                            onDragStart={() => handleDragStart(task)}
                            onDragEnd={handleDragEnd}
                            onClick={() => onTaskClick?.(task)}
                          >
                            {/* Task Header with Thumbnail */}
                            <div className="flex items-start gap-3 mb-2">
                              {/* Thumbnail with color like candidate ID page */}
                              <div className="relative flex-shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                                <Avatar className="w-10 h-10 text-lg relative ring-2 ring-background/80 shadow-lg bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-800/30">
                                  {task.avatarUrl ? (
                                    <AvatarImage src={task.avatarUrl} alt={task.title} className="object-cover" />
                                  ) : (
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-700 dark:text-blue-300 font-bold">
                                      {task.title?.[0] || '?'}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                                    {task.title}
                                  </h4>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Add task actions menu here
                                    }}
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Task Description */}
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                                {task.description}
                              </p>
                            )}

                            {/* Task Meta Information */}
                            <div className="space-y-2">
                              {/* Fit Score Badge */}
                              {task.fitScore !== undefined && task.fitScore !== null && (
                                <div className="flex items-center gap-1">
                                  <ScoreBadge score={task.fitScore} className="text-xs">
                                    {formatScoreWithGrade(task.fitScore)}
                                  </ScoreBadge>
                                </div>
                              )}

                              {/* Tags */}
                              {showTags && task.tags && task.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {task.tags.slice(0, 2).map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {task.tags.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{task.tags.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Assignee */}
                              {showAssignee && task.assignee && (
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage
                                      src={task.assignee.avatarUrl}
                                      alt={task.assignee.name}
                                    />
                                    <AvatarFallback className="text-xs">
                                      {task.assignee.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground">
                                    {task.assignee.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
