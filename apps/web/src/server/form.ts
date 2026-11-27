import "server-only";
import { AuthError } from "@monorise-team/auth";
import { CoreApiError, CoreApiUnavailableError, type CoreClient } from "@monorise-team/sdk";
import { formatCoreErrorDetail } from "@/lib/messages";
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

/** Ciasteczko z powodem odmowy podanym przez Core; strona pokazuje go razem z `?error=` (30 s). */
export const ERROR_DETAIL_COOKIE = "portal-error-detail";

const back = (path: string, params: Record<string, string>, detail?: string) => {
  const url = new URL(path, config.appUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const headers = new Headers({ Location: url.toString(), "Cache-Control": "no-store" });
  // Zawsze nadpisujemy powód: nowy z Core albo pusty, żeby nie został stary z poprzedniej akcji
  const secure = url.protocol === "https:" ? "; Secure" : "";
  const value = detail ? encodeURIComponent(detail.slice(0, 300)) : "";
  headers.append(
    "Set-Cookie",
    `${ERROR_DETAIL_COOKIE}=${value}; Path=/; Max-Age=${detail ? 30 : 0}; HttpOnly; SameSite=Lax${secure}`,
  );
  return new Response(null, { status: 303, headers });
};

/** Brak albo błędne pole formularza (bez pytania Core): powrót z `?error=VALIDATION_FAILED`. */
export class InvalidForm extends Error {
  readonly detail: string | undefined;

  constructor(field: string, detail?: string) {
    super(`Pole ${field} jest wymagane albo ma błędną wartość`);
    this.name = "InvalidForm";
    this.detail = detail;
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
          if (error instanceof InvalidForm) return back(path, { error: "VALIDATION_FAILED" }, error.detail);
          if (error instanceof CoreApiError) {
            if (error.code === "UNAUTHENTICATED") return back("/api/auth/sign-in", { returnTo: path });
            // Powód z Core jest już zwykłym zdaniem po polsku (np. „…wyłącznie aktywnemu kontu”)
            return back(path, { error: error.code }, formatCoreErrorDetail(error));
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
