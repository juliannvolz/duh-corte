import type { ReactNode } from "react";

export function Section({
  children,
  id,
  className = "",
  tone = "ink",
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  tone?: "ink" | "ink2" | "bone";
}) {
  const tones = {
    ink: "bg-ink",
    ink2: "bg-ink-2",
    bone: "bg-bone text-ink",
  } as const;

  return (
    <section id={id} className={`relative ${tones[tone]} ${className}`}>
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  accent,
  description,
  align = "left",
  action,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  description?: string;
  align?: "left" | "center";
  action?: ReactNode;
}) {
  const alignment = align === "center" ? "items-center text-center" : "items-start text-left";
  return (
    <div className={`flex flex-col gap-5 ${alignment}`}>
      <p className="eyebrow flex items-center gap-3 text-gold">
        <span className="h-px w-8 bg-gold/60" />
        {eyebrow}
      </p>
      <h2 className="display text-[clamp(2.2rem,6vw,4.6rem)]">
        {title}
        {accent ? <> <span className="accent gold-text normal-case">{accent}</span></> : null}
      </h2>
      {description ? (
        <p className="max-w-2xl text-base leading-relaxed text-bone-dim md:text-lg">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
