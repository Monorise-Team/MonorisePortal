import type { Unit } from "@monorise-team/sdk";
import { describe, expect, it } from "vitest";
import { buildUnitTree } from "../src/lib/units";

const unit = (id: string, name: string, parentId: string | null, type: Unit["type"] = "TEAM"): Unit => ({
  id,
  name,
  parentId,
  type,
  status: "ACTIVE",
  createdAt: "2026-11-25T10:00:00.000Z",
  updatedAt: "2026-11-25T10:00:00.000Z",
});

describe("drzewo jednostek", () => {
  it("stawia rodzica przed dziećmi, rodzeństwo alfabetycznie, z głębokością", () => {
    const rows = buildUnitTree([
      unit("w", "Warszawa", null, "BRANCH"),
      unit("m", "Magazyn Kraków", "k"),
      unit("k", "Kraków", null, "BRANCH"),
      unit("b", "Biuro Kraków", "k"),
    ]);
    expect(rows.map(({ unit: u, depth }) => `${depth}:${u.name}`)).toEqual([
      "0:Kraków",
      "1:Biuro Kraków",
      "1:Magazyn Kraków",
      "0:Warszawa",
    ]);
  });

  it("jednostka bez rodzica na liście jest na najwyższym poziomie", () => {
    expect(buildUnitTree([unit("a", "Zespół A", "brak")])).toEqual([{ unit: unit("a", "Zespół A", "brak"), depth: 0 }]);
  });

  it("cykl w danych nie zapętla i nie gubi jednostek", () => {
    const rows = buildUnitTree([unit("a", "A", "b"), unit("b", "B", "a")]);
    expect(rows.map(({ unit: u }) => u.id).sort()).toEqual(["a", "b"]);
  });
});
