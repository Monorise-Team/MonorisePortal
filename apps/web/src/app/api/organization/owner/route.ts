import { InvalidForm, formAction, required } from "@/server/form";

export const dynamic = "force-dynamic";

/** Przekazanie roli właściciela innemu kontu firmy (Core sprawdza, że pyta właściciel). */
export const POST = formAction("/", async ({ core, form }) => {
  const accountId = required(form, "accountId");
  if (form.get("confirm") === null) throw new InvalidForm("confirm");
  await core.transferOrganizationOwner({ body: { accountId } });
  return { ok: "owner-transferred" };
});
