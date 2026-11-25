"use client";

import { cn } from "@monorise-team/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Firma" },
  { href: "/employees", label: "Pracownicy" },
  { href: "/structure", label: "Struktura" },
  { href: "/roles", label: "Role" },
  { href: "/apps", label: "Aplikacje" },
] as const;

/** Menu panelu z zaznaczoną bieżącą sekcją. */
export function PanelNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sekcje panelu" className="flex flex-wrap gap-1">
      {LINKS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-control px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-bg-hover text-text-primary"
                : "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
