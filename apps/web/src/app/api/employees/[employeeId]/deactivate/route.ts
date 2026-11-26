import { employeeAccountRoute } from "@/server/employees";

export const dynamic = "force-dynamic";

/** Wyłączenie konta logowania pracownika (Core: `core.employees.manage`). */
export const POST = employeeAccountRoute("account-deactivated", (core, input) => core.deactivateEmployee(input));
