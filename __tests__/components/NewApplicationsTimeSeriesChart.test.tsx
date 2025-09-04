import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewApplicationsTimeSeriesChart } from '../../src/components/dashboard/NewApplicationsTimeSeriesChart';
import type { Candidate } from '../../src/lib/types';

// Mock the chart setup hook
jest.mock('../../src/hooks/use-chart-setup', () => ({
  useChartSetup: () => ({
    chartReady: true,
    isLoading: false,
    error: null
  })
}));

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      Mock Chart
    </div>
  )
}));

// Mock date-fns functions
jest.mock('date-fns', () => ({
  format: jest.fn((date: Date, formatStr: string) => {
    if (formatStr === 'HH:mm') return '12:00';
    if (formatStr === 'MMM dd') return 'Jan 01';
    if (formatStr === 'EEE dd') return 'Mon 01';
    return '2024-01-01';
  }),
  subWeeks: jest.fn((date: Date, weeks: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() - (weeks * 7));
    return result;
  }),
  subMonths: jest.fn((date: Date, months: number) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() - months);
    return result;
  }),
  subYears: jest.fn((date: Date, years: number) => {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() - years);
    return result;
  }),
  startOfWeek: jest.fn((date: Date) => new Date(date)),
  endOfWeek: jest.fn((date: Date) => new Date(date)),
  startOfMonth: jest.fn((date: Date) => new Date(date)),
  endOfMonth: jest.fn((date: Date) => new Date(date)),
  startOfYear: jest.fn((date: Date) => new Date(date)),
  endOfYear: jest.fn((date: Date) => new Date(date)),
  eachDayOfInterval: jest.fn(() => [new Date()]),
  eachWeekOfInterval: jest.fn(() => [new Date()]),
  eachMonthOfInterval: jest.fn(() => [new Date()]),
  eachYearOfInterval: jest.fn(() => [new Date()]),
  addDays: jest.fn((date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  })
}));

const mockCandidates: Candidate[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    applicationDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as Candidate,
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    applicationDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as Candidate
];

describe('NewApplicationsTimeSeriesChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the chart component', () => {
    render(
      <NewApplicationsTimeSeriesChart 
        candidates={mockCandidates} 
        isLoading={false} 
      />
    );
    
    expect(screen.getByText('New Applications Over Time')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('shows the new filter options in the dropdown', () => {
    render(
      <NewApplicationsTimeSeriesChart 
        candidates={mockCandidates} 
        isLoading={false} 
      />
    );
    
    // Check that the period type selector exists
    const periodSelector = screen.getByRole('combobox');
    expect(periodSelector).toBeInTheDocument();
    
    // Click to open the dropdown
    fireEvent.click(periodSelector);
    
    // Check for the new filter options
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(screen.getByText('Last N Days')).toBeInTheDocument();
  });

  it('shows number input for Last N Days filter', () => {
    render(
      <NewApplicationsTimeSeriesChart 
        candidates={mockCandidates} 
        isLoading={false} 
      />
    );
    
    // Select "Last N Days" from the dropdown
    const periodSelector = screen.getByRole('combobox');
    fireEvent.click(periodSelector);
    fireEvent.click(screen.getByText('Last N Days'));
    
    // Check that the number input appears
    const numberInput = screen.getByDisplayValue('7');
    expect(numberInput).toBeInTheDocument();
    expect(screen.getByText('days')).toBeInTheDocument();
  });

  it('does not show period unit selector for Today/Yesterday/Last N Days', () => {
    render(
      <NewApplicationsTimeSeriesChart 
        candidates={mockCandidates} 
        isLoading={false} 
      />
    );
    
    // Select "Today" from the dropdown
    const periodSelector = screen.getByRole('combobox');
    fireEvent.click(periodSelector);
    fireEvent.click(screen.getByText('Today'));
    
    // Check that period unit selector is not visible
    const periodUnitSelectors = screen.queryAllByRole('combobox');
    expect(periodUnitSelectors).toHaveLength(1); // Only the main period selector should be visible
  });

  it('handles loading state correctly', () => {
    render(
      <NewApplicationsTimeSeriesChart 
        candidates={mockCandidates} 
        isLoading={true} 
      />
    );
    
    // Should show loading spinner
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('handles empty candidates array', () => {
    render(
      <NewApplicationsTimeSeriesChart 
        candidates={[]} 
        isLoading={false} 
      />
    );
    
    expect(screen.getByText('No application data available')).toBeInTheDocument();
  });
});
