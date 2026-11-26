import { describe, expect, it } from "vitest";
import { IDEMPOTENCY_FIELD, idempotencyHeaders, readIdempotencyKey } from "../src/lib/idempotency";

const formWith = (value?: string) => {
  const form = new FormData();
  if (value !== undefined) form.set(IDEMPOTENCY_FIELD, value);
  return form;
};

describe("klucz idempotentności formularzy", () => {
  it("ponownie używa tego samego klucza przy ponownym wysłaniu formularza", () => {
    const key = "01936f4e-8a1b-7c3d-9e2f-000000000099";
    const first = readIdempotencyKey(formWith(key), () => "generated-1");
    const second = readIdempotencyKey(formWith(`  ${key}  `), () => "generated-2");
    expect(first).toBe(key);
    expect(second).toBe(key);
  });

  it("generuje nowy klucz, gdy pole nie istnieje albo jest puste", () => {
    let seq = 0;
    const next = () => `generated-${++seq}`;
    expect(readIdempotencyKey(formWith(), next)).toBe("generated-1");
    expect(readIdempotencyKey(formWith(""), next)).toBe("generated-2");
    expect(readIdempotencyKey(formWith("   "), next)).toBe("generated-3");
  });

  it("generuje nowy klucz dla wartości niezgodnych z kontraktem Core (spoza ASCII albo za długich)", () => {
    expect(readIdempotencyKey(formWith("klucz-ąę"), () => "fallback-1")).toBe("fallback-1");
    expect(readIdempotencyKey(formWith("a".repeat(256)), () => "fallback-2")).toBe("fallback-2");
    expect(readIdempotencyKey(formWith("line\nbreak"), () => "fallback-3")).toBe("fallback-3");
  });

  it("domyślnie generuje poprawny UUID i buduje nagłówek Idempotency-Key", () => {
    const headers = idempotencyHeaders(formWith());
    expect(headers["Idempotency-Key"]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    const reused = idempotencyHeaders(formWith("stable-key-123"));
    expect(reused).toEqual({ "Idempotency-Key": "stable-key-123" });
  });
});
