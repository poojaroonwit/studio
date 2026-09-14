"use client";

import React from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageStatusState } from '@/components/ui/PageStatusState';

interface SettingsPageErrorBoundaryProps {
  children: React.ReactNode;
  fallbackDescription?: string;
}

export class SettingsPageErrorBoundary extends React.Component<
  SettingsPageErrorBoundaryProps,
  { hasError: boolean; error?: Error }
> {
  constructor(props: SettingsPageErrorBoundaryProps) {
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
      return (
        <SettingsPageErrorState
          description={
            this.props.fallbackDescription
            ?? 'There was an error loading the settings page. Please try refreshing the page.'
          }
        />
      );
    }

    return this.props.children;
  }
}

function SettingsPageErrorState({ description }: { description: string }) {
  return (
    <PageStatusState
      className="min-h-full"
      role="alert"
      icon={AlertTriangle}
      title="Something went wrong"
      description={description}
      action={(
        <Button type="button" onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      )}
    />
  );
}
