import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Calendar | FitScan',
  description: 'Review upcoming evaluation sessions, reminders, and interview scheduling activity.',
};

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
