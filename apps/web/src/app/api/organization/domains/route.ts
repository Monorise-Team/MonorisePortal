import { idempotencyHeaders } from "@/lib/idempotency";
import { formAction, required } from "@/server/form";

export const dynamic = "force-dynamic";

/** Dodanie domeny e-mail firmy (Core: `core.organization.manage` albo właściciel). */
export const POST = formAction("/", async ({ core, form }) => {
  const domain = required(form, "domain");
  await core.addOrganizationDomain({
    body: { domain },
    headers: idempotencyHeaders(form),
  });
  return { ok: "domain-added" };
});
