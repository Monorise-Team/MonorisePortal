import type { Employee } from "@monorise-team/sdk";

/**
 * Osoba, której można nadać rolę, dostęp albo przekazać firmę: pracuje i ma aktywne konto
 * (nie zaproszone, nie dezaktywowane). Core i tak to sprawdza; tu chodzi o to, żeby nie pokazywać
 * wyborów, które skończą się odmową.
 */
export const hasActiveAccount = (employee: Employee): employee is Employee & { accountId: string } =>
  employee.status === "ACTIVE" && employee.accountStatus === "ACTIVE" && employee.accountId !== null;

/** Imię i nazwisko po identyfikatorze konta (także zaproszonych i dezaktywowanych) do opisu istniejących wpisów. */
export const namesByAccount = (employees: readonly Employee[]): Map<string, string> =>
  new Map(
    employees
      .filter((employee) => employee.accountId)
      .map((employee) => [employee.accountId!, `${employee.firstName} ${employee.lastName}`]),
  );

export type EmployeeAccountAction = "deactivate" | "reactivate";

export interface CurrentAccountIdentity {
  accountId: string;
  employeeId?: string;
}

/**
 * Akcja zmiany dostępności konta pracownika na liście (`/employees`): wyłączenie dla `ACTIVE`,
 * włączenie dla `DEACTIVATED`. Ukryte dla osób bez konta, kont zaproszonych, pracowników
 * zanonimizowanych oraz dla zalogowanej osoby (gdy jest właścicielem, dotyczy też roli właściciela;
 * dla pozostałych osób z `core.employees.manage` ochronę konta właściciela wymusza Core kodem `409 CONFLICT`).
 */
export function employeeAccountAction(
  employee: Employee,
  current: CurrentAccountIdentity | null,
): EmployeeAccountAction | null {
  if (!current || employee.accountId === null || employee.status === "ANONYMIZED") return null;
  if (employee.accountId === current.accountId || employee.id === current.employeeId) return null;
  if (employee.accountStatus === "ACTIVE") return "deactivate";
  if (employee.accountStatus === "DEACTIVATED") return "reactivate";
  return null;
}
