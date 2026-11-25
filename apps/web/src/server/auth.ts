import "server-only";
import { createWebAuth, type WebAuth } from "@monorise-team/auth/next";
import { config } from "./config";

let instance: WebAuth | undefined;

/**
 * Logowanie kontem Monorise przez Core (BFF, ADR-0050). Portal nie ma bazy, więc sesja i tokeny Core są
 * w zaszyfrowanym ciasteczku HttpOnly (ADR-0098). Tworzone przy pierwszym użyciu, żeby build działał bez sekretów.
 */
export function getAuth(): WebAuth {
  instance ??= createWebAuth({
    issuer: config.coreAuthUrl,
    clientId: config.oauthClientId,
    clientSecret: config.oauthClientSecret || undefined,
    appUrl: config.appUrl,
    resources: [config.coreApiUrl],
    secret: config.sessionSecrets,
    session: { mode: "cookie" },
    errorPath: "/signed-out",
    afterSignOut: "/signed-out",
  });
  return instance;
}
