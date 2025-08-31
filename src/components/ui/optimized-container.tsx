import React, { forwardRef, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  noWrapper?: boolean;
  minimal?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Optimized container component that prevents unnecessary wrapper divs
 * and provides better performance by avoiding unnecessary re-renders
 */
export const OptimizedContainer = forwardRef<HTMLDivElement, OptimizedContainerProps>(
  ({ 
    children, 
    as: Component = 'div', 
    noWrapper = false, 
    minimal = false,
    className,
    style,
    ...props 
  }, ref) => {
    
    // If noWrapper is true and we have a single child, render it directly
    if (noWrapper && React.Children.count(children) === 1) {
      const child = React.Children.only(children);
      if (React.isValidElement(child)) {
        return React.cloneElement(child, {
          ...child.props,
          className: cn(child.props.className, className),
          style: { ...child.props.style, ...style },
          ref: ref || child.ref
        });
      }
    }

    // If minimal is true, use minimal styling
    const containerClassName = useMemo(() => {
      if (minimal) {
        return cn('contents', className);
      }
      return className;
    }, [minimal, className]);

    // If minimal and no specific styling needed, use contents class
    if (minimal && !className && !style) {
      return <>{children}</>;
    }

    return (
      <Component
        ref={ref}
        className={containerClassName}
        style={style}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

OptimizedContainer.displayName = 'OptimizedContainer';

/**
 * Fragment-like component that renders children without any wrapper
 * Useful for avoiding unnecessary div containers
 */
export const Fragment = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

/**
 * Conditional wrapper that only renders a container when needed
 */
interface ConditionalContainerProps extends OptimizedContainerProps {
  condition?: boolean;
  fallback?: React.ReactNode;
}

export const ConditionalContainer = forwardRef<HTMLDivElement, ConditionalContainerProps>(
  ({ condition = true, fallback, children, ...props }, ref) => {
    if (!condition) {
      return fallback ? <>{fallback}</> : null;
    }

    return (
      <OptimizedContainer ref={ref} {...props}>
        {children}
      </OptimizedContainer>
    );
  }
);

ConditionalContainer.displayName = 'ConditionalContainer';

/**
 * Performance-optimized wrapper that prevents unnecessary re-renders
 */
interface MemoizedContainerProps extends OptimizedContainerProps {
  memoKey?: string | number;
}

export const MemoizedContainer = React.memo(
  forwardRef<HTMLDivElement, MemoizedContainerProps>(
    ({ memoKey, children, ...props }, ref) => {
      return (
        <OptimizedContainer ref={ref} {...props}>
          {children}
        </OptimizedContainer>
      );
    }
  ),
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.memoKey === nextProps.memoKey &&
      prevProps.className === nextProps.className &&
      prevProps.style === nextProps.style &&
      prevProps.children === nextProps.children
    );
  }
);

MemoizedContainer.displayName = 'MemoizedContainer';

/**
 * Layout container with optimized structure
 */
interface LayoutContainerProps extends OptimizedContainerProps {
  layout?: 'flex' | 'grid' | 'block' | 'inline';
  direction?: 'row' | 'column';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  gap?: number | string;
  wrap?: boolean;
}

export const LayoutContainer = forwardRef<HTMLDivElement, LayoutContainerProps>(
  ({ 
    layout = 'flex',
    direction = 'row',
    justify,
    align,
    gap,
    wrap = false,
    className,
    style,
    children,
    ...props 
  }, ref) => {
    
    const layoutClasses = useMemo(() => {
      const classes = [];
      
      if (layout === 'flex') {
        classes.push('flex');
        if (direction === 'column') classes.push('flex-col');
        if (wrap) classes.push('flex-wrap');
      } else if (layout === 'grid') {
        classes.push('grid');
      }
      
      if (justify) {
        const justifyMap = {
          start: 'justify-start',
          center: 'justify-center',
          end: 'justify-end',
          between: 'justify-between',
          around: 'justify-around',
          evenly: 'justify-evenly'
        };
        classes.push(justifyMap[justify]);
      }
      
      if (align) {
        const alignMap = {
          start: 'items-start',
          center: 'items-center',
          end: 'items-end',
          stretch: 'items-stretch',
          baseline: 'items-baseline'
        };
        classes.push(alignMap[align]);
      }
      
      if (gap) {
        if (typeof gap === 'number') {
          classes.push(`gap-${gap}`);
        } else {
          classes.push(`gap-${gap}`);
        }
      }
      
      return classes;
    }, [layout, direction, justify, align, gap, wrap]);

    const containerStyle = useMemo(() => {
      if (gap && typeof gap === 'number') {
        return { gap: `${gap * 0.25}rem`, ...style };
      }
      return style;
    }, [gap, style]);

    return (
      <OptimizedContainer
        ref={ref}
        className={cn(layoutClasses, className)}
        style={containerStyle}
        {...props}
      >
        {children}
      </OptimizedContainer>
    );
  }
);

LayoutContainer.displayName = 'LayoutContainer';
