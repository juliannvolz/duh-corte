/** Tipos compartilhados pelos componentes do painel da casa. */

export type AdminAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  priceCents: number;
  notes: string | null;
  source: string;
  customer: { name: string; phone: string };
  service: { name: string; durationMin: number };
  professional: { id: string; name: string };
};

export type Bloqueio = {
  id: string;
  startMin: number;
  endMin: number;
  reason: string | null;
  professionalId: string | null;
  professionalName: string | null;
};

export type DiaSemana = {
  date: string;
  weekday: number;
  fechado: boolean;
  openMin: number;
  closeMin: number;
  appointments: AdminAppointment[];
  bloqueios: Bloqueio[];
};

export type AdminService = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
};

export type AdminProfessional = {
  id: string;
  name: string;
};

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  done: "Atendido",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

export const STATUS_STYLE: Record<string, string> = {
  pending: "border-gold/40 text-gold",
  confirmed: "border-emerald-400/40 text-emerald-300",
  done: "border-line-strong text-bone-dim",
  cancelled: "border-red-400/40 text-red-300",
  no_show: "border-orange-400/40 text-orange-300",
};

/** "09:30" a partir do ISO (fuso de Sao Paulo, UTC-3 fixo). */
export function horaDe(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** "22/10" a partir do ISO. */
export function dataDe(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "22/10/2026 as 14:30" a partir do ISO. */
export function dataHoraDe(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()} às ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Minutos do dia -> "09:30". */
export function minutosParaHora(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
