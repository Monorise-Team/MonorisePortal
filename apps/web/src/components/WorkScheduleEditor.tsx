"use client";

import { Button, TextField } from "@monorise-team/ui";
import { useId, useMemo, useState } from "react";
import {
  EMPTY_WORK_SCHEDULE_INPUTS,
  WEEKDAYS,
  detectWorkSchedulePreset,
  formatMinutesAsHours,
  formatScheduleSummary,
  formatWeeklySummary,
  parseHoursInput,
  scheduleToInputs,
  totalWeeklyMinutes,
  workScheduleForPreset,
  type IsoWeekday,
  type WorkSchedule,
  type WorkScheduleInputs,
  type WorkScheduleMode,
  type WorkSchedulePresetKey,
} from "@/lib/work-schedule";

export interface WorkScheduleEditorProps {
  /** Tryb edytora: pracownik może wybrać grafik firmy (`null`), a firma brak domyślnego grafiku (`null`). */
  variant: "employee" | "organization";
  /** Początkowy grafik z Core (`null` oznacza grafik firmy albo brak domyślnego grafiku). */
  initialSchedule: WorkSchedule | null;
  /** Domyślny grafik firmy pokazywany w trybie pracownika przy ustawieniu „Grafik firmy”. */
  companyDefaultSchedule?: WorkSchedule | null;
  /** Prefiks nazw pól formularza (`workSchedule` albo `defaultWorkSchedule`). */
  fieldPrefix?: string;
  /** Tytuł sekcji w `<legend>`. */
  legend?: string;
}

const DEFAULT_LEGEND: Record<WorkScheduleEditorProps["variant"], string> = {
  employee: "Wymiar pracy",
  organization: "Domyślny wymiar pracy",
};

/**
 * Edytor tygodniowego wymiaru pracy (Poniedziałek–Niedziela) używany w formularzu pracownika
 * i na ekranie firmy. Zapisuje wartości przez zwykłe pola formularza HTML (`${prefix}Mode` oraz
 * `${prefix}.day.1`..`7`).
 */
export function WorkScheduleEditor({
  variant,
  initialSchedule,
  companyDefaultSchedule = null,
  fieldPrefix = "workSchedule",
  legend,
}: WorkScheduleEditorProps) {
  const baseId = useId();
  const [mode, setMode] = useState<WorkScheduleMode>(initialSchedule === null ? "null" : "custom");
  const [inputs, setInputs] = useState<WorkScheduleInputs>(() => scheduleToInputs(initialSchedule));

  const parsed = useMemo(() => {
    const schedule: WorkSchedule = {};
    const errors: Partial<Record<IsoWeekday, string>> = {};
    let hasErrors = false;

    if (mode === "custom") {
      for (const day of WEEKDAYS) {
        const result = parseHoursInput(inputs[day.key]);
        if (!result.ok) {
          errors[day.key] = result.error;
          hasErrors = true;
        } else if (result.minutes > 0) {
          schedule[day.key] = result.minutes;
        }
      }
    }

    return { schedule, errors, hasErrors };
  }, [inputs, mode]);

  const activePreset = detectWorkSchedulePreset(mode, parsed.schedule, parsed.hasErrors);
  const weeklyMinutes = totalWeeklyMinutes(parsed.schedule);

  function applyPreset(preset: WorkSchedulePresetKey) {
    const nextSchedule = workScheduleForPreset(preset);
    if (nextSchedule === null) {
      setMode("null");
      setInputs({ ...EMPTY_WORK_SCHEDULE_INPUTS });
      return;
    }
    setMode("custom");
    setInputs(scheduleToInputs(nextSchedule));
  }

  function handleDayChange(day: IsoWeekday, value: string) {
    if (mode === "null") {
      setMode("custom");
    }
    setInputs((prev) => ({ ...prev, [day]: value }));
  }

  const nullPresetLabel = variant === "employee" ? "Grafik firmy" : "Brak domyślnego grafiku";
  const presets: ReadonlyArray<{ key: WorkSchedulePresetKey; label: string }> = [
    { key: "null", label: nullPresetLabel },
    { key: "full-time", label: "Pełny etat, pn–pt 8 h" },
    { key: "half-time", label: "1/2 etatu, pn–pt 4 h" },
    { key: "clear", label: "Wyczyść" },
  ];

  let summaryMessage: string;
  if (mode === "null") {
    if (variant === "employee") {
      summaryMessage = companyDefaultSchedule
        ? `Obowiązuje domyślny grafik firmy: ${formatScheduleSummary(companyDefaultSchedule)} (${formatWeeklySummary(companyDefaultSchedule)}). Wpisanie godzin poniżej ustawi indywidualny wymiar pracy.`
        : "Wybrano domyślny grafik firmy, ale firma nie ma jeszcze ustawionego grafiku. Wpisanie godzin poniżej ustawi indywidualny wymiar pracy.";
    } else {
      summaryMessage =
        "Firma nie ma domyślnego grafiku pracy. Wpisanie godzin poniżej ustawi domyślny grafik dla pracowników bez własnego wymiaru pracy.";
    }
  } else if (parsed.hasErrors) {
    summaryMessage = "Popraw liczbę godzin w oznaczonych dniach. Dopuszczalne są wartości od 0 do 24.";
  } else if (weeklyMinutes === 0) {
    summaryMessage =
      variant === "employee"
        ? `Suma: ${formatWeeklySummary(parsed.schedule)}. Wszystkie dni są wolne i zastępują grafik firmy. Aby wrócić do ustawień firmy, wybierz przycisk „Grafik firmy”.`
        : `Suma: ${formatWeeklySummary(parsed.schedule)}. Wszystkie dni są wolne. Aby usunąć domyślny grafik firmy, wybierz przycisk „Brak domyślnego grafiku”.`;
  } else {
    summaryMessage =
      variant === "employee"
        ? `Suma: ${formatWeeklySummary(parsed.schedule)}.`
        : `Suma: ${formatWeeklySummary(parsed.schedule)}. Ten grafik obowiązuje pracowników z ustawieniem „Grafik firmy”.`;
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-control border border-border-primary p-3">
      <legend className="px-1 text-xs font-medium text-text-secondary">{legend ?? DEFAULT_LEGEND[variant]}</legend>
      <input type="hidden" name={`${fieldPrefix}Mode`} value={mode} />

      <div role="group" aria-label="Gotowe ustawienia wymiaru pracy" className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.key}
            type="button"
            size="xs"
            variant={activePreset === preset.key ? "primary" : "outline"}
            aria-pressed={activePreset === preset.key}
            onClick={() => applyPreset(preset.key)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <p
        aria-live="polite"
        className={
          parsed.hasErrors
            ? "rounded-control bg-bg-secondary px-3 py-2 text-xs text-danger"
            : "rounded-control bg-bg-secondary px-3 py-2 text-xs text-text-secondary"
        }
      >
        {summaryMessage}
      </p>

      <p className="text-xs text-text-tertiary">
        Wpisz godziny dziennie, na przykład 8 albo 7,5. Puste pole lub 0 oznacza dzień wolny.
      </p>

      <div className="flex flex-col gap-2">
        {WEEKDAYS.map((day) => {
          const inputId = `${baseId}-day-${day.key}`;
          const error = parsed.errors[day.key];
          const rawValue = inputs[day.key];

          let rowMeta: string;
          if (mode === "null") {
            if (variant === "employee") {
              if (!companyDefaultSchedule) {
                rowMeta = "Nie ustawiono";
              } else {
                const companyMinutes = companyDefaultSchedule[day.key] ?? 0;
                rowMeta =
                  companyMinutes > 0
                    ? `Z grafiku firmy: ${formatMinutesAsHours(companyMinutes)}`
                    : "Z grafiku firmy: dzień wolny";
              }
            } else {
              rowMeta = "Brak domyślnego grafiku";
            }
          } else if (error) {
            rowMeta = "Nieprawidłowa wartość";
          } else {
            const parsedDay = parseHoursInput(rawValue);
            rowMeta = parsedDay.ok && parsedDay.minutes > 0 ? "h" : "Dzień wolny";
          }

          return (
            <div key={day.key} className="grid grid-cols-1 gap-1.5 sm:grid-cols-[9rem_1fr] sm:items-start">
              <label htmlFor={inputId} className="pt-1 text-sm text-text-primary">
                {day.label}
              </label>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <TextField
                    id={inputId}
                    name={`${fieldPrefix}.day.${day.key}`}
                    size="sm"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    value={rawValue}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    onChange={(event) => handleDayChange(day.key, event.target.value)}
                    className="w-24"
                  />
                  <span className="text-xs text-text-tertiary">{rowMeta}</span>
                </div>
                {error && (
                  <p id={`${inputId}-error`} className="text-xs text-danger">
                    {error}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
