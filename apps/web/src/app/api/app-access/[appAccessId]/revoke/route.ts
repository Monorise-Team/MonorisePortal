import { formAction } from "@/server/form";

export const dynamic = "force-dynamic";

/** Odebranie dostępu do aplikacji (formularz HTML nie wysyła DELETE, więc POST). */
export const POST = async (request: Request, { params }: { params: Promise<{ appAccessId: string }> }) => {
  const { appAccessId } = await params;
  return formAction("/apps", async ({ core }) => {
    await core.revokeAppAccess({ path: { appAccessId } });
    return { ok: "access-revoked" };
  })(request);
};
