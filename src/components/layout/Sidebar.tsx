"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "./nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-[220px] md:shrink-0 md:flex-col md:gap-6 md:border-r md:border-line md:bg-surface md:px-4 md:py-6">
      <Link href="/" className="flex items-center gap-3 px-2">
        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
          <Image src="/logo.png" alt="" fill sizes="40px" className="object-cover" priority />
        </span>
        <span className="text-sm font-bold leading-tight text-ink">
          MEUNASAH
          <br />
          SIAGA
        </span>
      </Link>

      <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
                active ? "bg-primary text-white" : "text-ink-secondary hover:bg-surface-muted hover:text-ink"
              }`}
            >
              <Icon size={20} strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
