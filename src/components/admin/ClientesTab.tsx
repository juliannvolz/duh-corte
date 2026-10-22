"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, Users } from "lucide-react";
import { formatBRL } from "@/lib/site";
import { dataDe } from "@/components/admin/types";

type Cliente = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  points: number;
  referralCode: string | null;
  total: number;
  gastoCents: number;
  ultimaVisita: string | null;
};

export function ClientesTab() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (q: string) => {
    setCarregando(true);
    try {
      const res = await fetch(`/api/admin/clientes?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao carregar os clientes");
      setClientes(json.clientes);
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar os clientes");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void carregar(busca), busca ? 300 : 0);
    return () => clearTimeout(t);
  }, [busca, carregar]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="display text-2xl md:text-3xl">Clientes da casa</h2>
          <p className="mt-1 text-sm text-bone-dim">
            Quem já passou pela cadeira, quanto voltou e quanto deixou.
          </p>
        </div>

        <label className="flex items-center gap-2 rounded-full border border-line bg-ink-2/60 px-4 py-2 focus-within:border-gold">
          <Search className="size-4 text-bone-dim" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome, telefone ou e-mail"
            className="w-44 bg-transparent text-sm text-bone placeholder:text-bone-dim/40 focus:outline-none sm:w-64"
          />
        </label>
      </div>

      {erro ? (
        <p className="mt-6 rounded-2xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          {erro}
        </p>
      ) : null}

      {carregando ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-bone-dim">
          <Loader2 className="size-4 animate-spin" /> Carregando clientes...
        </p>
      ) : clientes.length === 0 ? (
        <p className="mt-8 flex items-center gap-2 rounded-2xl border border-line bg-ink-2/40 px-5 py-8 text-sm text-bone-dim">
          <Users className="size-4" />
          {busca ? "Nenhum cliente com esse filtro." : "Nenhum cliente ainda — a primeira reserva já aparece aqui."}
        </p>
      ) : (
        <ul className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {clientes.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-line bg-ink-2/60 p-5 transition-colors hover:border-line-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-bone">{c.name}</p>
                  <a
                    href={`https://wa.me/55${c.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-bone-dim transition-colors hover:text-gold"
                  >
                    {c.phone}
                  </a>
                  {c.email ? (
                    <p className="truncate text-[0.65rem] text-bone-dim/60">{c.email}</p>
                  ) : null}
                </div>
                {c.points > 0 ? (
                  <span className="shrink-0 rounded-full border border-gold/40 px-2.5 py-1 text-[0.6rem] text-gold">
                    {c.points} pts
                  </span>
                ) : null}
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
                <div>
                  <dt className="text-[0.6rem] uppercase tracking-[0.12em] text-bone-dim/70">
                    Visitas
                  </dt>
                  <dd className="display mt-1 text-lg text-bone">{c.total}</dd>
                </div>
                <div>
                  <dt className="text-[0.6rem] uppercase tracking-[0.12em] text-bone-dim/70">
                    Total
                  </dt>
                  <dd className="display mt-1 text-lg text-bone">{formatBRL(c.gastoCents)}</dd>
                </div>
                <div>
                  <dt className="text-[0.6rem] uppercase tracking-[0.12em] text-bone-dim/70">
                    Última
                  </dt>
                  <dd className="display mt-1 text-lg text-bone">
                    {c.ultimaVisita ? dataDe(c.ultimaVisita) : "—"}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
