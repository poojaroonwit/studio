import type { Task, TaskCardPreferences } from './task-card-types';
import {
  TaskCardAvatar,
  TaskCardFields,
  TaskCardFitScore,
} from './TaskCardDisplayParts';

interface TaskCardHeaderProps {
  cardPreferences?: TaskCardPreferences;
  task: Task;
}

export function TaskCardHeader({
  cardPreferences,
  task,
}: TaskCardHeaderProps) {
  return (
    <div className="flex items-start gap-3 mb-1">
      {(!cardPreferences || cardPreferences.showAvatar) && (
        <TaskCardAvatar task={task} />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {(!cardPreferences || cardPreferences.showName) && (
              <h4 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {task.title}
              </h4>
            )}

            {(!cardPreferences || cardPreferences.showEmail) && task.email && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {task.email}
              </p>
            )}

            <TaskCardFields task={task} cardPreferences={cardPreferences} />
          </div>

          <TaskCardFitScore task={task} cardPreferences={cardPreferences} />
        </div>
      </div>
    </div>
  );
}
