// Server-Sent Events API paths for Swagger documentation

export const ssePaths = {
  '/api/sse': {
    get: {
      summary: 'SSE connection endpoint',
      description: 'Establish a Server-Sent Events connection for real-time updates.',
      tags: ['SSE'],
      responses: {
        '200': {
          description: 'SSE connection established',
          content: {
            'text/event-stream': {
              schema: {
                type: 'string',
                description: 'Event stream data'
              }
            }
          }
        },
        '401': { description: 'Unauthorized' },
        '500': { description: 'Internal server error' }
      }
    }
  },
  '/api/sse/test': {
    get: {
      summary: 'Test SSE connection',
      description: 'Test endpoint for SSE functionality.',
      tags: ['SSE'],
      responses: {
        '200': {
          description: 'Test SSE connection successful',
          content: {
            'text/event-stream': {
              schema: {
                type: 'string',
                description: 'Test event stream data'
              }
            }
          }
        }
      }
    }
  }
};
