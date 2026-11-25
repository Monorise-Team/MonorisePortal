import { Button, Card } from "@monorise-team/ui";

interface Props {
  searchParams: Promise<{ auth_error?: string }>;
}

const REASONS: Record<string, string> = {
  expired: "Logowanie trwało zbyt długo. Spróbuj jeszcze raz.",
  denied: "Logowanie zostało anulowane.",
  unavailable: "Logowanie Monorise jest chwilowo niedostępne.",
};

/** Po wylogowaniu albo nieudanym logowaniu: krótka informacja i ponowne zalogowanie. */
export default async function SignedOutPage({ searchParams }: Props) {
  const { auth_error: reason } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <Card className="flex w-full flex-col gap-4 p-6">
        <h1 className="text-lg font-semibold text-text-primary">Panel firmy Monorise</h1>
        <p className="text-sm text-text-secondary">
          {reason ? (REASONS[reason] ?? "Nie udało się zalogować. Spróbuj jeszcze raz.") : "Wylogowano."}
        </p>
        <Button asChild variant="primary" className="self-start">
          <a href="/api/auth/sign-in">Zaloguj się kontem Monorise</a>
        </Button>
      </Card>
    </main>
  );
}
