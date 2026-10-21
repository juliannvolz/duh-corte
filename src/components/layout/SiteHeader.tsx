"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Menu, X } from "lucide-react";
import { business, navLinks } from "@/lib/site";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { AccountButton } from "@/components/account/AccountButton";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <ScrollProgress />
      <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
        scrolled || open
          ? "border-b border-line bg-ink/90"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="shell flex h-18 items-center justify-between gap-6 md:h-22">
        <Link
          href="/"
          className="group flex items-center gap-3"
          aria-label={`${business.name} — início`}
          onClick={() => setOpen(false)}
        >
          <img
            src="/brand/wordmark-bone.png"
            alt="Duh Corte Barbearia"
            width={1186}
            height={324}
            className="h-9 w-auto transition-opacity duration-500 group-hover:opacity-80 md:h-10"
          />
        </Link>

        <nav aria-label="Navegação principal" className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative text-sm text-bone-dim transition-colors duration-300 hover:text-bone"
            >
              {link.label}
              <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-gold transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={`tel:${business.phoneE164}`}
            className="hidden text-sm text-bone-dim transition-colors hover:text-bone sm:block"
          >
            {business.phone}
          </a>

          <AccountButton />

          <Link
            href="/agendar"
            className="group relative hidden overflow-hidden rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-transform duration-300 hover:scale-[1.03] sm:inline-flex"
          >
            <span className="relative z-10">Agendar</span>
            <span className="absolute inset-0 -translate-x-full bg-bone transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0" />
            <span className="relative z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-0" aria-hidden />
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid size-11 place-items-center rounded-full border border-line text-bone lg:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="menu-mobile"
            aria-label="Navegação mobile"
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-line bg-ink/95 backdrop-blur-xl lg:hidden"
          >
            <ul className="shell flex flex-col gap-1 py-6">
              {navLinks.map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={reduced ? false : { opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.05, duration: 0.5 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="display block py-3 text-3xl text-bone transition-colors hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
              <li className="mt-4">
                <Link
                  href="/agendar"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center rounded-full bg-gold px-6 py-4 font-semibold text-ink"
                >
                  Agendar horário
                </Link>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
    </>
  );
}

