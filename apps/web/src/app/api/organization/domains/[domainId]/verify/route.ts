import { idempotencyHeaders } from "@/lib/idempotency";
import { isId } from "@/lib/ids";
import { InvalidForm, field, formAction } from "@/server/form";

export const dynamic = "force-dynamic";

/**
 * Weryfikacja domeny firmy rekordem DNS TXT lub (lokalnie, za zgodą Core) przez `trustLocally=1`.
 * Core wymaga `core.organization.manage` albo roli właściciela.
 */
export const POST = async (request: Request, { params }: { params: Promise<{ domainId: string }> }) => {
  const { domainId } = await params;
  return formAction("/", async ({ core, form }) => {
    if (!isId(domainId)) throw new InvalidForm("domainId");
    const trustLocally = field(form, "trustLocally") === "1";
    await core.verifyOrganizationDomain({
      path: { domainId },
      body: trustLocally ? { trustLocally: true } : {},
      headers: idempotencyHeaders(form),
    });
    return { ok: "domain-verified" };
  })(request);
};
