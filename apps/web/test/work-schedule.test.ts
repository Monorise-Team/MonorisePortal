import { describe, expect, it } from "vitest";
import { formatCoreErrorDetail } from "../src/lib/messages";
import {
  COMMON_TIME_ZONES,
  EMPTY_SCHEDULE,
  FULL_TIME_SCHEDULE,
  HALF_TIME_SCHEDULE,
  areWorkSchedulesEqual,
  detectWorkSchedulePreset,
  formatFte,
  formatMinutesAsHours,
  formatMinutesAsHoursInput,
  formatScheduleSummary,
  formatWeeklySummary,
  getTimeZoneOptions,
  normalizeWorkSchedule,
  parseHoursInput,
  parseWorkScheduleForm,
  scheduleToInputs,
  serializeWorkScheduleKey,
  totalWeeklyMinutes,
  workScheduleForPreset,
} from "../src/lib/work-schedule";

describe("wymiar pracy i strefa czasowa", () => {
  it("parsuje i formatuje godziny dziesiętne w zakresie 0–24 h", () => {
    expect(parseHoursInput("")).toEqual({ ok: true, minutes: 0 });
    expect(parseHoursInput("   ")).toEqual({ ok: true, minutes: 0 });
    expect(parseHoursInput("0")).toEqual({ ok: true, minutes: 0 });
    expect(parseHoursInput("0,0")).toEqual({ ok: true, minutes: 0 });
    expect(parseHoursInput("8")).toEqual({ ok: true, minutes: 480 });
    expect(parseHoursInput("7,5")).toEqual({ ok: true, minutes: 450 });
    expect(parseHoursInput("7.5")).toEqual({ ok: true, minutes: 450 });
    expect(parseHoursInput("4,25")).toEqual({ ok: true, minutes: 255 });
    expect(parseHoursInput("24")).toEqual({ ok: true, minutes: 1440 });

    expect(parseHoursInput("-1").ok).toBe(false);
    expect(parseHoursInput("24,5").ok).toBe(false);
    expect(parseHoursInput("25").ok).toBe(false);
    expect(parseHoursInput("abc").ok).toBe(false);
    expect(parseHoursInput("8:30").ok).toBe(false);

    expect(formatMinutesAsHoursInput(undefined)).toBe("");
    expect(formatMinutesAsHoursInput(0)).toBe("");
    expect(formatMinutesAsHoursInput(480)).toBe("8");
    expect(formatMinutesAsHoursInput(450)).toBe("7,5");
    expect(formatMinutesAsHoursInput(465)).toBe("7,75");
    expect(formatMinutesAsHours(2400)).toBe("40 h");
    expect(formatMinutesAsHours(720)).toBe("12 h");
    expect(formatMinutesAsHours(450)).toBe("7,5 h");
  });

  it("zachowuje dokładną liczbę minut po zamianie na tekst i z powrotem dla każdego dnia 0..1440", () => {
    for (let minutes = 0; minutes <= 1440; minutes++) {
      const formatted = formatMinutesAsHoursInput(minutes);
      const parsed = parseHoursInput(formatted);
      expect(parsed).toEqual({ ok: true, minutes });
    }
  });

  it("obsługuje gotowe ustawienia i odróżnia wszystkie dni wolne od null", () => {
    expect(workScheduleForPreset("null")).toBeNull();
    expect(workScheduleForPreset("full-time")).toEqual(FULL_TIME_SCHEDULE);
    expect(workScheduleForPreset("half-time")).toEqual(HALF_TIME_SCHEDULE);
    expect(workScheduleForPreset("clear")).toEqual(EMPTY_SCHEDULE);

    expect(detectWorkSchedulePreset("null", EMPTY_SCHEDULE)).toBe("null");
    expect(detectWorkSchedulePreset("custom", FULL_TIME_SCHEDULE)).toBe("full-time");
    expect(detectWorkSchedulePreset("custom", HALF_TIME_SCHEDULE)).toBe("half-time");
    expect(detectWorkSchedulePreset("custom", EMPTY_SCHEDULE)).toBe("clear");
    expect(detectWorkSchedulePreset("custom", { 1: 480, 2: 240 })).toBeNull();
    expect(detectWorkSchedulePreset("custom", FULL_TIME_SCHEDULE, true)).toBeNull();

    expect(normalizeWorkSchedule({ 1: 480, 2: 0, 6: undefined })).toEqual({ 1: 480 });
    expect(areWorkSchedulesEqual({ 1: 480, 2: 0 }, { 1: 480 })).toBe(true);
    expect(scheduleToInputs(null)).toEqual({ "1": "", "2": "", "3": "", "4": "", "5": "", "6": "", "7": "" });
    expect(scheduleToInputs(FULL_TIME_SCHEDULE)).toEqual({
      "1": "8",
      "2": "8",
      "3": "8",
      "4": "8",
      "5": "8",
      "6": "",
      "7": "",
    });
    expect(serializeWorkScheduleKey(null)).toBe("null");
    expect(serializeWorkScheduleKey(EMPTY_SCHEDULE)).toBe("1:0,2:0,3:0,4:0,5:0,6:0,7:0");
  });

  it("liczy tygodniowy wymiar godzin i etat (FTE = minuty / 2400) z poprawną odmianą", () => {
    expect(totalWeeklyMinutes(FULL_TIME_SCHEDULE)).toBe(2400);
    expect(formatFte(2400)).toBe("1 etat");
    expect(formatFte(720)).toBe("0,3 etatu");
    expect(formatFte(1200)).toBe("0,5 etatu");
    expect(formatFte(1800)).toBe("0,75 etatu");
    expect(formatFte(0)).toBe("0 etatów");
    expect(formatFte(4800)).toBe("2 etaty");
    expect(formatFte(12000)).toBe("5 etatów");

    expect(formatWeeklySummary(FULL_TIME_SCHEDULE)).toBe("40 h tygodniowo, 1 etat");
    expect(formatWeeklySummary({ 1: 240, 3: 240, 5: 240 })).toBe("12 h tygodniowo, 0,3 etatu");
    expect(formatWeeklySummary(HALF_TIME_SCHEDULE)).toBe("20 h tygodniowo, 0,5 etatu");
    expect(formatWeeklySummary(EMPTY_SCHEDULE)).toBe("0 h tygodniowo, 0 etatów");
  });

  it("tworzy krótkie podsumowanie grafiku na listę pracowników i ekran firmy", () => {
    expect(formatScheduleSummary(null)).toBe("Grafik firmy");
    expect(formatScheduleSummary(null, { nullLabel: "Nie ustawiono" })).toBe("Nie ustawiono");
    expect(formatScheduleSummary(EMPTY_SCHEDULE)).toBe("Brak dni roboczych");
    expect(formatScheduleSummary(FULL_TIME_SCHEDULE)).toBe("pn–pt 8 h");
    expect(formatScheduleSummary(HALF_TIME_SCHEDULE)).toBe("pn–pt 4 h");
    expect(formatScheduleSummary({ 1: 240, 3: 240, 5: 240 })).toBe("pn, śr, pt 4 h");
    expect(formatScheduleSummary({ 1: 480, 2: 480, 3: 480, 4: 480, 5: 360 })).toBe("pn–czw 8 h, pt 6 h");
    expect(formatScheduleSummary({ 1: 480, 2: 420, 3: 360, 4: 300, 5: 240 })).toBe("5 dni, 30 h tygodniowo");
  });

  it("odczytuje formularz wymiaru pracy w trybie null, własnym i wyczyszczonym", () => {
    expect(parseWorkScheduleForm(new FormData())).toEqual({ present: false });

    const inheritForm = new FormData();
    inheritForm.set("workScheduleMode", "null");
    expect(parseWorkScheduleForm(inheritForm)).toEqual({ present: true, ok: true, value: null });

    const clearedForm = new FormData();
    clearedForm.set("workScheduleMode", "custom");
    clearedForm.set("workSchedule.day.1", "0");
    clearedForm.set("workSchedule.day.2", "");
    expect(parseWorkScheduleForm(clearedForm)).toEqual({ present: true, ok: true, value: {} });

    const customForm = new FormData();
    customForm.set("defaultWorkScheduleMode", "custom");
    customForm.set("defaultWorkSchedule.day.1", "8");
    customForm.set("defaultWorkSchedule.day.2", "7,5");
    customForm.set("defaultWorkSchedule.day.5", "4");
    expect(parseWorkScheduleForm(customForm, "defaultWorkSchedule")).toEqual({
      present: true,
      ok: true,
      value: { 1: 480, 2: 450, 5: 240 },
    });

    const invalidDayForm = new FormData();
    invalidDayForm.set("workScheduleMode", "custom");
    invalidDayForm.set("workSchedule.day.3", "25");
    const invalidResult = parseWorkScheduleForm(invalidDayForm);
    expect(invalidResult.present).toBe(true);
    expect(invalidResult.present && !invalidResult.ok && invalidResult.error).toContain("Środa:");

    const invalidModeForm = new FormData();
    invalidModeForm.set("workScheduleMode", "other");
    expect(parseWorkScheduleForm(invalidModeForm)).toEqual({
      present: true,
      ok: false,
      error: "Wybrano nieprawidłowy tryb wymiaru pracy.",
    });
  });

  it("ustawia najczęstsze strefy czasowe na początku bez duplikatów i zachowuje bieżącą strefę", () => {
    const groups = getTimeZoneOptions("Europe/Warsaw");
    expect(groups.common).toEqual(COMMON_TIME_ZONES);
    expect(groups.other.length).toBeGreaterThan(0);
    for (const common of COMMON_TIME_ZONES) {
      expect(groups.other).not.toContain(common);
    }

    const withCustom = getTimeZoneOptions("Etc/Custom", ["Europe/Warsaw", "America/New_York"]);
    expect(withCustom.common).toEqual(COMMON_TIME_ZONES);
    expect(withCustom.other).toEqual(["Etc/Custom", "America/New_York"]);
  });

  it("formatuje szczegóły błędów walidacji z Core z polskimi nazwami pól", () => {
    expect(
      formatCoreErrorDetail({
        message: "Błąd walidacji",
        details: [{ field: "timeZone", message: "Nieznana strefa czasowa IANA." }],
      }),
    ).toBe("Strefa czasowa: Nieznana strefa czasowa IANA.");

    expect(
      formatCoreErrorDetail({
        message: "Błąd walidacji",
        details: [
          { field: "workSchedule.1", message: "Wartość musi być od 0 do 1440." },
          { field: "defaultWorkSchedule.5", message: "Podaj liczbę całkowitą." },
        ],
      }),
    ).toBe("Poniedziałek: Wartość musi być od 0 do 1440.; Piątek: Podaj liczbę całkowitą.");

    expect(formatCoreErrorDetail({ message: "Nieprawidłowe dane.", details: [] })).toBe("Nieprawidłowe dane.");
  });
});
