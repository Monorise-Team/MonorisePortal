import { isId } from "@/lib/ids";
import { formAction } from "@/server/form";

export const dynamic = "force-dynamic";

/** Archiwizacja jednostki; powrót do struktury. */
export const POST = async (request: Request, { params }: { params: Promise<{ unitId: string }> }) => {
  const { unitId } = await params;
  return formAction(isId(unitId) ? `/structure/${unitId}` : "/structure", async ({ core }) => {
    await core.updateUnit({ path: { unitId }, body: { status: "ARCHIVED" } });
    return { ok: "unit-archived", to: "/structure" };
  })(request);
};
