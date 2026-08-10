import { useCallback, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { TaskCardHeader } from './TaskCardParts';
import {
  getTaskFitScoreBorderClass,
  isTaskCardKeyboardActivationKey,
} from './task-card-utils';
import type { Task, TaskCardPreferences, TaskPriority, TaskSkill } from './task-card-types';

export type { Task, TaskCardPreferences, TaskPriority, TaskSkill };

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
  cardPreferences?: TaskCardPreferences;
}

export function TaskCard({
  task,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
  cardPreferences
}: TaskCardProps) {
  const handleDragStart = useCallback((e: DragEvent) => {
    e.stopPropagation();
    onDragStart();
  }, [onDragStart]);

  const handleDragEnd = useCallback((e: DragEvent) => {
    e.stopPropagation();
    onDragEnd();
  }, [onDragEnd]);

  const handleClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
  }, [onClick]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (isTaskCardKeyboardActivationKey(event.key)) {
      event.preventDefault();
      event.currentTarget.click();
    }
  }, []);

  return (
    <div
      className={cn(
        "group cursor-pointer p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors border-l-8 rounded-lg bg-white dark:bg-gray-900 shadow-md hover:shadow-lg",
        isDragging && "opacity-60 scale-95",
        getTaskFitScoreBorderClass(task.fitScore)
      )}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <TaskCardHeader task={task} cardPreferences={cardPreferences} />
    </div>
  );
}
