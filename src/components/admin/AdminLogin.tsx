"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Não foi possível entrar");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <span className="grid size-12 place-items-center rounded-full border border-gold/40 text-gold">
        <Lock className="size-5" />
      </span>
      <h1 className="display mt-6 text-4xl">Painel da casa</h1>
      <p className="mt-3 text-sm leading-relaxed text-bone-dim">
        Área restrita da barbearia: agenda do dia, status dos atendimentos e pendências de conteúdo.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-bone-dim">Senha de acesso</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoFocus
            autoComplete="current-password"
            className="rounded-xl border border-line bg-ink-2 px-4 py-3 text-bone focus:border-gold focus:outline-none"
            placeholder="••••••••"
          />
        </label>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button
          type="submit"
          disabled={loading || password.length === 0}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-transform duration-300 hover:scale-[1.02] disabled:opacity-40"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Entrar
        </button>
      </form>

      <p className="mt-6 text-xs leading-relaxed text-bone-dim/70">
        Em ambiente de demonstração a senha padrão é <code className="text-gold">duhcorte</code>.
        Defina <code className="text-gold">ADMIN_PASSWORD</code> no .env antes de publicar.
      </p>
    </div>
  );
}
