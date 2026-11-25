import { isId } from "@/lib/ids";
import { InvalidForm, formAction, required } from "@/server/form";

export const dynamic = "force-dynamic";

/** Dodanie osoby do jednostki albo zmiana jej roli (kierownik, członek). */
export const POST = async (request: Request, { params }: { params: Promise<{ unitId: string }> }) => {
  const { unitId } = await params;
  return formAction(isId(unitId) ? `/structure/${unitId}` : "/structure", async ({ core, form }) => {
    const role = required(form, "role");
    if (role !== "MEMBER" && role !== "LEADER") throw new InvalidForm("role");
    await core.putUnitMember({ path: { unitId, employeeId: required(form, "employeeId") }, body: { role } });
    return { ok: "member-saved" };
  })(request);
};
