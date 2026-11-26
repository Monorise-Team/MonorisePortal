import { describe, expect, it } from "vitest";
import {
  AUDIT_PAGE_LIMIT,
  buildAuditHref,
  dateBoundaryToIso,
  formatAuditAction,
  formatAuditActor,
  formatAuditDateTime,
  formatAuditResourceType,
  hasAuditMetadata,
  parseAuditFilters,
} from "../src/lib/audit";

const ACCOUNT_ID = "01936f4e-8a1b-7c3d-9e2f-000000000010";

describe("filtry i formatowanie dziennika zdarzeń", () => {
  it("dla pustych parametrów zwraca domyślny limit bez filtrów", () => {
    const parsed = parseAuditFilters({});
    expect(parsed.filters).toEqual({});
    expect(parsed.query).toEqual({ limit: AUDIT_PAGE_LIMIT });
    expect(parsed.dateRangeInvalid).toBe(false);
    expect(parsed.hasActiveFilters).toBe(false);
  });

  it("mapuje filtry i kursor na zapytanie Core ze strefą Europe/Warsaw (czas zimowy i letni)", () => {
    const winter = parseAuditFilters({
      actorAccountId: ACCOUNT_ID,
      action: "app_access.revoked",
      resourceType: "app_access",
      from: "2026-11-25",
      to: "2026-11-25",
      cursor: "eyJ0IjoiMjAyNi0xMS0yNVQxNDowNTowMC4wMDBaIiwiaWQiOiIwMSJ9",
    });
    expect(winter.dateRangeInvalid).toBe(false);
    expect(winter.hasActiveFilters).toBe(true);
    expect(winter.query).toEqual({
      limit: AUDIT_PAGE_LIMIT,
      actorAccountId: ACCOUNT_ID,
      action: "app_access.revoked",
      resourceType: "app_access",
      from: "2026-11-24T23:00:00.000Z",
      to: "2026-11-25T22:59:59.999Z",
      cursor: "eyJ0IjoiMjAyNi0xMS0yNVQxNDowNTowMC4wMDBaIiwiaWQiOiIwMSJ9",
    });

    // Czas letni (CEST, UTC+2)
    expect(dateBoundaryToIso("2026-07-15", "start")).toBe("2026-07-14T22:00:00.000Z");
    expect(dateBoundaryToIso("2026-07-15", "end")).toBe("2026-07-15T21:59:59.999Z");
  });

  it("pomija nieprawidłowe parametry i wykrywa odwrócony zakres dat", () => {
    const invalid = parseAuditFilters({
      actorAccountId: "not-a-uuid",
      action: "   ",
      from: "2026-02-30",
      to: "not-a-date",
    });
    expect(invalid.filters).toEqual({});
    expect(invalid.query).toEqual({ limit: AUDIT_PAGE_LIMIT });
    expect(invalid.dateRangeInvalid).toBe(false);

    const reversed = parseAuditFilters({ from: "2026-11-26", to: "2026-11-25" });
    expect(reversed.dateRangeInvalid).toBe(true);
    expect(reversed.hasActiveFilters).toBe(true);
  });

  it("buduje link do następnej strony z zachowaniem filtrów oraz link do początku", () => {
    const filters = {
      actorAccountId: ACCOUNT_ID,
      action: "app_access.revoked",
      from: "2026-11-25",
    };
    const nextHref = buildAuditHref(filters, "cursor-2");
    const nextUrl = new URL(nextHref, "http://portal.localhost:3400");
    expect(nextUrl.pathname).toBe("/audit");
    expect(Object.fromEntries(nextUrl.searchParams.entries())).toEqual({
      actorAccountId: ACCOUNT_ID,
      action: "app_access.revoked",
      from: "2026-11-25",
      cursor: "cursor-2",
    });

    const firstHref = buildAuditHref(filters, null);
    expect(firstHref).not.toContain("cursor=");
    expect(firstHref).toContain("action=app_access.revoked");
    expect(buildAuditHref({}, null)).toBe("/audit");
  });

  it("formatuje aktora, akcję, zasób, datę i wykrywa metadane", () => {
    expect(
      formatAuditActor({
        actorType: "ACCOUNT",
        actorDisplayName: "Jan Kowalski",
        product: null,
        supportAccessGrantId: null,
      }),
    ).toBe("Jan Kowalski");
    expect(
      formatAuditActor({ actorType: "SYSTEM", actorDisplayName: null, product: null, supportAccessGrantId: null }),
    ).toBe("System");
    expect(
      formatAuditActor({
        actorType: "PRODUCT",
        actorDisplayName: null,
        product: "timotime",
        supportAccessGrantId: null,
      }),
    ).toBe("TimoTime");
    expect(
      formatAuditActor({
        actorType: "OPERATOR",
        actorDisplayName: null,
        product: null,
        supportAccessGrantId: ACCOUNT_ID,
      }),
    ).toBe("Operator Monorise (dostęp wsparcia)");

    // Preferuje polską etykietę z Core, a gdy brak — korzysta z mapy Portalu albo surowej nazwy
    expect(formatAuditAction({ action: "app_access.revoked", actionLabel: "Wyłączono dostęp do aplikacji" })).toBe(
      "Wyłączono dostęp do aplikacji",
    );
    expect(formatAuditAction({ action: "employee.updated", actionLabel: "employee.updated" })).toBe(
      "Zaktualizowano dane pracownika",
    );
    expect(formatAuditAction({ action: "timotime.entry.approved", actionLabel: "timotime.entry.approved" })).toBe(
      "timotime.entry.approved",
    );

    expect(formatAuditResourceType("app_access")).toBe("Dostęp do aplikacji");
    expect(formatAuditResourceType("organization_domain")).toBe("Domena firmy");
    expect(formatAuditResourceType("custom_entity")).toBe("custom_entity");

    expect(formatAuditDateTime("2026-11-25T13:05:00.000Z")).toContain("14:05");
    expect(hasAuditMetadata({})).toBe(false);
    expect(hasAuditMetadata({ product: "timotime" })).toBe(true);
  });
});
