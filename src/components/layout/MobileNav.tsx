"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "./nav";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 flex rounded-t-xl bg-surface shadow-nav md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
              active ? "text-primary" : "text-ink-secondary"
            }`}
          >
            <Icon size={22} strokeWidth={1.5} className={active ? "text-primary" : "text-icon"} />
            {item.shortLabel ?? item.label}
          </Link>
        );
      })}
    </nav>
  );
}
