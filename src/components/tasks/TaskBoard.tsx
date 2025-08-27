// src/components/tasks/TaskBoard.tsx
"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

import { TaskCard, Task } from './TaskCard';

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
  cardPreferences?: {
    cardWidth: 'narrow' | 'medium' | 'wide' | 'custom';
    customCardWidth?: number;
    showAvatar: boolean;
    showName: boolean;
    showEmail: boolean;
    showFitScore: boolean;
    showAssignee: boolean;
    showSkills: boolean;
    showJobApplied: boolean;
  };
}

// Stage Column Component
interface StageColumnProps {
  stage: TaskStage;
  tasks: Task[];
  isDragOver: boolean;
  isCurrentStage: boolean;
  isLastColumn: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (stageId: string) => void;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  draggedTask: Task | null;
  cardPreferences?: TaskBoardProps['cardPreferences'];
  getCardWidth: () => { className: string; style: React.CSSProperties };
}

const StageColumn: React.FC<StageColumnProps> = ({
  stage,
  tasks,
  isDragOver,
  isCurrentStage,
  isLastColumn,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnter,
  onTaskClick,
  onAddTask,
  onDragStart,
  onDragEnd,
  draggedTask,
  cardPreferences,
  getCardWidth
}) => {
  // Pagination state for this column
  const [visibleCount, setVisibleCount] = useState(20);
  const ITEMS_PER_PAGE = 20;
  const hasMoreItems = tasks.length > visibleCount;

  // Reset visible count when tasks change
  React.useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [tasks.length]);

  const handleSeeMore = () => {
    setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, tasks.length));
  };

  const handleSeeLess = () => {
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const visibleTasks = tasks.slice(0, visibleCount);

  return (
    <div
      className={cn(
        "flex-shrink-0 border-r border-gray-200 dark:border-gray-800 h-full",
        isLastColumn && "border-r-0"
      )}
      style={{ 
        width: '320px', 
        minWidth: '320px',
        ...getCardWidth().style 
      }}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {stage.name}
              </h3>
              <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium">
                {tasks.length}
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

        {/* Drop Zone */}
        <div 
          className={cn(
            "flex-1 bg-gray-50 dark:bg-gray-900 transition-all duration-200 relative min-h-0",
            isDragOver && !isCurrentStage && "bg-blue-50/50 dark:bg-blue-900/20"
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onDragEnter={onDragEnter}
        >
          {/* Drop Indicator */}
          {isDragOver && !isCurrentStage && (
            <div className="absolute inset-0 border-2 border-dashed border-blue-400/60 bg-blue-50/30 dark:bg-blue-900/20 pointer-events-none z-10 flex items-center justify-center">
              <div className="text-center">
                <Plus className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Drop here</p>
                <p className="text-xs text-blue-500/70 dark:text-blue-400/70">Move to {stage.name}</p>
              </div>
            </div>
          )}

          {/* Tasks */}
          <div className="h-full overflow-y-auto">
            <div className="p-4 space-y-3">
              {visibleTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick?.(task)}
                  onDragStart={() => onDragStart(task)}
                  onDragEnd={onDragEnd}
                  isDragging={draggedTask?.id === task.id}
                  cardPreferences={cardPreferences}
                />
              ))}
              
              {/* Pagination Controls */}
              {hasMoreItems && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={handleSeeMore}
                  >
                    See More ({tasks.length - visibleCount} more)
                  </Button>
                </div>
              )}
              
              {visibleCount > ITEMS_PER_PAGE && (
                <div className="pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleSeeLess}
                  >
                    Show Less
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main TaskBoard Component
export function TaskBoard({
  tasks,
  stages,
  onMoveTask,
  onTaskClick,
  onAddTask,
  className,
  cardPreferences,
}: TaskBoardProps) {
  // State
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Scroll navigation state
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add rate limiting for drag operations to prevent resource leaks
  const lastDragTimeRef = useRef<number>(0);

  // Memoized data
  const tasksByStage = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    stages.forEach(stage => {
      grouped[stage.id] = [];
    });
    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    return grouped;
  }, [tasks, stages]);

  const sortedStages = useMemo(() => {
    const sorted = [...stages].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return sorted;
  }, [stages]);

  // Card width calculation
  const getCardWidth = useCallback(() => {
    if (!cardPreferences) return { className: 'w-64', style: {} };
    
    const { cardWidth, customCardWidth } = cardPreferences;
    
    switch (cardWidth) {
      case 'narrow':
        return { className: 'w-52', style: {} };
      case 'medium':
        return { className: 'w-64', style: {} };
      case 'wide':
        return { className: 'w-80', style: {} };
      case 'custom':
        const width = customCardWidth || 256;
        return { 
          className: 'flex-shrink-0 flex-grow-0', 
          style: { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }
        };
      default:
        return { className: 'w-64', style: {} };
    }
  }, [cardPreferences]);

  // Always show all stages
  const visibleStagesList = useMemo(() => {
    return sortedStages;
  }, [sortedStages]);

  // Scroll navigation functions
  const scrollLeft = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 320; // Width of approximately one column
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 320; // Width of approximately one column
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }, []);

  // Check scroll position and update button visibility
  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const canScrollLeftValue = scrollLeft > 10;
      const canScrollRightValue = scrollLeft < scrollWidth - clientWidth - 10;
      
      setCanScrollLeft(canScrollLeftValue);
      setCanScrollRight(canScrollRightValue);
    }
  }, []);

  // Set up scroll event listener and initial check
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollButtons);
      
      // Multiple checks to ensure content is rendered
      const timeouts = [
        setTimeout(updateScrollButtons, 100),
        setTimeout(updateScrollButtons, 300),
        setTimeout(updateScrollButtons, 500),
        setTimeout(updateScrollButtons, 1000)
      ];
      
      return () => {
        container.removeEventListener('scroll', updateScrollButtons);
        timeouts.forEach(clearTimeout);
        // Clear any remaining timeouts to prevent memory leaks
        timeouts.forEach(timeoutId => {
          if (timeoutId) clearTimeout(timeoutId);
        });
      };
    }
  }, [updateScrollButtons, visibleStagesList]);

  // Update scroll buttons when window resizes
  useEffect(() => {
    const handleResize = () => {
      // Clear any existing timeout to prevent resource leaks
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
      resizeTimeoutRef.current = setTimeout(updateScrollButtons, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
    };
  }, [updateScrollButtons]);

  // Cleanup effect to prevent resource leaks on unmount
  useEffect(() => {
    return () => {
      // Reset all drag state to prevent memory leaks
      setDraggedTask(null);
      setDragOverStage(null);
      setIsDragging(false);
      document.body.style.cursor = '';
      
      // Clear any remaining timeouts
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
    };
  }, []);

  // Drag and drop handlers
  const handleDragStart = useCallback((task: Task) => {
    // Rate limiting: prevent rapid drag operations to prevent resource leaks
    const now = Date.now();
    if (now - lastDragTimeRef.current < 100) {
      return;
    }
    lastDragTimeRef.current = now;
    
    setDraggedTask(task);
    setIsDragging(true);
    document.body.style.cursor = 'grabbing';
  }, []);

  const handleDragEnd = useCallback(() => {
    // Ensure all drag state is properly reset to prevent resource leaks
    setDraggedTask(null);
    setDragOverStage(null);
    setIsDragging(false);
    document.body.style.cursor = '';
  }, []);

  const handleDragOver = useCallback((stageId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedTask && draggedTask.status !== stageId) {
      setDragOverStage(stageId);
      e.dataTransfer.dropEffect = 'move';
    }
  }, [draggedTask]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y < rect.bottom) {
      setDragOverStage(null);
    }
  }, []);

  const handleDrop = useCallback((stageId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Rate limiting: prevent rapid drop operations to prevent resource leaks
    const now = Date.now();
    if (now - lastDragTimeRef.current < 100) {
      return;
    }
    lastDragTimeRef.current = now;
    
    if (draggedTask && draggedTask.status !== stageId) {
      onMoveTask(draggedTask, stageId);
    }
    
    // Ensure all drag state is properly reset to prevent resource leaks
    setDraggedTask(null);
    setDragOverStage(null);
    setIsDragging(false);
    document.body.style.cursor = '';
  }, [draggedTask, onMoveTask]);

  // Empty state
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
    <div className={cn("flex flex-col h-full bg-gray-100/50 dark:bg-gray-800/50", className)}>
      {/* Board Container */}
      <div className="relative flex-1">
        {/* Scroll Navigation Buttons */}
        {canScrollLeft && (
          <button
            onClick={scrollLeft}
            aria-label="Scroll left"
            className="fixed left-74 top-1/2 transform -translate-y-1/2 z-50 w-12 h-12 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 backdrop-blur-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        
        {canScrollRight && (
          <button
            onClick={scrollRight}
            aria-label="Scroll right"
            className="fixed right-8 top-1/2 transform -translate-y-1/2 z-50 w-12 h-12 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 backdrop-blur-sm"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Scrollable Board Container */}
        <div 
          ref={scrollContainerRef}
          className="flex gap-0 h-full overflow-x-auto overflow-y-hidden scrollbar-hide"
          style={{ 
            WebkitOverflowScrolling: 'touch'
          }}
        >
          
          <div className="flex gap-0 h-full" style={{ minWidth: 'max-content' }}>
            {visibleStagesList.map((stage, index) => {
              const stageTasks = tasksByStage[stage.id] || [];
              const isDragOver = dragOverStage === stage.id;
              const isCurrentStage = draggedTask?.status === stage.id;
              const isLastColumn = index === sortedStages.length - 1;

              return (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  tasks={stageTasks}
                  isDragOver={isDragOver}
                  isCurrentStage={isCurrentStage}
                  isLastColumn={isLastColumn}
                  onDragOver={(e) => handleDragOver(stage.id, e)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(stage.id, e)}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (draggedTask && draggedTask.status !== stage.id) {
                      setDragOverStage(stage.id);
                    }
                  }}
                  onTaskClick={onTaskClick}
                  onAddTask={onAddTask}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  draggedTask={draggedTask}
                  cardPreferences={cardPreferences}
                  getCardWidth={getCardWidth}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
