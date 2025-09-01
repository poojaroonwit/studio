// Candidates API paths for Swagger documentation

export const candidatesPaths = {
  '/api/v1/candidates': {
    get: {
      summary: 'Get all candidates (v1 API)',
      description: 'Returns a paginated list of candidates. Requires Bearer token authentication.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', description: 'Page number for pagination', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', description: 'Number of items per page', schema: { type: 'integer', default: 10 } },
        { name: 'status', in: 'query', description: 'Filter by candidate status', schema: { type: 'string' } },
        { name: 'positionId', in: 'query', description: 'Filter by position ID', schema: { type: 'string' } },
        { name: 'recruiterId', in: 'query', description: 'Filter by recruiter ID', schema: { type: 'string' } },
        { name: 'search', in: 'query', description: 'Search term for name or email', schema: { type: 'string' } }
      ],
      responses: {
        '200': {
          description: 'List of candidates',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  candidates: { type: 'array', items: { $ref: '#/components/schemas/Candidate' } },
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                  limit: { type: 'integer' }
                }
              }
            }
          }
        },
        '401': { description: 'Unauthorized' }
      }
    },
    post: {
      summary: 'Create a new candidate (v1 API)',
      description: 'Creates a new candidate with structured education and experience data.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                candidate_info: {
                  type: 'object',
                  properties: {
                    personal_info: {
                      type: 'object',
                      properties: {
                        title_honorific: { type: 'string', nullable: true },
                        firstname: { type: 'string' },
                        lastname: { type: 'string' },
                        nickname: { type: 'string', nullable: true },
                        location: { type: 'string', nullable: true },
                        introduction_aboutme: { type: 'string', nullable: true }
                      },
                      required: ['firstname', 'lastname']
                    },
                    contact_info: {
                      type: 'object',
                      properties: {
                        email: { type: 'string', format: 'email' },
                        phone: { type: 'string', nullable: true }
                      },
                      required: ['email']
                    },
                    skills: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          segment_skill: { type: 'string' },
                          skill: { type: 'array', items: { type: 'string' } }
                        }
                      }
                    },
                    status: { type: 'string', nullable: true },
                    job_suitable: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          suitable_career: { type: 'string' },
                          suitable_job_position: { type: 'string' },
                          suitable_job_level: { type: 'string' },
                          suitable_salary_bath_month: { type: 'string' }
                        }
                      }
                    }
                  },
                  required: ['contact_info', 'personal_info']
                },
                educationData: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/StructuredEducationEntry' }
                },
                experienceData: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/StructuredExperienceEntry' }
                }
              },
              required: ['candidate_info']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Candidate created successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Candidate' } } }
        },
        '400': { description: 'Invalid input data' },
        '401': { description: 'Unauthorized' }
      }
    }
  },
  '/api/v1/candidates/{id}': {
    get: {
      summary: 'Get candidate by ID (v1 API)',
      description: 'Returns details for a specific candidate. Requires Bearer token authentication.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string' } }
      ],
      responses: {
        '200': {
          description: 'Candidate details',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Candidate' } } }
        },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Candidate not found' }
      }
    },
    put: {
      summary: 'Update candidate by ID (v1 API)',
      description: 'Updates a candidate. Requires Bearer token authentication.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                candidate_info: { type: 'object' },
                educationData: { type: 'array', items: { $ref: '#/components/schemas/StructuredEducationEntry' } },
                experienceData: { type: 'array', items: { $ref: '#/components/schemas/StructuredExperienceEntry' } }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Candidate updated successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Candidate' } } }
        },
        '400': { description: 'Invalid input data' },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Candidate not found' }
      }
    },
    delete: {
      summary: 'Delete candidate by ID (v1 API)',
      description: 'Deletes a candidate. Requires Bearer token authentication.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string' } }
      ],
      responses: {
        '200': { description: 'Candidate deleted successfully' },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Candidate not found' }
      }
    }
  },
  '/api/v1/candidates/import': {
    post: {
      summary: 'Import candidates (v1 API)',
      description: 'Import candidates from CSV file. Requires Bearer token authentication.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                file: { type: 'string', format: 'binary' }
              },
              required: ['file']
            }
          }
        }
      },
      responses: {
        '200': { description: 'Candidates imported successfully' },
        '400': { description: 'Invalid file format' },
        '401': { description: 'Unauthorized' }
      }
    }
  },
  '/api/v1/candidates/bulk-upload-cv': {
    post: {
      summary: 'Bulk upload CVs (v1 API)',
      description: 'Upload multiple CV files for candidates. Requires Bearer token authentication.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                files: { type: 'array', items: { type: 'string', format: 'binary' } }
              },
              required: ['files']
            }
          }
        }
      },
      responses: {
        '200': { description: 'CVs uploaded successfully' },
        '400': { description: 'Invalid files' },
        '401': { description: 'Unauthorized' }
      }
    }
  },
  '/api/v1/candidates/clear-duplicates': {
    post: {
      summary: 'Clear duplicate candidates (v1 API)',
      description: 'Remove duplicate candidates from the system. Requires Bearer token authentication.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      responses: {
        '200': { description: 'Duplicates cleared successfully' },
        '401': { description: 'Unauthorized' }
      }
    }
  },
  '/api/v1/candidates/bulk-action': {
    post: {
      summary: 'Bulk action on candidates (v1 API)',
      description: 'Perform bulk actions on multiple candidates. Requires Bearer token authentication.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['delete', 'update', 'export'] },
                candidateIds: { type: 'array', items: { type: 'string' } },
                updates: { type: 'object', additionalProperties: true }
              },
              required: ['action', 'candidateIds']
            }
          }
        }
      },
      responses: {
        '200': { description: 'Bulk action completed successfully' },
        '400': { description: 'Invalid action or input' },
        '401': { description: 'Unauthorized' }
      }
    }
  }
};
