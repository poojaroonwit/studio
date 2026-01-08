"use client";

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, X, Clock, User, MessageSquare } from 'lucide-react';
import type { RecruitmentStage, TransitionRecord } from '@/lib/types';
import { toast } from 'react-hot-toast';

interface StageDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  stage: RecruitmentStage;
  records: TransitionRecord[];
  editableNotes: boolean;
  onNoteEdit: (transitionId: string, newNote: string) => Promise<void>;
  onTimestampEdit: (transitionId: string, newDate: string) => Promise<void>;
  isUpdating: Set<string>;
}

export function StageDetailModal({
  isOpen,
  onOpenChange,
  stage,
  records,
  editableNotes,
  onNoteEdit,
  onTimestampEdit,
  isUpdating
}: StageDetailModalProps) {
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');

  const handleEditStart = useCallback((record: TransitionRecord) => {
    setEditingRecord(record.id);
    setEditNote(record.notes || '');
    setEditDate(record.date ? new Date(record.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditingRecord(null);
    setEditNote('');
    setEditDate('');
  }, []);

  const handleNoteSave = useCallback(async (recordId: string) => {
    try {
      await onNoteEdit(recordId, editNote);
      setEditingRecord(null);
      setEditNote('');
      toast.success('Note updated successfully');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  }, [editNote, onNoteEdit]);

  const handleTimestampSave = useCallback(async (recordId: string) => {
    try {
      const isoDate = new Date(editDate).toISOString();
      await onTimestampEdit(recordId, isoDate);
      setEditingRecord(null);
      setEditDate('');
      toast.success('Timestamp updated successfully');
    } catch (error) {
      console.error('Error updating timestamp:', error);
      toast.error('Failed to update timestamp');
    }
  }, [editDate, onTimestampEdit]);

  const handleSaveAll = useCallback(async (recordId: string) => {
    try {
      await Promise.all([
        onNoteEdit(recordId, editNote),
        onTimestampEdit(recordId, new Date(editDate).toISOString())
      ]);
      setEditingRecord(null);
      setEditNote('');
      setEditDate('');
      toast.success('Stage details updated successfully');
    } catch (error) {
      console.error('Error updating stage details:', error);
      toast.error('Failed to update stage details');
    }
  }, [editNote, editDate, onNoteEdit, onTimestampEdit]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {stage.name} - Stage Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {records.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {records.length} transition record{records.length > 1 ? 's' : ''} for this stage
              </div>
              
              {records.map((record, index) => (
                <div key={record.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Record #{index + 1}
                    </Badge>
                    {editableNotes && !editingRecord && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditStart(record)}
                        className="h-8 px-2"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>

                  {editingRecord === record.id ? (
                    <div className="space-y-4">
                      {/* Edit Mode */}
                      <div className="space-y-2">
                        <Label htmlFor={`note-${record.id}`} className="text-sm font-medium">
                          Notes
                        </Label>
                        <Textarea
                          id={`note-${record.id}`}
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="Enter stage notes..."
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`date-${record.id}`} className="text-sm font-medium">
                          Timestamp
                        </Label>
                        <Input
                          id={`date-${record.id}`}
                          type="datetime-local"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveAll(record.id)}
                          disabled={isUpdating.has(record.id)}
                        >
                          {isUpdating.has(record.id) ? (
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
                          ) : (
                            <Save className="h-3 w-3 mr-1" />
                          )}
                          Save All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEditCancel}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* View Mode */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Notes:</span>
                        </div>
                        <div className="text-sm bg-muted/50 p-3 rounded-md">
                          {record.notes || (
                            <span className="italic text-muted-foreground">No notes provided</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Updated by:</span>
                          </div>
                          <div className="text-sm">
                            {record.actingUserName || 'Unknown'}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Timestamp:</span>
                          </div>
                          <div className="text-sm">
                            {record.date ? new Date(record.date).toLocaleString() : 'Unknown time'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transition records found for this stage.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
