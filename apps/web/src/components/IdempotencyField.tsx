import { IDEMPOTENCY_FIELD } from "@/lib/idempotency";

/** Ukryte pole formularza ze stałym kluczem idempotentności na czas tego formularza (chroni przed duplikatami). */
export function IdempotencyField() {
  return <input type="hidden" name={IDEMPOTENCY_FIELD} value={crypto.randomUUID()} />;
}
