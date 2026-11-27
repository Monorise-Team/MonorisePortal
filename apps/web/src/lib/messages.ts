/** Komunikaty po akcji formularza (`?ok=…`). */
export const OK_MESSAGES: Record<string, string> = {
  invited: "Zaproszenie wysłane.",
  resent: "Zaproszenie wysłane ponownie.",
  revoked: "Zaproszenie cofnięte.",
  "employee-updated": "Dane pracownika zapisane.",
  "account-deactivated": "Konto wyłączone.",
  "account-reactivated": "Konto włączone.",
  "organization-updated": "Nazwa firmy zapisana.",
  "organization-work-settings-updated": "Ustawienia czasu pracy zapisane.",
  "domain-added": "Domena dodana. Dodaj rekord TXT w DNS i kliknij „Sprawdź DNS”.",
  "domain-verified": "Domena zweryfikowana.",
  "domain-primary-changed": "Domena główna zmieniona.",
  "domain-deleted": "Domena usunięta.",
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
  "notification-enabled": "Powiadomienia zostały włączone.",
  "notification-disabled": "Powiadomienia zostały wyłączone.",
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

const FIELD_LABELS: Record<string, string> = {
  name: "Nazwa firmy",
  timeZone: "Strefa czasowa",
  defaultWorkSchedule: "Domyślny wymiar pracy",
  workSchedule: "Wymiar pracy",
  firstName: "Imię",
  lastName: "Nazwisko",
  jobTitle: "Stanowisko",
  workEmail: "Służbowy e-mail",
  "1": "Poniedziałek",
  "2": "Wtorek",
  "3": "Środa",
  "4": "Czwartek",
  "5": "Piątek",
  "6": "Sobota",
  "7": "Niedziela",
};

function fieldLabel(fieldPath: string): string | undefined {
  if (FIELD_LABELS[fieldPath]) return FIELD_LABELS[fieldPath];
  const dayMatch = /^(?:defaultWorkSchedule|workSchedule)\.([1-7])$/.exec(fieldPath);
  if (dayMatch) return FIELD_LABELS[dayMatch[1]!];
  return undefined;
}

export interface CoreErrorLike {
  readonly message: string;
  readonly details?: readonly { readonly field?: string; readonly message: string }[];
}

/**
 * Buduje czytelny komunikat błędu z odpowiedzi Core. Gdy Core zwrócił szczegóły pól (np. przy 422),
 * pokazuje je z polskimi nazwami pól; w przeciwnym razie używa głównego komunikatu błędu.
 */
export function formatCoreErrorDetail(error: CoreErrorLike): string | undefined {
  const details = error.details ?? [];
  if (details.length > 0) {
    const formatted = details
      .map((detail) => {
        const text = detail.message.trim();
        if (!text) return "";
        const label = detail.field ? fieldLabel(detail.field) : undefined;
        return label ? `${label}: ${text}` : text;
      })
      .filter(Boolean)
      .join("; ");
    if (formatted) return formatted;
  }
  const message = error.message.trim();
  return message || undefined;
}
