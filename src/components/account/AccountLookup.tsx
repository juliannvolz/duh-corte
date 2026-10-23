"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Phone } from "lucide-react";
import { mascararTelefone, somenteDigitos } from "@/lib/phone";

/**
 * Vinculo do WhatsApp a conta social.
 *
 * O cliente entra com o Google e informa o numero usado na reserva. O servidor
 * confere se existe cadastro com esse telefone e grava o googleId — da
 * proxima vez os horarios aparecem sozinhos em "Minha conta".
 *
 * Diferente da versao anterior, aqui a mensagem explica o que aconteceu:
 * sessao expirada, numero sem cadastro ou numero ligado a outra conta.
 */
export function AccountLookup({
  email,
  temCadastro = false,
}: {
  email: string;
  /** true quando a conta ja tem algum cadastro (mesmo sem horarios) */
  temCadastro?: boolean;
}) {
  const router = useRouter();
  const [tel, setTel] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [encontrado, setEncontrado] = useState<{ nome: string } | null>(null);

  const digitos = somenteDigitos(tel);
  const podeBuscar = digitos.length >= 10 && digitos.length <= 11;

  // a confirmacao some sozinha: o cartao nao fica preso em "carregando"
  useEffect(() => {
    if (!encontrado) return;
    const timer = window.setTimeout(() => setEncontrado(null), 6000);
    return () => window.clearTimeout(timer);
  }, [encontrado]);

  async function buscar(event: React.FormEvent) {
    event.preventDefault();
    if (!podeBuscar) return;

    setErro(null);
    setCarregando(true);

    try {
      const res = await fetch(`/api/minha-conta?tel=${encodeURIComponent(digitos)}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        customer?: { name: string } | null;
        error?: string;
      };

      if (res.status === 401) {
        setErro("Sua sessão expirou. Recarregue a página e entre novamente.");
        return;
      }

      if (!res.ok) {
        setErro(json.error ?? "Não foi possível buscar agora. Tente novamente.");
        return;
      }

      if (!json.customer) {
        setErro("Não encontramos nenhuma reserva com esse WhatsApp.");
        return;
      }

      setEncontrado({ nome: json.customer.name });
      // Recarrega o servidor: o cadastro ja esta ligado a conta e a lista de
      // horarios aparece completa, sem precisar buscar de novo.
      window.setTimeout(() => router.refresh(), 700);
    } catch {
      setErro("Falha de conexão. Confira sua internet e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section
      aria-labelledby="vincular-whatsapp"
      className="rounded-3xl border border-gold/40 bg-gold/[0.06] p-7"
    >
      <h2 id="vincular-whatsapp" className="text-sm uppercase tracking-[0.18em] text-gold">
        Vincular meu WhatsApp
      </h2>

      <p className="mt-3 text-sm leading-relaxed text-bone-dim">
        {temCadastro ? (
          <>
            Não achou um agendamento? Ele pode estar em outro WhatsApp. Informe o número usado na
            reserva para juntar tudo nesta conta.
          </>
        ) : (
          <>
            Já se cortou na Duh Corte? Informe o WhatsApp que você usou na reserva.{" "}
            <span className="text-bone">
              Depois disso, seus horários aparecem aqui sozinhos
            </span>{" "}
            — sem precisar buscar de novo.
          </>
        )}
      </p>

      <p className="mt-2 text-xs text-bone-dim">
        O número fica ligado à sua conta <span className="text-bone">{email}</span>.
      </p>

      <form onSubmit={buscar} className="mt-5 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[15rem] flex-1 flex-col gap-1.5 text-sm">
          <span className="text-bone-dim">WhatsApp usado na reserva</span>
          <span className="flex items-center gap-2 rounded-full border border-line-strong bg-ink/40 px-4 py-3 focus-within:border-gold">
            <Phone className="size-4 text-bone-dim" />
            <input
              value={tel}
              onChange={(e) => {
                setTel(mascararTelefone(e.target.value));
                setErro(null);
              }}
              inputMode="tel"
              autoComplete="tel"
              aria-label="WhatsApp usado na reserva"
              placeholder="(47) 99999-9999"
              className="w-full bg-transparent text-bone focus:outline-none"
            />
          </span>
        </label>
        <button
          type="submit"
          disabled={carregando || !podeBuscar}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-ink disabled:opacity-40"
        >
          {carregando ? <Loader2 className="size-4 animate-spin" /> : null}
          Vincular
        </button>
      </form>

      {erro ? (
        <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-red-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {erro}
        </p>
      ) : null}

      {encontrado ? (
        <p role="status" className="mt-4 flex items-center gap-2 text-sm text-emerald-300">
          <CheckCircle2 className="size-4" /> Cadastro vinculado, {encontrado.nome.split(" ")[0]}! Seus
          horários já aparecem nesta página.
        </p>
      ) : null}
    </section>
  );
}
