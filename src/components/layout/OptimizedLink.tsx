"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

interface OptimizedLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

export const OptimizedLink = React.memo(function OptimizedLink({
  href,
  children,
  ...props
}: OptimizedLinkProps) {
  const router = useRouter();
  const isNavigatingRef = React.useRef(false);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleClick = React.useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!isMountedRef.current || isNavigatingRef.current) return;

    isNavigatingRef.current = true;
    setTimeout(() => {
      if (isMountedRef.current) {
        isNavigatingRef.current = false;
      }
    }, 300);

    try {
      router.push(href);
    } catch (error) {
      window.location.href = href;
    }
  }, [href, router]);

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
});
