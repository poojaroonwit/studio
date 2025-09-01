// AI API paths for Swagger documentation

export const aiPaths = {
  '/api/ai/analyze': {
    post: {
      summary: 'Analyze content with AI',
      description: 'Analyze content using AI services.',
      tags: ['AI'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                type: { type: 'string' },
                options: { type: 'object' }
              },
              required: ['content', 'type']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Analysis completed successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  analysis: { type: 'object' },
                  confidence: { type: 'number' },
                  suggestions: { type: 'array', items: { type: 'string' } }
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
  '/api/ai/generate': {
    post: {
      summary: 'Generate content with AI',
      description: 'Generate content using AI services.',
      tags: ['AI'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                prompt: { type: 'string' },
                type: { type: 'string' },
                options: { type: 'object' }
              },
              required: ['prompt', 'type']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Content generated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  content: { type: 'string' },
                  metadata: { type: 'object' }
                }
              }
            }
          }
        },
        '400': { description: 'Invalid input' },
        '401': { description: 'Unauthorized' }
      }
    }
  }
};
