"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * ResponsiveTable - A responsive table component with dynamic height support
 * 
 * Features:
 * - Responsive design that adapts to different screen sizes
 * - Dynamic height management with multiple height modes
 * - Custom scroll indicators
 * - Flexible styling options
 */
interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  showScrollIndicator?: boolean;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
}

/**
 * ResponsiveTable component that provides responsive table behavior
 * @param children - Table content
 * @param className - Additional CSS classes for the table content
 * @param containerClassName - Additional CSS classes for the container
 * @param showScrollIndicator - Whether to show the scroll indicator
 * @param height - Custom height value (e.g., '500px', '50vh')
 * @param minHeight - Minimum height value
 * @param maxHeight - Maximum height value
 */
export function ResponsiveTable({
  children,
  className,
  containerClassName,
  showScrollIndicator = true,
  height,
  minHeight,
  maxHeight
}: ResponsiveTableProps) {
  const containerStyle: React.CSSProperties = {};
  if (height) containerStyle.height = height;
  if (minHeight) containerStyle.minHeight = minHeight;
  if (maxHeight) containerStyle.maxHeight = maxHeight;

  return (
    <div className={cn('relative', containerClassName)} style={containerStyle}>
      <ScrollArea className="w-full h-full">
        <div className={cn('min-w-full', className)}>
          {children}
        </div>
      </ScrollArea>
      {showScrollIndicator && (
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background/50 to-transparent pointer-events-none" />
      )}
    </div>
  );
}

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <table className={cn(
      'w-full caption-bottom text-sm',
      'border-collapse',
      className
    )}>
      {children}
    </table>
  );
}

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return (
    <thead className={cn(
      'bg-muted/50',
      '[&_tr]:border-b',
      className
    )}>
      {children}
    </thead>
  );
}

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function TableBody({ children, className }: TableBodyProps) {
  return (
    <tbody className={cn(
      '[&_tr:last-child]:border-0',
      className
    )}>
      {children}
    </tbody>
  );
}

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function TableRow({ 
  children, 
  className, 
  onClick, 
  hover = true 
}: TableRowProps) {
  return (
    <tr
      className={cn(
        'border-b transition-colors',
        hover && 'hover:bg-muted/50',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function TableHead({ 
  children, 
  className, 
  align = 'left' 
}: TableHeadProps) {
  return (
    <th
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
        'whitespace-nowrap',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
    >
      {children}
    </th>
  );
}

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  truncate?: boolean;
}

export function TableCell({ 
  children, 
  className, 
  align = 'left',
  truncate = false
}: TableCellProps) {
  return (
    <td
      className={cn(
        'p-4 align-middle',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        truncate && 'max-w-0 truncate',
        className
      )}
    >
      {children}
    </td>
  );
}

// Mobile-friendly table row component
interface MobileTableRowProps {
  title: string;
  value: React.ReactNode;
  className?: string;
}

export function MobileTableRow({ title, value, className }: MobileTableRowProps) {
  return (
    <div className={cn(
      'flex flex-col space-y-1 py-2 border-b last:border-b-0',
      'sm:flex-row sm:items-center sm:justify-between sm:space-y-0',
      className
    )}>
      <dt className="text-sm font-medium text-muted-foreground">{title}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

// Card-based table for mobile
interface CardTableProps {
  data: Array<{
    id: string;
    [key: string]: any;
  }>;
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any, row: any) => React.ReactNode;
  }>;
  className?: string;
  onRowClick?: (row: any) => void;
}

export function CardTable({ 
  data, 
  columns, 
  className, 
  onRowClick 
}: CardTableProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {data.map((row) => (
        <div
          key={row.id}
          className={cn(
            'border rounded-lg p-4 space-y-2',
            onRowClick && 'cursor-pointer hover:bg-muted/50 transition-colors'
          )}
          onClick={() => onRowClick?.(row)}
        >
          {columns.map((column) => (
            <MobileTableRow
              key={column.key}
              title={column.label}
              value={column.render ? column.render(row[column.key], row) : row[column.key]}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Responsive table that switches between table and card view
interface AdaptiveTableProps {
  data: Array<{
    id: string;
    [key: string]: any;
  }>;
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any, row: any) => React.ReactNode;
    align?: 'left' | 'center' | 'right';
  }>;
  className?: string;
  onRowClick?: (row: any) => void;
  breakpoint?: 'sm' | 'md' | 'lg';
}

export function AdaptiveTable({
  data,
  columns,
  className,
  onRowClick,
  breakpoint = 'md'
}: AdaptiveTableProps) {
  return (
    <>
      {/* Desktop table view */}
      <div className={cn('hidden', breakpoint === 'sm' ? 'sm:block' : breakpoint === 'md' ? 'md:block' : 'lg:block')}>
        <ResponsiveTable>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key} align={column.align}>
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id} onClick={() => onRowClick?.(row)}>
                  {columns.map((column) => (
                    <TableCell key={column.key} align={column.align}>
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ResponsiveTable>
      </div>

      {/* Mobile card view */}
      <div className={cn('block', breakpoint === 'sm' ? 'sm:hidden' : breakpoint === 'md' ? 'md:hidden' : 'lg:hidden')}>
        <CardTable
          data={data}
          columns={columns}
          onRowClick={onRowClick}
        />
      </div>
    </>
  );
} 

/**
 * TableWrapper - A wrapper component for tables with responsive height management
 * 
 * Height Modes:
 * - 'auto': Height adjusts to content with minimum height
 * - 'fixed': Fixed height with min/max constraints
 * - 'viewport': Height based on viewport with responsive breakpoints
 * - 'responsive': Default responsive mode with dynamic height calculation
 */
interface TableWrapperProps {
  children: React.ReactNode;
  className?: string;
  heightMode?: 'auto' | 'fixed' | 'viewport' | 'responsive';
  showScrollbar?: boolean;
}

/**
 * TableWrapper component that provides consistent responsive behavior
 * @param children - Table content
 * @param className - Additional CSS classes
 * @param heightMode - Height management mode
 * @param showScrollbar - Whether to show custom scrollbar styling
 */
export function TableWrapper({
  children,
  className,
  heightMode = 'responsive',
  showScrollbar = true
}: TableWrapperProps) {
  const heightClasses = {
    auto: 'table-height-auto',
    fixed: 'table-height-fixed',
    viewport: 'table-height-viewport',
    responsive: 'table-container-responsive'
  };

  const scrollbarClass = showScrollbar ? 'table-scrollbar' : '';

  return (
    <div className={cn(
      'border rounded-lg shadow overflow-hidden',
      heightClasses[heightMode],
      scrollbarClass,
      className
    )}>
      {children}
    </div>
  );
} 