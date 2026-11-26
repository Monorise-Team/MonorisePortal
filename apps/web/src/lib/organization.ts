import type { DomainStatus, OrganizationDomain, OrganizationStatus, Role, RoleAssignment } from "@monorise-team/sdk";
import type { BadgeTone } from "@monorise-team/ui";

/** Uprawnienie Core wymagane w zakresie całej firmy do zmiany nazwy firmy i zarządzania domenami. */
export const ORGANIZATION_MANAGE_PERMISSION = "core.organization.manage";

export const ORGANIZATION_STATUS: Record<OrganizationStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "aktywna", tone: "success" },
  PENDING_VERIFICATION: { label: "czeka na weryfikację", tone: "warning" },
  SUSPENDED: { label: "wstrzymana", tone: "warning" },
  OFFBOARDING: { label: "w trakcie zamykania", tone: "warning" },
  DELETED: { label: "usunięta", tone: "danger" },
};

export const DOMAIN_STATUS: Record<DomainStatus, { label: string; tone: BadgeTone }> = {
  VERIFIED: { label: "zweryfikowana", tone: "success" },
  PENDING: { label: "oczekuje", tone: "warning" },
  FAILED: { label: "nie udało się", tone: "danger" },
  REVOKED: { label: "wycofana", tone: "neutral" },
};

const dateTimeFormat = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

/** Formatuje datę i godzinę przy domenie w polskiej strefie czasowej (`Europe/Warsaw`). */
export function formatDomainDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateTimeFormat.format(date);
}

/**
 * Sprawdza na podstawie własnych przypisań i aktywnych ról, czy konto ma aktywne uprawnienie
 * `core.organization.manage` w zakresie całej firmy (`ORGANIZATION`). Ostateczną kontrolę zawsze wykonuje Core.
 */
export function hasOrganizationManagePermission(
  assignments: readonly RoleAssignment[],
  roles: readonly Role[],
  now: Date = new Date(),
): boolean {
  const rolesById = new Map(roles.map((role) => [role.id, role]));
  const nowMs = now.getTime();

  return assignments.some((assignment) => {
    if (assignment.scopeType !== "ORGANIZATION") return false;
    if (assignment.validFrom && Date.parse(assignment.validFrom) > nowMs) return false;
    if (assignment.validUntil && Date.parse(assignment.validUntil) <= nowMs) return false;
    const role = rolesById.get(assignment.roleId);
    if (!role || role.archivedAt !== null) return false;
    return role.permissions.includes(ORGANIZATION_MANAGE_PERMISSION);
  });
}

/** Czy domenę można zweryfikować (oczekuje na sprawdzenie lub poprzednia próba nie powiodła się). */
export function canVerifyDomain(domain: Pick<OrganizationDomain, "status">): boolean {
  return domain.status === "PENDING" || domain.status === "FAILED";
}

/** Czy domenę można ustawić jako główną (musi być zweryfikowana i nie być już główną). */
export function canSetPrimaryDomain(domain: Pick<OrganizationDomain, "status" | "isPrimary">): boolean {
  return domain.status === "VERIFIED" && !domain.isPrimary;
}

/** Czy domenę można usunąć w panelu (nie jest główną domeną; użycie domeny sprawdza Core). */
export function canDeleteDomain(domain: Pick<OrganizationDomain, "isPrimary">): boolean {
  return !domain.isPrimary;
}

/** Czy pokazać lokalny przycisk „Potwierdź bez DNS” (tylko poza produkcją; ostatecznie decyduje Core). */
export function allowLocalDomainTrust(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv !== "production";
}
