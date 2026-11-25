import { Badge, Button, Card, CardHeader, CardTitle, Select, TextArea, TextField } from "@monorise-team/ui";
import Link from "next/link";
import { LoadFailed, Notice } from "@/components/Notice";
import { productLabel } from "@/lib/products";
import { roleArea } from "@/lib/roles";
import { load, requirePageSession } from "@/server/page";

interface Props {
  params: Promise<{ roleId: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}

/**
 * Rola: uprawnienia (gotowe role tylko do odczytu, własne do zmiany), przypisania osobom w całej firmie
 * albo w jednostce, archiwizacja własnej roli.
 */
export default async function RolePage({ params, searchParams }: Props) {
  const { roleId } = await params;
  const { ok, error } = await searchParams;
  const { core } = await requirePageSession();
  const role = await load(() => core.getRole({ path: { roleId } }));

  if (!role.ok) {
    return (
      <>
        <Link href="/roles" className="text-sm text-text-secondary hover:underline">
          ← Role
        </Link>
        <LoadFailed code={role.code} />
      </>
    );
  }

  const [permissions, assignments, employees, units] = await Promise.all([
    load(() => core.listPermissions({ query: { limit: 100 } })),
    load(() => core.listRoleAssignments({ query: { roleId, limit: 100 } })),
    load(() => core.listEmployees({ query: { limit: 100 } })),
    load(() => core.listUnits({ query: { status: "ACTIVE", limit: 100 } })),
  ]);
  const editable = !role.data.isTemplate && !role.data.archivedAt;
  const rolePermissions = new Set(role.data.permissions);
  // Rola Core ma uprawnienia Core (product null), rola produktu: uprawnienia tego produktu
  const available = permissions.ok
    ? permissions.data.items.filter((permission) => (permission.product ?? null) === (role.data.product ?? null))
    : [];
  const people = new Map(
    (employees.ok ? employees.data.items : [])
      .filter((employee) => employee.accountId)
      .map((employee) => [employee.accountId!, `${employee.firstName} ${employee.lastName}`]),
  );
  const unitNames = new Map((units.ok ? units.data.items : []).map((unit) => [unit.id, unit.name]));

  return (
    <>
      <Link href="/roles" className="text-sm text-text-secondary hover:underline">
        ← Role
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold text-text-primary">{role.data.name}</h1>
        {role.data.isTemplate && <Badge>gotowa</Badge>}
        {role.data.archivedAt && <Badge tone="warning">zarchiwizowana</Badge>}
      </div>
      <p className="text-sm text-text-secondary">
        {roleArea(role.data, productLabel)}
        {role.data.description ? ` · ${role.data.description}` : ""}
      </p>
      <Notice ok={ok} error={error} />

      <Card className="p-4">
        <CardHeader>
          <CardTitle>{editable ? "Nazwa i uprawnienia" : "Uprawnienia"}</CardTitle>
        </CardHeader>
        {role.data.isTemplate && (
          <p className="mb-3 text-sm text-text-secondary">
            Gotowej roli nie można zmienić. Utwórz jej kopię na stronie „Role”, jeśli potrzebujesz innych uprawnień.
          </p>
        )}
        {!permissions.ok ? (
          <LoadFailed code={permissions.code} />
        ) : editable ? (
          <form method="post" action={`/api/roles/${role.data.id}`} className="flex flex-col gap-3">
            <TextField name="name" label="Nazwa" required maxLength={120} defaultValue={role.data.name} />
            <TextArea name="description" label="Opis" rows={2} defaultValue={role.data.description ?? ""} />
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm text-text-secondary">Uprawnienia</legend>
              {available.map((permission) => (
                <label key={permission.key} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="permissions"
                    value={permission.key}
                    defaultChecked={rolePermissions.has(permission.key)}
                    className="mt-1"
                  />
                  <span>
                    <span className="text-text-primary">{permission.description}</span>
                    <span className="block text-xs text-text-tertiary">{permission.key}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <Button type="submit" variant="primary" className="self-start">
              Zapisz rolę
            </Button>
          </form>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {role.data.permissions.map((key) => (
              <li key={key}>
                <span className="text-text-primary">
                  {permissions.data.items.find((permission) => permission.key === key)?.description ?? key}
                </span>
                <span className="block text-xs text-text-tertiary">{key}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <CardHeader>
          <CardTitle>Kto ma tę rolę</CardTitle>
        </CardHeader>
        {!assignments.ok ? (
          <LoadFailed code={assignments.code} />
        ) : (
          <>
            {assignments.data.items.length === 0 ? (
              <p className="text-sm text-text-tertiary">Nikt nie ma jeszcze tej roli.</p>
            ) : (
              <ul className="mb-4 divide-y divide-border-primary">
                {assignments.data.items.map((assignment) => (
                  <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                    <div>
                      <p className="text-text-primary">
                        {people.get(assignment.accountId) ?? "Konto spoza listy pracowników"}
                      </p>
                      <p className="text-text-tertiary">
                        {assignment.scopeType === "ORGANIZATION"
                          ? "w całej firmie"
                          : assignment.scopeType === "UNIT"
                            ? `w jednostce: ${unitNames.get(assignment.scopeId ?? "") ?? "nieznana"}`
                            : "dla jednego zasobu"}
                      </p>
                    </div>
                    <form method="post" action={`/api/role-assignments/${assignment.id}/remove`}>
                      <input type="hidden" name="roleId" value={role.data.id} />
                      <Button type="submit" variant="ghost">
                        Odbierz
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            {!role.data.archivedAt && people.size > 0 && (
              <form method="post" action="/api/role-assignments" className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="roleId" value={role.data.id} />
                <Select name="accountId" label="Osoba" required defaultValue="">
                  <option value="" disabled>
                    Wybierz osobę
                  </option>
                  {[...people].map(([accountId, name]) => (
                    <option key={accountId} value={accountId}>
                      {name}
                    </option>
                  ))}
                </Select>
                <Select name="scope" label="Zakres" required defaultValue="org">
                  <option value="org">Cała firma</option>
                  {[...unitNames].map(([unitId, name]) => (
                    <option key={unitId} value={`unit:${unitId}`}>
                      Jednostka: {name}
                    </option>
                  ))}
                </Select>
                <Button type="submit" variant="primary" className="self-start sm:col-span-2">
                  Przypisz rolę
                </Button>
              </form>
            )}
          </>
        )}
      </Card>

      {editable && (
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Archiwizacja</CardTitle>
          </CardHeader>
          <p className="mb-3 text-sm text-text-secondary">
            Zarchiwizowana rola przestaje dawać uprawnienia, ale zostaje w historii.
          </p>
          <form method="post" action={`/api/roles/${role.data.id}/archive`}>
            <Button type="submit" variant="danger">
              Zarchiwizuj rolę
            </Button>
          </form>
        </Card>
      )}
    </>
  );
}
