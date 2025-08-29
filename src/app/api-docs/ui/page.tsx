'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
// CSS will be loaded dynamically

// Import the R polyfill to ensure it's available for swagger-ui-react
import '@/lib/ramda-polyfill';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsUIPage() {
  const [swaggerSpec, setSwaggerSpec] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure R is available before loading Swagger UI
    const ensureR = async () => {
      try {
        // Import the polyfill again to make sure it's loaded
        await import('@/lib/ramda-polyfill');
        
        // Test if R is working
        if (typeof (window as any).R === 'undefined' || typeof (window as any).R.filter !== 'function') {
          console.warn('R object not available, attempting to fix...');
          // Force reload the polyfill
          await import('@/lib/ramda-polyfill');
        }
      } catch (err) {
        console.error('Failed to ensure R polyfill:', err);
      }
    };

    // Load Swagger UI CSS dynamically
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css';
    document.head.appendChild(link);

    const fetchSwaggerSpec = async () => {
      try {
        // Ensure R is available before fetching
        await ensureR();
        
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

    // Cleanup function to remove the CSS link
    return () => {
      const existingLink = document.querySelector('link[href*="swagger-ui.css"]');
      if (existingLink) {
        existingLink.remove();
      }
    };
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
      <style jsx global>{`
        /* Hide server selection dropdown since we only have one server */
        .servers, .servers-title, .servers-container {
          display: none !important;
        }
      `}</style>
      <SwaggerUI 
        spec={swaggerSpec}
        docExpansion="list"
        defaultModelsExpandDepth={2}
        defaultModelExpandDepth={2}
        tryItOutEnabled={true}
        requestInterceptor={(request) => {
          // Add any request interceptors if needed
          return request;
        }}
        responseInterceptor={(response) => {
          // Add any response interceptors if needed
          return response;
        }}
      />
    </div>
  );
} 