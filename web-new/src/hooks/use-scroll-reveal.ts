import { useEffect, useRef } from "react"

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const revealAll = () => {
      el.querySelectorAll(".reveal").forEach((child) => child.classList.add("visible"));
      if (el.classList.contains("reveal")) el.classList.add("visible");
    };

    // Without matchMedia the reduced-motion check below would throw.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      revealAll();
      return;
    }

    // Armed by the inline script in index.html, so if IntersectionObserver is
    // missing the content would otherwise stay at opacity 0 forever.
    if (!("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    )

    // Observe all .reveal descendants plus the ref itself
    const elements = el.querySelectorAll(".reveal")
    elements.forEach((child) => observer.observe(child))
    if (el.classList.contains("reveal")) {
      observer.observe(el)
    }

    return () => observer.disconnect()
  }, [])

  return ref
}
