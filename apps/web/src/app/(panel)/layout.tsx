import type { ReactNode } from "react";
import { PanelShell } from "@/components/PanelShell";
import { load, requirePageSession } from "@/server/page";

export const dynamic = "force-dynamic";

/** Układ panelu: szkielet z biblioteki (tło, pasek boczny, paleta poleceń) z firmą i zalogowaną osobą z Core. */
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { core } = await requirePageSession();
  const me = await load(() => core.getMe());

  return (
    <PanelShell
      organizationName={me.ok ? me.data.organization.name : "Twoja firma"}
      personName={me.ok ? `${me.data.employee.firstName} ${me.data.employee.lastName}` : null}
      isOwner={me.ok && me.data.account.isOwner}
    >
      {children}
    </PanelShell>
  );
}
