// src/components/tasks/TaskBoard.tsx
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, User, Tag, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { ScoreBadge, getScoreColorInfo } from '@/components/ui/score-color';
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
  email?: string;
  skills?: any[];
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
  showPriority = false,
  showDueDate = false,
  showTags = true,
}: TaskBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
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

  // Calculate average fit score
  const averageFitScore = useMemo(() => {
    const tasksWithScore = tasks.filter(task => task.fitScore !== undefined && task.fitScore !== null);
    if (tasksWithScore.length === 0) return null;
    
    const totalScore = tasksWithScore.reduce((sum, task) => sum + (task.fitScore || 0), 0);
    return Math.round(totalScore / tasksWithScore.length);
  }, [tasks]);





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

  const getFitScoreColor = (score: number) => {
    const colorInfo = getScoreColorInfo(score);
    // Map background colors to corresponding border colors
    const borderColorMap: Record<string, string> = {
      'bg-red-400': 'border-l-red-400',
      'bg-orange-400': 'border-l-orange-400',
      'bg-yellow-200': 'border-l-yellow-200',
      'bg-yellow-400': 'border-l-yellow-400',
      'bg-lime-400': 'border-l-lime-400',
    };
    return borderColorMap[colorInfo.bg] || 'border-l-gray-300 dark:border-l-gray-600';
  };

  // Scroll handlers
  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  // Update scroll state
  const updateScrollState = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Add scroll event listener and resize observer
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      updateScrollState();
      scrollContainer.addEventListener('scroll', updateScrollState);
      
      // Add resize observer to handle container size changes
      const resizeObserver = new ResizeObserver(updateScrollState);
      resizeObserver.observe(scrollContainer);
      
      return () => {
        scrollContainer.removeEventListener('scroll', updateScrollState);
        resizeObserver.disconnect();
      };
    }
  }, [tasks, stages]);



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
    <div className={cn("flex flex-col h-screen bg-muted/50", className)}>
      {/* Header
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {totalCandidates} candidates
            </span>
          </div>
        </div>
      </div> */}

      {/* Board Container with Fixed Navigation Buttons */}
      <div className="relative flex-1" style={{ height: 'calc(100vh - 80px)' }}>

        {/* Scroll Navigation Buttons */}
        {canScrollLeft && (
          <Button
            variant="outline"
            size="sm"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 p-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-gray-300 dark:border-gray-600 shadow-lg hover:bg-white dark:hover:bg-gray-900"
            onClick={handleScrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {canScrollRight && (
          <Button
            variant="outline"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 p-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-gray-300 dark:border-gray-600 shadow-lg hover:bg-white dark:hover:bg-gray-900"
            onClick={handleScrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Scrollable Board Container */}
        <div 
          ref={scrollContainerRef}
          className="flex gap-0 h-full overflow-x-auto scroll-smooth"
        >
        {sortedStages.map((stage, index) => {
          const stageTasks = tasksByStage[stage.id] || [];
          const isDragOver = dragOverStage === stage.id;
          const isCurrentStage = draggedTask?.status === stage.id;
          const isLastColumn = index === sortedStages.length - 1;

          return (
            <div
              key={stage.id}
              className={cn(
                "flex-shrink-0 w-80 border-r border-gray-200 dark:border-gray-800 h-full",
                isLastColumn && "border-r-0"
              )}
            >
              <div className="h-full flex flex-col">
                {/* Table Header Row */}
                <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {stage.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium">
                        {stageTasks.length}
                      </span>
                    </div>
                    {onAddTask && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        onClick={() => onAddTask(stage.id)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Table Body - Full Height Drop Zone */}
                <div 
                  className={cn(
                    "flex-1 bg-white dark:bg-gray-950 transition-all duration-200 relative min-h-0",
                    isDragOver && !isCurrentStage && "bg-blue-50/50 dark:bg-blue-900/20"
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
                    <div className="absolute inset-0 border-2 border-dashed border-blue-400/60 bg-blue-50/30 dark:bg-blue-900/20 pointer-events-none z-10 flex items-center justify-center">
                      <div className="text-center">
                        <Plus className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Drop here</p>
                        <p className="text-xs text-blue-500/70 dark:text-blue-400/70">Move to {stage.name}</p>
                      </div>
                    </div>
                  )}

                  {/* Table Rows Container */}
                  <div className="h-full overflow-y-auto">
                    <div className="p-4 space-y-3">
                      {stageTasks.map((task) => (
                        <div
                          key={task.id}
                          className={cn(
                            "group cursor-pointer p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors border-l-8 rounded-lg bg-white dark:bg-gray-900 shadow-md hover:shadow-lg",
                            draggedTask?.id === task.id && "opacity-60 scale-95",
                            task.fitScore !== undefined && task.fitScore !== null ? getFitScoreColor(task.fitScore) : "border-l-gray-300 dark:border-l-gray-600"
                          )}
                          draggable
                          onDragStart={() => handleDragStart(task)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onTaskClick?.(task)}
                        >
                          {/* Table Row Content */}
                          <div className="flex items-start gap-3 mb-3">
                            {/* Avatar Cell */}
                            <Avatar className="w-8 h-8 text-xs relative ring-1 ring-gray-200 dark:ring-gray-700 bg-gray-100 dark:bg-gray-800">
                              {task.avatarUrl ? (
                                <AvatarImage src={task.avatarUrl} alt={task.title} className="object-cover" />
                              ) : (
                                <AvatarFallback className="text-gray-600 dark:text-gray-400 font-medium">
                                  {task.title?.[0] || '?'}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            
                            {/* Content Cell */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {task.title}
                                  </h4>
                            
                              
                                {/* Description Row */}
                                {task.description && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                                    {task.description}
                                  </p>
                                )}
                                {/* Email Row */}
                                {task.email && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                    {task.email}
                                  </p>
                                )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {/* Fit Score Badge */}
                                  {task.fitScore !== undefined && task.fitScore !== null && (
                                    <ScoreBadge score={task.fitScore} className="text-xs">
                                      {formatScoreWithGrade(task.fitScore)}
                                    </ScoreBadge>
                                  )}
                                </div>
                              </div>
                             
                            </div>
                          </div>


                          {/* Meta Information Row */}
                          <div className="space-y-2">
                            {/* Skills */}
                            {task.skills && task.skills.length > 0 && (
                              <div className="space-y-1">
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                  <span className="font-medium">Skills:</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {task.skills.slice(0, 3).map((skill: any, idx: number) => (
                                    <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                                      {skill.skill_string || skill.segment_skill || 'Skill'}
                                    </span>
                                  ))}
                                  {task.skills.length > 3 && (
                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                                      +{task.skills.length - 3} other
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Position Applied (non-badge) */}
                            {task.tags && task.tags.length > 0 && (
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                <span className="font-medium">Position:</span> {task.tags[0]}
                              </div>
                            )}

                     
                           
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
