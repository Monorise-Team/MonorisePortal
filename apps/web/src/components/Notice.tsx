import { cookies } from "next/headers";
import { ERROR_MESSAGES, LOAD_MESSAGES, OK_MESSAGES, messageFor } from "@/lib/messages";
import { ERROR_DETAIL_COOKIE } from "@/server/form";

/** Powód odmowy z Core zapisany przy przekierowaniu (tylko gdy w adresie jest `?error=`). */
async function errorDetail(): Promise<string | undefined> {
  const raw = (await cookies()).get(ERROR_DETAIL_COOKIE)?.value;
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw).slice(0, 300);
  } catch {
    return undefined;
  }
}

/** Komunikat po akcji formularza z `?ok=` albo `?error=`. */
export async function Notice({ ok, error }: { ok?: string | undefined; error?: string | undefined }) {
  const detail = error ? await errorDetail() : undefined;
  const text = detail ?? messageFor(ERROR_MESSAGES, error) ?? messageFor(OK_MESSAGES, ok);
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
