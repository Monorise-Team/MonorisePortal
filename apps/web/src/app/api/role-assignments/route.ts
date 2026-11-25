import { isId } from "@/lib/ids";
import { parseScope } from "@/lib/roles";
import { InvalidForm, formAction, required } from "@/server/form";

export const dynamic = "force-dynamic";

/** Przypisanie roli osobie w całej firmie albo w jednostce (Core sprawdza, czy pytający może ją nadać). */
export const POST = async (request: Request) => {
  const roleId = (await request.clone().formData()).get("roleId");
  const back = typeof roleId === "string" && isId(roleId) ? `/roles/${roleId}` : "/roles";
  return formAction(back, async ({ core, form }) => {
    const scope = parseScope(required(form, "scope"));
    if (!scope) throw new InvalidForm("scope");
    await core.createRoleAssignment({
      body: { accountId: required(form, "accountId"), roleId: required(form, "roleId"), ...scope },
    });
    return { ok: "role-assigned" };
  })(request);
};
