"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, Clock, MapPin, FileText, Users, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import type { Candidate } from '@/lib/types';

interface Interviewer {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
}

interface SendInterviewInvitationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate;
}

export function SendInterviewInvitationModal({
  isOpen,
  onOpenChange,
  candidate,
}: SendInterviewInvitationModalProps) {
  const [interviewDate, setInterviewDate] = useState<Date | undefined>(undefined);
  const [interviewTime, setInterviewTime] = useState<string>('09:00');
  const [duration, setDuration] = useState<number>(60);
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingInterviewers, setLoadingInterviewers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load interviewers when modal opens
  useEffect(() => {
    if (isOpen && candidate?.positionId) {
      loadInterviewers();
    } else if (isOpen && !candidate?.positionId) {
      setError('Candidate is not associated with a position');
    }
  }, [isOpen, candidate?.positionId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInterviewDate(undefined);
      setInterviewTime('09:00');
      setDuration(60);
      setLocation('');
      setNotes('');
      setSelectedInterviewerIds(new Set());
      setError(null);
    }
  }, [isOpen]);

  const loadInterviewers = async () => {
    if (!candidate.positionId) return;

    setLoadingInterviewers(true);
    setError(null);

    try {
      const response = await fetch(`/api/positions/${candidate.positionId}/interviewers`);
      if (!response.ok) {
        throw new Error('Failed to load interviewers');
      }
      const data = await response.json();
      setInterviewers(data);
      
      // Pre-select all interviewers by default
      const allIds = new Set(data.map((inv: Interviewer) => inv.userId));
      setSelectedInterviewerIds(allIds);
    } catch (err: any) {
      console.error('Error loading interviewers:', err);
      setError(err.message || 'Failed to load interviewers');
      toast.error('Failed to load interviewers');
    } finally {
      setLoadingInterviewers(false);
    }
  };

  const toggleInterviewer = (userId: string) => {
    const newSet = new Set(selectedInterviewerIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedInterviewerIds(newSet);
  };

  const handleSubmit = async () => {
    // Validation
    if (!interviewDate) {
      toast.error('Please select an interview date');
      return;
    }

    if (!interviewTime) {
      toast.error('Please enter an interview time');
      return;
    }

    if (selectedInterviewerIds.size === 0) {
      toast.error('Please select at least one interviewer');
      return;
    }

    if (!candidate.positionId) {
      toast.error('Candidate is not associated with a position');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Combine date and time
      const dateTime = new Date(interviewDate);
      const [hours, minutes] = interviewTime.split(':').map(Number);
      dateTime.setHours(hours, minutes, 0, 0);

      const response = await fetch(
        `/api/candidates/${candidate.id}/send-interview-invitation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interviewerIds: Array.from(selectedInterviewerIds),
            interviewDate: dateTime.toISOString(),
            interviewTime,
            duration,
            location: location || undefined,
            notes: notes || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send invitations');
      }

      if (data.errors && data.errors.length > 0) {
        const errorCount = data.errors.length;
        const successCount = data.results?.length || 0;
        toast.success(
          `Sent ${successCount} invitation(s), ${errorCount} failed`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `Successfully sent ${data.results?.length || 0} invitation(s)`
        );
      }

      onOpenChange(false);
    } catch (err: any) {
      console.error('Error sending invitations:', err);
      setError(err.message || 'Failed to send invitations');
      toast.error(err.message || 'Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Interview Invitation</DialogTitle>
          <DialogDescription>
            Send calendar invitations to interviewers for {candidate.name}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          {/* Interview Date */}
          <div className="space-y-2">
            <Label htmlFor="interview-date">Interview Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !interviewDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {interviewDate ? (
                    format(interviewDate, 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={interviewDate}
                  onSelect={setInterviewDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Interview Time */}
          <div className="space-y-2">
            <Label htmlFor="interview-time">Interview Time *</Label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                id="interview-time"
                type="time"
                value={interviewTime}
                onChange={(e) => setInterviewTime(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes) *</Label>
            <Input
              id="duration"
              type="number"
              min="15"
              max="480"
              step="15"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
            />
            <p className="text-xs text-muted-foreground">
              Duration: {Math.floor(duration / 60)}h {duration % 60}m
            </p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder="e.g., Conference Room A, Zoom, etc."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-2" />
              <Textarea
                id="notes"
                placeholder="Additional information about the interview..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="flex-1"
              />
            </div>
          </div>

          {/* Interviewers Selection */}
          <div className="space-y-2">
            <Label>Interviewers *</Label>
            {loadingInterviewers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading interviewers...
                </span>
              </div>
            ) : interviewers.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No interviewers assigned to this position
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-48 rounded-md border p-4">
                <div className="space-y-3">
                  {interviewers.map((interviewer) => (
                    <div
                      key={interviewer.userId}
                      className="flex items-center space-x-3"
                    >
                      <Checkbox
                        id={`interviewer-${interviewer.userId}`}
                        checked={selectedInterviewerIds.has(interviewer.userId)}
                        onCheckedChange={() => toggleInterviewer(interviewer.userId)}
                      />
                      <Label
                        htmlFor={`interviewer-${interviewer.userId}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{interviewer.userName}</span>
                          <span className="text-sm text-muted-foreground">
                            ({interviewer.userEmail})
                          </span>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            <p className="text-xs text-muted-foreground">
              {selectedInterviewerIds.size} of {interviewers.length} interviewer(s) selected
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              loadingInterviewers ||
              !interviewDate ||
              selectedInterviewerIds.size === 0 ||
              !candidate.positionId
            }
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Invitations'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

