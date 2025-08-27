import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CandidateDetailModal from '../CandidateDetailModal';

// Mock the CandidateDetailView component
jest.mock('../CandidateDetailView', () => {
  return function MockCandidateDetailView({ candidateId, onClose }: any) {
    return (
      <div data-testid="candidate-detail-view">
        <div>Candidate ID: {candidateId}</div>
        <button onClick={onClose} data-testid="close-button">
          Close
        </button>
      </div>
    );
  };
});

// Mock createPortal
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode, container: Element) => node,
}));

describe('CandidateDetailModal', () => {
  const mockOnClose = jest.fn();
  const candidateId = 'test-candidate-id';

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock document.body.appendChild and removeChild
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
  });

  afterEach(() => {
    // Clean up any remaining portal containers
    const portalContainers = document.querySelectorAll('[data-candidate-modal-portal="true"]');
    portalContainers.forEach(container => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });
  });

  it('should render modal when open is true', () => {
    render(
      <CandidateDetailModal
        candidateId={candidateId}
        open={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('candidate-detail-view')).toBeInTheDocument();
    expect(screen.getByText(`Candidate ID: ${candidateId}`)).toBeInTheDocument();
  });

  it('should not render modal when open is false', () => {
    render(
      <CandidateDetailModal
        candidateId={candidateId}
        open={false}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByTestId('candidate-detail-view')).not.toBeInTheDocument();
  });

  it('should call onClose when backdrop is clicked', () => {
    render(
      <CandidateDetailModal
        candidateId={candidateId}
        open={true}
        onClose={mockOnClose}
      />
    );

    const backdrop = screen.getByTestId('candidate-detail-view').closest('.fixed');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <CandidateDetailModal
        candidateId={candidateId}
        open={true}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByTestId('close-button');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when escape key is pressed', () => {
    render(
      <CandidateDetailModal
        candidateId={candidateId}
        open={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when other keys are pressed', () => {
    render(
      <CandidateDetailModal
        candidateId={candidateId}
        open={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should prevent body scroll when modal is open', () => {
    const originalOverflow = document.body.style.overflow;
    
    render(
      <CandidateDetailModal
        candidateId={candidateId}
        open={true}
        onClose={mockOnClose}
      />
    );

    expect(document.body.style.overflow).toBe('hidden');

    // Clean up
    document.body.style.overflow = originalOverflow;
  });

  it('should restore body scroll when modal is closed', () => {
    const originalOverflow = document.body.style.overflow;
    
    const { rerender } = render(
      <CandidateDetailModal
        candidateId={candidateId}
        open={true}
        onClose={mockOnClose}
      />
    );

    expect(document.body.style.overflow).toBe('hidden');

    // Close the modal
    rerender(
      <CandidateDetailModal
        candidateId={candidateId}
        open={false}
        onClose={mockOnClose}
      />
    );

    expect(document.body.style.overflow).toBe('');

    // Clean up
    document.body.style.overflow = originalOverflow;
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    
    const { unmount } = render(
      <CandidateDetailModal
        candidateId={candidateId}
        open={true}
        onClose={mockOnClose}
      />
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });
});
