import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

// Mock the database and auth modules
vi.mock('@/lib/db', () => ({
  getPool: vi.fn(() => ({
    connect: vi.fn(() => ({
      query: vi.fn(),
      release: vi.fn(),
    })),
  })),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
  getServerSession: vi.fn(() => Promise.resolve({
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'Admin',
      modulePermissions: ['CANDIDATES_MANAGE', 'CANDIDATES_EXPORT']
    }
  })),
}));

vi.mock('@/lib/auditLog', () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

// Import the handlers
import { GET as exportHandler, POST as importHandler } from '@/app/api/candidates/import/route';

describe('Candidates Import/Export API', () => {
  let mockClient: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup mock client
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    
    const { getPool } = require('@/lib/db');
    getPool.mockReturnValue({
      connect: vi.fn(() => Promise.resolve(mockClient)),
    });
  });

  describe('Export Template (GET /api/candidates/import)', () => {
    it('should generate import template with correct structure', async () => {
      const { req } = createMocks<NextRequest>({
        method: 'GET',
        url: '/api/candidates/import',
      });

      const response = await exportHandler(req);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(response.headers.get('content-disposition')).toBe(
        'attachment; filename="candidates_import_template.xlsx"'
      );

      // Verify the response is a valid Excel file
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      // Check that it has the expected worksheets
      expect(workbook.SheetNames).toContain('Import Template');
      expect(workbook.SheetNames).toContain('Instructions');
      
      // Check the template data structure
      const templateSheet = workbook.Sheets['Import Template'];
      const templateData = XLSX.utils.sheet_to_json(templateSheet);
      
      expect(templateData).toHaveLength(1);
      const templateRow = templateData[0] as any;
      
      // Check required fields
      expect(templateRow['ID']).toBe('');
      expect(templateRow['Name*']).toBe('John Doe');
      expect(templateRow['Email*']).toBe('john.doe@example.com');
      expect(templateRow['Status*']).toBe('Applied');
      
      // Check optional fields
      expect(templateRow['Phone']).toBe('+1234567890');
      expect(templateRow['Position Name']).toBe('Software Engineer');
      expect(templateRow['Recruiter Name']).toBe('Jane Smith');
      expect(templateRow['Fit Score (0-100)']).toBe('85');
    });
  });

  describe('Import Candidates (POST /api/candidates/import)', () => {
    it('should create new candidates when ID is blank', async () => {
      // Create test data
      const testData = [
        {
          'ID': '',
          'Name*': 'Jane Smith',
          'Email*': 'jane.smith@example.com',
          'Phone': '+1234567890',
          'Status*': 'Applied',
          'Fit Score (0-100)': '85',
          'Position Name': 'Software Engineer',
          'Location': 'New York, NY',
          'Introduction/About Me': 'Experienced developer',
          'Education (JSON)': '[{"degree":"BS","school":"MIT","year":2020}]',
          'Experience (JSON)': '[{"title":"Developer","company":"Tech Corp","duration":"2020-2024"}]',
          'Skills (JSON)': '["JavaScript","React","Node.js"]',
          'Job Suitable (JSON)': '[{"jobTitle":"Senior Developer","fitScore":0.9}]',
          'Custom Attributes (JSON)': '{"source":"LinkedIn","priority":"High"}'
        }
      ];

      // Create Excel file
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(testData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test');
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Mock database responses
      mockClient.query
        .mockResolvedValueOnce({ rowCount: 0 }) // No existing candidate found
        .mockResolvedValueOnce({ rowCount: 1 }); // Insert successful

      const formData = new FormData();
      const file = new File([excelBuffer], 'test-import.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      formData.append('file', file);

      const { req } = createMocks<NextRequest>({
        method: 'POST',
        url: '/api/candidates/import',
        headers: {
          'content-type': 'multipart/form-data',
        },
      });

      // Mock FormData
      Object.defineProperty(req, 'formData', {
        value: vi.fn(() => Promise.resolve(formData)),
      });

      const response = await importHandler(req);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.message).toBe('Import completed successfully');
      expect(result.results.created).toBe(1);
      expect(result.results.updated).toBe(0);
      expect(result.results.errors).toHaveLength(0);
    });

    it('should update existing candidates when ID is provided', async () => {
      const existingId = uuidv4();
      
      // Create test data with existing ID
      const testData = [
        {
          'ID': existingId,
          'Name*': 'Updated Name',
          'Email*': 'updated@example.com',
          'Phone': '+1234567890',
          'Status*': 'Interviewing',
          'Fit Score (0-100)': '90',
          'Position Name': 'Senior Engineer',
          'Location': 'San Francisco, CA',
          'Introduction/About Me': 'Updated introduction',
          'Education (JSON)': '[{"degree":"MS","school":"Stanford","year":2022}]',
          'Experience (JSON)': '[{"title":"Senior Developer","company":"Big Tech","duration":"2022-2024"}]',
          'Skills (JSON)': '["Python","Django","AWS"]',
          'Job Suitable (JSON)': '[{"jobTitle":"Lead Developer","fitScore":0.95}]',
          'Custom Attributes (JSON)': '{"source":"Indeed","priority":"Medium"}'
        }
      ];

      // Create Excel file
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(testData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test');
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Mock database responses
      mockClient.query
        .mockResolvedValueOnce({ rowCount: 1 }) // Update successful
        .mockResolvedValueOnce({ rowCount: 1 }); // Commit successful

      const formData = new FormData();
      const file = new File([excelBuffer], 'test-update.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      formData.append('file', file);

      const { req } = createMocks<NextRequest>({
        method: 'POST',
        url: '/api/candidates/import',
        headers: {
          'content-type': 'multipart/form-data',
        },
      });

      // Mock FormData
      Object.defineProperty(req, 'formData', {
        value: vi.fn(() => Promise.resolve(formData)),
      });

      const response = await importHandler(req);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.message).toBe('Import completed successfully');
      expect(result.results.created).toBe(0);
      expect(result.results.updated).toBe(1);
      expect(result.results.errors).toHaveLength(0);
    });

    it('should handle validation errors', async () => {
      // Create test data with invalid email
      const testData = [
        {
          'ID': '',
          'Name*': 'Invalid User',
          'Email*': 'invalid-email', // Invalid email format
          'Status*': 'Applied',
        }
      ];

      // Create Excel file
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(testData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test');
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const formData = new FormData();
      const file = new File([excelBuffer], 'test-invalid.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      formData.append('file', file);

      const { req } = createMocks<NextRequest>({
        method: 'POST',
        url: '/api/candidates/import',
        headers: {
          'content-type': 'multipart/form-data',
        },
      });

      // Mock FormData
      Object.defineProperty(req, 'formData', {
        value: vi.fn(() => Promise.resolve(formData)),
      });

      const response = await importHandler(req);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Validation failed');
      expect(result.details).toHaveLength(1);
      expect(result.details[0].email).toBe('invalid-email');
      expect(result.details[0].errors.email).toContain('Invalid email format');
    });

    it('should handle unsupported file types', async () => {
      const formData = new FormData();
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      formData.append('file', file);

      const { req } = createMocks<NextRequest>({
        method: 'POST',
        url: '/api/candidates/import',
        headers: {
          'content-type': 'multipart/form-data',
        },
      });

      // Mock FormData
      Object.defineProperty(req, 'formData', {
        value: vi.fn(() => Promise.resolve(formData)),
      });

      const response = await importHandler(req);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Unsupported file type. Please upload Excel (.xlsx, .xls) or CSV files.');
    });
  });

  describe('Export Candidates (GET /api/candidates/export)', () => {
    it('should export candidates in Excel format', async () => {
      // Mock database response with test candidates
      const mockCandidates = [
        {
          id: uuidv4(),
          name: 'Test Candidate',
          email: 'test@example.com',
          phone: '+1234567890',
          positionId: uuidv4(),
          position_title: 'Software Engineer',
          recruiterId: uuidv4(),
          recruiter_name: 'Test Recruiter',
          fitScore: 0.85,
          status: 'Applied',
          applicationDate: '2024-01-15',
          parsedData: {
            personal_info: {
              location: 'New York, NY',
              introduction_aboutme: 'Test introduction'
            },
            education: [{ degree: 'BS', school: 'MIT', year: 2020 }],
            experience: [{ title: 'Developer', company: 'Tech Corp', duration: '2020-2024' }],
            skills: ['JavaScript', 'React', 'Node.js'],
            job_suitable: [{ jobTitle: 'Senior Developer', fitScore: 0.9 }]
          },
          customAttributes: { source: 'LinkedIn', priority: 'High' },
          job_matches: []
        }
      ];

      mockClient.query.mockResolvedValueOnce({
        rows: mockCandidates
      });

      const { req } = createMocks<NextRequest>({
        method: 'GET',
        url: '/api/candidates/export?format=excel',
      });

      const response = await exportHandler(req);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(response.headers.get('content-disposition')).toBe(
        'attachment; filename="candidates_export.xlsx"'
      );

      // Verify the response is a valid Excel file with expected data
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      expect(workbook.SheetNames).toContain('Candidates Export');
      
      const exportSheet = workbook.Sheets['Candidates Export'];
      const exportData = XLSX.utils.sheet_to_json(exportSheet);
      
      expect(exportData).toHaveLength(1);
      const exportRow = exportData[0] as any;
      
      // Check that ID is included for import compatibility
      expect(exportRow['ID']).toBe(mockCandidates[0].id);
      expect(exportRow['Name*']).toBe('Test Candidate');
      expect(exportRow['Email*']).toBe('test@example.com');
      expect(exportRow['Phone']).toBe('+1234567890');
      expect(exportRow['Status*']).toBe('Applied');
      expect(exportRow['Fit Score (0-100)']).toBe('85'); // Should be converted to percentage
      expect(exportRow['Position Name']).toBe('Software Engineer');
      expect(exportRow['Recruiter Name']).toBe('Test Recruiter');
      expect(exportRow['Location']).toBe('New York, NY');
      expect(exportRow['Introduction/About Me']).toBe('Test introduction');
    });
  });
});
