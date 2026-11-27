import { Banner } from "@monorise-team/ui";
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

export interface NoticeData {
  tone: "danger" | "success";
  message: string;
}

/** Odczytuje treść komunikatu z parametrów adresu i ciasteczka `portal-error-detail`. */
export async function readNotice(ok?: string | undefined, error?: string | undefined): Promise<NoticeData | null> {
  const detail = error ? await errorDetail() : undefined;
  const message = detail ?? messageFor(ERROR_MESSAGES, error) ?? messageFor(OK_MESSAGES, ok);
  if (!message) return null;
  return { tone: error ? "danger" : "success", message };
}

/** Komunikat po akcji formularza z `?ok=` albo `?error=` (pasek stanu z biblioteki, działa bez JavaScriptu). */
export async function Notice({ ok, error }: { ok?: string | undefined; error?: string | undefined }) {
  const notice = await readNotice(ok, error);
  if (!notice) return null;
  return <Banner tone={notice.tone} message={notice.message} />;
}

/** Fragment strony, którego Core nie pozwolił wczytać (brak uprawnienia, awaria). */
export function LoadFailed({ code }: { code: string }) {
  return <p className="text-sm text-text-tertiary">{messageFor(LOAD_MESSAGES, code)}</p>;
}
