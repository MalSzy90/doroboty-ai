import { z } from "zod";
import { browserStorage, type StoragePort } from "@/lib/guarded-storage";

export const STORAGE_KEY = "doroboty-poznajmy-cie-prototype-v1";
export const roleTitle = "Specjalista / Specjalistka ds. wdrożeń AI";
export const topics = ["Twoje doświadczenie", "Twój wkład", "Podejście do zadania"];
export const questions = [
  "Opowiedz o projekcie, w którym usprawniono obsługę klienta.",
  "Za co osobiście odpowiadałeś lub odpowiadałaś w tym projekcie?",
  "AI proponuje zwrot pieniędzy po 45 dniach. Regulamin przewiduje 30 dni. Co robisz?",
];
export const hints = [
  "Jaki był problem, dla kogo pracowaliście i co się zmieniło? Wystarczy jeden konkretny przykład.",
  "Opisz swoje decyzje i działania. Oddziel je od tego, czym zajmował się zespół.",
  "Opisz pierwsze kroki, co sprawdzisz i kiedy poprosisz człowieka o decyzję. Nie potrzebujesz kodu.",
];
export const exampleAnswers = [
  "W firmie B2B pracowaliśmy nad obsługą powtarzających się zgłoszeń. Konsultanci ręcznie szukali odpowiedzi w kilku dokumentach. Zespół przygotował asystenta, który proponował odpowiedź i wskazywał jej źródło. Najpierw uruchomiliśmy pilotaż dla pięciu konsultantów. W tym pilotażu średni czas przygotowania odpowiedzi spadł z 12 do 9 minut. Każdą odpowiedź nadal zatwierdzał człowiek.",
  "Przeprowadziłem sześć rozmów z konsultantami i uporządkowałem najczęstsze typy zgłoszeń. Wybrałem z zespołem zakres pilotażu. Sam przygotowałem zestaw 40 przykładowych zgłoszeń do sprawdzenia odpowiedzi i opisałem kryteria: zgodność ze źródłem, kompletność oraz czytelność. Integrację i konfigurację modelu wykonała programistka. Raz w tygodniu wspólnie przeglądaliśmy błędy.",
  "Wstrzymuję automatyczny zwrot i przekazuję sprawę konsultantowi. Sprawdzam, z której wersji regulaminu skorzystało AI, czy poprawnie odczytało datę zakupu i czy istnieje wyjątek dla tego zgłoszenia. Dodaję taki przypadek do zestawu testowego. Przed ponownym uruchomieniem sprawdzam również przypadki na granicy 30 dni. Zwrot może wykonać system dopiero po decyzji uprawnionej osoby.",
];

const texts = z.array(z.string().max(6000)).length(3);
const submissionSchema = z.object({
  questions: texts,
  answers: texts,
  sentAt: z.string(),
});
export const scenarioSchema = z.object({
  version: z.literal(1),
  approvedQuestions: texts,
  questionDrafts: texts,
  answerQuestions: texts,
  answers: texts,
  submitted: submissionSchema.nullable(),
  followup: z.string().max(6000),
});
export type Scenario = z.infer<typeof scenarioSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export function freshScenario(): Scenario {
  return {
    version: 1,
    approvedQuestions: [...questions],
    questionDrafts: [...questions],
    answerQuestions: [...questions],
    answers: ["", "", ""],
    submitted: null,
    followup: "",
  };
}
export const MAX_SCENARIO_BYTES = 2_000_000;
export function parseScenario(raw: string): Scenario {
  if (new TextEncoder().encode(raw).length > MAX_SCENARIO_BYTES)
    throw new Error("Kopia jest za duża (maksymalnie 2 MB).");
  try {
    return scenarioSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error(
      "Nieprawidłowa kopia lub wersja makiety. Dotychczasowe dane pozostają bez zmian.",
    );
  }
}
export function readScenario(storage: StoragePort | null = browserStorage()) {
  let raw: string | null | undefined;
  try {
    if (!storage) throw new Error("Unavailable storage");
    raw = storage.getItem(STORAGE_KEY);
    return {
      data: raw === null ? freshScenario() : parseScenario(raw),
      issue: "",
      canWrite: true,
      raw,
    };
  } catch {
    return {
      data: freshScenario(),
      issue:
        "Nie udało się odczytać zapisu makiety. Pracujesz w tej sesji; poprzedni zapis pozostaje bez zmian.",
      canWrite: false,
      raw,
    };
  }
}
export function hasPreparedSummary(submission: Submission) {
  return (
    submission.questions.every((text, i) => text.trim() === questions[i]) &&
    submission.answers.every((text, i) => text.trim() === exampleAnswers[i])
  );
}
