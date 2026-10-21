import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginCard } from "@/components/account/LoginCard";
import { provedoresDisponiveis } from "@/lib/auth-social";

export const instant = false;

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta da Duh Corte Barbearia com Google, Apple ou Facebook.",
  robots: { index: false, follow: false },
};

export default function EntrarPage() {
  const provedores = provedoresDisponiveis();

  return (
    <div className="min-h-[80vh] pb-24 pt-28 md:pt-36">
      <div className="shell">
        <Suspense fallback={<p className="text-sm text-bone-dim">Carregando…</p>}>
          <LoginCard provedores={provedores} />
        </Suspense>
      </div>
    </div>
  );
}
