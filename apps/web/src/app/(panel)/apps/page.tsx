import { Badge, Button, Card, CardHeader, CardTitle, EmptyState, Select } from "@monorise-team/ui";
import { IdempotencyField } from "@/components/IdempotencyField";
import { LoadFailed, Notice } from "@/components/Notice";
import { hasActiveAccount, namesByAccount } from "@/lib/employees";
import { productLabel } from "@/lib/products";
import { load, requirePageSession } from "@/server/page";

interface Props {
  searchParams: Promise<{ ok?: string; error?: string }>;
}

const ENTITLEMENT_STATUS = {
  ACTIVE: { label: "aktywna", tone: "success" },
  SUSPENDED: { label: "wstrzymana", tone: "warning" },
  ENDED: { label: "zakończona", tone: "neutral" },
} as const;

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeZone: "Europe/Warsaw" });

/** Aplikacje firmy (z umowy) i to, kto z nich korzysta: nadawanie i odbieranie dostępu. */
export default async function AppsPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const { core } = await requirePageSession();
  const [entitlements, access, employees] = await Promise.all([
    load(() => core.listEntitlements({ query: { limit: 100 } })),
    load(() => core.listAppAccess({ query: { limit: 100 } })),
    load(() => core.listEmployees({ query: { limit: 100 } })),
  ]);
  const allEmployees = employees.ok ? employees.data.items : [];
  // Do wyboru tylko aktywne konta; imiona przy nadanych dostępach także dla pozostałych
  const people = allEmployees.filter(hasActiveAccount);
  const nameOf = namesByAccount(allEmployees);
  const active = access.ok ? access.data.items.filter((item) => item.status === "ACTIVE") : [];

  return (
    <>
      <h1 className="text-xl font-semibold text-text-primary">Aplikacje</h1>
      <Notice ok={ok} error={error} />

      <Card className="p-4">
        <CardHeader>
          <CardTitle>Aplikacje firmy</CardTitle>
        </CardHeader>
        {!entitlements.ok ? (
          <LoadFailed code={entitlements.code} />
        ) : entitlements.data.items.length === 0 ? (
          <EmptyState title="Firma nie ma jeszcze żadnej aplikacji." />
        ) : (
          <ul className="divide-y divide-border-primary">
            {entitlements.data.items.map((entitlement) => {
              const status = ENTITLEMENT_STATUS[entitlement.status];
              return (
                <li key={entitlement.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <p className="text-text-primary">{productLabel(entitlement.product)}</p>
                    <p className="text-text-tertiary">
                      od {dateFormat.format(new Date(entitlement.startsAt))}
                      {entitlement.endsAt
                        ? ` do ${dateFormat.format(new Date(entitlement.endsAt))}`
                        : " · bezterminowo"}
                    </p>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {entitlements.ok &&
        entitlements.data.items
          .filter((entitlement) => entitlement.isActive)
          .map((entitlement) => {
            const granted = active.filter((item) => item.product === entitlement.product);
            const withAccess = new Set(granted.map((item) => item.accountId));
            const candidates = people.filter((employee) => !withAccess.has(employee.accountId));
            return (
              <Card key={entitlement.id} className="p-4">
                <CardHeader>
                  <CardTitle>Dostęp do {productLabel(entitlement.product)}</CardTitle>
                </CardHeader>
                <p className="mb-3 text-sm text-text-secondary">
                  Właściciel firmy ma dostęp do wszystkich aplikacji firmy bez osobnego nadania.
                </p>
                {!access.ok ? (
                  <LoadFailed code={access.code} />
                ) : (
                  <>
                    {granted.length === 0 ? (
                      <p className="mb-4 text-sm text-text-tertiary">Nikt nie ma jeszcze nadanego dostępu.</p>
                    ) : (
                      <ul className="mb-4 divide-y divide-border-primary">
                        {granted.map((item) => (
                          <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                            <span className="text-text-primary">
                              {nameOf.get(item.accountId) ?? "Konto spoza listy pracowników"}
                            </span>
                            <form method="post" action={`/api/app-access/${item.id}/revoke`}>
                              <Button type="submit" variant="ghost">
                                Odbierz
                              </Button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    )}
                    {candidates.length === 0 ? (
                      <p className="text-sm text-text-tertiary">Wszyscy pracownicy z kontem mają już dostęp.</p>
                    ) : (
                      <form method="post" action="/api/app-access" className="flex flex-wrap items-end gap-3">
                        <IdempotencyField />
                        <input type="hidden" name="product" value={entitlement.product} />
                        <Select name="accountId" label="Nadaj dostęp" required defaultValue="">
                          <option value="" disabled>
                            Wybierz osobę
                          </option>
                          {candidates.map((employee) => (
                            <option key={employee.id} value={employee.accountId}>
                              {employee.firstName} {employee.lastName}
                            </option>
                          ))}
                        </Select>
                        <Button type="submit" variant="primary">
                          Nadaj
                        </Button>
                      </form>
                    )}
                  </>
                )}
              </Card>
            );
          })}
    </>
  );
}
