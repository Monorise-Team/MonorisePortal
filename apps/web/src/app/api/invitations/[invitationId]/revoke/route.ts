import { formAction } from "@/server/form";

export const dynamic = "force-dynamic";

/** Cofnięcie zaproszenia (formularz HTML nie wysyła DELETE, więc POST). */
export const POST = (request: Request, { params }: { params: Promise<{ invitationId: string }> }) =>
  formAction("/employees", async ({ core }) => {
    const { invitationId } = await params;
    await core.revokeInvitation({ path: { invitationId } });
    return { ok: "revoked" };
  })(request);
