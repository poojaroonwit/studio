'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  const [swaggerSpec, setSwaggerSpec] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSwaggerSpec = async () => {
      try {
        const [serversResponse, specResponse] = await Promise.all([
          fetch("/api-docs/servers").then(res => res.json()),
          fetch("/api-docs").then(res => res.json())
        ]);
        
        setSwaggerSpec({ servers: serversResponse, spec: specResponse });
      } catch (err) {
        console.error('Failed to fetch Swagger spec:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
      }
    };

    fetchSwaggerSpec();
  }, []);

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>API Documentation Error</h2>
        <p>Failed to load API documentation: {error}</p>
        <p>Please try refreshing the page or contact support if the issue persists.</p>
      </div>
    );
  }

  if (!swaggerSpec) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Loading API Documentation...</h2>
        <p>Please wait while we load the API documentation.</p>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        /* SwaggerUI Theme Overrides */
        .swagger-ui {
          font-family: var(--font-family-primary) !important;
        }
        
        /* Server selection dropdown theming */
        .swagger-ui .servers {
          background: hsl(var(--card)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: var(--radius) !important;
        }
        
        .swagger-ui .servers .servers-title {
          color: hsl(var(--foreground)) !important;
        }
        
        .swagger-ui .servers .servers-title label {
          color: hsl(var(--foreground)) !important;
        }
        
        .swagger-ui .servers select {
          background: hsl(var(--popover)) !important;
          color: hsl(var(--popover-foreground)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: var(--radius) !important;
        }
        
        .swagger-ui .servers select:focus {
          border-color: hsl(var(--ring)) !important;
          box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2) !important;
        }
        
        /* General SwaggerUI theming */
        .swagger-ui .topbar {
          background: hsl(var(--card)) !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
        }
        
        .swagger-ui .topbar .download-url-wrapper input {
          background: hsl(var(--popover)) !important;
          color: hsl(var(--popover-foreground)) !important;
          border: 1px solid hsl(var(--border)) !important;
        }
        
        .swagger-ui .info {
          background: hsl(var(--card)) !important;
          color: hsl(var(--card-foreground)) !important;
        }
        
        .swagger-ui .info .title {
          color: hsl(var(--foreground)) !important;
        }
        
        .swagger-ui .info .description {
          color: hsl(var(--muted-foreground)) !important;
        }
        
        .swagger-ui .scheme-container {
          background: hsl(var(--card)) !important;
          border: 1px solid hsl(var(--border)) !important;
        }
        
        .swagger-ui .auth-container {
          background: hsl(var(--card)) !important;
          border: 1px solid hsl(var(--border)) !important;
        }
        
        .swagger-ui .auth-container input {
          background: hsl(var(--popover)) !important;
          color: hsl(var(--popover-foreground)) !important;
          border: 1px solid hsl(var(--border)) !important;
        }
        
        .swagger-ui .opblock {
          background: hsl(var(--card)) !important;
          border: 1px solid hsl(var(--border)) !important;
        }
        
        .swagger-ui .opblock .opblock-summary {
          background: hsl(var(--card)) !important;
        }
        
        .swagger-ui .opblock .opblock-summary-description {
          color: hsl(var(--muted-foreground)) !important;
        }
        
        .swagger-ui .opblock .opblock-section-header {
          background: hsl(var(--muted)) !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
        }
        
        .swagger-ui .opblock .opblock-section-header h4 {
          color: hsl(var(--foreground)) !important;
        }
        
        .swagger-ui .opblock .opblock-section-header label {
          color: hsl(var(--foreground)) !important;
        }
        
        .swagger-ui .opblock .opblock-section-header input {
          background: hsl(var(--popover)) !important;
          color: hsl(var(--popover-foreground)) !important;
          border: 1px solid hsl(var(--border)) !important;
        }
        
        .swagger-ui .opblock .opblock-section-header select {
          background: hsl(var(--popover)) !important;
          color: hsl(var(--popover-foreground)) !important;
          border: 1px solid hsl(var(--border)) !important;
        }
        
        .swagger-ui .opblock .opblock-section-header textarea {
          background: hsl(var(--popover)) !important;
          color: hsl(var(--popover-foreground)) !important;
          border: 1px solid hsl(var(--border)) !important;
        }
        
        .swagger-ui .btn {
          background: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
          border: 1px solid hsl(var(--primary)) !important;
          border-radius: var(--radius) !important;
        }
        
        .swagger-ui .btn:hover {
          background: hsl(var(--primary) / 0.9) !important;
        }
        
        .swagger-ui .btn.execute {
          background: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
        }
        
        .swagger-ui .btn.execute:hover {
          background: hsl(var(--primary) / 0.9) !important;
        }
        
        .swagger-ui .response-col_status {
          color: hsl(var(--foreground)) !important;
        }
        
        .swagger-ui .response-col_links {
          color: hsl(var(--muted-foreground)) !important;
        }
        
        .swagger-ui .model {
          background: hsl(var(--muted)) !important;
          color: hsl(var(--muted-foreground)) !important;
        }
        
        .swagger-ui .model .property {
          color: hsl(var(--foreground)) !important;
        }
        
        .swagger-ui .model .property.primitive {
          color: hsl(var(--muted-foreground)) !important;
        }
        
        .swagger-ui .parameter__name {
          color: hsl(var(--foreground)) !important;
        }
        
        .swagger-ui .parameter__type {
          color: hsl(var(--muted-foreground)) !important;
        }
        
        .swagger-ui .parameter__deprecated {
          color: hsl(var(--destructive)) !important;
        }
        
        .swagger-ui .response-col_description__inner p {
          color: hsl(var(--foreground)) !important;
        }
        
        .swagger-ui .response-col_description__inner code {
          background: hsl(var(--muted)) !important;
          color: hsl(var(--muted-foreground)) !important;
        }
        
        .swagger-ui .highlight-code {
          background: hsl(var(--muted)) !important;
        }
        
        .swagger-ui .highlight-code .microlight {
          background: hsl(var(--muted)) !important;
          color: hsl(var(--muted-foreground)) !important;
        }
        
        /* Dark theme specific overrides */
        .dark .swagger-ui .servers {
          background: hsl(var(--card)) !important;
        }
        
        .dark .swagger-ui .servers select {
          background: hsl(var(--popover)) !important;
          color: hsl(var(--popover-foreground)) !important;
        }
        
        .dark .swagger-ui .topbar {
          background: hsl(var(--card)) !important;
        }
        
        .dark .swagger-ui .info {
          background: hsl(var(--card)) !important;
        }
        
        .dark .swagger-ui .opblock {
          background: hsl(var(--card)) !important;
        }
        
        .dark .swagger-ui .opblock .opblock-summary {
          background: hsl(var(--card)) !important;
        }
        
        .dark .swagger-ui .opblock .opblock-section-header {
          background: hsl(var(--muted)) !important;
        }
      `}</style>
      <div style={{ 
        height: '100%', 
        width: '100%',
        overflow: 'auto'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid hsl(var(--border))' }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '24px', fontWeight: '600', color: 'hsl(var(--foreground))' }}>API Documentation</h1>
          <p style={{ margin: '0', color: 'hsl(var(--muted-foreground))' }}>
            Interactive API documentation for the Studio recruitment management system
          </p>
        </div>
        <div style={{ height: 'calc(100vh - 120px)' }}>
          <SwaggerUI 
            spec={swaggerSpec.spec}
            docExpansion="list"
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={1}
            displayOperationId={false}
            displayRequestDuration={true}
            filter={true}
            showExtensions={true}
            showCommonExtensions={true}
            tryItOutEnabled={true}
            requestInterceptor={(request: any) => {
              // Add any request interceptors here if needed
              return request;
            }}
            responseInterceptor={(response: any) => {
              // Add any response interceptors here if needed
              return response;
            }}
          />
        </div>
      </div>
    </>
  );
}
