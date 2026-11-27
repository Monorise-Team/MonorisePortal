"use client";

import {
  AppShell,
  Avatar,
  Card,
  CommandPalette,
  ShortcutsHelp,
  SidebarCollapseButton,
  SidebarItem,
  SidebarLink,
  SidebarNav,
  SidebarShell,
  ThemeProvider,
  ToastProvider,
  useCommandPalette,
  useHotkeys,
  useSidebar,
  type CommandPaletteGroup,
} from "@monorise-team/ui";
import {
  AppWindow,
  Bell,
  Building2,
  LogOut,
  Network,
  Palette,
  ScrollText,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";

interface Section {
  href: string;
  label: string;
  icon: ReactNode;
  shortcut: string;
}

const SECTIONS: readonly Section[] = [
  { href: "/", label: "Firma", icon: <Building2 size={16} />, shortcut: "g f" },
  { href: "/employees", label: "Pracownicy", icon: <Users size={16} />, shortcut: "g p" },
  { href: "/structure", label: "Struktura", icon: <Network size={16} />, shortcut: "g s" },
  { href: "/roles", label: "Role", icon: <ShieldCheck size={16} />, shortcut: "g r" },
  { href: "/apps", label: "Aplikacje", icon: <AppWindow size={16} />, shortcut: "g a" },
];

const AUDIT_SECTION: Section = {
  href: "/audit",
  label: "Dziennik",
  icon: <ScrollText size={16} />,
  shortcut: "g d",
};

const NOTIFICATIONS: Section = {
  href: "/notifications",
  label: "Powiadomienia",
  icon: <Bell size={16} />,
  shortcut: "g n",
};

const SETTINGS: Section = { href: "/settings", label: "Wygląd", icon: <Palette size={16} />, shortcut: "g w" };

const PERSONAL_SECTIONS: readonly Section[] = [NOTIFICATIONS, SETTINGS];

interface PanelShellProps {
  organizationName: string;
  personName: string | null;
  isOwner: boolean;
  canReadAudit: boolean;
  children: ReactNode;
}

/**
 * Szkielet panelu (wygląd z aven-mail, MonoriseShared#54–#57): tło z doliną, zwijany pasek boczny, treść na
 * szklanej karcie, paleta poleceń (⌘K / Ctrl+K) i skróty `g …`. Same strony i formularze zostają po stronie
 * serwera i działają bez JavaScriptu.
 */
export function PanelShell({ organizationName, personName, isOwner, canReadAudit, children }: PanelShellProps) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ShellContent
          organizationName={organizationName}
          personName={personName}
          isOwner={isOwner}
          canReadAudit={canReadAudit}
        >
          {children}
        </ShellContent>
      </ToastProvider>
    </ThemeProvider>
  );
}

function ShellContent({ organizationName, personName, isOwner, canReadAudit, children }: PanelShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const palette = useCommandPalette();
  const [helpOpen, setHelpOpen] = useState(false);
  const signOutForm = useRef<HTMLFormElement>(null);

  const visibleSections = useMemo(() => (canReadAudit ? [...SECTIONS, AUDIT_SECTION] : [...SECTIONS]), [canReadAudit]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const go = (href: string) => router.push(href);
  const navigate = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    // Zwykły link działa bez JavaScriptu; z JavaScriptem przejście bez przeładowania strony
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    go(href);
  };

  useHotkeys(
    [...visibleSections, ...PERSONAL_SECTIONS].map((section) => ({
      shortcut: section.shortcut,
      handler: () => go(section.href),
    })),
  );

  const groups = useMemo<CommandPaletteGroup[]>(
    () => [
      {
        id: "go",
        label: "Przejdź do",
        items: [...visibleSections, ...PERSONAL_SECTIONS].map((section) => ({
          id: section.href,
          label: section.label,
          icon: section.icon,
          shortcut: section.shortcut,
          onSelect: () => go(section.href),
        })),
      },
      {
        id: "actions",
        label: "Działania",
        items: [
          {
            id: "invite",
            label: "Zaproś osobę…",
            description: "Wyślij zaproszenie do nowego pracownika",
            icon: <UserPlus size={16} />,
            keywords: ["zaproszenie", "pracownik", "konto"],
            onSelect: () => go("/employees#zapros"),
          },
          {
            id: "unit",
            label: "Nowa jednostka…",
            description: "Dodaj oddział, dział albo zespół",
            icon: <Network size={16} />,
            keywords: ["struktura", "oddział", "dział", "zespół"],
            onSelect: () => go("/structure#nowa-jednostka"),
          },
          {
            id: "role",
            label: "Nowa rola…",
            description: "Skopiuj gotową rolę i zmień uprawnienia",
            icon: <ShieldCheck size={16} />,
            keywords: ["uprawnienia", "kierownik"],
            onSelect: () => go("/roles#nowa-rola"),
          },
          {
            id: "access",
            label: "Nadaj dostęp do aplikacji…",
            icon: <AppWindow size={16} />,
            keywords: ["timotime", "avenmail", "dostęp"],
            onSelect: () => go("/apps"),
          },
          {
            id: "shortcuts",
            label: "Skróty klawiszowe",
            shortcut: "shift+?",
            onSelect: () => setHelpOpen(true),
          },
          {
            id: "sign-out",
            label: "Wyloguj",
            icon: <LogOut size={16} />,
            onSelect: () => signOutForm.current?.requestSubmit(),
          },
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `go` zależy tylko od routera
    [router, visibleSections],
  );

  return (
    <AppShell>
      <SidebarShell
        aria-label="Sekcje panelu"
        footer={
          <div className="flex flex-col gap-1">
            {PERSONAL_SECTIONS.map((section) => (
              <SidebarLink
                key={section.href}
                href={section.href}
                icon={section.icon}
                label={section.label}
                active={isActive(section.href)}
                onClick={navigate(section.href)}
              />
            ))}
            <form ref={signOutForm} method="post" action="/api/auth/sign-out">
              <SidebarItem type="submit" icon={<LogOut size={16} />} label="Wyloguj" />
            </form>
            <SidebarCollapseButton />
          </div>
        }
      >
        <SidebarHeader organizationName={organizationName} personName={personName} isOwner={isOwner} />
        <SidebarNav>
          {visibleSections.map((section) => (
            <SidebarLink
              key={section.href}
              href={section.href}
              icon={section.icon}
              label={section.label}
              active={isActive(section.href)}
              onClick={navigate(section.href)}
            />
          ))}
        </SidebarNav>
      </SidebarShell>

      <Card surface="reading" className="min-w-0 flex-1 overflow-y-auto">
        <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">{children}</main>
      </Card>

      <CommandPalette
        open={palette.open}
        onOpenChange={palette.onOpenChange}
        groups={groups}
        placeholder="Szukaj w panelu…"
        emptyText="Nic nie pasuje."
      />
      <ShortcutsHelp
        open={helpOpen}
        onOpenChange={setHelpOpen}
        bindShortcut
        categories={[
          {
            category: "Ogólne",
            items: [
              { label: "Paleta poleceń", shortcut: "mod+k" },
              { label: "Skróty klawiszowe", shortcut: "shift+?" },
            ],
          },
          {
            category: "Przejdź do",
            items: [...visibleSections, ...PERSONAL_SECTIONS].map((section) => ({
              label: section.label,
              shortcut: section.shortcut,
            })),
          },
        ]}
      />
    </AppShell>
  );
}

/** Firma i osoba na górze paska; po zwinięciu sam znak firmy z pełną nazwą dla czytników ekranu. */
function SidebarHeader({ organizationName, personName, isOwner }: Omit<PanelShellProps, "children" | "canReadAudit">) {
  const { collapsed } = useSidebar();
  if (collapsed) {
    return (
      <div className="flex justify-center pt-3 pb-2">
        <Avatar name={organizationName} size="sm" title={organizationName} />
      </div>
    );
  }
  return (
    <div className="px-3 pt-3 pb-2">
      <p className="text-xs uppercase tracking-wide text-text-tertiary">Monorise · panel firmy</p>
      <p className="truncate text-sm font-semibold text-text-primary">{organizationName}</p>
      {personName && (
        <p className="truncate text-xs text-text-secondary">
          {personName}
          {isOwner && " · właściciel"}
        </p>
      )}
    </div>
  );
}
