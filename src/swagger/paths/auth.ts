// Authentication API paths for Swagger documentation

export const authPaths = {
  '/api/v1/auth/login': {
    post: {
      summary: 'External API login',
      description: 'Authenticate with email and password to receive a JWT for API use.',
      tags: ['V1 Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string' }
              },
              required: ['email', 'password']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Login successful, returns JWT token and user info',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  token: { type: 'string', description: 'JWT for Bearer authentication' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string', format: 'email' },
                      role: { type: 'string' },
                      modulePermissions: { type: 'array', items: { type: 'string' } }
                    }
                  }
                }
              }
            }
          }
        },
        '400': { description: 'Invalid input or missing fields' },
        '401': { description: 'Invalid email or password' }
      }
    }
  }
};
