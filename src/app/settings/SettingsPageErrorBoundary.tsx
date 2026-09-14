"use client";

import React from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageStatusState } from '@/components/ui/PageStatusState';

export class SettingsPageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Settings page error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <SettingsPageErrorState />;
    }

    return this.props.children;
  }
}

function SettingsPageErrorState() {
  return (
    <PageStatusState
      action={(
        <Button onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      )}
      description="There was an error loading the settings page. Please try refreshing the page."
      icon={AlertTriangle}
      role="alert"
      title="Something went wrong"
    />
  );
}
