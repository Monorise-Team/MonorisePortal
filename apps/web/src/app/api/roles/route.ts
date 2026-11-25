import { formAction, required } from "@/server/form";

export const dynamic = "force-dynamic";

/** Nowa rola jako kopia istniejącej (Core: `core.roles.manage`); powrót na stronę nowej roli. */
export const POST = formAction("/roles", async ({ core, form }) => {
  const role = await core.createRole({
    body: { copyFromRoleId: required(form, "copyFromRoleId"), name: required(form, "name") },
  });
  return { ok: "role-created", to: `/roles/${role.id}` };
});
