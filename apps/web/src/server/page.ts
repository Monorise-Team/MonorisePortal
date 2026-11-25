import "server-only";
import type { Session } from "@monorise-team/auth/next";
import { CoreApiError, CoreApiUnavailableError, type CoreClient } from "@monorise-team/sdk";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";
import { coreFor } from "./core";

/**
 * Sesja w Server Component (bez odświeżania, bo strona nie zapisze `Set-Cookie`; odświeża `proxy.ts`).
 * Bez sesji: logowanie w Core.
 */
export async function requirePageSession(): Promise<{ session: Session; core: CoreClient }> {
  const auth = getAuth();
  const session = await auth.getSessionFromCookie((await cookies()).get(auth.cookieName)?.value);
  if (!session) redirect("/api/auth/sign-in");
  return { session, core: coreFor(session) };
}

export type Loaded<T> = { ok: true; data: T } | { ok: false; code: string };

/** Wczytuje dane z Core; brak uprawnienia albo awaria nie psuje całej strony, tylko jej fragment. */
export async function load<T>(fn: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof CoreApiError) {
      if (error.code === "UNAUTHENTICATED") redirect("/api/auth/sign-in");
      return { ok: false, code: error.code };
    }
    if (error instanceof CoreApiUnavailableError) return { ok: false, code: "UNAVAILABLE" };
    throw error;
  }
}
