# Przygotowanie fikcyjnego demo do publikacji

## Cel i kryteria

Użytkowniczka wybrała demo online dla maksymalnie 20 osób, z limitem 0 zł miesięcznie. Do zachowania fikcyjnych odpowiedzi wystarczy plik eksportu. Sama będzie kontaktem podczas pokazu. Wskazała Vercel lub Netlify; dla gotowego katalogu `dist/` wybrano Netlify Drop.

- Zapis ostatnich 20 kategorii błędów z czasem i wersją oraz plik raportu technicznego; bez odpowiedzi, CV, notatek, adresów i treści błędów.
- Konkretna instrukcja Netlify: publikacja, kontrola po wgraniu, odzyskanie, powrót do wersji; lokalny pakiet i manifest. Nie uznawać powrotu hostingu za przećwiczony przed istnieniem dwóch wydań.
- Przećwiczyć przywrócenie kopii pakietu na odizolowanych plikach. W raporcie rozdzielić przygotowanie, wdrożenie i obserwację użycia.
- Wykonać pełny zestaw kontroli projektu i sprawdzić zaktualizowany raport. Zachować istniejące zmiany i granice fikcyjnego case’u.

Rejestr `FEATURES.md` ma opisać nową kontrolkę raportu. Dokumentacja wydania i raport offline pozostają w folderze projektu.

## Ustalenie z osobnego przeglądu

Pełny test wykrył możliwość pokazania sukcesu zapisu szkicu przed zakończeniem operacji. Te same wywołania dotyczyły wysłania zgłoszenia, publikacji oferty i zmiany etapu. Działania z potwierdzeniem czekają teraz na wynik zapisu; test odmowy `localStorage.setItem` sprawdza, że szkic i wysłanie nie pokazują sukcesu ani nie zmieniają utrwalonego stanu. Pozostałe lokalne akcje bez potwierdzenia zachowują dotychczasową natychmiastową reakcję interfejsu.
