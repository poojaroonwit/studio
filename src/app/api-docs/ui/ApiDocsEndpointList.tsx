import type {
  ApiEndpoint,
  OpenApiParameter,
  OpenApiResponses,
} from './api-docs-types';
import {
  getApiDocsEndpointKey,
  getApiDocsMethodColor,
  getApiDocsResponseCodeClassName,
} from './api-docs-utils';

interface ApiDocsEndpointListProps {
  endpoints: ApiEndpoint[];
  expandedEndpoints: Set<string>;
  selectedTag: string;
  onToggleEndpoint: (path: string, method: string) => void;
}

export function ApiDocsEndpointList({
  endpoints,
  expandedEndpoints,
  onToggleEndpoint,
  selectedTag,
}: ApiDocsEndpointListProps) {
  return (
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
          {endpoints.map((endpoint) => (
            <ApiDocsEndpointRow
              key={getApiDocsEndpointKey(endpoint.path, endpoint.method)}
              endpoint={endpoint}
              expanded={expandedEndpoints.has(getApiDocsEndpointKey(endpoint.path, endpoint.method))}
              onToggle={() => onToggleEndpoint(endpoint.path, endpoint.method)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ApiDocsEndpointRow({
  endpoint,
  expanded,
  onToggle,
}: {
  endpoint: ApiEndpoint;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="p-6">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-center justify-between hover:bg-gray-50 p-2 rounded-md transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-medium border ${getApiDocsMethodColor(endpoint.method)}`}>
            {endpoint.method.toUpperCase()}
          </span>
          <span className="font-mono text-sm text-gray-900">{endpoint.path}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{endpoint.summary}</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && <ApiDocsEndpointDetails endpoint={endpoint} />}
    </div>
  );
}

function ApiDocsEndpointDetails({ endpoint }: { endpoint: ApiEndpoint }) {
  return (
    <div className="mt-4 pl-4 border-l-2 border-gray-200">
      {endpoint.description && (
        <p className="text-sm text-gray-600 mb-4">{endpoint.description}</p>
      )}

      {endpoint.parameters && <ApiDocsParameters parameters={endpoint.parameters} />}
      {endpoint.requestBody !== undefined && endpoint.requestBody !== null && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Request Body:</h4>
          <div className="bg-gray-50 p-3 rounded">
            <pre className="text-xs text-gray-700 overflow-x-auto">
              {JSON.stringify(endpoint.requestBody, null, 2)}
            </pre>
          </div>
        </div>
      )}
      {endpoint.responses && <ApiDocsResponses responses={endpoint.responses} />}
    </div>
  );
}

function ApiDocsParameters({ parameters }: { parameters: OpenApiParameter[] }) {
  if (parameters.length === 0) return null;

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
}

function ApiDocsResponses({ responses }: { responses: OpenApiResponses }) {
  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Responses:</h4>
      <div className="space-y-2">
        {Object.entries(responses).map(([code, response]) => (
          <div key={code} className="bg-gray-50 p-3 rounded">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium px-2 py-1 rounded ${getApiDocsResponseCodeClassName(code)}`}>
                {code}
              </span>
              <span className="text-sm text-gray-600">{response.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
