import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { cleanupAllModals, forceModalCleanup, checkForBlockingModals } from '@/lib/modal-cleanup';

// Mock the DOM environment
const mockQuerySelectorAll = jest.fn();
const mockRemoveChild = jest.fn();
const mockParentNode = { removeChild: mockRemoveChild };

Object.defineProperty(document, 'querySelectorAll', {
  value: mockQuerySelectorAll,
  writable: true,
});

Object.defineProperty(document.body, 'style', {
  value: {},
  writable: true,
});

describe('Modal Cleanup Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
  });

  afterEach(() => {
    // Clean up any remaining elements
    cleanupAllModals();
  });

  it('should clean up dialog overlays', () => {
    // Mock closed dialog overlays
    const mockOverlays = [
      { getAttribute: () => 'closed', parentNode: mockParentNode },
      { getAttribute: () => 'closed', parentNode: mockParentNode },
    ];
    
    mockQuerySelectorAll.mockReturnValue(mockOverlays);

    cleanupAllModals();

    expect(mockQuerySelectorAll).toHaveBeenCalledWith('[data-radix-dialog-overlay]');
    expect(mockRemoveChild).toHaveBeenCalledTimes(2);
  });

  it('should clean up alert dialog overlays', () => {
    const mockAlertOverlays = [
      { getAttribute: () => 'closed', parentNode: mockParentNode },
    ];
    
    mockQuerySelectorAll.mockReturnValue(mockAlertOverlays);

    cleanupAllModals();

    expect(mockQuerySelectorAll).toHaveBeenCalledWith('[data-radix-alert-dialog-overlay]');
    expect(mockRemoveChild).toHaveBeenCalled();
  });

  it('should clean up portal containers', () => {
    const mockPortals = [
      { parentNode: mockParentNode },
      { parentNode: mockParentNode },
    ];
    
    mockQuerySelectorAll.mockReturnValue(mockPortals);

    cleanupAllModals();

    expect(mockQuerySelectorAll).toHaveBeenCalledWith('[data-candidate-modal-portal="true"]');
    expect(mockRemoveChild).toHaveBeenCalledTimes(2);
  });

  it('should restore body scroll', () => {
    document.body.style.overflow = 'hidden';
    
    cleanupAllModals();
    
    expect(document.body.style.overflow).toBe('');
  });

  it('should detect blocking modals', () => {
    const mockBlockingElements = [
      { getAttribute: () => 'closed' },
      { getAttribute: () => 'closed' },
    ];
    
    mockQuerySelectorAll.mockReturnValue(mockBlockingElements);

    const hasBlockingModals = checkForBlockingModals();
    
    expect(hasBlockingModals).toBe(true);
  });

  it('should force cleanup of all modal elements', () => {
    const mockElements = [
      { getAttribute: () => 'closed', parentNode: mockParentNode },
      { getAttribute: () => null, parentNode: mockParentNode },
    ];
    
    mockQuerySelectorAll.mockReturnValue(mockElements);

    forceModalCleanup();

    expect(mockRemoveChild).toHaveBeenCalled();
    expect(document.body.style.pointerEvents).toBe('');
  });

  it('should handle elements without parent nodes gracefully', () => {
    const mockElements = [
      { getAttribute: () => 'closed', parentNode: null },
    ];
    
    mockQuerySelectorAll.mockReturnValue(mockElements);

    // Should not throw an error
    expect(() => cleanupAllModals()).not.toThrow();
  });
});
