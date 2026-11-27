import type { components } from "@monorise-team/sdk";
import { ERROR_MESSAGES, messageFor } from "./messages";
import { productLabel } from "./products";

export type NotificationPreference = components["schemas"]["NotificationPreference"];
export type NotificationCategoryKey = components["schemas"]["NotificationCategoryKey"];

export interface NotificationPreferenceGroup {
  id: string;
  label: string;
  product: string | null;
  items: NotificationPreference[];
}

export interface NotificationToggleFeedback {
  tone: "success" | "danger";
  message: string;
}

export const ACCOUNT_SECURITY_GROUP_ID = "account-security";
export const ACCOUNT_SECURITY_GROUP_LABEL = "Konto i bezpieczeństwo";
export const LOCKED_NOTIFICATION_NOTE = "Tych wiadomości nie można wyłączyć, bo dotyczą logowania i bezpieczeństwa.";

const CATEGORY_KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

/** Sprawdza, czy kategorii powiadomień nie można wyłączyć (np. logowanie i bezpieczeństwo). */
export function isLockedNotificationPreference(
  preference: Pick<NotificationPreference, "optional" | "channel">,
): boolean {
  return !preference.optional || preference.channel === "login";
}

/**
 * Grupuje kategorie powiadomień według produktu (albo „Konto i bezpieczeństwo” dla kategorii platformowych).
 * Produkty ustawia alfabetycznie po polskiej nazwie, a grupę konta i bezpieczeństwa na końcu.
 * Wewnątrz grupy najpierw trafiają kategorie opcjonalne, potem obowiązkowe, posortowane po nazwie.
 */
export function groupNotificationPreferences(
  preferences: readonly NotificationPreference[],
): NotificationPreferenceGroup[] {
  const groups = new Map<string, NotificationPreferenceGroup>();

  for (const preference of preferences) {
    const product = preference.product;
    const id = product === null ? ACCOUNT_SECURITY_GROUP_ID : product;
    const label = product === null ? ACCOUNT_SECURITY_GROUP_LABEL : productLabel(product);
    const existing = groups.get(id);
    if (existing) {
      existing.items.push(preference);
    } else {
      groups.set(id, { id, label, product, items: [preference] });
    }
  }

  for (const group of groups.values()) {
    group.items.sort((a, b) => {
      const lockDiff = Number(isLockedNotificationPreference(a)) - Number(isLockedNotificationPreference(b));
      if (lockDiff !== 0) return lockDiff;
      const nameDiff = a.name.localeCompare(b.name, "pl");
      if (nameDiff !== 0) return nameDiff;
      return a.category.localeCompare(b.category);
    });
  }

  return [...groups.values()].sort((a, b) => {
    if (a.product === null && b.product !== null) return 1;
    if (a.product !== null && b.product === null) return -1;
    const labelDiff = a.label.localeCompare(b.label, "pl");
    if (labelDiff !== 0) return labelDiff;
    return a.id.localeCompare(b.id);
  });
}

/** Zwraca bezpieczny klucz kategorii powiadomień ze ścieżki albo `null`, gdy wartość jest nieprawidłowa. */
export function parseNotificationCategory(value: unknown): NotificationCategoryKey | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!CATEGORY_KEY_PATTERN.test(trimmed)) return null;
  return trimmed as NotificationCategoryKey;
}

/** Odczytuje pole `enabled` z formularza HTML (`"true"` albo `"false"`). */
export function parseEnabledFormValue(value: FormDataEntryValue | null): boolean | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return null;
}

/** Odczytuje flagę `enabled` z ciała JSON żądania `PUT`. */
export function parseEnabledJsonBody(value: unknown): boolean | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const enabled = (value as Record<string, unknown>).enabled;
  return typeof enabled === "boolean" ? enabled : null;
}

/** Podmienia zaktualizowaną kategorię na liście ustawień bez mutowania poprzedniego stanu. */
export function applyNotificationPreferenceUpdate(
  preferences: readonly NotificationPreference[],
  updated: NotificationPreference,
): NotificationPreference[] {
  return preferences.map((item) => (item.category === updated.category ? updated : item));
}

/** Komunikat potwierdzający zmianę ustawienia konkretnej kategorii powiadomień. */
export function notificationToggleSuccessMessage(name: string, enabled: boolean): string {
  return enabled ? `Włączono powiadomienia: ${name}.` : `Wyłączono powiadomienia: ${name}.`;
}

/** Czytelny polski komunikat błędu dla zmiany ustawień powiadomień. */
export function notificationErrorMessage(code: string | undefined, detail?: string | null): string {
  const cleaned = detail?.trim();
  if (cleaned) return cleaned;
  if (code === "VALIDATION_FAILED") return "Nie można zmienić tego ustawienia powiadomień.";
  return messageFor(ERROR_MESSAGES, code) ?? ERROR_MESSAGES.INTERNAL ?? "Coś poszło nie tak po naszej stronie.";
}

interface NotificationUpdateEnvelope {
  data?: NotificationPreference | null;
  error?: { code?: string; message?: string } | null;
}

export type NotificationToggleOutcome =
  | { ok: true; preference: NotificationPreference; message: string }
  | { ok: false; unauthenticated: true }
  | { ok: false; unauthenticated: false; message: string };

/** Wysyła żądanie `PUT` do BFF Portalu i zwraca nowy stan kategorii albo komunikat błędu. */
export async function toggleNotificationPreference(
  category: NotificationCategoryKey,
  enabled: boolean,
  fetchFn: typeof fetch = fetch,
): Promise<NotificationToggleOutcome> {
  try {
    const response = await fetchFn(`/api/notifications/${encodeURIComponent(category)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (response.status === 401) {
      return { ok: false, unauthenticated: true };
    }
    const payload = (await response.json().catch(() => null)) as NotificationUpdateEnvelope | null;
    if (!response.ok || !payload || payload.error || !payload.data) {
      return {
        ok: false,
        unauthenticated: false,
        message: notificationErrorMessage(payload?.error?.code, payload?.error?.message),
      };
    }
    return {
      ok: true,
      preference: payload.data,
      message: notificationToggleSuccessMessage(payload.data.name, payload.data.enabled),
    };
  } catch {
    return {
      ok: false,
      unauthenticated: false,
      message: notificationErrorMessage("UNAVAILABLE"),
    };
  }
}
