# Audyt przygotowania prototypu do udostępnienia

## Intencja

Na prośbę użytkowniczki uruchomić skill `production-readiness` dla lokalnego projektu, ze szczególnym uwzględnieniem makiety „Poznajmy Cię”. Ocena dotyczy przygotowania do wdrożenia; odbiorcy, hosting i dopuszczalna utrata danych wymagają ustalenia.

## Kryteria zakończenia

- Zapisać raport offline `docs/production-readiness.html`, z wymaganiami bazowymi, dowodami związanymi z wersją źródeł i konfiguracją oraz wskazaniem niewiadomych.
- Wykonać zrozumiane lokalne kontrole i opisać ich rzeczywiste wyniki oraz ograniczenia dostępu.
- Oddzielić przygotowanie, kontrolę przyszłego wdrożenia i obserwację użycia. Przedstawić konkretny pakiet poprawek dopiero po zapisaniu pierwszego audytu.
- Zachować istniejące zmiany użytkowniczki. Przejrzano `FEATURES.md`; sam audyt nie zmienia zachowania produktu, więc rejestr nie wymaga aktualizacji.

## Granice

To fikcyjny case i lokalna demonstracja z danymi syntetycznymi. Wynik kontroli nie jest certyfikacją bezpieczeństwa, dowodem jakości decyzji rekrutacyjnych ani zgodą na publikację. Poprawki kodu wymagają zaakceptowania konkretnego pakietu zgodnie z użytym skillem.

## Naprawy zlecone 19.11.2026

Użytkowniczka poleciła „Napraw błędy” po audycie. Zakres: ochrona zapisu przed starszą kartą w obu lokalnych scenariuszach; brak fałszywego potwierdzenia zapisu makiety; osobny eksport/import makiety z walidacją i potwierdzeniem; ścieżki zasobów zależne od BASE_URL; formatowanie i zgodna poprawka podatnych zależności. Bez publikacji, zmian briefu/reguł lub usług zewnętrznych.

Kryteria: równoczesny zapis nie gubi nowszych zmian; konflikt zachowuje szkic do eksportu; reset/import nie omijają konfliktu; wadliwy lub zbyt duży plik nie zmienia danych; kopię można odtworzyć; pełny scripts/verify i npm audit mają zapisane rzeczywiste wyniki. Dodane kontrolki używają istniejących Action, pc-notice i natywnych pól; zachowujemy zaakceptowany przez użytkowniczkę wygląd Simple Bold UI tej makiety.

## Wynik napraw i osobny przegląd

- Wdrożono wspólną blokadę zapisu z porównaniem migawki, kolejką zmian i trwałą blokadą starej karty po konflikcie. Reset/import nie omijają konfliktu. Nie odczytano ani nie nadpisano danych użytkowniczki na potrzeby testów.
- Kopia makiety obejmuje pytania, odpowiedzi, przesłaną migawkę i pytanie do rozmowy. Import wymaga walidacji, limitu 2 MB i potwierdzenia. Potwierdzenia wysłania, zatwierdzenia i zapisu pojawiają się po powodzeniu; błędy pozostawiają możliwość eksportu.
- Naprawiono ścieżki CV i podglądu telefonu przez BASE_URL, format rejestru i pomijanie wygenerowanego raportu przez Prettier. Przejrzano i uaktualniono FEATURES.md.
- Dwie zależności deweloperskie minimatch 10.2.6 zastąpiono 11.0.1 przez wąskie overrides. Próba aktualizacji typescript-eslint 8.73.0 została odrzucona przez politykę wieku paczek skonfigurowanego rejestru; polityki nie zmieniono. npm audit po naprawie: 0 zgłoszeń.
- `PLAYWRIGHT_CHANNEL=chrome ./scripts/verify`: exit 0, format/lint/typy/build, 40 testów jednostkowych, 39 testów przeglądarkowych, 67 plików referencji design systemu i 6 testów kitu, 120 rekordów baseline. Początkowy domyślny start Playwright zatrzymał brak Chromium; wykorzystano zainstalowany Chrome w odizolowanych profilach. Konfiguracja pozwala wybrać kanał bez instalowania przeglądarki.
- Rozpoznane podczas kontroli fałszywe błędy połączeń dotyczyły lokalnego czytnika PDF Chrome. Test nadal zabrania zewnętrznych HTTP(S)/WS(S); zasobów chrome:// nie liczy jako sieci.
- Osobny przegląd kodu: sprawdzono kolejność zapisu, zachowanie migawki po błędzie, konflikt reset/import, brak zmiany danych przy wadliwym imporcie, oczekiwanie na zapis przed potwierdzeniem oraz granicę gotowego AI. Testy regresji odtwarzają konflikt w makiecie i bazowym portalu. Ręczny podgląd CUA potwierdził czytelność panelu kopii na 1280 px i w ramce 390 px. Brak pełnego przeglądu czytnikiem ekranu.
- Ograniczenia: ostrzeżenia bundlera o dużym pliku JS i komentarzach Zod; hosting, monitoring, właściciel utrzymania i procedura przywrócenia publikacji nadal wymagają ustalenia. Nie opublikowano strony. Wyniki dotyczą lokalnej wersji demonstracyjnej.
