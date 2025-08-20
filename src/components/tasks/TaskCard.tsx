// src/components/tasks/TaskCard.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { UserAvatarCompact } from '@/components/ui/user-avatar';
import { ScoreBadge, getScoreColorInfo } from '@/components/ui/score-color';
import { formatScoreWithGrade } from '@/lib/scoreUtils';
import { cn } from '@/lib/utils';

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
  [key: string]: any;
}

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
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

const TaskCardFields: React.FC<{ task: Task; cardPreferences?: TaskCardProps['cardPreferences'] }> = ({ 
  task, 
  cardPreferences 
}) => {
  if (!cardPreferences) return null;

  return (
    <>
      {/* Assignee */}
      {cardPreferences.showAssignee && task.assignee && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Assigned to:</span>
          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
            {task.assignee.name}
          </span>
        </div>
      )}



      {/* Skills */}
      {cardPreferences.showSkills && task.skills && task.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.skills.slice(0, 2).map((skill: any, idx: number) => (
            <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs">
              {skill.skill_string || skill.segment_skill || 'Skill'}
            </span>
          ))}
          {task.skills.length > 2 && (
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs">
              +{task.skills.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Job Applied */}
      {cardPreferences.showJobApplied && task.tags && task.tags.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Applied for: </span> {task.tags[0]}
          </div>
        </div>
      )}
    </>
  );
};

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onClick, 
  onDragStart, 
  onDragEnd, 
  isDragging,
  cardPreferences 
}) => {
  const getFitScoreColor = (score: number) => {
    const colorInfo = getScoreColorInfo(score);
    const borderColorMap: Record<string, string> = {
      'bg-red-400': 'border-l-red-400',
      'bg-orange-400': 'border-l-orange-400',
      'bg-yellow-200': 'border-l-yellow-200',
      'bg-yellow-400': 'border-l-yellow-400',
      'bg-lime-400': 'border-l-lime-400',
    };
    return borderColorMap[colorInfo.bg] || 'border-l-gray-300 dark:border-l-gray-600';
  };

  return (
    <div
      className={cn(
        "group cursor-pointer p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors border-l-8 rounded-lg bg-white dark:bg-gray-900 shadow-md hover:shadow-lg",
        isDragging && "opacity-60 scale-95",
        task.fitScore !== undefined && task.fitScore !== null ? getFitScoreColor(task.fitScore) : "border-l-gray-300 dark:border-l-gray-600"
      )}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-1">
        {/* Avatar */}
        {(!cardPreferences || cardPreferences.showAvatar) && (
          <UserAvatarCompact 
            user={{
              id: task.id,
              name: task.title,
              avatarUrl: task.avatarUrl,
              email: task.email
            }}
            size="sm"
            className="ring-1 ring-gray-200 dark:ring-gray-700"
          />
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Name */}
              {(!cardPreferences || cardPreferences.showName) && (
                <h4 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {task.title}
                </h4>
              )}
              

              
              {/* Email */}
              {(!cardPreferences || cardPreferences.showEmail) && task.email && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {task.email}
                </p>
              )}

              {/* Additional Fields */}
              <TaskCardFields task={task} cardPreferences={cardPreferences} />
            </div>
            
            {/* Fit Score */}
            <div className="flex items-center gap-1">
              {(!cardPreferences || cardPreferences.showFitScore) && task.fitScore !== undefined && task.fitScore !== null && (
                <ScoreBadge score={task.fitScore} className="text-xs">
                  {formatScoreWithGrade(task.fitScore)}
                </ScoreBadge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
