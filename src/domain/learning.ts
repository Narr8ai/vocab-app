import type { Attempt, AttemptResult, LearningProfile, WordState } from "./types";

export type RecallRating = "know" | "uncertain" | "dont-know";
export interface AttemptInput { attemptId: string; taskId: string; listId: string; kind: string; reviewOccurrenceId: string; occurredAt: string; results: readonly AttemptResult[]; }
export interface ListCompletion { passed: boolean; accuracy: number; weakWordIds: string[]; }

export function isSpellingCorrect(answer: string, expected: string): boolean {
  return answer.trim().toLocaleLowerCase() === expected.trim().toLocaleLowerCase();
}

function updateWordState(existing: WordState | undefined, result: AttemptResult, kind: string): WordState {
  const state = existing ?? { wordId: result.wordId, meaningCorrect: 0, spellingCorrect: 0 };
  const field = kind === "spelling" ? "spellingCorrect" : "meaningCorrect";
  return { ...state, [field]: result.correct ? state[field] + 1 : 0 };
}

export function completeRecall(taskId: string, ratings: RecallRating[], wordIds: string[], profile: LearningProfile): LearningProfile {
  if (ratings.length !== wordIds.length || ratings.some((rating) => !["know", "uncertain", "dont-know"].includes(rating))) throw new Error("Every word needs a recall rating.");
  return profile;
}

export function submitAttempt(input: AttemptInput, profile: LearningProfile): LearningProfile {
  if (profile.attempts.some((attempt) => attempt.id === input.attemptId)) return profile;
  const attempt: Attempt = { id: input.attemptId, taskId: input.taskId, listId: input.listId, kind: input.kind, reviewOccurrenceId: input.reviewOccurrenceId, results: [...input.results], occurredAt: input.occurredAt };
  const wordStates = [...profile.wordStates];
  for (const result of input.results) {
    const index = wordStates.findIndex((state) => state.wordId === result.wordId);
    const updated = updateWordState(index < 0 ? undefined : wordStates[index], result, input.kind);
    if (index < 0) wordStates.push(updated); else wordStates[index] = updated;
  }
  return { ...profile, attempts: [...profile.attempts, attempt], wordStates };
}

export function deriveListCompletion(listId: string, profile: LearningProfile): ListCompletion {
  const attempts = profile.attempts.filter((attempt) => attempt.listId === listId);
  const results = attempts.flatMap((attempt) => attempt.results);
  if (results.length === 0) return { passed: false, accuracy: 0, weakWordIds: [] };
  const correct = results.filter((result) => result.correct).length;
  const latestByWord = new Map<string, boolean>();
  for (const result of results) latestByWord.set(result.wordId, result.correct);
  return { passed: correct / results.length >= 0.8, accuracy: correct / results.length, weakWordIds: [...latestByWord].filter(([, value]) => !value).map(([wordId]) => wordId) };
}
