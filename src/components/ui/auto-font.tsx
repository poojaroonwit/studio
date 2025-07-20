import React from 'react';
import { cn, containsThaiText } from '@/lib/utils';

interface AutoFontProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  [key: string]: any;
}

export function AutoFont({ 
  children, 
  className, 
  as: Component = 'span',
  ...props 
}: AutoFontProps) {
  const text = typeof children === 'string' ? children : '';
  const isThai = containsThaiText(text);
  
  const fontClass = isThai ? 'font-ibm-plex-sans-thai' : 'font-sans';
  
  return (
    <Component 
      className={cn(fontClass, className)}
      lang={isThai ? 'th' : 'en'}
      {...props}
    >
      {children}
    </Component>
  );
}

// Higher-order component for automatic font application
export function withAutoFont<P extends object>(
  Component: React.ComponentType<P>
) {
  return React.forwardRef<any, P>((props, ref) => {
    const { children, className, ...restProps } = props as any;
    const text = typeof children === 'string' ? children : '';
    const isThai = containsThaiText(text);
    
    const fontClass = isThai ? 'font-ibm-plex-sans-thai' : 'font-sans';
    
    return (
      <Component
        ref={ref}
        className={cn(fontClass, className)}
        lang={isThai ? 'th' : 'en'}
        {...restProps}
      >
        {children}
      </Component>
    );
  });
}

// Hook for dynamic font application
export function useAutoFont(text: string) {
  const isThai = containsThaiText(text);
  
  return {
    fontClass: isThai ? 'font-ibm-plex-sans-thai' : 'font-sans',
    lang: isThai ? 'th' : 'en',
    isThai,
  };
} 