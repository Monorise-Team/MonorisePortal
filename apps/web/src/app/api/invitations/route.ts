import { idempotencyHeaders } from "@/lib/idempotency";
import { field, formAction, required } from "@/server/form";

export const dynamic = "force-dynamic";

/**
 * Zaproszenie (Core: `core.employees.manage`, adres w zweryfikowanej domenie firmy): nowa osoba z imieniem
 * i nazwiskiem albo istniejący pracownik bez konta (`employeeId`).
 */
export const POST = formAction("/employees", async ({ core, form }) => {
  const email = required(form, "email");
  const employeeId = field(form, "employeeId");
  await core.createInvitation({
    body: employeeId
      ? { email, employeeId }
      : { email, firstName: required(form, "firstName"), lastName: required(form, "lastName") },
    headers: idempotencyHeaders(form),
  });
  return { ok: "invited" };
});
