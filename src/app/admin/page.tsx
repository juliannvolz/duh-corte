import type { Metadata } from "next";
import { connection } from "next/server";
import { isAdmin } from "@/lib/auth";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { readGoogleCalendarEnv, canWriteCalendar, canReadPublicCalendar } from "@/lib/google-calendar";

export const instant = false;

export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // sinaliza rota dinamica antes de ler cookie/Date.now (Cache Components)
  await connection();
  const authenticated = await isAdmin();

  const env = readGoogleCalendarEnv();
  const integrations = {
    googleCalendar: {
      enabled: canWriteCalendar(env) || canReadPublicCalendar(env),
      mode: (canWriteCalendar(env) ? "escrita" : canReadPublicCalendar(env) ? "leitura" : "desligado") as
        | "escrita"
        | "leitura"
        | "desligado",
      calendarId: env.calendarId,
    },
  };

  return (
    <div className="min-h-[80vh] pb-24 pt-28 md:pt-36">
      <div className="shell">
        {authenticated ? <AdminDashboard integrations={integrations} /> : <AdminLogin />}
      </div>
    </div>
  );
}
