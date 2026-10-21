import type { Metadata } from "next";
import { business } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como a Duh Corte Barbearia trata os dados informados no agendamento.",
  alternates: { canonical: "/privacidade" },
  robots: { index: false, follow: true },
};

const sections = [
  {
    title: "Quais dados coletamos",
    body: "Nome, WhatsApp, e-mail (opcional) e observações do agendamento. Nada além disso é solicitado no site.",
  },
  {
    title: "Para que usamos",
    body: "Exclusivamente para confirmar, remarcar ou cancelar o seu horário e para o histórico de atendimento da barbearia.",
  },
  {
    title: "Com quem compartilhamos",
    body: "Não vendemos e não cedemos seus dados. O contato acontece por WhatsApp e, quando você escolhe pagar por Pix, apenas o valor e o identificador do agendamento trafegam no QR Code.",
  },
  {
    title: "Por quanto tempo guardamos",
    body: "O histórico de agendamentos fica armazenado para fins de atendimento e obrigações fiscais. Você pode pedir a exclusão a qualquer momento pelo WhatsApp.",
  },
  {
    title: "Seus direitos",
    body: `Conforme a LGPD (Lei 13.709/2018), você pode solicitar acesso, correção ou exclusão dos seus dados. Fale com a gente em ${business.phone}.`,
  },
  {
    title: "Cookies",
    body: "O site não usa cookies de rastreamento. O painel administrativo usa um cookie de sessão essencial, restrito à equipe da barbearia.",
  },
];

export default function PrivacidadePage() {
  return (
    <div className="pb-24 pt-28 md:pt-36">
      <div className="shell max-w-3xl">
        <p className="eyebrow text-gold">Privacidade</p>
        <h1 className="display mt-4 text-[clamp(2.2rem,6vw,4rem)]">Seus dados, suas regras.</h1>
        <p className="mt-5 text-sm leading-relaxed text-bone-dim">
          Última atualização: outubro de 2026. Esta política cobre apenas o site da {business.name}.
        </p>

        <div className="mt-12 space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="border-t border-line pt-6">
              <h2 className="display text-xl">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-bone-dim">{section.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-12 rounded-2xl border border-line bg-ink-2 p-5 text-xs leading-relaxed text-bone-dim">
          Responsável pelo tratamento: {business.name} — {business.address.street},{" "}
          {business.address.neighborhood}, {business.address.city}/{business.address.state}.
          Contato: {business.phone}.
        </p>
      </div>
    </div>
  );
}
