import type { ApiEndpoint, OpenApiPaths, SwaggerSpec } from './api-docs-types';

const METHOD_COLOR_CLASSES: Record<string, string> = {
  get: 'bg-green-100 text-green-800 border-green-200',
  post: 'bg-blue-100 text-blue-800 border-blue-200',
  put: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  delete: 'bg-red-100 text-red-800 border-red-200',
  patch: 'bg-purple-100 text-purple-800 border-purple-200',
};

export function getApiDocsEndpointKey(path: string, method: string) {
  return `${method.toUpperCase()}-${path}`;
}

export function getApiDocsMethodColor(method: string) {
  return METHOD_COLOR_CLASSES[method.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
}

export function getApiDocsResponseCodeClassName(code: string) {
  if (code.startsWith('2')) return 'bg-green-100 text-green-800';
  if (code.startsWith('4')) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

export function getApiDocsTags(paths?: OpenApiPaths) {
  if (!paths) return [];

  const tags = new Set<string>();
  Object.values(paths).forEach((pathMethods) => {
    Object.values(pathMethods).forEach((operation) => {
      operation.tags?.forEach((tag) => tags.add(tag));
    });
  });

  return Array.from(tags).sort();
}

export function getApiDocsEndpointsByTag(spec: SwaggerSpec | null, tag: string): ApiEndpoint[] {
  if (!spec?.paths) return [];

  return Object.entries(spec.paths)
    .flatMap(([path, pathMethods]) => (
      Object.entries(pathMethods)
        .filter(([, operation]) => tag === 'all' || operation.tags?.includes(tag))
        .map(([method, operation]) => ({
          path,
          method,
          summary: operation.summary ?? '',
          description: operation.description,
          tags: operation.tags ?? [],
          parameters: operation.parameters,
          requestBody: operation.requestBody,
          responses: operation.responses,
        }))
    ))
    .sort((endpointA, endpointB) => endpointA.path.localeCompare(endpointB.path));
}
