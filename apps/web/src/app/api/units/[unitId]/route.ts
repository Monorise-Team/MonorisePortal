import { isId } from "@/lib/ids";
import { formAction, required } from "@/server/form";

export const dynamic = "force-dynamic";

/** Zmiana nazwy jednostki. */
export const POST = async (request: Request, { params }: { params: Promise<{ unitId: string }> }) => {
  const { unitId } = await params;
  return formAction(isId(unitId) ? `/structure/${unitId}` : "/structure", async ({ core, form }) => {
    await core.updateUnit({ path: { unitId }, body: { name: required(form, "name") } });
    return { ok: "unit-updated" };
  })(request);
};
