import "server-only";
import type { CoreClient } from "@monorise-team/sdk";
import { idempotencyHeaders } from "@/lib/idempotency";
import { isId } from "@/lib/ids";
import { InvalidForm, formAction } from "./form";

type AccountOperation = (
  core: CoreClient,
  input: { path: { employeeId: string }; headers: { readonly "Idempotency-Key": string } },
) => Promise<unknown>;

/** Akcja wyłączenia albo ponownego włączenia konta pracownika z kontrolą UUID i nagłówkiem `Idempotency-Key`. */
export function employeeAccountRoute(ok: string, operation: AccountOperation) {
  return async (request: Request, { params }: { params: Promise<{ employeeId: string }> }) => {
    const { employeeId } = await params;
    return formAction("/employees", async ({ core, form }) => {
      if (!isId(employeeId)) throw new InvalidForm("employeeId");
      await operation(core, { path: { employeeId }, headers: idempotencyHeaders(form) });
      return { ok };
    })(request);
  };
}
