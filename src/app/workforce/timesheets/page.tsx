import { Suspense } from 'react';

import { ShiftAttendanceWorkspace } from '@/components/shift/ShiftAttendanceWorkspace';
import { LoadingState } from '@/components/shift/ShiftShared';

export const metadata = { title: 'Timesheets | hrive' };

export default function Page() {
  return (
    <Suspense fallback={<main className="p-4"><LoadingState /></main>}>
      <ShiftAttendanceWorkspace initialView="timesheet" requestMode="attendance" />
    </Suspense>
  );
}
