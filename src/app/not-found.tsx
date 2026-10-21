import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[80vh] place-items-center px-6 pt-24">
      <div className="max-w-lg text-center">
        <p className="display text-[clamp(5rem,18vw,10rem)] leading-none text-gold/20">404</p>
        <h1 className="display -mt-4 text-3xl md:text-4xl">Essa página saiu para cortar o cabelo.</h1>
        <p className="mt-4 text-sm leading-relaxed text-bone-dim">
          O link que você acessou não existe (ou mudou de lugar). Volte para a home ou reserve seu
          horário direto na agenda.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-transform hover:scale-[1.02]"
          >
            Voltar ao início
          </Link>
          <Link
            href="/agendar"
            className="rounded-full border border-line-strong px-6 py-3 text-sm text-bone transition-colors hover:border-gold hover:text-gold"
          >
            Agendar horário
          </Link>
        </div>
      </div>
    </div>
  );
}
