"use client";

import { useEffect, useRef } from "react";

/**
 * Poeira dourada em canvas — camada de particulas sobre as seções escuras.
 *
 * Sem dependencia externa: sprite radial desenhado uma vez e replicado com
 * drawImage (barato). Respeita prefers-reduced-motion (frame unico, sem loop),
 * pausa quando a aba esta oculta ou a secao sai da tela e limita o DPR a 2.
 */
export function Particles({
  className = "",
  color = "214, 168, 74",
  density = 0.00009,
  speed = 0.18,
  maxSize = 2.2,
  interactive = true,
}: {
  className?: string;
  /** RGB do halo, sem parenteses. */
  color?: string;
  /** Particulas por pixel^2 (0.00009 ~ 60 particulas em 1440x900). */
  density?: number;
  speed?: number;
  maxSize?: number;
  /** Reage ao cursor (repele suavemente). */
  interactive?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = true;
    let pageVisible = !document.hidden;

    type Particle = { x: number; y: number; r: number; vx: number; vy: number; alpha: number };
    const particles: Particle[] = [];
    const pointer = { x: -9999, y: -9999 };

    // sprite do halo (desenhado uma vez)
    const sprite = document.createElement("canvas");
    const SPRITE = 64;
    sprite.width = SPRITE;
    sprite.height = SPRITE;
    const sctx = sprite.getContext("2d");
    if (sctx) {
      const grad = sctx.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
      grad.addColorStop(0, `rgba(${color}, 0.95)`);
      grad.addColorStop(0.35, `rgba(${color}, 0.35)`);
      grad.addColorStop(1, `rgba(${color}, 0)`);
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, SPRITE, SPRITE);
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const compacto = rect.width < 768;
      const dpr = Math.min(window.devicePixelRatio || 1, compacto ? 1.5 : 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // no celular: menos particulas e passo maior (o brilho faz o trabalho)
      const raw = Math.floor(width * height * density);
      const total = Math.max(
        compacto ? 10 : 16,
        Math.min(compacto ? 40 : 140, raw),
      );
      particles.length = 0;
      for (let i = 0; i < total; i += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * maxSize + 0.5,
          vx: (Math.random() - 0.5) * 0.14,
          vy: -(Math.random() * speed + 0.04),
          alpha: Math.random() * 0.45 + 0.12,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (interactive) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 90 && dist > 0.5) {
            const push = (90 - dist) / 90;
            p.x += (dx / dist) * push * 1.6;
            p.y += (dy / dist) * push * 1.6;
          }
        }

        if (p.y < -12) {
          p.y = height + 12;
          p.x = Math.random() * width;
        }
        if (p.x < -12) p.x = width + 12;
        if (p.x > width + 12) p.x = -12;

        const size = p.r * 7;
        ctx.globalAlpha = p.alpha;
        ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (reduced || raf || !visible || !pageVisible) return;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    resize();
    draw();

    if (!reduced) {
      start();
      const observer = new IntersectionObserver(
        (entries) => {
          visible = entries[0]?.isIntersecting ?? true;
          if (visible) start();
          else stop();
        },
        { threshold: 0 },
      );
      observer.observe(canvas);

      const onVisibility = () => {
        pageVisible = !document.hidden;
        if (pageVisible) start();
        else stop();
      };
      document.addEventListener("visibilitychange", onVisibility);

      const onPointer = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        pointer.x = event.clientX - rect.left;
        pointer.y = event.clientY - rect.top;
      };
      const onLeave = () => {
        pointer.x = -9999;
        pointer.y = -9999;
      };
      if (interactive) {
        canvas.parentElement?.addEventListener("pointermove", onPointer);
        canvas.parentElement?.addEventListener("pointerleave", onLeave);
      }

      const resizeObserver = new ResizeObserver(() => {
        resize();
        draw();
      });
      resizeObserver.observe(canvas);

      return () => {
        stop();
        observer.disconnect();
        resizeObserver.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        canvas.parentElement?.removeEventListener("pointermove", onPointer);
        canvas.parentElement?.removeEventListener("pointerleave", onLeave);
      };
    }

    return () => stop();
  }, [color, density, speed, maxSize, interactive]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
    />
  );
}
