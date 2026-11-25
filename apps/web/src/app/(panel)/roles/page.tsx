import { Badge, Button, Card, CardHeader, CardTitle, EmptyState, Select, TextField } from "@monorise-team/ui";
import Link from "next/link";
import { LoadFailed, Notice } from "@/components/Notice";
import { productLabel } from "@/lib/products";
import { roleArea } from "@/lib/roles";
import { load, requirePageSession } from "@/server/page";

interface Props {
  searchParams: Promise<{ ok?: string; error?: string }>;
}

/** Role: gotowe role Core i produktów oraz własne role firmy; nowa rola jako kopia istniejącej. */
export default async function RolesPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const { core } = await requirePageSession();
  const roles = await load(() => core.listRoles({ query: { includeTemplates: true, limit: 100 } }));
  const sorted = roles.ok
    ? [...roles.data.items].sort(
        (a, b) => Number(b.isTemplate) - Number(a.isTemplate) || a.name.localeCompare(b.name, "pl"),
      )
    : [];

  return (
    <>
      <h1 className="text-xl font-semibold text-text-primary">Role</h1>
      <Notice ok={ok} error={error} />

      {roles.ok && sorted.length > 0 && (
        <Card id="nowa-rola" className="scroll-mt-4 p-4">
          <CardHeader>
            <CardTitle>Nowa rola</CardTitle>
          </CardHeader>
          <p className="mb-3 text-sm text-text-secondary">
            Nowa rola powstaje jako kopia istniejącej. Potem możesz zmienić jej nazwę i uprawnienia.
          </p>
          <form method="post" action="/api/roles" className="grid gap-3 sm:grid-cols-2">
            <Select name="copyFromRoleId" label="Na podstawie roli" required defaultValue="">
              <option value="" disabled>
                Wybierz rolę
              </option>
              {sorted.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} · {roleArea(role, productLabel)}
                </option>
              ))}
            </Select>
            <TextField name="name" label="Nazwa nowej roli" required maxLength={120} autoComplete="off" />
            <Button type="submit" variant="primary" className="self-start sm:col-span-2">
              Utwórz rolę
            </Button>
          </form>
        </Card>
      )}

      <Card className="p-4">
        <CardHeader>
          <CardTitle>Role w firmie</CardTitle>
        </CardHeader>
        {!roles.ok ? (
          <LoadFailed code={roles.code} />
        ) : sorted.length === 0 ? (
          <EmptyState title="Brak ról" />
        ) : (
          <ul className="divide-y divide-border-primary">
            {sorted.map((role) => (
              <li key={role.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div className="text-sm">
                  <Link href={`/roles/${role.id}`} className="text-text-primary hover:underline">
                    {role.name}
                  </Link>
                  <p className="text-text-tertiary">
                    {roleArea(role, productLabel)} · uprawnień: {role.permissions.length}
                  </p>
                </div>
                <div className="flex gap-2">
                  {role.isTemplate && <Badge>gotowa</Badge>}
                  {role.archivedAt && <Badge tone="warning">zarchiwizowana</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
