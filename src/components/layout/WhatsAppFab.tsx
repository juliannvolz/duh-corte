"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle } from "lucide-react";
import { business } from "@/lib/site";

export function WhatsAppFab() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const href = `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(
    "Olá! Quero agendar um horário na Duh Corte Barbearia.",
  )}`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-4 text-sm font-semibold text-[#0a0a0a] shadow-[0_10px_40px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:scale-105"
          aria-label="Falar no WhatsApp"
        >
          <MessageCircle className="size-5" />
          <span className="hidden sm:inline">Agendar no WhatsApp</span>
        </motion.a>
      )}
    </AnimatePresence>
  );
}
