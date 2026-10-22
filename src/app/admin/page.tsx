import type { Metadata } from "next";
import { connection } from "next/server";
import { isAdminAccess } from "@/lib/admin-access";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { readGoogleCalendarEnv, canWriteCalendar, canReadPublicCalendar } from "@/lib/google-calendar";
import { getServices, getProfessionals } from "@/lib/content";
import { getWeekWindows } from "@/lib/booking";

export const instant = false;

export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // sinaliza rota dinamica antes de ler cookie/Date.now (Cache Components)
  await connection();
  const authenticated = await isAdminAccess();

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

  // catalogo para o dono marcar e remarcar horarios pelo painel
  const [services, professionals, windows] = await Promise.all([
    getServices(),
    getProfessionals(),
    getWeekWindows(),
  ]);

  return (
    <div className="min-h-[80vh] pb-24 pt-28 md:pt-36">
      <div className="shell">
        {authenticated ? (
          <AdminDashboard
            integrations={integrations}
            services={services.map((s) => ({
              id: s.id,
              name: s.name,
              durationMin: s.durationMin,
              priceCents: s.priceCents,
            }))}
            professionals={professionals.map((p) => ({ id: p.id, name: p.name }))}
            windows={windows}
          />
        ) : (
          <AdminLogin />
        )}
      </div>
    </div>
  );
}
