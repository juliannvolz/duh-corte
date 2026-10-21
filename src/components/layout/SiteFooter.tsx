import Link from "next/link";
import { Instagram, MapPin, Phone } from "lucide-react";
import { business, navLinks } from "@/lib/site";
import { FooterYear } from "@/components/layout/FooterYear";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-line bg-ink-2">
      <div className="shell grid gap-12 py-16 md:grid-cols-12 md:py-24">
        <div className="md:col-span-5">
          <img
            src="/brand/logo-bone.png"
            alt="Duh Corte Barbearia"
            width={764}
            height={420}
            className="h-16 w-auto md:h-20"
          />
          <p className="accent mt-4 text-2xl text-bone-dim">{business.tagline}</p>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-bone-dim">
            {business.address.street} — {business.address.neighborhood}, {business.address.city}/
            {business.address.state}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={business.address.mapsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm text-bone transition-colors hover:border-gold hover:text-gold"
            >
              <MapPin className="size-4" /> Como chegar
            </a>
            <a
              href={business.instagram}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm text-bone transition-colors hover:border-gold hover:text-gold"
            >
              <Instagram className="size-4" /> {business.instagramHandle}
            </a>
          </div>
        </div>

        <nav aria-label="Rodapé" className="md:col-span-3">
          <p className="eyebrow text-bone-dim">Navegar</p>
          <ul className="mt-5 space-y-3">
            {[...navLinks, { href: "/agendar", label: "Agendar" }, { href: "/servicos", label: "Tabela completa" }].map(
              (link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-bone-dim transition-colors hover:text-gold">
                    {link.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="md:col-span-4">
          <p className="eyebrow text-bone-dim">Atendimento</p>
          <ul className="mt-5 space-y-2 text-sm text-bone-dim">
            <li>Segunda a sexta — 09:00 às 19:00</li>
            <li>Sábado e domingo — fechado</li>
          </ul>
          <a
            href={`tel:${business.phoneE164}`}
            className="mt-6 inline-flex items-center gap-2 text-sm text-bone transition-colors hover:text-gold"
          >
            <Phone className="size-4" /> {business.phone}
          </a>
          <p className="mt-6 text-xs leading-relaxed text-bone-dim/70">
            Valores de referência em validação. Preços finais confirmados na barbearia.
          </p>
        </div>
      </div>

      <div className="shell flex flex-col gap-3 border-t border-line py-6 text-xs text-bone-dim/70 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © <FooterYear /> {business.name}. Todos os direitos reservados.
        </p>
        <div className="flex gap-6">
          <Link href="/privacidade" className="transition-colors hover:text-bone">
            Privacidade
          </Link>
          <span className="text-gold">{business.hashtag}</span>
        </div>
      </div>
    </footer>
  );
}
