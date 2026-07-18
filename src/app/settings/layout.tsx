import type { Metadata } from 'next';
import { SettingsClientLayout } from './SettingsClientLayout';

export const metadata: Metadata = {
  title: 'Settings | HRI',
  description: 'Manage system configuration, preferences, users, permissions, and operational settings.',
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SettingsClientLayout>{children}</SettingsClientLayout>;
}
