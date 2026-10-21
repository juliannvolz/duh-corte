"use client";

import { useSyncExternalStore } from "react";

/**
 * Ano exibido no rodapé.
 * O relógio do cliente é lido com useSyncExternalStore (sem cascata de
 * renders e sem avaliar `new Date()` durante o prerender — regra do
 * Next 16 com Cache Components).
 */
function subscribe() {
  return () => {}; // o ano não muda durante a sessão
}

export function FooterYear() {
  const year = useSyncExternalStore(
    subscribe,
    () => new Date().getFullYear(),
    () => 2026,
  );

  return <>{year}</>;
}
