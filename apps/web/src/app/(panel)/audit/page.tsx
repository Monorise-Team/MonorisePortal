import { Badge, Banner, Button, Card, CardHeader, CardTitle, EmptyState, Select, TextField } from "@monorise-team/ui";
import Link from "next/link";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_RESOURCE_TYPE_LABELS,
  buildAuditHref,
  formatAuditAction,
  formatAuditActor,
  formatAuditDateTime,
  formatAuditResourceType,
  hasAuditMetadata,
  parseAuditFilters,
  type AuditSearchParams,
} from "@/lib/audit";
import { LOAD_MESSAGES, messageFor } from "@/lib/messages";
import { load, requirePageSession } from "@/server/page";

interface Props {
  searchParams: Promise<AuditSearchParams>;
}

/** Dziennik zdarzeń firmy: lista od najnowszych, filtry (osoba, zdarzenie, zasób, daty) i stronicowanie kursorem. */
export default async function AuditPage({ searchParams }: Props) {
  const params = await searchParams;
  const { filters, query, dateRangeInvalid, hasActiveFilters } = parseAuditFilters(params);
  const { core } = await requirePageSession();

  const [audit, employees] = await Promise.all([
    dateRangeInvalid ? Promise.resolve(null) : load(() => core.listAuditLog({ query })),
    load(() => core.listEmployees({ query: { limit: 100 } })),
  ]);

  if (audit && !audit.ok && audit.code === "PERMISSION_DENIED") {
    return (
      <>
        <h1 className="text-xl font-semibold text-text-primary">Dziennik</h1>
        <Banner tone="danger" message={messageFor(LOAD_MESSAGES, audit.code) ?? "Brak dostępu."} />
      </>
    );
  }

  const employeeOptions = (employees.ok ? employees.data.items : [])
    .filter((employee): employee is typeof employee & { accountId: string } => employee.accountId !== null)
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "pl"));

  const hasSelectedEmployee =
    !filters.actorAccountId || employeeOptions.some((employee) => employee.accountId === filters.actorAccountId);
  const hasSelectedAction = !filters.action || filters.action in AUDIT_ACTION_LABELS;
  const hasSelectedResourceType = !filters.resourceType || filters.resourceType in AUDIT_RESOURCE_TYPE_LABELS;
  const filterKey = buildAuditHref(filters, null);

  return (
    <>
      <h1 className="text-xl font-semibold text-text-primary">Dziennik</h1>
      {dateRangeInvalid && (
        <Banner tone="danger" message="Data końcowa nie może być wcześniejsza niż data początkowa." />
      )}
      {audit && !audit.ok && <Banner tone="danger" message={messageFor(LOAD_MESSAGES, audit.code) ?? audit.code} />}

      <Card className="p-4">
        <CardHeader>
          <CardTitle>Filtry</CardTitle>
        </CardHeader>
        <form key={filterKey} method="get" action="/audit" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select name="actorAccountId" label="Osoba" defaultValue={filters.actorAccountId ?? ""}>
            <option value="">Wszyscy</option>
            {!hasSelectedEmployee && filters.actorAccountId && (
              <option value={filters.actorAccountId}>Wybrane konto ({filters.actorAccountId.slice(0, 8)}…)</option>
            )}
            {employeeOptions.map((employee) => (
              <option key={employee.id} value={employee.accountId}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </Select>
          <Select name="action" label="Zdarzenie" defaultValue={filters.action ?? ""}>
            <option value="">Wszystkie</option>
            {!hasSelectedAction && filters.action && <option value={filters.action}>{filters.action}</option>}
            {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          <Select name="resourceType" label="Zasób" defaultValue={filters.resourceType ?? ""}>
            <option value="">Wszystkie</option>
            {!hasSelectedResourceType && filters.resourceType && (
              <option value={filters.resourceType}>{filters.resourceType}</option>
            )}
            {Object.entries(AUDIT_RESOURCE_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          <TextField name="from" type="date" label="Od dnia" defaultValue={filters.from ?? ""} />
          <TextField name="to" type="date" label="Do dnia" defaultValue={filters.to ?? ""} />
          <div className="flex flex-wrap items-end gap-2">
            <Button type="submit" variant="primary">
              Filtruj
            </Button>
            {(hasActiveFilters || filters.cursor) && (
              <Button asChild variant="ghost">
                <Link href="/audit">Wyczyść filtry</Link>
              </Button>
            )}
          </div>
        </form>
      </Card>

      {audit?.ok && (
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Zdarzenia</CardTitle>
          </CardHeader>
          {audit.data.items.length === 0 ? (
            <EmptyState
              title="Brak wpisów w dzienniku"
              description={
                hasActiveFilters
                  ? "Żaden wpis nie pasuje do wybranych filtrów."
                  : "W dzienniku firmy nie ma jeszcze żadnych zdarzeń."
              }
            />
          ) : (
            <>
              <ul className="divide-y divide-border-primary">
                {audit.data.items.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-1.5 py-3 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium text-text-primary">{formatAuditAction(entry)}</p>
                      <time
                        dateTime={entry.createdAt}
                        title={formatAuditDateTime(entry.createdAt, true)}
                        className="text-xs text-text-tertiary"
                      >
                        {formatAuditDateTime(entry.createdAt)}
                      </time>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                      <span>{formatAuditActor(entry)}</span>
                      <span aria-hidden="true" className="text-text-tertiary">
                        ·
                      </span>
                      <Badge>{formatAuditResourceType(entry.resourceType)}</Badge>
                      <span className="font-mono text-text-tertiary">{entry.resourceId}</span>
                    </div>
                    {hasAuditMetadata(entry.metadata) && (
                      <details className="pt-1">
                        <summary className="inline-flex cursor-pointer items-center text-xs text-text-secondary hover:text-text-primary">
                          Szczegóły
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded-control border border-border-primary bg-bg-secondary p-2 font-mono text-xs text-text-secondary">
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
              {(audit.data.nextCursor || filters.cursor) && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border-primary pt-3">
                  {filters.cursor ? (
                    <Button asChild variant="ghost" size="sm">
                      <Link href={buildAuditHref(filters, null)}>Od najnowszych</Link>
                    </Button>
                  ) : (
                    <span />
                  )}
                  {audit.data.nextCursor && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={buildAuditHref(filters, audit.data.nextCursor)}>Następna strona</Link>
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </>
  );
}
