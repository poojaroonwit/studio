"use client";

import * as React from "react";

import { DesktopCalendarGrid } from "./evaluate-calendar-desktop-grid";
import { DesktopCalendarHeader } from "./evaluate-calendar-desktop-header";
import { DesktopSelectedDatePanel } from "./evaluate-calendar-desktop-panel";
import type { EvaluateCalendarProps } from "./evaluate-calendar-types";
import {
  getApplicantsForDate,
  getDaysInMonth,
  getFirstDayOfMonth,
  getRemindersForDate,
} from "./evaluate-calendar-utils";

export function DesktopEvaluateCalendar({
  applicants,
  reminders = [],
  selectedDate,
  onDateSelect,
  onApplicantClick,
}: EvaluateCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const monthDays = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const applicantsForSelectedDate = getApplicantsForDate(applicants, selectedDate);
  const remindersForSelectedDate = getRemindersForDate(reminders, selectedDate);

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onDateSelect(today);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-180px)]">
      <div className="flex-1 flex flex-col min-w-0">
        <DesktopCalendarHeader
          currentMonth={currentMonth}
          onToday={goToToday}
          onPreviousMonth={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
          onNextMonth={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
        />
        <DesktopCalendarGrid
          applicants={applicants}
          reminders={reminders}
          monthDays={monthDays}
          firstDay={firstDay}
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
          onApplicantClick={onApplicantClick}
        />
      </div>
      <DesktopSelectedDatePanel
        selectedDate={selectedDate}
        applicants={applicantsForSelectedDate}
        reminders={remindersForSelectedDate}
        onApplicantClick={onApplicantClick}
      />
    </div>
  );
}
