'use client';

import { useEffect, useState } from 'react';
import {
  AppPage,
  AppPageContainer,
  AppPageHeader,
  AppPageTitle,
} from '@/components/layout/AppPage';
import { ApiDocsEndpointList } from './ApiDocsEndpointList';
import { ApiDocsSidebar } from './ApiDocsSidebar';
import { ApiDocsErrorPanel, ApiDocsLoadingPanel } from './ApiDocsStatusPanels';
import type { SwaggerSpec } from './api-docs-types';
import {
  getApiDocsEndpointKey,
  getApiDocsEndpointsByTag,
  getApiDocsTags,
} from './api-docs-utils';
import { readJsonOrFallback } from '@/lib/response-json';

export default function ApiDocsUIPage() {
  const [swaggerSpec, setSwaggerSpec] = useState<SwaggerSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchSwaggerSpec = async () => {
      try {
        const response = await fetch('/api-docs', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        setSwaggerSpec(await readJsonOrFallback<SwaggerSpec | null>(response, null));
      } catch (err) {
        console.error('Failed to fetch Swagger spec:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
      }
    };

    void fetchSwaggerSpec();
  }, []);

  const toggleEndpoint = (path: string, method: string) => {
    const key = getApiDocsEndpointKey(path, method);
    setExpandedEndpoints((currentEndpoints) => {
      const nextEndpoints = new Set(currentEndpoints);
      if (nextEndpoints.has(key)) {
        nextEndpoints.delete(key);
      } else {
        nextEndpoints.add(key);
      }
      return nextEndpoints;
    });
  };

  if (error) {
    return <ApiDocsErrorPanel error={error} />;
  }

  if (!swaggerSpec) {
    return <ApiDocsLoadingPanel />;
  }

  const tags = getApiDocsTags(swaggerSpec.paths);
  const endpoints = getApiDocsEndpointsByTag(swaggerSpec, selectedTag);

  return (
    <AppPage>
      <AppPageHeader>
        <AppPageTitle className="mb-2">
          {swaggerSpec.info.title} API Documentation
        </AppPageTitle>
        <p className="text-muted-foreground">{swaggerSpec.info.description}</p>
        <p className="mt-1 text-sm text-muted-foreground">Version: {swaggerSpec.info.version}</p>
      </AppPageHeader>

      <AppPageContainer className="py-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <ApiDocsSidebar
            selectedTag={selectedTag}
            tags={tags}
            onSelectTag={setSelectedTag}
          />
          <ApiDocsEndpointList
            endpoints={endpoints}
            expandedEndpoints={expandedEndpoints}
            selectedTag={selectedTag}
            onToggleEndpoint={toggleEndpoint}
          />
        </div>
      </AppPageContainer>
    </AppPage>
  );
}
