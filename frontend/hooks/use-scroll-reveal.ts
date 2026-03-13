"use client";

import { useCallback, useRef } from "react";

export function useScrollReveal(threshold = 0.15) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      // Disconnect previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("revealed");
              observerRef.current?.unobserve(entry.target);
            }
          });
        },
        { threshold }
      );

      observerRef.current.observe(node);
    },
    [threshold]
  );

  return ref;
}
