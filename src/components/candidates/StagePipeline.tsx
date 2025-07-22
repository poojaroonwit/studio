"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Info, Edit } from 'lucide-react';
import type { RecruitmentStage, TransitionRecord } from '@/lib/types';
import { toast } from 'react-hot-toast';

interface StagePipelineProps {
  stages: RecruitmentStage[];
  transitionHistory: TransitionRecord[];
  currentStatus: string;
  onStageClick: (stageName: string) => void;
  editableNotes: boolean;
  onNoteEdit: (transitionId: string, newNote: string) => Promise<void>;
  candidateId: string;
}

export function StagePipeline({
  stages,
  transitionHistory,
  currentStatus,
  onStageClick,
  editableNotes,
  onNoteEdit,
  candidateId
}: StagePipelineProps) {
  // Map stage name to all transition records for that stage
  const stageToRecords: Record<string, TransitionRecord[]> = {};
  const safeTransitionHistory = Array.isArray(transitionHistory) ? transitionHistory : [];
  safeTransitionHistory.forEach(record => {
    if (!stageToRecords[record.stage]) stageToRecords[record.stage] = [];
    stageToRecords[record.stage].push(record);
  });

  // Track which popover is open by index
  const [openPopoverIdx, setOpenPopoverIdx] = useState<number | null>(null);
  // Track which tooltip is hovered by index
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  
  // Real-time state management
  const [localStages, setLocalStages] = useState<RecruitmentStage[]>(stages);
  const [localTransitionHistory, setLocalTransitionHistory] = useState<TransitionRecord[]>(transitionHistory);
  const [localCurrentStatus, setLocalCurrentStatus] = useState<string>(currentStatus);
  const [isUpdating, setIsUpdating] = useState<Set<string>>(new Set());
  // Removed: const [isConnected, setIsConnected] = useState(false);
  // Removed: const eventSourceRef = useRef<EventSource | null>(null);

  // Update local state when props change
  useEffect(() => {
    setLocalStages(stages);
  }, [stages]);

  useEffect(() => {
    setLocalTransitionHistory(transitionHistory);
  }, [transitionHistory]);

  useEffect(() => {
    setLocalCurrentStatus(currentStatus);
  }, [currentStatus]);

  // Removed: useEffect for SSE setup and cleanup

  // Enhanced note edit handler with real-time feedback
  const handleNoteEdit = useCallback(async (transitionId: string, newNote: string) => {
    setIsUpdating(prev => new Set(prev).add(transitionId));
    
    try {
      await onNoteEdit(transitionId, newNote);
      
      // Optimistically update local state
      setLocalTransitionHistory(prev => 
        prev.map(t => 
          t.id === transitionId 
            ? { ...t, notes: newNote }
            : t
        )
      );
      
      toast.success('Note updated successfully');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    } finally {
      setIsUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(transitionId);
        return newSet;
      });
    }
  }, [onNoteEdit]);

  // Enhanced stage click handler with visual feedback
  const handleStageClick = useCallback((stageName: string) => {
    const isCompleted = localTransitionHistory.some(r => r.stage === stageName);
    if (!isCompleted) {
      onStageClick(stageName);
    }
  }, [localTransitionHistory, onStageClick]);

  // Rebuild stage to records mapping when transition history changes
  const currentStageToRecords: Record<string, TransitionRecord[]> = {};
  const safeLocalTransitionHistory = Array.isArray(localTransitionHistory) ? localTransitionHistory : [];
  safeLocalTransitionHistory.forEach(record => {
    if (!currentStageToRecords[record.stage]) currentStageToRecords[record.stage] = [];
    currentStageToRecords[record.stage].push(record);
  });

  return (
    <div className="flex flex-col gap-0.5 mb-6 relative">
      {/* Real-time connection indicator */}
      {/* <div className="flex items-center gap-2 mb-2 text-xs">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
        <span className="text-muted-foreground">
          {isConnected ? 'Real-time updates active' : 'Connecting...'}
        </span>
      </div> */}
      
      {localStages.map((stage, idx) => {
        const records = currentStageToRecords[stage.name] || [];
        const isCompleted = localTransitionHistory.some(r => r.stage === stage.name);
        const isCurrent = localCurrentStatus === stage.name;
        const latestRecord = records.length > 0 ? records[records.length - 1] : null;
        const latestNote = latestRecord ? latestRecord.notes : null;
        const latestUser = latestRecord ? (latestRecord.actingUserName || 'Unknown') : null;
        const latestDate = latestRecord && latestRecord.date ? new Date(latestRecord.date).toLocaleString() : null;
        
        return (
          <div key={stage.id} className="relative flex items-start">
            {/* Vertical line for workflow, except after last node */}
            {idx < localStages.length - 1 && (
              <div className="absolute top-4 w-px h-full z-0" style={{height: 'calc(100% - 0rem)',width: 'calc(2.75rem)'}}>
                <div 
                  className="w-px h-full bg-gray-300 mx-auto transition-colors duration-300" 
                  style={{
                    background: isCompleted 
                      ? (stage.name.toLowerCase().includes('reject') ? '#ef4444' : (stage.color_complete || '#22c55e')) 
                      : '#d1d5db'
                  }} 
                />
              </div>
            )}
            
            <Popover open={openPopoverIdx === idx}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`flex items-center gap-3 cursor-pointer px-3 py-2 rounded-full transition-all duration-300 relative z-10
                    ${isCurrent 
                      ? 'bg-secondary border-grey-900 font-bold' 
                      : isCompleted 
                        ? (stage.name.toLowerCase().includes('reject')
                            ? 'bg-red-500 border-red-700 text-white font-bold shadow-red-400 shadow-lg'
                            : '')
                        : 'bg-muted/10 text-muted-foreground hover:bg-muted/20'}
                  `}
                  onClick={() => handleStageClick(stage.name)}
                >
                  {/* Node circle with checkmark if completed */}
                  <div className={`w-5 h-5 flex items-center justify-center rounded-full border-2 transition-all duration-300
                    ${isCompleted
                      ? (stage.name.toLowerCase().includes('reject')
                          ? 'bg-red-500 border-red-600 text-white'
                          : '')
                      : isCurrent ? 'bg-primary border-primary text-white' : 'bg-gray-300 border-gray-300 text-gray-500'}`}
                    style={
                      isCompleted && !stage.name.toLowerCase().includes('reject')
                        ? { backgroundColor: stage.color_complete || '#22c55e', borderColor: stage.color_complete || '#22c55e', color: '#fff' }
                        : undefined
                    }
                  >
                    {isCompleted ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-card block"></span>
                    )}
                  </div>
                  <span className="transition-all duration-300">{stage.name}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-80" 
                align="start" 
                sideOffset={4} 
                onMouseEnter={() => setOpenPopoverIdx(idx)} 
                onMouseLeave={() => setOpenPopoverIdx(null)}
              >
                <div className="mb-1 font-semibold">{stage.name}</div>
                {records.length > 0 ? (
                  <ul className="space-y-2">
                    {records.map((record, i) => (
                      <li key={record.id} className="border-b pb-2 last:border-b-0 last:pb-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Info className="h-3 w-3" />
                          <span>{record.notes || <span className='italic text-muted-foreground'>No note</span>}</span>
                          {editableNotes && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newNote = prompt("Edit note:", record.notes);
                                if (newNote && newNote.trim() !== '') {
                                  handleNoteEdit(record.id, newNote.trim());
                                }
                              }}
                              disabled={isUpdating.has(record.id)}
                            >
                              {isUpdating.has(record.id) ? (
                                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Edit className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span>By: <span className="font-medium">{record.actingUserName || 'Unknown'}</span></span>
                          <span className="text-muted-foreground">|</span>
                          <span>{record.date ? new Date(record.date).toLocaleString() : ''}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-muted-foreground">No transition record for this stage yet.</div>
                )}
              </PopoverContent>
            </Popover>
            
            {/* Hover zone for tooltip to the right of the button */}
            <div
              className="absolute left-full top-0 h-full w-8"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'pointer' }}
            />
            
            {/* Tooltip only appears when hovering the hover zone, not the button */}
            {hoveredIdx === idx && records.length > 0 && (
              <div className="absolute left-[calc(100%+2rem)] top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-black text-white text-xs rounded shadow-lg z-50 max-w-xs whitespace-pre-line min-w-[220px] max-h-64 overflow-y-auto">
                <div className="mb-1 font-semibold">Stage Notes</div>
                <ul className="space-y-2">
                  {records.map((record, i) => (
                    <li key={record.id} className="border-b border-gray-700 pb-1 last:border-b-0 last:pb-0">
                      <div className="mb-0.5">{record.notes || <span className='italic text-gray-300'>No note</span>}</div>
                      <div className="text-[10px] text-gray-300">
                        By: {record.actingUserName || 'Unknown'}
                        {record.date ? ` | ${new Date(record.date).toLocaleString()}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 