'use client';

import { useEffect, useState } from 'react';

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
    <div style={{ 
      height: '100%', 
      width: '100%',
      overflow: 'auto',
      padding: '20px'
    }}>
      <h1>API Documentation</h1>
      <p>API specification loaded successfully. The interactive Swagger UI has been temporarily disabled.</p>
      <details>
        <summary>View Raw API Specification (JSON)</summary>
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '5px',
          overflow: 'auto',
          maxHeight: '500px'
        }}>
          {JSON.stringify(swaggerSpec, null, 2)}
        </pre>
      </details>
    </div>
  );
}
