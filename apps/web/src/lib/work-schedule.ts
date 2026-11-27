import type { components } from "@monorise-team/sdk";

export type WorkSchedule = components["schemas"]["WorkSchedule"];

export const ISO_WEEKDAYS = ["1", "2", "3", "4", "5", "6", "7"] as const;
export type IsoWeekday = (typeof ISO_WEEKDAYS)[number];

export interface WeekdayInfo {
  readonly key: IsoWeekday;
  readonly label: string;
  readonly shortLabel: string;
}

export const WEEKDAYS: readonly WeekdayInfo[] = [
  { key: "1", label: "Poniedziałek", shortLabel: "pn" },
  { key: "2", label: "Wtorek", shortLabel: "wt" },
  { key: "3", label: "Środa", shortLabel: "śr" },
  { key: "4", label: "Czwartek", shortLabel: "czw" },
  { key: "5", label: "Piątek", shortLabel: "pt" },
  { key: "6", label: "Sobota", shortLabel: "sob" },
  { key: "7", label: "Niedziela", shortLabel: "ndz" },
];

export const FULL_TIME_WEEKLY_MINUTES = 2400;
export const MAX_DAY_MINUTES = 1440;
export const DEFAULT_TIME_ZONE = "Europe/Warsaw";

/** Najczęściej wybierane strefy czasowe pokazywane na początku listy. */
export const COMMON_TIME_ZONES = ["Europe/Warsaw", "Europe/London", "Europe/Berlin", "UTC"] as const;

export const FULL_TIME_SCHEDULE: WorkSchedule = { 1: 480, 2: 480, 3: 480, 4: 480, 5: 480 };
export const HALF_TIME_SCHEDULE: WorkSchedule = { 1: 240, 2: 240, 3: 240, 4: 240, 5: 240 };
export const EMPTY_SCHEDULE: WorkSchedule = {};

export type WorkScheduleMode = "null" | "custom";
export type WorkSchedulePresetKey = "null" | "full-time" | "half-time" | "clear";
export type WorkScheduleInputs = Record<IsoWeekday, string>;

export const EMPTY_WORK_SCHEDULE_INPUTS: WorkScheduleInputs = {
  "1": "",
  "2": "",
  "3": "",
  "4": "",
  "5": "",
  "6": "",
  "7": "",
};

const HOURS_INPUT_PATTERN = /^\d+(?:[.,]\d+)?$/;

function formatPolishNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const normalized = Object.is(rounded, -0) ? 0 : rounded;
  return String(normalized).replace(".", ",");
}

/** Formatuje liczbę minut jako godziny dziesiętne do pola tekstowego (np. `450` -> `"7,5"`, `0` -> `""`). */
export function formatMinutesAsHoursInput(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return "";
  return formatPolishNumber(minutes / 60);
}

/** Formatuje liczbę minut jako krótki zapis godzin (np. `480` -> `"8 h"`, `450` -> `"7,5 h"`). */
export function formatMinutesAsHours(minutes: number): string {
  return `${formatPolishNumber(minutes / 60)} h`;
}

export type ParseHoursResult = { ok: true; minutes: number } | { ok: false; error: string };

/**
 * Zamienia tekst z pola godzin dziennych (format dziesiętny z przecinkiem albo kropką) na całkowitą
 * liczbę minut `0..1440`. Puste pole i `0` oznaczają dzień wolny (`0`).
 */
export function parseHoursInput(raw: string): ParseHoursResult {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, minutes: 0 };

  if (!HOURS_INPUT_PATTERN.test(trimmed)) {
    return { ok: false, error: "Wpisz liczbę godzin od 0 do 24, na przykład 8 albo 7,5." };
  }

  const hours = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
    return { ok: false, error: "Liczba godzin w jednym dniu musi być od 0 do 24." };
  }

  const minutes = Math.round(hours * 60);
  if (minutes < 0 || minutes > MAX_DAY_MINUTES) {
    return { ok: false, error: "Liczba godzin w jednym dniu musi być od 0 do 24." };
  }

  return { ok: true, minutes };
}

/** Usuwa z grafiku dni wolne (`0` albo `undefined`), zostawiając wyłącznie dni z pracą. */
export function normalizeWorkSchedule(schedule: WorkSchedule): WorkSchedule {
  const normalized: WorkSchedule = {};
  for (const day of ISO_WEEKDAYS) {
    const minutes = schedule[day];
    if (typeof minutes === "number" && minutes > 0) {
      normalized[day] = minutes;
    }
  }
  return normalized;
}

/** Zamienia grafik z Core na wartości siedmiu pól tekstowych w edytorze. */
export function scheduleToInputs(schedule: WorkSchedule | null): WorkScheduleInputs {
  if (schedule === null) return { ...EMPTY_WORK_SCHEDULE_INPUTS };
  return {
    "1": formatMinutesAsHoursInput(schedule["1"]),
    "2": formatMinutesAsHoursInput(schedule["2"]),
    "3": formatMinutesAsHoursInput(schedule["3"]),
    "4": formatMinutesAsHoursInput(schedule["4"]),
    "5": formatMinutesAsHoursInput(schedule["5"]),
    "6": formatMinutesAsHoursInput(schedule["6"]),
    "7": formatMinutesAsHoursInput(schedule["7"]),
  };
}

/** Zwraca grafik przypisany do gotowego ustawienia (presetu). */
export function workScheduleForPreset(preset: WorkSchedulePresetKey): WorkSchedule | null {
  switch (preset) {
    case "null":
      return null;
    case "full-time":
      return { ...FULL_TIME_SCHEDULE };
    case "half-time":
      return { ...HALF_TIME_SCHEDULE };
    case "clear":
      return {};
  }
}

/** Porównuje dwa grafiki po normalizacji dni wolnych. */
export function areWorkSchedulesEqual(a: WorkSchedule, b: WorkSchedule): boolean {
  for (const day of ISO_WEEKDAYS) {
    const left = a[day] ?? 0;
    const right = b[day] ?? 0;
    if (left !== right) return false;
  }
  return true;
}

/** Rozpoznaje, czy bieżący stan edytora odpowiada jednemu z gotowych ustawień. */
export function detectWorkSchedulePreset(
  mode: WorkScheduleMode,
  schedule: WorkSchedule,
  hasErrors = false,
): WorkSchedulePresetKey | null {
  if (mode === "null") return "null";
  if (hasErrors) return null;
  if (areWorkSchedulesEqual(schedule, FULL_TIME_SCHEDULE)) return "full-time";
  if (areWorkSchedulesEqual(schedule, HALF_TIME_SCHEDULE)) return "half-time";
  if (areWorkSchedulesEqual(schedule, EMPTY_SCHEDULE)) return "clear";
  return null;
}

/** Suma minut pracy w tygodniu. */
export function totalWeeklyMinutes(schedule: WorkSchedule): number {
  let total = 0;
  for (const day of ISO_WEEKDAYS) {
    const minutes = schedule[day];
    if (typeof minutes === "number" && minutes > 0) total += minutes;
  }
  return total;
}

/** Formatuje wymiar etatu (FTE = minuty tygodniowe / 2400) z poprawną odmianą słowa „etat”. */
export function formatFte(weeklyMinutes: number): string {
  const fte = weeklyMinutes / FULL_TIME_WEEKLY_MINUTES;
  const rounded = Math.round(fte * 100) / 100;
  const normalized = Object.is(rounded, -0) ? 0 : rounded;

  if (!Number.isInteger(normalized)) {
    return `${formatPolishNumber(normalized)} etatu`;
  }
  if (normalized === 1) return "1 etat";
  const mod10 = normalized % 10;
  const mod100 = normalized % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${normalized} etaty`;
  }
  return `${normalized} etatów`;
}

/** Pełne podsumowanie tygodnia: godziny i etat (np. `"40 h tygodniowo, 1 etat"`, `"12 h tygodniowo, 0,3 etatu"`). */
export function formatWeeklySummary(schedule: WorkSchedule): string {
  const minutes = totalWeeklyMinutes(schedule);
  return `${formatMinutesAsHours(minutes)} tygodniowo, ${formatFte(minutes)}`;
}

interface DayRun {
  startIndex: number;
  endIndex: number;
  minutes: number;
}

function formatDayRunLabel(startIndex: number, endIndex: number): string {
  const start = WEEKDAYS[startIndex]!.shortLabel;
  const end = WEEKDAYS[endIndex]!.shortLabel;
  return startIndex === endIndex ? start : `${start}–${end}`;
}

/**
 * Krótkie podsumowanie grafiku na listę lub widok szczegółów (np. `"pn–pt 8 h"`, `"Grafik firmy"`,
 * `"Brak dni roboczych"`).
 */
export function formatScheduleSummary(
  schedule: WorkSchedule | null,
  options?: { readonly nullLabel?: string },
): string {
  if (schedule === null) return options?.nullLabel ?? "Grafik firmy";

  const runs: DayRun[] = [];
  for (let index = 0; index < WEEKDAYS.length; index++) {
    const minutes = schedule[WEEKDAYS[index]!.key] ?? 0;
    if (minutes <= 0) continue;
    const previous = runs.at(-1);
    if (previous && previous.endIndex === index - 1 && previous.minutes === minutes) {
      previous.endIndex = index;
    } else {
      runs.push({ startIndex: index, endIndex: index, minutes });
    }
  }

  if (runs.length === 0) return "Brak dni roboczych";

  const firstMinutes = runs[0]!.minutes;
  const allSameMinutes = runs.every((run) => run.minutes === firstMinutes);
  if (allSameMinutes) {
    const labels = runs.map((run) => formatDayRunLabel(run.startIndex, run.endIndex)).join(", ");
    return `${labels} ${formatMinutesAsHours(firstMinutes)}`;
  }

  if (runs.length <= 3) {
    return runs
      .map((run) => `${formatDayRunLabel(run.startIndex, run.endIndex)} ${formatMinutesAsHours(run.minutes)}`)
      .join(", ");
  }

  const activeDays = runs.reduce((count, run) => count + (run.endIndex - run.startIndex + 1), 0);
  const daysWord = activeDays === 1 ? "dzień" : "dni";
  return `${activeDays} ${daysWord}, ${formatMinutesAsHours(totalWeeklyMinutes(schedule))} tygodniowo`;
}

/** Stabilny klucz tekstowy grafiku do atrybutu `key` formularzy w Next.js App Router. */
export function serializeWorkScheduleKey(schedule: WorkSchedule | null): string {
  if (schedule === null) return "null";
  return ISO_WEEKDAYS.map((day) => `${day}:${schedule[day] ?? 0}`).join(",");
}

export type ParsedWorkScheduleForm =
  | { readonly present: false }
  | { readonly present: true; readonly ok: true; readonly value: WorkSchedule | null }
  | { readonly present: true; readonly ok: false; readonly error: string };

/**
 * Odczytuje i waliduje grafik z `FormData`. Gdy pole trybu (`${prefix}Mode`) nie występuje
 * w formularzu, zwraca `{ present: false }`, aby nie nadpisywać zapisanego grafiku.
 */
export function parseWorkScheduleForm(form: FormData, prefix = "workSchedule"): ParsedWorkScheduleForm {
  const mode = form.get(`${prefix}Mode`);
  if (mode === null) return { present: false };
  if (mode === "null") return { present: true, ok: true, value: null };
  if (mode !== "custom") {
    return { present: true, ok: false, error: "Wybrano nieprawidłowy tryb wymiaru pracy." };
  }

  const schedule: WorkSchedule = {};
  for (const day of WEEKDAYS) {
    const raw = form.get(`${prefix}.day.${day.key}`);
    const parsed = parseHoursInput(typeof raw === "string" ? raw : "");
    if (!parsed.ok) {
      return { present: true, ok: false, error: `${day.label}: ${parsed.error}` };
    }
    if (parsed.minutes > 0) {
      schedule[day.key] = parsed.minutes;
    }
  }

  return { present: true, ok: true, value: schedule };
}

export interface TimeZoneGroups {
  readonly common: readonly string[];
  readonly other: readonly string[];
}

/**
 * Zwraca strefy czasowe IANA do pola wyboru: najpierw najczęstsze (`Europe/Warsaw`, `Europe/London`,
 * `Europe/Berlin`, `UTC`), potem pozostałe z `Intl.supportedValuesOf("timeZone")`. Jeśli bieżąca
 * strefa firmy nie występuje na żadnej z list, zostaje dopisana, aby pole wyboru zachowało wartość.
 */
export function getTimeZoneOptions(currentTimeZone?: string, supportedZones?: readonly string[]): TimeZoneGroups {
  const allSupported =
    supportedZones ?? (typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : []);
  const commonSet = new Set<string>(COMMON_TIME_ZONES);
  const other = allSupported.filter((zone) => !commonSet.has(zone));

  if (currentTimeZone && !commonSet.has(currentTimeZone) && !other.includes(currentTimeZone)) {
    other.unshift(currentTimeZone);
  }

  return { common: COMMON_TIME_ZONES, other };
}
