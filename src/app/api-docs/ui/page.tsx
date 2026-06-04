'use client';

import { useEffect, useState } from 'react';

interface ApiEndpoint {
  path: string;
  method: string;
  summary: string;
  description?: string;
  tags: string[];
  parameters?: any[];
  requestBody?: any;
  responses?: any;
}

interface SwaggerSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, Record<string, any>>;
  components?: any;
}

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

  const toggleEndpoint = (path: string, method: string) => {
    const key = `${method.toUpperCase()}-${path}`;
    const newExpanded = new Set(expandedEndpoints);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedEndpoints(newExpanded);
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      get: 'bg-green-100 text-green-800 border-green-200',
      post: 'bg-blue-100 text-blue-800 border-blue-200',
      put: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      delete: 'bg-red-100 text-red-800 border-red-200',
      patch: 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return colors[method.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getAllTags = () => {
    if (!swaggerSpec?.paths) return [];
    const tags = new Set<string>();
    Object.values(swaggerSpec.paths).forEach((pathMethods: any) => {
      Object.values(pathMethods).forEach((method: any) => {
        if (method.tags) {
          method.tags.forEach((tag: string) => tags.add(tag));
        }
      });
    });
    return Array.from(tags).sort();
  };

  const getEndpointsByTag = (tag: string) => {
    if (!swaggerSpec?.paths) return [];
    const endpoints: ApiEndpoint[] = [];
    
    Object.entries(swaggerSpec.paths).forEach(([path, pathMethods]) => {
      Object.entries(pathMethods).forEach(([method, methodData]: [string, any]) => {
        if (tag === 'all' || (methodData.tags && methodData.tags.includes(tag))) {
          endpoints.push({
            path,
            method,
            summary: methodData.summary || '',
            description: methodData.description,
            tags: methodData.tags || [],
            parameters: methodData.parameters,
            requestBody: methodData.requestBody,
            responses: methodData.responses,
          });
        }
      });
    });
    
    return endpoints.sort((a, b) => a.path.localeCompare(b.path));
  };

  const renderParameters = (parameters: any[]) => {
    if (!parameters || parameters.length === 0) return null;
    
    return (
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Parameters:</h4>
        <div className="space-y-2">
          {parameters.map((param, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{param.name}</span>
                <span className="text-xs text-gray-500">({param.in})</span>
                {param.required && (
                  <span className="text-xs bg-red-100 text-red-800 px-1 rounded">Required</span>
                )}
              </div>
              {param.description && (
                <p className="text-sm text-gray-600 mt-1">{param.description}</p>
              )}
              {param.schema && (
                <p className="text-xs text-gray-500 mt-1">Type: {param.schema.type}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderResponses = (responses: any) => {
    if (!responses) return null;
    
    return (
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Responses:</h4>
        <div className="space-y-2">
          {Object.entries(responses).map(([code, response]: [string, any]) => (
            <div key={code} className="bg-gray-50 p-3 rounded">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium px-2 py-1 rounded ${
                  code.startsWith('2') ? 'bg-green-100 text-green-800' :
                  code.startsWith('4') ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {code}
                </span>
                <span className="text-sm text-gray-600">{response.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">API Documentation Error</h2>
          <p className="text-red-700">Failed to load API documentation: {error}</p>
          <p className="text-red-600 text-sm mt-2">Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      </div>
    );
  }

  if (!swaggerSpec) {
    return (
      <div className="p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Loading API Documentation...</h2>
          <p className="text-blue-700">Please wait while we load the API documentation.</p>
        </div>
      </div>
    );
  }

  const tags = getAllTags();
  const endpoints = getEndpointsByTag(selectedTag);

  return (
    <div className="min-bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {swaggerSpec.info.title} API Documentation
          </h1>
          <p className="text-gray-600">{swaggerSpec.info.description}</p>
          <p className="text-sm text-gray-500 mt-1">Version: {swaggerSpec.info.version}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">API Categories</h3>
              <div className="space-y-2">
                <button type="button"
                  onClick={() => setSelectedTag('all')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedTag === 'all'
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  All Endpoints
                </button>
                {tags.map((tag) => (
                  <button type="button"
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedTag === tag
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedTag === 'all' ? 'All Endpoints' : selectedTag}
                </h2>
                <p className="text-gray-600 mt-1">
                  {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} found
                </p>
              </div>

              <div className="divide-y divide-gray-200">
                {endpoints.map((endpoint) => {
                  const key = `${endpoint.method.toUpperCase()}-${endpoint.path}`;
                  const isExpanded = expandedEndpoints.has(key);
                  
                  return (
                    <div key={key} className="p-6">
                      <button type="button"
                        onClick={() => toggleEndpoint(endpoint.path, endpoint.method)}
                        className="w-full text-left flex items-center justify-between hover:bg-gray-50 p-2 rounded-md transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getMethodColor(endpoint.method)}`}>
                            {endpoint.method.toUpperCase()}
                          </span>
                          <span className="font-mono text-sm text-gray-900">{endpoint.path}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{endpoint.summary}</span>
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-4 pl-4 border-l-2 border-gray-200">
                          {endpoint.description && (
                            <p className="text-sm text-gray-600 mb-4">{endpoint.description}</p>
                          )}
                          
                          {endpoint.parameters && renderParameters(endpoint.parameters)}
                          {endpoint.requestBody && (
                            <div className="mt-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Request Body:</h4>
                              <div className="bg-gray-50 p-3 rounded">
                                <pre className="text-xs text-gray-700 overflow-x-auto">
                                  {JSON.stringify(endpoint.requestBody, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                          {endpoint.responses && renderResponses(endpoint.responses)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 