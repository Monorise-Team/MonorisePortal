import { Badge, Button, Card, CardHeader, CardTitle, Select, TextField } from "@monorise-team/ui";
import Link from "next/link";
import { LoadFailed, Notice } from "@/components/Notice";
import { UNIT_TYPE_LABELS } from "@/lib/units";
import { load, requirePageSession } from "@/server/page";

interface Props {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}

const ROLE_LABELS = { LEADER: "Kierownik", MEMBER: "Członek" } as const;

/** Jednostka: nazwa, członkowie z rolą (kierownik albo członek) i archiwizacja. */
export default async function UnitPage({ params, searchParams }: Props) {
  const { unitId } = await params;
  const { ok, error } = await searchParams;
  const { core } = await requirePageSession();
  // Core nie ma odczytu pojedynczej jednostki, więc szukamy jej na liście aktywnych
  const units = await load(() => core.listUnits({ query: { status: "ACTIVE", limit: 100 } }));
  const unit = units.ok ? units.data.items.find((item) => item.id === unitId) : undefined;

  if (!unit) {
    return (
      <>
        <Link href="/structure" className="text-sm text-text-secondary hover:underline">
          ← Struktura
        </Link>
        {units.ok ? (
          <p className="text-sm text-text-tertiary">Nie znaleziono jednostki.</p>
        ) : (
          <LoadFailed code={units.code} />
        )}
      </>
    );
  }

  const [members, employees] = await Promise.all([
    load(() => core.listUnitMembers({ path: { unitId }, query: { limit: 100 } })),
    load(() => core.listEmployees({ query: { limit: 100 } })),
  ]);
  const memberIds = new Set(members.ok ? members.data.items.map((member) => member.employeeId) : []);
  const candidates = employees.ok
    ? employees.data.items.filter((employee) => employee.status === "ACTIVE" && !memberIds.has(employee.id))
    : [];
  const parent = unit.parentId ? units.ok && units.data.items.find((item) => item.id === unit.parentId) : undefined;

  return (
    <>
      <Link href="/structure" className="text-sm text-text-secondary hover:underline">
        ← Struktura
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold text-text-primary">{unit.name}</h1>
        <Badge>{UNIT_TYPE_LABELS[unit.type]}</Badge>
      </div>
      {parent && <p className="text-sm text-text-secondary">należy do: {parent.name}</p>}
      <Notice ok={ok} error={error} />

      <Card className="p-4">
        <CardHeader>
          <CardTitle>Nazwa</CardTitle>
        </CardHeader>
        <form method="post" action={`/api/units/${unit.id}`} className="flex flex-wrap items-end gap-3">
          <TextField name="name" label="Nazwa jednostki" required maxLength={120} defaultValue={unit.name} />
          <Button type="submit" variant="outline">
            Zmień nazwę
          </Button>
        </form>
      </Card>

      <Card className="p-4">
        <CardHeader>
          <CardTitle>Członkowie</CardTitle>
        </CardHeader>
        {!members.ok ? (
          <LoadFailed code={members.code} />
        ) : (
          <>
            {members.data.items.length === 0 ? (
              <p className="mb-4 text-sm text-text-tertiary">Nikogo jeszcze nie ma w tej jednostce.</p>
            ) : (
              <ul className="mb-4 divide-y divide-border-primary">
                {members.data.items.map((member) => (
                  <li key={member.employeeId} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-text-primary">
                        {member.employee.firstName} {member.employee.lastName}
                      </span>
                      <Badge tone={member.role === "LEADER" ? "accent" : "neutral"}>{ROLE_LABELS[member.role]}</Badge>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <form method="post" action={`/api/units/${unit.id}/members`} className="flex items-end gap-2">
                        <input type="hidden" name="employeeId" value={member.employeeId} />
                        <Select name="role" aria-label="Rola w jednostce" defaultValue={member.role}>
                          <option value="MEMBER">Członek</option>
                          <option value="LEADER">Kierownik</option>
                        </Select>
                        <Button type="submit" variant="outline">
                          Zmień
                        </Button>
                      </form>
                      <form method="post" action={`/api/units/${unit.id}/members/${member.employeeId}/remove`}>
                        <Button type="submit" variant="ghost">
                          Usuń
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {candidates.length > 0 && (
              <form method="post" action={`/api/units/${unit.id}/members`} className="grid gap-3 sm:grid-cols-3">
                <Select name="employeeId" label="Dodaj osobę" required defaultValue="">
                  <option value="" disabled>
                    Wybierz osobę
                  </option>
                  {candidates.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </option>
                  ))}
                </Select>
                <Select name="role" label="Rola" defaultValue="MEMBER">
                  <option value="MEMBER">Członek</option>
                  <option value="LEADER">Kierownik</option>
                </Select>
                <Button type="submit" variant="primary" className="self-end">
                  Dodaj
                </Button>
              </form>
            )}
          </>
        )}
      </Card>

      <Card className="p-4">
        <CardHeader>
          <CardTitle>Archiwizacja</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-text-secondary">Zarchiwizowana jednostka znika ze struktury.</p>
        <form method="post" action={`/api/units/${unit.id}/archive`}>
          <Button type="submit" variant="danger">
            Zarchiwizuj jednostkę
          </Button>
        </form>
      </Card>
    </>
  );
}
