import { isId } from "@/lib/ids";
import { selectedPermissions } from "@/lib/roles";
import { field, formAction, required } from "@/server/form";

export const dynamic = "force-dynamic";

/** Zmiana nazwy, opisu i uprawnień własnej roli (gotowych ról Core nie pozwoli zmienić). */
export const POST = async (request: Request, { params }: { params: Promise<{ roleId: string }> }) => {
  const { roleId } = await params;
  return formAction(isId(roleId) ? `/roles/${roleId}` : "/roles", async ({ core, form }) => {
    await core.updateRole({
      path: { roleId },
      body: {
        name: required(form, "name"),
        description: field(form, "description") ?? null,
        permissions: selectedPermissions(form),
      },
    });
    return { ok: "role-updated" };
  })(request);
};
