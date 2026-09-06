import { motion, useReducedMotion } from "framer-motion";
import cn from "../lib/cn";

/**
 * The one sanctioned entrance: fade + 12px rise, 360ms, gentle ease,
 * triggered once on scroll into view. Respects prefers-reduced-motion.
 */
export default function Reveal({ children, delay = 0, className, y = 12 }) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}