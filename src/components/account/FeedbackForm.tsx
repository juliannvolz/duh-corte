"use client";

import { useState } from "react";
import { Check, Loader2, Star } from "lucide-react";

/**
 * Avaliacao do atendimento na area do cliente.
 *
 * Aparece somente em atendimentos com status "atendido" e sem avaliacao.
 * A API faz a prova de dono (sessao ou telefone) e substitui a avaliacao se
 * o cliente reenviar.
 */
export function FeedbackForm({
  appointmentId,
  phone,
}: {
  appointmentId: string;
  phone: string;
}) {
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "enviado" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    if (nota < 1) {
      setErro("Escolha de 1 a 5 estrelas.");
      setEstado("erro");
      return;
    }

    setEstado("enviando");
    setErro(null);

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId, rating: nota, text: texto.trim(), phone }),
    });

    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setErro(json.error ?? "Não foi possível enviar agora.");
      setEstado("erro");
      return;
    }

    setEstado("enviado");
    window.setTimeout(() => window.location.reload(), 900);
  }

  if (estado === "enviado") {
    return (
      <p className="flex items-center gap-2 text-xs text-emerald-300">
        <Check className="size-3.5" /> Obrigado! Sua avaliação foi enviada.
      </p>
    );
  }

  const estrelas = hover || nota;

  return (
    <form
      onSubmit={(event) => void enviar(event)}
      className="mt-3 rounded-xl border border-line bg-ink/40 px-4 py-3"
    >
      <p className="text-xs text-bone-dim">
        Como foi o atendimento? Sua opinião ajuda a casa a melhorar.
      </p>

      <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="Nota de 1 a 5">
        {[1, 2, 3, 4, 5].map((valor) => (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={nota === valor}
            aria-label={`${valor} ${valor === 1 ? "estrela" : "estrelas"}`}
            onClick={() => setNota(valor)}
            onMouseEnter={() => setHover(valor)}
            onMouseLeave={() => setHover(0)}
            className="rounded p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            <Star
              className={`size-5 ${
                valor <= estrelas ? "fill-gold text-gold" : "text-bone-dim/40"
              }`}
            />
          </button>
        ))}
      </div>

      <label className="mt-2 block">
        <span className="sr-only">Comentário (opcional)</span>
        <textarea
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          rows={2}
          maxLength={600}
          placeholder="Quer contar como foi? (opcional)"
          className="w-full resize-none rounded-xl border border-line bg-ink px-3 py-2 text-xs text-bone placeholder:text-bone-dim/40 focus:border-gold focus:outline-none"
        />
      </label>

      {erro ? <p className="mt-1 text-[0.65rem] text-red-300">{erro}</p> : null}

      <button
        type="submit"
        disabled={estado === "enviando"}
        className="mt-2 inline-flex items-center gap-2 rounded-full border border-gold/50 px-4 py-1.5 text-[0.65rem] font-medium text-gold transition-colors hover:bg-gold hover:text-ink disabled:opacity-50"
      >
        {estado === "enviando" ? <Loader2 className="size-3 animate-spin" /> : null}
        Enviar avaliação
      </button>
    </form>
  );
}
