"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CalendarIcon, Clock, MapPin, Users, Loader2, AlertCircle, 
  ChevronRight, ChevronLeft, Plus, X, QrCode, Copy, ExternalLink, Download, Check, Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';
import { TiptapEditor } from '@/components/ui/wysiwyg-editors';
import { CandidateAvatarCompact } from '@/components/ui/candidate-avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useInterviewInvitationFeature } from '@/hooks/useInterviewInvitationFeature';
import { formatCandidateNameWithLang } from '@/lib/candidateUtils';

interface Interviewer {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CandidateInfo {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  positionId?: string | null;
  position?: { id: string; title: string } | null;
}

interface CreateEvaluateLinkModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: CandidateInfo;
  onSuccess?: (linkInfo: { url: string; expiresAt: string }) => void;
}

type Step = 'configure' | 'email' | 'success';

export function CreateEvaluateLinkModal({
  isOpen,
  onOpenChange,
  candidate,
  onSuccess,
}: CreateEvaluateLinkModalProps) {
  const isMobile = useIsMobile();
  const { isInterviewInvitationEnabled, isLoading: featureLoading } = useInterviewInvitationFeature();
  
  const [currentStep, setCurrentStep] = useState<Step>('configure');
  const [loading, setLoading] = useState(false);
  
  // Interview scheduling state
  const [interviewDate, setInterviewDate] = useState<Date | undefined>(undefined);
  const [interviewTime, setInterviewTime] = useState<string>('09:00');
  const [duration, setDuration] = useState<number>(60);
  const [location, setLocation] = useState<string>('');
  const [isCustomLocation, setIsCustomLocation] = useState<boolean>(false);
  
  // Azure meeting rooms state
  const [azureRooms, setAzureRooms] = useState<Array<{ id: string; displayName: string; capacity: number | null; building: string | null }>>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [azureMeetingRoomsEnabled, setAzureMeetingRoomsEnabled] = useState(false);
  
  // Interviewers state
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<Set<string>>(new Set());
  const [loadingInterviewers, setLoadingInterviewers] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [addInterviewerOpen, setAddInterviewerOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [addingInterviewers, setAddingInterviewers] = useState(false);
  
  // Email state
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  
  // Link options
  const [expireDays, setExpireDays] = useState(7);
  const [requireLogin, setRequireLogin] = useState(true);
  
  // Position validation
  const [positionValidation, setPositionValidation] = useState<{
    hasInterviewers: boolean;
    hasSkills: boolean;
    isLoading: boolean;
    error: string | null;
  }>({
    hasInterviewers: false,
    hasSkills: false,
    isLoading: false,
    error: null
  });
  
  // Success state
  const [linkInfo, setLinkInfo] = useState<{ url: string; expiresAt: string } | null>(null);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Validate position
  const validatePosition = useCallback(async () => {
    const positionId = candidate?.positionId || candidate?.position?.id;
    if (!positionId) {
      setPositionValidation({
        hasInterviewers: false,
        hasSkills: false,
        isLoading: false,
        error: 'Candidate has no assigned position'
      });
      return;
    }

    setPositionValidation(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [interviewersRes, evaluationRes] = await Promise.all([
        fetch(`/api/positions/${positionId}/interviewers`, { credentials: 'include' }),
        fetch(`/api/v1/positions/${positionId}/evaluation`, { credentials: 'include' })
      ]);

      let hasInterviewers = false;
      let hasSkills = false;

      if (interviewersRes.ok) {
        const interviewersData = await interviewersRes.json();
        hasInterviewers = Array.isArray(interviewersData) && interviewersData.length > 0;
        setInterviewers(interviewersData);
        // Pre-select all interviewers
        setSelectedInterviewerIds(new Set(interviewersData.map((i: Interviewer) => i.userId)));
      }

      if (evaluationRes.ok) {
        const evaluationCriteria = await evaluationRes.json();
        const personalityTraits = evaluationCriteria.personalityTraits || [];
        const personalityGroups = evaluationCriteria.personalityGroups || [];
        const expertiseSkills = evaluationCriteria.expertiseSkills || [];
        const expertiseGroups = evaluationCriteria.expertiseGroups || [];

        hasSkills = personalityTraits.length > 0 ||
          personalityGroups.length > 0 ||
          expertiseSkills.length > 0 ||
          expertiseGroups.length > 0;
      }

      setPositionValidation({
        hasInterviewers,
        hasSkills,
        isLoading: false,
        error: null
      });
    } catch (err) {
      console.error('Error validating position:', err);
      setPositionValidation({
        hasInterviewers: false,
        hasSkills: false,
        isLoading: false,
        error: 'Failed to validate position configuration'
      });
    }
  }, [candidate?.positionId, candidate?.position?.id]);

  // Load available users
  const loadAvailableUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Load email template
  const loadEmailTemplate = useCallback(async () => {
    setLoadingTemplate(true);
    try {
      const response = await fetch('/api/settings/system-settings', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        let settings: any = {};
        
        if (data.settings && Array.isArray(data.settings)) {
          settings = Object.fromEntries(data.settings.map((setting: any) => [setting.key, setting.value]));
        } else {
          settings = data;
        }

        const template = settings.emailTemplateInterviewInvitation || '';
        const subject = settings.emailTemplateInterviewInvitationSubject || 'Interview Invitation: {{candidateName}} - {{positionTitle}}';
        const logo = settings.qrCodeLogo || settings.appLogoDataUrl || null;
        
        setEmailSubject(subject);
        setEmailBody(template || getDefaultEmailTemplate());
        setAppLogoUrl(logo);
        
        // Check if Azure meeting rooms is enabled
        setAzureMeetingRoomsEnabled(settings.azureMeetingRoomsEnabled === 'true');
      }
    } catch (err) {
      console.error('Error loading email template:', err);
      setEmailSubject('Interview Invitation: {{candidateName}} - {{positionTitle}}');
      setEmailBody(getDefaultEmailTemplate());
    } finally {
      setLoadingTemplate(false);
    }
  }, []);

  // Default email template
  const getDefaultEmailTemplate = () => {
    return `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Interview Invitation</h1>
  </div>
  
  <!-- Content -->
  <div style="padding: 32px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none;">
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Dear {{interviewerName}},</p>
    
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">
      You have been invited to evaluate <strong>{{candidateName}}</strong> for the position of <strong>{{positionTitle}}</strong>.
    </p>
    
    <!-- Interview Details Card -->
    <div style="background: #ffffff; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
      <h3 style="color: #1e293b; margin: 0 0 16px 0; font-size: 16px;">Interview Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 120px;">๐Ÿ"… Date:</td>
          <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{{interviewDate}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">โฐ Time:</td>
          <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{{interviewTime}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">๐Ÿ" Location:</td>
          <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{{interviewLocation}}</td>
        </tr>
      </table>
    </div>
    
    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{evaluationLink}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.25);">
        ๐ŸŽฏ Evaluate Candidate
      </a>
    </div>
    
    <!-- QR Code Section -->
    <div style="text-align: center; margin: 24px 0; padding: 20px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 14px; margin: 0 0 16px 0;">Or scan this QR code:</p>
      <img src="{{qrCodeBase64}}" alt="QR Code" style="width: 150px; height: 150px; border-radius: 8px;" />
    </div>
    
    <!-- Fallback Link -->
    <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-top: 24px;">
      <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0;">If the button doesn't work, copy this link:</p>
      <p style="color: #3B82F6; font-size: 12px; margin: 0; word-break: break-all;">{{evaluationLink}}</p>
    </div>
  </div>
  
  <!-- Footer -->
  <div style="padding: 24px; text-align: center; background: #1e293b; border-radius: 0 0 8px 8px;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">Sent via Recruitment System</p>
  </div>
</div>`;
  };

  // Load Azure meeting rooms
  const loadAzureRooms = useCallback(async () => {
    if (!azureMeetingRoomsEnabled) return;
    
    setLoadingRooms(true);
    try {
      const response = await fetch('/api/azure/meeting-rooms', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.rooms && Array.isArray(data.rooms)) {
          setAzureRooms(data.rooms);
        }
      }
    } catch (err) {
      console.error('Error loading Azure meeting rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  }, [azureMeetingRoomsEnabled]);

  // Handle effects
  useEffect(() => {
    if (isOpen && candidate?.id) {
      validatePosition();
      loadAvailableUsers();
      loadEmailTemplate();
    }
  }, [isOpen, candidate?.id, validatePosition, loadAvailableUsers, loadEmailTemplate]);

  // Load Azure rooms when feature is enabled
  useEffect(() => {
    if (isOpen && azureMeetingRoomsEnabled) {
      loadAzureRooms();
    }
  }, [isOpen, azureMeetingRoomsEnabled, loadAzureRooms]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('configure');
      setInterviewDate(undefined);
      setInterviewTime('09:00');
      setDuration(60);
      setLocation('');
      setSelectedInterviewerIds(new Set());
      setEmailSubject('');
      setEmailBody('');
      setLinkInfo(null);
      setExpireDays(7);
      setRequireLogin(true);
      setSendEmail(true);
      setCopied(false);
      setAddInterviewerOpen(false);
      setSelectedUserIds(new Set());
      setIsCustomLocation(false);
    }
  }, [isOpen]);

  // Toggle interviewer selection
  const toggleInterviewer = (userId: string) => {
    const newSet = new Set(selectedInterviewerIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedInterviewerIds(newSet);
  };

  // Add interviewers
  const handleAddInterviewers = async () => {
    if (selectedUserIds.size === 0) return;
    const positionId = candidate.positionId || candidate.position?.id;
    if (!positionId) return;

    setAddingInterviewers(true);
    const userIdsArray = Array.from(selectedUserIds);
    let successCount = 0;

    try {
      for (const userId of userIdsArray) {
        const response = await fetch(`/api/positions/${positionId}/interviewers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId }),
        });

        if (response.ok) {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} interviewer(s) added`);
        await validatePosition();
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

  // Create evaluation link
  const createLink = async (skipEmail = false) => {
    setLoading(true);
    try {
      // Create evaluation link
      const linkResponse = await fetch(`/api/v1/candidates/${candidate.id}/evaluation-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          days: expireDays, 
          requireLogin,
          interviewDateTime: interviewDate ? new Date(interviewDate.setHours(
            parseInt(interviewTime.split(':')[0]),
            parseInt(interviewTime.split(':')[1])
          )).toISOString() : undefined,
          interviewLocation: location || undefined,
        }),
      });

      if (!linkResponse.ok) {
        const error = await linkResponse.json();
        throw new Error(error.message || 'Failed to create evaluation link');
      }

      const linkData = await linkResponse.json();
      setLinkInfo({ url: linkData.url, expiresAt: linkData.expiresAt });

      // Send email if enabled and invitation feature is on
      if (!skipEmail && sendEmail && isInterviewInvitationEnabled && selectedInterviewerIds.size > 0) {
        await sendInvitationEmails(linkData.url);
      }

      setCurrentStep('success');
      onSuccess?.({ url: linkData.url, expiresAt: linkData.expiresAt });
      toast.success('Evaluation link created');
    } catch (error: any) {
      console.error('Error creating link:', error);
      toast.error(error.message || 'Failed to create evaluation link');
    } finally {
      setLoading(false);
    }
  };

  // Send invitation emails
  const sendInvitationEmails = async (evaluationUrl: string) => {
    try {
      const dateTime = interviewDate ? new Date(interviewDate) : new Date();
      if (interviewDate) {
        const [hours, minutes] = interviewTime.split(':').map(Number);
        dateTime.setHours(hours, minutes, 0, 0);
      }

      const response = await fetch(`/api/candidates/${candidate.id}/send-interview-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          interviewerIds: Array.from(selectedInterviewerIds),
          interviewDate: dateTime.toISOString(),
          interviewTime,
          duration,
          location: location || undefined,
          emailSubject,
          emailBody,
          evaluationLink: evaluationUrl,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Email sent to ${data.results?.length || selectedInterviewerIds.size} interviewer(s)`);
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      toast.error('Link created but failed to send emails');
    }
  };

  // Handle next step
  const handleNext = () => {
    if (currentStep === 'configure') {
      if (isInterviewInvitationEnabled && sendEmail) {
        setCurrentStep('email');
      } else {
        createLink(true);
      }
    } else if (currentStep === 'email') {
      createLink(false);
    }
  };

  // Handle back
  const handleBack = () => {
    if (currentStep === 'email') {
      setCurrentStep('configure');
    }
  };

  // Copy link
  const copyLink = () => {
    if (linkInfo?.url) {
      navigator.clipboard.writeText(linkInfo.url);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download QR code
  const downloadQR = () => {
    const canvas = document.getElementById('evaluate-qr-code') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `evaluation-qr-${candidate.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  // Validation checks
  const canProceed = positionValidation.hasInterviewers && positionValidation.hasSkills;
  const filteredAvailableUsers = availableUsers.filter(
    user => !interviewers.some(inv => inv.userId === user.id)
  );

  // Render configure step
  const renderConfigureStep = () => (
    <div className="space-y-6 py-4">
      {/* Position Validation Warning */}
      {!positionValidation.isLoading && !canProceed && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Cannot create evaluation link</p>
              <ul className="text-sm list-disc list-inside space-y-1">
                {positionValidation.error && <li>{positionValidation.error}</li>}
                {!positionValidation.error && !positionValidation.hasInterviewers && (
                  <li>No interviewers assigned to the position</li>
                )}
                {!positionValidation.error && !positionValidation.hasSkills && (
                  <li>No evaluation skills assigned</li>
                )}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Link Options */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Expire in (days)</Label>
          <Input
            type="number"
            min={1}
            max={365}
            value={expireDays}
            onChange={(e) => setExpireDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 7)))}
          />
        </div>
        <div className="space-y-2">
          <Label>Require Login</Label>
          <div className="flex items-center h-10">
            <Checkbox
              checked={requireLogin}
              onCheckedChange={(checked) => setRequireLogin(!!checked)}
            />
            <span className="ml-2 text-sm text-muted-foreground">Require</span>
          </div>
        </div>
      </div>

      {/* Interview Invitation Section - Only if feature enabled */}
      {isInterviewInvitationEnabled && (
        <>
          <div className="flex items-center gap-2 pb-2 border-b">
            <Checkbox
              id="send-email"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(!!checked)}
            />
            <Label htmlFor="send-email" className="flex items-center gap-2 cursor-pointer">
              <Mail className="h-4 w-4" />
              Send interview invitation email
            </Label>
          </div>

          {sendEmail && (
            <>
              {/* Interview Date */}
              <div className="space-y-2">
                <Label>Interview Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal', !interviewDate && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {interviewDate ? format(interviewDate, 'PPP') : 'Select date'}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Time
                  </Label>
                  <Input
                    type="time"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Location
                </Label>
                {azureMeetingRoomsEnabled && azureRooms.length > 0 && !isCustomLocation ? (
                  <div className="space-y-2">
                    <Select
                      value={location}
                      onValueChange={(value) => {
                        if (value === '__custom__') {
                          setIsCustomLocation(true);
                          setLocation('');
                        } else {
                          setLocation(value);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingRooms ? "Loading rooms..." : "Select a meeting room"} />
                      </SelectTrigger>
                      <SelectContent>
                        {azureRooms.map((room) => (
                          <SelectItem key={room.id} value={room.displayName}>
                            <div className="flex items-center gap-2">
                              <span>{room.displayName}</span>
                              {room.capacity && (
                                <span className="text-xs text-muted-foreground">({room.capacity} people)</span>
                              )}
                              {room.building && (
                                <span className="text-xs text-muted-foreground">- {room.building}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">
                          <span className="text-primary">+ Enter custom location</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Conference Room A, Zoom link, etc."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                    {azureMeetingRoomsEnabled && azureRooms.length > 0 && isCustomLocation && (
                      <Button
                        variant="link"
                        size="sm"
                        className="text-xs p-0 h-auto"
                        onClick={() => {
                          setIsCustomLocation(false);
                          setLocation('');
                        }}
                      >
                        Back to meeting rooms list
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Interviewers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> Interviewers
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddInterviewerOpen(!addInterviewerOpen)}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>

                {addInterviewerOpen && (
                  <div className="border rounded-lg p-3 space-y-2">
                    <ScrollArea className="h-32 rounded-md border p-2">
                      {filteredAvailableUsers.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`add-${user.id}`}
                            checked={selectedUserIds.has(user.id)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedUserIds);
                              if (checked) newSet.add(user.id);
                              else newSet.delete(user.id);
                              setSelectedUserIds(newSet);
                            }}
                          />
                          <Label htmlFor={`add-${user.id}`} className="text-sm cursor-pointer">
                            {user.name} ({user.email})
                          </Label>
                        </div>
                      ))}
                    </ScrollArea>
                    {selectedUserIds.size > 0 && (
                      <Button size="sm" className="w-full" onClick={handleAddInterviewers} disabled={addingInterviewers}>
                        {addingInterviewers ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                        Add {selectedUserIds.size}
                      </Button>
                    )}
                  </div>
                )}

                <ScrollArea className="h-32 rounded-md border p-3">
                  {interviewers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No interviewers assigned</p>
                  ) : (
                    <div className="space-y-2">
                      {interviewers.map((interviewer) => (
                        <div key={interviewer.userId} className="flex items-center space-x-2">
                          <Checkbox
                            id={`inv-${interviewer.userId}`}
                            checked={selectedInterviewerIds.has(interviewer.userId)}
                            onCheckedChange={() => toggleInterviewer(interviewer.userId)}
                          />
                          <Label htmlFor={`inv-${interviewer.userId}`} className="text-sm cursor-pointer flex-1">
                            {interviewer.userName} <span className="text-muted-foreground">({interviewer.userEmail})</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  {selectedInterviewerIds.size} of {interviewers.length} selected
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );

  // Render email step
  const renderEmailStep = () => (
    <div className="space-y-4 py-4">
      {loadingTemplate ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Email Subject</Label>
            <Input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Interview Invitation: {{candidateName}}"
            />
          </div>
          <div className="space-y-2">
            <Label>Email Body</Label>
            <div className="border rounded-lg">
              <TiptapEditor
                value={emailBody}
                onChange={setEmailBody}
                placeholder="Enter email content..."
                className="min-h-[300px]"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Variables: {`{{candidateName}}, {{positionTitle}}, {{interviewDate}}, {{interviewTime}}, {{interviewLocation}}, {{evaluationLink}}, {{qrCodeBase64}}`}
            </p>
          </div>
        </>
      )}
    </div>
  );

  // Render success step
  const renderSuccessStep = () => {
    const nameInfo = formatCandidateNameWithLang({ name: candidate.name } as any);
    
    return (
      <div className="flex flex-col items-center py-6 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold">Evaluation Link Created!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            For <span className={nameInfo.fontClass} lang={nameInfo.lang}>{candidate.name}</span>
          </p>
        </div>

        {/* QR Code */}
        <div className="bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-sm">
          <QRCodeCanvas
            id="evaluate-qr-code"
            value={linkInfo?.url || ''}
            size={200}
            level="H"
            imageSettings={appLogoUrl ? {
              src: appLogoUrl,
              x: undefined,
              y: undefined,
              height: 40,
              width: 40,
              excavate: true,
            } : undefined}
          />
        </div>

        {/* Expiry */}
        {linkInfo?.expiresAt && (
          <p className="text-sm text-muted-foreground">
            Expires: {new Date(linkInfo.expiresAt).toLocaleDateString()}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col w-full gap-2 px-4">
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => window.open(linkInfo?.url, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" /> Open Link
            </Button>
            <Button variant="outline" size="icon" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button variant="outline" onClick={downloadQR}>
            <Download className="h-4 w-4 mr-2" /> Download QR Code
          </Button>
        </div>

        {/* Link display */}
        <div className="w-full px-4">
          <p className="text-xs text-muted-foreground break-all bg-muted p-2 rounded">
            {linkInfo?.url}
          </p>
        </div>
      </div>
    );
  };

  // Step indicator
  const renderStepIndicator = () => {
    const steps = isInterviewInvitationEnabled && sendEmail
      ? [{ id: 'configure', label: 'Configure' }, { id: 'email', label: 'Email' }, { id: 'success', label: 'Done' }]
      : [{ id: 'configure', label: 'Configure' }, { id: 'success', label: 'Done' }];

    return (
      <div className="flex items-center gap-2 mb-4">
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className={cn(
              "flex items-center gap-2",
              currentStep === step.id ? "text-primary" : "text-muted-foreground"
            )}>
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium",
                currentStep === step.id ? "bg-primary text-primary-foreground" :
                  steps.findIndex(s => s.id === currentStep) > idx ? "bg-primary/20 text-primary" : "bg-muted"
              )}>
                {steps.findIndex(s => s.id === currentStep) > idx ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
            </div>
            {idx < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Footer
  const renderFooter = () => {
    if (currentStep === 'success') {
      return (
        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
          Close
        </Button>
      );
    }

    return (
      <div className="flex gap-2">
        {currentStep === 'email' ? (
          <Button variant="outline" onClick={handleBack} disabled={loading}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        ) : (
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleNext}
          disabled={loading || positionValidation.isLoading || !canProceed || (isInterviewInvitationEnabled && sendEmail && selectedInterviewerIds.size === 0)}
          className="flex-1"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</>
          ) : currentStep === 'email' ? (
            <><Mail className="h-4 w-4 mr-2" /> Send & Create</>
          ) : isInterviewInvitationEnabled && sendEmail ? (
            <>Next <ChevronRight className="h-4 w-4 ml-1" /></>
          ) : (
            <><QrCode className="h-4 w-4 mr-2" /> Create Link</>
          )}
        </Button>
      </div>
    );
  };

  // Content
  const content = (
    <>
      {currentStep !== 'success' && renderStepIndicator()}
      {positionValidation.isLoading || featureLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading...</span>
        </div>
      ) : (
        <>
          {currentStep === 'configure' && renderConfigureStep()}
          {currentStep === 'email' && renderEmailStep()}
          {currentStep === 'success' && renderSuccessStep()}
        </>
      )}
      <div className="pt-4 border-t">{renderFooter()}</div>
    </>
  );

  // Render mobile or desktop
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Create Evaluate Link</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Evaluate Link</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
