import { describe, expect, it } from "vitest";
import {
  exampleAnswers,
  freshScenario,
  hasPreparedSummary,
  MAX_SCENARIO_BYTES,
  parseScenario,
  questions,
  readScenario,
} from "./scenario";

describe("Poznajmy Cię data boundaries", () => {
  it("restores a complete copy including immutable submitted questions", () => {
    const data = freshScenario();
    data.answers = ["Fikcyjny projekt", "Mój wkład", "Sprawdzam źródło"];
    data.submitted = {
      questions: [...data.answerQuestions],
      answers: [...data.answers],
      sentAt: "2026-11-19T16:00:00Z",
    };
    data.approvedQuestions[0] = "Nowe pytanie";
    data.followup = "Fikcyjne dopytanie";
    const restored = parseScenario(JSON.stringify(data));
    expect(restored).toEqual(data);
    expect(restored.submitted?.questions[0]).toBe(questions[0]);
  });
  it.each([
    "",
    "{",
    '{"version":2}',
    JSON.stringify({ ...freshScenario(), answers: ["x".repeat(6001), "", ""] }),
  ])("protects invalid or incompatible storage: %s", (raw) => {
    const storage = {
      getItem: () => raw,
      setItem: () => {
        throw new Error("must not write");
      },
    };
    const loaded = readScenario(storage);
    expect(loaded.canWrite).toBe(false);
    expect(loaded.raw).toBe(raw);
    expect(loaded.data).toEqual(freshScenario());
    expect(() => parseScenario(raw)).toThrow();
  });
  it("handles absent and denied storage differently", () => {
    expect(readScenario({ getItem: () => null, setItem() {} }).canWrite).toBe(true);
    expect(readScenario(null)).toMatchObject({ canWrite: false, raw: undefined });
    expect(
      readScenario({
        getItem() {
          throw new Error("Denied");
        },
        setItem() {},
      }).canWrite,
    ).toBe(false);
  });
  it("rejects oversized imports before parsing", () => {
    expect(() => parseScenario("ą".repeat(MAX_SCENARIO_BYTES))).toThrow("za duża");
  });
  it("only associates prepared AI with the exact fictional questions and answers", () => {
    const submitted = { questions: [...questions], answers: [...exampleAnswers], sentAt: "" };
    expect(hasPreparedSummary(submitted)).toBe(true);
    expect(
      hasPreparedSummary({ ...submitted, questions: ["Nowe pytanie", ...questions.slice(1)] }),
    ).toBe(false);
    expect(
      hasPreparedSummary({
        ...submitted,
        answers: ["Własna odpowiedź", ...exampleAnswers.slice(1)],
      }),
    ).toBe(false);
  });
});
