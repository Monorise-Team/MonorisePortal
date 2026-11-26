import "server-only";
import type { Session } from "@monorise-team/auth/next";
import { createCoreClient, type CoreClient } from "@monorise-team/sdk";
import { config } from "./config";

/** Klient Core API z tokenem zalogowanej osoby (Core sam sprawdza uprawnienia przy każdym wywołaniu). */
export function coreFor(session: Session): CoreClient {
  return createCoreClient({
    baseUrl: config.coreApiUrl,
    getAccessToken: () => session.accessToken(),
    retry: { attempts: 3, baseDelayMs: 200, maxDelayMs: 2000 },
  });
}
