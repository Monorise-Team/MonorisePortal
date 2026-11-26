import type { components } from "@monorise-team/sdk";
import { isId } from "@/lib/ids";
import { InvalidForm, field, formAction, required } from "@/server/form";

export const dynamic = "force-dynamic";

type UpdateEmployeeBody = components["schemas"]["UpdateEmployee"];

/** Zmiana danych pracownika (Core: `core.employees.manage`). */
export const POST = async (request: Request, { params }: { params: Promise<{ employeeId: string }> }) => {
  const { employeeId } = await params;
  return formAction("/employees", async ({ core, form }) => {
    if (!isId(employeeId)) throw new InvalidForm("employeeId");
    const body: UpdateEmployeeBody = {
      firstName: required(form, "firstName"),
      lastName: required(form, "lastName"),
      jobTitle: field(form, "jobTitle") ?? null,
      ...(form.has("workEmail") ? { workEmail: field(form, "workEmail") ?? null } : {}),
    };
    await core.updateEmployee({ path: { employeeId }, body });
    return { ok: "employee-updated" };
  })(request);
};
