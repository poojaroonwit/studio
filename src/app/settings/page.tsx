"use client";

import { useRouter } from 'next/navigation';

import './settings.css';

import { SettingsPageErrorBoundary } from './SettingsPageErrorBoundary';
import { SettingsPageView } from './SettingsPageView';
import { useSettingsPage } from './use-settings-page';

function SettingsPageContent() {
  const router = useRouter();
  const page = useSettingsPage();

  return (
    <SettingsPageView
      accessibleItems={page.accessibleItems}
      isLoading={page.isLoading}
      onOpenItem={(href) => router.push(href)}
      showLogoOnly={page.showLogoOnly}
    />
  );
}

export default function SettingsPage() {
  return (
    <SettingsPageErrorBoundary>
      <SettingsPageContent />
    </SettingsPageErrorBoundary>
  );
}
