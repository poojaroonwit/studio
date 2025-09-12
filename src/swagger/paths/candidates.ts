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
  '/api/v1/candidates/{id}/job-applied': {
    get: {
      summary: 'Get candidate job applications (v1 API)',
      description: 'Returns job applications for a specific candidate. Requires Bearer token authentication.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string' } }
      ],
      responses: {
        '200': {
          description: 'Job applications retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/JobApplication' }
              }
            }
          }
        },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Candidate not found' }
      }
    }
  },
  '/api/v1/candidates/{id}/job-matches': {
    get: {
      summary: 'Get candidate job matches (v1 API)',
      description: 'Returns job matches for a specific candidate. Requires Bearer token authentication.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string' } }
      ],
      responses: {
        '200': {
          description: 'Job matches retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/JobMatch' }
              }
            }
          }
        },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Candidate not found' }
      }
    }
  },
  '/api/v1/candidates/{id}/job-matches/add': {
    post: {
      summary: 'Add job match for candidate (v1 API)',
      description: 'Adds a job match for a specific candidate. Requires Bearer token authentication.',
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
                positionId: { type: 'string' },
                matchScore: { type: 'number' },
                notes: { type: 'string', nullable: true }
              },
              required: ['positionId']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Job match added successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/JobMatch' } } }
        },
        '400': { description: 'Invalid input data' },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Candidate not found' }
      }
    }
  },
  '/api/v1/candidates/{id}/job-matches/{matchId}': {
    get: {
      summary: 'Get specific job match (v1 API)',
      description: 'Returns a specific job match for a candidate. Requires Bearer token authentication.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string' } },
        { name: 'matchId', in: 'path', required: true, description: 'Match ID', schema: { type: 'string' } }
      ],
      responses: {
        '200': {
          description: 'Job match retrieved successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/JobMatch' } } }
        },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Candidate or match not found' }
      }
    },
    put: {
      summary: 'Update job match (v1 API)',
      description: 'Updates a specific job match. Requires Bearer token authentication.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string' } },
        { name: 'matchId', in: 'path', required: true, description: 'Match ID', schema: { type: 'string' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                matchScore: { type: 'number' },
                notes: { type: 'string', nullable: true },
                status: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Job match updated successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/JobMatch' } } }
        },
        '400': { description: 'Invalid input data' },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Candidate or match not found' }
      }
    },
    delete: {
      summary: 'Delete job match (v1 API)',
      description: 'Deletes a specific job match. Requires Bearer token authentication.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string' } },
        { name: 'matchId', in: 'path', required: true, description: 'Match ID', schema: { type: 'string' } }
      ],
      responses: {
        '200': { description: 'Job match deleted successfully' },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Candidate or match not found' }
      }
    }
  },
  '/api/v1/candidates/{id}/attachments': {
    get: {
      summary: 'Get candidate attachments (v1 API)',
      description: 'Returns attachments for a specific candidate. Requires Bearer token authentication.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string' } }
      ],
      responses: {
        '200': {
          description: 'Attachments retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/Attachment' }
              }
            }
          }
        },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Candidate not found' }
      }
    },
    post: {
      summary: 'Upload candidate attachment (v1 API)',
      description: 'Uploads an attachment for a specific candidate. Requires Bearer token authentication.',
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
                file: { type: 'string', format: 'binary' },
                type: { type: 'string' },
                description: { type: 'string', nullable: true }
              },
              required: ['file']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Attachment uploaded successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Attachment' } } }
        },
        '400': { description: 'Invalid file or input' },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Candidate not found' }
      }
    }
  },
  '/api/v1/candidates/{id}/avatar': {
    post: {
      summary: 'Upload candidate avatar (v1 API)',
      description: 'Uploads an avatar for a specific candidate. Requires Bearer token authentication.',
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
                file: { type: 'string', format: 'binary' }
              },
              required: ['file']
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
                  avatarUrl: { type: 'string' }
                }
              }
            }
          }
        },
        '400': { description: 'Invalid file' },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Candidate not found' }
      }
    }
  },
  '/api/v1/candidates/{id}/resumes': {
    get: {
      summary: 'Get candidate resumes (v1 API)',
      description: 'Returns resumes for a specific candidate. Requires Bearer token authentication.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string' } }
      ],
      responses: {
        '200': {
          description: 'Resumes retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/Resume' }
              }
            }
          }
        },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Candidate not found' }
      }
    },
    post: {
      summary: 'Upload candidate resume (v1 API)',
      description: 'Uploads a resume for a specific candidate. Requires Bearer token authentication.',
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
                file: { type: 'string', format: 'binary' },
                title: { type: 'string', nullable: true },
                isPrimary: { type: 'boolean', default: false }
              },
              required: ['file']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Resume uploaded successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Resume' } } }
        },
        '400': { description: 'Invalid file or input' },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Candidate not found' }
      }
    }
  },
  '/api/v1/candidates/{id}/source': {
    get: {
      summary: 'Get candidate source (v1 API)',
      description: 'Returns the source information for a specific candidate. Requires Bearer token authentication.',
      tags: ['V1 Candidates'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Candidate ID', schema: { type: 'string' } }
      ],
      responses: {
        '200': {
          description: 'Candidate source retrieved successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CandidateSource' } } }
        },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Candidate not found' }
      }
    },
    put: {
      summary: 'Update candidate source (v1 API)',
      description: 'Updates the source information for a specific candidate. Requires Bearer token authentication.',
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
                sourceId: { type: 'string' },
                sourceUrl: { type: 'string', nullable: true },
                sourceNotes: { type: 'string', nullable: true }
              },
              required: ['sourceId']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Candidate source updated successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CandidateSource' } } }
        },
        '400': { description: 'Invalid input data' },
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
      summary: 'Upload CV with optional additional attachments (v1 API)',
      description: 'Upload a single CV file for a candidate with optional additional attachments (e.g., cover letters, portfolios, certificates). Requires Bearer token authentication.',
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
                  description: 'Main CV file (PDF)'
                },
                positionId: {
                  type: 'string',
                  description: 'Position ID to assign the candidate to'
                },
                sourceId: {
                  type: 'string',
                  description: 'Source ID for tracking the candidate source'
                },
                additionalAttachments: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'binary'
                  },
                  description: 'Optional additional attachments (e.g., cover letters, portfolios, certificates). Can upload multiple files.'
                }
              },
              required: ['file', 'positionId']
            }
          }
        }
      },
      responses: {
        '200': { 
          description: 'CV uploaded successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  uploadQueueJob: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      file_name: { type: 'string' },
                      file_size: { type: 'number' },
                      status: { type: 'string' },
                      source: { type: 'string' },
                      upload_id: { type: 'string' },
                      file_path: { type: 'string' },
                      webhook_payload: { 
                        type: 'object',
                        properties: {
                          targetPositionId: { type: 'string' },
                          sourceId: { type: 'string' },
                          additionalAttachments: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                path: { type: 'string' },
                                name: { type: 'string' },
                                size: { type: 'number' },
                                type: { type: 'string' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '400': { description: 'Invalid file or missing required parameters' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden: Insufficient permissions' },
        '500': { description: 'Internal server error' }
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
