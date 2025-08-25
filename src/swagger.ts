// Comprehensive OpenAPI 3.0 specification for Studio API

export function getSwaggerSpec() {
  // Use production server URL for Swagger API testing
  const serverUrl = process.env.PRODUCTION_HOST || process.env.API_BASE_URL || 'http://app:8021';
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
        description: 'Studio API Server',
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
                },
                examples: {
                  'detailed_example': {
                    summary: 'Full Example (Recommended)',
                    value: {
                      title: 'Software Engineer',
                      department: 'Engineering',
                      description: 'Full-stack development role',
                      matchCriteria: '<h2>Match Criteria</h2><p>Evaluate candidates based on technical skills and experience.</p>',
                      isOpen: true,
                      positionLevel: 'Mid-level',
                      customAttributes: {
                        remote: true,
                        salaryRange: '100k-150k',
                        benefits: ['Health Insurance', 'Stock Options']
                      }
                    }
                  },
                  'minimal_example': {
                    summary: 'Minimal Example',
                    value: {
                      title: 'Software Engineer',
                      department: 'Engineering',
                      isOpen: true
                    }
                  }
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
          description: 'Updates a position. Only the fields you want to update need to be included in the request. Requires Bearer token authentication and Admin or POSITIONS_MANAGE permission.',
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
                    matchCriteria: { type: 'string', nullable: true, description: 'Match criteria in HTML format' },
                    isOpen: { type: 'boolean' },
                    positionLevel: { type: 'string', nullable: true },
                    customAttributes: { type: 'object', additionalProperties: true, nullable: true }
                  }
                },
                examples: {
                  'status_update_example': {
                    summary: 'Update Status Only',
                    value: {
                      isOpen: false
                    }
                  },
                  'title_update_example': {
                    summary: 'Update Title Only',
                    value: {
                      title: 'Senior Software Engineer'
                    }
                  },
                  'match_criteria_update_example': {
                    summary: 'Update Match Criteria Only',
                    value: {
                      matchCriteria: '<h2>Updated Match Criteria</h2><p>New evaluation criteria for this position.</p>'
                    }
                  },
                  'detailed_update_example': {
                    summary: 'Full Update Example',
                    value: {
                      title: 'Senior Software Engineer',
                      department: 'Engineering',
                      description: 'Lead backend development',
                      matchCriteria: '<h2>Match Criteria</h2><p>Evaluate candidates based on technical skills and experience.</p>',
                      isOpen: false,
                      positionLevel: 'Senior',
                      customAttributes: {
                        remote: false,
                        salaryRange: '150k-200k',
                        benefits: ['Health Insurance', 'Stock Options', 'Gym Membership']
                      }
                    }
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
      '/api/test-notification': {
        post: {
          summary: 'Test notification system',
          description: 'Send test notifications to verify the notification system is working. Only available to admin users.',
          tags: ['Notifications'],
          security: [{ sessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['recruiter_assigned', 'candidate_added', 'candidate_status_change'],
                      description: 'Type of notification to test'
                    },
                    message: {
                      type: 'string',
                      description: 'Additional message for the test notification'
                    }
                  },
                  required: ['type', 'message']
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Test notification sent successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                      notification: { $ref: '#/components/schemas/Notification' }
                    }
                  }
                }
              }
            },
            '400': { description: 'Invalid notification type or missing fields' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden: Only admins can test notifications' },
            '500': { description: 'Failed to send test notification' }
          }
        }
      },
      '/api/realtime/notifications': {
        get: {
          summary: 'Get user notifications',
          description: 'Retrieve notifications for the authenticated user',
          tags: ['Notifications'],
          security: [{ sessionAuth: [] }],
          parameters: [
            { name: 'limit', in: 'query', description: 'Number of notifications to return', schema: { type: 'integer', default: 50 } },
            { name: 'offset', in: 'query', description: 'Offset for pagination', schema: { type: 'integer', default: 0 } },
            { name: 'isRead', in: 'query', description: 'Filter by read status', schema: { type: 'boolean' } }
          ],
          responses: {
            '200': {
              description: 'List of notifications',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      notifications: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
                      total: { type: 'integer' },
                      unreadCount: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' }
          }
        },
        post: {
          summary: 'Create a notification',
          description: 'Create a new notification for a user',
          tags: ['Notifications'],
          security: [{ sessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', description: 'Notification type' },
                    title: { type: 'string', description: 'Notification title' },
                    message: { type: 'string', description: 'Notification message' },
                    targetUserId: { type: 'string', description: 'Target user ID (optional, defaults to current user)' },
                    data: { type: 'object', description: 'Additional data for the notification' }
                  },
                  required: ['type', 'title', 'message']
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Notification created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      notification: { $ref: '#/components/schemas/Notification' }
                    }
                  }
                }
              }
            },
            '400': { description: 'Missing required fields' },
            '401': { description: 'Unauthorized' }
          }
        }
      },
      '/api/v1/notifications': {
        get: {
          summary: 'Get user notifications (v1 API)',
          description: 'Retrieve notifications for the authenticated user with pagination and filtering. Requires Bearer token authentication.',
          tags: ['V1 Notifications'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'limit', in: 'query', description: 'Number of notifications to return', schema: { type: 'integer', default: 50, minimum: 1, maximum: 100 } },
            { name: 'offset', in: 'query', description: 'Offset for pagination', schema: { type: 'integer', default: 0, minimum: 0 } },
            { name: 'isRead', in: 'query', description: 'Filter by read status', schema: { type: 'boolean' } }
          ],
          responses: {
            '200': {
              description: 'List of notifications',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      notifications: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
                      total: { type: 'integer' },
                      unreadCount: { type: 'integer' },
                      limit: { type: 'integer' },
                      offset: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' }
          }
        },
        post: {
          summary: 'Send custom notification (v1 API)',
          description: 'Send a custom notification to a specific user or to the current user. Supports both single and bulk notifications. Requires Bearer token authentication and CANDIDATES_MANAGE permission.',
          tags: ['V1 Notifications'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    {
                      type: 'object',
                      properties: {
                        type: { type: 'string', description: 'Notification type' },
                        title: { type: 'string', description: 'Notification title' },
                        message: { type: 'string', description: 'Notification message' },
                        targetUserId: { type: 'string', format: 'uuid', description: 'Target user ID (optional, defaults to current user)' },
                        data: { type: 'object', description: 'Additional data for the notification' }
                      },
                      required: ['type', 'title', 'message'],
                      description: 'Single notification'
                    },
                    {
                      type: 'object',
                      properties: {
                        notifications: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              type: { type: 'string', description: 'Notification type' },
                              title: { type: 'string', description: 'Notification title' },
                              message: { type: 'string', description: 'Notification message' },
                              targetUserId: { type: 'string', format: 'uuid', description: 'Target user ID' },
                              data: { type: 'object', description: 'Additional data for the notification' }
                            },
                            required: ['type', 'title', 'message', 'targetUserId']
                          },
                          minItems: 1,
                          maxItems: 100,
                          description: 'Array of notifications to send'
                        }
                      },
                      required: ['notifications'],
                      description: 'Bulk notifications'
                    }
                  ]
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Notification(s) sent successfully',
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          message: { type: 'string' },
                          notification: { $ref: '#/components/schemas/Notification' }
                        },
                        description: 'Single notification response'
                      },
                      {
                        type: 'object',
                        properties: {
                          message: { type: 'string' },
                          results: {
                            type: 'object',
                            properties: {
                              sent: { type: 'integer' },
                              failed: { type: 'integer' },
                              errors: { type: 'array', items: { type: 'string' } }
                            }
                          }
                        },
                        description: 'Bulk notification response'
                      }
                    ]
                  }
                }
              }
            },
            '400': { description: 'Invalid input or missing fields' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '500': { description: 'Error sending notification' }
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
          description: 'Creates a new candidate with structured education and experience data. Supports both legacy period strings and new structured date fields. Automatically assigns recruiter from position and sends notification to the assigned recruiter.',
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
                          description: 'Legacy education format (optional, deprecated, use educationData instead)'
                        },
                        experience: {
                          type: 'array',
                          items: { type: 'object' },
                          description: 'Legacy experience format (optional, deprecated, use experienceData instead)'
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
                          description: 'List of job suitability profiles for the candidate',
                          items: {
                            type: 'object',
                            required: ['suitable_career', 'suitable_job_position', 'suitable_job_level', 'suitable_salary_bath_month'],
                            properties: {
                              suitable_career: { type: 'string', description: 'Career path' },
                              suitable_job_position: { type: 'string', description: 'Job position' },
                              suitable_job_level: { type: 'string', description: 'Job level' },
                              suitable_salary_bath_month: { type: 'string', description: 'Desired salary (THB/month)' }
                            }
                          }
                        }
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
                  'detailed_example': {
                    summary: 'Full Example (Recommended)',
                    value: {
                      candidate_info: {
                        personal_info: {
                          firstname: 'John',
                          lastname: 'Doe',
                          title_honorific: 'Mr.',
                          nickname: 'Johnny',
                          location: 'Bangkok, Thailand',
                          introduction_aboutme: 'Experienced software engineer'
                        },
                        contact_info: {
                          email: 'john.doe@example.com',
                          phone: '+1234567890'
                        },
                        cv_language: 'English',
                        skills: [
                          { segment_skill: 'Programming', skill: ['JavaScript', 'TypeScript'] }
                        ],
                        job_suitable: [
                          {
                            suitable_career: 'Software Engineering',
                            suitable_job_position: 'Full Stack Developer',
                            suitable_job_level: 'Senior',
                            suitable_salary_bath_month: '90000'
                          }
                        ],
                        status: 'Applied'
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
                          company: 'Tech Corp',
                          position: 'Developer',
                          startMonth: 7,
                          startYear: 2022,
                          endMonth: null,
                          endYear: null,
                          isCurrent: true,
                          description: 'Developing web applications.'
                        }
                      ]
                    }
                  },
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
          description: 'Bulk import candidates from CSV or Excel files. Supports both file upload and JSON format. Automatically assigns recruiters from positions and sends notifications to assigned recruiters. Requires Bearer token authentication and CANDIDATES_MANAGE permission.',
          tags: ['V1 Import/Export', 'V1 Candidates'],
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
                      name: "Sample Candidate",
                      email: "candidate@example.com",
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
          tags: ['V1 Import/Export', 'V1 Candidates'],
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
      '/api/v1/candidates/bulk-upload-cv': {
        post: {
          summary: 'Upload CV file to queue for processing (v1 API)',
                       description: 'Upload a single CV file (PDF) to the upload queue for automated processing. The file will be processed through webhook automation to extract candidate information and create candidate records. Supports source tracking via the optional sourceId parameter and additional attachment files. The webhook will receive both the main CV URL and the additional attachment URL for processing. Requires Bearer token authentication and CANDIDATES_MANAGE permission.',
          tags: ['V1 Candidates', 'V1 Upload Queue'],
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
                      description: 'CV file in PDF format'
                    },
                    positionId: {
                      type: 'string',
                      format: 'uuid',
                      description: 'ID of the target position for this candidate'
                    },
                    sourceId: {
                      type: 'string',
                      format: 'uuid',
                      description: 'ID of the candidate source (optional)'
                    },
                    additionalAttachment: {
                      type: 'string',
                      format: 'binary',
                      description: 'Additional attachment file (optional) - can be any file type'
                    }
                  },
                  required: ['file', 'positionId']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'CV uploaded successfully and added to queue',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      uploadQueueJob: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          file_name: { type: 'string' },
                          file_size: { type: 'integer' },
                          status: { type: 'string', enum: ['queued', 'inprocess', 'completed', 'failed'] },
                          source: { type: 'string' },
                          upload_id: { type: 'string', format: 'uuid' },
                          file_path: { type: 'string' },
                          webhook_payload: { 
                            type: 'object', 
                            properties: {
                              targetPositionId: { type: 'string', format: 'uuid' },
                              sourceId: { type: 'string', format: 'uuid', nullable: true },
                              additionalAttachment: {
                                type: 'object',
                                nullable: true,
                                properties: {
                                  path: { type: 'string', description: 'MinIO object path for the attachment' },
                                  name: { type: 'string', description: 'Original filename of the attachment' },
                                  size: { type: 'integer', description: 'File size in bytes' },
                                  type: { type: 'string', description: 'MIME type of the attachment' }
                                }
                              }
                            },
                            additionalProperties: true 
                          },
                          created_by: { type: 'string', format: 'uuid' },
                          upload_date: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': { description: 'Invalid file format or missing required fields' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '500': { description: 'Internal server error or queue processing failed' }
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
          description: 'Updates a candidate. Only the fields you want to update need to be included in the request. Supports both legacy and new formats. Requires Bearer token authentication and Admin or CANDIDATES_MANAGE permission.',
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
                    sourceId: { type: 'string', format: 'uuid', nullable: true },
                    subSource: { type: 'string', nullable: true },
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
                        job_suitable: {
                          type: 'array',
                          description: 'List of job suitability profiles for the candidate',
                          items: {
                            type: 'object',
                            required: ['suitable_career', 'suitable_job_position', 'suitable_job_level', 'suitable_salary_bath_month'],
                            properties: {
                              suitable_career: { type: 'string', description: 'Career path' },
                              suitable_job_position: { type: 'string', description: 'Job position' },
                              suitable_job_level: { type: 'string', description: 'Job level' },
                              suitable_salary_bath_month: { type: 'string', description: 'Desired salary (THB/month)' }
                            }
                          }
                        },
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
                },
                examples: {
                  'status_update_example': {
                    summary: 'Update Status Only',
                    value: {
                      status: 'Shortlisted'
                    }
                  },
                  'basic_info_update_example': {
                    summary: 'Update Basic Information Only',
                    value: {
                      name: 'Sample Candidate Updated',
                      email: 'candidate.updated@example.com',
                      phone: '+1-555-0123'
                    }
                  },
                  'candidate_info_update_example': {
                    summary: 'Update Candidate Info Structure Only',
                    value: {
                      candidate_info: {
                        personal_info: {
                          firstname: 'Sample',
                          lastname: 'Candidate Updated',
                          location: 'San Francisco, CA'
                        },
                        contact_info: {
                          email: 'candidate.updated@example.com',
                          phone: '+1-555-0123'
                        }
                      }
                    }
                  },
                  'job_matches_update_example': {
                    summary: 'Update Job Matches Only',
                    value: {
                      job_matches: [
                        {
                          fitScore: 0.85,
                          jobId: 'position-uuid',
                          matchReasons: ['Strong technical skills', 'Relevant experience']
                        }
                      ]
                    }
                  },
                  'source_update_example': {
                    summary: 'Update Source Only',
                    value: {
                      sourceId: '456e7890-e89b-12d3-a456-426614174000',
                      subSource: 'LinkedIn Premium'
                    }
                  },
                  'detailed_update_example': {
                    summary: 'Full Update Example',
                    value: {
                      candidate_info: {
                        personal_info: {
                          firstname: 'Sample',
                          lastname: 'Candidate',
                          title_honorific: 'Mr.',
                          nickname: 'Sample',
                          location: 'Bangkok, Thailand',
                          introduction_aboutme: 'Updated about me section'
                        },
                        contact_info: {
                          email: 'candidate@example.com',
                          phone: '+1234567890'
                        },
                        cv_language: 'English',
                        education: [
                          {
                            major: 'Computer Science',
                            university: 'University of Technology',
                            period: '2018-2022'
                          }
                        ],
                        experience: [
                          {
                            company: 'Tech Corp',
                            position: 'Software Engineer',
                            period: '2022-Present'
                          }
                        ],
                        skills: [
                          {
                            segment_skill: 'Programming Languages',
                            skill: ['JavaScript', 'Python', 'React']
                          }
                        ],
                        job_suitable: [
                          {
                            suitable_career: 'Software Engineer',
                            suitable_job_level: 'Mid-level'
                          }
                        ],
                        status: 'active'
                      },
                      transitionNotes: 'Promoted to active after review.'
                    }
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
          description: 'Creates or updates job matches for the specified candidate. Note: positionTitle, createdAt, and updatedAt are automatically handled and should not be included in the request body. Requires Bearer token authentication.',
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
                      fitScore: 85,
                      jobId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                      matchReasons: ["Strong technical skills", "Relevant experience"]
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
          description: 'Updates job matches for the specified candidate. Note: positionTitle, createdAt, and updatedAt are automatically handled and should not be included in the request body. Requires Bearer token authentication.',
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
                      fitScore: 90,
                      jobId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                      matchReasons: ["Updated match reasons"]
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
          description: 'Adds a new job match for the specified candidate. Note: positionTitle, createdAt, and updatedAt are automatically handled and should not be included in the request body. Requires Bearer token authentication.',
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
                    fitScore: { type: 'number', minimum: 0, maximum: 100, description: 'Fit score between 0-100' },
                    jobId: { type: 'string', format: 'uuid', description: 'Position ID to match with' },
                    matchReasons: { type: 'array', items: { type: 'string' }, description: 'Array of reasons for the match' }
                  },
                  required: ['fitScore', 'jobId']
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
          description: 'Updates a specific job match for the specified candidate. Note: positionTitle, createdAt, and updatedAt are automatically handled and should not be included in the request body. Requires Bearer token authentication.',
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
                        attachment: { type: 'string', format: 'binary', description: 'Attachment file (PDF, DOC, DOCX, RTF, TXT, JPG, PNG, GIF). Also accepts "attachments" field name.' }
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
        patch: {
          summary: 'Upload an attachment from URL for a candidate (v1 API)',
          description: 'Downloads a file from a URL and uploads it as an attachment for the specified candidate. Requires Bearer token authentication and CANDIDATES_MANAGE permission.',
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
                    fileUrl: { 
                      type: 'string', 
                      format: 'uri', 
                      description: 'URL of the file to download and upload as attachment' 
                    },
                    label: { 
                      type: 'string', 
                      description: 'Label for the attachment (default: "resume")',
                      default: 'resume'
                    }
                  },
                  required: ['fileUrl']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Attachment uploaded successfully from URL',
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
            '400': { description: 'Invalid URL or missing fileUrl' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '500': { description: 'Error downloading or uploading file' }
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
      },
      '/api/v1/candidates/clear-duplicates': {
        post: {
          summary: 'Clear duplicate candidates (v1 API)',
          description: 'Clear duplicate candidates based on email and position applied, keeping only the first candidate with a non-zero match score. Supports dry run mode to preview changes without making them. Requires Bearer token authentication and CANDIDATES_MANAGE permission.',
          tags: ['V1 Candidates', 'V1 Bulk Actions'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    dryRun: { 
                      type: 'boolean', 
                      description: 'If true, only show what would be deleted without actually deleting anything',
                      default: false
                    },
                    positionId: { 
                      type: 'string', 
                      format: 'uuid',
                      description: 'If provided, only check for duplicates within this specific position. If null or not provided, check all positions.',
                      nullable: true
                    }
                  }
                },
                examples: {
                  'dry_run_example': {
                    summary: 'Dry Run Example',
                    value: {
                      dryRun: true
                    }
                  },
                  'specific_position_example': {
                    summary: 'Clear Duplicates for Specific Position',
                    value: {
                      dryRun: false,
                      positionId: "123e4567-e89b-12d3-a456-426614174000"
                    }
                  },
                  'all_positions_example': {
                    summary: 'Clear All Duplicates',
                    value: {
                      dryRun: false
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Duplicate candidates cleared successfully',
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
                          duplicatesFound: { type: 'integer', description: 'Number of duplicate groups found' },
                          candidatesDeleted: { type: 'integer', description: 'Number of candidates deleted (only in actual run)' },
                          candidatesToDelete: { type: 'integer', description: 'Number of candidates that would be deleted (only in dry run)' },
                          keptCandidates: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', format: 'uuid' },
                                email: { type: 'string', format: 'email' },
                                positionId: { type: 'string', format: 'uuid', nullable: true },
                                fitScore: { type: 'number' },
                                createdAt: { type: 'string', format: 'date-time' }
                              }
                            }
                          },
                          candidatesToDeleteDetails: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', format: 'uuid' },
                                name: { type: 'string' },
                                email: { type: 'string', format: 'email' },
                                positionId: { type: 'string', format: 'uuid', nullable: true },
                                fitScore: { type: 'number' },
                                createdAt: { type: 'string', format: 'date-time' }
                              }
                            },
                            description: 'Only included in dry run responses'
                          },
                          dryRun: { type: 'boolean' }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': { description: 'Invalid input data' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions to manage candidates' },
            '500': { description: 'Failed to clear duplicate candidates' }
          }
        }
      },
      '/api/v1/health': {
        get: {
          summary: 'Health check (v1 API)',
          description: 'Check the health status of the API and database.',
          tags: ['V1 Health'],
          responses: {
            '200': {
              description: 'Health status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      timestamp: { type: 'string', format: 'date-time' },
                      database: {
                        type: 'object',
                        properties: {
                          status: { type: 'string' },
                          currentTime: { type: 'string' }
                        }
                      },
                      statistics: {
                        type: 'object',
                        properties: {
                          candidates: { type: 'integer' },
                          positions: { type: 'integer' },
                          users: { type: 'integer' }
                        }
                      },
                      version: { type: 'string' },
                      api: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/v1/positions/bulk-action': {
        post: {
          summary: 'Bulk action on positions (v1 API)',
          description: 'Perform bulk operations on positions.',
          tags: ['V1 Bulk Actions', 'V1 Positions'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    action: { type: 'string', enum: ['delete', 'update_status', 'update_department'] },
                    positionIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                    data: { type: 'object' }
                  },
                  required: ['action', 'positionIds']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Bulk action completed' },
            '400': { description: 'Invalid input' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' }
          }
        }
      },
      '/api/v1/positions/import': {
        get: {
          summary: 'Get position import template (v1 API)',
          description: 'Returns a template for position import.',
          tags: ['V1 Import/Export', 'V1 Positions'],
          responses: {
            '200': { description: 'Import template' },
            '401': { description: 'Unauthorized' }
          }
        },
        post: {
          summary: 'Import positions (v1 API)',
          description: 'Import positions from JSON.',
          tags: ['V1 Import/Export', 'V1 Positions'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    positions: { type: 'array', items: { $ref: '#/components/schemas/PositionCreate' } }
                  },
                  required: ['positions']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Import completed' },
            '400': { description: 'Invalid input' },
            '401': { description: 'Unauthorized' }
          }
        }
      },
      '/api/v1/positions/export': {
        get: {
          summary: 'Export positions (v1 API)',
          description: 'Export positions as CSV.',
          tags: ['V1 Import/Export', 'V1 Positions'],
          responses: {
            '200': { description: 'CSV export' },
            '401': { description: 'Unauthorized' }
          }
        }
      },
      '/api/v1/candidates/bulk-action': {
        post: {
          summary: 'Bulk action on candidates (v1 API)',
          description: 'Perform bulk operations on candidates. When using assign_position action, automatically assigns recruiters from positions and sends notifications to assigned recruiters.',
          tags: ['V1 Bulk Actions', 'V1 Candidates'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    action: { type: 'string', enum: ['delete', 'update_status', 'assign_recruiter', 'assign_position'] },
                    candidateIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                    data: { type: 'object' }
                  },
                  required: ['action', 'candidateIds']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Bulk action completed' },
            '400': { description: 'Invalid input' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' }
          }
        }
      },
      '/api/v1/candidates/{id}/resumes': {
        get: {
          summary: 'Get candidate resumes (v1 API)',
          description: 'Get resumes for a candidate.',
          tags: ['V1 Candidates'],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          responses: {
            '200': { description: 'List of resumes' },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Candidate not found' }
          }
        },
        post: {
          summary: 'Upload candidate resume (v1 API)',
          description: 'Upload a resume for a candidate.',
          tags: ['V1 Candidates'],
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
                    resume: { type: 'string', format: 'binary', description: 'Resume file' }
                  },
                  required: ['resume']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Resume uploaded' },
            '400': { description: 'Invalid file' },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Candidate not found' }
          }
        },
        put: {
          summary: 'Update candidate resume (v1 API)',
          description: 'Update resume information for a candidate.',
          tags: ['V1 Candidates'],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          },
          responses: {
            '200': { description: 'Resume updated' },
            '400': { description: 'Invalid input' },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Candidate or resume not found' }
          }
        },
        delete: {
          summary: 'Delete candidate resume (v1 API)',
          description: 'Delete a resume for a candidate.',
          tags: ['V1 Candidates'],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          responses: {
            '200': { description: 'Resume deleted' },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Candidate or resume not found' }
          }
        }
      },
      '/api/v1/candidates/{id}/source': {
        get: {
          summary: 'Get candidate source information (v1 API)',
          description: 'Returns the current source information for a specific candidate. Requires Bearer token authentication.',
          tags: ['V1 Candidates', 'V1 Source Management'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string', format: 'uuid' } }
          ],
          responses: {
            '200': {
              description: 'Candidate source information',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      candidateId: { type: 'string', format: 'uuid' },
                      candidateName: { type: 'string' },
                      sourceId: { type: 'string', format: 'uuid', nullable: true },
                      subSource: { type: 'string', nullable: true },
                      source: {
                        type: 'object',
                        nullable: true,
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          name: { type: 'string' },
                          description: { type: 'string', nullable: true },
                          email: { type: 'string', nullable: true },
                          logo: { type: 'string', format: 'uri', nullable: true }
                        }
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
        put: {
          summary: 'Update candidate source (v1 API)',
          description: 'Updates the source information for a specific candidate. Only the fields you want to update need to be included in the request. Requires Bearer token authentication and Admin or CANDIDATES_MANAGE permission.',
          tags: ['V1 Candidates', 'V1 Source Management'],
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
                    sourceId: { type: 'string', format: 'uuid', nullable: true, description: 'Source ID to assign to candidate' },
                    subSource: { type: 'string', nullable: true, description: 'Optional sub-source information' }
                  }
                },
                examples: {
                  'assign_source_example': {
                    summary: 'Assign Source',
                    value: {
                      sourceId: '456e7890-e89b-12d3-a456-426614174000',
                      subSource: 'LinkedIn Premium'
                    }
                  },
                  'remove_source_example': {
                    summary: 'Remove Source',
                    value: {
                      sourceId: null,
                      subSource: null
                    }
                  },
                  'update_subsource_example': {
                    summary: 'Update Sub-source Only',
                    value: {
                      subSource: 'LinkedIn Premium'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Candidate source updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      candidateId: { type: 'string', format: 'uuid' },
                      candidateName: { type: 'string' },
                      sourceId: { type: 'string', format: 'uuid', nullable: true },
                      subSource: { type: 'string', nullable: true },
                      source: {
                        type: 'object',
                        nullable: true,
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          name: { type: 'string' },
                          description: { type: 'string', nullable: true },
                          logo: { type: 'string', format: 'uri', nullable: true }
                        }
                      },
                      changes: {
                        type: 'object',
                        properties: {
                          sourceId: {
                            type: 'object',
                            properties: {
                              from: { type: 'string', format: 'uuid', nullable: true },
                              to: { type: 'string', format: 'uuid', nullable: true }
                            }
                          },
                          subSource: {
                            type: 'object',
                            properties: {
                              from: { type: 'string', nullable: true },
                              to: { type: 'string', nullable: true }
                            }
                          }
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
            '404': { description: 'Candidate not found' }
          }
        }
      },
      '/api/v1/users': {
        get: {
          summary: 'Get all users (v1 API)',
          description: 'Returns a paginated list of users. Requires Admin role and Bearer token authentication.',
          tags: ['V1 Users'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', description: 'Page number for pagination', schema: { type: 'integer', default: 1, minimum: 1 } },
            { name: 'limit', in: 'query', description: 'Number of items per page', schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 } },
            { name: 'role', in: 'query', description: 'Filter by user role', schema: { type: 'string', enum: ['Admin', 'Recruiter', 'User'] } },
            { name: 'searchTerm', in: 'query', description: 'Search term for name or email', schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: 'List of users',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      users: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string' },
                            email: { type: 'string', format: 'email' },
                            role: { type: 'string', enum: ['Admin', 'Recruiter', 'User'] },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' }
                          }
                        }
                      },
                      total: { type: 'integer' },
                      page: { type: 'integer' },
                      limit: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions - Admin role required' }
          }
        },
        post: {
          summary: 'Create a new user (v1 API)',
          description: 'Creates a new user. Requires Admin role.',
          tags: ['V1 Users'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', minLength: 1 },
                    email: { type: 'string', format: 'email' },
                    role: { type: 'string', enum: ['Admin', 'Recruiter', 'User'] },
                    modulePermissions: { type: 'array', items: { type: 'string' } },
                    password: { type: 'string', minLength: 8 }
                  },
                  required: ['name', 'email', 'role', 'password']
                },
                examples: {
                  'detailed_example': {
                    summary: 'Full Example (Recommended)',
                    value: {
                      name: 'Jane Smith',
                      email: 'jane.smith@example.com',
                      role: 'Recruiter',
                      modulePermissions: ['CANDIDATES_VIEW', 'CANDIDATES_MANAGE'],
                      password: 'securePassword123'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'User created successfully' },
            '400': { description: 'Invalid input data' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '409': { description: 'User with this email already exists' }
          }
        }
      },
      '/api/v1/users/{id}': {
        put: {
          summary: 'Update user by ID (v1 API)',
          description: 'Updates a user. Requires Admin role.',
          tags: ['V1 Users'],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'User ID', schema: { type: 'string' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', minLength: 1 },
                    email: { type: 'string', format: 'email' },
                    role: { type: 'string', enum: ['Admin', 'Recruiter', 'User'] },
                    modulePermissions: { type: 'array', items: { type: 'string' } },
                    password: { type: 'string', minLength: 8 }
                  }
                },
                examples: {
                  'detailed_update_example': {
                    summary: 'Full Update Example',
                    value: {
                      name: 'Jane Smith',
                      email: 'jane.smith@example.com',
                      role: 'Admin',
                      modulePermissions: ['CANDIDATES_VIEW', 'CANDIDATES_MANAGE', 'USERS_MANAGE']
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'User updated successfully' },
            '400': { description: 'Invalid input data' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '404': { description: 'User not found' }
          }
        }
      },
      '/api/upload-queue': {
        get: {
          summary: 'Get upload queue status',
          description: 'Returns the current status of all files in the upload queue. Requires authentication.',
          tags: ['Upload Queue'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', description: 'Filter by status', schema: { type: 'string', enum: ['queued', 'inprocess', 'completed', 'failed'] } },
            { name: 'source', in: 'query', description: 'Filter by source', schema: { type: 'string' } },
            { name: 'limit', in: 'query', description: 'Number of items per page', schema: { type: 'integer', default: 50 } },
            { name: 'offset', in: 'query', description: 'Offset for pagination', schema: { type: 'integer', default: 0 } }
          ],
          responses: {
            '200': {
              description: 'Upload queue status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      items: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/UploadQueueItem' }
                      },
                      total: { type: 'integer' },
                      limit: { type: 'integer' },
                      offset: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' }
          }
        },
        post: {
          summary: 'Add file to upload queue',
          description: 'Add a file to the upload queue for processing. Requires authentication and appropriate permissions.',
          tags: ['Upload Queue'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UploadQueueCreate' }
              }
            }
          },
          responses: {
            '201': {
              description: 'File added to queue successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/UploadQueueItem' }
                }
              }
            },
            '400': { description: 'Invalid request data' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' }
          }
        }
      },
      '/api/upload-queue/upload-file': {
        post: {
          summary: 'Upload multiple files to queue',
          description: 'Upload multiple CV files (up to 200) to the upload queue for bulk processing. Files are uploaded to MinIO storage and added to the processing queue. Requires authentication and BULK_UPLOAD permission.',
          tags: ['Upload Queue'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    files: {
                      type: 'array',
                      items: {
                        type: 'string',
                        format: 'binary'
                      },
                      description: 'CV files in PDF format (max 200 files)'
                    },
                    position_id: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Target position ID for the candidates'
                    },
                    batch_id: {
                      type: 'string',
                      description: 'Optional batch ID for grouping uploads'
                    },
                    source: {
                      type: 'string',
                      description: 'Source of the upload (default: bulk)'
                    },
                    webhook_payload: {
                      type: 'string',
                      description: 'JSON string with additional webhook payload data'
                    }
                  },
                  required: ['files']
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Files uploaded successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            file_name: { type: 'string' },
                            status: { type: 'string', enum: ['success', 'failed'] },
                            file_path: { type: 'string' },
                            file_size: { type: 'integer' },
                            error: { type: 'string' },
                            queue_id: { type: 'string', format: 'uuid' }
                          }
                        }
                      },
                      summary: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer' },
                          success: { type: 'integer' },
                          failed: { type: 'integer' }
                        }
                      },
                      batch_id: { type: 'string' },
                      processing_time_ms: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '207': {
              description: 'Partial success - some files failed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            file_name: { type: 'string' },
                            status: { type: 'string', enum: ['success', 'failed'] },
                            file_path: { type: 'string' },
                            file_size: { type: 'integer' },
                            error: { type: 'string' },
                            queue_id: { type: 'string', format: 'uuid' }
                          }
                        }
                      },
                      summary: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer' },
                          success: { type: 'integer' },
                          failed: { type: 'integer' }
                        }
                      },
                      batch_id: { type: 'string' },
                      processing_time_ms: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '400': { description: 'Invalid file format or too many files' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Insufficient permissions' },
            '500': { description: 'Internal server error' }
          }
        }
      },
      '/api/upload-queue/process': {
        post: {
          summary: 'Process upload queue',
          description: 'Manually trigger processing of queued files. This endpoint is typically called automatically but can be used for manual processing.',
          tags: ['Upload Queue'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Processing started successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      processed: { type: 'integer' },
                      remaining: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' },
            '500': { description: 'Processing failed' }
          }
        }
      },
      '/api/v1/recruitment-stages': {
        get: {
          summary: 'Get all recruitment stages (V1 API)',
          description: 'Returns all recruitment stages for use in filters. Requires Bearer token authentication.',
          tags: ['V1 Recruitment Stages'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'List of recruitment stages',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string' },
                            description: { type: 'string' },
                            sort_order: { type: 'integer' },
                            color_complete: { type: 'string' },
                            color_badge: { type: 'string' },
                            is_system: { type: 'boolean' }
                          }
                        }
                      },
                      timestamp: { type: 'string', format: 'date-time' },
                      path: { type: 'string' },
                      method: { type: 'string' },
                      statusCode: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized - Invalid or missing Bearer token' },
            '500': { description: 'Internal server error' }
          }
        }
      },
      '/api/v1/ai/search-candidates': {
        post: {
          summary: 'Search candidates using AI (V1 API)',
          description: 'Search candidates using AI-powered semantic search. Requires Bearer token authentication.',
          tags: ['V1 AI Search'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Search query', example: 'software engineer with React experience' },
                    positionId: { type: 'string', format: 'uuid', description: 'Optional position ID to filter results' },
                    limit: { type: 'integer', default: 20, minimum: 1, maximum: 100, description: 'Number of results to return' },
                    offset: { type: 'integer', default: 0, minimum: 0, description: 'Offset for pagination' }
                  },
                  required: ['query']
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string' },
                            email: { type: 'string' },
                            phone: { type: 'string' },
                            status: { type: 'string' },
                            fitScore: { type: 'number' },
                            matchReasons: { type: 'array', items: { type: 'string' } },
                            parsedData: { type: 'object' }
                          }
                        }
                      },
                      total: { type: 'integer', description: 'Total number of matching candidates' },
                      query: { type: 'string', description: 'The search query used' },
                      timestamp: { type: 'string', format: 'date-time' },
                      path: { type: 'string' },
                      method: { type: 'string' },
                      statusCode: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '400': { description: 'Invalid request body' },
            '401': { description: 'Unauthorized - Invalid or missing Bearer token' },
            '500': { description: 'Internal server error' }
          }
        }
      },
      '/api/v1/dashboard': {
        get: {
          summary: 'Get dashboard statistics (V1 API)',
          description: 'Returns dashboard statistics and metrics. Requires Bearer token authentication.',
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
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          candidates: {
                            type: 'object',
                            properties: {
                              total: { type: 'integer' },
                              new: { type: 'integer' },
                              inProgress: { type: 'integer' },
                              hired: { type: 'integer' },
                              rejected: { type: 'integer' }
                            }
                          },
                          positions: {
                            type: 'object',
                            properties: {
                              total: { type: 'integer' },
                              open: { type: 'integer' },
                              closed: { type: 'integer' }
                            }
                          },
                          applications: {
                            type: 'object',
                            properties: {
                              total: { type: 'integer' },
                              thisMonth: { type: 'integer' },
                              lastMonth: { type: 'integer' }
                            }
                          },
                          recruiters: {
                            type: 'object',
                            properties: {
                              total: { type: 'integer' },
                              active: { type: 'integer' }
                            }
                          },
                          recentActivity: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', format: 'uuid' },
                                type: { type: 'string' },
                                message: { type: 'string' },
                                timestamp: { type: 'string', format: 'date-time' },
                                userId: { type: 'string', format: 'uuid' },
                                userName: { type: 'string' }
                              }
                            }
                          }
                        }
                      },
                      timestamp: { type: 'string', format: 'date-time' },
                      path: { type: 'string' },
                      method: { type: 'string' },
                      statusCode: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized - Invalid or missing Bearer token' },
            '500': { description: 'Internal server error' }
          }
        }
      },
      '/api/v1/logs': {
        get: {
          summary: 'Get system logs (V1 API)',
          description: 'Returns a paginated list of system logs. Requires Bearer token authentication and Admin role or LOGS_VIEW permission.',
          tags: ['V1 Logs'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Number of items per page' },
            { name: 'level', in: 'query', schema: { type: 'string', enum: ['info', 'warning', 'error'] }, description: 'Filter logs by level' },
            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Filter logs from this date (YYYY-MM-DD)' },
            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Filter logs until this date (YYYY-MM-DD)' },
            { name: 'userId', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter logs by user ID' }
          ],
          responses: {
            '200': {
              description: 'Paginated logs',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            level: { type: 'string', enum: ['info', 'warning', 'error'] },
                            message: { type: 'string' },
                            details: { type: 'object' },
                            userId: { type: 'string', format: 'uuid' },
                            userName: { type: 'string' },
                            actionType: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' }
                          }
                        }
                      },
                      pagination: {
                        type: 'object',
                        properties: {
                          page: { type: 'integer' },
                          limit: { type: 'integer' },
                          total: { type: 'integer' },
                          totalPages: { type: 'integer' }
                        }
                      },
                      timestamp: { type: 'string', format: 'date-time' },
                      path: { type: 'string' },
                      method: { type: 'string' },
                      statusCode: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized - Invalid or missing Bearer token' },
            '403': { description: 'Forbidden - Insufficient permissions' },
            '500': { description: 'Internal server error' }
          }
        }
      },
      '/api/v1/transitions': {
        get: {
          summary: 'Get candidate transitions (V1 API)',
          description: 'Returns a list of candidate stage transitions. Requires Bearer token authentication.',
          tags: ['V1 Transitions'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'candidateId', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by candidate ID' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Number of items per page' },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 }, description: 'Offset for pagination' }
          ],
          responses: {
            '200': {
              description: 'List of transitions',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            candidateId: { type: 'string', format: 'uuid' },
                            fromStageId: { type: 'string', format: 'uuid' },
                            toStageId: { type: 'string', format: 'uuid' },
                            fromStageName: { type: 'string' },
                            toStageName: { type: 'string' },
                            notes: { type: 'string' },
                            transitionDate: { type: 'string', format: 'date-time' },
                            createdBy: { type: 'string', format: 'uuid' },
                            createdByName: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' }
                          }
                        }
                      },
                      total: { type: 'integer', description: 'Total number of transitions' },
                      timestamp: { type: 'string', format: 'date-time' },
                      path: { type: 'string' },
                      method: { type: 'string' },
                      statusCode: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized - Invalid or missing Bearer token' },
            '500': { description: 'Internal server error' }
          }
        },
        post: {
          summary: 'Create a candidate transition (V1 API)',
          description: 'Create a new candidate stage transition. Requires Bearer token authentication.',
          tags: ['V1 Transitions'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    candidateId: { type: 'string', format: 'uuid', description: 'Candidate ID' },
                    fromStageId: { type: 'string', format: 'uuid', description: 'Source stage ID' },
                    toStageId: { type: 'string', format: 'uuid', description: 'Target stage ID' },
                    notes: { type: 'string', description: 'Optional transition notes' },
                    transitionDate: { type: 'string', format: 'date-time', description: 'Optional transition date (defaults to current time)' }
                  },
                  required: ['candidateId', 'fromStageId', 'toStageId']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Transition created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Transition created successfully' },
                      data: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          candidateId: { type: 'string', format: 'uuid' },
                          fromStageId: { type: 'string', format: 'uuid' },
                          toStageId: { type: 'string', format: 'uuid' },
                          notes: { type: 'string' },
                          transitionDate: { type: 'string', format: 'date-time' },
                          createdAt: { type: 'string', format: 'date-time' }
                        }
                      },
                      timestamp: { type: 'string', format: 'date-time' },
                      path: { type: 'string' },
                      method: { type: 'string' },
                      statusCode: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '400': { description: 'Invalid request body' },
            '401': { description: 'Unauthorized - Invalid or missing Bearer token' },
            '500': { description: 'Internal server error' }
          }
        }
      },
      '/api/v1/settings': {
        get: {
          summary: 'Get system settings (V1 API)',
          description: 'Returns system settings and configuration. Requires Bearer token authentication and Admin role.',
          tags: ['V1 Settings'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'System settings',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          systemSettings: {
                            type: 'object',
                            properties: {
                              defaultMatchCriteria: { type: 'object' },
                              emailSettings: { type: 'object' },
                              fileUploadSettings: { type: 'object' }
                            }
                          },
                          userPreferences: { type: 'object' },
                          customFields: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', format: 'uuid' },
                                name: { type: 'string' },
                                type: { type: 'string' },
                                isRequired: { type: 'boolean' },
                                options: { type: 'array', items: { type: 'string' } }
                              }
                            }
                          }
                        }
                      },
                      timestamp: { type: 'string', format: 'date-time' },
                      path: { type: 'string' },
                      method: { type: 'string' },
                      statusCode: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized - Invalid or missing Bearer token' },
            '403': { description: 'Forbidden - Admin role required' },
            '500': { description: 'Internal server error' }
          }
        }
      },
      '/api/v1/candidate-sources': {
        get: {
          summary: 'Get all candidate sources (V1 API)',
          description: 'Returns all candidate sources ordered by sort order and name. Requires Bearer token authentication.',
          tags: ['V1 Settings'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'List of candidate sources',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                                                      properties: {
                              id: { type: 'string', format: 'uuid' },
                              name: { type: 'string' },
                              description: { type: 'string', nullable: true },
                              email: { type: 'string', nullable: true },
                              logo: { type: 'string', nullable: true },
                              allowSubSource: { type: 'boolean' },
                              sortOrder: { type: 'integer' },
                              isActive: { type: 'boolean' },
                              createdAt: { type: 'string', format: 'date-time' },
                              updatedAt: { type: 'string', format: 'date-time' }
                            }
                        }
                      },
                      timestamp: { type: 'string', format: 'date-time' },
                      path: { type: 'string' },
                      method: { type: 'string' },
                      statusCode: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized - Invalid or missing Bearer token' },
            '500': { description: 'Internal server error' }
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
            matchCriteria: { type: 'string', nullable: true, description: 'Match criteria in HTML format' },
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
            matchCriteria: { type: 'string', nullable: true, description: 'Match criteria in HTML format' },
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
            matchCriteria: { type: 'string', nullable: true, description: 'Match criteria in HTML format' },
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
            status: { type: 'string', enum: ['queued', 'inprocess', 'completed', 'failed'] },
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
            status: { type: 'string', enum: ['queued', 'inprocess', 'completed', 'failed'] },
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
            fitScore: { type: 'number', minimum: 0, maximum: 100, description: 'Fit score between 0-100' },
            jobId: { type: 'string', format: 'uuid', description: 'Position ID to match with' },
            matchReasons: { type: 'array', items: { type: 'string' }, description: 'Array of reasons for the match' },
            positionTitle: {
              type: 'string',
              nullable: true,
              description: 'Position title (automatically retrieved from Position table - do not include in requests)'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp (automatically set - do not include in requests)'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp (automatically set - do not include in requests)'
            }
          },
          required: ['fitScore', 'jobId'],
          description: 'Job match information. Note: positionTitle, createdAt, and updatedAt are automatically handled and should not be included in request bodies.'
        },
        JobMatchRequest: {
          type: 'object',
          properties: {
            fitScore: { type: 'number', minimum: 0, maximum: 100, description: 'Fit score between 0-100' },
            jobId: { type: 'string', format: 'uuid', description: 'Position ID to match with' },
            matchReasons: { type: 'array', items: { type: 'string' }, description: 'Array of reasons for the match' }
          },
          required: ['fitScore', 'jobId'],
          description: 'Job match request data. Only includes fields that need to be provided in requests.'
        },
        JobApplied: {
          type: 'object',
          properties: {
            fitScore: { type: 'number', minimum: 0, maximum: 100 },
            jobId: { type: 'string', format: 'uuid' },
            justification: { type: 'array', items: { type: 'string' } }
          },
          required: ['fitScore', 'jobId']
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
      { name: 'V1 Recruitment Stages', description: 'External API for recruitment stages' },
      { name: 'V1 AI Search', description: 'External API for AI-powered candidate search' },
      { name: 'V1 Dashboard', description: 'External API for dashboard statistics' },
      { name: 'V1 Logs', description: 'External API for system logs' },
      { name: 'V1 Transitions', description: 'External API for candidate stage transitions' },
      { name: 'V1 Settings', description: 'External API for system settings' },
      { name: 'Job Applied', description: 'Job application information endpoints' },
      { name: 'Job Matches', description: 'Job matching endpoints' },
      { name: 'Attachments', description: 'File attachment endpoints' },
      { name: 'V1 Health', description: 'Health check endpoints' },
      { name: 'V1 Bulk Actions', description: 'Bulk actions for positions and candidates' },
      { name: 'V1 Import/Export', description: 'Import/export templates and actions' },
      { name: 'V1 Users', description: 'External API for users' },
      { name: 'V1 Notifications', description: 'External API for notifications' },
      { name: 'Notifications', description: 'Notification system endpoints' }
    ]
  };
}

export default getSwaggerSpec(); 