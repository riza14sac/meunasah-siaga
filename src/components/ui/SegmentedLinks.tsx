"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Segmented control whose segments are pages, so each one has its own URL. */
export function SegmentedLinks({ items, label }: { items: { href: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  const activeHref = [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href;

  return (
    <nav
      aria-label={label}
      className="grid gap-1 rounded-md bg-surface-muted p-1"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-sm px-3 py-2 text-center text-sm font-semibold transition-colors ${
              active ? "bg-primary text-white" : "text-ink-secondary hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export const RIWAYAT_TABS = [
  { href: "/riwayat", label: "Pemadaman" },
  { href: "/riwayat/pengujian", label: "Pengujian Alat" },
];
