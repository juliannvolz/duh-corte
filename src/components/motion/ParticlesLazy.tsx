"use client";

import dynamic from "next/dynamic";

/**
 * Carrega as particulas sem pesar no bundle inicial (ssr: false + dynamic).
 * Precisa ser Client Component: o Next 16 nao aceita `ssr: false` em
 * Server Components.
 */
export const Particles = dynamic(
  () => import("@/components/motion/Particles").then((m) => m.Particles),
  { ssr: false, loading: () => null },
);
