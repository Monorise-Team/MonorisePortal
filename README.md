# MonorisePortal

Panel klienta Monorise (`portal.monorise.studio`): Owner i administratorzy firmy zarządzają w nim firmą i domenami, pracownikami i zaproszeniami, strukturą firmy, rolami i uprawnieniami oraz dostępem do aplikacji. Portal nie ma własnej bazy: wszystko robi przez API MonoriseCore, a logowanie idzie kontem Monorise przez MonoriseCore. Decyzje: ADR-0050, ADR-0072, ADR-0098 i opis repozytoriów w MonoriseDocumentation.

## Ekrany pierwszej wersji

- **Firma** (`/`) — nazwa i stan firmy, zmiana nazwy firmy, strefa czasowa i domyślny wymiar pracy firmy, lista domen e-mail ze statusem weryfikacji, dodawanie domen, instrukcja rekordu DNS TXT ze sprawdzaniem DNS (lokalnie także „Potwierdź bez DNS”), zmiana głównej domeny, usuwanie niegłównych domen oraz przekazanie roli właściciela innej osobie z aktywnym kontem.
- **Pracownicy** (`/employees`) — lista pracowników z ich statusem, informacją o koncie i skrótem wymiaru pracy, edycja danych pracownika (imię, nazwisko, stanowisko, wymiar pracy z gotowymi ustawieniami i przeliczeniem etatu oraz służbowy e-mail dla osób bez konta), wyłączanie i ponowne włączanie kont logowania, oczekujące zaproszenia ze stanem wysyłki e-maila (w kolejce, ponawiana wysyłka, wysłane z godziną albo błąd wysyłki z podpowiedzią), ich ponowne wysłanie i cofnięcie oraz zapraszanie nowych osób lub pracowników bez konta.
- **Struktura** (`/structure` i `/structure/[unitId]`) — drzewo oddziałów, działów i zespołów, dodawanie jednostek, zmiana nazwy, przypisywanie członków i kierowników oraz archiwizacja jednostki.
- **Role** (`/roles` i `/roles/[roleId]`) — gotowe role Core i produktów oraz własne role firmy, tworzenie kopii roli, zmiana nazwy, opisu i uprawnień własnej roli, przypisywanie i odbieranie ról w firmie albo w wybranej jednostce oraz archiwizacja własnej roli.
- **Aplikacje** (`/apps`) — aktywne i historyczne uprawnienia firmy do produktów (np. TimoTime) oraz nadawanie i odbieranie dostępu pracownikom z aktywnym kontem.
- **Dziennik** (`/audit`) — dziennik zdarzeń firmy od najnowszych z filtrowaniem (osoba, zdarzenie, typ zasobu, zakres dat), rozwijanymi szczegółami (`metadata` oczyszczone przez Core) i stronicowaniem kursorem.
- **Powiadomienia** (`/notifications`): ustawienia powiadomień e-mail zalogowanej osoby pogrupowane według produktów oraz grupy „Konto i bezpieczeństwo”, z włączaniem i wyłączaniem opcjonalnych kategorii oraz zablokowanymi wiadomościami o logowaniu i bezpieczeństwie.

## Co jest potrzebne do zmiany

Portal ukrywa formularze tam, gdzie z góry wiadomo, że nie da się wykonać akcji, ale każdą zmianę ostatecznie sprawdza Core. Gdy brakuje uprawnienia do odczytu wybranej listy lub fragmentu strony, Portal wyświetla komunikat „Nie masz uprawnienia, żeby to zobaczyć.”.

| Działanie                                                                             | Wymagane uprawnienie w Core                                                                     |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Dane firmy (zmiana nazwy, strefa czasowa, domyślny wymiar pracy) i domeny e-mail      | `core.organization.manage` w całej firmie albo właściciel                                       |
| Przekazanie roli właściciela                                                          | Tylko właściciel firmy                                                                          |
| Pracownicy (edycja danych i wymiaru pracy, wyłączanie i włączanie kont) i zaproszenia | `core.employees.manage` w całej firmie albo właściciel                                          |
| Struktura firmy (jednostki i członkostwa)                                             | `core.structure.manage` (dla jednostki, jednostki nadrzędnej albo całej firmy) albo właściciel  |
| Role (tworzenie, edycja uprawnień, archiwizacja)                                      | `core.roles.manage` w całej firmie albo właściciel                                              |
| Przypisania ról (nadanie i odebranie)                                                 | `core.roles.assign` w docelowym zakresie oraz posiadanie nadawanych uprawnień (albo właściciel) |
| Dostęp do aplikacji (nadanie i odebranie)                                             | `core.app_access.manage` obejmujące jednostki pracownika (albo w całej firmie) lub właściciel   |
| Dziennik zdarzeń (odczyt)                                                             | `core.audit.read` w całej firmie albo właściciel                                                |
| Ustawienia powiadomień e-mail (własne konto)                                          | Zalogowane konto w bieżącej firmie (bez dodatkowych uprawnień administratora)                   |

## Skróty klawiszowe

- `⌘K` / `Ctrl+K` — paleta poleceń
- `Shift+?` — podgląd skrótów klawiszowych
- `g f` — Firma, `g p` — Pracownicy, `g s` — Struktura, `g r` — Role, `g a` — Aplikacje, `g d` — Dziennik (gdy osoba ma dostęp), `g n` — Powiadomienia, `g w` — Wygląd

## Jak działa sesja

Logowanie i sesja opierają się na zaszyfrowanym ciasteczku `HttpOnly` (ADR-0098, `@monorise-team/auth/next` w trybie `cookie`):

1. Żądania do stron przechodzą przez `apps/web/src/proxy.ts`, które odświeża wygasającą sesję przed wyrenderowaniem Server Componentu i przekazuje nowe ciasteczko w odpowiedzi oraz do samego żądania.
2. Formularze HTML wysyłają `POST` na route handlery w `apps/web/src/app/api/**/route.ts` opakowane w `formAction` (`apps/web/src/server/form.ts`), które uwierzytelniają żądanie przez `withAuth` (sesja z ciasteczka i ochrona CSRF) i wykonują zmianę w Core przez `@monorise-team/sdk` (z automatycznym ponawianiem przy przejściowych błędach i stałym nagłówkiem `Idempotency-Key` z formularza dla operacji tworzących).
3. Po wykonaniu akcji handler zwraca przekierowanie `303` z parametrem `?ok=` albo `?error=`, a przy odmowie z Core zapisuje także krótkotrwałe ciasteczko `portal-error-detail` (ważne 30 s), żeby wyświetlić dokładny powód odmowy na stronie powrotu.

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

## Test na żywo

1. Uruchom lokalnie MonoriseCore (baza danych, serwer logowania i Core API) oraz pocztę testową Mailpit (`http://localhost:8125`).
2. W MonorisePortal uruchom `pnpm dev` i otwórz `http://portal.localhost:3400`.
3. Zaloguj się kontem właściciela firmy testowej (np. w domenie `.test`).
4. Na ekranie **Pracownicy** zaproś nową osobę (np. `anna@acme.test`), otwórz wiadomość w Mailpit (`http://localhost:8125`) i aktywuj konto z linku zaproszenia.
5. Po powrocie do Portalu nadaj aktywnemu kontu wybraną rolę na ekranie **Role** oraz włącz dostęp do TimoTime na ekranie **Aplikacje**.
6. Zaloguj się zaproszonym kontem do TimoTime i sprawdź, czy widzi właściwy zakres uprawnień.
