import type { LearningProfile } from "./types";

export type ReportAudience = "student" | "parent" | "teacher";
export interface ReportOptions { audience: ReportAudience; listId?: string; period: "week" | "all"; asOf?: string; }
export interface ReportViewModel {
  audience: ReportAudience;
  sampleSize: number;
  meaningRate: number | null;
  spellingRate: number | null;
  onTimeReviewRate: number | null;
  dueReviewCount: number;
  overdueReviewCount: number;
  weakWordIds: string[];
  message: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
}

function subtractDays(iso: string, days: number): string {
  const value = new Date(iso);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString();
}

function messageFor(audience: ReportAudience, weakWordIds: string[], dueReviewCount: number, overdueReviewCount: number): string {
  if (audience === "student") {
    if (overdueReviewCount) return `有 ${overdueReviewCount} 项逾期复习，优先复习后再开启新词。`;
    if (weakWordIds.length) return `优先复习 ${weakWordIds.length} 个薄弱词，下一次争取回忆正确。`;
    return dueReviewCount ? "本周期复习都已按时完成，保持这个节奏。" : "还没有到期复习；完成今天学习后，系统会自动安排后续复习。";
  }
  if (audience === "parent") {
    if (overdueReviewCount) return `有 ${overdueReviewCount} 项复习还未按时完成，建议陪孩子先完成今天的复习。`;
    if (weakWordIds.length) return `发现 ${weakWordIds.length} 个薄弱词，建议陪孩子用 5 分钟口头回忆这些词。`;
    return dueReviewCount ? "本周期复习均按时完成，可以给予孩子具体鼓励。" : "还没有到期复习；孩子完成学习后，后续复习和记录会自动出现。";
  }
  if (overdueReviewCount) return `有 ${overdueReviewCount} 项需要跟进：逾期或延迟完成的复习已列入学习证据。`;
  if (weakWordIds.length) return `有 ${weakWordIds.length} 个薄弱词，可据此安排下一轮课堂抽查。`;
  return dueReviewCount ? "本周期到期复习均按时完成。" : "本周期没有到期复习，暂不作完成率判断。";
}

export function buildReport(profile: LearningProfile, options: ReportOptions): ReportViewModel {
  const generatedAt = options.asOf ?? profile.attempts.at(-1)?.occurredAt ?? profile.createdAt;
  const periodStart = options.period === "week" ? subtractDays(generatedAt, 6) : profile.createdAt;
  const periodEnd = generatedAt;
  const inScope = (listId: string) => !options.listId || listId === options.listId;
  const inPeriod = (occurredAt: string) => occurredAt >= periodStart && occurredAt <= periodEnd;
  const attempts = profile.attempts.filter((attempt) => inScope(attempt.listId) && inPeriod(attempt.occurredAt));
  const meaning = attempts.filter((attempt) => attempt.kind !== "spelling").flatMap((attempt) => attempt.results);
  const spelling = attempts.filter((attempt) => attempt.kind === "spelling").flatMap((attempt) => attempt.results);
  const rate = (results: { correct: boolean }[]) => results.length ? results.filter((result) => result.correct).length / results.length : null;
  const startDate = periodStart.slice(0, 10);
  const endDate = periodEnd.slice(0, 10);
  const reviewTasks = profile.tasks.filter((task) => task.kind === "review" && inScope(task.listId) && task.dueDate >= startDate && task.dueDate <= endDate);
  const onTimeCount = reviewTasks.filter((task) => task.completedAt && task.completedAt.slice(0, 10) <= task.dueDate).length;
  const overdueReviewCount = reviewTasks.filter((task) => !task.completedAt || task.completedAt.slice(0, 10) > task.dueDate).length;
  const allResults = attempts.flatMap((attempt) => attempt.results);
  const latest = new Map<string, boolean>();
  for (const result of allResults) latest.set(result.wordId, result.correct);
  const onTimeReviewRate = reviewTasks.length ? onTimeCount / reviewTasks.length : null;
  const weakWordIds = [...latest].filter(([, correct]) => !correct).map(([wordId]) => wordId);
  return {
    audience: options.audience,
    sampleSize: allResults.length,
    meaningRate: rate(meaning),
    spellingRate: rate(spelling),
    onTimeReviewRate,
    dueReviewCount: reviewTasks.length,
    overdueReviewCount,
    weakWordIds,
    message: messageFor(options.audience, weakWordIds, reviewTasks.length, overdueReviewCount),
    periodStart: startDate,
    periodEnd: endDate,
    generatedAt,
  };
}
