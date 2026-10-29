"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Pixel width of an element, kept current with a ResizeObserver. Charts use it
 * as their SVG viewBox width so 11 px text stays 11 px on a phone instead of
 * being scaled down with the drawing.
 */
export function useMeasuredWidth(ref: RefObject<HTMLElement | null>, fallback: number): number {
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(1, Math.round(el.getBoundingClientRect().width)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
