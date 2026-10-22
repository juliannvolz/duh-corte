"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Star, StarOff } from "lucide-react";
import { dataHoraDe } from "@/components/admin/types";

type Feedback = {
  id: string;
  rating: number;
  text: string | null;
  published: boolean;
  createdAt: string;
  customer: { name: string; phone: string };
  appointment: {
    id: string;
    startsAt: string;
    service: string;
    professional: string;
  };
};

export function FeedbacksTab() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [media, setMedia] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/admin/feedbacks", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao carregar as avaliações");
      setFeedbacks(json.feedbacks);
      setMedia(json.media);
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar as avaliações");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => void carregar());
    return () => cancelAnimationFrame(id);
  }, [carregar]);

  async function alternarPublicacao(id: string, published: boolean) {
    setSalvandoId(id);
    const res = await fetch("/api/admin/feedbacks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, published }),
    });
    setSalvandoId(null);
    if (res.ok) {
      setFeedbacks((lista) =>
        lista.map((f) => (f.id === id ? { ...f, published } : f)),
      );
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="display text-2xl md:text-3xl">Avaliações dos clientes</h2>
          <p className="mt-1 text-sm text-bone-dim">
            O que o cliente disse depois do atendimento. Publique para aparecer no site.
          </p>
        </div>
        {feedbacks.length > 0 ? (
          <div className="rounded-2xl border border-gold/30 bg-gold/[0.05] px-5 py-3 text-center">
            <p className="text-[0.6rem] uppercase tracking-[0.16em] text-bone-dim">Média</p>
            <p className="display mt-1 text-2xl text-gold">{media.toFixed(1).replace(".", ",")}</p>
          </div>
        ) : null}
      </div>

      {erro ? (
        <p className="mt-6 rounded-2xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          {erro}
        </p>
      ) : null}

      {carregando ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-bone-dim">
          <Loader2 className="size-4 animate-spin" /> Carregando avaliações...
        </p>
      ) : feedbacks.length === 0 ? (
        <p className="mt-8 flex items-center gap-2 rounded-2xl border border-line bg-ink-2/40 px-5 py-8 text-sm text-bone-dim">
          <StarOff className="size-4" />
          Nenhuma avaliação ainda. Quando o cliente avaliar depois do atendimento, aparece aqui.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {feedbacks.map((f) => (
            <li
              key={f.id}
              className="rounded-2xl border border-line bg-ink-2/60 p-5 transition-colors hover:border-line-strong"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1" aria-label={`Nota ${f.rating} de 5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`size-3.5 ${
                          i < f.rating ? "fill-gold text-gold" : "text-bone-dim/30"
                        }`}
                      />
                    ))}
                  </div>

                  {f.text ? (
                    <p className="mt-3 text-sm leading-relaxed text-bone">“{f.text}”</p>
                  ) : (
                    <p className="mt-3 text-sm italic text-bone-dim/60">Sem comentário.</p>
                  )}

                  <p className="mt-3 text-xs text-bone-dim">
                    {f.customer.name} · {f.appointment.service} · {f.appointment.professional} ·{" "}
                    {dataHoraDe(f.appointment.startsAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void alternarPublicacao(f.id, !f.published)}
                  disabled={salvandoId === f.id}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs transition-colors disabled:opacity-50 ${
                    f.published
                      ? "border-gold/40 text-gold hover:border-gold"
                      : "border-line text-bone-dim hover:border-gold hover:text-gold"
                  }`}
                >
                  {salvandoId === f.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : f.published ? (
                    <Eye className="size-3.5" />
                  ) : (
                    <EyeOff className="size-3.5" />
                  )}
                  {f.published ? "Publicado no site" : "Publicar no site"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
