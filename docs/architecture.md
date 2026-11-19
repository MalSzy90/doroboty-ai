# Architecture

One React/TypeScript application is built by Vite into static files. HashRouter renders routes under /#/; route parameters created in the browser require no hosting rewrites. The running app currently uses local CSS tokens, Timeless font and Base UI primitives. New and changed UI must follow the accepted Poster People [design system](design-system/README.md), adapted into the existing stack; installing its reference did not convert runtime styles. There is no server data/API layer.

## Data flow

JSON marketplace/person fixtures → initialState → PrototypeProvider → feature views. Local operations go through transition with shared Zod schemas and explicit role/ownership/transition checks for coherent simulation. All roles still have access to the same browser data; these checks are not security.

Candidate source notes, generated draft and approved application are distinct fields. Submission snapshots CV, candidate name, job title, scenario score and summary. Employer stage events are appended, with private-in-the-UI notes. Profile/job edits do not rewrite submitted records.

Storage uses one versioned localStorage key. Import validates schema/version, unique IDs, cross-references and stage history before replacing state. Unreadable/incompatible saves are protected against automatic overwrite; settings can download the original raw save, import a valid file or explicitly reset. Failed/quota-limited persistence leaves the in-memory app usable and offers export. Import/export is capped at 2 MB; no binary CV storage.

## Features

src/features/prototype owns model/storage/state and page compositions. src/features/jobs retains reusable presentation/filter/description logic; src/components/ui owns Base UI controls. Keep changes small.

LocalStorage is origin-specific. Reload preserves state; another browser/device/port starts separately. No cross-tab live synchronization is provided; close other tabs before editing/importing. Hash links reference records in the receiving browser, not transferred records.

## Evidence and distribution

The baseline historical CSV and JSON are separate from interactive state. Future evidence must arrive in a separately reviewed package. package:participant copies only explicit allowed files/directories, including the complete docs/design-system guide/kit, and omits docs/source, historical task notes, agent run history and .git. A packet verifier checks the baseline data; packaging also verifies a pristine file/hash manifest. Ordinary checks permit participants to edit code and generate build/test output without invalidating a distribution fingerprint. Instructor repository history is never participant-safe.

## Checks

npm run check and ./scripts/verify run formatting, design-system reference integrity/example checks, lint, types, unit tests, build and Playwright against the static preview. Playwright checks external requests, complete workflows, error/recovery behavior, keyboard controls and mobile layout. No test starts system services. npm run dev only starts Vite.

## Ochrona zapisu lokalnego po audycie 19.11.2026

Oba scenariusze serializują zapisy przez Web Locks i porównują oryginalną treść pod blokadą. Nowszy zapis z innej karty blokuje starszą kartę, również przy imporcie/resetowaniu. Nie ma scalania ani synchronizacji widoków: po konflikcie należy pobrać kopię szkicu i odświeżyć stronę. Brak Web Locks lub dostępu do zapisu oznacza pracę w pamięci i komunikat o konieczności eksportu. Produkcyjny adres wymaga HTTPS. Makieta Poznajmy Cię ma własną kopię JSON z walidacją, limitem 2 MB i potwierdzeniem zastąpienia.

W portalu działania z komunikatem sukcesu (szkic, wysłanie, publikacja, zmiana etapu, wycofanie, profil i firma) czekają na zakończenie zapisu. Przy odmowie zapisu pozostawiają formularz do poprawy lub ponowienia; nie wyświetlają sukcesu. Lżejsze zmiany, takie jak przełączanie fikcyjnej osoby, nadal aktualizują widok od razu i pokazują błąd zapisu, jeśli wystąpi.

Kontrola lokalna może korzystać z już zainstalowanego Chrome: `PLAYWRIGHT_CHANNEL=chrome ./scripts/verify`. Bez tej zmiennej konfiguracja nadal używa Chromium dostarczanego przez Playwright; polecenia nie instalują przeglądarek. Dwie zależności minimatch narzędzi deweloperskich są ograniczone przez overrides do 11.0.1 (GHSA-g3hv-75wg-m249); aktualizacja zależności nadrzędnych wymaga późniejszej oceny zgodności.

## Przygotowanie wydania demonstracyjnego

Raport techniczny w przeglądarce zapisuje maksymalnie 20 wpisów z czasem, kategorią i wersją aplikacji. Nie przechowuje treści odpowiedzi, notatek, adresów ani wyjątków. Przy błędzie zapisu zostaje w pamięci bieżącej sesji, dlatego należy go pobrać przed zamknięciem strony. Błędy renderowania pokazują ekran odzyskania. To lokalne dane diagnostyczne, bez zewnętrznej telemetrii.

`npm run release:prepare` kopiuje zbudowane pliki do oddzielnego folderu Netlify Drop, sprawdza listę dopuszczonych zasobów i zapisuje manifest SHA-256 poza folderem do wgrania. Instrukcja dla właścicielki pokazu: [RELEASE_NETLIFY.md](RELEASE_NETLIFY.md). Rzeczywiste nagłówki, HTTPS, logi hostingu i działanie cofnięcia wymagają osobnej kontroli po publikacji.
