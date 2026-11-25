import { formAction } from "@/server/form";

export const dynamic = "force-dynamic";

/** Ponowne wysłanie zaproszenia (nowy link na 7 dni, stary przestaje działać). */
export const POST = (request: Request, { params }: { params: Promise<{ invitationId: string }> }) =>
  formAction("/employees", async ({ core }) => {
    const { invitationId } = await params;
    await core.resendInvitation({ path: { invitationId } });
    return { ok: "resent" };
  })(request);
