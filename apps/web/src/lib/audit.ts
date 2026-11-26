import type { components, operations } from "@monorise-team/sdk";
import { isId } from "./ids";
import { productLabel } from "./products";

export type AuditLogEntry = components["schemas"]["AuditLogEntry"];
export type AuditLogQuery = NonNullable<operations["listAuditLog"]["parameters"]["query"]>;

export interface AuditSearchParams {
  actorAccountId?: string;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  cursor?: string;
}

export interface AuditFilters {
  actorAccountId?: string;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  cursor?: string;
}

export interface ParsedAuditFilters {
  filters: AuditFilters;
  query: AuditLogQuery;
  dateRangeInvalid: boolean;
  hasActiveFilters: boolean;
}

export const AUDIT_PAGE_LIMIT = 50;

/** Polskie etykiety znanych akcji Core (do filtra i jako zapas, gdyby Core nie podał `actionLabel`). */
export const AUDIT_ACTION_LABELS: Readonly<Record<string, string>> = {
  "organization.owner.transferred": "Przekazano rolę właściciela firmy",
  "organization.updated": "Zaktualizowano dane firmy",
  "organization.domain.added": "Dodano domenę firmy",
  "organization.domain.verified": "Zweryfikowano domenę firmy",
  "organization.domain.removed": "Usunięto domenę firmy",
  "organization.domain.primary_changed": "Zmieniono główną domenę firmy",
  "employee.created": "Dodano pracownika",
  "employee.updated": "Zaktualizowano dane pracownika",
  "account.deactivated": "Wyłączono konto pracownika",
  "account.reactivated": "Przywrócono konto pracownika",
  "invitation.created": "Wysłano zaproszenie pracownika",
  "invitation.resent": "Ponownie wysłano zaproszenie pracownika",
  "invitation.revoked": "Cofnięto zaproszenie pracownika",
  "invitation.accepted": "Zaakceptowano zaproszenie pracownika",
  "unit.created": "Utworzono jednostkę organizacyjną",
  "unit.updated": "Zaktualizowano jednostkę organizacyjną",
  "unit.deleted": "Usunięto jednostkę organizacyjną",
  "unit.member.set": "Zapisano członkostwo w jednostce organizacyjnej",
  "unit.member.removed": "Usunięto pracownika z jednostki organizacyjnej",
  "role.created": "Utworzono rolę",
  "role.updated": "Zaktualizowano rolę",
  "role.archived": "Zarchiwizowano rolę",
  "role.deleted": "Usunięto rolę",
  "role.assigned": "Nadano rolę",
  "role.revoked": "Odebrano rolę",
  "app_access.granted": "Włączono dostęp do aplikacji",
  "app_access.revoked": "Wyłączono dostęp do aplikacji",
  "entitlement.granted": "Przyznano firmie dostęp do produktu",
  "entitlement.ended": "Zakończono dostęp firmy do produktu",
};

/** Polskie nazwy typów zasobów zapisywanych w dzienniku Core. */
export const AUDIT_RESOURCE_TYPE_LABELS: Readonly<Record<string, string>> = {
  organization: "Firma",
  employee: "Pracownik",
  account: "Konto",
  invitation: "Zaproszenie",
  unit: "Jednostka",
  unit_member: "Członkostwo w jednostce",
  role: "Rola",
  role_assignment: "Przypisanie roli",
  app_access: "Dostęp do aplikacji",
  entitlement: "Dostęp firmy do produktu",
  product: "Produkt",
};

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_ACTION_LENGTH = 120;
const MAX_RESOURCE_TYPE_LENGTH = 64;
const MAX_CURSOR_LENGTH = 256;

const dateTimeFormat = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

const fullDateTimeFormat = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Europe/Warsaw",
});

function wallClockOffsetMs(utcMs: number, timeZone: string): number {
  const date = new Date(utcMs);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  const wallAsUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
    date.getUTCMilliseconds(),
  );
  return wallAsUtc - utcMs;
}

/**
 * Zamienia datę z pola formularza (`YYYY-MM-DD`) na początek (`00:00:00.000`) albo koniec (`23:59:59.999`)
 * tego dnia w podanej strefie czasowej jako znacznik ISO 8601 (UTC).
 */
export function dateBoundaryToIso(
  dateStr: string,
  boundary: "start" | "end",
  timeZone = "Europe/Warsaw",
): string | undefined {
  const match = DATE_ONLY.exec(dateStr.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return undefined;
  }
  const [hour, minute, second, ms] = boundary === "start" ? [0, 0, 0, 0] : [23, 59, 59, 999];
  const targetWallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  let utcMs = targetWallAsUtc - wallClockOffsetMs(targetWallAsUtc, timeZone);
  utcMs = targetWallAsUtc - wallClockOffsetMs(utcMs, timeZone);
  return new Date(utcMs).toISOString();
}

function cleanParam(value: string | undefined, maxLength: number): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length > maxLength) return undefined;
  return trimmed;
}

/** Buduje czyste filtry i zapytanie `listAuditLog` z parametrów adresu `/audit`. */
export function parseAuditFilters(params: AuditSearchParams): ParsedAuditFilters {
  const actorAccountId = params.actorAccountId?.trim();
  const validActor = actorAccountId && isId(actorAccountId) ? actorAccountId : undefined;
  const action = cleanParam(params.action, MAX_ACTION_LENGTH);
  const resourceType = cleanParam(params.resourceType, MAX_RESOURCE_TYPE_LENGTH);
  const cursor = cleanParam(params.cursor, MAX_CURSOR_LENGTH);

  const fromDate = params.from?.trim();
  const fromIso = fromDate ? dateBoundaryToIso(fromDate, "start") : undefined;
  const validFrom = fromIso ? fromDate : undefined;

  const toDate = params.to?.trim();
  const toIso = toDate ? dateBoundaryToIso(toDate, "end") : undefined;
  const validTo = toIso ? toDate : undefined;

  const filters: AuditFilters = {
    ...(validActor ? { actorAccountId: validActor } : {}),
    ...(action ? { action } : {}),
    ...(resourceType ? { resourceType } : {}),
    ...(validFrom ? { from: validFrom } : {}),
    ...(validTo ? { to: validTo } : {}),
    ...(cursor ? { cursor } : {}),
  };

  const query: AuditLogQuery = {
    limit: AUDIT_PAGE_LIMIT,
    ...(validActor ? { actorAccountId: validActor } : {}),
    ...(action ? { action } : {}),
    ...(resourceType ? { resourceType } : {}),
    ...(fromIso ? { from: fromIso } : {}),
    ...(toIso ? { to: toIso } : {}),
    ...(cursor ? { cursor } : {}),
  };

  const dateRangeInvalid = Boolean(validFrom && validTo && validFrom > validTo);
  const hasActiveFilters = Boolean(validActor || action || resourceType || validFrom || validTo);

  return { filters, query, dateRangeInvalid, hasActiveFilters };
}

/** Adres `/audit` zachowujący aktywne filtry i opcjonalnie ustawiający kursor następnej strony. */
export function buildAuditHref(filters: AuditFilters, cursor?: string | null): string {
  const search = new URLSearchParams();
  if (filters.actorAccountId) search.set("actorAccountId", filters.actorAccountId);
  if (filters.action) search.set("action", filters.action);
  if (filters.resourceType) search.set("resourceType", filters.resourceType);
  if (filters.from) search.set("from", filters.from);
  if (filters.to) search.set("to", filters.to);
  if (cursor) search.set("cursor", cursor);
  const qs = search.toString();
  return qs ? `/audit?${qs}` : "/audit";
}

/** Czytelny opis osoby lub źródła zdarzenia. */
export function formatAuditActor(
  entry: Pick<AuditLogEntry, "actorType" | "actorDisplayName" | "product" | "supportAccessGrantId">,
): string {
  if (entry.actorDisplayName) return entry.actorDisplayName;
  switch (entry.actorType) {
    case "SYSTEM":
      return "System";
    case "PRODUCT":
      return entry.product ? productLabel(entry.product) : "Produkt";
    case "OPERATOR":
      return entry.supportAccessGrantId ? "Operator Monorise (dostęp wsparcia)" : "Operator Monorise";
    case "ACCOUNT":
      return "Nieznana osoba";
  }
}

/** Czytelna polska nazwa akcji: najpierw etykieta z Core, potem mapa Portalu, na końcu surowy klucz. */
export function formatAuditAction(entry: Pick<AuditLogEntry, "action" | "actionLabel">): string {
  if (entry.actionLabel && entry.actionLabel !== entry.action) return entry.actionLabel;
  return AUDIT_ACTION_LABELS[entry.action] ?? entry.action;
}

/** Czytelna polska nazwa typu zasobu (nieznany klucz bez zmian). */
export function formatAuditResourceType(resourceType: string): string {
  return AUDIT_RESOURCE_TYPE_LABELS[resourceType] ?? resourceType;
}

/** Czas zdarzenia w formacie polskim (`Europe/Warsaw`). */
export function formatAuditDateTime(iso: string, includeSeconds = false): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return (includeSeconds ? fullDateTimeFormat : dateTimeFormat).format(date);
}

/** Sprawdza, czy wpis dziennika ma jakiekolwiek niepuste metadane do rozwinięcia. */
export function hasAuditMetadata(metadata: Record<string, unknown>): boolean {
  return Object.keys(metadata).length > 0;
}
