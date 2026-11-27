import { BatteryCharging, History, House, Moon, Settings, type LucideIcon } from "lucide-react";

/** `shortLabel` is used in the bottom nav, where five tabs share 390 px. */
export const NAV_ITEMS: readonly { href: string; label: string; shortLabel?: string; icon: LucideIcon }[] = [
  { href: "/", label: "Beranda", icon: House },
  { href: "/uji-generator", label: "Monitor Baterai", shortLabel: "Baterai", icon: BatteryCharging },
  { href: "/riwayat", label: "Riwayat", icon: History },
  { href: "/jadwal", label: "Jadwal", icon: Moon },
  { href: "/pengaturan", label: "Atur", icon: Settings },
];

export function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
