import { isId } from "@/lib/ids";
import { formAction } from "@/server/form";

export const dynamic = "force-dynamic";

/** Archiwizacja własnej roli: przestaje dawać uprawnienia, zostaje w historii. */
export const POST = async (request: Request, { params }: { params: Promise<{ roleId: string }> }) => {
  const { roleId } = await params;
  return formAction(isId(roleId) ? `/roles/${roleId}` : "/roles", async ({ core }) => {
    await core.archiveRole({ path: { roleId } });
    return { ok: "role-archived", to: "/roles" };
  })(request);
};
