import { ScoreBadge } from '@/components/ui/score-color';
import { UserAvatarCompact } from '@/components/ui/user-avatar';
import { formatScoreWithGrade } from '@/lib/scoreUtils';
import type { Task, TaskCardPreferences } from './task-card-types';

interface TaskCardDisplayProps {
  cardPreferences?: TaskCardPreferences;
  task: Task;
}

export function TaskCardAvatar({ task }: { task: Task }) {
  return (
    <UserAvatarCompact
      user={{
        id: task.assignee?.id || task.id,
        name: task.assignee?.name || task.title,
        avatarUrl: task.assignee?.avatarUrl || task.avatarUrl,
        email: task.email,
      }}
      size="sm"
      className="ring-1 ring-gray-200 dark:ring-gray-700"
    />
  );
}

export function TaskCardFitScore({
  cardPreferences,
  task,
}: TaskCardDisplayProps) {
  if (
    cardPreferences &&
    !cardPreferences.showFitScore
  ) {
    return null;
  }

  if (task.fitScore === undefined || task.fitScore === null) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      <ScoreBadge score={task.fitScore} className="text-xs">
        {formatScoreWithGrade(task.fitScore)}
      </ScoreBadge>
    </div>
  );
}

export function TaskCardFields({
  task,
  cardPreferences,
}: TaskCardDisplayProps) {
  if (!cardPreferences) return null;

  return (
    <>
      {cardPreferences.showAssignee && task.assignee && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Assigned to:</span>
          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
            {task.assignee.name}
          </span>
        </div>
      )}

      {cardPreferences.showSkills && task.skills && task.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.skills.slice(0, 2).map((skill, idx) => (
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

      {cardPreferences.showJobApplied && task.tags && task.tags.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 min-w-0">
            <span className="font-medium flex-shrink-0">Applied for: </span>
            <span className="truncate">{task.tags[0]}</span>
          </div>
        </div>
      )}
    </>
  );
}
