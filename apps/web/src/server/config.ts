import "server-only";

const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/** Ustawienia serwera ze zmiennych środowiskowych (lokalnie `apps/web/.env.local`). */
export const config = {
  /** Serwer logowania Core (wystawca tokenów), np. https://auth.monorise.studio. */
  get coreAuthUrl() {
    return process.env.CORE_AUTH_URL ?? "http://localhost:3100";
  },
  /** Core API, np. https://api.monorise.studio. Jedyny odbiorca tokenów Portalu. */
  get coreApiUrl() {
    return process.env.CORE_API_URL ?? "http://localhost:3200";
  },
  /** Adres Portalu (BFF), np. https://portal.monorise.studio. */
  get appUrl() {
    return process.env.PORTAL_APP_URL ?? "http://portal.localhost:3400";
  },
  get oauthClientId() {
    return process.env.PORTAL_OAUTH_CLIENT_ID ?? "monorise-portal";
  },
  /** Sekret klienta z Core (lokalnie z `pnpm oauth:seed` w MonoriseCore). */
  get oauthClientSecret() {
    return process.env.PORTAL_OAUTH_CLIENT_SECRET ?? "";
  },
  /** Klucz szyfrujący ciasteczko sesji: 32 losowe bajty (`openssl rand -base64 32`); przy wymianie „nowy,stary”. */
  get sessionSecrets() {
    return list(process.env.PORTAL_SESSION_SECRET);
  },
};
