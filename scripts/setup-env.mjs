#!/usr/bin/env node
/**
 * Ustawienia do pracy lokalnej:
 * - apps/web/.env.local: sekret sesji, adresy aplikacji i MonoriseCore oraz sekret klienta
 *   monorise-portal z Core (z pliku, który zapisuje `pnpm oauth:seed` w MonoriseCore).
 * Istniejących wartości nie zmienia: dopisuje tylko brakujące.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const coreSecretsFile =
  process.env.CORE_OAUTH_SECRETS_FILE ?? join(root, "../MonoriseCore/apps/auth/.data/oauth-clients.json");
const hasCoreSecretsFile = existsSync(coreSecretsFile);
const coreSecret = hasCoreSecretsFile
  ? (JSON.parse(readFileSync(coreSecretsFile, "utf8"))["monorise-portal"] ?? "")
  : "";

function ensure(file, header, values) {
  const path = join(root, file);
  const current = existsSync(path) ? readFileSync(path, "utf8") : `${header}\n`;
  const present = new Set(current.split("\n").map((line) => line.split("=")[0]?.trim()));
  const added = Object.entries(values).filter(([key]) => !present.has(key));
  if (added.length) {
    const text = `${current.replace(/\n*$/, "\n")}${added.map(([key, value]) => `${key}=${value}`).join("\n")}\n`;
    writeFileSync(path, text, { mode: 0o600 });
  }
  console.log(added.length ? `${file}: dopisano ${added.map(([key]) => key).join(", ")}` : `${file}: bez zmian`);
  return path;
}

ensure("apps/web/.env.local", "# Tylko lokalnie. Nigdy nie commituj tego pliku.", {
  PORTAL_SESSION_SECRET: randomBytes(32).toString("base64url"),
  PORTAL_APP_URL: "http://portal.localhost:3400",
  CORE_AUTH_URL: "http://localhost:3100",
  CORE_API_URL: "http://localhost:3200",
  PORTAL_OAUTH_CLIENT_ID: "monorise-portal",
  PORTAL_OAUTH_CLIENT_SECRET: coreSecret,
});
if (!hasCoreSecretsFile) {
  console.log(
    `Nie znaleziono pliku sekretów OAuth Core: ${coreSecretsFile}\n` +
      "Jeśli repozytorium (albo git worktree) nie leży obok MonoriseCore, wskaż plik przez CORE_OAUTH_SECRETS_FILE:\n" +
      "  CORE_OAUTH_SECRETS_FILE=/sciezka/do/MonoriseCore/apps/auth/.data/oauth-clients.json pnpm setup:env\n" +
      "Wcześniej uruchom `pnpm oauth:seed` w MonoriseCore (i usuń pusty PORTAL_OAUTH_CLIENT_SECRET z apps/web/.env.local).",
  );
} else if (!coreSecret) {
  console.log(
    "Brak sekretu klienta monorise-portal: uruchom `pnpm oauth:seed` w MonoriseCore, potem jeszcze raz `pnpm setup:env`\n" +
      "(albo usuń pusty wpis PORTAL_OAUTH_CLIENT_SECRET z apps/web/.env.local, żeby skrypt mógł go dopisać).",
  );
}
