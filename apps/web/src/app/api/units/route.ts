import type { Unit } from "@monorise-team/sdk";
import { idempotencyHeaders } from "@/lib/idempotency";
import { UNIT_TYPE_LABELS } from "@/lib/units";
import { InvalidForm, field, formAction, required } from "@/server/form";

export const dynamic = "force-dynamic";

const isUnitType = (value: string): value is Unit["type"] => value in UNIT_TYPE_LABELS;

/** Nowa jednostka (Core: `core.structure.manage`). */
export const POST = formAction("/structure", async ({ core, form }) => {
  const type = required(form, "type");
  if (!isUnitType(type)) throw new InvalidForm("type");
  await core.createUnit({
    body: { name: required(form, "name"), type, parentId: field(form, "parentId") ?? null },
    headers: idempotencyHeaders(form),
  });
  return { ok: "unit-created" };
});
