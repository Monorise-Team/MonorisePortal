import type { Role } from "@monorise-team/sdk";
import { isId } from "./ids";

/** Skąd pochodzi rola: Core (firma i ludzie) albo produkt. */
export function roleArea(role: Pick<Role, "product">, productLabel: (key: string) => string): string {
  return role.product ? productLabel(role.product) : "Monorise (firma i ludzie)";
}

/** Uprawnienia zaznaczone w formularzu: bez powtórzeń, w stałej kolejności (Core sprawdza, czy istnieją). */
export function selectedPermissions(form: FormData): string[] {
  const picked = form
    .getAll("permissions")
    .filter((value): value is string => typeof value === "string" && value !== "");
  return [...new Set(picked)].sort();
}

/** Zakres przypisania z pola formularza: `org` albo `unit:<id>`; inna wartość: `null`. */
export function parseScope(
  value: string | undefined,
): { scopeType: "ORGANIZATION" | "UNIT"; scopeId: string | null } | null {
  if (value === "org") return { scopeType: "ORGANIZATION", scopeId: null };
  const unitId = value?.startsWith("unit:") ? value.slice("unit:".length) : "";
  return isId(unitId) ? { scopeType: "UNIT", scopeId: unitId } : null;
}
