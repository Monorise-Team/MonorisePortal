import type { Role, RoleAssignment } from "@monorise-team/sdk";
import { describe, expect, it } from "vitest";
import { OK_MESSAGES } from "../src/lib/messages";
import {
  DOMAIN_STATUS,
  ORGANIZATION_MANAGE_PERMISSION,
  allowLocalDomainTrust,
  canDeleteDomain,
  canSetPrimaryDomain,
  canVerifyDomain,
  formatDomainDateTime,
  hasOrganizationManagePermission,
} from "../src/lib/organization";

const ROLE_ID = "01936f4e-1000-7000-8000-000000000010";
const ACCOUNT_ID = "01936f4e-1000-7000-8000-000000000011";
const NOW = new Date("2026-11-26T12:00:00.000Z");

const role = (overrides: Partial<Role> = {}): Role => ({
  id: ROLE_ID,
  key: "core.company_admin",
  product: null,
  name: "Administrator firmy",
  description: null,
  isTemplate: true,
  copiedFromRoleId: null,
  archivedAt: null,
  permissions: [ORGANIZATION_MANAGE_PERMISSION],
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
  ...overrides,
});

const assignment = (overrides: Partial<RoleAssignment> = {}): RoleAssignment => ({
  id: "01936f4e-1000-7000-8000-000000000012",
  accountId: ACCOUNT_ID,
  roleId: ROLE_ID,
  scopeType: "ORGANIZATION",
  scopeId: null,
  validFrom: null,
  validUntil: null,
  grantedByAccountId: "01936f4e-1000-7000-8000-000000000001",
  createdAt: "2026-11-01T00:00:00.000Z",
  ...overrides,
});

describe("dane firmy i domeny e-mail", () => {
  it("rozpoznaje aktywne uprawnienie core.organization.manage wyłącznie w zakresie całej firmy", () => {
    expect(hasOrganizationManagePermission([assignment()], [role()], NOW)).toBe(true);
    expect(
      hasOrganizationManagePermission(
        [assignment({ validFrom: "2026-11-26T12:00:00.000Z", validUntil: "2026-12-01T00:00:00.000Z" })],
        [role()],
        NOW,
      ),
    ).toBe(true);

    // Zakres jednostki, zarchiwizowana rola, brak uprawnienia albo nieaktywny termin nie dają dostępu
    expect(
      hasOrganizationManagePermission(
        [assignment({ scopeType: "UNIT", scopeId: "01936f4e-1000-7000-8000-000000000099" })],
        [role()],
        NOW,
      ),
    ).toBe(false);
    expect(
      hasOrganizationManagePermission([assignment()], [role({ archivedAt: "2026-11-20T00:00:00.000Z" })], NOW),
    ).toBe(false);
    expect(hasOrganizationManagePermission([assignment()], [role({ permissions: ["core.audit.read"] })], NOW)).toBe(
      false,
    );
    expect(
      hasOrganizationManagePermission([assignment({ validFrom: "2026-11-27T00:00:00.000Z" })], [role()], NOW),
    ).toBe(false);
    expect(
      hasOrganizationManagePermission([assignment({ validUntil: "2026-11-26T12:00:00.000Z" })], [role()], NOW),
    ).toBe(false);
    expect(hasOrganizationManagePermission([], [role()], NOW)).toBe(false);
  });

  it("wyznacza dostępne akcje dla statusów domen i flagi głównej", () => {
    expect(canVerifyDomain({ status: "PENDING" })).toBe(true);
    expect(canVerifyDomain({ status: "FAILED" })).toBe(true);
    expect(canVerifyDomain({ status: "VERIFIED" })).toBe(false);
    expect(canVerifyDomain({ status: "REVOKED" })).toBe(false);

    expect(canSetPrimaryDomain({ status: "VERIFIED", isPrimary: false })).toBe(true);
    expect(canSetPrimaryDomain({ status: "VERIFIED", isPrimary: true })).toBe(false);
    expect(canSetPrimaryDomain({ status: "PENDING", isPrimary: false })).toBe(false);
    expect(canSetPrimaryDomain({ status: "FAILED", isPrimary: false })).toBe(false);
    expect(canSetPrimaryDomain({ status: "REVOKED", isPrimary: false })).toBe(false);

    expect(canDeleteDomain({ isPrimary: false })).toBe(true);
    expect(canDeleteDomain({ isPrimary: true })).toBe(false);
  });

  it("pokazuje lokalne potwierdzanie bez DNS tylko poza produkcją", () => {
    expect(allowLocalDomainTrust("development")).toBe(true);
    expect(allowLocalDomainTrust("test")).toBe(true);
    expect(allowLocalDomainTrust(undefined)).toBe(true);
    expect(allowLocalDomainTrust("production")).toBe(false);
  });

  it("ma polskie etykiety statusów domen i komunikaty sukcesu", () => {
    expect(DOMAIN_STATUS.VERIFIED.label).toBe("zweryfikowana");
    expect(DOMAIN_STATUS.PENDING.label).toBe("oczekuje");
    expect(DOMAIN_STATUS.FAILED.label).toBe("nie udało się");
    expect(DOMAIN_STATUS.REVOKED.label).toBe("wycofana");

    expect(OK_MESSAGES["organization-updated"]).toBe("Nazwa firmy zapisana.");
    expect(OK_MESSAGES["domain-added"]).toBe("Domena dodana. Dodaj rekord TXT w DNS i kliknij „Sprawdź DNS”.");
    expect(OK_MESSAGES["domain-verified"]).toBe("Domena zweryfikowana.");
    expect(OK_MESSAGES["domain-primary-changed"]).toBe("Domena główna zmieniona.");
    expect(OK_MESSAGES["domain-deleted"]).toBe("Domena usunięta.");

    expect(formatDomainDateTime("2026-11-26T13:05:00.000Z")).toContain("14:05");
    expect(formatDomainDateTime("nie-data")).toBe("nie-data");
  });
});
