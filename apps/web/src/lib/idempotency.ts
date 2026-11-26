/** Nazwa ukrytego pola formularza z kluczem idempotentności (`Idempotency-Key` w Core). */
export const IDEMPOTENCY_FIELD = "idempotencyKey";

/** Drukowalne znaki ASCII (0x20–0x7E) bez spacji na brzegach — zgodnie z kontraktem Core API. */
const VALID_IDEMPOTENCY_KEY = /^[!-~]([ -~]*[!-~])?$/;
const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

/**
 * Zwraca klucz idempotentności z formularza (ten sam przy ponownym wysłaniu tego samego formularza)
 * albo generuje nowy UUID, gdy pola brakuje lub ma nieprawidłową wartość.
 */
export function readIdempotencyKey(form: FormData, generate: () => string = () => crypto.randomUUID()): string {
  const raw = form.get(IDEMPOTENCY_FIELD);
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length > 0 && value.length <= MAX_IDEMPOTENCY_KEY_LENGTH && VALID_IDEMPOTENCY_KEY.test(value)) {
    return value;
  }
  return generate();
}

/** Nagłówek `Idempotency-Key` dla operacji tworzących w `@monorise-team/sdk`. */
export function idempotencyHeaders(form: FormData, generate?: () => string): { readonly "Idempotency-Key": string } {
  return { "Idempotency-Key": readIdempotencyKey(form, generate) };
}
