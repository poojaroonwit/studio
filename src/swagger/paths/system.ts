// System API paths for Swagger documentation

export const systemPaths = {
  '/api/system/status': {
    get: {
      summary: 'Get system status',
      description: 'Retrieve overall system health and status information.',
      tags: ['System'],
      responses: {
        '200': {
          description: 'System status retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  uptime: { type: 'number' },
                  version: { type: 'string' },
                  environment: { type: 'string' },
                  services: {
                    type: 'object',
                    properties: {
                      database: { type: 'string' },
                      redis: { type: 'string' },
                      minio: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        },
        '500': { description: 'Internal server error' }
      }
    }
  },
  '/api/system/info': {
    get: {
      summary: 'Get system information',
      description: 'Retrieve detailed system information and configuration.',
      tags: ['System'],
      responses: {
        '200': {
          description: 'System information retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  platform: { type: 'string' },
                  nodeVersion: { type: 'string' },
                  memory: {
                    type: 'object',
                    properties: {
                      total: { type: 'number' },
                      used: { type: 'number' },
                      free: { type: 'number' }
                    }
                  },
                  cpu: {
                    type: 'object',
                    properties: {
                      cores: { type: 'number' },
                      load: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        },
        '500': { description: 'Internal server error' }
      }
    }
  }
};
