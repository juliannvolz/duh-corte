"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Apple, Chrome, Facebook, Loader2, Lock, LogIn } from "lucide-react";

type Provedor = { id: "google" | "apple" | "facebook"; nome: string };

const ICONES: Record<string, typeof Chrome> = {
  google: Chrome,
  apple: Apple,
  facebook: Facebook,
};

export function LoginCard({ provedores }: { provedores: Provedor[] }) {
  const params = useSearchParams();
  const destino = params.get("callbackUrl") ?? "/minha-conta";
  const erro = params.get("error");
  const [carregando, setCarregando] = useState<string | null>(null);
  const [senha, setSenha] = useState("");
  const [erroSenha, setErroSenha] = useState<string | null>(null);

  async function entrarSocial(provedor: string) {
    setCarregando(provedor);
    await signIn(provedor, { redirectTo: destino });
    setCarregando(null);
  }

  async function entrarComSenha(event: React.FormEvent) {
    event.preventDefault();
    setErroSenha(null);
    setCarregando("senha");
    const res = (await signIn("senha", {
      redirect: false,
      password: senha,
    } as never)) as { error?: string } | undefined;
    if (res?.error) {
      setErroSenha("Senha incorreta.");
      setCarregando(null);
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-3xl border border-line bg-ink-2/70 p-7 md:p-9">
        <p className="eyebrow text-gold">Área do cliente</p>
        <h1 className="display mt-3 text-3xl md:text-4xl">Entrar</h1>
        <p className="mt-3 text-sm leading-relaxed text-bone-dim">
          A gente <strong>não cria senha</strong>: quem entra é o Google, a Apple ou o Facebook que
          guarda a sua identidade. Você vê seus horários, seus pontos e o código de indicação.
        </p>

        {erro ? (
          <p className="mt-5 rounded-2xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            Não foi possível entrar. Tente outro botão ou chame no WhatsApp.
          </p>
        ) : null}

        {provedores.length > 0 ? (
          <div className="mt-7 space-y-3">
            {provedores.map((p) => {
              const Icon = ICONES[p.id] ?? Chrome;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void entrarSocial(p.id)}
                  disabled={Boolean(carregando)}
                  className="flex w-full items-center justify-center gap-3 rounded-full border border-line-strong px-6 py-3.5 text-sm font-medium text-bone transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
                >
                  {carregando === p.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                  Entrar com {p.nome}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-7 rounded-2xl border border-line bg-ink/60 px-4 py-3 text-xs leading-relaxed text-bone-dim">
            O login social está sendo habilitado. Enquanto isso, use o WhatsApp da barbearia para
            confirmar, remarcar ou tirar dúvidas — é mais rápido.
          </p>
        )}

        <div className="my-7 flex items-center gap-4">
          <span className="h-px flex-1 bg-line" aria-hidden />
          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-bone-dim/60">
            ou sou da equipe
          </span>
          <span className="h-px flex-1 bg-line" aria-hidden />
        </div>

        <form onSubmit={entrarComSenha} className="space-y-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-bone-dim">Senha da barbearia</span>
            <span className="flex items-center gap-2 rounded-full border border-line-strong px-4 py-3 focus-within:border-gold">
              <Lock className="size-4 text-bone-dim" />
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-transparent text-bone focus:outline-none"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </span>
          </label>
          {erroSenha ? <p className="text-sm text-red-300">{erroSenha}</p> : null}
          <button
            type="submit"
            disabled={Boolean(carregando) || senha.length < 4}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-ink transition-transform duration-300 hover:scale-[1.02] disabled:opacity-40"
          >
            {carregando === "senha" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogIn className="size-4" />
            )}
            Entrar no painel
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-bone-dim/70">
        Ao entrar, você concorda com a nossa{" "}
        <a href="/privacidade" className="text-gold">
          política de privacidade
        </a>
        . Não vendemos nem compartilhamos seus dados.
      </p>
    </div>
  );
}
