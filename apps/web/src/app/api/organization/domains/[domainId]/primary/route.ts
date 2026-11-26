import { isId } from "@/lib/ids";
import { InvalidForm, formAction } from "@/server/form";

export const dynamic = "force-dynamic";

/** Ustawienie zweryfikowanej domeny jako głównej domeny firmy (Core: `core.organization.manage` albo właściciel). */
export const POST = async (request: Request, { params }: { params: Promise<{ domainId: string }> }) => {
  const { domainId } = await params;
  return formAction("/", async ({ core }) => {
    if (!isId(domainId)) throw new InvalidForm("domainId");
    await core.setPrimaryOrganizationDomain({ path: { domainId } });
    return { ok: "domain-primary-changed" };
  })(request);
};
