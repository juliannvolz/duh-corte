"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Apple, Chrome, Facebook, Loader2, Lock, LogIn, ShieldCheck, User } from "lucide-react";

type Provedor = { id: "google" | "apple" | "facebook"; nome: string };
type Aba = "cliente" | "equipe";

const ICONES: Record<string, typeof Chrome> = {
  google: Chrome,
  apple: Apple,
  facebook: Facebook,
};

export function LoginCard({ provedores }: { provedores: Provedor[] }) {
  const params = useSearchParams();
  const destino = params.get("callbackUrl") ?? "/minha-conta";
  const erroUrl = params.get("error");
  const [aba, setAba] = useState<Aba>(params.get("aba") === "equipe" ? "equipe" : "cliente");
  const [carregando, setCarregando] = useState<string | null>(null);
  const [senha, setSenha] = useState("");
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [erroEquipe, setErroEquipe] = useState<string | null>(null);

  /** Entra pelo provedor social: o navegador vai ao Google e volta para `irPara`. */
  async function entrarSocial(provedor: string, irPara: string) {
    setCarregando(provedor);
    setErroEquipe(null);
    // Redirecionamento padrao do Auth.js. NAO usar `redirect: false` aqui: nesse
    // modo a resposta e uma URL para abrir na mao, e ignora-la devolvia o usuario
    // para a pagina de destino SEM sessao (login com Google nao autenticava).
    // Quem nao for da equipe e barrado no servidor, na propria /admin.
    await signIn(provedor, { callbackUrl: irPara });
  }

  /** Entrada da equipe pela senha da casa (grava o cookie do painel). */
  async function entrarComSenha(event: React.FormEvent) {
    event.preventDefault();
    setErroSenha(null);
    setCarregando("senha");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: senha }),
    });
    if (!res.ok) {
      setErroSenha("Senha incorreta.");
      setCarregando(null);
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-3xl border border-line bg-ink-2/70">
        {/* abas */}
        <div role="tablist" aria-label="Tipo de acesso" className="grid grid-cols-2 border-b border-line">
          <button
            type="button"
            role="tab"
            aria-selected={aba === "cliente"}
            onClick={() => setAba("cliente")}
            className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors ${
              aba === "cliente"
                ? "bg-gold/10 text-gold"
                : "text-bone-dim hover:text-bone"
            }`}
          >
            <User className="size-4" /> Sou cliente
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === "equipe"}
            onClick={() => setAba("equipe")}
            className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors ${
              aba === "equipe"
                ? "bg-gold/10 text-gold"
                : "text-bone-dim hover:text-bone"
            }`}
          >
            <ShieldCheck className="size-4" /> Sou da equipe
          </button>
        </div>

        <div className="p-7 md:p-9">
          {erroUrl && aba === "cliente" ? (
            <p className="mb-5 rounded-2xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
              Não foi possível entrar. Tente outro botão ou chame no WhatsApp.
            </p>
          ) : null}

          {aba === "cliente" ? (
            <AbaCliente
              provedores={provedores}
              carregando={carregando}
              onEntrar={(p) => entrarSocial(p, destino)}
            />
          ) : (
            <AbaEquipe
              provedores={provedores}
              carregando={carregando}
              senha={senha}
              setSenha={setSenha}
              erroSenha={erroSenha}
              erroEquipe={erroEquipe}
              onSocial={(p) => entrarSocial(p, "/admin")}
              onSenha={entrarComSenha}
            />
          )}
        </div>
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

function AbaCliente({
  provedores,
  carregando,
  onEntrar,
}: {
  provedores: Provedor[];
  carregando: string | null;
  onEntrar: (provedor: string) => void;
}) {
  return (
    <div>
      <p className="eyebrow text-gold">Área do cliente</p>
      <h1 className="display mt-3 text-3xl md:text-4xl">Entrar</h1>
      <p className="mt-3 text-sm leading-relaxed text-bone-dim">
        A gente <strong>não cria senha</strong>: quem entra é o Google que guarda a sua identidade.
        Você vê seus horários, seus pontos e o código de indicação.
      </p>

      {provedores.length > 0 ? (
        <div className="mt-7 space-y-3">
          {provedores.map((p) => {
            const Icon = ICONES[p.id] ?? Chrome;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onEntrar(p.id)}
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

      <p className="mt-6 text-xs leading-relaxed text-bone-dim/70">
        Ao reservar, seus horários aparecem aqui automaticamente.
      </p>
    </div>
  );
}

function AbaEquipe({
  provedores,
  carregando,
  senha,
  setSenha,
  erroSenha,
  erroEquipe,
  onSocial,
  onSenha,
}: {
  provedores: Provedor[];
  carregando: string | null;
  senha: string;
  setSenha: (v: string) => void;
  erroSenha: string | null;
  erroEquipe: string | null;
  onSocial: (provedor: string) => void;
  onSenha: (event: React.FormEvent) => void;
}) {
  const google = provedores.find((p) => p.id === "google");

  return (
    <div>
      <p className="eyebrow text-gold">Área da equipe</p>
      <h1 className="display mt-3 text-3xl md:text-4xl">Painel da barbearia</h1>
      <p className="mt-3 text-sm leading-relaxed text-bone-dim">
        Agenda, atendimentos, clientes e feedbacks da casa. Entre com o e-mail autorizado da equipe
        ou com a senha do painel.
      </p>

      {erroEquipe ? (
        <p className="mt-5 rounded-2xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          {erroEquipe}
        </p>
      ) : null}

      {google ? (
        <button
          type="button"
          onClick={() => onSocial(google.id)}
          disabled={Boolean(carregando)}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-full border border-line-strong px-6 py-3.5 text-sm font-medium text-bone transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
        >
          {carregando === google.id ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Chrome className="size-4" />
          )}
          Entrar com Google
        </button>
      ) : null}

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-line" aria-hidden />
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-bone-dim/60">ou</span>
        <span className="h-px flex-1 bg-line" aria-hidden />
      </div>

      <form onSubmit={onSenha} className="space-y-3">
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
  );
}
