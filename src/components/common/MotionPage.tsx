import React from 'react';
import { motion } from 'motion/react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { fadeUp, motionSafe, pageEnter, springSoft } from '../../motion/presets';

interface Props {
  children: React.ReactNode;
  className?: string;
  /** Remount key when the active section/tab changes */
  motionKey?: string;
}

/** Soft page entrance — skips travel when reduced motion is preferred. */
export const MotionPage: React.FC<Props> = ({ children, className = '', motionKey }) => {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      key={motionKey}
      className={className}
      initial={reduced ? false : 'hidden'}
      animate="show"
      variants={reduced ? fadeUp : pageEnter}
      transition={motionSafe(reduced, springSoft)}
    >
      {children}
    </motion.div>
  );
};
