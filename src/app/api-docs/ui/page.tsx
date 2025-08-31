'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsUIPage() {
  const [swaggerSpec, setSwaggerSpec] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
        
        const spec = await response.json();
        setSwaggerSpec(spec);
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
    <div style={{ 
      height: '100%', 
      width: '100%',
      overflow: 'auto'
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '24px', fontWeight: '600' }}>API Documentation</h1>
        <p style={{ margin: '0', color: '#6b7280' }}>
          Interactive API documentation for the Studio recruitment management system
        </p>
      </div>
      <div style={{ height: 'calc(100vh - 120px)' }}>
        <SwaggerUI 
          spec={swaggerSpec}
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
  );
} 