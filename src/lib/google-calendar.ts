/**
 * Integração com o Google Calendar (Agenda) do barbeiro.
 *
 * Tres modos, ativados por variaveis de ambiente (nenhuma obrigatoria):
 *
 * 1) Somente leitura com agenda publica (mais simples):
 *    GOOGLE_CALENDAR_ID=id@group.calendar.google.com
 *    GOOGLE_CALENDAR_API_KEY=AIza...
 *    -> a agenda publica do barbeiro e consultada para esconder horarios
 *       ja ocupados (freebusy).
 *
 * 2) Conta de servico (agenda privada, leitura + criacao de eventos):
 *    GOOGLE_CALENDAR_ID=...
 *    GOOGLE_SERVICE_ACCOUNT_EMAIL=conta@projeto.iam.gserviceaccount.com
 *    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
 *    -> alem de ler, cada reserva vira um evento na agenda.
 *
 * 3) Desligado (padrao): o site funciona so com a agenda interna.
 *
 * A agenda precisa ser compartilhada com a conta de servico
 * ("Compartilhar agenda" > "Adicionar pessoas" > e-mail da conta).
 */

import { createSign } from "node:crypto";

export type GoogleCalendarEnv = {
  calendarId: string | null;
  apiKey: string | null;
  serviceAccountEmail: string | null;
  serviceAccountPrivateKey: string | null;
};

export function readGoogleCalendarEnv(): GoogleCalendarEnv {
  return {
    calendarId: process.env.GOOGLE_CALENDAR_ID ?? null,
    apiKey: process.env.GOOGLE_CALENDAR_API_KEY ?? null,
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? null,
    serviceAccountPrivateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
      ? process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n")
      : null,
  };
}

/** Leitura de agenda publica + chave de API. */
export function canReadPublicCalendar(env = readGoogleCalendarEnv()): boolean {
  return Boolean(env.calendarId && env.apiKey);
}

/** Conta de servico: leitura e criacao de eventos. */
export function canWriteCalendar(env = readGoogleCalendarEnv()): boolean {
  return Boolean(env.calendarId && env.serviceAccountEmail && env.serviceAccountPrivateKey);
}

export function googleCalendarEnabled(env = readGoogleCalendarEnv()): boolean {
  return canReadPublicCalendar(env) || canWriteCalendar(env);
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Assina um JWT RS256 para trocar por um access token do Google. */
async function serviceAccountToken(
  email: string,
  privateKey: string,
  scope = "https://www.googleapis.com/auth/calendar",
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const toSign = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(toSign);
  const signature = base64url(signer.sign(privateKey, "base64"));

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${toSign}.${signature}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google OAuth falhou: ${response.status} ${await response.text()}`);
  }
  const json = (await response.json()) as { access_token: string };
  return json.access_token;
}

async function authHeaders(env: GoogleCalendarEnv): Promise<Record<string, string>> {
  if (canWriteCalendar(env)) {
    const token = await serviceAccountToken(
      env.serviceAccountEmail as string,
      env.serviceAccountPrivateKey as string,
    );
    return { Authorization: `Bearer ${token}` };
  }
  if (canReadPublicCalendar(env)) {
    return { "x-goog-api-key": env.apiKey as string };
  }
  throw new Error("Google Calendar nao configurado");
}

/** Intervalo ocupado (minutos locais do dia). */
export type BusySlot = { startMin: number; endMin: number };

/**
 * Horarios ocupados na agenda do Google para um dia local (America/Sao_Paulo).
 * Retorna [] quando a integracao esta desligada ou falha (o site segue funcionando).
 */
export async function getGoogleBusy(
  dateISO: string,
  env = readGoogleCalendarEnv(),
): Promise<BusySlot[]> {
  if (!googleCalendarEnabled(env)) return [];

  try {
    const headers = await authHeaders(env);
    const timeMin = `${dateISO}T00:00:00-03:00`;
    const timeMax = `${dateISO}T23:59:59-03:00`;

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          timeMin,
          timeMax,
          timeZone: "America/Sao_Paulo",
          items: [{ id: env.calendarId as string }],
        }),
      },
    );

    if (!response.ok) return [];
    const json = (await response.json()) as {
      calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
    };

    const busy = json.calendars?.[env.calendarId as string]?.busy ?? [];
    const dia = new Date(`${dateISO}T00:00:00Z`).getTime();

    return busy
      .map((event) => {
        const inicio = (new Date(event.start).getTime() - dia) / 60000;
        const fim = (new Date(event.end).getTime() - dia) / 60000;
        return { startMin: Math.round(inicio), endMin: Math.round(fim) };
      })
      .filter((slot) => slot.endMin > 0 && slot.startMin < 24 * 60);
  } catch {
    return [];
  }
}

export type CalendarEventInput = {
  summary: string;
  description: string;
  location: string;
  /** ISO UTC do inicio. */
  startsAt: string;
  /** ISO UTC do fim. */
  endsAt: string;
};

/**
 * Cria o evento na agenda do Google (somente conta de servico).
 * Falhas nao quebram a reserva: o erro e apenas logado.
 */
export async function createGoogleEvent(
  input: CalendarEventInput,
  env = readGoogleCalendarEnv(),
): Promise<{ id: string; htmlLink: string } | null> {
  if (!canWriteCalendar(env)) return null;

  try {
    const headers = await authHeaders(env);
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        env.calendarId as string,
      )}/events?sendUpdates=none`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          summary: input.summary,
          description: input.description,
          location: input.location,
          start: { dateTime: input.startsAt, timeZone: "America/Sao_Paulo" },
          end: { dateTime: input.endsAt, timeZone: "America/Sao_Paulo" },
        }),
      },
    );

    if (!response.ok) return null;
    const json = (await response.json()) as { id: string; htmlLink: string };
    return { id: json.id, htmlLink: json.htmlLink };
  } catch {
    return null;
  }
}

/**
 * Arquivo .ics para o cliente salvar o horario na propria agenda
 * (Google Agenda, Apple Calendar, Outlook). Nao exige nenhuma credencial.
 */
export function buildIcs(input: {
  uid: string;
  summary: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
}): string {
  /**
   * Data/hora no formato iCalendar em UTC: "20261028T130000Z".
   * O `Z` (UTC) ja vem do `toISOString()` — por isso nao se acrescenta
   * outro no template (o bug antigo gerava "ZZ" e o Google Agenda recusava).
   */
  const stamp = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const escape = (value: string) =>
    value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Duh Corte//Agendamento//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escape(input.uid)}@duhcutebarbearia.com.br`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(input.startsAt)}`,
    `DTEND:${stamp(input.endsAt)}`,
    `SUMMARY:${escape(input.summary)}`,
    `DESCRIPTION:${escape(input.description)}`,
    `LOCATION:${escape(input.location)}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(input.summary)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
