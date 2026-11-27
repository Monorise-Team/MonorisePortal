import { Badge, Button, Card, CardHeader, CardTitle, EmptyState, Select, TextField } from "@monorise-team/ui";
import { IdempotencyField } from "@/components/IdempotencyField";
import { LoadFailed, Notice } from "@/components/Notice";
import { WorkScheduleEditor } from "@/components/WorkScheduleEditor";
import { hasActiveAccount } from "@/lib/employees";
import {
  DOMAIN_STATUS,
  ORGANIZATION_STATUS,
  allowLocalDomainTrust,
  canDeleteDomain,
  canSetPrimaryDomain,
  canVerifyDomain,
  formatDomainDateTime,
  hasOrganizationManagePermission,
} from "@/lib/organization";
import {
  formatScheduleSummary,
  formatWeeklySummary,
  getTimeZoneOptions,
  serializeWorkScheduleKey,
} from "@/lib/work-schedule";
import { load, requirePageSession } from "@/server/page";

interface Props {
  searchParams: Promise<{ ok?: string; error?: string }>;
}

/**
 * Firma: dane firmy (zmiana nazwy), czas pracy (strefa czasowa i domyślny wymiar pracy), domeny e-mail
 * (dodawanie, weryfikacja DNS TXT, wybór głównej, usuwanie) oraz przekazanie roli właściciela (tylko właściciel).
 */
export default async function CompanyPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const { core } = await requirePageSession();
  const [me, organization] = await Promise.all([load(() => core.getMe()), load(() => core.getOrganization())]);
  const isOwner = me.ok && me.data.account.isOwner;
  const [employees, assignments, roles] = await Promise.all([
    isOwner ? load(() => core.listEmployees({ query: { limit: 100 } })) : Promise.resolve(null),
    !isOwner && me.ok
      ? load(() => core.listRoleAssignments({ query: { accountId: me.data.account.id, limit: 100 } }))
      : Promise.resolve(null),
    !isOwner && me.ok
      ? load(() => core.listRoles({ query: { includeTemplates: true, limit: 100 } }))
      : Promise.resolve(null),
  ]);

  const canManageOrganization =
    isOwner ||
    (assignments?.ok && roles?.ok
      ? hasOrganizationManagePermission(assignments.data.items, roles.data.items)
      : false) ||
    (organization.ok && organization.data.domains.some((domain) => domain.verificationTxtName !== null));

  const showLocalTrust = allowLocalDomainTrust();

  const candidates =
    employees?.ok && me.ok
      ? employees.data.items.filter(hasActiveAccount).filter((employee) => employee.accountId !== me.data.account.id)
      : [];

  const orgStatus = organization.ok
    ? (ORGANIZATION_STATUS[organization.data.status] ?? {
        label: organization.data.status.toLowerCase(),
        tone: "warning" as const,
      })
    : null;

  const timeZoneGroups = organization.ok ? getTimeZoneOptions(organization.data.timeZone) : null;
  const workSettingsKey = organization.ok
    ? `${organization.data.timeZone}|${serializeWorkScheduleKey(organization.data.defaultWorkSchedule)}`
    : "";

  return (
    <>
      <h1 className="text-xl font-semibold text-text-primary">Firma</h1>
      <Notice ok={ok} error={error} />

      <Card className="p-4">
        <CardHeader>
          <CardTitle>Dane firmy</CardTitle>
        </CardHeader>
        {organization.ok && orgStatus ? (
          canManageOrganization ? (
            <div className="flex flex-col gap-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
                <dt className="text-text-tertiary">Stan</dt>
                <dd>
                  <Badge tone={orgStatus.tone}>{orgStatus.label}</Badge>
                </dd>
              </dl>
              <form
                key={organization.data.name}
                method="post"
                action="/api/organization"
                className="flex flex-wrap items-end gap-3"
              >
                <TextField
                  name="name"
                  label="Nazwa firmy"
                  required
                  minLength={2}
                  maxLength={120}
                  defaultValue={organization.data.name}
                  autoComplete="organization"
                  className="min-w-60 flex-1 sm:max-w-sm"
                />
                <Button type="submit" variant="primary">
                  Zapisz nazwę
                </Button>
              </form>
            </div>
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="text-text-tertiary">Nazwa</dt>
              <dd className="text-text-primary">{organization.data.name}</dd>
              <dt className="text-text-tertiary">Stan</dt>
              <dd>
                <Badge tone={orgStatus.tone}>{orgStatus.label}</Badge>
              </dd>
            </dl>
          )
        ) : (
          <LoadFailed code={organization.ok ? "INTERNAL" : organization.code} />
        )}
      </Card>

      <Card id="czas-pracy" className="scroll-mt-4 p-4">
        <CardHeader>
          <CardTitle>Czas pracy</CardTitle>
        </CardHeader>
        {organization.ok && timeZoneGroups ? (
          canManageOrganization ? (
            <form key={workSettingsKey} method="post" action="/api/organization" className="flex flex-col gap-4">
              <Select
                name="timeZone"
                label="Strefa czasowa"
                required
                defaultValue={organization.data.timeZone}
                hint="Strefa czasowa firmy używana w rozliczeniach czasu pracy."
                className="sm:max-w-sm"
              >
                <optgroup label="Najczęstsze">
                  {timeZoneGroups.common.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Wszystkie strefy czasowe">
                  {timeZoneGroups.other.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </optgroup>
              </Select>

              <WorkScheduleEditor
                variant="organization"
                fieldPrefix="defaultWorkSchedule"
                legend="Domyślny wymiar pracy"
                initialSchedule={organization.data.defaultWorkSchedule}
              />

              <Button type="submit" variant="primary" className="self-start">
                Zapisz czas pracy
              </Button>
            </form>
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-[12rem_1fr]">
              <dt className="text-text-tertiary">Strefa czasowa</dt>
              <dd className="text-text-primary">{organization.data.timeZone}</dd>
              <dt className="text-text-tertiary">Domyślny wymiar pracy</dt>
              <dd className="text-text-primary">
                {organization.data.defaultWorkSchedule !== null
                  ? `${formatScheduleSummary(organization.data.defaultWorkSchedule)} (${formatWeeklySummary(organization.data.defaultWorkSchedule)})`
                  : "Nie ustawiono"}
              </dd>
            </dl>
          )
        ) : (
          <LoadFailed code={organization.ok ? "INTERNAL" : organization.code} />
        )}
      </Card>

      <Card id="domeny" className="scroll-mt-4 p-4">
        <CardHeader>
          <CardTitle>Domeny e-mail</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-text-secondary">
          Adresy e-mail pracowników i zaproszeń muszą należeć do zweryfikowanej domeny firmy. Domenę otrzymuje pierwsza
          firma, która potwierdzi ją rekordem DNS TXT.
        </p>
        {!organization.ok ? (
          <LoadFailed code={organization.code} />
        ) : (
          <>
            {organization.data.domains.length === 0 ? (
              <EmptyState title="Brak domen" description="Dodaj pierwszą domenę e-mail firmy." />
            ) : (
              <ul className="divide-y divide-border-primary">
                {organization.data.domains.map((domain) => {
                  const status = DOMAIN_STATUS[domain.status] ?? {
                    label: domain.status.toLowerCase(),
                    tone: "neutral" as const,
                  };
                  const showVerify = canManageOrganization && canVerifyDomain(domain);
                  const showSetPrimary = canManageOrganization && canSetPrimaryDomain(domain);
                  const showDelete = canManageOrganization && canDeleteDomain(domain);
                  return (
                    <li key={domain.id} className="flex flex-col gap-3 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-text-primary">{domain.domain}</p>
                          {domain.verifiedAt ? (
                            <p className="text-xs text-text-tertiary">
                              zweryfikowana {formatDomainDateTime(domain.verifiedAt)}
                            </p>
                          ) : domain.lastCheckedAt ? (
                            <p className="text-xs text-text-tertiary">
                              ostatnie sprawdzenie: {formatDomainDateTime(domain.lastCheckedAt)}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {domain.isPrimary && <Badge tone="accent">główna</Badge>}
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </div>
                      </div>

                      {showVerify && domain.verificationTxtName && domain.verificationTxtValue && (
                        <div className="rounded-control border border-border-primary bg-bg-secondary p-3 text-xs">
                          <p className="mb-2 text-text-secondary">Dodaj rekord TXT w ustawieniach DNS tej domeny:</p>
                          <dl className="grid gap-1.5 sm:grid-cols-[5rem_1fr]">
                            <dt className="text-text-tertiary">Nazwa</dt>
                            <dd>
                              <code className="select-all break-all font-mono text-text-primary">
                                {domain.verificationTxtName}
                              </code>
                            </dd>
                            <dt className="text-text-tertiary">Wartość</dt>
                            <dd>
                              <code className="select-all break-all font-mono text-text-primary">
                                {domain.verificationTxtValue}
                              </code>
                            </dd>
                          </dl>
                        </div>
                      )}

                      {(showVerify || showSetPrimary) && (
                        <div className="flex flex-wrap items-center gap-2">
                          {showVerify && (
                            <>
                              <form method="post" action={`/api/organization/domains/${domain.id}/verify`}>
                                <IdempotencyField />
                                <Button type="submit" variant="primary" size="sm">
                                  Sprawdź DNS
                                  <span className="sr-only"> dla domeny {domain.domain}</span>
                                </Button>
                              </form>
                              {showLocalTrust && (
                                <form method="post" action={`/api/organization/domains/${domain.id}/verify`}>
                                  <IdempotencyField />
                                  <input type="hidden" name="trustLocally" value="1" />
                                  <Button type="submit" variant="outline" size="sm">
                                    Potwierdź bez DNS
                                    <span className="sr-only"> dla domeny {domain.domain}</span>
                                  </Button>
                                </form>
                              )}
                            </>
                          )}
                          {showSetPrimary && (
                            <form method="post" action={`/api/organization/domains/${domain.id}/primary`}>
                              <Button type="submit" variant="outline" size="sm">
                                Ustaw jako główną
                                <span className="sr-only">: {domain.domain}</span>
                              </Button>
                            </form>
                          )}
                        </div>
                      )}

                      {showDelete && (
                        <details className="w-full pt-1">
                          <summary className="inline-flex cursor-pointer items-center text-xs font-medium text-danger hover:underline">
                            Usuń
                            <span className="sr-only"> domenę {domain.domain}</span>
                          </summary>
                          <form
                            method="post"
                            action={`/api/organization/domains/${domain.id}/delete`}
                            className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-control border border-border-primary p-3"
                          >
                            <p className="text-xs text-text-secondary">
                              Czy na pewno usunąć domenę{" "}
                              <span className="font-medium text-text-primary">{domain.domain}</span>? Domena nie może
                              być używana przez konta, pracowników ani oczekujące zaproszenia.
                            </p>
                            <Button type="submit" variant="danger" size="sm">
                              Usuń domenę
                            </Button>
                          </form>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {canManageOrganization && (
              <form
                method="post"
                action="/api/organization/domains"
                className="mt-4 flex flex-col gap-3 border-t border-border-primary pt-4 sm:max-w-md"
              >
                <IdempotencyField />
                <TextField
                  name="domain"
                  label="Dodaj domenę"
                  required
                  maxLength={253}
                  placeholder="np. acme.eu"
                  autoComplete="off"
                  hint="Wpisz samą domenę, bez „@” i „https://”."
                />
                <Button type="submit" variant="primary" className="self-start">
                  Dodaj domenę
                </Button>
              </form>
            )}
          </>
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
