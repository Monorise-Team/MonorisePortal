import { ERROR_MESSAGES, LOAD_MESSAGES, OK_MESSAGES, messageFor } from "@/lib/messages";

/** Komunikat po akcji formularza z `?ok=` albo `?error=`. */
export function Notice({ ok, error }: { ok?: string | undefined; error?: string | undefined }) {
  const text = messageFor(ERROR_MESSAGES, error) ?? messageFor(OK_MESSAGES, ok);
  if (!text) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={
        error
          ? "rounded-control border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          : "rounded-control border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
      }
    >
      {text}
    </p>
  );
}

/** Fragment strony, którego Core nie pozwolił wczytać (brak uprawnienia, awaria). */
export function LoadFailed({ code }: { code: string }) {
  return <p className="text-sm text-text-tertiary">{messageFor(LOAD_MESSAGES, code)}</p>;
}
