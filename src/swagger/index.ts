// Comprehensive OpenAPI 3.0 specification for FitScan API
// This file contains all API endpoints in a single location for better reliability

export function getSwaggerSpec() {
  // Use production server URL for Swagger API testing
  const serverUrl = process.env.PRODUCTION_HOST || process.env.API_BASE_URL || 'http://8021_fitscan_app:8021';
  return {
    openapi: '3.0.0',
    info: {
      title: 'FitScan API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the Studio recruitment management system',
      contact: {
        name: 'FitScan API Support',
        email: 'itdhelpdesk@qsncc.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: serverUrl,
        description: 'FitScan API Server',
      },
    ],
    security: [
      {
        bearerAuth: []
      }
    ],
    paths: {
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
      },
      '/api/v1/positions': {
        get: {
          summary: 'Get all positions (v1 API)',
          description: 'Returns a paginated list of positions. Requires Bearer token authentication.',
          tags: ['V1 Positions'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'title', in: 'query', description: 'Filter by position title', schema: { type: 'string' } },
            { name: 'department', in: 'query', description: 'Filter by department (comma-separated)', schema: { type: 'string' } },
            { name: 'isOpen', in: 'query', description: 'Filter by open status', schema: { type: 'boolean' } },
            { name: 'positionLevel', in: 'query', description: 'Filter by position level', schema: { type: 'string' } },
            { name: 'limit', in: 'query', description: 'Number of items per page', schema: { type: 'integer', default: 20 } },
            { name: 'offset', in: 'query', description: 'Offset for pagination', schema: { type: 'integer', default: 0 } }
          ],
          responses: {
            '200': {
              description: 'List of positions',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Position' } },
                      total: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' }
          }
        },
        post: {
          summary: 'Create a new position (v1 API)',
          description: 'Creates a new position. Requires Bearer token authentication.',
          tags: ['V1 Positions'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    department: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    matchCriteria: { type: 'string', nullable: true, description: 'Match criteria in HTML format' },
                    isOpen: { type: 'boolean' },
                    positionLevel: { type: 'string', nullable: true },
                    customAttributes: { type: 'object', additionalProperties: true, nullable: true }
                  },
                  required: ['title', 'department', 'isOpen']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Position created successfully' },
            '400': { description: 'Invalid input' },
            '401': { description: 'Unauthorized' }
          }
        }
      },
      '/api/v1/positions/{id}': {
        get: {
          summary: 'Get position by ID (v1 API)',
          description: 'Returns a specific position by ID. Requires Bearer token authentication.',
          tags: ['V1 Positions'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Position ID', schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: 'Position details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Position' }
                }
              }
            },
            '404': { description: 'Position not found' },
            '401': { description: 'Unauthorized' }
          }
        },
        put: {
          summary: 'Update position (v1 API)',
          description: 'Updates an existing position. Requires Bearer token authentication.',
          tags: ['V1 Positions'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Position ID', schema: { type: 'string' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    department: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    matchCriteria: { type: 'string', nullable: true },
                    isOpen: { type: 'boolean' },
                    positionLevel: { type: 'string', nullable: true },
                    customAttributes: { type: 'object', additionalProperties: true, nullable: true }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Position updated successfully' },
            '400': { description: 'Invalid input' },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Position not found' }
          }
        },
        delete: {
          summary: 'Delete position (v1 API)',
          description: 'Deletes a position. Requires Bearer token authentication.',
          tags: ['V1 Positions'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Position ID', schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Position deleted successfully' },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Position not found' }
          }
        }
      },
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
                      items: {
                        type: 'object',
                        properties: {
                          institution: { type: 'string' },
                          degree: { type: 'string' },
                          field_of_study: { type: 'string' },
                          start_date: { type: 'string', format: 'date' },
                          end_date: { type: 'string', format: 'date', nullable: true },
                          gpa: { type: 'string', nullable: true },
                          description: { type: 'string', nullable: true }
                        }
                      }
                    },
                    experienceData: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          company: { type: 'string' },
                          position: { type: 'string' },
                          start_date: { type: 'string', format: 'date' },
                          end_date: { type: 'string', format: 'date', nullable: true },
                          description: { type: 'string', nullable: true },
                          achievements: { type: 'array', items: { type: 'string' } }
                        }
                      }
                    }
                  },
                  required: ['candidate_info']
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Candidate created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      candidateId: { type: 'string' },
                      message: { type: 'string' }
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
      '/api/v1/candidates/{id}': {
        get: {
          summary: 'Get candidate by ID (v1 API)',
          description: 'Returns a specific candidate by ID. Requires Bearer token authentication.',
          tags: ['V1 Candidates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: 'Candidate details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Candidate' }
                }
              }
            },
            '404': { description: 'Candidate not found' },
            '401': { description: 'Unauthorized' }
          }
        },
        put: {
          summary: 'Update candidate (v1 API)',
          description: 'Updates an existing candidate. Requires Bearer token authentication.',
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
                    candidate_info: { type: 'object', additionalProperties: true },
                    educationData: { type: 'array', items: { type: 'object', additionalProperties: true } },
                    experienceData: { type: 'array', items: { type: 'object', additionalProperties: true } }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Candidate updated successfully' },
            '400': { description: 'Invalid input' },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Candidate not found' }
          }
        },
        delete: {
          summary: 'Delete candidate (v1 API)',
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
      },
      '/api/v1/users': {
        get: {
          summary: 'Get all users (v1 API)',
          description: 'Returns a list of users. Requires Bearer token authentication.',
          tags: ['V1 Users'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'List of users',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' }
          }
        }
      },
      '/api/v1/users/{id}': {
        get: {
          summary: 'Get user by ID (v1 API)',
          description: 'Returns a specific user by ID. Requires Bearer token authentication.',
          tags: ['V1 Users'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'User ID', schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: 'User details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' }
                }
              }
            },
            '404': { description: 'User not found' },
            '401': { description: 'Unauthorized' }
          }
        }
      },
      '/api/v1/dashboard/stats': {
        get: {
          summary: 'Get dashboard statistics (v1 API)',
          description: 'Returns dashboard statistics. Requires Bearer token authentication.',
          tags: ['V1 Dashboard'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Dashboard statistics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      totalCandidates: { type: 'integer' },
                      totalPositions: { type: 'integer' },
                      openPositions: { type: 'integer' },
                      recentApplications: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' }
          }
        }
      },
      '/api/v1/health': {
        get: {
          summary: 'Health check (v1 API)',
          description: 'Returns system health status.',
          tags: ['V1 Health'],
          responses: {
            '200': {
              description: 'System is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      timestamp: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/v1/recruitment-stages': {
        get: {
          summary: 'Get recruitment stages (v1 API)',
          description: 'Returns all recruitment stages. Requires Bearer token authentication.',
          tags: ['V1 Recruitment Stages'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'List of recruitment stages',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/RecruitmentStage' }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' }
          }
        }
      },
      '/api/v1/transitions': {
        get: {
          summary: 'Get candidate transitions (v1 API)',
          description: 'Returns candidate stage transitions. Requires Bearer token authentication.',
          tags: ['V1 Transitions'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'List of transitions',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Transition' }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' }
          }
        }
      },
      '/api/v1/settings': {
        get: {
          summary: 'Get system settings (v1 API)',
          description: 'Returns system settings. Requires Bearer token authentication.',
          tags: ['V1 Settings'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'System settings',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    additionalProperties: true
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' }
          }
        }
      },
      '/api/v1/logs': {
        get: {
          summary: 'Get system logs (v1 API)',
          description: 'Returns system logs. Requires Bearer token authentication.',
          tags: ['V1 Logs'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'level', in: 'query', description: 'Log level filter', schema: { type: 'string' } },
            { name: 'limit', in: 'query', description: 'Number of logs to return', schema: { type: 'integer', default: 100 } }
          ],
          responses: {
            '200': {
              description: 'System logs',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/LogEntry' }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from NextAuth.js'
        }
      },
      schemas: {
        Position: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            department: { type: 'string' },
            description: { type: 'string', nullable: true },
            isOpen: { type: 'boolean' },
            positionLevel: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Candidate: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstname: { type: 'string' },
            lastname: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', nullable: true },
            status: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string' },
            modulePermissions: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        RecruitmentStage: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            order: { type: 'integer' },
            isActive: { type: 'boolean' }
          }
        },
        Transition: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            candidateId: { type: 'string' },
            fromStage: { type: 'string' },
            toStage: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        LogEntry: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            level: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    tags: [
      { name: 'V1 Authentication', description: 'External API authentication endpoints' },
      { name: 'V1 Positions', description: 'External API for positions' },
      { name: 'V1 Candidates', description: 'External API for candidates' },
      { name: 'V1 Users', description: 'External API for users' },
      { name: 'V1 Dashboard', description: 'External API for dashboard statistics' },
      { name: 'V1 Health', description: 'Health check endpoints' },
      { name: 'V1 Recruitment Stages', description: 'External API for recruitment stages' },
      { name: 'V1 Transitions', description: 'External API for candidate stage transitions' },
      { name: 'V1 Settings', description: 'External API for system settings' },
      { name: 'V1 Logs', description: 'External API for system logs' }
    ]
  };
}

export default getSwaggerSpec();
