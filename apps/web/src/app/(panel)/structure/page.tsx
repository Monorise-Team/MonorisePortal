import { Badge, Button, Card, CardHeader, CardTitle, EmptyState, Select, TextField } from "@monorise-team/ui";
import Link from "next/link";
import { IdempotencyField } from "@/components/IdempotencyField";
import { LoadFailed, Notice } from "@/components/Notice";
import { UNIT_TYPE_LABELS, buildUnitTree } from "@/lib/units";
import { load, requirePageSession } from "@/server/page";

interface Props {
  searchParams: Promise<{ ok?: string; error?: string }>;
}

/** Struktura firmy: drzewo oddziałów, działów i zespołów oraz dodawanie jednostek. */
export default async function StructurePage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const { core } = await requirePageSession();
  const units = await load(() => core.listUnits({ query: { status: "ACTIVE", limit: 100 } }));
  const tree = units.ok ? buildUnitTree(units.data.items) : [];

  return (
    <>
      <h1 className="text-xl font-semibold text-text-primary">Struktura</h1>
      <Notice ok={ok} error={error} />

      <Card id="nowa-jednostka" className="scroll-mt-4 p-4">
        <CardHeader>
          <CardTitle>Nowa jednostka</CardTitle>
        </CardHeader>
        <form method="post" action="/api/units" className="grid gap-3 sm:grid-cols-3">
          <IdempotencyField />
          <TextField name="name" label="Nazwa" required maxLength={120} autoComplete="off" placeholder="np. Kraków" />
          <Select name="type" label="Rodzaj" required defaultValue="TEAM">
            {Object.entries(UNIT_TYPE_LABELS).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </Select>
          <Select name="parentId" label="Należy do" defaultValue="">
            <option value="">— najwyższy poziom —</option>
            {tree.map(({ unit, depth }) => (
              <option key={unit.id} value={unit.id}>
                {"  ".repeat(depth)}
                {unit.name}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="primary" className="self-start sm:col-span-3">
            Dodaj jednostkę
          </Button>
        </form>
      </Card>

      <Card className="p-4">
        <CardHeader>
          <CardTitle>Jednostki</CardTitle>
        </CardHeader>
        {!units.ok ? (
          <LoadFailed code={units.code} />
        ) : tree.length === 0 ? (
          <EmptyState title="Brak jednostek" description="Dodaj pierwszy oddział, dział albo zespół." />
        ) : (
          <ul className="divide-y divide-border-primary">
            {tree.map(({ unit, depth }) => (
              <li
                key={unit.id}
                className="flex items-center justify-between gap-3 py-2"
                style={{ paddingLeft: depth * 20 }}
              >
                <Link href={`/structure/${unit.id}`} className="text-sm text-text-primary hover:underline">
                  {unit.name}
                </Link>
                <Badge>{UNIT_TYPE_LABELS[unit.type]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
