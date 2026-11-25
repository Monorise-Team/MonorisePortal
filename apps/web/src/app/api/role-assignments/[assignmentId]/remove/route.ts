import { isId } from "@/lib/ids";
import { formAction } from "@/server/form";

export const dynamic = "force-dynamic";

/** Odebranie roli (formularz HTML nie wysyła DELETE, więc POST). */
export const POST = async (request: Request, { params }: { params: Promise<{ assignmentId: string }> }) => {
  const { assignmentId } = await params;
  const roleId = (await request.clone().formData()).get("roleId");
  const back = typeof roleId === "string" && isId(roleId) ? `/roles/${roleId}` : "/roles";
  return formAction(back, async ({ core }) => {
    await core.deleteRoleAssignment({ path: { assignmentId } });
    return { ok: "role-unassigned" };
  })(request);
};
