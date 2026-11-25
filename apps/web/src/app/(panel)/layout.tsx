import { Button } from "@monorise-team/ui";
import type { ReactNode } from "react";
import { PanelNav } from "@/components/PanelNav";
import { load, requirePageSession } from "@/server/page";

export const dynamic = "force-dynamic";

/** Układ panelu: firma i zalogowana osoba, menu sekcji, wylogowanie. */
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { core } = await requirePageSession();
  const me = await load(() => core.getMe());

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-4 border-b border-border-primary pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-tertiary">Monorise · panel firmy</p>
            <p className="text-lg font-semibold text-text-primary">
              {me.ok ? me.data.organization.name : "Twoja firma"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {me.ok && (
              <span className="text-sm text-text-secondary">
                {me.data.employee.firstName} {me.data.employee.lastName}
                {me.data.account.isOwner && " · właściciel"}
              </span>
            )}
            <form method="post" action="/api/auth/sign-out">
              <Button type="submit" variant="outline">
                Wyloguj
              </Button>
            </form>
          </div>
        </div>
        <PanelNav />
      </header>
      <main className="flex flex-col gap-6">{children}</main>
    </div>
  );
}
