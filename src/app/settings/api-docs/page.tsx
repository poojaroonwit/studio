'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ApiDocsPage() {
  const [swaggerSpec, setSwaggerSpec] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [availableTags, setAvailableTags] = useState<Array<{name: string, description: string}>>([]);

  useEffect(() => {
    const fetchSwaggerSpec = async () => {
      try {
        const [serversResponse, specResponse] = await Promise.all([
          fetch("/api-docs/servers").then(res => res.json()),
          fetch("/api-docs").then(res => res.json())
        ]);
        
        setSwaggerSpec({ servers: serversResponse, spec: specResponse });
        
        // Extract available tags from the spec
        if (specResponse.tags && Array.isArray(specResponse.tags)) {
          setAvailableTags(specResponse.tags);
        }
      } catch (err) {
        console.error('Failed to fetch Swagger spec:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
      }
    };

    fetchSwaggerSpec();
  }, []);

  // Function to filter the spec based on selected tag
  const getFilteredSpec = () => {
    if (!swaggerSpec || selectedTag === 'all') {
      return swaggerSpec?.spec;
    }

    const filteredSpec = { ...swaggerSpec.spec };
    
    // Filter paths based on selected tag
    const filteredPaths: any = {};
    Object.entries(filteredSpec.paths || {}).forEach(([path, pathMethods]: [string, any]) => {
      const filteredMethods: any = {};
      Object.entries(pathMethods).forEach(([method, methodData]: [string, any]) => {
        if (methodData.tags && methodData.tags.includes(selectedTag)) {
          filteredMethods[method] = methodData;
        }
      });
      
      // Only include the path if it has at least one method with the selected tag
      if (Object.keys(filteredMethods).length > 0) {
        filteredPaths[path] = filteredMethods;
      }
    });
    
    filteredSpec.paths = filteredPaths;
    return filteredSpec;
  };

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
         
         /* Tag filter dropdown styling */
         .tag-filter-container {
           position: relative;
         }
         
         .tag-filter-container [data-radix-popper-content-wrapper] {
           z-index: 50 !important;
         }
         
         /* Ensure tag filter dropdown uses theme colors */
         .tag-filter-container .select-trigger {
           background: hsl(var(--background)) !important;
           color: hsl(var(--foreground)) !important;
           border-color: hsl(var(--input)) !important;
         }
         
         .tag-filter-container .select-trigger:hover {
           background: hsl(var(--accent)) !important;
           color: hsl(var(--accent-foreground)) !important;
         }
         
         .tag-filter-container .select-trigger:focus {
           border-color: hsl(var(--ring)) !important;
           box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2) !important;
         }
         
         .tag-filter-container .select-content {
           background: hsl(var(--popover)) !important;
           border-color: hsl(var(--border)) !important;
         }
         
         .tag-filter-container .select-item {
           color: hsl(var(--popover-foreground)) !important;
         }
         
         .tag-filter-container .select-item:hover {
           background: hsl(var(--accent)) !important;
           color: hsl(var(--accent-foreground)) !important;
         }
         
         .tag-filter-container .select-item[data-state="checked"] {
           background: hsl(var(--primary)) !important;
           color: hsl(var(--primary-foreground)) !important;
         }
       `}</style>
       <div style={{ 
         height: '100%', 
         width: '100%',
         overflow: 'auto'
       }}>
         <div style={{ padding: '20px', borderBottom: '1px solid hsl(var(--border))' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
             <div>
               <h1 style={{ margin: '0 0 10px 0', fontSize: '24px', fontWeight: '600', color: 'hsl(var(--foreground))' }}>API Documentation</h1>
               <p style={{ margin: '0', color: 'hsl(var(--muted-foreground))' }}>
                 Interactive API documentation for the Studio recruitment management system
               </p>
             </div>
             {availableTags.length > 0 && (
               <div className="tag-filter-container" style={{ minWidth: '250px', marginLeft: '20px' }}>
                 <label style={{ 
                   display: 'block', 
                   marginBottom: '8px', 
                   fontSize: '14px', 
                   fontWeight: '500', 
                   color: 'hsl(var(--foreground))' 
                 }}>
                   Filter by Tag
                 </label>
                 <Select value={selectedTag} onValueChange={setSelectedTag}>
                   <SelectTrigger className="w-full select-trigger">
                     <SelectValue placeholder="Select a tag to filter" />
                   </SelectTrigger>
                   <SelectContent className="select-content">
                     <SelectItem value="all" className="select-item">All Endpoints</SelectItem>
                     {availableTags.map((tag) => (
                       <SelectItem key={tag.name} value={tag.name} className="select-item">
                         {tag.name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
             )}
           </div>
         </div>
        <div style={{ height: 'calc(100vh - 120px)' }}>
          <SwaggerUI 
            spec={getFilteredSpec()}
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
