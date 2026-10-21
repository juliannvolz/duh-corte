"use client";

import type { ReactNode } from "react";

/**
 * Provedor de sessao (opcional).
 * O site usa consulta direta a /api/auth/session no botao de conta, entao
 * este provedor so e usado onde fac sentido (ex.: areas com sessao).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
