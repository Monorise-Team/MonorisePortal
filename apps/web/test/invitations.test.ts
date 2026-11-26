import { describe, expect, it } from "vitest";
import { formatInvitationDateTime, invitationDeliveryView, type InvitationDelivery } from "../src/lib/invitations";

const delivery = (overrides: Partial<InvitationDelivery>): InvitationDelivery => ({
  status: null,
  attempts: 0,
  lastAttemptAt: null,
  sentAt: null,
  ...overrides,
});

describe("stan wysyłki zaproszeń", () => {
  it("pokazuje status w kolejce dla PENDING bez prób wysyłki", () => {
    expect(invitationDeliveryView(delivery({ status: "PENDING", attempts: 0 }))).toEqual({
      label: "w kolejce",
      tone: "neutral",
    });
  });

  it("pokazuje ostrzeżenie z numerem próby dla PENDING po nieudanych próbach", () => {
    expect(
      invitationDeliveryView(delivery({ status: "PENDING", attempts: 1, lastAttemptAt: "2026-11-26T16:00:00.000Z" })),
    ).toEqual({
      label: "ponawiamy wysyłkę (próba 1)",
      tone: "warning",
    });

    expect(
      invitationDeliveryView(delivery({ status: "PENDING", attempts: 5, lastAttemptAt: "2026-11-26T16:30:00.000Z" })),
    ).toEqual({
      label: "ponawiamy wysyłkę (próba 5)",
      tone: "warning",
    });
  });

  it("pokazuje sukces i czas wysłania w strefie Europe/Warsaw dla SENT", () => {
    expect(
      invitationDeliveryView(
        delivery({
          status: "SENT",
          attempts: 1,
          lastAttemptAt: "2026-11-26T16:03:00.000Z",
          sentAt: "2026-11-26T16:03:00.000Z",
        }),
      ),
    ).toEqual({
      label: "wysłane",
      tone: "success",
      detail: "wysłane 26 lis 2026, 17:03",
    });
  });

  it("pomija opis godziny dla SENT, gdy brakuje sentAt", () => {
    expect(invitationDeliveryView(delivery({ status: "SENT", attempts: 1, sentAt: null }))).toEqual({
      label: "wysłane",
      tone: "success",
    });
  });

  it("pokazuje błąd wysyłki i wskazówkę dla FAILED", () => {
    expect(
      invitationDeliveryView(delivery({ status: "FAILED", attempts: 8, lastAttemptAt: "2026-11-26T16:45:00.000Z" })),
    ).toEqual({
      label: "błąd wysyłki",
      tone: "danger",
      hint: "Sprawdź adres i kliknij „Wyślij ponownie”.",
    });
  });

  it("nie pokazuje plakietki dla CANCELLED ani null", () => {
    expect(invitationDeliveryView(delivery({ status: "CANCELLED", attempts: 2 }))).toBeNull();
    expect(invitationDeliveryView(delivery({ status: null, attempts: 0 }))).toBeNull();
    expect(invitationDeliveryView(null)).toBeNull();
    expect(invitationDeliveryView(undefined)).toBeNull();
  });

  it("formatuje datę w strefie Europe/Warsaw i zwraca wejście przy błędnej dacie", () => {
    expect(formatInvitationDateTime("2026-11-26T16:03:00.000Z")).toBe("26 lis 2026, 17:03");
    expect(formatInvitationDateTime("nie-data")).toBe("nie-data");
  });
});
