import { describe, expect, it, vi } from "vitest";
import { OK_MESSAGES } from "../src/lib/messages";
import {
  ACCOUNT_SECURITY_GROUP_ID,
  ACCOUNT_SECURITY_GROUP_LABEL,
  LOCKED_NOTIFICATION_NOTE,
  applyNotificationPreferenceUpdate,
  groupNotificationPreferences,
  isLockedNotificationPreference,
  notificationErrorMessage,
  notificationToggleSuccessMessage,
  parseEnabledFormValue,
  parseEnabledJsonBody,
  parseNotificationCategory,
  toggleNotificationPreference,
  type NotificationPreference,
} from "../src/lib/notifications";
import { productLabel } from "../src/lib/products";

const pref = (overrides: Partial<NotificationPreference> = {}): NotificationPreference => ({
  category: "timotime.reminders",
  channel: "notifications",
  description: "Przypomnienia o nieuzupełnionym czasie pracy.",
  enabled: true,
  name: "Przypomnienia",
  optional: true,
  product: "timotime",
  ...overrides,
});

describe("ustawienia powiadomień e-mail", () => {
  it("grupuje kategorie według produktu w kolejności alfabetycznej z grupą konta i bezpieczeństwa na końcu", () => {
    const input: NotificationPreference[] = [
      pref({
        category: "security",
        channel: "login",
        name: "Bezpieczeństwo logowania",
        description: "Alerty dotyczące logowania i hasła.",
        optional: false,
        product: null,
      }),
      pref({
        category: "timotime.reminders",
        name: "Przypomnienia o czasie pracy",
        product: "timotime",
      }),
      pref({
        category: "account",
        channel: "login",
        name: "Konto i zaproszenia",
        description: "Wiadomości dotyczące aktywacji i zmian konta.",
        optional: false,
        product: null,
      }),
      pref({
        category: "kivotasks.assignments",
        name: "Przypisania do zadań",
        description: "Powiadomienia o przypisanych zadaniach.",
        product: "kivotasks",
      }),
    ];

    const groups = groupNotificationPreferences(input);
    expect(groups.map((group) => ({ id: group.id, label: group.label }))).toEqual([
      { id: "kivotasks", label: "KivoTasks" },
      { id: "timotime", label: "TimoTime" },
      { id: ACCOUNT_SECURITY_GROUP_ID, label: ACCOUNT_SECURITY_GROUP_LABEL },
    ]);
    expect(groups[2]?.items.map((item) => item.category)).toEqual(["security", "account"]);
  });

  it("sortuje kategorie wewnątrz grupy: najpierw opcjonalne, potem obowiązkowe, alfabetycznie po nazwie", () => {
    const input: NotificationPreference[] = [
      pref({ category: "timotime.reminders", name: "Zatwierdzenia", optional: true, product: "timotime" }),
      pref({ category: "security", name: "Alerty obowiązkowe", optional: false, product: "timotime" }),
      pref({ category: "kivotasks.assignments", name: "Aktualizacje", optional: true, product: "timotime" }),
    ];

    const groups = groupNotificationPreferences(input);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items.map((item) => item.name)).toEqual(["Aktualizacje", "Zatwierdzenia", "Alerty obowiązkowe"]);
  });

  it("zwraca pustą listę grup dla pustych danych i zachowuje klucz dla nieznanego produktu", () => {
    expect(groupNotificationPreferences([])).toEqual([]);
    const groups = groupNotificationPreferences([pref({ product: "futureapp", name: "Nowości" })]);
    expect(groups[0]?.label).toBe("futureapp");
    expect(productLabel("kivotasks")).toBe("KivoTasks");
  });

  it("rozpoznaje kategorie obowiązkowe i udostępnia wymaganą polską notatkę", () => {
    expect(isLockedNotificationPreference({ optional: false, channel: "login" })).toBe(true);
    expect(isLockedNotificationPreference({ optional: false, channel: "notifications" })).toBe(true);
    expect(isLockedNotificationPreference({ optional: true, channel: "login" })).toBe(true);
    expect(isLockedNotificationPreference({ optional: true, channel: "notifications" })).toBe(false);
    expect(LOCKED_NOTIFICATION_NOTE).toBe("Tych wiadomości nie można wyłączyć, bo dotyczą logowania i bezpieczeństwa.");
  });

  it("waliduje klucz kategorii, wartości formularza i treść JSON", () => {
    expect(parseNotificationCategory("kivotasks.assignments")).toBe("kivotasks.assignments");
    expect(parseNotificationCategory("  security  ")).toBe("security");
    expect(parseNotificationCategory("../x")).toBeNull();
    expect(parseNotificationCategory("UPPER")).toBeNull();
    expect(parseNotificationCategory("")).toBeNull();

    expect(parseEnabledFormValue("true")).toBe(true);
    expect(parseEnabledFormValue("false")).toBe(false);
    expect(parseEnabledFormValue("1")).toBeNull();
    expect(parseEnabledFormValue(null)).toBeNull();

    expect(parseEnabledJsonBody({ enabled: true })).toBe(true);
    expect(parseEnabledJsonBody({ enabled: false })).toBe(false);
    expect(parseEnabledJsonBody({ enabled: "true" })).toBeNull();
    expect(parseEnabledJsonBody(null)).toBeNull();
    expect(parseEnabledJsonBody([])).toBeNull();
  });

  it("podmienia tylko zmienioną kategorię bez mutowania poprzedniej listy", () => {
    const initial = [
      pref({ category: "kivotasks.assignments", enabled: true, product: "kivotasks" }),
      pref({ category: "timotime.reminders", enabled: true, product: "timotime" }),
    ];
    const updated = pref({ category: "kivotasks.assignments", enabled: false, product: "kivotasks" });

    const next = applyNotificationPreferenceUpdate(initial, updated);
    expect(next[0]?.enabled).toBe(false);
    expect(next[1]?.enabled).toBe(true);
    expect(initial[0]?.enabled).toBe(true);
  });

  it("wysyła PUT przy przełączaniu, zwraca zaktualizowany stan przy 200 i obsługuje 422, 401 oraz awarię sieci", async () => {
    const updated = pref({ category: "kivotasks.assignments", name: "Przypisania do zadań", enabled: false });
    const okFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ data: updated, meta: { requestId: "req-1" }, error: null }, { status: 200 }),
      );

    const okOutcome = await toggleNotificationPreference("kivotasks.assignments", false, okFetch);
    expect(okFetch).toHaveBeenCalledWith("/api/notifications/kivotasks.assignments", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
    expect(okOutcome).toEqual({
      ok: true,
      preference: updated,
      message: "Wyłączono powiadomienia: Przypisania do zadań.",
    });

    const lockedMsg = "Tej kategorii powiadomień nie można wyłączyć.";
    const rejectedFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          { data: null, meta: { requestId: "req-2" }, error: { code: "VALIDATION_FAILED", message: lockedMsg } },
          { status: 422 },
        ),
      );
    const rejectedOutcome = await toggleNotificationPreference("security", false, rejectedFetch);
    expect(rejectedOutcome).toEqual({ ok: false, unauthenticated: false, message: lockedMsg });

    const unauthFetch = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, { status: 401 }));
    const unauthOutcome = await toggleNotificationPreference("timotime.reminders", false, unauthFetch);
    expect(unauthOutcome).toEqual({ ok: false, unauthenticated: true });

    const offlineFetch = vi.fn<typeof fetch>().mockRejectedValueOnce(new Error("Network down"));
    const offlineOutcome = await toggleNotificationPreference("timotime.reminders", false, offlineFetch);
    expect(offlineOutcome).toEqual({
      ok: false,
      unauthenticated: false,
      message: "Core jest chwilowo niedostępny. Spróbuj za chwilę.",
    });
  });

  it("formatuje komunikaty sukcesu i błędu w języku polskim", () => {
    expect(notificationToggleSuccessMessage("Przypomnienia", true)).toBe("Włączono powiadomienia: Przypomnienia.");
    expect(notificationToggleSuccessMessage("Przypomnienia", false)).toBe("Wyłączono powiadomienia: Przypomnienia.");
    expect(notificationErrorMessage("VALIDATION_FAILED")).toBe("Nie można zmienić tego ustawienia powiadomień.");
    expect(notificationErrorMessage("VALIDATION_FAILED", "Kategoria jest obowiązkowa.")).toBe(
      "Kategoria jest obowiązkowa.",
    );
    expect(OK_MESSAGES["notification-enabled"]).toBe("Powiadomienia zostały włączone.");
    expect(OK_MESSAGES["notification-disabled"]).toBe("Powiadomienia zostały wyłączone.");
  });
});
