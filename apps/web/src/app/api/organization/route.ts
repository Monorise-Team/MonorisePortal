import { formAction, required } from "@/server/form";

export const dynamic = "force-dynamic";

/** Zmiana nazwy firmy (Core: `core.organization.manage` w zakresie całej firmy albo właściciel). */
export const POST = formAction("/", async ({ core, form }) => {
  const name = required(form, "name");
  await core.updateOrganization({ body: { name } });
  return { ok: "organization-updated" };
});
