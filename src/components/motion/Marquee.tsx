"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Marquee infinito (roda devagar; para com hover/focus). */
export function Marquee({
  children,
  speed = 28,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`group relative flex overflow-hidden ${className ?? ""}`}>
      <motion.div
        className="flex shrink-0 items-center gap-10 pr-10 group-hover:[animation-play-state:paused]"
        animate={{ x: ["0%", "-100%"] }}
        transition={{ duration: speed, ease: "linear", repeat: Infinity }}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
}
