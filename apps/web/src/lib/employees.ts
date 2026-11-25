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
