"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  Scissors,
  Share2,
  Sparkles,
  Ticket,
  User,
  Wallet,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { business, formatBRL } from "@/lib/site";
import type { ProfessionalSeed, ServiceCategory } from "@/lib/site";
import type { ServiceView } from "@/lib/content";
import { salvarUltimoWhatsapp, lerOrigem, semInscricao } from "@/lib/browser-storage";
import {
  SlotPicker,
  labelFor,
  type SlotResponse,
  type SlotWindow,
} from "@/components/booking/SlotPicker";

export type { SlotWindow } from "@/components/booking/SlotPicker";

const STEPS = ["Serviço", "Profissional", "Horário", "Seus dados"];

/** Resumo de fidelidade devolvido pela API de reservas. */
type LoyaltyInfo = {
  points: number;
  referralCode: string | null;
  progress: {
    tier: { id: string; points: number; label: string; kind: string; valueCents: number } | null;
    faltamPontos: number;
    progresso: number;
  };
  rewards: Array<{ id: string; label: string; status: string }>;
};

/** Data de hoje em São Paulo (ISO, YYYY-MM-DD) — o Brasil é UTC-3 fixo. */
function todaySP() {
  const sp = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return sp.toISOString().slice(0, 10);
}

/** Lista dos próximos `count` dias (ISO) a partir de hoje em SP. */
function nextDays(count = 14) {
  const [y, m, d] = todaySP().split("-").map(Number);
  const base = Date.UTC(y, m - 1, d);
  return Array.from(
    { length: count },
    (_, i) => new Date(base + i * 86_400_000).toISOString().slice(0, 10),
  );
}

/** Máscara de telefone BR: (47) 99999-9999. */
function phoneMask(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (digits.length <= 2) return `(${ddd}`;
  const headLen = digits.length > 10 ? 5 : 4;
  const head = rest.slice(0, headLen);
  const tail = rest.slice(headLen);
  return `(${ddd}) ${head}${tail ? `-${tail}` : ""}`;
}

export function BookingWizard({
  services,
  professionals,
  categories,
  windows,
  initialServiceId,
  initialProfessionalId,
  referralCode,
  planId,
  clientName,
  clientEmail,
}: {
  services: ServiceView[];
  professionals: ProfessionalSeed[];
  categories: ServiceCategory[];
  windows: SlotWindow[];
  initialServiceId?: string;
  initialProfessionalId?: string;
  /** Codigo de indicacao (programa de fidelidade), vindo da URL. */
  referralCode?: string;
  /** Plano do Clube escolhido (ativado na loja fisica). */
  planId?: string;
  /** Preenchimento automatico quando o cliente esta logado. */
  clientName?: string;
  clientEmail?: string;
}) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(initialServiceId ?? null);
  const [professionalId, setProfessionalId] = useState<string | null>(
    initialProfessionalId ?? null,
  );
  const [dateISO, setDateISO] = useState<string>(() => nextDays()[0]);
  const days = nextDays();
  const [slots, setSlots] = useState<SlotResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<{ startsAt: string; label: string } | null>(null);
  const [form, setForm] = useState({
    name: clientName ?? "",
    phone: "",
    email: clientEmail ?? "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    id: string;
    startsAt: string;
    priceCents: number;
    loyalty: LoyaltyInfo | null;
  } | null>(null);
  // Chave de idempotencia: gerada no navegador (nao no render do servidor —
  // `crypto.randomUUID()` durante o prerender quebra a pagina) e mantida
  // no ref para que uma segunda tentativa nao duplique a reserva.
  const idempotencyKeyRef = useRef<string | null>(null);
  function idempotencyKey() {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = `reserva-${crypto.randomUUID()}`;
    }
    return idempotencyKeyRef.current;
  }

  const service = services.find((s) => s.id === serviceId) ?? null;
  const professional = professionals.find((p) => p.id === professionalId) ?? null;

  const loadSlots = useCallback(async () => {
    if (!serviceId) return;
    setLoadingSlots(true);
    setError(null);
    try {
      const params = new URLSearchParams({ service: serviceId, date: dateISO });
      if (professionalId) params.set("professional", professionalId);
      const res = await fetch(`/api/slots?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as SlotResponse;
      if (!res.ok) throw new Error(json.error ?? "Não foi possível carregar os horários");
      setSlots(json);
      setSlot(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar horários");
      setSlots(null);
    } finally {
      setLoadingSlots(false);
    }
  }, [serviceId, professionalId, dateISO]);

  useEffect(() => {
    if (step === 2) {
      // carga fora do corpo do efeito (evita cascata de renders)
      const id = requestAnimationFrame(() => {
        void loadSlots();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [step, loadSlots]);

﻿  const canAdvance =
    (step === 0 && Boolean(serviceId)) ||
    (step === 1 && Boolean(professionalId)) ||
    (step === 2 && Boolean(slot)) ||
    step === 3;

  async function submit() {
    if (!serviceId || !professionalId || !slot) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          professionalId,
          startsAt: slot.startsAt,
          idempotencyKey: idempotencyKey(),
          referralCode,
          planId,
          customer: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            notes: form.notes.trim() || undefined,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível concluir a reserva");
      setCreated({
        id: json.id,
        startsAt: json.startsAt,
        priceCents: json.priceCents,
        loyalty: (json.loyalty as LoyaltyInfo | null) ?? null,
      });
      // Guarda o WhatsApp no aparelho: quando o cliente entrar com o Google,
      // o campo de vinculo em "Minha conta" ja vem preenchido.
      salvarUltimoWhatsapp(form.phone);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao reservar");
    } finally {
      setSubmitting(false);
    }
  }

  if (created && service) {
    return (
      <SuccessCard
        created={created}
        serviceName={service.name}
        professionalName={professional?.name ?? ""}
        label={slot?.label ?? ""}
        phone={form.phone}
        logado={Boolean(clientEmail)}
      />
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-8">
        {/* progresso */}
        <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          {STEPS.map((label, index) => {
            const active = index === step;
            const done = index < step;
            return (
              <li key={label} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => index < step && setStep(index)}
                  disabled={index > step}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors ${
                    active
                      ? "border-gold bg-gold/10 text-gold"
                      : done
                        ? "border-line-strong text-bone"
                        : "border-line text-bone-dim/60"
                  }`}
                >
                  <span className="grid size-4 place-items-center rounded-full border border-current text-[0.6rem]">
                    {done ? <Check className="size-2.5" /> : index + 1}
                  </span>
                  {label}
                </button>
                {index < STEPS.length - 1 ? <span className="h-px w-4 bg-line-strong" /> : null}
              </li>
            );
          })}
        </ol>

        <div className="mt-8 min-h-[26rem] min-w-0 rounded-3xl border border-line bg-ink-2/60 p-6 md:p-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: -16 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {step === 0 ? (
                <StepService
                  services={services}
                  categories={categories}
                  selected={serviceId}
                  onSelect={(id) => {
                    setServiceId(id);
                    setSlot(null);
                  }}
                />
              ) : null}

              {step === 1 ? (
                <StepProfessional
                  professionals={professionals}
                  selected={professionalId}
                  onSelect={(id) => {
                    setProfessionalId(id);
                    setSlot(null);
                  }}
                />
              ) : null}

              {step === 2 ? (
                <SlotPicker
                  days={days}
                  windows={windows}
                  dateISO={dateISO}
                  onDate={(iso) => setDateISO(iso)}
                  slots={slots}
                  loading={loadingSlots}
                  selected={slot?.startsAt ?? null}
                  onSelect={(s) => setSlot(s)}
                  durationMin={service?.durationMin ?? 0}
                />
              ) : null}

              {step === 3 ? (
                <StepDetails
                  form={form}
                  setForm={setForm}
                  phoneMask={phoneMask}
                  error={error}
                  clientEmail={clientEmail}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm text-bone transition-colors hover:border-line-strong disabled:opacity-40"
          >
            <ArrowLeft className="size-4" /> Voltar
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(3, s + 1))}
              disabled={!canAdvance}
              className="group inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-transform duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continuar
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={
              submitting ||
              form.name.trim().length < 2 ||
              form.phone.replace(/\D/g, "").length < 10 ||
              !form.email.trim() ||
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
            }
              className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-transform duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {submitting ? "Reservando..." : "Confirmar reserva"}
            </button>
          )}
        </div>

        {error && step !== 3 ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      </div>

      {/* resumo */}
      <aside className="min-w-0 lg:col-span-4">
        <div className="sticky top-28 rounded-3xl border border-line bg-ink-2 p-6">
          <p className="eyebrow text-bone-dim">Resumo</p>

          <dl className="mt-5 space-y-4 text-sm">
            <SummaryRow icon={<Scissors className="size-4" />} label="Serviço">
              {service ? (
                <span>
                  {service.name}
                  <span className="block text-xs text-bone-dim">{service.durationMin} min</span>
                </span>
              ) : (
                <span className="text-bone-dim">Escolha um serviço</span>
              )}
            </SummaryRow>

            <SummaryRow icon={<User className="size-4" />} label="Profissional">
              {professional ? (
                <span>{professional.name}</span>
              ) : (
                <span className="text-bone-dim">Escolha o profissional</span>
              )}
            </SummaryRow>

            <SummaryRow icon={<CalendarDays className="size-4" />} label="Data">
              {slot ? (
                <span>
                  {labelFor(dateISO).weekday}, {labelFor(dateISO).day} de {labelFor(dateISO).month}
                </span>
              ) : (
                <span className="text-bone-dim">Escolha o horário</span>
              )}
            </SummaryRow>

            <SummaryRow icon={<Clock3 className="size-4" />} label="Horário">
              {slot ? <span>{slot.label}</span> : <span className="text-bone-dim">—</span>}
            </SummaryRow>
          </dl>

          <div className="mt-6 flex items-end justify-between border-t border-line pt-5">
            <span className="text-sm text-bone-dim">Total</span>
            <span className="display text-2xl text-gold">
              {service ? formatBRL(service.priceCents) : "—"}
            </span>
          </div>

          {service && !service.priceConfirmed ? (
            <p className="mt-3 text-xs leading-relaxed text-gold/80">
              Valor de referência — confirmado no atendimento.
            </p>
          ) : null}

          <p className="mt-5 rounded-2xl border border-line bg-ink/60 p-4 text-xs leading-relaxed text-bone-dim">
            Pagamento presencial na barbearia: Pix, cartão de débito/crédito ou dinheiro. Sem
            cobrança online — se precisar remarcar, é só chamar no WhatsApp.
          </p>
        </div>
      </aside>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-gold" aria-hidden>
        {icon}
      </span>
      <div className="flex-1">
        <dt className="text-xs uppercase tracking-[0.16em] text-bone-dim/70">{label}</dt>
        <dd className="mt-0.5">{children}</dd>
      </div>
    </div>
  );
}

function StepService({
  services,
  categories,
  selected,
  onSelect,
}: {
  services: ServiceView[];
  categories: ServiceCategory[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="display text-2xl">O que vamos fazer hoje?</h2>
      <p className="mt-2 text-sm text-bone-dim">Preços por serviço, com a duração real do atendimento.</p>

      <div className="mt-6 space-y-6">
        {categories.map((category) => {
          const items = services.filter((s) => s.categoryId === category.id);
          if (!items.length) return null;
          return (
            <div key={category.id}>
              <p className="eyebrow text-bone-dim">{category.name}</p>
              <ul className="mt-3 grid gap-2">
                {items.map((item) => {
                  const active = selected === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(item.id)}
                        aria-pressed={active}
                        className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-colors ${
                          active
                            ? "border-gold bg-gold/10"
                            : "border-line bg-ink/40 hover:border-line-strong"
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-medium">{item.name}</span>
                          <span className="mt-0.5 block text-xs text-bone-dim">
                            {item.durationMin} min
                          </span>
                        </span>
                        <span className="display text-lg text-gold">{formatBRL(item.priceCents)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepProfessional({
  professionals,
  selected,
  onSelect,
}: {
  professionals: ProfessionalSeed[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="display text-2xl">Com quem?</h2>
      <p className="mt-2 text-sm text-bone-dim">
        Cada profissional tem a própria agenda. Escolha quem vai cuidar do seu visual.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {professionals.map((professional) => {
          const active = selected === professional.id;
          return (
            <li key={professional.id}>
              <button
                type="button"
                onClick={() => onSelect(professional.id)}
                aria-pressed={active}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${
                  active ? "border-gold bg-gold/10" : "border-line bg-ink/40 hover:border-line-strong"
                }`}
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-full border border-gold/40 font-display text-base text-gold">
                  {professional.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <span>
                  <span className="block text-sm font-medium">{professional.name}</span>
                  <span className="mt-0.5 block text-xs text-bone-dim">{professional.role}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StepDetails({
  form,
  setForm,
  phoneMask,
  error,
  clientEmail,
}: {
  form: { name: string; phone: string; email: string; notes: string };
  setForm: (value: { name: string; phone: string; email: string; notes: string }) => void;
  phoneMask: (value: string) => string;
  error: string | null;
  /** Quando existe sessao, o horario ja nasce ligado a conta. */
  clientEmail?: string;
}) {
  const logado = Boolean(clientEmail);

  return (
    <div>
      <h2 className="display text-2xl">Só falta você.</h2>
      <p className="mt-2 text-sm text-bone-dim">
        Usamos o WhatsApp para confirmar. Sem spam, sem senha.
      </p>

      {logado ? (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-gold/30 bg-gold/[0.06] px-4 py-3 text-xs leading-relaxed text-bone">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" />
          <span>
            Você está logado como <span className="text-gold">{clientEmail}</span>. Este horário vai
            aparecer em <strong>Minha conta</strong> sozinho, com os pontos e o código de indicação.
          </span>
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-bone-dim">Nome</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoComplete="name"
            className="rounded-xl border border-line bg-ink px-4 py-3 text-bone placeholder:text-bone-dim/50 focus:border-gold focus:outline-none"
            placeholder="Como te chamamos?"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-bone-dim">WhatsApp</span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: phoneMask(e.target.value) })}
            required
            inputMode="tel"
            autoComplete="tel"
            className="rounded-xl border border-line bg-ink px-4 py-3 text-bone placeholder:text-bone-dim/50 focus:border-gold focus:outline-none"
            placeholder="(47) 99999-9999"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="text-bone-dim">E-mail</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            readOnly={logado}
            autoComplete="email"
            className={`rounded-xl border border-line bg-ink px-4 py-3 text-bone placeholder:text-bone-dim/50 focus:border-gold focus:outline-none ${
              logado ? "opacity-60 cursor-not-allowed" : ""
            }`}
            placeholder="você@email.com"
          />
          <span className="text-xs leading-relaxed text-bone-dim/70">
            Use o mesmo e-mail da sua conta Google: aí seus horários aparecem sozinhos em “Minha
            conta”, sem precisar confirmar o WhatsApp depois.
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="text-bone-dim">Observação (opcional)</span>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="resize-none rounded-xl border border-line bg-ink px-4 py-3 text-bone placeholder:text-bone-dim/50 focus:border-gold focus:outline-none"
            placeholder="Referência de corte, alergia, primeira vez..."
          />
        </label>
      </div>

      <p className="mt-5 text-xs leading-relaxed text-bone-dim">
        Ao confirmar, você concorda com o contato pelo WhatsApp e com a política de cancelamento de{" "}
        {business.name} (cancelamento sem custo até 1 hora antes).
      </p>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}

function SuccessCard({
  created,
  serviceName,
  professionalName,
  label,
  phone,
  logado,
}: {
  created: { id: string; startsAt: string; priceCents: number; loyalty: LoyaltyInfo | null };
  serviceName: string;
  professionalName: string;
  label: string;
  phone: string;
  logado: boolean;
}) {

  const date = new Date(created.startsAt);
  const local = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const dateLabel = `${String(local.getUTCDate()).padStart(2, "0")}/${String(local.getUTCMonth() + 1).padStart(2, "0")} às ${label}`;

  // A origem so existe no navegador: `useSyncExternalStore` serve o HTML do
  // servidor vazio e atualiza depois da hidratacao, sem divergencia.
  const origem = useSyncExternalStore(semInscricao, lerOrigem, () => "");

  const whatsappText = encodeURIComponent(
    `Olá! Acabei de reservar na Duh Corte: ${serviceName} com ${professionalName} em ${dateLabel}. Meu código é ${created.id.slice(0, 8)}.`,
  );


  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-3xl border border-gold/40 bg-gradient-to-b from-gold/10 to-transparent p-8 text-center md:p-12"
      >
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-gold text-ink">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="display mt-6 text-3xl md:text-4xl">Horário reservado!</h2>
        <p className="mt-3 text-sm text-bone-dim">
          {serviceName} com {professionalName}
          <br />
          <span className="text-bone">{dateLabel}</span>
        </p>
        <p className="mt-2 text-xs text-bone-dim">
          Aguardando confirmação da barbearia — você recebe um retorno no WhatsApp.
        </p>

        <div className="mx-auto mt-6 max-w-md rounded-2xl border border-gold/40 bg-ink/60 p-5 text-left">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold">
            <Ticket className="size-4" /> Código da reserva
          </p>
          <p className="display mt-2 text-2xl text-bone">{created.id.slice(0, 8).toUpperCase()}</p>
          <p className="mt-2 text-xs leading-relaxed text-bone-dim">
            Guarde este código: é por ele que a barbearia encontra o seu horário no sistema.
            Para remarcar ou cancelar, é só mandar o código no WhatsApp.
          </p>
        </div>

        <p className="mt-4 text-sm text-bone-dim">
          Valor: <span className="text-gold">{formatBRL(created.priceCents)}</span>
        </p>

        {created.loyalty ? (
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-line bg-ink/60 p-5 text-left">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold">
              <Sparkles className="size-4" /> Seus pontos
            </p>
            <p className="mt-2 text-sm text-bone">
              Você tem <span className="text-gold">{created.loyalty.points} pontos</span> no
              programa da casa.
            </p>
            {created.loyalty.progress.tier ? (
              <>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${Math.round(created.loyalty.progress.progresso * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-bone-dim">
                  Faltam {created.loyalty.progress.faltamPontos} pontos para{" "}
                  <span className="text-bone">{created.loyalty.progress.tier.label}</span>.
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-bone-dim">Você está no topo do programa. 👑</p>
            )}

            {created.loyalty.referralCode ? (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-xs leading-relaxed text-bone-dim">
                  Indique um amigo e ganhem{" "}
                  <span className="text-gold">30 pontos</span> para cada um assim que ele fizer o
                  primeiro corte. Seu código:
                </p>
                <p className="display mt-1 text-lg text-bone">{created.loyalty.referralCode}</p>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Corte na Duh Corte Barbearia? Use meu código ${created.loyalty.referralCode} e ganhe 30 pontos no seu primeiro corte: ${origem}/agendar?ref=${created.loyalty.referralCode}`,
                  )}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-xs font-medium text-bone transition-colors hover:border-gold hover:text-gold"
                >
                  <Share2 className="size-3.5" /> Indicar pelo WhatsApp
                </a>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8">
          <a
            href={logado ? "/minha-conta" : "/entrar?callbackUrl=/minha-conta"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-ink sm:w-auto"
          >
            <CalendarDays className="size-4" />
            {logado ? "Ver meus horários" : "Entrar com Google"}
          </a>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-bone-dim">
            {logado ? (
              "Este horário já aparece na sua conta, com pontos e código de indicação."
            ) : (
              <>
                Sem senha: no primeiro acesso, confirme o WhatsApp{" "}
                <span className="text-bone">{phone}</span> — já deixamos o campo pronto. Depois,
                seus horários aparecem sozinhos.
              </>
            )}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href={`/api/appointments/${created.id}/ics?tel=${encodeURIComponent(phone)}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line-strong px-6 py-3 text-sm text-bone transition-colors hover:border-gold hover:text-gold"
          >
            <CalendarDays className="size-4" /> Salvar na agenda
          </a>
          <a
            href={`https://wa.me/${business.whatsapp}?text=${whatsappText}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-ink"
          >
            <MessageCircle className="size-4" /> Confirmar no WhatsApp
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-line-strong px-6 py-3 text-sm text-bone transition-colors hover:border-gold hover:text-gold"
          >
            Voltar ao início
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-line bg-ink/70 p-5 text-left">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-bone-dim">
            <Wallet className="size-4 text-gold" /> Pagamento
          </p>
          <p className="mt-3 text-sm text-bone">
            O pagamento é feito <span className="text-gold">na barbearia</span>, no momento do
            atendimento: Pix, cartão de débito, cartão de crédito ou dinheiro.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-bone-dim">
            Nada é cobrado online. Se precisar remarcar, é só falar no WhatsApp — o horário fica
            reservado até 1 hora antes.
          </p>
        </div>


      </motion.div>
    </div>
  );
}
