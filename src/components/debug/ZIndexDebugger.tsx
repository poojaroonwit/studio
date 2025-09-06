"use client";

import React from 'react';
import { useZIndexDebug, useDynamicZIndex } from '@/contexts/ZIndexContext';

interface ZIndexDebuggerProps {
  isVisible?: boolean;
}

export const ZIndexDebugger: React.FC<ZIndexDebuggerProps> = ({ isVisible = false }) => {
  const { contentZIndex } = useDynamicZIndex('z-index-debugger', 'overlay');
  const layers = useZIndexDebug();

  // Only show in development
  if (process.env.NODE_ENV !== 'development' || !isVisible) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg shadow-lg max-w-sm"
      style={{ zIndex: contentZIndex }}
    >
      <h3 className="text-sm font-bold mb-2">Z-Index Layers</h3>
      <div className="space-y-1 text-xs">
        {layers.length === 0 ? (
          <p className="text-gray-400">No active layers</p>
        ) : (
          layers.map((layer) => (
            <div key={layer.id} className="flex justify-between items-center">
              <span className="truncate">{layer.id}</span>
              <span className="ml-2 text-blue-400">{layer.zIndex}</span>
            </div>
          ))
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-600">
        <p className="text-xs text-gray-400">
          Total: {layers.length} layers
        </p>
        <p className="text-xs text-gray-400">
          Debugger z-index: {contentZIndex}
        </p>
      </div>
    </div>
  );
};

// Hook to toggle debugger visibility
export const useZIndexDebugger = () => {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return { isVisible, setIsVisible };
};