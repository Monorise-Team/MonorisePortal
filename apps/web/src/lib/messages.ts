/** Komunikaty po akcji formularza (`?ok=…`). */
export const OK_MESSAGES: Record<string, string> = {
  invited: "Zaproszenie wysłane.",
  resent: "Zaproszenie wysłane ponownie.",
  revoked: "Zaproszenie cofnięte.",
  "owner-transferred": "Właściciel firmy zmieniony.",
  "unit-created": "Jednostka dodana.",
  "unit-updated": "Nazwa zmieniona.",
  "unit-archived": "Jednostka zarchiwizowana.",
  "member-saved": "Członkostwo zapisane.",
  "member-removed": "Osoba usunięta z jednostki.",
  "access-granted": "Dostęp nadany.",
  "access-revoked": "Dostęp odebrany.",
  "role-created": "Rola utworzona. Możesz teraz zmienić jej uprawnienia.",
  "role-updated": "Rola zapisana.",
  "role-archived": "Rola zarchiwizowana.",
  "role-assigned": "Rola przypisana.",
  "role-unassigned": "Rola odebrana.",
};

/** Komunikaty błędów (`?error=<kod Core albo Portalu>`). */
export const ERROR_MESSAGES: Record<string, string> = {
  PERMISSION_DENIED: "Nie masz uprawnienia do tej zmiany.",
  NOT_FOUND: "Nie znaleziono tego elementu. Odśwież stronę.",
  VALIDATION_FAILED: "Sprawdź dane w formularzu.",
  CONFLICT: "Tego nie da się teraz zrobić w obecnym stanie. Odśwież stronę i spróbuj jeszcze raz.",
  EMAIL_DOMAIN_NOT_ALLOWED: "Adres musi być w zweryfikowanej domenie firmy.",
  ORGANIZATION_NOT_ACTIVE: "Firma jest wstrzymana.",
  ACCOUNT_DEACTIVATED: "To konto jest dezaktywowane.",
  RATE_LIMITED: "Za dużo prób. Spróbuj za chwilę.",
  UNAVAILABLE: "Core jest chwilowo niedostępny. Spróbuj za chwilę.",
  INTERNAL: "Coś poszło nie tak po naszej stronie. Spróbuj jeszcze raz.",
};

/** Komunikaty, gdy Core nie pozwolił wczytać fragmentu strony. */
export const LOAD_MESSAGES: Record<string, string> = {
  ...ERROR_MESSAGES,
  PERMISSION_DENIED: "Nie masz uprawnienia, żeby to zobaczyć.",
  NOT_FOUND: "Nie znaleziono danych.",
};

export const messageFor = (map: Record<string, string>, key: string | undefined) =>
  key ? (map[key] ?? map.INTERNAL ?? key) : undefined;
