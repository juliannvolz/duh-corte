"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Chrome, Loader2, Lock } from "lucide-react";

/**
 * Porta de entrada do painel quando o dono cai direto em `/admin`.
 *
 * Duas opcoes, as mesmas de `/entrar`: o Google da equipe (`ADMIN_EMAILS`) ou
 * a senha da casa. A senha continua sendo a segunda porta — util quando o
 * dono esta em um computador sem a conta Google dele.
 */
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
        Área restrita da barbearia: agenda, clientes, avaliações e pendências de conteúdo.
      </p>

      <a
        href="/entrar?aba=equipe&callbackUrl=/admin"
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-line-strong px-6 py-3 text-sm font-medium text-bone transition-colors hover:border-gold hover:text-gold"
      >
        <Chrome className="size-4" /> Entrar com o Google da equipe
      </a>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-line" aria-hidden />
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-bone-dim/60">ou</span>
        <span className="h-px flex-1 bg-line" aria-hidden />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-bone-dim">Senha da barbearia</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoFocus
            autoComplete="current-password"
            className="rounded-xl border border-line bg-ink-2 px-4 py-3 text-bone placeholder:text-bone-dim/40 focus:border-gold focus:outline-none"
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

      {process.env.NODE_ENV !== "production" ? (
        <p className="mt-6 text-xs leading-relaxed text-bone-dim/70">
          Desenvolvimento: a senha padrão é <code className="text-gold">duhcorte</code>. Defina{" "}
          <code className="text-gold">ADMIN_PASSWORD</code> no .env antes de publicar.
        </p>
      ) : null}
    </div>
  );
}
