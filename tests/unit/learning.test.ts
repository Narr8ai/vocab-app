import { describe, expect, it } from "vitest";
import { completeRecall, deriveListCompletion, isSpellingCorrect, submitAttempt } from "../../src/domain/learning";
import { createEmptyProfile } from "../../src/domain/profile";

describe("learning evidence", () => {
  it("requires a recall rating for every word", () => {
    const profile = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    expect(() => completeRecall("task", ["know"], ["w1", "w2"], profile)).toThrow("Every word needs a recall rating.");
  });

  it("keeps duplicate attempt submissions idempotent", () => {
    const profile = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    const input = { attemptId: "a1", taskId: "task", listId: "L01", kind: "meaning", reviewOccurrenceId: "r1", occurredAt: "2026-09-09T08:00:00.000Z", results: [{ wordId: "w1", correct: true }] } as const;
    const once = submitAttempt(input, profile);
    expect(submitAttempt(input, once).attempts).toHaveLength(1);
  });

  it("uses an 80 percent threshold and retains weak words", () => {
    const profile = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    const updated = submitAttempt({ attemptId: "a1", taskId: "task", listId: "L01", kind: "meaning", reviewOccurrenceId: "r1", occurredAt: "2026-09-09T08:00:00.000Z", results: [{ wordId: "w1", correct: true }, { wordId: "w2", correct: true }, { wordId: "w3", correct: true }, { wordId: "w4", correct: false }, { wordId: "w5", correct: false }] }, profile);
    expect(deriveListCompletion("L01", updated).passed).toBe(false);
    expect(deriveListCompletion("L01", updated).weakWordIds).toEqual(["w4", "w5"]);
  });

  it("requires three distinct review occurrences before a word is recovered", () => {
    let profile = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    for (const occurrence of ["r1", "r2", "r3"]) profile = submitAttempt({ attemptId: occurrence, taskId: "task", listId: "L01", kind: "meaning", reviewOccurrenceId: occurrence, occurredAt: "2026-09-09T08:00:00.000Z", results: [{ wordId: "w1", correct: true }] }, profile);
    expect(profile.wordStates[0].meaningCorrect).toBe(3);
  });

  it("does not count duplicate answers from the same review occurrence toward recovery", () => {
    let profile = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    profile = submitAttempt({ attemptId: "first", taskId: "task", listId: "L01", kind: "meaning", reviewOccurrenceId: "r1", occurredAt: "2026-09-09T08:00:00.000Z", results: [{ wordId: "w1", correct: true }] }, profile);
    profile = submitAttempt({ attemptId: "retry", taskId: "task", listId: "L01", kind: "meaning", reviewOccurrenceId: "r1", occurredAt: "2026-09-09T08:01:00.000Z", results: [{ wordId: "w1", correct: true }] }, profile);

    expect(profile.wordStates[0].meaningCorrect).toBe(1);
  });

  it("checks spelling answers without penalizing letter case or surrounding spaces", () => {
    expect(isSpellingCorrect("  Abandon ", "abandon")).toBe(true);
    expect(isSpellingCorrect("abandons", "abandon")).toBe(false);
  });
});
