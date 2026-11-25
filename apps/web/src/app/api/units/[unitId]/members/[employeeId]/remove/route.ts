import { isId } from "@/lib/ids";
import { formAction } from "@/server/form";

export const dynamic = "force-dynamic";

/** Usunięcie osoby z jednostki (formularz HTML nie wysyła DELETE, więc POST). */
export const POST = async (
  request: Request,
  { params }: { params: Promise<{ unitId: string; employeeId: string }> },
) => {
  const { unitId, employeeId } = await params;
  return formAction(isId(unitId) ? `/structure/${unitId}` : "/structure", async ({ core }) => {
    await core.deleteUnitMember({ path: { unitId, employeeId } });
    return { ok: "member-removed" };
  })(request);
};
