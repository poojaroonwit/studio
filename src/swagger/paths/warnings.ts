// Warnings API paths for Swagger documentation

export const warningsPaths = {
  '/api/warnings': {
    get: {
      summary: 'Get all warnings',
      description: 'Retrieve all system warnings and alerts.',
      tags: ['Warnings'],
      responses: {
        '200': {
          description: 'Warnings retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    type: { type: 'string' },
                    message: { type: 'string' },
                    severity: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                    resolved: { type: 'boolean' }
                  }
                }
              }
            }
          }
        },
        '401': { description: 'Unauthorized' }
      }
    },
    post: {
      summary: 'Create a new warning',
      description: 'Create a new system warning.',
      tags: ['Warnings'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                message: { type: 'string' },
                severity: { type: 'string' }
              },
              required: ['type', 'message', 'severity']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Warning created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string' },
                  message: { type: 'string' },
                  severity: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        '400': { description: 'Invalid input' },
        '401': { description: 'Unauthorized' }
      }
    }
  },
  '/api/warnings/status': {
    get: {
      summary: 'Get warnings status',
      description: 'Get the current status of all warnings.',
      tags: ['Warnings'],
      responses: {
        '200': {
          description: 'Warnings status retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  active: { type: 'number' },
                  resolved: { type: 'number' },
                  critical: { type: 'number' }
                }
              }
            }
          }
        },
        '401': { description: 'Unauthorized' }
      }
    }
  },
  '/api/warnings/clear': {
    post: {
      summary: 'Clear all warnings',
      description: 'Clear all active warnings.',
      tags: ['Warnings'],
      responses: {
        '200': {
          description: 'All warnings cleared successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  clearedCount: { type: 'number' }
                }
              }
            }
          }
        },
        '401': { description: 'Unauthorized' }
      }
    }
  },
  '/api/warnings/check': {
    post: {
      summary: 'Check for new warnings',
      description: 'Trigger a check for new system warnings.',
      tags: ['Warnings'],
      responses: {
        '200': {
          description: 'Warning check completed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  newWarnings: { type: 'number' },
                  totalWarnings: { type: 'number' }
                }
              }
            }
          }
        },
        '401': { description: 'Unauthorized' }
      }
    }
  },
  '/api/warnings/stream': {
    get: {
      summary: 'Stream warnings',
      description: 'Stream real-time warning updates.',
      tags: ['Warnings'],
      responses: {
        '200': {
          description: 'Warning stream established',
          content: {
            'text/event-stream': {
              schema: {
                type: 'string',
                description: 'Warning event stream'
              }
            }
          }
        },
        '401': { description: 'Unauthorized' }
      }
    }
  }
};
