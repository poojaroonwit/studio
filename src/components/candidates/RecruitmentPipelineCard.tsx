"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle, Edit3, Info, Edit, Users } from 'lucide-react';
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
  transitionHistory.forEach(record => {
    if (!stageToRecords[record.stage]) stageToRecords[record.stage] = [];
    stageToRecords[record.stage].push(record);
  });

  // Track which popover is open by index
  const [openPopoverIdx, setOpenPopoverIdx] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  
  // Real-time state management
  const [localStages, setLocalStages] = useState<RecruitmentStage[]>(stages);
  const [localTransitionHistory, setLocalTransitionHistory] = useState<TransitionRecord[]>(transitionHistory);
  const [localCurrentStatus, setLocalCurrentStatus] = useState<string>(currentStatus);
  
  // SSE connection ref
  const eventSourceRef = useRef<EventSource | null>(null);

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
    onStageClick(stageName);
  }, [onStageClick]);

  // Rebuild stage to records mapping when transition history changes
  const currentStageToRecords: Record<string, TransitionRecord[]> = {};
  localTransitionHistory.forEach(record => {
    if (!currentStageToRecords[record.stage]) currentStageToRecords[record.stage] = [];
    currentStageToRecords[record.stage].push(record);
  });

  const currentStageIndex = localStages.findIndex(s => s.name === localCurrentStatus);

  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="w-5 h-5 text-primary" />
          Recruitment Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {localStages.map((stage, index) => {
            const records = currentStageToRecords[stage.name] || [];
            const isCompleted = index <= currentStageIndex;
            const isCurrent = localCurrentStatus === stage.name;
            const isFuture = index > currentStageIndex;
            const latestRecord = records.length > 0 ? records[records.length - 1] : null;

            return (
              <div 
                key={stage.id} 
                className="relative flex items-center gap-4 mb-2 last:mb-0 cursor-pointer hover:bg-muted/30 rounded-lg p-1 transition-colors"
                onClick={() => handleStageClick(stage.name)}
              >
                <div className="relative">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold z-10 transition-all duration-300
                    ${isCurrent ? 'bg-muted text-muted-foreground' : ''}
                    ${isCompleted && !isCurrent ? 'bg-green-500 text-white' : ''}
                    ${isFuture ? 'bg-muted text-muted-foreground' : ''}
                  `}
                  style={
                    isCompleted && !isCurrent && !stage.name.toLowerCase().includes('reject')
                      ? { backgroundColor: stage.color_complete || '#22c55e', color: '#fff' }
                      : undefined
                  }>
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1}
                  </div>
                  {index < localStages.length - 1 && (
                    <div className="absolute left-1/2 top-8 w-0.5 h-6 bg-muted transform -translate-x-1/2"></div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>
                          {stage.name}
                        </h4>
                        {records.length > 1 && (
                          <Badge variant="outline" className="text-xs">
                            {records.length} notes
                          </Badge>
                        )}
                        {records.length > 0 && (
                          <Popover open={openPopoverIdx === index}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 border-0"
                                onMouseEnter={() => setOpenPopoverIdx(index)}
                                onMouseLeave={() => setOpenPopoverIdx(null)}
                              >
                                <Info className="w-3 h-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="w-80" 
                              align="end" 
                              sideOffset={4}
                              onMouseEnter={() => setOpenPopoverIdx(index)} 
                              onMouseLeave={() => setOpenPopoverIdx(null)}
                            >
                              <div className="mb-2 font-semibold">{stage.name} Notes</div>
                              <ul className="space-y-2 max-h-48 overflow-y-auto">
                                {records.map((record, i) => (
                                  <li key={record.id} className="border-b pb-2 last:border-b-0 last:pb-0">
                                    <div className="flex items-start gap-2 text-xs text-muted-foreground mb-1">
                                      <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                      <span className="flex-1">{record.notes || <span className='italic text-muted-foreground'>No note</span>}</span>
                                      {editableNotes && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
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
                                    <div className="flex items-center gap-2 text-xs ml-5">
                                      <span>By: <span className="font-medium">{record.actingUserName || 'Unknown'}</span></span>
                                      <span className="text-muted-foreground">|</span>
                                      <span>{record.date ? new Date(record.date).toLocaleString() : ''}</span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </PopoverContent>
                          </Popover>
                        )}
                                              </div>
                        {isCurrent && (
                          <p className="text-xs text-muted-foreground mt-1">Current Stage</p>
                        )}
                      </div>
                    

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
} 