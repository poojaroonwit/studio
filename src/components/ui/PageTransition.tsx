"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

const pageTransition = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1] as const,
};

export const PageTransition = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const offset = shouldReduceMotion ? 0 : 10;
  const duration = shouldReduceMotion ? 0 : pageTransition.duration;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: offset }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: offset }}
      transition={{ ...pageTransition, duration }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
