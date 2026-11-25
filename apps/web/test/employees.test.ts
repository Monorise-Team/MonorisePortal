import type { Employee } from "@monorise-team/sdk";
import { describe, expect, it } from "vitest";
import { hasActiveAccount, namesByAccount } from "../src/lib/employees";

const employee = (overrides: Partial<Employee>): Employee => ({
  id: "01936f4e-9b2c-7d4e-8f5a-000000000001",
  accountId: "01936f4e-8a1b-7c3d-9e2f-000000000001",
  accountStatus: "ACTIVE",
  firstName: "Anna",
  lastName: "Nowak",
  workEmail: null,
  jobTitle: null,
  status: "ACTIVE",
  ...overrides,
});

describe("pracownicy w wyborach Portalu", () => {
  it("dopuszcza tylko pracujące osoby z aktywnym kontem", () => {
    expect(hasActiveAccount(employee({}))).toBe(true);
    expect(hasActiveAccount(employee({ accountStatus: "INVITED" }))).toBe(false);
    expect(hasActiveAccount(employee({ accountStatus: "DEACTIVATED" }))).toBe(false);
    expect(hasActiveAccount(employee({ accountId: null, accountStatus: null }))).toBe(false);
    expect(hasActiveAccount(employee({ status: "FORMER" }))).toBe(false);
  });

  it("zna imiona także zaproszonych kont, ale pomija osoby bez konta", () => {
    const names = namesByAccount([
      employee({ accountId: "a", firstName: "Ewa", lastName: "Zielińska", accountStatus: "INVITED" }),
      employee({ accountId: null, accountStatus: null, firstName: "Piotr" }),
    ]);
    expect([...names]).toEqual([["a", "Ewa Zielińska"]]);
  });
});
