import type { LearningProfile } from "./types";

export function recordDailyCompletion(profile: LearningProfile, date: string, completedAt: string): LearningProfile {
  const taskIds = profile.tasks.filter((task) => task.dueDate <= date).map((task) => task.id);
  if (taskIds.length === 0 || profile.tasks.some((task) => task.dueDate <= date && !task.completedAt)) return profile;
  const existing = profile.dailyCompletions.find((completion) => completion.date === date);
  if (!existing) return { ...profile, dailyCompletions: [...profile.dailyCompletions, { date, taskIds, completedAt }] };
  if (existing.taskIds.length === taskIds.length && existing.taskIds.every((taskId) => taskIds.includes(taskId))) return profile;
  return {
    ...profile,
    dailyCompletions: profile.dailyCompletions.map((completion) => completion.date === date
      ? { ...completion, taskIds }
      : completion),
  };
}
