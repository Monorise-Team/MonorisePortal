# MonorisePortal

Panel klienta Monorise (`portal.monorise.studio`): Owner i administratorzy firmy zarządzają w nim firmą i domenami, pracownikami i zaproszeniami, strukturą firmy, rolami i uprawnieniami oraz dostępem do aplikacji. Portal nie ma własnej bazy: wszystko robi przez API MonoriseCore, a logowanie idzie kontem Monorise przez MonoriseCore. Decyzje: ADR-0050, ADR-0072 i opis repozytoriów w MonoriseDocumentation.

Pierwsza wersja powstaje w kolejnych pull requestach.

## Uruchomienie lokalne

Potrzebne: Node.js 24 (`.nvmrc`), pnpm 11 oraz działający lokalnie [MonoriseCore](https://github.com/Monorise-Team/MonoriseCore) (logowanie na `localhost:3100` i Core API na `localhost:3200`).

```bash
# raz: dostęp do paczek @monorise-team/* w GitHub Packages
gh auth refresh -h github.com -s read:packages
export GITHUB_PACKAGES_TOKEN=$(gh auth token)

# raz, w MonoriseCore: klient OAuth monorise-portal i sekret (apps/auth/.data/oauth-clients.json)
pnpm oauth:seed

pnpm install
pnpm setup:env          # apps/web/.env.local; sekret monorise-portal bierze z MonoriseCore
pnpm dev                # http://portal.localhost:3400
```

Jeśli repozytorium albo git worktree nie leży obok katalogu `MonoriseCore`, wskaż plik z sekretami OAuth Core przez zmienną `CORE_OAUTH_SECRETS_FILE`, na przykład:

```bash
CORE_OAUTH_SECRETS_FILE=/sciezka/do/MonoriseCore/apps/auth/.data/oauth-clients.json pnpm setup:env
```
