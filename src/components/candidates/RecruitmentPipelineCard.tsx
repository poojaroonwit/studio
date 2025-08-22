"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle, Edit3, Info, Edit, Users, Clock } from 'lucide-react';
import type { RecruitmentStage, TransitionRecord } from '@/lib/types';
import { toast } from 'react-hot-toast';

interface RecruitmentPipelineCardProps {
  stages: RecruitmentStage[];
  transitionHistory: TransitionRecord[];
  currentStatus: string;
  onStageClick: (stageName: string) => void;
  editableNotes: boolean;
  onNoteEdit: (transitionId: string, newNote: string) => Promise<void>;
  candidateId: string;
}

export function RecruitmentPipelineCard({
  stages,
  transitionHistory,
  currentStatus,
  onStageClick,
  editableNotes,
  onNoteEdit,
  candidateId
}: RecruitmentPipelineCardProps) {
  // Map stage name to all transition records for that stage
  const stageToRecords: Record<string, TransitionRecord[]> = {};
  const safeTransitionHistory = Array.isArray(transitionHistory) ? transitionHistory : [];
  safeTransitionHistory.forEach(record => {
    if (!stageToRecords[record.stage]) stageToRecords[record.stage] = [];
    stageToRecords[record.stage].push(record);
  });

  // Track which popover is open by index
  const [openPopoverIdx, setOpenPopoverIdx] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState<Set<string>>(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Removed: const [isConnected, setIsConnected] = useState(false);
  
  // Real-time state management
  const [localStages, setLocalStages] = useState<RecruitmentStage[]>(stages);
  const [localTransitionHistory, setLocalTransitionHistory] = useState<TransitionRecord[]>(transitionHistory);
  const [localCurrentStatus, setLocalCurrentStatus] = useState<string>(currentStatus);
  
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

  // Clear loading state when status changes (indicating successful transition)
  useEffect(() => {
    if (isTransitioning && localCurrentStatus !== currentStatus) {
      setIsTransitioning(false);
    }
  }, [currentStatus, localCurrentStatus, isTransitioning]);

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
    // Show loading state if clicking on a different stage
    if (stageName !== localCurrentStatus) {
      setIsTransitioning(true);
      // Hide loading state after a reasonable timeout (in case the transition fails)
      setTimeout(() => setIsTransitioning(false), 10000);
    }
    onStageClick(stageName);
  }, [onStageClick, localCurrentStatus]);

  // Rebuild stage to records mapping when transition history changes
  const currentStageToRecords: Record<string, TransitionRecord[]> = {};
  const safeLocalTransitionHistory = Array.isArray(localTransitionHistory) ? localTransitionHistory : [];
  safeLocalTransitionHistory.forEach(record => {
    if (!currentStageToRecords[record.stage]) currentStageToRecords[record.stage] = [];
    currentStageToRecords[record.stage].push(record);
  });

  const currentStageIndex = localStages?.findIndex(s => s.name === localCurrentStatus) ?? -1;

  return (
    <>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 8px;
          margin: 4px 0;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #2563eb 0%, #1e40af 100%);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: linear-gradient(180deg, #1d4ed8 0%, #1e3a8a 100%);
        }
        
        /* Firefox scrollbar */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #3b82f6 rgba(0, 0, 0, 0.05);
        }
        
        /* Dark mode adjustments */
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%);
          border: 1px solid rgba(0, 0, 0, 0.2);
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
        }
        
        .dark .custom-scrollbar {
          scrollbar-color: #60a5fa rgba(255, 255, 255, 0.05);
        }
      `}</style>
      <div className="w-full">
        <div className="relative">
          {!localStages || localStages.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Activity className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Loading recruitment stages...</p>
            </div>
          ) : (
            <div className="flex items-center relative" style={{
              width: localStages.length <= 5 ? `${localStages.length * 120}px` : '100%',
              maxWidth: '100%',
              justifyContent: localStages.length <= 5 ? 'space-between' : 'space-between'
            }}>
              {localStages.map((stage, index) => {
                const records = currentStageToRecords[stage.name] || [];
                const isCompleted = index <= currentStageIndex;
                const isCurrent = localCurrentStatus === stage.name;
                const isFuture = index > currentStageIndex;
                const latestRecord = records.length > 0 ? records[records.length - 1] : null;

                return (
                  <div key={stage.id} className="flex items-center">
                    {/* Stage Circle */}
                    <div 
                      className="relative flex flex-col items-center cursor-pointer hover:bg-muted/30 rounded-lg p-1 transition-colors"
                      onClick={() => handleStageClick(stage.name)}
                    >
                       <div className={`
                         w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold z-10 transition-all duration-300
                         ${isCompleted && !isCurrent ? 'bg-green-500 text-white' : ''}
                         ${isFuture ? 'bg-muted text-muted-foreground' : ''}
                         ${isCurrent && isTransitioning ? 'animate-pulse' : ''}
                       `}
                       style={
                         isCurrent
                           ? { 
                               backgroundColor: `${stage.color_complete || '#22c55e'}80`, 
                               color: '#fff' 
                             }
                           : isCompleted && !isCurrent && !stage.name.toLowerCase().includes('reject')
                           ? { backgroundColor: stage.color_complete || '#22c55e', color: '#fff' }
                           : undefined
                       }>
                         {isCurrent ? (
                           <div className="w-4 h-4 flex items-center justify-center">
                             {isTransitioning ? (
                               <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                             ) : (
                               <div className="w-2 h-2 bg-current rounded-full" />
                             )}
                           </div>
                         ) : isCompleted ? (
                           <CheckCircle className="w-4 h-4" />
                         ) : (
                           index + 1
                         )}
                       </div>
                      
                      {/* Stage Name */}
                      <div className="mt-2 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <h4 className={`text-xs font-medium ${isCurrent ? 'text-primary' : ''} truncate`}>
                            {stage.name}
                          </h4>
                          {/* Show loading indicator for current stage during transition */}
                          {isCurrent && isTransitioning && (
                            <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                          )}
                          {/* Show info popover for passed nodes on hover */}
                          {(isCompleted || isCurrent) && (
                            <Popover open={openPopoverIdx === index}>
                              <PopoverTrigger asChild>
                                <div
                                  className="absolute inset-0 cursor-pointer"
                                  onMouseEnter={() => setOpenPopoverIdx(index)}
                                  onMouseLeave={() => setOpenPopoverIdx(null)}
                                />
                              </PopoverTrigger>
                              <PopoverContent 
                                className="w-80" 
                                align="center" 
                                sideOffset={4}
                                onMouseEnter={() => setOpenPopoverIdx(index)} 
                                onMouseLeave={() => setOpenPopoverIdx(null)}
                              >
                                <div className="mb-3">
                                  <div className="font-semibold text-sm mb-1">{stage.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {isCompleted ? 'Completed Stage' : 'Current Stage'}
                                  </div>
                                </div>
                                
                                {records.length > 0 ? (
                                  <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                                    <div className="text-xs font-medium text-muted-foreground mb-2">Stage Updates:</div>
                                    {records.map((record, i) => (
                                      <div key={record.id} className="border-l-2 border-muted pl-3 pb-2 last:pb-0">
                                        {/* Notes */}
                                        <div className="text-sm mb-2">
                                          {record.notes ? (
                                            <div className="text-foreground">{record.notes}</div>
                                          ) : (
                                            <div className="text-muted-foreground italic">No notes added</div>
                                          )}
                                        </div>
                                        
                                        {/* Update Info */}
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Users className="h-3 w-3" />
                                          <span>Updated by: <span className="font-medium text-foreground">{record.actingUserName || 'Unknown'}</span></span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                          <Clock className="h-3 w-3" />
                                          <span>{record.date ? new Date(record.date).toLocaleString() : 'Unknown time'}</span>
                                        </div>
                                        
                                        {/* Edit button for notes */}
                                        {editableNotes && record.notes && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs mt-2"
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
                                              <>
                                                <Edit className="h-3 w-3 mr-1" />
                                                Edit
                                              </>
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground py-2">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Info className="h-4 w-4" />
                                      <span>No updates recorded for this stage</span>
                                    </div>
                                    {isCompleted && (
                                      <div className="text-xs text-muted-foreground">
                                        This stage was completed but no notes were added.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        {/* Duration information under stage name */}
                        <div className="text-xs text-muted-foreground mt-1 min-h-[1rem]">
                          {latestRecord && latestRecord.date ? (() => {
                            const stageDate = new Date(latestRecord.date);
                            let endDate;
                            
                            // Find the next stage record to calculate duration
                            const nextStageRecord = localTransitionHistory
                              .filter(record => record.stage !== stage.name)
                              .find(record => {
                                const recordDate = new Date(record.date);
                                return recordDate > stageDate;
                              });
                            
                            if (nextStageRecord) {
                              // If there's a next stage, calculate duration between stages
                              endDate = new Date(nextStageRecord.date);
                            } else if (isCurrent) {
                              // If this is the current stage, use current time
                              endDate = new Date();
                            } else {
                              // If no next stage and not current, return empty
                              return '';
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
                          })() : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Single Continuous Line - From center of first node to center of last node */}
              <div
                className="absolute top-4"
                style={{
                  left: '16px',
                  right: '16px',
                  height: '3px',
                  background: `linear-gradient(to right, 
                    ${localStages.map((stage, index) => {
                      const isCompleted = index < currentStageIndex;
                      const isCurrent = index === currentStageIndex;
                      
                      // Use stage color for completed stages, gray for current and future
                      let color;
                      if (isCompleted) {
                        // Use the stage's color_complete setting, fallback to green
                        color = stage.color_complete || '#22c55e';
                      } else {
                        color = '#d1d5db'; // Gray for current and future stages
                      }
                      
                      const startPercent = (index / (localStages.length - 1)) * 100;
                      const endPercent = ((index + 1) / (localStages.length - 1)) * 100;
                      return `${color} ${startPercent}%, ${color} ${endPercent}%`;
                    }).join(', ')}
                  )`,
                  borderTop: 'none',
                  borderBottom: 'none'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
} 