import { WarningService } from '../src/lib/warningService';

// Mock Prisma
jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    warningConfiguration: {
      findMany: jest.fn(),
    },
    position: {
      findUnique: jest.fn(),
    },
    candidate: {
      findUnique: jest.fn(),
    },
    headcount: {
      findUnique: jest.fn(),
    },
  },
}));

describe('WarningService - Logical Operators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cross-Entity Conditions Evaluation', () => {
    it('should evaluate AND conditions correctly', async () => {
      const config = {
        id: '1',
        entityType: 'candidate',
        logicalOperator: 'AND',
        crossEntityConditions: [
          {
            entityType: 'position',
            field: 'hiringDate',
            condition: 'overdue',
            operator: 'gt',
            threshold: 30
          },
          {
            entityType: 'candidate',
            field: 'status',
            condition: 'custom',
            operator: 'eq',
            value: 'Active'
          }
        ]
      };

      // Mock entity data
      const mockEntity = {
        status: 'Active',
        position: {
          hiringDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
        }
      };

      // Mock the getEntityData method
      const getEntityDataSpy = jest.spyOn(WarningService as any, 'getEntityData');
      getEntityDataSpy.mockResolvedValue(mockEntity);

      const result = await WarningService.checkWarning(config, 'candidate', '1');
      
      expect(result.hasWarning).toBe(true);
    });

    it('should evaluate OR conditions correctly', async () => {
      const config = {
        id: '1',
        entityType: 'candidate',
        logicalOperator: 'OR',
        crossEntityConditions: [
          {
            entityType: 'candidate',
            field: 'email',
            condition: 'empty',
            operator: 'eq'
          },
          {
            entityType: 'candidate',
            field: 'phone',
            condition: 'empty',
            operator: 'eq'
          }
        ]
      };

      // Mock entity data
      const mockEntity = {
        email: 'test@example.com',
        phone: '' // Empty phone
      };

      // Mock the getEntityData method
      const getEntityDataSpy = jest.spyOn(WarningService as any, 'getEntityData');
      getEntityDataSpy.mockResolvedValue(mockEntity);

      const result = await WarningService.checkWarning(config, 'candidate', '1');
      
      expect(result.hasWarning).toBe(true);
    });

    it('should evaluate NOT conditions correctly', async () => {
      const config = {
        id: '1',
        entityType: 'position',
        logicalOperator: 'NOT',
        crossEntityConditions: [
          {
            entityType: 'position',
            field: 'status',
            condition: 'custom',
            operator: 'eq',
            value: 'Active'
          }
        ]
      };

      // Mock entity data
      const mockEntity = {
        status: 'Closed' // Not Active
      };

      // Mock the getEntityData method
      const getEntityDataSpy = jest.spyOn(WarningService as any, 'getEntityData');
      getEntityDataSpy.mockResolvedValue(mockEntity);

      const result = await WarningService.checkWarning(config, 'position', '1');
      
      expect(result.hasWarning).toBe(true);
    });

    it('should handle multiple cross-entity conditions with AND', async () => {
      const config = {
        id: '1',
        entityType: 'candidate',
        logicalOperator: 'AND',
        crossEntityConditions: [
          {
            entityType: 'position',
            field: 'priority',
            condition: 'custom',
            operator: 'eq',
            value: 'High'
          },
          {
            entityType: 'position',
            field: 'hiringDate',
            condition: 'overdue',
            operator: 'gt',
            threshold: 30
          },
          {
            entityType: 'candidate',
            field: 'status',
            condition: 'custom',
            operator: 'eq',
            value: 'Active'
          }
        ]
      };

      // Mock entity data
      const mockEntity = {
        status: 'Active',
        position: {
          priority: 'High',
          hiringDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
        }
      };

      // Mock the getEntityData method
      const getEntityDataSpy = jest.spyOn(WarningService as any, 'getEntityData');
      getEntityDataSpy.mockResolvedValue(mockEntity);

      const result = await WarningService.checkWarning(config, 'candidate', '1');
      
      expect(result.hasWarning).toBe(true);
    });

    it('should return false when AND conditions are not all met', async () => {
      const config = {
        id: '1',
        entityType: 'candidate',
        logicalOperator: 'AND',
        crossEntityConditions: [
          {
            entityType: 'position',
            field: 'priority',
            condition: 'custom',
            operator: 'eq',
            value: 'High'
          },
          {
            entityType: 'candidate',
            field: 'status',
            condition: 'custom',
            operator: 'eq',
            value: 'Active'
          }
        ]
      };

      // Mock entity data - only one condition is met
      const mockEntity = {
        status: 'Inactive', // Not Active
        position: {
          priority: 'High' // This condition is met
        }
      };

      // Mock the getEntityData method
      const getEntityDataSpy = jest.spyOn(WarningService as any, 'getEntityData');
      getEntityDataSpy.mockResolvedValue(mockEntity);

      const result = await WarningService.checkWarning(config, 'candidate', '1');
      
      expect(result.hasWarning).toBe(false);
    });

    it('should handle cross-entity conditions with different entity types', async () => {
      const config = {
        id: '1',
        entityType: 'candidate',
        logicalOperator: 'AND',
        crossEntityConditions: [
          {
            entityType: 'position',
            field: 'hiringDate',
            condition: 'overdue',
            operator: 'gt',
            threshold: 30
          },
          {
            entityType: 'grade',
            field: 'slaDays',
            condition: 'threshold',
            operator: 'gt',
            value: '30'
          }
        ]
      };

      // Mock entity data
      const mockEntity = {
        position: {
          hiringDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
          grade: {
            slaDays: 45 // Greater than 30
          }
        }
      };

      // Mock the getEntityData method
      const getEntityDataSpy = jest.spyOn(WarningService as any, 'getEntityData');
      getEntityDataSpy.mockResolvedValue(mockEntity);

      const result = await WarningService.checkWarning(config, 'candidate', '1');
      
      expect(result.hasWarning).toBe(true);
    });
  });

  describe('Single Condition Evaluation', () => {
    it('should handle cross-entity conditions correctly', async () => {
      const config = {
        id: '1',
        entityType: 'candidate',
        logicalOperator: 'AND',
        crossEntityConditions: [
          {
            entityType: 'candidate',
            field: 'email',
            condition: 'empty',
            operator: 'eq'
          }
        ]
      };

      // Mock entity data
      const mockEntity = {
        email: '' // Empty email
      };

      // Mock the getEntityData method
      const getEntityDataSpy = jest.spyOn(WarningService as any, 'getEntityData');
      getEntityDataSpy.mockResolvedValue(mockEntity);

      const result = await WarningService.checkWarning(config, 'candidate', '1');
      
      expect(result.hasWarning).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cross-entity conditions array', async () => {
      const config = {
        id: '1',
        entityType: 'candidate',
        logicalOperator: 'AND',
        crossEntityConditions: []
      };

      const mockEntity = {};

      const getEntityDataSpy = jest.spyOn(WarningService as any, 'getEntityData');
      getEntityDataSpy.mockResolvedValue(mockEntity);

      const result = await WarningService.checkWarning(config, 'candidate', '1');
      
      expect(result.hasWarning).toBe(false);
    });

    it('should handle null cross-entity conditions', async () => {
      const config = {
        id: '1',
        entityType: 'candidate',
        logicalOperator: 'AND',
        crossEntityConditions: null
      };

      const mockEntity = {};

      const getEntityDataSpy = jest.spyOn(WarningService as any, 'getEntityData');
      getEntityDataSpy.mockResolvedValue(mockEntity);

      const result = await WarningService.checkWarning(config, 'candidate', '1');
      
      expect(result.hasWarning).toBe(false);
    });

    it('should handle missing logical operator', async () => {
      const config = {
        id: '1',
        entityType: 'candidate',
        crossEntityConditions: [
          {
            entityType: 'candidate',
            field: 'email',
            condition: 'empty',
            operator: 'eq'
          }
        ]
      };

      const mockEntity = {
        email: ''
      };

      const getEntityDataSpy = jest.spyOn(WarningService as any, 'getEntityData');
      getEntityDataSpy.mockResolvedValue(mockEntity);

      const result = await WarningService.checkWarning(config, 'candidate', '1');
      
      expect(result.hasWarning).toBe(true); // Should default to AND
    });
  });
});
