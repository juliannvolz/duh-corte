import { ExternalLink, MapPin, Phone } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { business, openingHours, weekdayLabel, formatTime } from "@/lib/site";
import type { Weekday } from "@/lib/site";

const order: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export function Location() {
  const mapQuery = encodeURIComponent(
    `${business.address.street}, ${business.address.neighborhood}, ${business.address.city} - ${business.address.state}`,
  );

  return (
    <Section id="local" tone="ink2" className="py-24 md:py-36">
      <div className="shell grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading
            eyebrow="Onde estamos"
            title="Vila Nova,"
            accent="Jaraguá do Sul."
            description="Fica na esquina, com a barber pole na porta. Estacione na frente e suba — a agenda abre às 9h."
          />

          <Reveal delay={0.1}>
            <ul className="mt-10 space-y-4 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold" />
                <span>
                  {business.address.street}
                  <br />
                  {business.address.neighborhood} — {business.address.city}/{business.address.state}
                  <br />
                  <span className="text-bone-dim">CEP {business.address.zip}</span>
                </span>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-gold" />
                <a href={`tel:${business.phoneE164}`} className="transition-colors hover:text-gold">
                  {business.phone}
                </a>
              </li>
            </ul>
          </Reveal>

          <Reveal delay={0.16}>
            <div className="mt-10 rounded-3xl border border-line bg-ink p-7">
              <p className="eyebrow text-bone-dim">Horário de funcionamento</p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {order.map((day) => {
                  const hours = openingHours[day];
                  return (
                    <li key={day} className="flex items-center justify-between gap-6">
                      <span className={hours ? "text-bone" : "text-bone-dim/60"}>{weekdayLabel[day]}</span>
                      <span className={hours ? "font-medium text-bone" : "text-bone-dim/60"}>
                        {hours ? `${formatTime(hours.open)} — ${formatTime(hours.close)}` : "Fechado"}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-bone-dim/70">
                Sexta com horário reduzido em dias de evento — confirme pelo WhatsApp.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <a
              href={business.address.mapsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-line-strong px-6 py-3 text-sm transition-colors hover:border-gold hover:text-gold"
            >
              Abrir no Google Maps
              <ExternalLink className="size-4" />
            </a>
          </Reveal>
        </div>

        <Reveal direction="right" delay={0.1} className="lg:col-span-7">
          <div className="relative h-full min-h-96 overflow-hidden rounded-3xl border border-line">
            <iframe
              title={`Mapa — ${business.name}`}
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full grayscale-[0.35] contrast-[1.05]"
            />
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
