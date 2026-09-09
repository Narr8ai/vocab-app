import type { LearningProfile } from "./types";

export type ReportAudience = "student" | "parent" | "teacher";
export interface ReportOptions { audience: ReportAudience; listId?: string; period: "week" | "all"; }
export interface ReportViewModel {
  audience: ReportAudience;
  sampleSize: number;
  meaningRate: number | null;
  spellingRate: number | null;
  onTimeReviewRate: number | null;
  weakWordIds: string[];
  message: string;
  generatedAt: string;
}

export function buildReport(profile: LearningProfile, options: ReportOptions): ReportViewModel {
  const attempts = profile.attempts.filter((attempt) => !options.listId || attempt.listId === options.listId);
  const meaning = attempts.filter((attempt) => attempt.kind !== "spelling").flatMap((attempt) => attempt.results);
  const spelling = attempts.filter((attempt) => attempt.kind === "spelling").flatMap((attempt) => attempt.results);
  const rate = (results: { correct: boolean }[]) => results.length ? results.filter((result) => result.correct).length / results.length : null;
  const reviewTasks = profile.tasks.filter((task) => task.kind === "review" && (!options.listId || task.listId === options.listId));
  const allResults = attempts.flatMap((attempt) => attempt.results);
  const latest = new Map<string, boolean>();
  for (const result of allResults) latest.set(result.wordId, result.correct);
  const onTimeReviewRate = reviewTasks.length ? 0 : null;
  return {
    audience: options.audience,
    sampleSize: allResults.length,
    meaningRate: rate(meaning),
    spellingRate: rate(spelling),
    onTimeReviewRate,
    weakWordIds: [...latest].filter(([, correct]) => !correct).map(([wordId]) => wordId),
    message: reviewTasks.length ? "复习任务等待学习证据。" : "本周期没有到期复习。",
    generatedAt: profile.createdAt,
  };
}
