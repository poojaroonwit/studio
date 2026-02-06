
'use client';

import { sanitizeUrl } from '@/lib/utils';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileCheck, Plus, Search, User, X, AlertTriangle, ExternalLink, Download, Copy, MapPin, Calendar as CalendarIcon, Users, Clock, Edit } from 'lucide-react';
import { MobileEvaluateCalendar, DesktopEvaluateCalendar } from '@/components/ui/evaluate-calendar';
import { Switch } from '@/components/ui/switch';
import { QRCodeCanvas } from 'qrcode.react';
import { ApplicantAvatarCompact } from '@/components/ui/applicant-avatar';
import { formatApplicantNameWithLang } from '@/lib/applicantUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { CreateEvaluateLinkModal } from '@/components/applicants/CreateEvaluateLinkModal';

interface ApplicantWithEvaluationLink {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  position?: { id: string; title: string } | null;
  evaluationLink: {
    url: string;
    expiresAt: string;
    revokedAt?: string | null;
    interviewDateTime?: string;
    interviewLocation?: string;
    interviewers?: Array<{ id: string; name: string }>;
  };
}

interface SearchApplicant {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  position?: { id: string; title: string } | null;
  positionId?: string | null;
}

interface PositionValidation {
  hasInterviewers: boolean;
  hasSkills: boolean;
  positionId: string | null;
  positionTitle: string | null;
  isLoading: boolean;
  error: string | null;
}

export default function EvaluatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const isMobile = useIsMobile();
  const { data: session, status: sessionStatus } = useSession();
  const [applicants, setApplicants] = useState<ApplicantWithEvaluationLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create link modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchApplicant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<SearchApplicant | null>(null);
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);
  const [expireDays, setExpireDays] = useState(7);
  const [requireLogin, setRequireLogin] = useState(true);
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  // Interview scheduling state
  const [expireDate, setExpireDate] = useState<string>('');
  const [interviewDateTime, setInterviewDateTime] = useState<string>('');
  const [interviewLocation, setInterviewLocation] = useState<string>('');
  const [sendAppointment, setSendAppointment] = useState(false);
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<Set<string>>(new Set());
  const [availableInterviewers, setAvailableInterviewers] = useState<Array<{ id: string; name: string; email?: string }>>([]);

  // QR Modal State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState<{ name: string, url: string, avatarUrl: string | null, expiresAt?: string } | null>(null);
  const [qrApplicantId, setQrApplicantId] = useState<string | null>(null);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);

  // Edit evaluation link state
  const [isEditEvalLinkModalOpen, setIsEditEvalLinkModalOpen] = useState(false);

  // Calendar view state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Position validation state
  const [positionValidation, setPositionValidation] = useState<PositionValidation>({
    hasInterviewers: false,
    hasSkills: false,
    positionId: null,
    positionTitle: null,
    isLoading: false,
    error: null
  });

  // Check authentication and redirect if not logged in
  useEffect(() => {
    if (sessionStatus === 'loading') {
      // Still loading session, wait
      return;
    }

    if (sessionStatus === 'unauthenticated') {
      // User is not authenticated, redirect to login with callback URL
      const currentPath = '/interview';
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(currentPath)}`);
    }
  }, [sessionStatus, router]);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (sessionStatus === 'authenticated') {
      fetchApplicantsWithEvaluationLinks();
      // Fetch QR code logo (prefer qrCodeLogo, fallback to appLogoDataUrl)
      fetch('/api/settings/system-settings?keys=qrCodeLogo,appLogoDataUrl')
        .then(res => res.json())
        .then(data => {
          // Prefer dedicated QR code logo, fallback to app logo
          if (data.qrCodeLogo) setAppLogoUrl(data.qrCodeLogo);
          else if (data.appLogoDataUrl) setAppLogoUrl(data.appLogoDataUrl);
        })
        .catch(err => console.error('Failed to fetch QR code logo', err));
    }
  }, [sessionStatus, query]);

  const fetchApplicantsWithEvaluationLinks = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch evaluation links
      // Include search query if present
      // Fetch all links (active, expired, revoked) to show complete history
      const queryString = query ? `&q=${encodeURIComponent(query)}` : '';
      const response = await fetch(`/api/v1/evaluation/links?status=all&limit=100${queryString}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to fetch Applicants with evaluation links';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          if (errorData.hint) {
            errorMessage += ` - ${errorData.hint}`;
          }
        } catch (parseError) {
          // If response is not JSON, use status-based message
          if (response.status === 401) {
            errorMessage = 'Unauthorized. Please log in to view evaluation links.';
          } else if (response.status === 403) {
            errorMessage = 'You do not have permission to view evaluation links.';
          } else if (response.status === 500) {
            errorMessage = 'Server error. Please try again later.';
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Transform the data to include applicant info
      const applicantsWithLinks: ApplicantWithEvaluationLink[] = (data.data || [])
        .filter((item: any) => item.applicant && item.url)
        .map((item: any) => ({
          id: item.applicant.id,
          name: item.applicant.name || 'Unknown',
          email: item.applicant.email,
          avatarUrl: item.applicant.avatarUrl || null,
          position: item.applicant.position || null,
          evaluationLink: {
            url: item.url,
            expiresAt: item.expiresAt,
            revokedAt: item.revokedAt || null,
            interviewDateTime: item.interviewDateTime || undefined,
            interviewLocation: item.interviewLocation || undefined,
            interviewers: item.interviewers || undefined,
          }
        }));

      setApplicants(applicantsWithLinks);
    } catch (err) {
      console.error('Error fetching Applicants:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Applicants');
    } finally {
      setIsLoading(false);
    }
  };

  // Search for Applicants
  const searchApplicants = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      // Search by name (contains) - API supports name filter with contains operator
      const searchParam = encodeURIComponent(query);
      const response = await fetch(`/api/applicants?name=${searchParam}&nameOperator=contains&limit=20`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const applicantList = Array.isArray(data) ? data : (data.data || []);
        setSearchResults(applicantList.map((c: any) => ({
          id: c.id,
          name: c.name || 'Unknown',
          email: c.email,
          avatarUrl: c.avatarUrl || null,
          position: c.position ? { id: c.position.id, title: c.position.title } : null,
          positionId: c.positionId || c.position?.id || null
        })));
      }
    } catch (err) {
      console.error('Error searching Applicants:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Validate position has interviewers and skills
  const validatePosition = useCallback(async (positionId: string, positionTitle: string | null) => {
    setPositionValidation({
      hasInterviewers: false,
      hasSkills: false,
      positionId,
      positionTitle,
      isLoading: true,
      error: null
    });

    try {
      // Fetch interviewers
      const [interviewersRes, evaluationRes] = await Promise.all([
        fetch(`/api/positions/${positionId}/interviewers`, { credentials: 'include' }),
        fetch(`/api/v1/positions/${positionId}/evaluation`, { credentials: 'include' })
      ]);

      let hasInterviewers = false;
      let hasSkills = false;

      if (interviewersRes.ok) {
        const interviewers = await interviewersRes.json();
        hasInterviewers = Array.isArray(interviewers) && interviewers.length > 0;

        // Store available interviewers and select all by default
        if (hasInterviewers) {
          const formattedInterviewers = interviewers.map((i: any) => ({
            id: i.id,
            name: i.name || i.email || 'Unknown',
            email: i.email
          }));
          setAvailableInterviewers(formattedInterviewers);
          setSelectedInterviewerIds(new Set(formattedInterviewers.map((i: any) => i.id)));
        } else {
          setAvailableInterviewers([]);
          setSelectedInterviewerIds(new Set());
        }
      }

      if (evaluationRes.ok) {
        const evaluationCriteria = await evaluationRes.json();

        // Check for personality traits/groups
        const personalityTraits = evaluationCriteria.personalityTraits || [];
        const personalityGroups = evaluationCriteria.personalityGroups || [];

        // Check for expertise skills/groups
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
        positionId,
        positionTitle,
        isLoading: false,
        error: null
      });
    } catch (err) {
      console.error('Error validating position:', err);
      setPositionValidation({
        hasInterviewers: false,
        hasSkills: false,
        positionId,
        positionTitle,
        isLoading: false,
        error: 'Failed to validate position configuration'
      });
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchApplicants(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchApplicants]);

  // Validate position when Applicant is selected
  useEffect(() => {
    if (selectedApplicant) {
      const positionId = selectedApplicant.positionId || selectedApplicant.position?.id;
      if (positionId) {
        validatePosition(positionId, selectedApplicant.position?.title || null);
      } else {
        setPositionValidation({
          hasInterviewers: false,
          hasSkills: false,
          positionId: null,
          positionTitle: null,
          isLoading: false,
          error: 'Applicant has no assigned position'
        });
      }
    } else {
      setPositionValidation({
        hasInterviewers: false,
        hasSkills: false,
        positionId: null,
        positionTitle: null,
        isLoading: false,
        error: null
      });
    }
  }, [selectedApplicant, validatePosition]);

  // Create evaluation link for selected Applicant
  const createEvaluationLink = async () => {
    if (!selectedApplicant) return;

    try {
      setIsCreatingLink(true);
      const response = await fetch(`/api/v1/Applicants/${selectedApplicant.id}/evaluation-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ days: expireDays, requireLogin })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to create evaluation link');
      }

      const data = await response.json();
      toast.success('Evaluation link created successfully');

      // Close modal and refresh list
      setIsCreateModalOpen(false);

      // Open QR Modal immediately
      if (data.url && selectedApplicant) {
        setQrData({
          name: selectedApplicant.name,
          url: data.url,
          avatarUrl: selectedApplicant.avatarUrl || null,
          expiresAt: data.expiresAt
        });
        setQrModalOpen(true);
      }

      setSelectedApplicant(null);
      setSearchQuery('');
      setSearchResults([]);
      fetchApplicantsWithEvaluationLinks();

      // Optionally copy link to clipboard
      if (data.url) {
        navigator.clipboard.writeText(data.url).then(() => {
          toast.success('Link copied to clipboard');
        }).catch(() => { });
      }
    } catch (err) {
      console.error('Error creating evaluation link:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create evaluation link');
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleApplicantClick = (applicantId: string) => {
    const applicant = applicants.find(c => c.id === applicantId);
    if (applicant && applicant.evaluationLink?.url) {
      setQrData({
        name: applicant.name,
        url: applicant.evaluationLink.url,
        avatarUrl: applicant.avatarUrl,
        expiresAt: applicant.evaluationLink.expiresAt
      });
      setQrApplicantId(applicantId);
      setQrModalOpen(true);
    }
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
    setSelectedApplicant(null);
    setSearchQuery('');
    setSearchResults([]);
    setExpireDays(7);
    setRequireLogin(true);

    // Reset interview scheduling state
    const defaultExpireDate = new Date();
    defaultExpireDate.setDate(defaultExpireDate.getDate() + 7);
    setExpireDate(defaultExpireDate.toISOString().slice(0, 16));
    setInterviewDateTime('');
    setInterviewLocation('');
    setSendAppointment(false);
    setSelectedInterviewerIds(new Set());
    setAvailableInterviewers([]);

    setPositionValidation({
      hasInterviewers: false,
      hasSkills: false,
      positionId: null,
      positionTitle: null,
      isLoading: false,
      error: null
    });
  };

  const handleConfigurePosition = () => {
    if (selectedApplicant && positionValidation.positionId) {
      // Navigate to Applicant detail page with the position
      router.push(`/applicants/${selectedApplicant.id}`);
      setIsCreateModalOpen(false);
    }
  };

  // Check if can create link
  const canCreateLink = selectedApplicant &&
    !positionValidation.isLoading &&
    positionValidation.hasInterviewers &&
    positionValidation.hasSkills &&
    // If sendAppointment is ON, require at least one interviewer selected
    (!sendAppointment || selectedInterviewerIds.size > 0);

  // Check if showing warning
  const showValidationWarning = selectedApplicant &&
    !positionValidation.isLoading &&
    (!positionValidation.hasInterviewers || !positionValidation.hasSkills || positionValidation.error);

  // Show loading screen when checking authentication or loading data
  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated, the useEffect will handle redirect
  // This prevents flash of content before redirect
  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center min-h-screen",
        isMobile ? "p-4" : "p-6"
      )}>
        <div className={cn(
          "w-full text-center",
          isMobile ? "max-w-sm" : "max-w-md"
        )}>
          <FileCheck className={cn(
            "text-destructive mx-auto mb-4",
            isMobile ? "h-10 w-10" : "h-12 w-12"
          )} />
          <h2 className={cn(
            "font-semibold mb-2 text-destructive",
            isMobile ? "text-base" : "text-lg"
          )}>
            Error Loading Evaluation Links
          </h2>
          <p className={cn(
            "text-muted-foreground mb-6",
            isMobile ? "text-sm" : "text-base"
          )}>
            {error}
          </p>
          <div className="space-y-2">
            <Button
              onClick={fetchApplicantsWithEvaluationLinks}
              className="w-full"
              size={isMobile ? "default" : "lg"}
            >
              Retry
            </Button>
            {error.includes('permission') && (
              <p className="text-xs text-muted-foreground mt-4">
                If you believe you should have access, please contact your administrator.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render Create Link Modal Content
  const renderCreateLinkContent = () => (
    <div className="space-y-4 py-4">
      {/* Applicant Search */}
      <div className="space-y-2">
        <Label>Search Applicant</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchQuery && searchResults.length > 0 && !selectedApplicant && (
        <div className="border rounded-md max-h-48 overflow-y-auto">
          {searchResults.map((applicant) => {
            const nameInfo = formatApplicantNameWithLang({ name: applicant.name } as any);
            return (
              <div
                key={applicant.id}
                className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                onClick={() => {
                  setSelectedApplicant(applicant);
                  setSearchQuery('');
                  setSearchResults([]);
                  setIsCreateModalOpen(false);
                  setShowCreateLinkModal(true);
                }}
              >
                <ApplicantAvatarCompact
                  user={{
                    id: applicant.id,
                    name: applicant.name,
                    avatarUrl: applicant.avatarUrl,
                    email: applicant.email || undefined
                  }}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className={cn("font-medium text-sm truncate", nameInfo.fontClass)} lang={nameInfo.lang}>
                    {applicant.name}
                  </div>
                  {applicant.email && (
                    <div className="text-xs text-muted-foreground truncate">
                      {applicant.email}
                    </div>
                  )}
                  {applicant.position?.title && (
                    <div className="text-xs text-muted-foreground truncate">
                      Position: {applicant.position.title}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No Results */}
      {searchQuery && searchResults.length === 0 && !isSearching && !selectedApplicant && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No Applicants found
        </div>
      )}

      {/* Selected Applicant */}
      {selectedApplicant && (
        <div className="border rounded-md p-3 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ApplicantAvatarCompact
                user={{
                  id: selectedApplicant.id,
                  name: selectedApplicant.name,
                  avatarUrl: selectedApplicant.avatarUrl,
                  email: selectedApplicant.email || undefined
                }}
                size="sm"
              />
              <div>
                <div className="font-medium text-sm">{selectedApplicant.name}</div>
                {selectedApplicant.email && (
                  <div className="text-xs text-muted-foreground">{selectedApplicant.email}</div>
                )}
                {selectedApplicant.position?.title && (
                  <div className="text-xs text-muted-foreground">Position: {selectedApplicant.position.title}</div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setSelectedApplicant(null);
                setSearchQuery('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Position Validation Loading */}
      {selectedApplicant && positionValidation.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking position configuration...
        </div>
      )}

      {/* Position Validation Warning */}
      {showValidationWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Cannot create evaluation link</p>
              <ul className="text-sm list-disc list-inside space-y-1">
                {positionValidation.error && (
                  <li>{positionValidation.error}</li>
                )}
                {!positionValidation.error && !positionValidation.hasInterviewers && (
                  <li>No interviewers assigned to the position</li>
                )}
                {!positionValidation.error && !positionValidation.hasSkills && (
                  <li>No evaluation skills assigned to the position (requires at least 1 personality or expertise skill)</li>
                )}
              </ul>
              {positionValidation.positionId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConfigurePosition}
                  className="mt-2 flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Configure Position
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Link Options - Only show if validation passes */}
      {selectedApplicant && !positionValidation.isLoading && positionValidation.hasInterviewers && positionValidation.hasSkills && (
        <div className="space-y-4">
          {/* Expire Date/Time */}
          <div className="space-y-2">
            <Label htmlFor="expireDate" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Link Expires
            </Label>
            <Input
              id="expireDate"
              type="datetime-local"
              value={expireDate}
              onChange={(e) => setExpireDate(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Interview Date/Time */}
          <div className="space-y-2">
            <Label htmlFor="interviewDateTime" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Interview Date & Time
            </Label>
            <Input
              id="interviewDateTime"
              type="datetime-local"
              value={interviewDateTime}
              onChange={(e) => setInterviewDateTime(e.target.value)}
              className="w-full"
              placeholder="Optional"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="interviewLocation" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Interview Location
            </Label>
            <Input
              id="interviewLocation"
              type="text"
              value={interviewLocation}
              onChange={(e) => setInterviewLocation(e.target.value)}
              placeholder="e.g., Conference Room A, Zoom link..."
              className="w-full"
            />
          </div>

          {/* Require Login Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="requireLogin" className="text-sm">Require Login</Label>
            <Switch
              id="requireLogin"
              checked={requireLogin}
              onCheckedChange={setRequireLogin}
            />
          </div>

          {/* Send Interview Appointment Toggle */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="sendAppointment" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Send Interview Appointment
              </Label>
              <Switch
                id="sendAppointment"
                checked={sendAppointment}
                onCheckedChange={setSendAppointment}
              />
            </div>

            {/* Show Applicant Card and Interviewers when toggle is ON */}
            {sendAppointment && (
              <div className="space-y-4 pt-2 border-t">
                {/* Applicant Card */}
                <div className="bg-muted/50 rounded-md p-3">
                  <p className="text-xs text-muted-foreground mb-2">Applicant</p>
                  <div className="flex items-center gap-3">
                    <ApplicantAvatarCompact
                      user={{
                        id: selectedApplicant.id,
                        name: selectedApplicant.name,
                        avatarUrl: selectedApplicant.avatarUrl,
                        email: selectedApplicant.email || undefined
                      }}
                      size="sm"
                    />
                    <div>
                      <div className="font-medium text-sm">{selectedApplicant.name}</div>
                      {selectedApplicant.email && (
                        <div className="text-xs text-muted-foreground">{selectedApplicant.email}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Interviewer Selection */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Interviewers</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {availableInterviewers.map((interviewer) => (
                      <label
                        key={interviewer.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedInterviewerIds.has(interviewer.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedInterviewerIds);
                            if (e.target.checked) {
                              newSet.add(interviewer.id);
                            } else {
                              newSet.delete(interviewer.id);
                            }
                            setSelectedInterviewerIds(newSet);
                          }}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{interviewer.name}</div>
                          {interviewer.email && (
                            <div className="text-xs text-muted-foreground truncate">{interviewer.email}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Invite More Interviewers Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => {
                      if (positionValidation.positionId) {
                        const safeUrl = sanitizeUrl(`/positions/${positionValidation.positionId}`);
                        if (safeUrl) {
                          window.open(safeUrl, '_blank');
                        }
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Invite More Interviewers
                  </Button>
                </div>

                {/* Validation Warning */}
                {sendAppointment && selectedInterviewerIds.size === 0 && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Please select at least one interviewer
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Render QR Code Modal Content
  const renderQrCodeContent = () => {
    if (!qrData) return null;
    return (
      <div className="flex flex-col items-center py-6 space-y-6">
        {/* QR Code */}
        <div className="bg-white p-8 rounded-3xl border-2 border-gray-200">
          <div className="overflow-hidden rounded-2xl">
            <QRCodeCanvas
              id="evaluation-qr-code"
              value={qrData.url}
              size={240}
              level={"H"}
              imageSettings={appLogoUrl ? {
                src: appLogoUrl,
                x: undefined,
                y: undefined,
                height: 44,
                width: 44,
                excavate: true,
              } : undefined}
              style={{
                display: 'block',
                borderRadius: '12px'
              }}
            />
          </div>
        </div>

        {/* Applicant Name below QR */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Applicant</p>
          <h3 className="font-semibold text-lg">{qrData.name}</h3>
          {qrData.expiresAt && (() => {
            const expiresAt = new Date(qrData.expiresAt);
            const now = new Date();
            const diffMs = expiresAt.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
            let text = '';
            if (diffMs <= 0) text = 'Expired';
            else if (diffDays > 1) text = `Expires in ${diffDays} days`;
            else if (diffHours > 1) text = `Expires in ${diffHours} hours`;
            else text = 'Expires soon';

            return (
              <p className={cn("text-xs mt-1", diffMs <= 0 ? "text-destructive" : "text-muted-foreground")}>
                {text} ({expiresAt.toLocaleDateString()})
              </p>
            );
          })()}
        </div>

        {/* Buttons */}
        <div className="flex flex-col w-full gap-3 px-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              const canvas = document.getElementById('evaluation-qr-code') as HTMLCanvasElement;
              if (canvas) {
                // Create a new canvas with padding and border
                const newCanvas = document.createElement('canvas');
                const padding = 64; // 32px padding on each side
                const borderWidth = 4; // 2px border scaled
                const totalSize = 240 + (padding * 2) + (borderWidth * 2);

                newCanvas.width = totalSize;
                newCanvas.height = totalSize;
                const ctx = newCanvas.getContext('2d');

                if (ctx) {
                  // Fill white background
                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(0, 0, totalSize, totalSize);

                  // Draw border
                  ctx.strokeStyle = '#e5e7eb'; // gray-200
                  ctx.lineWidth = borderWidth;
                  ctx.strokeRect(borderWidth / 2, borderWidth / 2, totalSize - borderWidth, totalSize - borderWidth);

                  // Draw QR code in center
                  ctx.drawImage(canvas, padding + borderWidth, padding + borderWidth);

                  // Download
                  // Download using Blob to avoid data URL security flagging
                  newCanvas.toBlob((blob) => {
                    if (blob) {
                      const url = URL.createObjectURL(blob);
                      const safeUrl = sanitizeUrl(url);
                      if (safeUrl) {
                        const downloadLink = document.createElement("a");
                        downloadLink.href = safeUrl;
                        downloadLink.download = `evaluation-qr-${qrData.name.replace(/\s+/g, '_')}.png`;
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                        URL.revokeObjectURL(url);
                      }
                    }
                  }, 'image/png');
                }
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Download QR Code
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              // Close QR modal and open edit modal with existing data
              setQrModalOpen(false);
              if (qrApplicantId) {
                const applicant = applicants.find(c => c.id === qrApplicantId);
                if (applicant) {
                  setSelectedApplicant({
                    id: applicant.id,
                    name: applicant.name,
                    email: applicant.email,
                    avatarUrl: applicant.avatarUrl,
                    position: applicant.position,
                    positionId: applicant.position?.id
                  });
                  setIsEditEvalLinkModalOpen(true);
                }
              }
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Appointment
          </Button>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                window.location.href = qrData.url;
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Go to Link
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(qrData.url);
                toast.success('Link copied');
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

      </div>
    );
  };

  return (
    <>
      <div className={cn("container mx-auto py-4", isMobile ? "px-4 pb-24" : "px-6")}>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Interview</h1>
            <p className="text-muted-foreground">
              All interview sessions (active, expired, and passed)
            </p>
          </div>
          <Button
            onClick={handleOpenCreateModal}
            className={cn("items-center gap-2", isMobile ? "hidden" : "flex")}
          >
            <Plus className="h-4 w-4" />
            Create Evaluate Link
          </Button>
        </div>

        {applicants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No interview sessions
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Interview sessions will appear here.
            </p>
            <Button onClick={handleOpenCreateModal} variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Interview Session
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile Calendar View - Default to list, can toggle to calendar */}
            {isMobile ? (
              <MobileEvaluateCalendar
                applicants={applicants}
                selectedDate={selectedDate}
                onDateSelect={(date) => setSelectedDate(date)}
                onApplicantClick={handleApplicantClick}
                isMobile={true}
                defaultView="list"
              />
            ) : (
              /* Desktop Calendar View - Full page month calendar with side panel */
              <DesktopEvaluateCalendar
                applicants={applicants}
                selectedDate={selectedDate}
                onDateSelect={(date) => setSelectedDate(date)}
                onApplicantClick={handleApplicantClick}
                isMobile={false}
              />
            )}
          </>
        )}
      </div>

      {/* Create Evaluate Link Modal */}
      {isMobile ? (
        <Sheet open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>New Interview Session</SheetTitle>
            </SheetHeader>
            {renderCreateLinkContent()}
            <div className="mt-6 flex flex-col gap-2">
              <Button
                onClick={createEvaluationLink}
                disabled={!canCreateLink || isCreatingLink}
                className="w-full"
              >
                {isCreatingLink ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'New Interview Session'
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="w-full">
                Cancel
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New Interview Session</DialogTitle>
            </DialogHeader>
            {renderCreateLinkContent()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={createEvaluationLink}
                disabled={!canCreateLink || isCreatingLink}
              >
                {isCreatingLink ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'New Interview Session'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Evaluate Link Modal - Using new unified component */}
      {selectedApplicant && (
        <CreateEvaluateLinkModal
          isOpen={showCreateLinkModal}
          onOpenChange={(open) => {
            setShowCreateLinkModal(open);
            if (!open) {
              setSelectedApplicant(null);
            }
          }}
          applicant={{
            id: selectedApplicant.id,
            name: selectedApplicant.name,
            email: selectedApplicant.email,
            avatarUrl: selectedApplicant.avatarUrl,
            positionId: selectedApplicant.positionId,
            position: selectedApplicant.position,
          }}
          onSuccess={(linkData) => {
            fetchApplicantsWithEvaluationLinks();
            setShowCreateLinkModal(false);
            setSelectedApplicant(null);
          }}
        />
      )}

      {/* QR Code Modal */}
      {isMobile ? (
        <Sheet open={qrModalOpen} onOpenChange={setQrModalOpen}>
          <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl" forceZIndex={5005} hideCloseButton>
            <SheetHeader>
              <div className="relative flex items-center justify-center py-1">
                <SheetTitle className="text-center">Evaluation Link QR Code</SheetTitle>
                <SheetClose className="absolute right-0 top-1/2 -translate-y-1/2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </SheetClose>
              </div>
            </SheetHeader>
            {renderQrCodeContent()}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">Evaluation Link QR Code</DialogTitle>
            </DialogHeader>
            {renderQrCodeContent()}
          </DialogContent>
        </Dialog>
      )}

      {/* Mobile Floating Action Button */}
      {isMobile && (
        <Button
          onClick={handleOpenCreateModal}
          className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg z-50 p-0"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Edit Evaluation Link Modal */}
      {selectedApplicant && (
        <CreateEvaluateLinkModal
          isOpen={isEditEvalLinkModalOpen}
          onOpenChange={(open) => {
            setIsEditEvalLinkModalOpen(open);
            if (!open) {
              setSelectedApplicant(null);
              fetchApplicantsWithEvaluationLinks();
            }
          }}
          applicant={{
            id: selectedApplicant.id,
            name: selectedApplicant.name,
            email: selectedApplicant.email || null,
            avatarUrl: selectedApplicant.avatarUrl || null,
            position: selectedApplicant.position || null
          }}
          editMode={true}
        />
      )}
    </>
  );
}
