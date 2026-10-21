"use client";

import { useState } from "react";
import { Loader2, Phone } from "lucide-react";

/**
 * Quando o cliente entrou com Google/Apple/Facebook mas a reserva foi feita
 * com outro e-mail, ele informa o WhatsApp usado e o sistema acha o historico.
 */
export function AccountLookup({ email }: { email: string }) {
  const [tel, setTel] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<{ nome: string; telefone: string } | null>(null);

  async function buscar(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    setCarregando(true);
    const res = await fetch(`/api/minha-conta?tel=${encodeURIComponent(tel)}`, {
      cache: "no-store",
    });
    setCarregando(false);
    if (!res.ok) {
      setErro("Não encontramos reserva com esse número para esta conta.");
      return;
    }
    const json = await res.json();
    if (!json.customer) {
      setErro("Não encontramos reserva com esse número para esta conta.");
      return;
    }
    setDados({ nome: json.customer.name, telefone: json.customer.phone });
    window.location.reload();
  }

  return (
    <div className="max-w-lg rounded-3xl border border-line bg-ink-2/60 p-7">
      <h2 className="text-sm uppercase tracking-[0.18em] text-bone-dim">Achar meus horários</h2>
      <p className="mt-3 text-sm leading-relaxed text-bone-dim">
        Entramos com <span className="text-bone">{email}</span>. Se você reservou com outro
        e-mail, informe o WhatsApp usado na reserva.
      </p>
      <form onSubmit={buscar} className="mt-5 flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1.5 text-sm">
          <span className="text-bone-dim">WhatsApp</span>
          <span className="flex items-center gap-2 rounded-full border border-line-strong px-4 py-3 focus-within:border-gold">
            <Phone className="size-4 text-bone-dim" />
            <input
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              inputMode="tel"
              placeholder="(47) 99999-9999"
              className="w-full bg-transparent text-bone focus:outline-none"
            />
          </span>
        </label>
        <button
          type="submit"
          disabled={carregando || tel.replace(/\D/g, "").length < 10}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-ink disabled:opacity-40"
        >
          {carregando ? <Loader2 className="size-4 animate-spin" /> : null}
          Buscar
        </button>
      </form>
      {erro ? <p className="mt-4 text-sm text-red-300">{erro}</p> : null}
      {dados ? (
        <p className="mt-4 text-sm text-emerald-300">Encontrado: {dados.nome}.</p>
      ) : null}
    </div>
  );
}
