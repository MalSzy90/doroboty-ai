import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { usePrototype } from "./store";
import { serializeState, MAX_IMPORT_BYTES } from "./storage";
import { PageTitle } from "./shell";
import { downloadDiagnostics, recordDiagnostic } from "@/lib/diagnostics";
import {
  acceptAnalyticsConsent,
  declineAnalyticsConsent,
  getAnalyticsConsent,
  isAnalyticsConfigured,
  type AnalyticsConsent,
} from "@/lib/analytics";

export function downloadText(name: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function SettingsPage() {
  const { state, reset, importState, original } = usePrototype();
  const [pending, setPending] = useState<"reset" | "import" | null>(null);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function readFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setError("");
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setError("Plik jest za duży (maksymalnie 2 MB).");
      return;
    }
    try {
      setRaw(await file.text());
      setPending("import");
    } catch {
      recordDiagnostic("invalid-import");
      setError("Nie udało się odczytać pliku.");
    }
  }
  async function confirm() {
    setMessage("");
    if (pending === "reset") {
      if (await reset()) setMessage("Przywrócono scenariusz początkowy.");
    } else if (await importState(raw)) {
      setMessage("Dane zostały zaimportowane.");
    }
    setPending(null);
  }
  return (
    <>
      <PageTitle>Ustawienia prototypu</PageTitle>
      <section className="prototype-panel prototype-form">
        <h2>Dane scenariusza</h2>
        <p>
          Zmiany są zapisane tylko w tej przeglądarce. Wysłanie linku innej osobie nie przenosi
          Twoich danych. Eksport pozwala przekazać scenariusz lub zachować kopię przed resetem.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => downloadText("doroboty-scenariusz.json", serializeState(state))}
          >
            Eksportuj dane
          </Button>
          <Button variant="outline" onClick={downloadDiagnostics}>
            Pobierz raport techniczny
          </Button>
          <Button variant="outline" render={<label />}>
            Importuj dane
            <input
              className="sr-only"
              type="file"
              accept="application/json,.json"
              aria-label="Importuj plik scenariusza"
              onChange={readFile}
            />
          </Button>
          {original !== null && (
            <Button
              variant="outline"
              onClick={() =>
                downloadText("doroboty-zapis-do-odzyskania.txt", original, "text/plain")
              }
            >
              Pobierz poprzedni zapis
            </Button>
          )}
        </div>
        <p>Raport zawiera tylko czas, rodzaj błędu i wersję makiety, bez wpisanych odpowiedzi.</p>
        <Button variant="destructive" onClick={() => setPending("reset")}>
          Resetuj scenariusz
        </Button>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
      </section>
      <section className="prototype-panel prototype-form mt-6">
        <h2>O prototypie</h2>
        <p>
          Wybór osoby zastępuje logowanie. Propozycje AI, Match Score i podsumowania odtwarzają
          przygotowany scenariusz; nie oceniają kompetencji. Używaj przykładowych danych i CV.
        </p>
      </section>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(v) => {
          if (!v) setPending(null);
        }}
        title={pending === "reset" ? "Zresetować scenariusz?" : "Zastąpić dane scenariusza?"}
        description="Ta operacja zastąpi lokalne zmiany. Możesz najpierw wyeksportować dane."
        label={pending === "reset" ? "Resetuj" : "Importuj"}
        pending={false}
        onConfirm={confirm}
      />
    </>
  );
}
export function PrivacyPage() {
  const [consent, setConsent] = useState<AnalyticsConsent>(getAnalyticsConsent);
  const [message, setMessage] = useState("");
  const analyticsConfigured = isAnalyticsConfigured();

  function chooseAnalyticsConsent(next: "accepted" | "declined") {
    const saved = next === "accepted" ? acceptAnalyticsConsent() : declineAnalyticsConsent();
    setConsent(next);
    setMessage(
      saved
        ? next === "accepted"
          ? "Zapisano wybór. Wybrane zdarzenia będą wysyłane do PostHog."
          : "Zapisano wybór. Zdarzenia analityczne są wyłączone."
        : "Wybór działa do końca tej karty, ale nie udało się zapisać go w przeglądarce.",
    );
  }

  return (
    <section className="prototype-section max-w-4xl">
      <h1>Prywatność prototypu</h1>
      <div className="mt-6 space-y-5">
        <p>
          Ta wersja służy do ćwiczeń i testów interfejsu. Nie wpisuj prawdziwych danych osobowych
          ani poufnych informacji.
        </p>
        <p>
          Profile, aplikacje i ustawienia pozostają w pamięci tej przeglądarki. Aplikacja nie wysyła
          ich do bazy ani dostawcy AI. Plik eksportu zawiera cały lokalny scenariusz, w tym notatki.
        </p>
        <section aria-labelledby="analytics-privacy-heading" className="space-y-4">
          <h2 id="analytics-privacy-heading">Analityka użycia</h2>
          {analyticsConfigured ? (
            <>
              <p>
                PostHog otrzyma wyłącznie wybrane nazwy ekranów oraz informację o wysłaniu aplikacji
                kandydata, wysłaniu odpowiedzi w makiecie lub zapisaniu pytania do rozmowy. Nie
                wysyłamy treści odpowiedzi, CV, nazwisk, identyfikatorów zgłoszeń ani adresu strony.
                PostHog może otrzymać krótkotrwały identyfikator, informacje o przeglądarce i sesji
                oraz dane sieciowe żądania, takie jak adres IP. Automatyczne śledzenie kliknięć,
                odsłon i nagrania sesji są wyłączone.
              </p>
              <div aria-label="Zgoda na analitykę" className="flex flex-wrap gap-3" role="group">
                <Button
                  onClick={() => chooseAnalyticsConsent("accepted")}
                  type="button"
                  variant={consent === "accepted" ? "secondary" : "default"}
                >
                  Zezwól na analitykę
                </Button>
                <Button
                  onClick={() => chooseAnalyticsConsent("declined")}
                  type="button"
                  variant="outline"
                >
                  Odmów lub cofnij zgodę
                </Button>
              </div>
              <p aria-live="polite" role="status">
                {message ||
                  (consent === "accepted"
                    ? "Zgoda na wybrane zdarzenia jest włączona."
                    : consent === "declined"
                      ? "Zdarzenia analityczne są wyłączone."
                      : "Zdarzenia są wyłączone do czasu Twojej decyzji.")}
              </p>
            </>
          ) : (
            <p>
              Analityka PostHog jest wyłączona w tej wersji. Zdarzenia nie są wysyłane. Jeśli
              integracja zostanie skonfigurowana, możesz zdecydować tutaj, czy zezwolić na wybrane
              zdarzenia.
            </p>
          )}
        </section>
        <p>
          Możesz usunąć zmiany przyciskiem „Resetuj scenariusz” w ustawieniach lub wyczyścić dane
          witryny w przeglądarce. Hosting może prowadzić własne logi dostępu.
        </p>
      </div>
    </section>
  );
}
