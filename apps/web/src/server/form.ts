import "server-only";
import { AuthError } from "@monorise-team/auth";
import { CoreApiError, CoreApiUnavailableError, type CoreClient } from "@monorise-team/sdk";
import { getAuth } from "./auth";
import { config } from "./config";
import { coreFor } from "./core";

export interface FormContext {
  core: CoreClient;
  form: FormData;
}

/** Wynik akcji: klucz komunikatu (`OK_MESSAGES`) i opcjonalnie inna strona powrotu. */
export interface FormResult {
  ok: string;
  to?: string;
}

const back = (path: string, params: Record<string, string>) => {
  const url = new URL(path, config.appUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return Response.redirect(url, 303);
};

/** Brak albo błędne pole formularza (bez pytania Core): powrót z `?error=VALIDATION_FAILED`. */
export class InvalidForm extends Error {
  constructor(field: string) {
    super(`Pole ${field} jest wymagane albo ma błędną wartość`);
    this.name = "InvalidForm";
  }
}

/** Wymagany tekst z pola formularza. */
export const required = (form: FormData, name: string): string => {
  const value = field(form, name);
  if (!value) throw new InvalidForm(name);
  return value;
};

/** Tekst z pola formularza (przycięty) albo `undefined`, gdy pusty. */
export const field = (form: FormData, name: string): string | undefined => {
  const value = form.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

/**
 * Formularz HTML wysłany metodą POST z Portalu: logowanie i CSRF sprawdza `withAuth`, zmianę robi Core
 * (on sprawdza uprawnienia), a odpowiedź wraca na stronę z `?ok=` albo `?error=` (303, bez JavaScriptu).
 * Odświeżone ciasteczko sesji trafia do odpowiedzi także przy błędzie.
 */
export function formAction(path: string, action: (context: FormContext) => Promise<FormResult>) {
  return (request: Request) =>
    getAuth().withAuth(
      request,
      async (auth) => {
        if (auth.via !== "session") throw new AuthError("UNAUTHENTICATED", "Formularz wymaga sesji Portalu");
        try {
          const result = await action({ core: coreFor(auth.session), form: await request.formData() });
          return back(result.to ?? path, { ok: result.ok });
        } catch (error) {
          if (error instanceof InvalidForm) return back(path, { error: "VALIDATION_FAILED" });
          if (error instanceof CoreApiError) {
            if (error.code === "UNAUTHENTICATED") return back("/api/auth/sign-in", { returnTo: path });
            return back(path, { error: error.code });
          }
          if (error instanceof CoreApiUnavailableError) return back(path, { error: "UNAVAILABLE" });
          throw error;
        }
      },
      {
        // Wygasła sesja przy wysyłaniu formularza: zalogowanie i powrót na stronę zamiast odpowiedzi JSON
        onError: (error) => {
          if (error instanceof AuthError && error.code === "UNAUTHENTICATED") {
            return back("/api/auth/sign-in", { returnTo: path });
          }
          if (error instanceof AuthError) return new Response("Żądanie spoza Portalu", { status: error.statusCode });
          return back(path, { error: "UNAVAILABLE" });
        },
      },
    );
}
