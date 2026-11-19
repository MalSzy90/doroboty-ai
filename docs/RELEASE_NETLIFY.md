# Wydanie fikcyjnej demonstracji w Netlify

Właścicielka pokazu i osoba kontaktowa: użytkowniczka. Odbiorcy: do 20 osób jednocześnie. Limit kosztu: 0 zł miesięcznie. Do zachowania fikcyjnych odpowiedzi wystarcza ręczny eksport pliku JSON; adres strony nie przenosi zapisu między urządzeniami. Nie wpisywać prawdziwych danych osobowych.

## Przygotowanie pakietu

1. W folderze projektu uruchom `PLAYWRIGHT_CHANNEL=chrome ./scripts/verify`. Zmienna wybiera już zainstalowaną przeglądarkę Chrome; wynik wszystkich kontroli musi być poprawny.
2. Uruchom `npm run release:prepare`. Skrypt tworzy nowy folder `artifacts/netlify-drop-…` oraz osobny plik manifestu z odciskami SHA-256. **Do Netlify wgraj tylko utworzony folder**, nie całe repozytorium ani manifest. Skrypt dopuszcza wyłącznie stronę, zasoby aplikacji, przygotowane CV i fikcyjny pakiet baseline; odrzuca nieznany plik i usuwa z pakietu techniczny opis CV.
3. Zachowaj folder i manifest. W manifeście zapisz identyfikator wydania i późniejszy adres wdrożenia. Nie zastępuj tego folderu nowym buildem; kolejne wydanie ma własny folder.

## Publikacja

1. Na koncie Netlify wybierz plan **Free** i sprawdź w panelu aktualny limit kredytów. Oficjalny opis podaje 300 kredytów miesięcznie z twardym limitem, bez automatycznego doładowania; udana publikacja produkcyjna kosztuje 15 kredytów, transfer 20 kredytów/GB. Limit może zatrzymać stronę po wyczerpaniu, więc sprawdź go przed pokazem. [Dokumentacja planów](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/), [kredyty](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/).
2. Otwórz [Netlify Drop](https://app.netlify.com/drop) i przeciągnij **folder** `netlify-drop-…` (z `index.html` bezpośrednio w środku). Netlify od razu publikuje wgrany folder pod adresem `.netlify.app`; dlatego wykonaj kontrolę poniżej zanim podasz link uczestnikom. [Instrukcja Netlify](https://docs.netlify.com/deploy/create-deploys/), [Netlify Drop](https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/).
3. Zapisz dokładny URL i identyfikator wdrożenia. Skonfiguruj własność strony na swoim koncie, tak by mieć dostęp do listy wdrożeń. Zweryfikuj, że plan i konto nie włączają płatnych dodatków.

## Kontrola przed wysłaniem linku

Wykonaj te kroki na fikcyjnych danych w nowym profilu przeglądarki, w tym co najmniej raz na telefonie lub przy 390 px:

1. Otwórz adres przez HTTPS; sprawdź ekran główny i `/#/prototyp/poznajmy-cie`. Brak błędów pobierania JS, CSS, fontu, obrazka i obu CV.
2. W widoku kandydata wpisz trzy własne odpowiedzi, przejrzyj je, wyślij i odśwież. W widoku pracodawcy sprawdź te same odpowiedzi oraz brak gotowego podsumowania AI dla własnych tekstów. Zapisz pytanie do rozmowy i odśwież.
3. Zmień pytanie w widoku `widok=pytania`. Otwórz starą kartę, spróbuj zapisać notatkę i sprawdź, że pojawił się komunikat konfliktu, a pytanie nie zniknęło. Pobierz kopię makiety, zresetuj tylko testowy profil, wczytaj kopię i sprawdź przywrócenie.
4. Otwórz PDF CV i podgląd telefonu. Sprawdź, czy w odpowiedzi strony są `X-Robots-Tag: noindex`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer` i `X-Content-Type-Options: nosniff`. Plik `_headers` w pakiecie jest deklaracją, nie dowodem działania nagłówków na hostingu. [Nagłówki Netlify](https://docs.netlify.com/manage/routing/headers/).
5. Pobierz raport techniczny i sprawdź, czy zawiera tylko czas, kategorię oraz wersję. Kontrolowany błąd i brak treści odpowiedzi w raporcie sprawdza lokalny test przeglądarkowy. Nie wpisuj treści odpowiedzi do zgłoszenia błędu. Wyniki, URL, identyfikator i datę zapisz w raporcie gotowości jako etap _wdrożenia_.

Jeśli którykolwiek z punktów 1–4 nie przechodzi, nie udostępniaj adresu uczestnikom. Zachowaj pobraną kopię odpowiedzi, raport techniczny i opisz objaw bez treści wpisanych przez uczestników.

## Awaria i powrót

Użytkowniczka sprawdza adres, pobiera raport techniczny z problematycznej przeglądarki i ustala, czy problem dotyczy strony, lokalnego zapisu czy wyczerpanych kredytów. Uczestnikom pokazu przekazuje krótki komunikat o przerwie i wstrzymuje dalsze wpisywanie odpowiedzi do czasu sprawdzenia zapisu. Przy pierwszej publikacji nie ma wcześniejszego wdrożenia, do którego można wrócić; wtedy wgraj ponownie zachowany, zweryfikowany folder albo wstrzymaj pokaz. Lokalna kopia odpowiedzi nie odtwarza plików strony, a przywrócenie plików strony nie odtwarza odpowiedzi w innej przeglądarce.

Przy kolejnych wydaniach: w Netlify otwórz stronę → **Deploys** → szczegóły ostatniego działającego wdrożenia → **Publish Deploy**. Powrót jest możliwy tylko dla nadal dostępnego udanego wdrożenia; domyślne usuwanie starych wdrożeń może ograniczyć tę opcję, więc zachowaj lokalny folder i manifest. Po powrocie powtórz kroki 1–4. [Netlify: wdrożenia i rollback](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/).

## Po pokazie

Zapisz liczbę wykonanych scenariuszy, zaobserwowane błędy oraz zużycie kredytów i transferu w panelu Netlify. Brak zgłoszeń nie dowodzi, że wszystko działało. Szczegóły realnego użycia należą do etapu obserwacji w raporcie gotowości.
