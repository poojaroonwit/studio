// Comprehensive OpenAPI 3.0 specification for Studio API

export function getSwaggerSpec() {
  const serverUrl = process.env.API_BASE_URL || 'http://localhost:8021';
  return {
    openapi: '3.0.0',
    info: {
      title: 'Studio API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the Studio recruitment management system',
      contact: {
        name: 'Studio API Support',
        email: 'support@studio.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: serverUrl,
        description: 'Current server'
      }
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
            '201': {
              description: 'Position created successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Position' }
                }
              }
            },
            '400': { description: 'Invalid input data' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' }
          }
        }
      },
      '/api/v1/positions/{id}': {
        get: {
          summary: 'Get position by ID (v1 API)',
          description: 'Returns details for a specific position. Requires Bearer token authentication.',
          tags: ['V1 Positions'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Position ID', schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: 'Position details',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Position' } } }
            },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Position not found' }
          }
        },
        put: {
          summary: 'Update position by ID (v1 API)',
          description: 'Updates a position. Requires Bearer token authentication and Admin or POSITIONS_MANAGE permission.',
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
                    isOpen: { type: 'boolean' },
                    positionLevel: { type: 'string', nullable: true },
                    customAttributes: { type: 'object', additionalProperties: true, nullable: true }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Position updated successfully',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Position' } } }
            },
            '400': { description: 'Invalid input data' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '404': { description: 'Position not found' }
          }
        },
        delete: {
          summary: 'Delete position by ID (v1 API)',
          description: 'Deletes a position. Requires Bearer token authentication and Admin or POSITIONS_MANAGE permission.',
          tags: ['V1 Positions'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Position ID', schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Position deleted successfully' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
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
            { name: 'searchTerm', in: 'query', description: 'Search term for name or email', schema: { type: 'string' } }
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
          description: 'Creates a new candidate with structured education and experience data. Supports both legacy period strings and new structured date fields.',
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
                        education: {
                          type: 'array',
                          items: { type: 'object' },
                          description: 'Legacy education format (deprecated, use educationData instead)'
                        },
                        experience: {
                          type: 'array',
                          items: { type: 'object' },
                          description: 'Legacy experience format (deprecated, use experienceData instead)'
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
                        status: { type: 'string', nullable: true }
                      },
                      required: ['contact_info', 'personal_info']
                    },
                    educationData: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/StructuredEducationEntry' },
                      description: 'New structured education data with separate date fields (recommended)'
                    },
                    experienceData: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/StructuredExperienceEntry' },
                      description: 'New structured experience data with separate date fields (recommended)'
                    }
                  },
                  required: ['candidate_info']
                },
                examples: {
                  'structured_format': {
                    summary: 'Structured Format (Recommended)',
                    value: {
                      candidate_info: {
                        personal_info: {
                          firstname: 'John',
                          lastname: 'Doe'
                        },
                        contact_info: {
                          email: 'john.doe@example.com',
                          phone: '+1234567890'
                        }
                      },
                      educationData: [
                        {
                          university: 'Example University',
                          major: 'Computer Science',
                          startMonth: 9,
                          startYear: 2018,
                          endMonth: 6,
                          endYear: 2022,
                          isCurrent: false,
                          GPA: '3.8'
                        }
                      ],
                      experienceData: [
                        {
                          company: 'Example Corp',
                          position: 'Software Engineer',
                          startMonth: 1,
                          startYear: 2022,
                          endMonth: null,
                          endYear: null,
                          isCurrent: true,
                          description: 'Full-stack development'
                        }
                      ]
                    }
                  },
                  'legacy_format': {
                    summary: 'Legacy Format (Deprecated)',
                    value: {
                      candidate_info: {
                        personal_info: {
                          firstname: 'John',
                          lastname: 'Doe'
                        },
                        contact_info: {
                          email: 'john.doe@example.com',
                          phone: '+1234567890'
                        },
                        education: [
                          {
                            university: 'Example University',
                            major: 'Computer Science',
                            period: 'Sep 2018 - Jun 2022'
                          }
                        ],
                        experience: [
                          {
                            company: 'Example Corp',
                            position: 'Software Engineer',
                            period: 'Jan 2022 - Present'
                          }
                        ]
                      }
                    }
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Candidate created successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        data: {
                          type: 'object',
                          properties: {
                            message: { type: 'string' },
                            candidate: { $ref: '#/components/schemas/Candidate' }
                          }
                        }
                      }
                    }
                  }
                }
              },
              '400': { description: 'Invalid input data' },
              '401': { description: 'Unauthorized' },
              '403': { description: 'Insufficient permissions' },
              '409': { description: 'Candidate with this email already exists' }
            }
          }
        }
      },
      '/api/v1/candidates/import': {
        post: {
          summary: 'Import candidates from CSV/Excel file (v1 API)',
          description: 'Bulk import candidates from CSV or Excel files. Supports both file upload and JSON format. Requires Bearer token authentication and CANDIDATES_MANAGE permission.',
          tags: ['V1 Candidates'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: {
                      type: 'string',
                      format: 'binary',
                      description: 'CSV or Excel file (.csv, .xlsx, .xls)'
                    }
                  },
                  required: ['file']
                }
              },
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    candidates: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          email: { type: 'string', format: 'email' },
                          phone: { type: 'string', nullable: true },
                          status: { type: 'string' },
                          positionId: { type: 'string', format: 'uuid', nullable: true },
                          recruiterId: { type: 'string', format: 'uuid', nullable: true },
                          fitScore: { type: 'number', minimum: 0, maximum: 100, nullable: true },
                          custom_attributes: { type: 'object', additionalProperties: true, nullable: true },
                          parsedData: { type: 'object', additionalProperties: true, nullable: true },
                          resumePath: { type: 'string', nullable: true }
                        },
                        required: ['name', 'email', 'status']
                      }
                    }
                  },
                  required: ['candidates']
                },
                example: {
                  candidates: [
                    {
                      name: "John Doe",
                      email: "john.doe@example.com",
                      phone: "+1234567890",
                      status: "Applied",
                      positionId: null,
                      recruiterId: null,
                      fitScore: 85,
                      custom_attributes: {},
                      parsedData: null,
                      resumePath: null
                    }
                  ]
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Import completed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      results: {
                        type: 'object',
                        properties: {
                          imported: { type: 'integer', description: 'Number of candidates successfully imported' },
                          skipped: { type: 'integer', description: 'Number of candidates skipped (already exist)' },
                          errors: { type: 'array', items: { type: 'string' }, description: 'List of error messages' }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': { description: 'Invalid file format or data' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '500': { description: 'Internal server error' }
          }
        },
        get: {
          summary: 'Get import template (v1 API)',
          description: 'Returns a template for candidate import. Requires Bearer token authentication.',
          tags: ['V1 Candidates'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Import template',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      candidates: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            email: { type: 'string', format: 'email' },
                            phone: { type: 'string', nullable: true },
                            status: { type: 'string' },
                            positionId: { type: 'string', format: 'uuid', nullable: true },
                            recruiterId: { type: 'string', format: 'uuid', nullable: true },
                            fitScore: { type: 'number', minimum: 0, maximum: 100, nullable: true },
                            custom_attributes: { type: 'object', additionalProperties: true, nullable: true },
                            parsedData: { type: 'object', additionalProperties: true, nullable: true },
                            resumePath: { type: 'string', nullable: true }
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
          description: 'Updates a candidate with candidate information, job matches, and applied job data. Supports both legacy and new formats. Requires Bearer token authentication and Admin or CANDIDATES_MANAGE permission.',
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
                    // Legacy fields for backward compatibility
                    name: { type: 'string', minLength: 1 },
                    email: { type: 'string', format: 'email' },
                    phone: { type: 'string', nullable: true },
                    positionId: { type: 'string', format: 'uuid', nullable: true },
                    recruiterId: { type: 'string', format: 'uuid', nullable: true },
                    fitScore: { type: 'number', minimum: 0, maximum: 100 },
                    status: { type: 'string', minLength: 1 },
                    parsedData: { type: 'object', additionalProperties: true, nullable: true },
                    customAttributes: { type: 'object', additionalProperties: true, nullable: true },
                    resumePath: { type: 'string', nullable: true },
                    transitionNotes: { type: 'string', nullable: true },

                    // New candidate_info format
                    candidate_info: {
                      type: 'object',
                      properties: {
                        personal_info: {
                          type: 'object',
                          properties: {
                            title_honorific: { type: 'string', nullable: true },
                            firstname: { type: 'string', minLength: 1 },
                            lastname: { type: 'string', minLength: 1 },
                            nickname: { type: 'string', nullable: true },
                            location: { type: 'string', nullable: true },
                            introduction_aboutme: { type: 'string', nullable: true }
                          }
                        },
                        contact_info: {
                          type: 'object',
                          properties: {
                            email: { type: 'string', format: 'email' },
                            phone: { type: 'string', nullable: true }
                          }
                        },
                        education: { type: 'array', items: { type: 'object' } },
                        experience: { type: 'array', items: { type: 'object' } },
                        skills: { type: 'array', items: { type: 'object' } },
                        job_suitable: { type: 'array', items: { type: 'object' } },
                        cv_language: { type: 'string', nullable: true },
                        status: { type: 'string' }
                      }
                    },

                    // Job matches and applied job updates
                    job_matches: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/JobMatch' }
                    },

                    job_applied: { $ref: '#/components/schemas/JobApplied' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Candidate updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      candidate: { $ref: '#/components/schemas/Candidate' },
                      updated_fields: { type: 'array', items: { type: 'string' } }
                    }
                  }
                }
              }
            },
            '400': { description: 'Invalid input data' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '404': { description: 'Candidate not found' }
          }
        },
        delete: {
          summary: 'Delete candidate by ID (v1 API)',
          description: 'Deletes a candidate. Requires Bearer token authentication and Admin or CANDIDATES_MANAGE permission.',
          tags: ['V1 Candidates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Candidate deleted successfully' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '404': { description: 'Candidate not found' }
          }
        }
      },
      '/api/v1/candidates/{id}/job-applied': {
        get: {
          summary: 'Get applied job information for a candidate (v1 API)',
          description: 'Returns the applied job information for the specified candidate. Requires Bearer token authentication.',
          tags: ['V1 Candidates', 'Job Applied'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          responses: {
            '200': {
              description: 'Applied job information',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      job_applied: { $ref: '#/components/schemas/JobApplied' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Candidate not found' }
          }
        },
        post: {
          summary: 'Create or update applied job information for a candidate (v1 API)',
          description: 'Creates or updates the applied job information for the specified candidate. Requires Bearer token authentication.',
          tags: ['V1 Candidates', 'Job Applied'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/JobApplied' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Applied job information updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      job_applied: { $ref: '#/components/schemas/JobApplied' }
                    }
                  }
                }
              }
            },
            '400': { description: 'Invalid input data' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '404': { description: 'Candidate or position not found' }
          }
        },
        put: {
          summary: 'Update applied job information for a candidate (v1 API)',
          description: 'Updates the applied job information for the specified candidate. Requires Bearer token authentication.',
          tags: ['V1 Candidates', 'Job Applied'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/JobApplied' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Applied job information updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      job_applied: { $ref: '#/components/schemas/JobApplied' }
                    }
                  }
                }
              }
            },
            '400': { description: 'Invalid input data' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '404': { description: 'Candidate or position not found' }
          }
        },
        delete: {
          summary: 'Delete applied job information for a candidate (v1 API)',
          description: 'Deletes the applied job information for the specified candidate. Requires Bearer token authentication.',
          tags: ['V1 Candidates', 'Job Applied'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          responses: {
            '200': { description: 'Applied job information deleted successfully' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '404': { description: 'Candidate not found' }
          }
        }
      },
      '/api/v1/candidates/{id}/job-matches': {
        get: {
          summary: 'Get job matches for a candidate (v1 API)',
          description: 'Returns all job matches for the specified candidate. Requires Bearer token authentication.',
          tags: ['V1 Candidates', 'Job Matches'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          responses: {
            '200': {
              description: 'List of job matches',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      job_matches: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/JobMatch' }
                      }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Candidate not found' }
          }
        },
        post: {
          summary: 'Create or update job matches for a candidate (v1 API)',
          description: 'Creates or updates job matches for the specified candidate. Note: position_title, created_at, and updated_at are automatically handled and should not be included in the request body. Requires Bearer token authentication.',
          tags: ['V1 Candidates', 'Job Matches'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    job_matches: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/JobMatchRequest' }
                    }
                  },
                  required: ['job_matches']
                },
                example: {
                  job_matches: [
                    {
                      fit_score: 85,
                      job_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                      match_reasons: ["Strong technical skills", "Relevant experience"]
                    }
                  ]
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Job matches updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      job_matches: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/JobMatch' }
                      }
                    }
                  }
                }
              }
            },
            '400': { description: 'Invalid input data' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '404': { description: 'Candidate not found' }
          }
        },
        put: {
          summary: 'Update job matches for a candidate (v1 API)',
          description: 'Updates job matches for the specified candidate. Note: position_title, created_at, and updated_at are automatically handled and should not be included in the request body. Requires Bearer token authentication.',
          tags: ['V1 Candidates', 'Job Matches'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    job_matches: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/JobMatchRequest' }
                    }
                  },
                  required: ['job_matches']
                },
                example: {
                  job_matches: [
                    {
                      fit_score: 90,
                      job_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                      match_reasons: ["Updated match reasons"]
                    }
                  ]
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Job matches updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      job_matches: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/JobMatch' }
                      }
                    }
                  }
                }
              }
            },
            '400': { description: 'Invalid input data' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '404': { description: 'Candidate not found' }
          }
        },
        delete: {
          summary: 'Delete all job matches for a candidate (v1 API)',
          description: 'Deletes all job matches for the specified candidate. Requires Bearer token authentication.',
          tags: ['V1 Candidates', 'Job Matches'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          responses: {
            '200': { description: 'All job matches deleted successfully' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '404': { description: 'Candidate not found' }
          }
        }
      },
      '/api/v1/candidates/{id}/job-matches/add': {
        post: {
          summary: 'Add a new job match for a candidate (v1 API)',
          description: 'Adds a new job match for the specified candidate. Note: position_title, created_at, and updated_at are automatically handled and should not be included in the request body. Requires Bearer token authentication.',
          tags: ['V1 Candidates', 'Job Matches'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    fit_score: { type: 'number', minimum: 0, maximum: 100, description: 'Fit score between 0-100' },
                    job_id: { type: 'string', format: 'uuid', description: 'Position ID to match with' },
                    match_reasons: { type: 'array', items: { type: 'string' }, description: 'Array of reasons for the match' }
                  },
                  required: ['fit_score', 'job_id']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Job match added successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      job_match: { $ref: '#/components/schemas/JobMatch' }
                    }
                  }
                }
              }
            },
            '400': { description: 'Invalid input data' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '404': { description: 'Candidate or position not found' },
            '409': { description: 'Job match already exists for this candidate and position' }
          }
        }
      },
      '/api/v1/candidates/{id}/job-matches/{matchId}': {
        get: {
          summary: 'Get a specific job match for a candidate (v1 API)',
          description: 'Returns a specific job match for the specified candidate. Requires Bearer token authentication.',
          tags: ['V1 Candidates', 'Job Matches'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } },
            { name: 'matchId', in: 'path', required: true, description: 'Job Match ID', schema: { type: 'string', format: 'uuid' } }
          ],
          responses: {
            '200': {
              description: 'Job match details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      job_match: { $ref: '#/components/schemas/JobMatch' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Candidate or job match not found' }
          }
        },
        put: {
          summary: 'Update a specific job match for a candidate (v1 API)',
          description: 'Updates a specific job match for the specified candidate. Note: position_title, created_at, and updated_at are automatically handled and should not be included in the request body. Requires Bearer token authentication.',
          tags: ['V1 Candidates', 'Job Matches'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } },
            { name: 'matchId', in: 'path', required: true, description: 'Job Match ID', schema: { type: 'string', format: 'uuid' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/JobMatch' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Job match updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      job_match: { $ref: '#/components/schemas/JobMatch' }
                    }
                  }
                }
              }
            },
            '400': { description: 'Invalid input data' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '404': { description: 'Candidate or job match not found' }
          }
        },
        delete: {
          summary: 'Delete a specific job match for a candidate (v1 API)',
          description: 'Deletes a specific job match for the specified candidate. Requires Bearer token authentication.',
          tags: ['V1 Candidates', 'Job Matches'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } },
            { name: 'matchId', in: 'path', required: true, description: 'Job Match ID', schema: { type: 'string', format: 'uuid' } }
          ],
          responses: {
            '200': { description: 'Job match deleted successfully' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '404': { description: 'Candidate or job match not found' }
          }
        }
      },
      '/api/v1/candidates/{id}/attachments': {
        get: {
          summary: 'Get all attachments for a candidate (v1 API)',
          description: 'Returns a list of attachments for the specified candidate. Requires Bearer token authentication.',
          tags: ['V1 Candidates', 'Attachments'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          responses: {
            '200': {
              description: 'List of attachments',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Attachment' }
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
          summary: 'Upload an attachment for a candidate (v1 API)',
          description: 'Uploads a new attachment file for the specified candidate. Requires Bearer token authentication. Accepts multipart/form-data.',
          tags: ['V1 Candidates', 'Attachments'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    attachment: { type: 'string', format: 'binary', description: 'Attachment file (PDF, DOC, DOCX, RTF, TXT, JPG, PNG, GIF)' }
                  },
                  required: ['attachment']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Attachment uploaded successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Attachment' }
                    }
                  }
                }
              }
            },
            '400': { description: 'No file uploaded' },
            '401': { description: 'Unauthorized' }
          }
        },
        put: {
          summary: 'Set an attachment as primary (v1 API)',
          description: 'Sets the specified attachment as the primary attachment for the candidate. Requires Bearer token authentication.',
          tags: ['V1 Candidates', 'Attachments'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    attachmentId: { type: 'string', format: 'uuid', description: 'Attachment ID to set as primary' }
                  },
                  required: ['attachmentId']
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Attachment set as primary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Attachment' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' }
          }
        },
        delete: {
          summary: 'Delete an attachment for a candidate (v1 API)',
          description: 'Deletes the specified attachment for the candidate. Requires Bearer token authentication.',
          tags: ['V1 Candidates', 'Attachments'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    attachmentId: { type: 'string', format: 'uuid', description: 'Attachment ID to delete' }
                  },
                  required: ['attachmentId']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Attachment deleted successfully' },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Attachment not found' }
          }
        }
      },
      '/api/v1/candidates/{id}/avatar': {
        post: {
          summary: 'Upload candidate avatar (v1 API)',
          description: 'Upload an avatar image for a candidate. Supports multipart/form-data. Requires Bearer token authentication and CANDIDATES_MANAGE permission.',
          tags: ['V1 Candidates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string' } }
          ],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    avatar: {
                      type: 'string',
                      format: 'binary',
                      description: 'Avatar image file (JPG, PNG, etc.)'
                    }
                  },
                  required: ['avatar']
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Avatar uploaded successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      avatar_url: { type: 'string', format: 'uri' },
                      candidate: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          avatarUrl: { type: 'string', format: 'uri' }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': { description: 'Invalid file type or size' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '404': { description: 'Candidate not found' },
            '500': { description: 'Internal server error' },
            '503': { description: 'Storage service unavailable' }
          }
        },
        get: {
          summary: 'Get candidate avatar URL (v1 API)',
          description: 'Get the avatar URL for a candidate. Requires Bearer token authentication.',
          tags: ['V1 Candidates'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: 'Avatar URL retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      avatar_url: { type: 'string', format: 'uri', nullable: true }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Candidate not found' },
            '500': { description: 'Database error' }
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
        Candidate: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', nullable: true },
            positionId: { type: 'string', format: 'uuid', nullable: true },
            recruiterId: { type: 'string', format: 'uuid', nullable: true },
            fitScore: { type: 'number', minimum: 0, maximum: 100 },
            status: { type: 'string' },
            parsedData: { type: 'object', additionalProperties: true, nullable: true },
            customAttributes: { type: 'object', additionalProperties: true, nullable: true },
            resumePath: { type: 'string', nullable: true },
            applicationDate: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time', description: 'Set automatically by the backend/database.' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Set automatically by the backend/database and updated on every change.' },
            positionTitle: { type: 'string', nullable: true },
            recruiterName: { type: 'string', nullable: true },
            educationData: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  university: { type: 'string', description: 'University name' },
                  major: { type: 'string', nullable: true, description: 'Major/degree field' },
                  field: { type: 'string', nullable: true, description: 'Field of study' },
                  campus: { type: 'string', nullable: true, description: 'Campus location' },
                  startMonth: { type: 'integer', minimum: 1, maximum: 12, description: 'Start month (1-12)' },
                  startYear: { type: 'integer', minimum: 1900, maximum: 2100, description: 'Start year' },
                  endMonth: { type: 'integer', minimum: 1, maximum: 12, nullable: true, description: 'End month (1-12), null if current' },
                  endYear: { type: 'integer', minimum: 1900, maximum: 2100, nullable: true, description: 'End year, null if current' },
                  isCurrent: { type: 'boolean', description: 'Whether this is current education' },
                  GPA: { type: 'string', nullable: true, description: 'Grade Point Average' },
                  duration: { type: 'string', nullable: true, description: 'Calculated duration (e.g., "2 years 6 months")' }
                },
                required: ['university', 'startMonth', 'startYear', 'isCurrent']
              },
              description: 'Structured education data with separate date fields'
            },
            experienceData: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  company: { type: 'string', description: 'Company name' },
                  position: { type: 'string', description: 'Job position/title' },
                  description: { type: 'string', nullable: true, description: 'Job description' },
                  startMonth: { type: 'integer', minimum: 1, maximum: 12, description: 'Start month (1-12)' },
                  startYear: { type: 'integer', minimum: 1900, maximum: 2100, description: 'Start year' },
                  endMonth: { type: 'integer', minimum: 1, maximum: 12, nullable: true, description: 'End month (1-12), null if current' },
                  endYear: { type: 'integer', minimum: 1900, maximum: 2100, nullable: true, description: 'End year, null if current' },
                  isCurrent: { type: 'boolean', description: 'Whether this is current position' },
                  positionLevel: { type: 'string', nullable: true, description: 'Position level (entry level, mid level, senior level, etc.)' },
                  duration: { type: 'string', nullable: true, description: 'Calculated duration (e.g., "3 years 2 months")' }
                },
                required: ['company', 'position', 'startMonth', 'startYear', 'isCurrent']
              },
              description: 'Structured experience data with separate date fields'
            }
          },
          required: ['name', 'email', 'status']
        },
        CandidateUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', nullable: true },
            positionId: { type: 'string', format: 'uuid', nullable: true },
            recruiterId: { type: 'string', format: 'uuid', nullable: true },
            fitScore: { type: 'number', minimum: 0, maximum: 100 },
            status: { type: 'string', minLength: 1 },
            parsedData: { type: 'object', additionalProperties: true, nullable: true },
            customAttributes: { type: 'object', additionalProperties: true, nullable: true },
            resumePath: { type: 'string', nullable: true }
          }
        },
        Position: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            department: { type: 'string' },
            description: { type: 'string', nullable: true },
            isOpen: { type: 'boolean' },
            positionLevel: { type: 'string', nullable: true },
            customAttributes: { type: 'object', additionalProperties: true, nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['title', 'department', 'isOpen']
        },
        PositionCreate: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1 },
            department: { type: 'string', minLength: 1 },
            description: { type: 'string', nullable: true },
            isOpen: { type: 'boolean' },
            positionLevel: { type: 'string', nullable: true },
            customAttributes: { type: 'object', additionalProperties: true, nullable: true }
          },
          required: ['title', 'department', 'isOpen']
        },
        PositionUpdate: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1 },
            department: { type: 'string', minLength: 1 },
            description: { type: 'string', nullable: true },
            isOpen: { type: 'boolean' },
            positionLevel: { type: 'string', nullable: true },
            customAttributes: { type: 'object', additionalProperties: true, nullable: true }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['Admin', 'Recruiter', 'Manager'] },
            modulePermissions: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['name', 'email', 'role']
        },
        UserCreate: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            role: { type: 'string', enum: ['Admin', 'Recruiter', 'Manager'] },
            modulePermissions: { type: 'array', items: { type: 'string' } }
          },
          required: ['name', 'email', 'password', 'role']
        },
        UserUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['Admin', 'Recruiter', 'Manager'] },
            modulePermissions: { type: 'array', items: { type: 'string' } }
          }
        },
        RecruitmentStage: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            is_system: { type: 'boolean' },
            sort_order: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['name', 'is_system', 'sort_order']
        },
        RecruitmentStageCreate: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string', nullable: true },
            sort_order: { type: 'integer', default: 0 }
          },
          required: ['name']
        },
        RecruitmentStageUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string', nullable: true },
            sort_order: { type: 'integer' }
          }
        },
        CustomFieldDefinition: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            model_name: { type: 'string' },
            field_key: { type: 'string' },
            label: { type: 'string' },
            field_type: { type: 'string', enum: ['text', 'number', 'boolean', 'select', 'date'] },
            options: { type: 'object', additionalProperties: true, nullable: true },
            is_required: { type: 'boolean' },
            sort_order: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['model_name', 'field_key', 'label', 'field_type', 'is_required', 'sort_order']
        },
        CustomFieldDefinitionCreate: {
          type: 'object',
          properties: {
            model_name: { type: 'string' },
            field_key: { type: 'string' },
            label: { type: 'string' },
            field_type: { type: 'string', enum: ['text', 'number', 'boolean', 'select', 'date'] },
            options: { type: 'object', additionalProperties: true, nullable: true },
            is_required: { type: 'boolean' },
            sort_order: { type: 'integer' }
          },
          required: ['model_name', 'field_key', 'label', 'field_type', 'is_required', 'sort_order']
        },
        UploadQueueItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            file_name: { type: 'string' },
            file_size: { type: 'integer' },
            status: { type: 'string', enum: ['queued', 'processing', 'completed', 'failed'] },
            source: { type: 'string' },
            upload_id: { type: 'string', format: 'uuid' },
            created_by: { type: 'string', format: 'uuid' },
            upload_date: { type: 'string', format: 'date-time' }
          }
        },
        UploadQueueCreate: {
          type: 'object',
          properties: {
            file_name: { type: 'string' },
            file_size: { type: 'integer' },
            status: { type: 'string', enum: ['queued', 'processing', 'completed', 'failed'] },
            source: { type: 'string' },
            upload_id: { type: 'string', format: 'uuid' },
            file_path: { type: 'string' },
            webhook_payload: { type: 'object', additionalProperties: true }
          },
          required: ['file_name', 'file_size', 'status', 'source', 'upload_id', 'file_path']
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            message: { type: 'string' },
            type: { type: 'string', enum: ['info', 'warning', 'error', 'success'] },
            isRead: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        LogEntry: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            level: { type: 'string', enum: ['INFO', 'WARN', 'ERROR', 'AUDIT'] },
            message: { type: 'string' },
            module: { type: 'string' },
            userId: { type: 'string', format: 'uuid', nullable: true },
            metadata: { type: 'object', additionalProperties: true, nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        WebhookFieldMapping: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            targetPath: { type: 'string' },
            sourcePath: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['targetPath']
        },
        WebhookFieldMappingCreate: {
          type: 'object',
          properties: {
            targetPath: { type: 'string', minLength: 1 },
            sourcePath: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true }
          },
          required: ['targetPath']
        },
        UserGroup: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['name']
        },
        UserGroupCreate: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string', nullable: true }
          },
          required: ['name']
        },
        UserGroupUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string', nullable: true }
          }
        },
        SystemSettings: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            value: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['name', 'value']
        },
        SystemSettingsUpdate: {
          type: 'object',
          properties: {
            value: { type: 'string' }
          },
          required: ['value']
        },
        UserPreferences: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            value: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['userId', 'name', 'value']
        },
        UserPreferencesUpdate: {
          type: 'object',
          properties: {
            value: { type: 'string' }
          },
          required: ['value']
        },
        NotificationSettings: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            value: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['userId', 'name', 'value']
        },
        NotificationSettingsUpdate: {
          type: 'object',
          properties: {
            value: { type: 'string' }
          },
          required: ['value']
        },
        TransitionRecord: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            candidateId: { type: 'string', format: 'uuid' },
            positionId: { type: 'string', format: 'uuid' },
            status: { type: 'string' },
            notes: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['candidateId', 'positionId', 'status']
        },
        CandidateCreateWithMatches: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', nullable: true },
            positionId: { type: 'string', format: 'uuid', nullable: true },
            recruiterId: { type: 'string', format: 'uuid', nullable: true },
            fitScore: { type: 'number', minimum: 0, maximum: 100 },
            status: { type: 'string' },
            parsedData: { type: 'object', additionalProperties: true, nullable: true },
            customAttributes: { type: 'object', additionalProperties: true, nullable: true },
            resumePath: { type: 'string', nullable: true }
          },
          required: ['name', 'email', 'status']
        },
        JobMatch: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Job match ID (auto-generated)' },
            fit_score: { type: 'number', minimum: 0, maximum: 100, description: 'Fit score between 0-100' },
            job_id: { type: 'string', format: 'uuid', description: 'Position ID to match with' },
            match_reasons: { type: 'array', items: { type: 'string' }, description: 'Array of reasons for the match' },
            position_title: {
              type: 'string',
              nullable: true,
              description: 'Position title (automatically retrieved from Position table - do not include in requests)'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp (automatically set - do not include in requests)'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp (automatically set - do not include in requests)'
            }
          },
          required: ['fit_score', 'job_id'],
          description: 'Job match information. Note: position_title, created_at, and updated_at are automatically handled and should not be included in request bodies.'
        },
        JobMatchRequest: {
          type: 'object',
          properties: {
            fit_score: { type: 'number', minimum: 0, maximum: 100, description: 'Fit score between 0-100' },
            job_id: { type: 'string', format: 'uuid', description: 'Position ID to match with' },
            match_reasons: { type: 'array', items: { type: 'string' }, description: 'Array of reasons for the match' }
          },
          required: ['fit_score', 'job_id'],
          description: 'Job match request data. Only includes fields that need to be provided in requests.'
        },
        JobApplied: {
          type: 'object',
          properties: {
            fit_score: { type: 'number', minimum: 0, maximum: 100 },
            job_id: { type: 'string', format: 'uuid' },
            justification: { type: 'array', items: { type: 'string' } }
          },
          required: ['fit_score', 'job_id']
        },
        Attachment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            candidateId: { type: 'string', format: 'uuid' },
            uploadedById: { type: 'string', format: 'uuid' },
            filePath: { type: 'string' },
            fileName: { type: 'string' },
            isPrimary: { type: 'boolean' },
            uploadedAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            url: { type: 'string', description: 'Public URL to access the attachment file' },
            label: { type: 'string', enum: ['resume', 'certificate', 'other'] },
            uploadedBy: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string', nullable: true },
                email: { type: 'string', nullable: true }
              }
            }
          }
        },
        StructuredEducationEntry: {
          type: 'object',
          properties: {
            university: { type: 'string', description: 'University name' },
            major: { type: 'string', nullable: true, description: 'Major/degree field' },
            field: { type: 'string', nullable: true, description: 'Field of study' },
            campus: { type: 'string', nullable: true, description: 'Campus location' },
            startMonth: { type: 'integer', minimum: 1, maximum: 12, description: 'Start month (1-12)' },
            startYear: { type: 'integer', minimum: 1900, maximum: 2100, description: 'Start year' },
            endMonth: { type: 'integer', minimum: 1, maximum: 12, nullable: true, description: 'End month (1-12), null if current' },
            endYear: { type: 'integer', minimum: 1900, maximum: 2100, nullable: true, description: 'End year, null if current' },
            isCurrent: { type: 'boolean', description: 'Whether this is current education' },
            GPA: { type: 'string', nullable: true, description: 'Grade Point Average' },
            duration: { type: 'string', nullable: true, description: 'Calculated duration (e.g., "2 years 6 months")' }
          },
          required: ['university', 'startMonth', 'startYear', 'isCurrent']
        },
        StructuredExperienceEntry: {
          type: 'object',
          properties: {
            company: { type: 'string', description: 'Company name' },
            position: { type: 'string', description: 'Job position/title' },
            description: { type: 'string', nullable: true, description: 'Job description' },
            startMonth: { type: 'integer', minimum: 1, maximum: 12, description: 'Start month (1-12)' },
            startYear: { type: 'integer', minimum: 1900, maximum: 2100, description: 'Start year' },
            endMonth: { type: 'integer', minimum: 1, maximum: 12, nullable: true, description: 'End month (1-12), null if current' },
            endYear: { type: 'integer', minimum: 1900, maximum: 2100, nullable: true, description: 'End year, null if current' },
            isCurrent: { type: 'boolean', description: 'Whether this is current position' },
            positionLevel: { type: 'string', nullable: true, description: 'Position level (entry level, mid level, senior level, etc.)' },
            duration: { type: 'string', nullable: true, description: 'Calculated duration (e.g., "3 years 2 months")' }
          },
          required: ['company', 'position', 'startMonth', 'startYear', 'isCurrent']
        }
      }
    },
    tags: [
      { name: 'V1 Authentication', description: 'External API authentication endpoints' },
      { name: 'V1 Positions', description: 'External API for positions' },
      { name: 'V1 Candidates', description: 'External API for candidates' },
      { name: 'Job Applied', description: 'Job application information endpoints' },
      { name: 'Job Matches', description: 'Job matching endpoints' },
      { name: 'Attachments', description: 'File attachment endpoints' }
    ]
  };
}

export default getSwaggerSpec(); 