"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";

/**
 * Botao de conta no header.
 *
 * Consulta a sessao direto na API (sem provedor global): o resto do site
 * continua sem JS extra de sessao e o layout segue sendo estatico.
 */
export function AccountButton() {
  const [logado, setLogado] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelado) setLogado(Boolean(json?.user));
      })
      .catch(() => {
        if (!cancelado) setLogado(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (logado === true) {
    return (
      <Link
        href="/minha-conta"
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-bone transition-colors hover:border-gold hover:text-gold"
      >
        <User className="size-4" /> Minha conta
      </Link>
    );
  }

  return (
    <Link
      href="/entrar"
      className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-bone-dim transition-colors hover:border-gold hover:text-gold"
    >
      <User className="size-4" /> Entrar
    </Link>
  );
}

/** Botao de sair da sessao social. */
export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => void signOut({ redirectTo: "/" })}
      className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-bone-dim transition-colors hover:border-red-400/50 hover:text-red-300"
    >
      <LogOut className="size-4" /> Sair
    </button>
  );
}
