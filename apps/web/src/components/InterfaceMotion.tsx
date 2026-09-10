"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Progressive enhancement: content remains visible without JS or motion. */
export function InterfaceMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let cleanup = () => {};
    const configure = () => {
      cleanup();
      if (preference.matches) return;
      const animations = new Set<Animation>();
      const seen = new WeakSet<Element>();
      const selector = ".summary-actions > *, .summary-metrics > *, .agenda-pulse > *, .agenda-entry, .citizen-page form > section, .optional-fields, .welcome-video-card";
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          const element = entry.target as HTMLElement;
          const siblings = Array.from(element.parentElement?.children || []);
          const delay = Math.min(siblings.indexOf(element) % 4, 3) * 65;
          const animation = element.animate([
            { opacity: 0, transform: "translateY(22px) scale(.985)" },
            { opacity: 1, transform: "translateY(0) scale(1)" }
          ], { duration: 650, delay, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        });
      }, { threshold: 0.08 });
      const scan = () => document.querySelectorAll(selector).forEach(element => {
        if (!seen.has(element)) { seen.add(element); observer.observe(element); }
      });
      scan();
      const mutations = new MutationObserver(scan);
      mutations.observe(document.body, { childList: true, subtree: true });
      let frame = 0;
      let active: HTMLElement | null = null;
      const reset = () => {
        cancelAnimationFrame(frame);
        active?.style.removeProperty("--light-x");
        active?.style.removeProperty("--light-y");
        active = null;
      };
      const move = (event: PointerEvent) => {
        if (!finePointer.matches || !(event.target instanceof Element)) return;
        const target = event.target.closest<HTMLElement>(".welcome-hero, .workspace-hero");
        if (active && active !== target) reset();
        if (!target) return;
        active = target;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const bounds = target.getBoundingClientRect();
          target.style.setProperty("--light-x", `${event.clientX - bounds.left}px`);
          target.style.setProperty("--light-y", `${event.clientY - bounds.top}px`);
        });
      };
      document.addEventListener("pointermove", move, { passive: true });
      document.addEventListener("pointerleave", reset);
      cleanup = () => {
        observer.disconnect(); mutations.disconnect(); reset();
        animations.forEach(animation => animation.cancel());
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerleave", reset);
      };
    };
    configure();
    preference.addEventListener("change", configure);
    return () => { cleanup(); preference.removeEventListener("change", configure); };
  }, [pathname]);
  return null;
}
