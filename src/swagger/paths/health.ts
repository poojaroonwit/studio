// Health check API paths for Swagger documentation

export const healthPaths = {
  '/api/v1/health': {
    get: {
      summary: 'Health check endpoint',
      description: 'Returns the health status of the API and its dependencies.',
      tags: ['V1 Health'],
      responses: {
        '200': {
          description: 'API is healthy',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'healthy' },
                  timestamp: { type: 'string', format: 'date-time' },
                  uptime: { type: 'number', description: 'Server uptime in seconds' },
                  version: { type: 'string', example: '1.0.0' },
                  environment: { type: 'string', example: 'production' }
                }
              }
            }
          }
        },
        '503': {
          description: 'API is unhealthy',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'unhealthy' },
                  timestamp: { type: 'string', format: 'date-time' },
                  errors: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of health check errors'
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
