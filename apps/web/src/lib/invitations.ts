import type { Invitation } from "@monorise-team/sdk";
import type { BadgeTone } from "@monorise-team/ui";

export type InvitationDelivery = Invitation["delivery"];

export interface InvitationDeliveryView {
  label: string;
  tone: BadgeTone;
  /** Dodatkowy opis wysyłki obok daty ważności zaproszenia (np. czas wysłania przy `SENT`). */
  detail?: string;
  /** Krótka wskazówka dla osoby zarządzającej (np. przy `FAILED`). */
  hint?: string;
}

const dateTimeFormat = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

/** Formatuje datę i godzinę wysyłki zaproszenia w polskiej strefie czasowej (`Europe/Warsaw`). */
export function formatInvitationDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateTimeFormat.format(date);
}

/**
 * Mapuje stan kolejki wysyłki zaproszenia z Core (`Invitation["delivery"]`) na plakietkę
 * oraz opcjonalny czas wysłania lub wskazówkę. Dla `CANCELLED` i `null` (starsze zaproszenia
 * sprzed kolejki) zwraca `null`, żeby nie pokazywać plakietki.
 */
export function invitationDeliveryView(delivery: InvitationDelivery | null | undefined): InvitationDeliveryView | null {
  if (!delivery || delivery.status === null || delivery.status === "CANCELLED") {
    return null;
  }

  switch (delivery.status) {
    case "PENDING":
      if (delivery.attempts > 0) {
        return {
          label: `ponawiamy wysyłkę (próba ${delivery.attempts})`,
          tone: "warning",
        };
      }
      return {
        label: "w kolejce",
        tone: "neutral",
      };
    case "SENT":
      return {
        label: "wysłane",
        tone: "success",
        ...(delivery.sentAt ? { detail: `wysłane ${formatInvitationDateTime(delivery.sentAt)}` } : {}),
      };
    case "FAILED":
      return {
        label: "błąd wysyłki",
        tone: "danger",
        hint: "Sprawdź adres i kliknij „Wyślij ponownie”.",
      };
  }
}
