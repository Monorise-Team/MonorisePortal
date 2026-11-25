import { formAction, required } from "@/server/form";

export const dynamic = "force-dynamic";

/** Nadanie osobie dostępu do aplikacji firmy (Core: `core.app_access.manage`). */
export const POST = formAction("/apps", async ({ core, form }) => {
  await core.grantAppAccess({ body: { accountId: required(form, "accountId"), product: required(form, "product") } });
  return { ok: "access-granted" };
});
