"use client";

import { motion, useScroll, useSpring } from "motion/react";

/**
 * Barra de progresso de leitura no topo da pagina.
 * Usa o spring do motion para o movimento ficar suave (sem jank).
 */
export function ScrollProgress({ className = "" }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.3 });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className={`fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-gold/60 via-gold to-gold/60 ${className}`}
    />
  );
}
