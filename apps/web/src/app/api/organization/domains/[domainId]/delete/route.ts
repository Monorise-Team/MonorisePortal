import { isId } from "@/lib/ids";
import { InvalidForm, formAction } from "@/server/form";

export const dynamic = "force-dynamic";

/** Usunięcie niegłównej i nieużywanej domeny firmy (Core: `core.organization.manage` albo właściciel). */
export const POST = async (request: Request, { params }: { params: Promise<{ domainId: string }> }) => {
  const { domainId } = await params;
  return formAction("/", async ({ core }) => {
    if (!isId(domainId)) throw new InvalidForm("domainId");
    await core.deleteOrganizationDomain({ path: { domainId } });
    return { ok: "domain-deleted" };
  })(request);
};
