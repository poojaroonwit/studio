"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ListBulletIcon as List, ClockIcon as Clock, MapPinIcon as MapPin, UsersIcon as Users, ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CandidateAvatarCompact } from "@/components/ui/candidate-avatar";
import { formatCandidateNameWithLang } from "@/lib/candidateUtils";

export interface EvaluationCandidate {
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

export interface EvaluateCalendarProps {
  candidates: EvaluationCandidate[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onCandidateClick: (candidateId: string) => void;
  isMobile?: boolean;
}

// Helper to get days in a month
function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

// Helper to get the first day of the week for a month
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// Helper to get candidates for a specific date
function getCandidatesForDate(candidates: EvaluationCandidate[], date: Date): EvaluationCandidate[] {
  const dateStr = date.toDateString();
  return candidates.filter(c => {
    const expireDate = new Date(c.evaluationLink.expiresAt).toDateString();
    const interviewDate = c.evaluationLink.interviewDateTime
      ? new Date(c.evaluationLink.interviewDateTime).toDateString()
      : null;
    return expireDate === dateStr || interviewDate === dateStr;
  });
}

// Day cell component with candidate badges
function DayCell({
  date,
  isSelected,
  isToday,
  isOutsideMonth,
  candidates,
  onClick,
  onCandidateClick,
  compact = false,
}: {
  date: Date;
  isSelected: boolean;
  isToday: boolean;
  isOutsideMonth: boolean;
  candidates: EvaluationCandidate[];
  onClick: () => void;
  onCandidateClick?: (candidateId: string) => void;
  compact?: boolean;
}) {
  const hasEvents = candidates.length > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-start transition-all",
        compact ? "h-10 w-full p-0.5" : "min-h-[80px] w-full p-1 border-b border-r border-border/30",
        isSelected && "bg-primary/10 ring-2 ring-primary ring-inset",
        isToday && !isSelected && "bg-accent/50",
        isOutsideMonth && "opacity-40",
        "hover:bg-accent/30"
      )}
    >
      <span
        className={cn(
          "text-xs font-medium rounded-full flex items-center justify-center",
          compact ? "h-6 w-6" : "h-6 w-6 mb-1",
          isSelected && "bg-primary text-primary-foreground",
          isToday && !isSelected && "bg-accent text-accent-foreground font-bold"
        )}
      >
        {date.getDate()}
      </span>

      {/* Candidate badges */}
      {hasEvents && !compact && (
        <div className="flex flex-col gap-0.5 w-full overflow-hidden">
          {candidates.slice(0, 3).map((candidate, idx) => {
            const nameInfo = formatCandidateNameWithLang({ name: candidate.name } as any);
            const now = new Date();
            const isExpired = new Date(candidate.evaluationLink.expiresAt) < now;
            const isRevoked = candidate.evaluationLink.revokedAt !== null && candidate.evaluationLink.revokedAt !== undefined;
            const interviewDateTime = candidate.evaluationLink.interviewDateTime
              ? new Date(candidate.evaluationLink.interviewDateTime)
              : new Date(candidate.evaluationLink.expiresAt);
            const isPast = interviewDateTime < now;
            const isInactive = isExpired || isRevoked || isPast;

            return (
              <div
                key={`${candidate.id}-${idx}`}
                className={cn(
                  "flex items-center gap-1 rounded px-1 py-0.5 text-[10px] truncate cursor-pointer",
                  isInactive
                    ? "bg-muted/50 opacity-60 hover:bg-muted/70"
                    : "bg-primary/20 hover:bg-primary/30"
                )}
                title={candidate.name}
                onClick={(e) => {
                  e.stopPropagation();
                  onCandidateClick?.(candidate.id);
                }}
              >
                <CandidateAvatarCompact
                  user={{
                    id: candidate.id,
                    name: candidate.name,
                    avatarUrl: candidate.avatarUrl,
                    email: candidate.email || undefined,
                  }}
                  size="sm"
                />
                <span className={cn("truncate", nameInfo.fontClass)} lang={nameInfo.lang}>
                  {candidate.name.split(' ')[0]}
                </span>
              </div>
            );
          })}
          {candidates.length > 3 && (
            <span className="text-[9px] text-muted-foreground text-center">
              +{candidates.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Compact badge indicator */}
      {hasEvents && compact && (
        <div className="flex gap-0.5 mt-0.5">
          {candidates.slice(0, 3).map((candidate, idx) => {
            const now = new Date();
            const isExpired = new Date(candidate.evaluationLink.expiresAt) < now;
            const isRevoked = candidate.evaluationLink.revokedAt !== null && candidate.evaluationLink.revokedAt !== undefined;
            const interviewDateTime = candidate.evaluationLink.interviewDateTime
              ? new Date(candidate.evaluationLink.interviewDateTime)
              : new Date(candidate.evaluationLink.expiresAt);
            const isPast = interviewDateTime < now;
            const isInactive = isExpired || isRevoked || isPast;

            return (
              <div
                key={idx}
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isInactive ? "bg-muted-foreground opacity-50" : "bg-primary"
                )}
              />
            );
          })}
          {candidates.length > 3 && (
            <span className={cn(
              "text-[8px]",
              candidates.some(c => {
                const now = new Date();
                const isExpired = new Date(c.evaluationLink.expiresAt) < now;
                const isRevoked = c.evaluationLink.revokedAt !== null && c.evaluationLink.revokedAt !== undefined;
                const interviewDateTime = c.evaluationLink.interviewDateTime
                  ? new Date(c.evaluationLink.interviewDateTime)
                  : new Date(c.evaluationLink.expiresAt);
                const isPast = interviewDateTime < now;
                return isExpired || isRevoked || isPast;
              }) ? "text-muted-foreground opacity-50" : "text-primary"
            )}>
              +{candidates.length - 3}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// Candidate list item component
function CandidateListItem({
  candidate,
  onClick,
}: {
  candidate: EvaluationCandidate;
  onClick: () => void;
}) {
  const nameInfo = formatCandidateNameWithLang({ name: candidate.name } as any);
  const interviewDateTime = candidate.evaluationLink.interviewDateTime
    ? new Date(candidate.evaluationLink.interviewDateTime)
    : new Date(candidate.evaluationLink.expiresAt);
  const interviewTime = interviewDateTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Check if link is expired or revoked
  const now = new Date();
  const isExpired = new Date(candidate.evaluationLink.expiresAt) < now;
  const isRevoked = candidate.evaluationLink.revokedAt !== null && candidate.evaluationLink.revokedAt !== undefined;

  // Check if interview date/time has passed
  const isPast = interviewDateTime < now;

  // Show in grey if expired, revoked, or interview has passed
  const isInactive = isExpired || isRevoked || isPast;

  return (
    <div
      className={cn(
        "rounded-lg p-3 cursor-pointer transition-colors",
        isInactive
          ? "bg-muted/50 opacity-60 hover:bg-muted/70"
          : "bg-secondary hover:bg-secondary/80"
      )}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Left: Time */}
        <div className="flex-shrink-0 w-14 text-center">
          <div className={cn(
            "flex items-center justify-center gap-1 text-sm font-semibold",
            isInactive ? "text-muted-foreground" : "text-primary"
          )}>
            <Clock className="h-3 w-3" />
            {interviewTime}
          </div>
          {isInactive && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Passed'}
            </div>
          )}
        </div>

        {/* Right: Candidate Info */}
        <div className="flex-1 min-w-0">
          {/* Candidate Name */}
          <div className="flex items-center gap-2 mb-1">
            <CandidateAvatarCompact
              user={{
                id: candidate.id,
                name: candidate.name,
                avatarUrl: candidate.avatarUrl,
                email: candidate.email || undefined,
              }}
              size="sm"
            />
            <h4 className={cn("font-semibold text-sm truncate", nameInfo.fontClass)} lang={nameInfo.lang}>
              {candidate.name}
            </h4>
          </div>

          {/* Position */}
          {candidate.position?.title && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
              <span className="font-medium">Position:</span>
              <span className="truncate">{candidate.position.title}</span>
            </div>
          )}

          {/* Location */}
          {candidate.evaluationLink.interviewLocation && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{candidate.evaluationLink.interviewLocation}</span>
            </div>
          )}

          {/* Interviewers */}
          {candidate.evaluationLink.interviewers && candidate.evaluationLink.interviewers.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span className="truncate">
                {candidate.evaluationLink.interviewers.map(i => i.name).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mobile Calendar with collapsible feature
export function MobileEvaluateCalendar({
  candidates,
  selectedDate,
  onDateSelect,
  onCandidateClick,
  defaultView = 'list',
}: EvaluateCalendarProps & { defaultView?: 'list' | 'calendar' }) {
  const [viewMode, setViewMode] = React.useState<'list' | 'calendar'>(defaultView);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const monthDays = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const candidatesForSelectedDate = getCandidatesForDate(candidates, selectedDate);

  // Navigate months
  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Get all candidates sorted by date/time
  const allCandidatesSorted = React.useMemo(() => {
    return [...candidates].sort((a, b) => {
      const dateA = a.evaluationLink.interviewDateTime || a.evaluationLink.expiresAt;
      const dateB = b.evaluationLink.interviewDateTime || b.evaluationLink.expiresAt;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  }, [candidates]);

  // Group candidates by date for list view
  const candidatesByDate = React.useMemo(() => {
    const grouped: Record<string, EvaluationCandidate[]> = {};
    allCandidatesSorted.forEach(candidate => {
      const dateStr = candidate.evaluationLink.interviewDateTime
        ? new Date(candidate.evaluationLink.interviewDateTime).toDateString()
        : new Date(candidate.evaluationLink.expiresAt).toDateString();
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(candidate);
    });
    return grouped;
  }, [allCandidatesSorted]);

  if (viewMode === 'list') {
    return (
      <div className="flex flex-col h-full">
        {/* View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Scheduled Evaluations</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="flex items-center gap-1"
          >
            <CalendarIcon className="h-4 w-4" />
            Calendar
          </Button>
        </div>

        {/* List View */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {Object.entries(candidatesByDate).map(([dateStr, dateCandidates]) => {
            const date = new Date(dateStr);
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <div key={dateStr}>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <h3 className={cn("font-medium text-sm", isToday && "text-primary")}>
                    {isToday ? 'Today' : date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    ({dateCandidates.length} candidate{dateCandidates.length > 1 ? 's' : ''})
                  </span>
                </div>
                <div className="space-y-2">
                  {dateCandidates.map(candidate => (
                    <CandidateListItem
                      key={candidate.id}
                      candidate={candidate}
                      onClick={() => onCandidateClick(candidate.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {Object.keys(candidatesByDate).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No scheduled evaluations</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* View Toggle */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewMode('list')}
          className="flex items-center gap-1"
        >
          <List className="h-4 w-4" />
          List
        </Button>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevMonth}>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[120px] text-center">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className={cn(
        "bg-card rounded-lg border overflow-hidden transition-all duration-300",
        isCollapsed ? "max-h-[180px]" : "max-h-[400px]"
      )}>
        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells for padding */}
          {Array.from({ length: firstDay }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-10 border-b border-r border-border/30 bg-muted/20" />
          ))}

          {/* Day cells */}
          {monthDays.map(date => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            const dateCandidates = getCandidatesForDate(candidates, date);

            return (
              <DayCell
                key={date.toISOString()}
                date={date}
                isSelected={isSelected}
                isToday={isToday}
                isOutsideMonth={false}
                candidates={dateCandidates}
                onClick={() => onDateSelect(date)}
                onCandidateClick={onCandidateClick}
                compact={isCollapsed}
              />
            );
          })}
        </div>
      </div>

      {/* Selected Date Header */}
      <div className="flex items-center gap-2 mt-4 mb-2">
        <CalendarIcon className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">
          {selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </h3>
        <span className="text-sm text-muted-foreground">
          ({candidatesForSelectedDate.length} candidate{candidatesForSelectedDate.length !== 1 ? 's' : ''})
        </span>
      </div>

      {/* Candidates for Selected Date */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {candidatesForSelectedDate.length > 0 ? (
          candidatesForSelectedDate.map(candidate => (
            <CandidateListItem
              key={candidate.id}
              candidate={candidate}
              onClick={() => onCandidateClick(candidate.id)}
            />
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No interviews scheduled for this date</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Desktop Calendar with full month view and side panel
export function DesktopEvaluateCalendar({
  candidates,
  selectedDate,
  onDateSelect,
  onCandidateClick,
}: EvaluateCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const monthDays = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const candidatesForSelectedDate = getCandidatesForDate(candidates, selectedDate);

  // Navigate months
  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onDateSelect(today);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-180px)]">
      {/* Main Calendar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRightIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 bg-card rounded-lg border overflow-hidden flex flex-col">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-3 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="flex-1 grid grid-cols-7 grid-rows-6 auto-rows-fr">
            {/* Empty cells for padding */}
            {Array.from({ length: firstDay }).map((_, idx) => (
              <div key={`empty-${idx}`} className="border-b border-r border-border/30 bg-muted/10 p-1" />
            ))}

            {/* Day cells */}
            {monthDays.map(date => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isToday = date.toDateString() === new Date().toDateString();
              const dateCandidates = getCandidatesForDate(candidates, date);

              return (
                <DayCell
                  key={date.toISOString()}
                  date={date}
                  isSelected={isSelected}
                  isToday={isToday}
                  isOutsideMonth={false}
                  candidates={dateCandidates}
                  onClick={() => onDateSelect(date)}
                  onCandidateClick={onCandidateClick}
                />
              );
            })}

            {/* Fill remaining cells */}
            {Array.from({ length: (42 - firstDay - monthDays.length) }).map((_, idx) => (
              <div key={`fill-${idx}`} className="border-b border-r border-border/30 bg-muted/10 p-1" />
            ))}
          </div>
        </div>
      </div>

      {/* Right Side Panel - Selected Date Details */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-card rounded-lg border overflow-hidden">
        {/* Panel Header */}
        <div className="p-4 border-b bg-muted/50">
          <div className="flex items-center gap-2 mb-1">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {candidatesForSelectedDate.length} evaluation{candidatesForSelectedDate.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>

        {/* Candidates List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {candidatesForSelectedDate.length > 0 ? (
            candidatesForSelectedDate.map(candidate => (
              <CandidateListItem
                key={candidate.id}
                candidate={candidate}
                onClick={() => onCandidateClick(candidate.id)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No interviews scheduled</p>
              <p className="text-xs mt-1">Select a date with events to see details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


