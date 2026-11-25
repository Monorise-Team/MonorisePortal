import type { Unit } from "@monorise-team/sdk";

export const UNIT_TYPE_LABELS: Record<Unit["type"], string> = {
  BRANCH: "Oddział",
  DEPARTMENT: "Dział",
  TEAM: "Zespół",
};

/**
 * Jednostki w kolejności drzewa: rodzic przed dziećmi, rodzeństwo alfabetycznie. Jednostka, której rodzica
 * nie ma na liście, jest na najwyższym poziomie; cykl (błędne dane) nie zapętla, a jego jednostki trafiają na koniec.
 */
export function buildUnitTree(units: readonly Unit[]): Array<{ unit: Unit; depth: number }> {
  const ids = new Set(units.map((unit) => unit.id));
  const children = new Map<string | null, Unit[]>();
  for (const unit of units) {
    const parent = unit.parentId && ids.has(unit.parentId) ? unit.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), unit]);
  }
  for (const list of children.values()) list.sort((a, b) => a.name.localeCompare(b.name, "pl"));

  const rows: Array<{ unit: Unit; depth: number }> = [];
  const seen = new Set<string>();
  const visit = (parent: string | null, depth: number) => {
    for (const unit of children.get(parent) ?? []) {
      if (seen.has(unit.id)) continue;
      seen.add(unit.id);
      rows.push({ unit, depth });
      visit(unit.id, depth + 1);
    }
  };
  visit(null, 0);
  // Jednostki w cyklu nie mają korzenia: pokazujemy je płasko, żeby nie zniknęły
  for (const unit of units) if (!seen.has(unit.id)) rows.push({ unit, depth: 0 });
  return rows;
}
