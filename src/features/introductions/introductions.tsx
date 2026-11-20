import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { Tabs } from "@base-ui/react/tabs";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BrandMark } from "@/features/public/brand-mark";
import {
  STORAGE_KEY,
  MAX_SCENARIO_BYTES,
  parseScenario,
  exampleAnswers,
  freshScenario,
  hasPreparedSummary,
  hints,
  questions,
  readScenario,
  roleTitle,
  topics,
  type Scenario,
  type Submission,
} from "./scenario";
import { createGuardedWriter } from "@/lib/guarded-storage";
import { downloadDiagnostics, recordDiagnostic } from "@/lib/diagnostics";
import { captureProductEvent } from "@/lib/analytics";
import "./introductions.css";

type View = "kandydat" | "pracodawca" | "pytania";
type Step = "start" | "questions" | "review" | "sent";
function Tag({ children, tone = "pink" }: { children: ReactNode; tone?: string }) {
  return <span className={`pc-tag pc-tag-${tone}`}>{children}</span>;
}
function Action({
  children,
  secondary = false,
  ...props
}: React.ComponentProps<typeof Button> & { secondary?: boolean }) {
  return (
    <Button
      {...props}
      className={`pc-button ${secondary ? "pc-button-secondary" : ""} ${props.className ?? ""}`}
    >
      {children}
    </Button>
  );
}
function RecordTabs({ children, employer = false }: { children: ReactNode; employer?: boolean }) {
  return (
    <Tabs.Root defaultValue="intro" className="pc-record">
      <Tabs.List className="pc-tabs" aria-label="Materiały zgłoszenia">
        <Tabs.Tab value="answer">Odpowiedź</Tabs.Tab>
        <Tabs.Tab value="cv">CV</Tabs.Tab>
        <Tabs.Tab value="intro">
          Poznajmy Cię <span className="pc-tab-dot" aria-hidden="true" />
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="intro">{children}</Tabs.Panel>
      <Tabs.Panel value="answer" className="pc-card pc-reading">
        <p className="pc-eyebrow">Zgłoszenie · przykład</p>
        <h2>{employer ? "Dlaczego Marek wybrał tę rolę?" : "Twoja odpowiedź do zgłoszenia"}</h2>
        <p>
          Rozwijam narzędzia wspierające obsługę klientów. Chcę wykorzystać doświadczenie w
          produktach B2B i pilotażach automatyzacji, aby pomagać zespołom bezpiecznie wdrażać AI.
        </p>
      </Tabs.Panel>
      <Tabs.Panel value="cv" className="pc-card pc-reading">
        <p className="pc-eyebrow">CV z momentu zgłoszenia · przykład</p>
        <h2>Marek Nowak</h2>
        <p>Product Owner · produkty B2B i automatyzacja obsługi klienta.</p>
        <a
          className="pc-text-link"
          href={`${import.meta.env.BASE_URL}cv/marek-nowak-cv-v1.pdf`}
          target="_blank"
          rel="noreferrer"
        >
          Otwórz przykładowe CV <ArrowUpRight size={16} />
        </a>
      </Tabs.Panel>
    </Tabs.Root>
  );
}

export default function IntroductionsPrototype() {
  const [params] = useSearchParams();
  const view = params.get("widok") ?? "kandydat";
  if (params.get("podglad") === "telefon") {
    const target = `/prototyp/poznajmy-cie?widok=${encodeURIComponent(view)}`;
    return (
      <div className="pc-mobile-preview">
        <header>
          <strong>Podgląd telefonu · 390 px</strong>
          <Link to={target}>
            Wróć do pełnego widoku <ArrowUpRight size={16} />
          </Link>
        </header>
        <iframe
          title="Makieta Poznajmy Cię na wąskim ekranie"
          src={`${import.meta.env.BASE_URL}#${target}`}
        />
      </div>
    );
  }
  return <IntroductionsScreens />;
}

function IntroductionsScreens() {
  const [params, setParams] = useSearchParams();
  const view: View =
    params.get("widok") === "pracodawca"
      ? "pracodawca"
      : params.get("widok") === "pytania"
        ? "pytania"
        : "kandydat";
  const [loaded] = useState(readScenario);
  const [data, setData] = useState(loaded.data);
  const [issue, setIssue] = useState(loaded.issue);
  const [write] = useState(() => createGuardedWriter(STORAGE_KEY, loaded.raw, !loaded.canWrite));
  const [pending, setPending] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [step, setStep] = useState<Step>(loaded.data.submitted ? "sent" : "start");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [waiting, setWaiting] = useState(false);
  const main = useRef<HTMLElement>(null);
  const answerInput = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    main.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view, step, questionIndex]);

  async function save(next: Scenario, replace = false, confirm = false) {
    if (!confirm) setData(next);
    else setConfirming(true);
    setPending((count) => count + 1);
    try {
      await write(JSON.stringify(next), replace);
      if (confirm) setData(next);
      setIssue("");
      return true;
    } catch (error) {
      setIssue(
        error instanceof Error ? error.message : "Zapis jest niedostępny. Wyeksportuj zmiany.",
      );
      return false;
    } finally {
      if (confirm) setConfirming(false);
      setPending((count) => count - 1);
    }
  }
  function exportScenario() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "poznajmy-cie-kopia.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importScenario(file: File) {
    try {
      if (file.size > MAX_SCENARIO_BYTES) throw new Error("Kopia jest za duża (maksymalnie 2 MB).");
      const next = parseScenario(await file.text());
      if (!window.confirm("Zastąpić odpowiedzi i pytania w tej makiecie danymi z kopii?")) return;
      if (!(await save(next, true, true))) return;
      setStep(next.submitted ? "sent" : "start");
      setQuestionIndex(0);
      setError("");
      setStatus("Wczytano kopię makiety.");
    } catch (error) {
      recordDiagnostic("invalid-import");
      setIssue(error instanceof Error ? error.message : "Nie udało się wczytać kopii.");
    }
  }
  function changeView(next: View) {
    setStatus("");
    setError("");
    setParams({ widok: next });
  }
  async function reset() {
    if (!window.confirm("Usunąć odpowiedzi i zmiany pytań tylko w tej makiecie?")) return;
    if (!(await save(freshScenario(), true, true))) return;
    setStep("start");
    setQuestionIndex(0);
    setStatus("");
    setError("");
    setWaiting(false);
    setParams({ widok: "kandydat" });
  }
  function start() {
    if (data.answers.every((answer) => !answer.trim()))
      save({ ...data, answerQuestions: [...data.approvedQuestions] });
    setError("");
    setQuestionIndex(0);
    setStep("questions");
  }
  function advance() {
    if (!data.answers[questionIndex].trim()) {
      setError("Dodaj odpowiedź, żeby przejść dalej.");
      answerInput.current?.focus();
      return;
    }
    setError("");
    if (questionIndex === 2) setStep("review");
    else setQuestionIndex(questionIndex + 1);
  }
  function fillExample() {
    if (
      data.answers.some((answer) => answer.trim()) &&
      !window.confirm("Zastąpić robocze odpowiedzi przykładem do demonstracji?")
    )
      return;
    save({ ...data, answerQuestions: [...questions], answers: [...exampleAnswers] });
    setError("");
    setStep("review");
    setStatus("Wstawiono fikcyjne odpowiedzi do demonstracji.");
  }
  const employer = view !== "kandydat";
  const nav = employer
    ? [
        { label: "Przegląd", Icon: LayoutDashboard },
        { label: "Moje oferty", Icon: BriefcaseBusiness, target: "pytania" as View },
        { label: "Kandydaci", Icon: Users, target: "pracodawca" as View },
        { label: "Organizacja", Icon: UserRound },
      ]
    : [
        { label: "Przegląd", Icon: LayoutDashboard },
        { label: "Mój profil", Icon: UserRound },
        { label: "Zapisane oferty", Icon: Bookmark },
        { label: "Moje aplikacje", Icon: FileText, target: "kandydat" as View },
      ];

  return (
    <div className="intro-prototype">
      <a
        className="pc-skip"
        href={`#/prototyp/poznajmy-cie?widok=${view}#pc-main`}
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        Przejdź do treści
      </a>
      <div className="pc-demo-bar">
        <span>
          <span className="pc-live-dot" /> Makieta{" "}
          <span className="pc-demo-description">· fikcyjne dane</span>
        </span>
        <div className="pc-view-switch" aria-label="Widok makiety">
          <button aria-pressed={!employer} onClick={() => changeView("kandydat")}>
            Kandydat
          </button>
          <button aria-pressed={employer} onClick={() => changeView("pracodawca")}>
            Pracodawca
          </button>
        </div>
        <div className="pc-preview-tools">
          <Link
            to={`/prototyp/poznajmy-cie?widok=${view}&podglad=telefon`}
            className="pc-phone-link"
          >
            <Smartphone size={14} />
            <span>Telefon</span>
          </Link>
          <button
            className="pc-reset"
            onClick={reset}
            disabled={pending > 0}
            title="Zacznij pokaz od nowa"
          >
            <RotateCcw size={14} />
            <span>Od nowa</span>
          </button>
        </div>
      </div>
      <header className="pc-header">
        <Link to="/" className="pc-brand">
          <BrandMark />{" "}
          <span>
            DoRoboty<span className="pc-brand-ai">.ai</span>
          </span>
        </Link>
        <div className="pc-header-context">
          {employer ? "Przestrzeń pracodawcy" : "Twoja przestrzeń"}
        </div>
        <div className="pc-person">
          <span className={`pc-avatar ${employer ? "pc-avatar-pink" : ""}`}>
            {employer ? "KW" : "MN"}
          </span>
          <span>
            {employer ? "Karolina Wiśniewska" : "Marek Nowak"}
            <small>{employer ? "BrightLabs" : "Konto kandydata"}</small>
          </span>
        </div>
      </header>
      <div className="pc-workspace">
        <aside className="pc-sidebar">
          <p className="pc-sidebar-label">{employer ? "TWOJA FIRMA" : "TWOJE KONTO"}</p>
          <nav aria-label="Panel użytkownika">
            {nav.map(({ label, Icon, target }) =>
              target ? (
                <button
                  key={label}
                  className={view === target ? "is-current" : ""}
                  aria-current={view === target ? "page" : undefined}
                  onClick={() => changeView(target)}
                >
                  <Icon size={19} />
                  {label}
                  {view === target && <span className="pc-nav-dot" />}
                </button>
              ) : (
                <span key={label} className="pc-nav-static" title="Poza zakresem tej makiety">
                  <Icon size={19} />
                  {label}
                </span>
              ),
            )}
          </nav>
          <div className="pc-sidebar-foot">
            <MessageCircle size={22} />
            <p>
              Dobry początek
              <br />
              <strong>to dobra rozmowa.</strong>
            </p>
            <span>DoRoboty.ai</span>
          </div>
        </aside>
        <main className="pc-main" id="pc-main" ref={main} tabIndex={-1}>
          <details className="pc-recovery pc-card">
            <summary>Kopia odpowiedzi i pytań</summary>
            <p>
              Kopia dotyczy tylko tej makiety. Zachowaj ją przed odświeżeniem strony po błędzie
              zapisu.
            </p>
            <Action secondary onClick={exportScenario}>
              Pobierz kopię makiety
            </Action>
            <Action secondary onClick={downloadDiagnostics}>
              Pobierz raport techniczny
            </Action>
            <p>Raport zawiera tylko czas, rodzaj błędu i wersję makiety, bez odpowiedzi.</p>
            <label htmlFor="pc-import">Wczytaj kopię makiety (JSON, do 2 MB)</label>
            <input
              id="pc-import"
              type="file"
              accept="application/json,.json"
              disabled={pending > 0}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void importScenario(file);
              }}
            />
          </details>
          {issue && (
            <div className="pc-notice" role="alert">
              {issue}
            </div>
          )}
          <div className="pc-announcement" role="status">
            {status}
          </div>
          {view === "pytania" ? (
            <QuestionBuilder
              busy={confirming}
              data={data}
              save={save}
              onApproved={() =>
                setStatus("Zestaw zatwierdzony. Nowe rozpoczęcie korzysta z tych pytań.")
              }
            />
          ) : (
            <>
              <nav className="pc-breadcrumb" aria-label="Ścieżka w makiecie">
                <span>{employer ? "Kandydaci" : "Moje aplikacje"}</span>
                <ChevronRight size={14} />
                <span>{employer ? "Marek Nowak" : "BrightLabs"}</span>
              </nav>
              <div
                className={`pc-page-heading ${employer ? "pc-employer-heading" : "pc-candidate-heading"}`}
              >
                {employer && <span className="pc-avatar pc-avatar-large">MN</span>}
                <div>
                  <p className="pc-eyebrow">
                    {employer ? "KANDYDAT NA STANOWISKO" : "TWOJE ZGŁOSZENIE"}
                  </p>
                  <h1>{employer ? "Marek Nowak" : roleTitle}</h1>
                  <p>
                    {employer ? roleTitle : "BrightLabs"}
                    <span className="pc-meta-divider">·</span>
                    {employer ? "Obsługa klienta i automatyzacja" : "Warszawa · Hybrydowo"}
                  </p>
                </div>
                <Tag tone={data.submitted ? "mint" : "pink"}>
                  {data.submitted ? "Odpowiedzi wysłane" : "Zgłoszenie wysłane"}
                </Tag>
              </div>
              <RecordTabs key={view} employer={employer}>
                {employer ? (
                  <EmployerResponses
                    submission={data.submitted}
                    data={data}
                    save={save}
                    waiting={waiting}
                    setWaiting={setWaiting}
                  />
                ) : (
                  <>
                    {step === "start" && (
                      <>
                        <section className="pc-welcome pc-card">
                          <div className="pc-welcome-copy">
                            <Tag>POZNAJMY CIĘ</Tag>
                            <h2>
                              Powiedz nam
                              <br />
                              więcej o sobie<span className="pc-heading-dot">.</span>
                            </h2>
                            <p>
                              CV to początek. Opowiedz o swoim doświadczeniu i pokaż, jak
                              podchodzisz do wyzwań w tej roli.
                            </p>
                            <div className="pc-quick-facts">
                              <span>
                                <MessageCircle size={17} />3 pytania
                              </span>
                              <span>
                                <Clock3 size={17} />
                                Około 8–10 min
                              </span>
                            </div>
                            <Action onClick={start}>
                              {data.answers.some(Boolean) ? "Kontynuuj odpowiedzi" : "Zaczynamy"}
                              <ArrowRight size={18} />
                            </Action>
                            <span className="pc-save-hint">
                              Możesz przerwać i wrócić do odpowiedzi.
                            </span>
                          </div>
                          <div
                            className="pc-topic-art"
                            aria-label="Trzy tematy: doświadczenie, własny wkład i podejście do zadania"
                          >
                            <span className="pc-art-label">JESTEŚ WIĘCEJ NIŻ CV</span>
                            <div className="pc-topic-card">
                              <span>01</span>
                              <strong>
                                Twoje
                                <br />
                                doświadczenie
                              </strong>
                              <BriefcaseBusiness />
                            </div>
                            <div className="pc-topic-card">
                              <span>02</span>
                              <strong>Twój wkład</strong>
                              <UserRound />
                            </div>
                            <div className="pc-topic-card">
                              <span>03</span>
                              <strong>
                                Twój sposób
                                <br />
                                myślenia
                              </strong>
                              <MessageCircle />
                            </div>
                            <span className="pc-art-note">
                              Po Twojemu. Na konkretnych przykładach.
                            </span>
                          </div>
                        </section>
                        <div className="pc-reassurance">
                          <ShieldCheck size={21} />
                          <div>
                            <strong>Twoje odpowiedzi trafią do zespołu BrightLabs.</strong>
                            <p>
                              Pomogą przygotować rozmowę o Twoim doświadczeniu. Wystarczą krótkie,
                              konkretne przykłady.
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                    {step === "questions" && (
                      <section className="pc-question-layout">
                        <aside className="pc-step-list" aria-label="Postęp odpowiedzi">
                          {topics.map((topic, i) => (
                            <div
                              className={i === questionIndex ? "is-active" : ""}
                              aria-current={i === questionIndex ? "step" : undefined}
                              key={topic}
                            >
                              <span>
                                {data.answers[i].trim() && i !== questionIndex ? (
                                  <Check size={15} />
                                ) : (
                                  `0${i + 1}`
                                )}
                              </span>
                              <strong>{topic}</strong>
                            </div>
                          ))}
                          <p>Twoje odpowiedzi zapisują się w tej przeglądarce.</p>
                        </aside>
                        <div className="pc-card pc-question-card">
                          <div className="pc-question-top">
                            <Tag>Pytanie {questionIndex + 1} z 3</Tag>
                            <span>{topics[questionIndex]}</span>
                          </div>
                          <h2 id="pc-question-title">{data.answerQuestions[questionIndex]}</h2>
                          <p id="pc-question-hint">
                            {data.answerQuestions[questionIndex] === questions[questionIndex]
                              ? hints[questionIndex]
                              : "Opowiedz własnymi słowami. Wystarczy konkretny przykład."}
                          </p>
                          <label className="pc-field-label" htmlFor="pc-answer">
                            Twoja odpowiedź
                          </label>
                          <Textarea
                            ref={answerInput}
                            id="pc-answer"
                            value={data.answers[questionIndex]}
                            aria-describedby={`pc-question-hint${error ? " pc-answer-error" : ""}`}
                            aria-invalid={!!error}
                            placeholder="Opowiedz własnymi słowami…"
                            maxLength={6000}
                            onChange={(event) => {
                              const answers = [...data.answers];
                              answers[questionIndex] = event.target.value;
                              save({ ...data, answers });
                              setError("");
                            }}
                          />
                          <div className="pc-field-meta">
                            <span>Konkretne przykłady są mile widziane.</span>
                            <span>{data.answers[questionIndex].length}/6000</span>
                          </div>
                          {error && (
                            <p className="pc-error" role="alert" id="pc-answer-error">
                              {error}
                            </p>
                          )}
                          <div className="pc-form-actions">
                            <Action
                              secondary
                              onClick={() => {
                                setError("");
                                if (questionIndex === 0) setStep("start");
                                else setQuestionIndex(questionIndex - 1);
                              }}
                            >
                              <ArrowLeft size={17} />
                              Wstecz
                            </Action>
                            <Action onClick={advance}>
                              {questionIndex === 2 ? "Sprawdź odpowiedzi" : "Dalej"}
                              <ArrowRight size={17} />
                            </Action>
                          </div>
                        </div>
                      </section>
                    )}
                    {step === "review" && (
                      <section className="pc-card pc-review">
                        <Tag>OSTATNI KROK</Tag>
                        <h2>Wszystko po Twojemu?</h2>
                        <p>Sprawdź odpowiedzi przed wysłaniem do BrightLabs.</p>
                        {data.answerQuestions.map((question, i) => (
                          <article key={i}>
                            <div>
                              <span className="pc-eyebrow">
                                0{i + 1} · {topics[i]}
                              </span>
                              <button
                                className="pc-text-link"
                                onClick={() => {
                                  setQuestionIndex(i);
                                  setStep("questions");
                                }}
                              >
                                <Pencil size={14} />
                                Edytuj<span className="sr-only"> odpowiedź {i + 1}</span>
                              </button>
                            </div>
                            <h3>{question}</h3>
                            <p>{data.answers[i]}</p>
                          </article>
                        ))}
                        <div className="pc-form-actions">
                          <span>
                            <ShieldCheck size={18} />
                            Odpowiedzi zobaczy pracodawca.
                          </span>
                          <Action
                            disabled={pending > 0 || data.answers.some((answer) => !answer.trim())}
                            onClick={async () => {
                              if (data.submitted || data.answers.some((answer) => !answer.trim()))
                                return;
                              const saved = await save(
                                {
                                  ...data,
                                  submitted: {
                                    questions: [...data.answerQuestions],
                                    answers: [...data.answers],
                                    sentAt: new Date().toISOString(),
                                  },
                                },
                                false,
                                true,
                              );
                              if (!saved) return;
                              captureProductEvent({ name: "poznajmy_cie.answers_submitted" });
                              setStep("sent");
                              setStatus("");
                            }}
                          >
                            Wyślij odpowiedzi
                            <ArrowRight size={17} />
                          </Action>
                        </div>
                      </section>
                    )}
                    {step === "sent" && data.submitted && (
                      <section className="pc-card pc-sent">
                        <span className="pc-success-icon">
                          <Check size={34} />
                        </span>
                        <Tag tone="mint">ODPOWIEDZI WYSŁANE</Tag>
                        <h2>
                          Dzięki, Marku.
                          <br />
                          Teraz znamy Cię lepiej.
                        </h2>
                        <p>
                          BrightLabs może już przeczytać Twoje odpowiedzi i przygotować się do
                          rozmowy.
                        </p>
                        <div className="pc-sent-meta">
                          <CheckCircle2 size={18} />3 odpowiedzi · zapisane przy tym zgłoszeniu
                        </div>
                        <details>
                          <summary>
                            Zobacz wysłane odpowiedzi
                            <ChevronDown size={16} />
                          </summary>
                          {data.submitted.questions.map((q, i) => (
                            <article key={i}>
                              <h3>{q}</h3>
                              <p>{data.submitted!.answers[i]}</p>
                            </article>
                          ))}
                        </details>
                      </section>
                    )}
                    {!data.submitted && (
                      <div className="pc-demo-action">
                        <span>Na potrzeby pokazu</span>
                        <button onClick={fillExample}>
                          <Sparkles size={15} />
                          Wczytaj przykład do pokazu
                        </button>
                      </div>
                    )}
                  </>
                )}
              </RecordTabs>
            </>
          )}
          <footer className="pc-footer">
            Makieta do oceny · Simple Bold UI{" "}
            <span>Przygotowane przykłady AI · bez połączenia z modelem</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function EmployerResponses({
  submission,
  data,
  save,
  waiting,
  setWaiting,
}: {
  submission: Submission | null;
  data: Scenario;
  save: (data: Scenario, replace?: boolean, confirm?: boolean) => Promise<boolean>;
  waiting: boolean;
  setWaiting: (value: boolean) => void;
}) {
  const [openAnswer, setOpenAnswer] = useState<number | null>(null);
  const [note, setNote] = useState(data.followup);
  const [saved, setSaved] = useState(false);
  const result = submission ?? { questions, answers: exampleAnswers, sentAt: "" };
  const prepared = hasPreparedSummary(result);
  const sourceRefs = useRef<(HTMLElement | null)[]>([]);
  function reveal(index: number) {
    setOpenAnswer(index);
    requestAnimationFrame(() => {
      sourceRefs.current[index]?.focus();
      sourceRefs.current[index]?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }
  const followup = "Jak sprawdziłeś, czy krótszy czas odpowiedzi nie pogorszył ich jakości?";
  return (
    <>
      {!submission && (
        <div className="pc-fixture-notice">
          <span>
            <Sparkles size={16} />
            {waiting
              ? "Podgląd stanu przed otrzymaniem odpowiedzi"
              : "Podgląd przygotowanego przykładu. Kandydat nie wysłał jeszcze odpowiedzi w tej makiecie."}
          </span>
          <button onClick={() => setWaiting(!waiting)}>
            {waiting ? "Pokaż przykładowy wynik" : "Pokaż stan oczekiwania"}
          </button>
        </div>
      )}
      {!submission && waiting ? (
        <section className="pc-card pc-empty">
          <MessageCircle size={36} />
          <h2>Czekamy na odpowiedzi Marka.</h2>
          <p>Po ich otrzymaniu pojawią się tutaj. Przy tym zgłoszeniu udostępniono 3 pytania.</p>
        </section>
      ) : (
        <div className="pc-results-layout">
          <div>
            <section className="pc-card pc-summary">
              <div className="pc-section-top">
                <span className="pc-section-icon">
                  <Sparkles size={22} />
                </span>
                <Tag tone="lavender">Przykład AI</Tag>
              </div>
              <h2>Więcej o Marku</h2>
              <p className="pc-section-intro">
                {prepared
                  ? "Najważniejsze wątki z odpowiedzi. Każdy możesz sprawdzić u źródła."
                  : "Przeczytaj przesłane odpowiedzi poniżej."}
              </p>
              {prepared ? (
                <>
                  <div className="pc-insight">
                    <span className="pc-insight-number">01</span>
                    <div>
                      <h3>Doświadczenie w pilotażu automatyzacji</h3>
                      <p>
                        Opisuje asystenta wspierającego konsultantów i pilotaż z udziałem pięciu
                        osób. Podaje zmianę czasu przygotowania odpowiedzi.
                      </p>
                      <button className="pc-source-link" onClick={() => reveal(0)}>
                        Zobacz odpowiedź 1<ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="pc-insight">
                    <span className="pc-insight-number">02</span>
                    <div>
                      <h3>Konkretnie opisany własny wkład</h3>
                      <p>
                        Wskazuje rozmowy z konsultantami i przygotowanie 40 przypadków do
                        sprawdzenia. Oddziela swoją pracę od integracji wykonanej przez
                        programistkę.
                      </p>
                      <button className="pc-source-link" onClick={() => reveal(1)}>
                        Zobacz odpowiedź 2<ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="pc-insight">
                    <span className="pc-insight-number">03</span>
                    <div>
                      <h3>Kontrola przed automatycznym działaniem</h3>
                      <p>
                        Proponuje wstrzymanie zwrotu, sprawdzenie źródła i przekazanie decyzji
                        człowiekowi. Uwzględnia sprawdzenie przypadków granicznych.
                      </p>
                      <button className="pc-source-link" onClick={() => reveal(2)}>
                        Zobacz odpowiedź 3<ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="pc-summary-note">
                    Przygotowane podsumowanie przykładowych odpowiedzi. Opis doświadczenia jest
                    deklaracją kandydata.
                  </div>
                </>
              ) : (
                <div className="pc-notice">
                  <strong>Dla tych odpowiedzi nie ma przygotowanego podsumowania.</strong>
                  <p>
                    Ta makieta korzysta z gotowego przykładu AI. Własne odpowiedzi możesz przeczytać
                    i omówić samodzielnie.
                  </p>
                </div>
              )}
            </section>
            <section className="pc-originals">
              <div className="pc-originals-heading">
                <h2>Odpowiedzi kandydata</h2>
                <span>3 odpowiedzi</span>
              </div>
              {result.questions.map((question, i) => (
                <article
                  className={`pc-answer ${openAnswer === i ? "is-open" : ""}`}
                  key={i}
                  ref={(node) => {
                    sourceRefs.current[i] = node;
                  }}
                  tabIndex={-1}
                >
                  <button
                    aria-expanded={openAnswer === i}
                    aria-controls={`pc-source-${i}`}
                    onClick={() => setOpenAnswer(openAnswer === i ? null : i)}
                  >
                    <span className="pc-answer-number">0{i + 1}</span>
                    <span>{question}</span>
                    <ChevronDown size={18} />
                  </button>
                  {openAnswer === i && (
                    <div id={`pc-source-${i}`} className="pc-original-text">
                      <p>{result.answers[i]}</p>
                      <span>Oryginalna odpowiedź · bez zmian</span>
                    </div>
                  )}
                </article>
              ))}
            </section>
          </div>
          <aside className="pc-followup">
            <div className="pc-followup-card">
              <span className="pc-section-icon">
                <MessageCircle size={23} />
              </span>
              <p className="pc-eyebrow">NA KOLEJNĄ ROZMOWĘ</p>
              <h2>{prepared ? "Warto dopytać" : "Twoje pytanie"}</h2>
              {prepared && (
                <>
                  <p>
                    W odpowiedziach brakuje informacji, jak porównano jakość obsługi przed pilotażem
                    i po nim.
                  </p>
                  <blockquote>{followup}</blockquote>
                  <button
                    className="pc-text-link"
                    onClick={() => {
                      setNote(followup);
                      setSaved(false);
                    }}
                  >
                    Użyj tego pytania
                    <ArrowDownIcon />
                  </button>
                </>
              )}
              <label htmlFor="pc-followup-note">Pytanie do rozmowy</label>
              <Textarea
                id="pc-followup-note"
                value={note}
                placeholder="Zapisz, o co chcesz dopytać…"
                maxLength={6000}
                onChange={(event) => {
                  setNote(event.target.value);
                  setSaved(false);
                }}
              />
              <Action
                secondary
                disabled={!note.trim()}
                onClick={async () => {
                  const didSave = await save({ ...data, followup: note });
                  setSaved(didSave);
                  if (didSave) captureProductEvent({ name: "poznajmy_cie.followup_saved" });
                }}
              >
                {saved ? (
                  <>
                    <Check size={16} />
                    Zapisano w makiecie
                  </>
                ) : (
                  "Zapisz pytanie"
                )}
              </Action>
              <span className="pc-note-status" role="status">
                {saved
                  ? "Pytanie jest zapisane w panelu pracodawcy."
                  : "Widoczne tylko w widoku pracodawcy."}
              </span>
            </div>
            <div className="pc-human-note">
              <UserRound size={18} />
              <p>
                Ty prowadzisz rozmowę.
                <br />
                To materiał do jej przygotowania.
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
function ArrowDownIcon() {
  return <ArrowRight size={15} className="pc-arrow-down" />;
}

function QuestionBuilder({
  busy,
  data,
  save,
  onApproved,
}: {
  data: Scenario;
  save: (data: Scenario, replace?: boolean, confirm?: boolean) => Promise<boolean>;
  onApproved: () => void;
  busy: boolean;
}) {
  const [proposal, setProposal] = useState(false);
  const [approved, setApproved] = useState(false);
  const dirty = data.questionDrafts.some((q, i) => q !== data.approvedQuestions[i]);
  return (
    <>
      <nav className="pc-breadcrumb" aria-label="Ścieżka w makiecie">
        <span>Moje oferty</span>
        <ChevronRight size={14} />
        <span>Edycja oferty</span>
      </nav>
      <div className="pc-page-heading">
        <div>
          <p className="pc-eyebrow">BRIGHTLABS · EDYCJA OFERTY</p>
          <h1>
            Pytania, od których
            <br />
            zacznie się rozmowa.
          </h1>
          <p>{roleTitle}</p>
        </div>
      </div>
      <div className="pc-builder-label">
        <Tag>Poznajmy Cię</Tag>
        <span>3 pytania do tej roli</span>
      </div>
      <section className="pc-builder-layout">
        <div className="pc-card pc-builder">
          <div className="pc-section-top">
            <div>
              <h2>Pytania do kandydatów</h2>
              <p>Przejrzyj treść i dopasuj ją do roli.</p>
            </div>
            <Tag tone={dirty ? "pink" : "mint"}>
              {dirty ? "Niezatwierdzone zmiany" : "Zestaw zatwierdzony"}
            </Tag>
          </div>
          {data.questionDrafts.map((q, i) => (
            <div className="pc-builder-field" key={i}>
              <label htmlFor={`pc-question-${i}`}>
                <span>0{i + 1}</span>
                {topics[i]}
              </label>
              <Textarea
                id={`pc-question-${i}`}
                disabled={busy}
                value={q}
                maxLength={6000}
                onChange={(event) => {
                  const drafts = [...data.questionDrafts];
                  drafts[i] = event.target.value;
                  save({ ...data, questionDrafts: drafts });
                  setApproved(false);
                }}
              />
            </div>
          ))}
          <div className="pc-form-actions">
            <span>Zmiany trafią do nowych rozpoczęć.</span>
            <Action
              disabled={busy || data.questionDrafts.some((q) => !q.trim())}
              onClick={async () => {
                const trimmed = data.questionDrafts.map((q) => q.trim());
                if (
                  !(await save(
                    { ...data, approvedQuestions: trimmed, questionDrafts: trimmed },
                    false,
                    true,
                  ))
                )
                  return;
                setApproved(true);
                onApproved();
              }}
            >
              {approved ? (
                <>
                  <Check size={17} />
                  Zatwierdzono
                </>
              ) : (
                <>
                  Zatwierdź zestaw
                  <ArrowRight size={17} />
                </>
              )}
            </Action>
          </div>
        </div>
        <aside>
          <div className="pc-ai-helper">
            <Sparkles size={27} />
            <Tag tone="lavender">Przykład AI</Tag>
            <h2>Dobry punkt wyjścia.</h2>
            <p>
              Podpowiedź pomoże zapytać o doświadczenie, własny wkład i podejście do praktycznej
              sytuacji.
            </p>
            <Action secondary onClick={() => setProposal(!proposal)}>
              {proposal ? "Ukryj propozycję" : "Zobacz propozycję pytań"}
              <ArrowRight size={16} />
            </Action>
            <small>Treść przygotowana do demonstracji.</small>
          </div>
          {proposal && (
            <div className="pc-proposal">
              <h3>Propozycja do tej roli</h3>
              <ol>
                {questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ol>
              <Action
                secondary
                onClick={() => {
                  save({ ...data, questionDrafts: [...questions] });
                  setApproved(false);
                  setProposal(false);
                }}
              >
                Użyj tego zestawu
              </Action>
            </div>
          )}
          <div className="pc-human-note">
            <Pencil size={18} />
            <p>Każde pytanie możesz zmienić. Kandydat zobaczy zatwierdzony zestaw.</p>
          </div>
        </aside>
      </section>
    </>
  );
}
