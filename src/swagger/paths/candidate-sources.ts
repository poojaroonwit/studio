// Candidate Sources API paths for Swagger documentation

export const candidateSourcesPaths = {
  '/api/v1/candidate-sources': {
    get: {
      summary: 'Get all candidate sources (v1 API)',
      description: 'Returns all candidate sources. Requires Bearer token authentication.',
      tags: ['V1 Candidate Sources'],
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'List of candidate sources',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/CandidateSource' }
              }
            }
          }
        },
        '401': { description: 'Unauthorized' }
      }
    },
    post: {
      summary: 'Create a new candidate source (v1 API)',
      description: 'Creates a new candidate source. Requires Bearer token authentication.',
      tags: ['V1 Candidate Sources'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string', nullable: true },
                type: { type: 'string' },
                url: { type: 'string', nullable: true }
              },
              required: ['name', 'type']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Candidate source created successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CandidateSource' } } }
        },
        '400': { description: 'Invalid input data' },
        '401': { description: 'Unauthorized' }
      }
    }
  }
};
