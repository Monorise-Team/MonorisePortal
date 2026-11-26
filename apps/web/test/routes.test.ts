import { AuthError, type AuthContext } from "@monorise-team/auth";
import type { Authenticated, Session, WithAuthOptions } from "@monorise-team/auth/next";
import { CoreApiError, CoreApiUnavailableError, type CoreClient } from "@monorise-team/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_DETAIL_COOKIE } from "@/server/form";

vi.mock("server-only", () => ({}));

const authState = { unauthenticated: false, viaBearer: false };

const fakeContext: AuthContext = {
  accountId: "01936f4e-8a1b-7c3d-9e2f-000000000001",
  organizationId: "01936f4e-8a1b-7c3d-9e2f-000000000002",
  employeeId: "01936f4e-8a1b-7c3d-9e2f-000000000003",
  sessionId: "01936f4e-8a1b-7c3d-9e2f-000000000004",
  authzRevision: 1,
  methods: ["pwd"],
  clientId: "monorise-portal",
  scopes: ["openid"],
  expiresAt: new Date("2026-12-01T00:00:00.000Z"),
};

const fakeSession: Session = {
  context: fakeContext,
  profile: { email: "anna@acme.test", name: "Anna Nowak" },
  expiresAt: fakeContext.expiresAt,
  accessToken: async () => "fake-access-token",
  setCookies: [],
};

const fakeCore = {
  createInvitation: vi.fn(),
  resendInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
  updateEmployee: vi.fn(),
  transferOrganizationOwner: vi.fn(),
  createUnit: vi.fn(),
  updateUnit: vi.fn(),
  putUnitMember: vi.fn(),
  deleteUnitMember: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  archiveRole: vi.fn(),
  createRoleAssignment: vi.fn(),
  deleteRoleAssignment: vi.fn(),
  grantAppAccess: vi.fn(),
  revokeAppAccess: vi.fn(),
};

vi.mock("@/server/auth", () => ({
  getAuth: () => ({
    withAuth: async (
      request: Request,
      handler: (auth: Authenticated) => Response | Promise<Response>,
      options?: WithAuthOptions,
    ) => {
      try {
        if (authState.unauthenticated) throw new AuthError("UNAUTHENTICATED", "Brak sesji");
        const auth: Authenticated = authState.viaBearer
          ? { via: "bearer", session: null, context: fakeContext, setCookies: [] }
          : { via: "session", session: fakeSession, context: fakeContext, setCookies: [] };
        return await handler(auth);
      } catch (error) {
        if (options?.onError) return await options.onError(error, request);
        throw error;
      }
    },
  }),
}));

vi.mock("@/server/core", () => ({
  coreFor: () => fakeCore as unknown as CoreClient,
}));

import { POST as revokeAppAccessPost } from "@/app/api/app-access/[appAccessId]/revoke/route";
import { POST as grantAppAccessPost } from "@/app/api/app-access/route";
import { POST as updateEmployeePost } from "@/app/api/employees/[employeeId]/route";
import { POST as resendInvitationPost } from "@/app/api/invitations/[invitationId]/resend/route";
import { POST as revokeInvitationPost } from "@/app/api/invitations/[invitationId]/revoke/route";
import { POST as createInvitationPost } from "@/app/api/invitations/route";
import { POST as transferOwnerPost } from "@/app/api/organization/owner/route";
import { POST as removeRoleAssignmentPost } from "@/app/api/role-assignments/[assignmentId]/remove/route";
import { POST as createRoleAssignmentPost } from "@/app/api/role-assignments/route";
import { POST as archiveRolePost } from "@/app/api/roles/[roleId]/archive/route";
import { POST as updateRolePost } from "@/app/api/roles/[roleId]/route";
import { POST as createRolePost } from "@/app/api/roles/route";
import { POST as archiveUnitPost } from "@/app/api/units/[unitId]/archive/route";
import { POST as removeUnitMemberPost } from "@/app/api/units/[unitId]/members/[employeeId]/remove/route";
import { POST as putUnitMemberPost } from "@/app/api/units/[unitId]/members/route";
import { POST as updateUnitPost } from "@/app/api/units/[unitId]/route";
import { POST as createUnitPost } from "@/app/api/units/route";

const UUID_1 = "01936f4e-1000-7000-8000-000000000001";
const UUID_2 = "01936f4e-1000-7000-8000-000000000002";
const UUID_3 = "01936f4e-1000-7000-8000-000000000003";

const formOf = (entries: Array<[string, string]> | Record<string, string>) => {
  const form = new FormData();
  const list = Array.isArray(entries) ? entries : Object.entries(entries);
  for (const [key, value] of list) form.append(key, value);
  return form;
};

const post = (path: string, body: FormData = new FormData()) =>
  new Request(`http://portal.localhost:3400${path}`, { method: "POST", body });

const coreError = (code: string, message: string, status = 409) =>
  new CoreApiError({ status, code, message, details: [], requestId: "req-1" });

function expectRedirect(
  response: Response,
  expectedPath: string,
  expectedQuery: Record<string, string>,
  expectedDetail?: string,
) {
  expect(response.status).toBe(303);
  const location = new URL(response.headers.get("Location") ?? "");
  expect(location.pathname).toBe(expectedPath);
  expect(Object.fromEntries(location.searchParams.entries())).toEqual(expectedQuery);

  const cookie = response.headers.get("Set-Cookie") ?? "";
  if (expectedDetail) {
    expect(cookie).toContain(`${ERROR_DETAIL_COOKIE}=${encodeURIComponent(expectedDetail)}`);
    expect(cookie).toContain("Max-Age=30");
  } else {
    expect(cookie).toContain(`${ERROR_DETAIL_COOKIE}=;`);
    expect(cookie).toContain("Max-Age=0");
  }
}

beforeEach(() => {
  authState.unauthenticated = false;
  authState.viaBearer = false;
  vi.clearAllMocks();
  for (const fn of Object.values(fakeCore)) fn.mockResolvedValue(undefined);
});

describe("trasy formularzy Portalu", () => {
  describe("wspólne zachowanie formAction", () => {
    it("bez sesji przekierowuje na logowanie z returnTo", async () => {
      authState.unauthenticated = true;
      const res = await createUnitPost(post("/api/units", formOf({ name: "Kraków", type: "TEAM" })));
      expectRedirect(res, "/api/auth/sign-in", { returnTo: "/structure" });
      expect(fakeCore.createUnit).not.toHaveBeenCalled();
    });

    it("sesja inna niż ciasteczko (bearer) przekierowuje na logowanie", async () => {
      authState.viaBearer = true;
      const res = await grantAppAccessPost(post("/api/app-access", formOf({ accountId: UUID_1, product: "timotime" })));
      expectRedirect(res, "/api/auth/sign-in", { returnTo: "/apps" });
      expect(fakeCore.grantAppAccess).not.toHaveBeenCalled();
    });

    it("odmowa CoreApiError UNAUTHENTICATED przekierowuje na logowanie", async () => {
      fakeCore.createUnit.mockRejectedValueOnce(coreError("UNAUTHENTICATED", "Sesja wygasła", 401));
      const res = await createUnitPost(post("/api/units", formOf({ name: "Kraków", type: "TEAM" })));
      expectRedirect(res, "/api/auth/sign-in", { returnTo: "/structure" });
    });

    it("niedostępność CoreApiUnavailableError wraca z ?error=UNAVAILABLE", async () => {
      fakeCore.grantAppAccess.mockRejectedValueOnce(new CoreApiUnavailableError("Connection refused"));
      const res = await grantAppAccessPost(post("/api/app-access", formOf({ accountId: UUID_1, product: "timotime" })));
      expectRedirect(res, "/apps", { error: "UNAVAILABLE" });
    });

    it("nieprawidłowy identyfikator w ścieżce wraca na listę zamiast wstawiać go do adresu", async () => {
      fakeCore.updateUnit.mockRejectedValueOnce(coreError("NOT_FOUND", "Brak jednostki", 404));
      const unitRes = await updateUnitPost(post("/api/units/..%2Fx", formOf({ name: "Nowa" })), {
        params: Promise.resolve({ unitId: "../x" }),
      });
      expectRedirect(unitRes, "/structure", { error: "NOT_FOUND" }, "Brak jednostki");
      expect(unitRes.headers.get("Location")).not.toContain("../x");

      fakeCore.archiveRole.mockRejectedValueOnce(coreError("NOT_FOUND", "Brak roli", 404));
      const roleRes = await archiveRolePost(post("/api/roles/..%2Fx/archive"), {
        params: Promise.resolve({ roleId: "../x" }),
      });
      expectRedirect(roleRes, "/roles", { error: "NOT_FOUND" }, "Brak roli");
      expect(roleRes.headers.get("Location")).not.toContain("../x");
    });
  });

  describe("POST /api/organization/owner", () => {
    it("przekazuje rolę właściciela po potwierdzeniu", async () => {
      const res = await transferOwnerPost(
        post("/api/organization/owner", formOf({ accountId: UUID_1, confirm: "on" })),
      );
      expect(fakeCore.transferOrganizationOwner).toHaveBeenCalledWith({ body: { accountId: UUID_1 } });
      expectRedirect(res, "/", { ok: "owner-transferred" });
    });

    it("wymaga zaznaczenia potwierdzenia i pola accountId", async () => {
      const noConfirm = await transferOwnerPost(post("/api/organization/owner", formOf({ accountId: UUID_1 })));
      expectRedirect(noConfirm, "/", { error: "VALIDATION_FAILED" });

      const noAccount = await transferOwnerPost(post("/api/organization/owner", formOf({ confirm: "on" })));
      expectRedirect(noAccount, "/", { error: "VALIDATION_FAILED" });
      expect(fakeCore.transferOrganizationOwner).not.toHaveBeenCalled();
    });

    it("przekazuje odmowę Core z powodem w ciasteczku", async () => {
      fakeCore.transferOrganizationOwner.mockRejectedValueOnce(
        coreError("PERMISSION_DENIED", "Tylko właściciel może przekazać tę rolę", 403),
      );
      const res = await transferOwnerPost(
        post("/api/organization/owner", formOf({ accountId: UUID_1, confirm: "on" })),
      );
      expectRedirect(res, "/", { error: "PERMISSION_DENIED" }, "Tylko właściciel może przekazać tę rolę");
    });
  });

  describe("POST /api/invitations", () => {
    it("wysyła zaproszenie dla nowej osoby (email, imię, nazwisko) z kluczem idempotentności", async () => {
      const res = await createInvitationPost(
        post(
          "/api/invitations",
          formOf({ email: "anna@acme.test", firstName: "Anna", lastName: "Nowak", idempotencyKey: UUID_3 }),
        ),
      );
      expect(fakeCore.createInvitation).toHaveBeenCalledWith({
        body: { email: "anna@acme.test", firstName: "Anna", lastName: "Nowak" },
        headers: { "Idempotency-Key": UUID_3 },
      });
      expectRedirect(res, "/employees", { ok: "invited" });
    });

    it("wysyła zaproszenie dla istniejącego pracownika bez konta (email, employeeId)", async () => {
      const res = await createInvitationPost(
        post("/api/invitations", formOf({ email: "anna@acme.test", employeeId: UUID_1 })),
      );
      expect(fakeCore.createInvitation).toHaveBeenCalledWith({
        body: { email: "anna@acme.test", employeeId: UUID_1 },
        headers: { "Idempotency-Key": expect.any(String) },
      });
      expectRedirect(res, "/employees", { ok: "invited" });
    });

    it("zwraca VALIDATION_FAILED przy braku wymaganego pola bez pytania Core", async () => {
      const noEmail = await createInvitationPost(
        post("/api/invitations", formOf({ firstName: "Anna", lastName: "Nowak" })),
      );
      expectRedirect(noEmail, "/employees", { error: "VALIDATION_FAILED" });

      const noLastName = await createInvitationPost(
        post("/api/invitations", formOf({ email: "anna@acme.test", firstName: "Anna" })),
      );
      expectRedirect(noLastName, "/employees", { error: "VALIDATION_FAILED" });
      expect(fakeCore.createInvitation).not.toHaveBeenCalled();
    });

    it("przekazuje odmowę Core z powodem", async () => {
      fakeCore.createInvitation.mockRejectedValueOnce(
        coreError("EMAIL_DOMAIN_NOT_ALLOWED", "Domena nie jest zweryfikowana", 422),
      );
      const res = await createInvitationPost(
        post("/api/invitations", formOf({ email: "anna@obca.test", firstName: "Anna", lastName: "Nowak" })),
      );
      expectRedirect(res, "/employees", { error: "EMAIL_DOMAIN_NOT_ALLOWED" }, "Domena nie jest zweryfikowana");
    });
  });

  describe("POST /api/invitations/[invitationId]/resend i revoke", () => {
    it("wysyła ponownie zaproszenie i obsługuje odmowę Core", async () => {
      const ok = await resendInvitationPost(post(`/api/invitations/${UUID_1}/resend`), {
        params: Promise.resolve({ invitationId: UUID_1 }),
      });
      expect(fakeCore.resendInvitation).toHaveBeenCalledWith({ path: { invitationId: UUID_1 } });
      expectRedirect(ok, "/employees", { ok: "resent" });

      fakeCore.resendInvitation.mockRejectedValueOnce(coreError("CONFLICT", "Konto zostało już aktywowane"));
      const err = await resendInvitationPost(post(`/api/invitations/${UUID_1}/resend`), {
        params: Promise.resolve({ invitationId: UUID_1 }),
      });
      expectRedirect(err, "/employees", { error: "CONFLICT" }, "Konto zostało już aktywowane");
    });

    it("cofa zaproszenie i obsługuje odmowę Core", async () => {
      const ok = await revokeInvitationPost(post(`/api/invitations/${UUID_1}/revoke`), {
        params: Promise.resolve({ invitationId: UUID_1 }),
      });
      expect(fakeCore.revokeInvitation).toHaveBeenCalledWith({ path: { invitationId: UUID_1 } });
      expectRedirect(ok, "/employees", { ok: "revoked" });

      fakeCore.revokeInvitation.mockRejectedValueOnce(coreError("NOT_FOUND", "Zaproszenie nie istnieje", 404));
      const err = await revokeInvitationPost(post(`/api/invitations/${UUID_1}/revoke`), {
        params: Promise.resolve({ invitationId: UUID_1 }),
      });
      expectRedirect(err, "/employees", { error: "NOT_FOUND" }, "Zaproszenie nie istnieje");
    });
  });

  describe("POST /api/employees/[employeeId]", () => {
    it("aktualizuje imię, nazwisko i stanowisko pracownika z kontem (bez wysyłania workEmail)", async () => {
      const res = await updateEmployeePost(
        post(`/api/employees/${UUID_1}`, formOf({ firstName: "Jan", lastName: "Kowalski", jobTitle: "Programista" })),
        { params: Promise.resolve({ employeeId: UUID_1 }) },
      );
      expect(fakeCore.updateEmployee).toHaveBeenCalledWith({
        path: { employeeId: UUID_1 },
        body: { firstName: "Jan", lastName: "Kowalski", jobTitle: "Programista" },
      });
      expectRedirect(res, "/employees", { ok: "employee-updated" });
    });

    it("aktualizuje lub czyści stanowisko i workEmail pracownika bez konta", async () => {
      const withEmail = await updateEmployeePost(
        post(
          `/api/employees/${UUID_1}`,
          formOf({ firstName: "Ewa", lastName: "Zielińska", jobTitle: "  ", workEmail: "ewa@acme.test" }),
        ),
        { params: Promise.resolve({ employeeId: UUID_1 }) },
      );
      expect(fakeCore.updateEmployee).toHaveBeenCalledWith({
        path: { employeeId: UUID_1 },
        body: { firstName: "Ewa", lastName: "Zielińska", jobTitle: null, workEmail: "ewa@acme.test" },
      });
      expectRedirect(withEmail, "/employees", { ok: "employee-updated" });

      const clearedEmail = await updateEmployeePost(
        post(
          `/api/employees/${UUID_1}`,
          formOf({ firstName: "Ewa", lastName: "Zielińska", jobTitle: "", workEmail: "" }),
        ),
        { params: Promise.resolve({ employeeId: UUID_1 }) },
      );
      expect(fakeCore.updateEmployee).toHaveBeenCalledWith({
        path: { employeeId: UUID_1 },
        body: { firstName: "Ewa", lastName: "Zielińska", jobTitle: null, workEmail: null },
      });
      expectRedirect(clearedEmail, "/employees", { ok: "employee-updated" });
    });

    it("mapuje błędy Core 409 i 422 na przekierowanie z komunikatem z Core", async () => {
      const conflictMsg = "Nie można zmienić służbowego adresu e-mail pracownika powiązanego z kontem logowania";
      fakeCore.updateEmployee.mockRejectedValueOnce(coreError("CONFLICT", conflictMsg, 409));
      const conflict = await updateEmployeePost(
        post(`/api/employees/${UUID_1}`, formOf({ firstName: "Jan", lastName: "Kowalski", workEmail: "a@acme.test" })),
        { params: Promise.resolve({ employeeId: UUID_1 }) },
      );
      expectRedirect(conflict, "/employees", { error: "CONFLICT" }, conflictMsg);

      const domainMsg = "Domena adresu e-mail nie należy do zweryfikowanych domen firmy";
      fakeCore.updateEmployee.mockRejectedValueOnce(coreError("EMAIL_DOMAIN_NOT_ALLOWED", domainMsg, 422));
      const badDomain = await updateEmployeePost(
        post(
          `/api/employees/${UUID_1}`,
          formOf({ firstName: "Jan", lastName: "Kowalski", workEmail: "jan@gmail.com" }),
        ),
        { params: Promise.resolve({ employeeId: UUID_1 }) },
      );
      expectRedirect(badDomain, "/employees", { error: "EMAIL_DOMAIN_NOT_ALLOWED" }, domainMsg);

      const validationMsg = "Nieprawidłowy adres e-mail";
      fakeCore.updateEmployee.mockRejectedValueOnce(coreError("VALIDATION_FAILED", validationMsg, 422));
      const badBody = await updateEmployeePost(
        post(`/api/employees/${UUID_1}`, formOf({ firstName: "Jan", lastName: "Kowalski", workEmail: "zly-email" })),
        { params: Promise.resolve({ employeeId: UUID_1 }) },
      );
      expectRedirect(badBody, "/employees", { error: "VALIDATION_FAILED" }, validationMsg);
    });

    it("bez sesji przekierowuje na logowanie, a przy brakujących polach lub złym ID zwraca VALIDATION_FAILED", async () => {
      authState.unauthenticated = true;
      const unauth = await updateEmployeePost(
        post(`/api/employees/${UUID_1}`, formOf({ firstName: "Jan", lastName: "Kowalski" })),
        { params: Promise.resolve({ employeeId: UUID_1 }) },
      );
      expectRedirect(unauth, "/api/auth/sign-in", { returnTo: "/employees" });

      authState.unauthenticated = false;
      const missingName = await updateEmployeePost(post(`/api/employees/${UUID_1}`, formOf({ firstName: "Jan" })), {
        params: Promise.resolve({ employeeId: UUID_1 }),
      });
      expectRedirect(missingName, "/employees", { error: "VALIDATION_FAILED" });

      const badId = await updateEmployeePost(
        post("/api/employees/not-a-uuid", formOf({ firstName: "Jan", lastName: "Kowalski" })),
        { params: Promise.resolve({ employeeId: "not-a-uuid" }) },
      );
      expectRedirect(badId, "/employees", { error: "VALIDATION_FAILED" });
      expect(fakeCore.updateEmployee).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/units", () => {
    it("tworzy jednostkę nadrzędną z parentId null, gdy pole puste", async () => {
      const res = await createUnitPost(
        post("/api/units", formOf({ name: "Kraków", type: "BRANCH", parentId: "  ", idempotencyKey: UUID_2 })),
      );
      expect(fakeCore.createUnit).toHaveBeenCalledWith({
        body: { name: "Kraków", type: "BRANCH", parentId: null },
        headers: { "Idempotency-Key": UUID_2 },
      });
      expectRedirect(res, "/structure", { ok: "unit-created" });
    });

    it("tworzy jednostkę podrzędną z podanym parentId", async () => {
      const res = await createUnitPost(
        post("/api/units", formOf({ name: "Sprzedaż", type: "TEAM", parentId: UUID_1 })),
      );
      expect(fakeCore.createUnit).toHaveBeenCalledWith({
        body: { name: "Sprzedaż", type: "TEAM", parentId: UUID_1 },
        headers: { "Idempotency-Key": expect.any(String) },
      });
      expectRedirect(res, "/structure", { ok: "unit-created" });
    });

    it("zwraca VALIDATION_FAILED przy braku nazwy albo złym rodzaju", async () => {
      const noName = await createUnitPost(post("/api/units", formOf({ type: "TEAM" })));
      expectRedirect(noName, "/structure", { error: "VALIDATION_FAILED" });

      const badType = await createUnitPost(post("/api/units", formOf({ name: "Zespół", type: "INVALID" })));
      expectRedirect(badType, "/structure", { error: "VALIDATION_FAILED" });
      expect(fakeCore.createUnit).not.toHaveBeenCalled();
    });

    it("przekazuje odmowę Core z powodem", async () => {
      fakeCore.createUnit.mockRejectedValueOnce(coreError("CONFLICT", "Taka jednostka już istnieje"));
      const res = await createUnitPost(post("/api/units", formOf({ name: "Kraków", type: "BRANCH" })));
      expectRedirect(res, "/structure", { error: "CONFLICT" }, "Taka jednostka już istnieje");
    });
  });

  describe("POST /api/units/[unitId] i archive", () => {
    it("zmienia nazwę jednostki, sprawdza wymagane pole i obsługuje odmowę Core", async () => {
      const ok = await updateUnitPost(post(`/api/units/${UUID_1}`, formOf({ name: "Kraków Południe" })), {
        params: Promise.resolve({ unitId: UUID_1 }),
      });
      expect(fakeCore.updateUnit).toHaveBeenCalledWith({
        path: { unitId: UUID_1 },
        body: { name: "Kraków Południe" },
      });
      expectRedirect(ok, `/structure/${UUID_1}`, { ok: "unit-updated" });

      const invalid = await updateUnitPost(post(`/api/units/${UUID_1}`, formOf({ name: "" })), {
        params: Promise.resolve({ unitId: UUID_1 }),
      });
      expectRedirect(invalid, `/structure/${UUID_1}`, { error: "VALIDATION_FAILED" });
      expect(fakeCore.updateUnit).toHaveBeenCalledTimes(1);

      fakeCore.updateUnit.mockRejectedValueOnce(coreError("CONFLICT", "Nazwa jest już zajęta"));
      const err = await updateUnitPost(post(`/api/units/${UUID_1}`, formOf({ name: "Warszawa" })), {
        params: Promise.resolve({ unitId: UUID_1 }),
      });
      expectRedirect(err, `/structure/${UUID_1}`, { error: "CONFLICT" }, "Nazwa jest już zajęta");
    });

    it("archiwizuje jednostkę i wraca na /structure, a przy błędzie na stronę jednostki", async () => {
      const ok = await archiveUnitPost(post(`/api/units/${UUID_1}/archive`), {
        params: Promise.resolve({ unitId: UUID_1 }),
      });
      expect(fakeCore.updateUnit).toHaveBeenCalledWith({ path: { unitId: UUID_1 }, body: { status: "ARCHIVED" } });
      expectRedirect(ok, "/structure", { ok: "unit-archived" });

      fakeCore.updateUnit.mockRejectedValueOnce(coreError("CONFLICT", "Jednostka ma aktywne zespoły"));
      const err = await archiveUnitPost(post(`/api/units/${UUID_1}/archive`), {
        params: Promise.resolve({ unitId: UUID_1 }),
      });
      expectRedirect(err, `/structure/${UUID_1}`, { error: "CONFLICT" }, "Jednostka ma aktywne zespoły");
    });
  });

  describe("POST /api/units/[unitId]/members i remove", () => {
    it("zapisuje członka albo kierownika jednostki", async () => {
      const res = await putUnitMemberPost(
        post(`/api/units/${UUID_1}/members`, formOf({ employeeId: UUID_2, role: "LEADER" })),
        { params: Promise.resolve({ unitId: UUID_1 }) },
      );
      expect(fakeCore.putUnitMember).toHaveBeenCalledWith({
        path: { unitId: UUID_1, employeeId: UUID_2 },
        body: { role: "LEADER" },
      });
      expectRedirect(res, `/structure/${UUID_1}`, { ok: "member-saved" });
    });

    it("odrzuca nieprawidłową rolę lub brak pracownika bez pytania Core", async () => {
      const badRole = await putUnitMemberPost(
        post(`/api/units/${UUID_1}/members`, formOf({ employeeId: UUID_2, role: "OWNER" })),
        { params: Promise.resolve({ unitId: UUID_1 }) },
      );
      expectRedirect(badRole, `/structure/${UUID_1}`, { error: "VALIDATION_FAILED" });

      const noEmployee = await putUnitMemberPost(post(`/api/units/${UUID_1}/members`, formOf({ role: "MEMBER" })), {
        params: Promise.resolve({ unitId: UUID_1 }),
      });
      expectRedirect(noEmployee, `/structure/${UUID_1}`, { error: "VALIDATION_FAILED" });
      expect(fakeCore.putUnitMember).not.toHaveBeenCalled();
    });

    it("przekazuje odmowę Core przy dodawaniu członka", async () => {
      fakeCore.putUnitMember.mockRejectedValueOnce(coreError("NOT_FOUND", "Nie znaleziono pracownika", 404));
      const res = await putUnitMemberPost(
        post(`/api/units/${UUID_1}/members`, formOf({ employeeId: UUID_2, role: "MEMBER" })),
        { params: Promise.resolve({ unitId: UUID_1 }) },
      );
      expectRedirect(res, `/structure/${UUID_1}`, { error: "NOT_FOUND" }, "Nie znaleziono pracownika");
    });

    it("usuwa członka z jednostki i obsługuje odmowę Core", async () => {
      const ok = await removeUnitMemberPost(post(`/api/units/${UUID_1}/members/${UUID_2}/remove`), {
        params: Promise.resolve({ unitId: UUID_1, employeeId: UUID_2 }),
      });
      expect(fakeCore.deleteUnitMember).toHaveBeenCalledWith({ path: { unitId: UUID_1, employeeId: UUID_2 } });
      expectRedirect(ok, `/structure/${UUID_1}`, { ok: "member-removed" });

      fakeCore.deleteUnitMember.mockRejectedValueOnce(coreError("PERMISSION_DENIED", "Brak uprawnień", 403));
      const err = await removeUnitMemberPost(post(`/api/units/${UUID_1}/members/${UUID_2}/remove`), {
        params: Promise.resolve({ unitId: UUID_1, employeeId: UUID_2 }),
      });
      expectRedirect(err, `/structure/${UUID_1}`, { error: "PERMISSION_DENIED" }, "Brak uprawnień");
    });
  });

  describe("POST /api/roles, [roleId] i archive", () => {
    it("tworzy rolę i kieruje na stronę nowej roli", async () => {
      fakeCore.createRole.mockResolvedValueOnce({ id: UUID_2 });
      const res = await createRolePost(
        post("/api/roles", formOf({ copyFromRoleId: UUID_1, name: "Kierownik zmiany", idempotencyKey: UUID_3 })),
      );
      expect(fakeCore.createRole).toHaveBeenCalledWith({
        body: { copyFromRoleId: UUID_1, name: "Kierownik zmiany" },
        headers: { "Idempotency-Key": UUID_3 },
      });
      expectRedirect(res, `/roles/${UUID_2}`, { ok: "role-created" });
    });

    it("waliduje wymagane pola przy tworzeniu roli i obsługuje odmowę Core", async () => {
      const invalid = await createRolePost(post("/api/roles", formOf({ copyFromRoleId: UUID_1 })));
      expectRedirect(invalid, "/roles", { error: "VALIDATION_FAILED" });
      expect(fakeCore.createRole).not.toHaveBeenCalled();

      fakeCore.createRole.mockRejectedValueOnce(coreError("CONFLICT", "Rola o tej nazwie już istnieje"));
      const err = await createRolePost(post("/api/roles", formOf({ copyFromRoleId: UUID_1, name: "Kadry" })));
      expectRedirect(err, "/roles", { error: "CONFLICT" }, "Rola o tej nazwie już istnieje");
    });

    it("aktualizuje rolę z posortowanymi, unikalnymi uprawnieniami i pustym opisem jako null", async () => {
      const form = formOf([
        ["name", "Kadry"],
        ["description", "   "],
        ["permissions", "core.employees.read"],
        ["permissions", ""],
        ["permissions", "core.employees.manage"],
        ["permissions", "core.employees.read"],
      ]);
      const ok = await updateRolePost(post(`/api/roles/${UUID_1}`, form), {
        params: Promise.resolve({ roleId: UUID_1 }),
      });
      expect(fakeCore.updateRole).toHaveBeenCalledWith({
        path: { roleId: UUID_1 },
        body: {
          name: "Kadry",
          description: null,
          permissions: ["core.employees.manage", "core.employees.read"],
        },
      });
      expectRedirect(ok, `/roles/${UUID_1}`, { ok: "role-updated" });

      const invalid = await updateRolePost(post(`/api/roles/${UUID_1}`, formOf({ description: "Opis" })), {
        params: Promise.resolve({ roleId: UUID_1 }),
      });
      expectRedirect(invalid, `/roles/${UUID_1}`, { error: "VALIDATION_FAILED" });
      expect(fakeCore.updateRole).toHaveBeenCalledTimes(1);

      fakeCore.updateRole.mockRejectedValueOnce(coreError("PERMISSION_DENIED", "Gotowej roli nie można zmienić", 403));
      const err = await updateRolePost(post(`/api/roles/${UUID_1}`, formOf({ name: "Kadry" })), {
        params: Promise.resolve({ roleId: UUID_1 }),
      });
      expectRedirect(err, `/roles/${UUID_1}`, { error: "PERMISSION_DENIED" }, "Gotowej roli nie można zmienić");
    });

    it("archiwizuje rolę i wraca na /roles, a przy błędzie na stronę roli", async () => {
      const ok = await archiveRolePost(post(`/api/roles/${UUID_1}/archive`), {
        params: Promise.resolve({ roleId: UUID_1 }),
      });
      expect(fakeCore.archiveRole).toHaveBeenCalledWith({ path: { roleId: UUID_1 } });
      expectRedirect(ok, "/roles", { ok: "role-archived" });

      fakeCore.archiveRole.mockRejectedValueOnce(coreError("CONFLICT", "Rola ma aktywne przypisania"));
      const err = await archiveRolePost(post(`/api/roles/${UUID_1}/archive`), {
        params: Promise.resolve({ roleId: UUID_1 }),
      });
      expectRedirect(err, `/roles/${UUID_1}`, { error: "CONFLICT" }, "Rola ma aktywne przypisania");
    });
  });

  describe("POST /api/role-assignments i remove", () => {
    it("przypisuje rolę w zakresie całej firmy (org) albo jednostki (unit:<uuid>)", async () => {
      const orgRes = await createRoleAssignmentPost(
        post(
          "/api/role-assignments",
          formOf({ accountId: UUID_1, roleId: UUID_2, scope: "org", idempotencyKey: UUID_3 }),
        ),
      );
      expect(fakeCore.createRoleAssignment).toHaveBeenCalledWith({
        body: { accountId: UUID_1, roleId: UUID_2, scopeType: "ORGANIZATION", scopeId: null },
        headers: { "Idempotency-Key": UUID_3 },
      });
      expectRedirect(orgRes, `/roles/${UUID_2}`, { ok: "role-assigned" });

      const unitRes = await createRoleAssignmentPost(
        post("/api/role-assignments", formOf({ accountId: UUID_1, roleId: UUID_2, scope: `unit:${UUID_3}` })),
      );
      expect(fakeCore.createRoleAssignment).toHaveBeenCalledWith({
        body: { accountId: UUID_1, roleId: UUID_2, scopeType: "UNIT", scopeId: UUID_3 },
        headers: { "Idempotency-Key": expect.any(String) },
      });
      expectRedirect(unitRes, `/roles/${UUID_2}`, { ok: "role-assigned" });
    });

    it("odrzuca błędny zakres albo brakujące pola bez pytania Core", async () => {
      const badScope = await createRoleAssignmentPost(
        post("/api/role-assignments", formOf({ accountId: UUID_1, roleId: UUID_2, scope: "unit:../x" })),
      );
      expectRedirect(badScope, `/roles/${UUID_2}`, { error: "VALIDATION_FAILED" });

      const noAccount = await createRoleAssignmentPost(
        post("/api/role-assignments", formOf({ roleId: UUID_2, scope: "org" })),
      );
      expectRedirect(noAccount, `/roles/${UUID_2}`, { error: "VALIDATION_FAILED" });

      const badRoleRedirect = await createRoleAssignmentPost(
        post("/api/role-assignments", formOf({ accountId: UUID_1, roleId: "../x", scope: "org" })),
      );
      expect(fakeCore.createRoleAssignment).toHaveBeenCalledWith({
        body: { accountId: UUID_1, roleId: "../x", scopeType: "ORGANIZATION", scopeId: null },
        headers: { "Idempotency-Key": expect.any(String) },
      });
      expectRedirect(badRoleRedirect, "/roles", { ok: "role-assigned" });
    });

    it("przekazuje odmowę Core przy przypisaniu roli", async () => {
      fakeCore.createRoleAssignment.mockRejectedValueOnce(coreError("CONFLICT", "Rola jest już przypisana"));
      const res = await createRoleAssignmentPost(
        post("/api/role-assignments", formOf({ accountId: UUID_1, roleId: UUID_2, scope: "org" })),
      );
      expectRedirect(res, `/roles/${UUID_2}`, { error: "CONFLICT" }, "Rola jest już przypisana");
    });

    it("odbiera przypisanie roli z powrotem na stronę roli lub listę ról", async () => {
      const ok = await removeRoleAssignmentPost(
        post(`/api/role-assignments/${UUID_1}/remove`, formOf({ roleId: UUID_2 })),
        { params: Promise.resolve({ assignmentId: UUID_1 }) },
      );
      expect(fakeCore.deleteRoleAssignment).toHaveBeenCalledWith({ path: { assignmentId: UUID_1 } });
      expectRedirect(ok, `/roles/${UUID_2}`, { ok: "role-unassigned" });

      fakeCore.deleteRoleAssignment.mockRejectedValueOnce(coreError("NOT_FOUND", "Przypisanie nie istnieje", 404));
      const err = await removeRoleAssignmentPost(post(`/api/role-assignments/${UUID_1}/remove`), {
        params: Promise.resolve({ assignmentId: UUID_1 }),
      });
      expectRedirect(err, "/roles", { error: "NOT_FOUND" }, "Przypisanie nie istnieje");
    });
  });

  describe("POST /api/app-access i revoke", () => {
    it("nadaje dostęp do aplikacji, waliduje pola i obsługuje odmowę Core", async () => {
      const ok = await grantAppAccessPost(
        post("/api/app-access", formOf({ accountId: UUID_1, product: "timotime", idempotencyKey: UUID_2 })),
      );
      expect(fakeCore.grantAppAccess).toHaveBeenCalledWith({
        body: { accountId: UUID_1, product: "timotime" },
        headers: { "Idempotency-Key": UUID_2 },
      });
      expectRedirect(ok, "/apps", { ok: "access-granted" });

      const invalid = await grantAppAccessPost(post("/api/app-access", formOf({ product: "timotime" })));
      expectRedirect(invalid, "/apps", { error: "VALIDATION_FAILED" });
      expect(fakeCore.grantAppAccess).toHaveBeenCalledTimes(1);

      const message = "Dostęp do aplikacji można włączyć wyłącznie aktywnemu kontu";
      fakeCore.grantAppAccess.mockRejectedValueOnce(coreError("CONFLICT", message));
      const err = await grantAppAccessPost(post("/api/app-access", formOf({ accountId: UUID_1, product: "timotime" })));
      expectRedirect(err, "/apps", { error: "CONFLICT" }, message);
    });

    it("odbiera dostęp do aplikacji i obsługuje odmowę Core", async () => {
      const ok = await revokeAppAccessPost(post(`/api/app-access/${UUID_1}/revoke`), {
        params: Promise.resolve({ appAccessId: UUID_1 }),
      });
      expect(fakeCore.revokeAppAccess).toHaveBeenCalledWith({ path: { appAccessId: UUID_1 } });
      expectRedirect(ok, "/apps", { ok: "access-revoked" });

      fakeCore.revokeAppAccess.mockRejectedValueOnce(coreError("NOT_FOUND", "Nie znaleziono dostępu", 404));
      const err = await revokeAppAccessPost(post(`/api/app-access/${UUID_1}/revoke`), {
        params: Promise.resolve({ appAccessId: UUID_1 }),
      });
      expectRedirect(err, "/apps", { error: "NOT_FOUND" }, "Nie znaleziono dostępu");
    });
  });
});
