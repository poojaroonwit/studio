"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle, Edit3, Info, Edit, Users, Clock } from 'lucide-react';
import type { RecruitmentStage, TransitionRecord } from '@/lib/types';
import { toast } from 'react-hot-toast';
import { StageDetailModal } from './StageDetailModal';

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
  // Track modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<RecruitmentStage | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<TransitionRecord[]>([]);
  // Removed: const [isConnected, setIsConnected] = useState(false);
  
  // Real-time state management
  const [localStages, setLocalStages] = useState<RecruitmentStage[]>(stages);
  const [localTransitionHistory, setLocalTransitionHistory] = useState<TransitionRecord[]>(transitionHistory);
  const [localCurrentStatus, setLocalCurrentStatus] = useState<string>(currentStatus);
  
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

  // Enhanced timestamp edit handler with real-time feedback
  const handleTimestampEdit = useCallback(async (transitionId: string, newDate: string) => {
    setIsUpdating(prev => new Set(prev).add(transitionId));
    
    try {
      const response = await fetch(`/api/transitions/${transitionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: newDate }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update timestamp');
      }
      
      // Optimistically update local state
      setLocalTransitionHistory(prev => 
        prev.map(t => 
          t.id === transitionId 
            ? { ...t, date: newDate }
            : t
        )
      );
      
      toast.success('Timestamp updated successfully');
    } catch (error) {
      console.error('Error updating timestamp:', error);
      toast.error('Failed to update timestamp');
    } finally {
      setIsUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(transitionId);
        return newSet;
      });
    }
  }, []);

  // Enhanced stage click handler with visual feedback
  const handleStageClick = useCallback((stageId: string) => {
    // Show loading state if clicking on a different stage
    if (stageId !== localCurrentStatus) {
      setIsTransitioning(true);
      // Hide loading state after a reasonable timeout (in case the transition fails)
      const timeoutId = setTimeout(() => setIsTransitioning(false), 5000);
      
      // Store timeout ID for cleanup
      if (transitioningTimeoutRef.current) {
        clearTimeout(transitioningTimeoutRef.current);
      }
      transitioningTimeoutRef.current = timeoutId;
    }
    onStageClick(stageId);
  }, [onStageClick, localCurrentStatus]);

  // Handle opening modal for passed stages
  const handleStageDetailClick = useCallback((stage: RecruitmentStage, records: TransitionRecord[]) => {
    setSelectedStage(stage);
    setSelectedRecords(records);
    setModalOpen(true);
  }, []);

  // Rebuild stage to records mapping when transition history changes
  const currentStageToRecords: Record<string, TransitionRecord[]> = {};
  const safeLocalTransitionHistory = Array.isArray(localTransitionHistory) ? localTransitionHistory : [];
  safeLocalTransitionHistory.forEach(record => {
    if (!currentStageToRecords[record.stage]) currentStageToRecords[record.stage] = [];
    currentStageToRecords[record.stage].push(record);
  });

  // Fix: Use stage ID for comparison since currentStatus is now a UUID
  const currentStageIndex = localStages && localStages.length > 0 ? localStages.findIndex(s => s.id === localCurrentStatus) : -1;
  const isCompleted = currentStageIndex > -1 && localStages && currentStageIndex < localStages.length - 1;
  const isCurrent = localCurrentStatus === localStages[currentStageIndex]?.id;
  const latestRecord = currentStageToRecords[localCurrentStatus]?.length > 0 ? currentStageToRecords[localCurrentStatus][currentStageToRecords[localCurrentStatus].length - 1] : null;

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
                 const records = currentStageToRecords[stage.id] || [];
                 const isCompleted = index <= currentStageIndex;
                 const isCurrent = localCurrentStatus === stage.id;
                 const isFuture = index > currentStageIndex;
                 const latestRecord = records.length > 0 ? records[records.length - 1] : null;
                 
                 // Determine if stage was skipped (appears before current stage but has no transition records)
                 // A stage is skipped if it's before the current stage but has no transition records
                 const isSkipped = index < currentStageIndex && records.length === 0;
                 
                 // A stage is actually completed if it's before the current stage and has transition records
                 const isActuallyCompleted = index < currentStageIndex && records.length > 0;

                return (
                  <div key={stage.id} className="flex items-center">
                    {/* Stage Circle */}
                                         <div 
                       className={`relative flex flex-col items-center cursor-pointer hover:bg-muted/30 rounded-lg p-1 transition-colors ${isSkipped ? 'opacity-60' : ''}`}
                       onMouseEnter={() => {
                         if (isActuallyCompleted) {
                           handleStageDetailClick(stage, records);
                         }
                       }}
                       onClick={() => {
                         if (!isActuallyCompleted) {
                           handleStageClick(stage.id);
                         }
                       }}
                                               title={`${stage.name} - ${isSkipped ? 'Skipped' : isActuallyCompleted ? 'Completed' : isCurrent ? 'Current' : 'Future'} stage${records.length > 0 ? ` (${records.length} update${records.length > 1 ? 's' : ''})` : ''}${isActuallyCompleted ? ' - Hover to view details' : ''}`}
                     >
                                               <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold z-10 transition-all duration-300
                          ${isSkipped ? 'bg-gray-400 text-gray-600' : ''}
                          ${isActuallyCompleted ? 'bg-green-500 text-white' : ''}
                          ${isFuture ? 'bg-muted text-muted-foreground' : ''}
                          ${isCurrent && isTransitioning ? 'animate-pulse' : ''}
                        `}
                        style={
                          isSkipped
                            ? { backgroundColor: '#9ca3af', color: '#6b7280' }
                            : isCurrent
                            ? { 
                                backgroundColor: `${stage.color_complete || '#22c55e'}80`, 
                                color: '#fff' 
                              }
                            : isActuallyCompleted && !stage.name.toLowerCase().includes('reject')
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
                          ) : isActuallyCompleted ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : isSkipped ? (
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ) : (
                            index + 1
                          )}
                       </div>
                      
                      {/* Stage Name */}
                      <div className="mt-2 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <h4 className={`text-xs font-medium ${isCurrent ? 'text-primary' : isSkipped ? 'text-gray-400' : ''} truncate`}>
                            {stage.name}
                          </h4>
                          {/* Show loading indicator for current stage during transition */}
                          {isCurrent && isTransitioning && (
                            <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                          )}
                                                     {/* Show info popover for all stages on hover */}
                           <Popover open={openPopoverIdx === index}>
                             <PopoverTrigger asChild>
                               <div
                                 className="absolute top-0 left-0 right-0 bottom-0 cursor-pointer"
                                 style={{ 
                                   top: '0px', 
                                   left: '4px', 
                                   right: '4px', 
                                   bottom: '20px' 
                                 }}
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
                                   {isSkipped ? 'Skipped Stage' : isActuallyCompleted ? 'Completed Stage' : isCurrent ? 'Current Stage' : 'Future Stage'}
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
                                       
                                     </div>
                                   ))}
                                 </div>
                               ) : (
                                 <div className="text-sm text-muted-foreground py-2">
                                   {isSkipped ? (
                                     <div className="flex items-center gap-2 mb-1">
                                       <Info className="h-4 w-4" />
                                       <span>This stage was skipped</span>
                                     </div>
                                   ) : (
                                     <div className="flex items-center gap-2 mb-1">
                                       <Info className="h-4 w-4" />
                                       <span>No updates recorded for this stage</span>
                                     </div>
                                   )}
                                   {isActuallyCompleted && (
                                     <div className="text-xs text-muted-foreground">
                                       This stage was completed but no notes were added.
                                     </div>
                                   )}
                                   {!isCompleted && !isCurrent && (
                                     <div className="text-xs text-muted-foreground">
                                       This stage has not been reached yet.
                                     </div>
                                   )}
                                 </div>
                               )}
                               
                               {/* View Details button for completed stages */}
                               {isActuallyCompleted && records.length > 0 && (
                                 <div className="mt-3 pt-2 border-t border-muted">
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     className="w-full"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       handleStageDetailClick(stage, records);
                                     }}
                                   >
                                     <Info className="h-3 w-3 mr-1" />
                                     Open Details Modal
                                   </Button>
                                 </div>
                               )}
                               
                               {/* Duration information */}
                               <div className="mt-3 pt-2 border-t border-muted">
                                 <div className="text-xs text-muted-foreground mb-1">Duration:</div>
                                 <div className="text-sm">
                                   {(() => {
                                     // Only show duration for passed stages and current stage (not skipped stages)
                                     if ((isActuallyCompleted || isCurrent) && !isSkipped) {
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
                                     
                                     // Don't show any duration for future stages or skipped stages
                                     return '';
                                   })()}
                                 </div>
                               </div>
                             </PopoverContent>
                           </Popover>
                        </div>
                        {/* Duration information under stage name */}
                        <div className="text-xs text-muted-foreground mt-1 min-h-[1rem]">
                                                     {(() => {
                             // Only show duration for passed stages and current stage (not skipped stages)
                             if ((isActuallyCompleted || isCurrent) && !isSkipped) {
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
                            
                            // Don't show any duration for future stages or skipped stages
                            return '';
                          })()}
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
                       const records = currentStageToRecords[stage.id] || [];
                       const isSkipped = isCompleted && records.length === 0;
                       const isActuallyCompleted = index < currentStageIndex && records.length > 0;
                       
                       // Use stage color for completed stages, gray for current, future, and skipped stages
                       let color;
                       if (isActuallyCompleted) {
                         // Use the stage's color_complete setting, fallback to green
                         color = stage.color_complete || '#22c55e';
                       } else if (isSkipped) {
                         color = '#9ca3af'; // Lighter gray for skipped stages
                       } else {
                         color = '#d1d5db'; // Gray for current and future stages
                       }
                      
                      const startPercent = localStages.length > 1 ? (index / (localStages.length - 1)) * 100 : 0;
                      const endPercent = localStages.length > 1 ? ((index + 1) / (localStages.length - 1)) * 100 : 100;
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
      
      {/* Stage Detail Modal */}
      {selectedStage && (
        <StageDetailModal
          isOpen={modalOpen}
          onOpenChange={setModalOpen}
          stage={selectedStage}
          records={selectedRecords}
          editableNotes={editableNotes}
          onNoteEdit={handleNoteEdit}
          onTimestampEdit={handleTimestampEdit}
          isUpdating={isUpdating}
        />
      )}
    </>
  );
} 