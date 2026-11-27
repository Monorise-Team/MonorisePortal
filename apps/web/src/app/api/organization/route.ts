import type { components } from "@monorise-team/sdk";
import { parseWorkScheduleForm } from "@/lib/work-schedule";
import { InvalidForm, formAction, required } from "@/server/form";

export const dynamic = "force-dynamic";

type UpdateOrganizationBody = components["schemas"]["UpdateOrganization"];

/**
 * Zmiana danych firmy: nazwy, strefy czasowej lub domyślnego wymiaru pracy
 * (Core: `core.organization.manage` w zakresie całej firmy albo właściciel).
 */
export const POST = formAction("/", async ({ core, form }) => {
  const body: UpdateOrganizationBody = {};

  if (form.has("name")) {
    body.name = required(form, "name");
  }

  if (form.has("timeZone")) {
    body.timeZone = required(form, "timeZone");
  }

  const parsedSchedule = parseWorkScheduleForm(form, "defaultWorkSchedule");
  if (parsedSchedule.present) {
    if (!parsedSchedule.ok) {
      throw new InvalidForm("defaultWorkSchedule", parsedSchedule.error);
    }
    body.defaultWorkSchedule = parsedSchedule.value;
  }

  if (body.name === undefined && body.timeZone === undefined && body.defaultWorkSchedule === undefined) {
    throw new InvalidForm("organization");
  }

  await core.updateOrganization({ body });
  return { ok: body.name !== undefined ? "organization-updated" : "organization-work-settings-updated" };
});
