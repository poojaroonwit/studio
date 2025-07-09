// Comprehensive OpenAPI 3.0 specification for Studio API
const swaggerSpec = {
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
      url: 'http://10.0.10.71:8021',
      description: 'Remote server'
    },
    { 
      url: 'http://localhost:8021',
      description: 'Local development'
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
          { name: 'position_level', in: 'query', description: 'Filter by position level', schema: { type: 'string' } },
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
                  position_level: { type: 'string', nullable: true },
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
                  position_level: { type: 'string', nullable: true },
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
        description: 'Creates a new candidate. Accepts both the new and legacy formats. Requires Bearer token authentication.',
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
                      contact_info: {
                        type: 'object',
                        properties: {
                          email: { type: 'string', format: 'email' },
                          phone: { type: 'string' }
                        },
                        required: ['email']
                      },
                      cv_language: { type: 'string' },
                      education: { type: 'array', items: { type: 'object' } },
                      experience: { type: 'array', items: { type: 'object' } },
                      job_suitable: { type: 'array', items: { type: 'object' } },
                      personal_info: {
                        type: 'object',
                        properties: {
                          title_honorific: { type: 'string' },
                          firstname: { type: 'string' },
                          lastname: { type: 'string' },
                          nickname: { type: 'string' },
                          location: { type: 'string' },
                          introduction_aboutme: { type: 'string' }
                        },
                        required: ['firstname', 'lastname']
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
                      }
                    },
                    required: ['contact_info', 'personal_info']
                  },
                  job_matches: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  job_applied: {
                    type: 'object',
                    properties: {
                      fit_score: { type: 'integer' },
                      job_id: { type: 'string' },
                      justification: { type: 'array', items: { type: 'string' } }
                    }
                  }
                },
                required: ['candidate_info']
              },
              example: {
                candidate_info: {
                  contact_info: {
                    email: 'natthanon.suw@gmail.com',
                    phone: '080-222-2222'
                  },
                  cv_language: 'Thai',
                  education: [
                    {
                      major: 'Computer Engineering',
                      field: 'Engineering',
                      period: 'August 2014 - July 2018',
                      duration: '4 years',
                      GPA: '3.45',
                      university: 'Chiang Mai University',
                      campus: 'Chiang Mai'
                    }
                  ],
                  experience: [
                    {
                      company: 'AddVentures by SCG',
                      position: 'Software Engineer',
                      description: 'Coding and modifying system as assigned.\nDebugging and solving problem that is occurred in the system.',
                      period: 'January 2019 - Present',
                      duration: '4 years 9 months',
                      is_current_position: 'Present',
                      postition_level: 'Entry-Level'
                    }
                  ],
                  job_suitable: [
                    {
                      suitable_career: 'Software Engineer',
                      suitable_job_position: 'Software Engineer',
                      suitable_job_level: 'Entry-Level',
                      suitable_salary_bath_month: '25,000 - 35,000'
                    }
                  ],
                  personal_info: {
                    title_honorific: 'Mr.',
                    firstname: 'Natthanon',
                    lastname: 'Suwanawatanakul',
                    nickname: 'Nat',
                    location: 'Bangkok, Thailand',
                    introduction_aboutme: 'Enthusiastic programmer who loves coding and solving problem. Very responsible and can work as a team.'
                  },
                  skills: [
                    {
                      segment_skill: 'Programming Language',
                      skill: ['C#.Net', 'SQL', 'Javascript', 'Typescript', 'HTML', 'CSS']
                    }
                  ]
                },
                job_matches: [
                  {
                    fit_score: 20,
                    job_id: "22222222-2222-2222-2222-222222222222",
                    match_reasons: []
                  },
                  {
                    fit_score: 85,
                    job_id: "11111111-1111-1111-1111-111111111111",
                    match_reasons: [
                      "The candidate has 4 years 9 months of experience as a Software Engineer at AddVentures by SCG, aligning with the job's requirement.",
                      "The candidate's skill set includes C#.Net, SQL, Javascript, Typescript, HTML, CSS, ASP.Net, ReactJS, NodeJS, Microsoft SQL Server, MySQL, MongoDB, Microsoft Visual Studio, Microsoft SQL Management Studio, VSCode, and Git, many of which are relevant to software development.",
                      "The candidate's education in Computer Engineering from Chiang Mai University demonstrates a strong foundation in the field."
                    ]
                  }
                ],
                job_applied: {
                  fit_score: 0,
                  job_id: 'f2f306cf-09e2-4bef-8a99-4311acbc71a2',
                  justification: ['The job position was not found, therefore, a score of 0 is given.']
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
                    message: { type: 'string' },
                    candidate: { type: 'object' }
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
        description: 'Updates a candidate. Requires Bearer token authentication and Admin or CANDIDATES_MANAGE permission.',
        tags: ['V1 Candidates'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Candidate' }
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
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          positionTitle: { type: 'string', nullable: true },
          recruiterName: { type: 'string', nullable: true }
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
          position_level: { type: 'string', nullable: true },
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
          position_level: { type: 'string', nullable: true },
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
          position_level: { type: 'string', nullable: true },
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
          id: { type: 'string', format: 'uuid' },
          jobId: { type: 'string', format: 'uuid' },
          matchScore: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['jobId', 'matchScore']
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
      }
    }
  },
  tags: [
    { name: 'V1 Authentication', description: 'External API authentication endpoints' },
    { name: 'V1 Positions', description: 'External API for positions' },
    { name: 'V1 Candidates', description: 'External API for candidates' }
  ]
};

export default swaggerSpec; 