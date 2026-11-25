import { describe, expect, it } from "vitest";
import { isId } from "../src/lib/ids";
import { parseScope, roleArea, selectedPermissions } from "../src/lib/roles";

const UNIT = "01936f4e-1000-7000-8000-000000000001";

describe("role w Portalu", () => {
  it("rozpoznaje zakres: cała firma albo jednostka, inaczej null", () => {
    expect(parseScope("org")).toEqual({ scopeType: "ORGANIZATION", scopeId: null });
    expect(parseScope(`unit:${UNIT}`)).toEqual({ scopeType: "UNIT", scopeId: UNIT });
    expect(parseScope("unit:")).toBeNull();
    expect(parseScope("unit:../../admin")).toBeNull();
    expect(parseScope(undefined)).toBeNull();
  });

  it("bierze zaznaczone uprawnienia bez powtórzeń i pustych wartości", () => {
    const form = new FormData();
    for (const value of ["timotime.entries.read", "", "timotime.entries.approve", "timotime.entries.read"]) {
      form.append("permissions", value);
    }
    expect(selectedPermissions(form)).toEqual(["timotime.entries.approve", "timotime.entries.read"]);
    expect(selectedPermissions(new FormData())).toEqual([]);
  });

  it("przepuszcza do adresu powrotu tylko UUID", () => {
    expect(isId(UNIT)).toBe(true);
    expect(isId("//zly.example")).toBe(false);
    expect(isId(undefined)).toBe(false);
  });

  it("opisuje pochodzenie roli", () => {
    expect(roleArea({ product: null }, (key) => key)).toBe("Monorise (firma i ludzie)");
    expect(roleArea({ product: "timotime" }, () => "TimoTime")).toBe("TimoTime");
  });
});
