import { Badge, Button, Card, CardHeader, CardTitle, Select } from "@monorise-team/ui";
import { LoadFailed, Notice } from "@/components/Notice";
import { hasActiveAccount } from "@/lib/employees";
import { load, requirePageSession } from "@/server/page";

interface Props {
  searchParams: Promise<{ ok?: string; error?: string }>;
}

const DOMAIN_STATUS: Record<string, string> = { VERIFIED: "zweryfikowana", PENDING: "czeka na weryfikację" };

/** Firma: nazwa, stan, domeny i przekazanie roli właściciela (tylko właściciel). */
export default async function CompanyPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const { core } = await requirePageSession();
  const [me, organization] = await Promise.all([load(() => core.getMe()), load(() => core.getOrganization())]);
  const isOwner = me.ok && me.data.account.isOwner;
  const employees = isOwner ? await load(() => core.listEmployees({ query: { limit: 100 } })) : null;
  const candidates =
    employees?.ok && me.ok
      ? employees.data.items.filter(hasActiveAccount).filter((employee) => employee.accountId !== me.data.account.id)
      : [];

  return (
    <>
      <h1 className="text-xl font-semibold text-text-primary">Firma</h1>
      <Notice ok={ok} error={error} />

      <Card className="p-4">
        <CardHeader>
          <CardTitle>Dane firmy</CardTitle>
        </CardHeader>
        {organization.ok ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-text-tertiary">Nazwa</dt>
            <dd className="text-text-primary">{organization.data.name}</dd>
            <dt className="text-text-tertiary">Stan</dt>
            <dd>
              <Badge tone={organization.data.status === "ACTIVE" ? "success" : "warning"}>
                {organization.data.status === "ACTIVE" ? "aktywna" : organization.data.status.toLowerCase()}
              </Badge>
            </dd>
            <dt className="text-text-tertiary">Domeny</dt>
            <dd className="flex flex-col gap-1">
              {organization.data.domains.map((domain) => (
                <span key={domain.domain} className="text-text-primary">
                  {domain.domain}
                  {domain.isPrimary && " (główna)"}
                  <span className="text-text-tertiary"> · {DOMAIN_STATUS[domain.status] ?? domain.status}</span>
                </span>
              ))}
            </dd>
          </dl>
        ) : (
          <LoadFailed code={organization.code} />
        )}
      </Card>

      {isOwner && (
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Przekazanie roli właściciela</CardTitle>
          </CardHeader>
          <p className="mb-3 text-sm text-text-secondary">
            Właściciel ma wszystkie uprawnienia w firmie. Po przekazaniu tracisz tę rolę, a nowa osoba ją dostaje.
          </p>
          {candidates.length > 0 ? (
            <form method="post" action="/api/organization/owner" className="flex flex-col gap-3 sm:max-w-md">
              <Select name="accountId" label="Nowy właściciel" required defaultValue="">
                <option value="" disabled>
                  Wybierz osobę
                </option>
                {candidates.map((employee) => (
                  <option key={employee.id} value={employee.accountId}>
                    {employee.firstName} {employee.lastName}
                    {employee.workEmail ? ` (${employee.workEmail})` : ""}
                  </option>
                ))}
              </Select>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" name="confirm" required /> Rozumiem, że przestanę być właścicielem
              </label>
              <Button type="submit" variant="danger" className="self-start">
                Przekaż rolę właściciela
              </Button>
            </form>
          ) : (
            <p className="text-sm text-text-tertiary">Najpierw zaproś osobę, która aktywuje konto.</p>
          )}
        </Card>
      )}
    </>
  );
}
