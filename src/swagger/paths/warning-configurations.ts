// Warning Configurations API paths for Swagger documentation

export const warningConfigurationsPaths = {
  '/api/warning-configurations/available-fields': {
    get: {
      summary: 'Get available warning fields',
      description: 'Get available fields that can be used for warning configurations. Requires Bearer token authentication.',
      tags: ['Warning Configurations'],
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Available fields retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  candidateFields: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        label: { type: 'string' },
                        type: { type: 'string' },
                        description: { type: 'string' }
                      }
                    }
                  },
                  positionFields: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        label: { type: 'string' },
                        type: { type: 'string' },
                        description: { type: 'string' }
                      }
                    }
                  },
                  systemFields: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        label: { type: 'string' },
                        type: { type: 'string' },
                        description: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '401': { description: 'Unauthorized' }
      }
    }
  }
};
