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
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Removed: const [isConnected, setIsConnected] = useState(false);
  // Removed: const eventSourceRef = useRef<EventSource | null>(null);

  // Ref for timeout cleanup
  const transitioningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Clear loading state when status changes (indicating successful transition)
  useEffect(() => {
    if (isTransitioning && localCurrentStatus !== currentStatus) {
      setIsTransitioning(false);
    }
  }, [currentStatus, localCurrentStatus, isTransitioning]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (transitioningTimeoutRef.current) {
        clearTimeout(transitioningTimeoutRef.current);
      }
    };
  }, []);

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

  // Enhanced stage click handler with real-time feedback
  const handleStageClick = useCallback((stageName: string) => {
    // Show loading state if clicking on a different stage
    if (stageName !== localCurrentStatus) {
      setIsTransitioning(true);
      // Hide loading state after a reasonable timeout (in case the transition fails)
      const timeoutId = setTimeout(() => setIsTransitioning(false), 10000);
      
      // Store timeout ID for cleanup
      if (transitioningTimeoutRef.current) {
        clearTimeout(transitioningTimeoutRef.current);
      }
      transitioningTimeoutRef.current = timeoutId;
    }
    onStageClick(stageName);
  }, [localTransitionHistory, onStageClick, localCurrentStatus]);

  // Cleanup timeout on unmount to prevent resource leaks
  useEffect(() => {
    return () => {
      if (transitioningTimeoutRef.current) {
        clearTimeout(transitioningTimeoutRef.current);
        transitioningTimeoutRef.current = null;
      }
    };
  }, []);

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
                 const records = currentStageToRecords[stage.id] || [];
                 const currentStageIndex = localStages?.findIndex(s => s.id === localCurrentStatus) ?? -1;
        const isCompleted = idx < currentStageIndex;
        const isCurrent = localCurrentStatus === stage.id;
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
                     ${isCurrent && isTransitioning ? 'animate-pulse' : ''}
                   `}
                   onClick={() => handleStageClick(stage.id)}
                   title={`${stage.name} - ${isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Future'} stage${records.length > 0 ? ` (${records.length} update${records.length > 1 ? 's' : ''})` : ''}`}
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
                    ) : isCurrent && isTransitioning ? (
                      <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-card block"></span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="transition-all duration-300">{stage.name}</span>
                    {/* Duration indicator */}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {(() => {
                        // If there's a transition record for this stage, calculate actual duration
                        if (latestRecord && latestRecord.date) {
                          const stageDate = new Date(latestRecord.date);
                          let endDate;
                          
                          if (isCurrent) {
                            // For current stage, use current time
                            endDate = new Date();
                          } else {
                            // For passed stages, find the next stage record to calculate duration
                            const nextStageRecord = localTransitionHistory
                              .filter(record => record.stage !== stage.id)
                              .find(record => {
                                const recordDate = new Date(record.date);
                                return recordDate > stageDate;
                              });
                            
                            if (nextStageRecord) {
                              // If there's a next stage, calculate duration between stages
                              endDate = new Date(nextStageRecord.date);
                            } else {
                              // If no next stage found, return empty
                              return '';
                            }
                          }
                          
                          const diffTime = Math.abs(endDate.getTime() - stageDate.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          
                          if (diffDays === 1) {
                            return '1 day';
                          } else if (diffDays < 7) {
                            return `${diffDays} days`;
                          } else if (diffDays < 30) {
                            const weeks = Math.floor(diffDays / 7);
                            return `${weeks} week${weeks > 1 ? 's' : ''}`;
                          } else {
                            const months = Math.floor(diffDays / 30);
                            return `${months} month${months > 1 ? 's' : ''}`;
                          }
                        }
                        
                        // For stages without transition records, show default duration based on stage position
                        if (!isCompleted && !isCurrent) {
                          // Calculate expected duration based on stage position
                          const stageIndex = localStages.findIndex(s => s.id === stage.id);
                          
                          // Default duration logic: earlier stages typically take less time
                          let defaultDays;
                          if (stageIndex === 0) {
                            defaultDays = 3; // First stage: 3 days
                          } else if (stageIndex === 1) {
                            defaultDays = 5; // Second stage: 5 days
                          } else if (stageIndex === 2) {
                            defaultDays = 7; // Third stage: 7 days
                          } else if (stageIndex === 3) {
                            defaultDays = 10; // Fourth stage: 10 days
                          } else {
                            defaultDays = 14; // Later stages: 14 days
                          }
                          
                          if (defaultDays === 1) {
                            return '1 day';
                          } else if (defaultDays < 7) {
                            return `${defaultDays} days`;
                          } else if (defaultDays < 30) {
                            const weeks = Math.floor(defaultDays / 7);
                            return `${weeks} week${weeks > 1 ? 's' : ''}`;
                          } else {
                            const months = Math.floor(defaultDays / 30);
                            return `${months} month${months > 1 ? 's' : ''}`;
                          }
                        }
                        
                        return '';
                      })()}
                    </div>
                  </div>
                  {/* Show loading indicator for current stage during transition */}
                  {isCurrent && isTransitioning && (
                    <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                  )}
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
                
                {/* Duration information */}
                <div className="mt-3 pt-2 border-t border-muted">
                  <div className="text-xs text-muted-foreground mb-1">Duration:</div>
                  <div className="text-sm">
                    {(() => {
                      // Only show duration for passed stages and current stage
                      if (isCompleted || isCurrent) {
                        // If there's a transition record for this stage, calculate actual duration
                        if (latestRecord && latestRecord.date) {
                          const stageDate = new Date(latestRecord.date);
                          let endDate;
                          
                          if (isCurrent) {
                            // For current stage, use current time
                            endDate = new Date();
                          } else {
                            // For passed stages, find the next stage record to calculate duration
                            const nextStageRecord = localTransitionHistory
                              .filter(record => record.stage !== stage.id)
                              .find(record => {
                                const recordDate = new Date(record.date);
                                return recordDate > stageDate;
                              });
                            
                            if (nextStageRecord) {
                              // If there's a next stage, calculate duration between stages
                              endDate = new Date(nextStageRecord.date);
                            } else {
                              // If no next stage found, return empty
                              return '';
                            }
                          }
                          
                          const diffTime = Math.abs(endDate.getTime() - stageDate.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          
                          if (diffDays === 1) {
                            return '1 day';
                          } else if (diffDays < 7) {
                            return `${diffDays} days`;
                          } else if (diffDays < 30) {
                            const weeks = Math.floor(diffDays / 7);
                            return `${weeks} week${weeks > 1 ? 's' : ''}`;
                          } else {
                            const months = Math.floor(diffDays / 30);
                            return `${months} month${months > 1 ? 's' : ''}`;
                          }
                        }
                      }
                      
                      // Don't show any duration for future stages
                      return '';
                    })()}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Hover zone for tooltip to the right of the button */}
            <div
              className="absolute left-full top-0 h-full w-8"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'pointer' }}
            />
            
            {/* Enhanced tooltip that appears when hovering the hover zone */}
            {hoveredIdx === idx && (
              <div className="absolute left-[calc(100%+2rem)] top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-black text-white text-xs rounded shadow-lg z-50 max-w-xs whitespace-pre-line min-w-[280px] max-h-64 overflow-y-auto">
                <div className="mb-2 font-semibold text-sm">{stage.name}</div>
                <div className="text-[10px] text-gray-300 mb-2">
                  {isCompleted ? 'Completed Stage' : isCurrent ? 'Current Stage' : 'Future Stage'}
                </div>
                
                {records.length > 0 ? (
                  <>
                    <div className="text-[10px] text-gray-300 mb-1 font-medium">Stage Updates:</div>
                    <ul className="space-y-2">
                      {records.map((record, i) => (
                        <li key={record.id} className="border-b border-gray-700 pb-1 last:border-b-0 last:pb-0">
                          <div className="mb-1 text-xs">
                            {record.notes || <span className='italic text-gray-300'>No note</span>}
                          </div>
                          <div className="text-[10px] text-gray-300 flex items-center gap-1">
                            <span>👤 {record.actingUserName || 'Unknown'}</span>
                          </div>
                          <div className="text-[10px] text-gray-300 flex items-center gap-1">
                            <span>🕒 {record.date ? new Date(record.date).toLocaleString() : 'Unknown time'}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="text-[10px] text-gray-300">
                    {isCompleted ? 'Stage completed but no notes were added.' : 
                     isCurrent ? 'No updates recorded for current stage.' : 
                     'This stage has not been reached yet.'}
                  </div>
                )}
                
                {/* Duration information */}
                <div className="mt-2 pt-1 border-t border-gray-700">
                  <div className="text-[10px] text-gray-300 mb-1">Duration:</div>
                  <div className="text-xs">
                    {(() => {
                      // Only show duration for passed stages and current stage
                      if (isCompleted || isCurrent) {
                        // If there's a transition record for this stage, calculate actual duration
                        if (latestRecord && latestRecord.date) {
                          const stageDate = new Date(latestRecord.date);
                          let endDate;
                          
                          if (isCurrent) {
                            // For current stage, use current time
                            endDate = new Date();
                          } else {
                            // For passed stages, find the next stage record to calculate duration
                            const nextStageRecord = localTransitionHistory
                              .filter(record => record.stage !== stage.id)
                              .find(record => {
                                const recordDate = new Date(record.date);
                                return recordDate > stageDate;
                              });
                            
                            if (nextStageRecord) {
                              // If there's a next stage, calculate duration between stages
                              endDate = new Date(nextStageRecord.date);
                            } else {
                              // If no next stage found, return empty
                              return '';
                            }
                          }
                          
                          const diffTime = Math.abs(endDate.getTime() - stageDate.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          
                          if (diffDays === 1) {
                            return '1 day';
                          } else if (diffDays < 7) {
                            return `${diffDays} days`;
                          } else if (diffDays < 30) {
                            const weeks = Math.floor(diffDays / 7);
                            return `${weeks} week${weeks > 1 ? 's' : ''}`;
                          } else {
                            const months = Math.floor(diffDays / 30);
                            return `${months} month${months > 1 ? 's' : ''}`;
                          }
                        }
                      }
                      
                      // Don't show any duration for future stages
                      return '';
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 