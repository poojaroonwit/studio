// src/components/tasks/TaskBoardNavigation.tsx
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationButtonProps {
  direction: 'left' | 'right';
  onClick: () => void;
  visible: boolean;
  className?: string;
}

export const NavigationButton: React.FC<NavigationButtonProps> = ({ 
  direction, 
  onClick, 
  visible,
  className 
}) => {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  const position = direction === 'left' ? 'left-2' : 'right-2';
  
  if (!visible) return null;
  
  return (
    <button type="button"
      className={cn(
        `absolute ${position} top-1/2 -translate-y-1/2 z-50 h-12 w-12 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer hover:scale-110 hover:shadow-xl`,
        'hover:bg-white dark:hover:bg-gray-800',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
        className
      )}
      onClick={onClick}
      title={direction === 'left' ? 'Previous stage' : 'Next stage'}
      aria-label={`${direction === 'left' ? 'Previous' : 'Next'} stage`}
    >
      <Icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
    </button>
  );
};
