"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, ClockIcon as Clock, MapPinIcon as MapPin, UsersIcon as Users, ArrowPathIcon as Loader2, ExclamationCircleIcon as AlertCircle, ChevronRightIcon as ChevronRight, ChevronLeftIcon as ChevronLeft, PlusIcon as Plus, XMarkIcon as X, CodeBracketIcon as Code, LanguageIcon as Type } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import type { Applicant } from '@/lib/types';
import { TiptapEditor } from '@/components/ui/wysiwyg-editors';
import { sanitizeRichHtml } from '@/lib/security';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';


interface Interviewer {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  positionTitle?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  positionTitle?: string;
}

interface SendInterviewInvitationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  applicant: Applicant;
}

interface MeetingRoom {
  id: string;
  displayName: string;
  emailAddress: string;
}

type Step = 'select-interviewers' | 'edit-email' | 'preview-email';

export function SendInterviewInvitationModal({
  isOpen,
  onOpenChange,
  applicant,
}: SendInterviewInvitationModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('select-interviewers');
  const [interviewDate, setInterviewDate] = useState<Date | undefined>(undefined);
  const [interviewTime, setInterviewTime] = useState<string>('09:00');
  const [duration, setDuration] = useState<number>(60);
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingInterviewers, setLoadingInterviewers] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [addInterviewerOpen, setAddInterviewerOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [addingInterviewers, setAddingInterviewers] = useState(false);
  const [emailEditorMode, setEmailEditorMode] = useState<'wysiwyg' | 'html'>('wysiwyg');
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [locationEmail, setLocationEmail] = useState<string>('');
  const [locationType, setLocationType] = useState<'room' | 'custom'>('custom');

  // Load interviewers when modal opens
  useEffect(() => {
    if (isOpen && applicant?.positionId) {
      loadInterviewers();
      loadAvailableUsers();
    } else if (isOpen && !applicant?.positionId) {
      setError('Applicant is not associated with a position');
    }
  }, [isOpen, applicant?.positionId]);

  // Load rooms when modal opens
  useEffect(() => {
    if (isOpen) {
      loadRooms();
    }
  }, [isOpen]);

  const loadRooms = async () => {
    setLoadingRooms(true);
    try {
      const response = await fetch('/api/rooms');
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
        if (data.length > 0) {
          setLocationType('room');
          // Don't auto-select a room to avoid accidental booking, let user choose
        }
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoadingRooms(false);
    }
  };

  // Load email template when moving to email step
  useEffect(() => {
    if (isOpen && currentStep === 'edit-email' && !emailBody) {
      loadEmailTemplate();
    }
  }, [isOpen, currentStep]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('select-interviewers');
      setInterviewDate(undefined);
      setInterviewTime('09:00');
      setDuration(60);
      setLocation('');
      setNotes('');
      setSelectedInterviewerIds(new Set());
      setEmailSubject('');
      setEmailBody('');
      setError(null);
      setAddInterviewerOpen(false);
      setSelectedUserIds(new Set());
    }
  }, [isOpen]);

  const loadInterviewers = async () => {
    if (!applicant.positionId) return;

    setLoadingInterviewers(true);
    setError(null);

    try {
      const response = await fetch(`/api/positions/${applicant.positionId}/interviewers`);
      if (!response.ok) {
        throw new Error('Failed to load interviewers');
      }
      const data: Interviewer[] = await response.json();
      setInterviewers(data);

      // Pre-select all interviewers by default
      const allIds = new Set<string>(data.map((inv: Interviewer) => inv.userId));
      setSelectedInterviewerIds(allIds);
    } catch (err: any) {
      console.error('Error loading interviewers:', err);
      setError(err.message || 'Failed to load interviewers');
      toast.error('Failed to load interviewers');
    } finally {
      setLoadingInterviewers(false);
    }
  };

  const loadAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      const data = await response.json();
      setAvailableUsers(data.users || []);
    } catch (err: any) {
      console.error('Error loading users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadEmailTemplate = async () => {
    setLoadingTemplate(true);
    try {
      const response = await fetch('/api/settings/system-settings');
      if (!response.ok) {
        throw new Error('Failed to load email template');
      }
      const data = await response.json();
      let settings: any = {};

      if (data.settings && Array.isArray(data.settings)) {
        settings = Object.fromEntries(data.settings.map((setting: any) => [setting.key, setting.value]));
      } else {
        settings = data;
      }

      const template = settings.emailTemplateInterviewInvitation || '';
      const subject = settings.emailTemplateInterviewInvitationSubject || 'Interview Invitation: {{ApplicantName}} - {{positionTitle}}';

      // Load template as-is - backend will replace variables when sending
      setEmailSubject(subject);
      setEmailBody(template || '<p>Dear {{interviewerName}},</p><p>You have been invited to interview {{ApplicantName}} for the position of {{positionTitle}}.</p><p><strong>Date:</strong> {{interviewDate}}</p><p><strong>Time:</strong> {{interviewTime}}</p><p><strong>Location:</strong> {{interviewLocation}}</p><p style="text-align: center;"><a href="{{evaluationLink}}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0;">Evaluate Applicant</a></p>');
    } catch (err: any) {
      console.error('Error loading email template:', err);
      toast.error('Failed to load email template');
      // Set default template with placeholders
      setEmailSubject('Interview Invitation: {{ApplicantName}} - {{positionTitle}}');
      setEmailBody('<p>Dear {{interviewerName}},</p><p>You have been invited to interview {{ApplicantName}} for the position of {{positionTitle}}.</p><p><strong>Date:</strong> {{interviewDate}}</p><p><strong>Time:</strong> {{interviewTime}}</p><p><strong>Location:</strong> {{interviewLocation}}</p><p style="text-align: center;"><a href="{{evaluationLink}}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0;">Evaluate Applicant</a></p>');
    } finally {
      setLoadingTemplate(false);
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

  const handleAddInterviewers = async () => {
    if (selectedUserIds.size === 0 || !applicant.positionId) return;

    setAddingInterviewers(true);
    const userIdsArray = Array.from(selectedUserIds);
    let successCount = 0;
    let errorCount = 0;

    try {
      const promises = userIdsArray.map(async (userId) => {
        try {
          const response = await fetch(`/api/positions/${applicant.positionId}/interviewers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to add interviewer');
          }

          successCount++;
          return { success: true, userId };
        } catch (error: any) {
          errorCount++;
          return { success: false, userId, error: error.message };
        }
      });

      await Promise.all(promises);

      if (successCount > 0) {
        toast.success(`${successCount} interviewer${successCount > 1 ? 's' : ''} added successfully`);
        await loadInterviewers();
        // Auto-select newly added interviewers
        const newSet = new Set(selectedInterviewerIds);
        userIdsArray.forEach(userId => newSet.add(userId));
        setSelectedInterviewerIds(newSet);
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} failed to add`);
      }

      setSelectedUserIds(new Set());
      setAddInterviewerOpen(false);
    } catch (error) {
      console.error('Error adding interviewers:', error);
      toast.error('Failed to add interviewers');
    } finally {
      setAddingInterviewers(false);
    }
  };

  const handleNext = () => {
    // Validation
    if (currentStep === 'select-interviewers') {
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

      setCurrentStep('edit-email');
    } else if (currentStep === 'edit-email') {
      if (!emailSubject.trim()) {
        toast.error('Please enter an email subject');
        return;
      }

      if (!emailBody.trim()) {
        toast.error('Please enter email content');
        return;
      }

      setCurrentStep('preview-email');
    }
  };

  const handleBack = () => {
    if (currentStep === 'preview-email') {
      setCurrentStep('edit-email');
    } else if (currentStep === 'edit-email') {
      setCurrentStep('select-interviewers');
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!emailSubject.trim()) {
      toast.error('Please enter an email subject');
      return;
    }

    if (!emailBody.trim()) {
      toast.error('Please enter email content');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Combine date and time
      const dateTime = new Date(interviewDate!);
      const [hours, minutes] = interviewTime.split(':').map(Number);
      dateTime.setHours(hours, minutes, 0, 0);

      const response = await fetch(
        `/api/applicants/${applicant.id}/send-interview-invitation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interviewerIds: Array.from(selectedInterviewerIds),
            interviewDate: dateTime.toISOString(),
            interviewTime,
            duration,
            location: location || undefined,
            locationEmail: locationEmail || undefined,
            notes: notes || undefined,
            emailSubject,
            emailBody,
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

  const filteredAvailableUsers = availableUsers.filter(
    user => !interviewers.some(inv => inv.userId === user.id)
  );

  const getStepNumber = (step: Step) => {
    switch (step) {
      case 'select-interviewers': return 1;
      case 'edit-email': return 2;
      case 'preview-email': return 3;
      default: return 0;
    }
  };

  const dialogId = `send-interview-invitation-modal-${applicant.id}`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        dialogId={dialogId}
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Send Interview Invitation</DialogTitle>
          <DialogDescription>
            {currentStep === 'select-interviewers' && `Select interviewers and schedule details for ${applicant.name}`}
            {currentStep === 'edit-email' && `Review and edit email content for ${applicant.name}`}
            {currentStep === 'preview-email' && `Preview email before sending to interviewers`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className={cn(
            "flex items-center gap-2",
            currentStep === 'select-interviewers' ? "text-primary" : "text-muted-foreground"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              currentStep === 'select-interviewers' ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              1
            </div>
            <span className="text-sm font-medium">Interview Details</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={cn(
            "flex items-center gap-2",
            currentStep === 'edit-email' ? "text-primary" : "text-muted-foreground"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              currentStep === 'edit-email' || currentStep === 'preview-email' ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              2
            </div>
            <span className="text-sm font-medium">Edit Email</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={cn(
            "flex items-center gap-2",
            currentStep === 'preview-email' ? "text-primary" : "text-muted-foreground"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              currentStep === 'preview-email' ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              3
            </div>
            <span className="text-sm font-medium">Preview & Send</span>
          </div>
        </div>

        {currentStep === 'select-interviewers' && (
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
                <PopoverContent className="w-auto p-0 bg-popover" align="start" popoverId="send-invitation-date-picker" zIndexType="modal">
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
              <Label htmlFor="location">Location *</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={locationType === 'room' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setLocationType('room');
                      // Clear custom location if switching back
                      if (!rooms.find(r => r.displayName === location)) {
                        setLocation('');
                        setLocationEmail('');
                      }
                    }}
                    disabled={loadingRooms || rooms.length === 0}
                  >
                    Meeting Room
                  </Button>
                  <Button
                    type="button"
                    variant={locationType === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setLocationType('custom');
                      setLocation('');
                      setLocationEmail('');
                    }}
                  >
                    Custom Location
                  </Button>
                </div>

                {locationType === 'room' ? (
                  <Select
                    value={locationEmail} // Use email as value since names might not be unique? Or revert to name. Room Email is stable.
                    onValueChange={(value) => {
                      const room = rooms.find(r => r.emailAddress === value);
                      if (room) {
                        setLocation(room.displayName);
                        setLocationEmail(room.emailAddress);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select a meeting room" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.emailAddress}>
                          {room.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="e.g., Zoom, Google Meet, Off-site"
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setLocationEmail('');
                      }}
                    />
                  </div>
                )}
                {locationType === 'room' && loadingRooms && (
                  <p className="text-xs text-muted-foreground">Loading available rooms...</p>
                )}
                {locationType === 'room' && !loadingRooms && rooms.length === 0 && (
                  <p className="text-xs text-destructive">No meeting rooms found. Please use Custom Location.</p>
                )}
              </div>
            </div>

            {/* Interviewers Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Interviewers *</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddInterviewerOpen(!addInterviewerOpen)}
                  disabled={loadingUsers || addingInterviewers}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Interviewer
                </Button>
              </div>

              {addInterviewerOpen && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Select users to add as interviewers</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAddInterviewerOpen(false);
                        setSelectedUserIds(new Set());
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <ScrollArea className="h-32 rounded-md border p-2">
                    {loadingUsers ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : filteredAvailableUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No available users to add
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredAvailableUsers.map((user) => (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`add-user-${user.id}`}
                              checked={selectedUserIds.has(user.id)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedUserIds);
                                if (checked) {
                                  newSet.add(user.id);
                                } else {
                                  newSet.delete(user.id);
                                }
                                setSelectedUserIds(newSet);
                              }}
                            />
                            <Label
                              htmlFor={`add-user-${user.id}`}
                              className="flex-1 cursor-pointer text-sm flex flex-col"
                            >
                              <span className="font-medium">{user.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {user.email}
                                {user.positionTitle && <span className="italic ml-1 opacity-70"> • {user.positionTitle}</span>}
                              </span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  {selectedUserIds.size > 0 && (
                    <Button
                      onClick={handleAddInterviewers}
                      disabled={addingInterviewers}
                      size="sm"
                      className="w-full"
                    >
                      {addingInterviewers ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add {selectedUserIds.size} Interviewer{selectedUserIds.size > 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

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
                    No interviewers assigned to this position. Add interviewers above.
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
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{interviewer.userName}</span>
                            </div>
                            <div className="text-xs text-muted-foreground ml-6">
                              {interviewer.userEmail}
                              {interviewer.positionTitle && <span className="italic ml-1 opacity-70"> • {interviewer.positionTitle}</span>}
                            </div>
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
        )}

        {currentStep === 'edit-email' && (
          <div className="space-y-6 py-4">
            {loadingTemplate ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading email template...
                </span>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email-subject">Email Subject *</Label>
                  <Input
                    id="email-subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Interview Invitation: {{ApplicantName}} - {{positionTitle}}"
                  />
                  <p className="text-xs text-muted-foreground">
                    Available variables: {'{'}ApplicantName{'}'}, {'{'}positionTitle{'}'}, {'{'}interviewDate{'}'}, {'{'}interviewTime{'}'}, {'{'}interviewLocation{'}'}, {'{'}evaluationLink{'}'}, {'{'}interviewerName{'}'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-body">Email Body (HTML) *</Label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant={emailEditorMode === 'wysiwyg' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setEmailEditorMode('wysiwyg')}
                      >
                        <Type className="h-3 w-3 mr-1" />
                        WYSIWYG
                      </Button>
                      <Button
                        type="button"
                        variant={emailEditorMode === 'html' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setEmailEditorMode('html')}
                      >
                        <Code className="h-3 w-3 mr-1" />
                        HTML
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-lg">
                    {emailEditorMode === 'wysiwyg' ? (
                      <TiptapEditor
                        value={emailBody}
                        onChange={setEmailBody}
                        placeholder="Enter email content..."
                        className="min-h-[400px]"
                      />
                    ) : (
                      <textarea
                        className="w-full min-h-[400px] p-3 font-mono text-sm bg-background rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary"
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        placeholder="Enter full HTML email template here with inline styles..."
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {emailEditorMode === 'html'
                      ? 'Raw HTML mode - your HTML code with inline styles will be sent as-is.'
                      : 'WYSIWYG mode - format visually. Switch to HTML mode for full control over styles.'
                    } Variables: {'{'}ApplicantName{'}'}, {'{'}positionTitle{'}'}, {'{'}interviewDate{'}'}, {'{'}interviewTime{'}'}, {'{'}interviewLocation{'}'}, {'{'}evaluationLink{'}'}, {'{'}evaluationQrcodeImage{'}'}, {'{'}interviewerName{'}'}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {currentStep === 'preview-email' && (
          <div className="space-y-6 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please review the email content below. Use the Back button to make changes.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase font-semibold">Subject</Label>
                <div className="font-medium border-b pb-2">{emailSubject}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase font-semibold">Message Body</Label>
                <div className="bg-background border rounded-lg p-4 overflow-auto max-h-[400px]">
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    // SECURITY: Explicitly sanitize HTML content using sanitizeRichHtml before rendering
                    dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(emailBody) }}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              This email will be sent to {selectedInterviewerIds.size} selected interviewer(s).
            </p>
          </div>
        )}

        <div className="flex justify-between gap-2 pt-4 border-t">
          {currentStep === 'edit-email' || currentStep === 'preview-email' ? (
            <Button variant="outline" onClick={handleBack} disabled={loading}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}

          {currentStep === 'preview-email' ? (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
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
          ) : (
            <Button
              onClick={handleNext}
              disabled={
                loadingInterviewers ||
                (currentStep === 'select-interviewers' && (!interviewDate || selectedInterviewerIds.size === 0 || !applicant.positionId)) ||
                (currentStep === 'edit-email' && (!emailSubject.trim() || !emailBody.trim()))
              }
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
