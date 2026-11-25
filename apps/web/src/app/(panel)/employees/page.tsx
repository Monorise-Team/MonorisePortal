import { Badge, Button, Card, CardHeader, CardTitle, EmptyState, TextField } from "@monorise-team/ui";
import { LoadFailed, Notice } from "@/components/Notice";
import { load, requirePageSession } from "@/server/page";

interface Props {
  searchParams: Promise<{ ok?: string; error?: string }>;
}

const EMPLOYEE_STATUS: Record<string, { label: string; tone: "success" | "neutral" | "warning" }> = {
  ACTIVE: { label: "pracuje", tone: "success" },
  FORMER: { label: "były pracownik", tone: "neutral" },
  ANONYMIZED: { label: "zanonimizowany", tone: "neutral" },
};

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeZone: "Europe/Warsaw" });

/** Pracownicy: lista, oczekujące zaproszenia (ponowne wysłanie, cofnięcie) i zapraszanie nowych osób. */
export default async function EmployeesPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const { core } = await requirePageSession();
  const [employees, invitations] = await Promise.all([
    load(() => core.listEmployees({ query: { limit: 100 } })),
    load(() => core.listInvitations({ query: { status: "PENDING", limit: 100 } })),
  ]);

  const canInvite = invitations.ok;
  const pendingEmployees = new Set(invitations.ok ? invitations.data.items.map((item) => item.employeeId) : []);

  return (
    <>
      <h1 className="text-xl font-semibold text-text-primary">Pracownicy</h1>
      <Notice ok={ok} error={error} />

      {/* Bez prawa do zaproszeń (`core.employees.manage`) Core nie pokaże listy zaproszeń, więc nie ma też formularza */}
      {invitations.ok && (
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Zaproś osobę</CardTitle>
          </CardHeader>
          <p className="mb-3 text-sm text-text-secondary">
            Osoba dostanie e-mail z linkiem ważnym 7 dni i ustawi hasło. Adres musi być w zweryfikowanej domenie firmy.
          </p>
          <form method="post" action="/api/invitations" className="grid gap-3 sm:grid-cols-3">
            <TextField name="email" type="email" label="E-mail" required autoComplete="off" placeholder="jan@acme.pl" />
            <TextField name="firstName" label="Imię" required autoComplete="off" />
            <TextField name="lastName" label="Nazwisko" required autoComplete="off" />
            <Button type="submit" variant="primary" className="self-start sm:col-span-3">
              Wyślij zaproszenie
            </Button>
          </form>
        </Card>
      )}

      <Card className="p-4">
        <CardHeader>
          <CardTitle>Oczekujące zaproszenia</CardTitle>
        </CardHeader>
        {!invitations.ok ? (
          <LoadFailed code={invitations.code} />
        ) : invitations.data.items.length === 0 ? (
          <p className="text-sm text-text-tertiary">Brak oczekujących zaproszeń.</p>
        ) : (
          <ul className="divide-y divide-border-primary">
            {invitations.data.items.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div className="text-sm">
                  <p className="text-text-primary">{invitation.email}</p>
                  <p className="text-text-tertiary">ważne do {dateFormat.format(new Date(invitation.expiresAt))}</p>
                </div>
                <div className="flex gap-2">
                  <form method="post" action={`/api/invitations/${invitation.id}/resend`}>
                    <Button type="submit" variant="outline">
                      Wyślij ponownie
                    </Button>
                  </form>
                  <form method="post" action={`/api/invitations/${invitation.id}/revoke`}>
                    <Button type="submit" variant="ghost">
                      Cofnij
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <CardHeader>
          <CardTitle>Lista pracowników</CardTitle>
        </CardHeader>
        {!employees.ok ? (
          <LoadFailed code={employees.code} />
        ) : employees.data.items.length === 0 ? (
          <EmptyState title="Brak pracowników" description="Zaproś pierwszą osobę formularzem powyżej." />
        ) : (
          <ul className="divide-y divide-border-primary">
            {employees.data.items.map((employee) => {
              const status = EMPLOYEE_STATUS[employee.status] ?? { label: employee.status, tone: "neutral" as const };
              return (
                <li key={employee.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <div className="text-sm">
                    <p className="text-text-primary">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="text-text-tertiary">
                      {[employee.workEmail, employee.jobTitle].filter(Boolean).join(" · ") || "bez adresu e-mail"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!employee.accountId && <Badge tone="warning">bez konta</Badge>}
                    {pendingEmployees.has(employee.id) && <Badge tone="accent">zaproszenie wysłane</Badge>}
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  {/* Pracownik bez konta (np. dodany przez kadry): zaproszenie na jego adres */}
                  {canInvite && !employee.accountId && employee.status === "ACTIVE" && (
                    <form method="post" action="/api/invitations" className="flex w-full flex-wrap items-end gap-2">
                      <input type="hidden" name="employeeId" value={employee.id} />
                      <TextField
                        name="email"
                        type="email"
                        size="sm"
                        label="E-mail do zaproszenia"
                        required
                        defaultValue={employee.workEmail ?? ""}
                        autoComplete="off"
                      />
                      <Button type="submit" variant="outline">
                        Zaproś
                      </Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
