import { employeeAccountRoute } from "@/server/employees";

export const dynamic = "force-dynamic";

/** Ponowne włączenie konta logowania pracownika (Core: `core.employees.manage`). */
export const POST = employeeAccountRoute("account-reactivated", (core, input) => core.reactivateEmployee(input));
