import type { LearningProfile, LearningTask } from "./types";

export interface Clock { now(): string; }
export interface IdGenerator { next(prefix: string): string; }
export interface SchedulerDeps { clock: Clock; ids: IdGenerator; }
export interface PlanInput { name: string; listIds: string[]; startDate: string; dailyWordTarget: number; dailyMinuteLimit: number; }

const reviewDays = [1, 2, 4, 7] as const;

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function scheduleReviews(completedTask: LearningTask, profile: LearningProfile, _clock: Clock, _ids: IdGenerator): LearningTask[] {
  if (profile.tasks.some((task) => task.sourceTaskId === completedTask.id)) return [];
  return reviewDays.map((days) => ({
    id: `${completedTask.id}:review:${days}`,
    listId: completedTask.listId,
    dueDate: addDays(completedTask.dueDate, days),
    kind: "review",
    estimatedMinutes: completedTask.estimatedMinutes,
    sourceTaskId: completedTask.id,
  }));
}

export function getTodayQueue(profile: LearningProfile, date: string, minuteLimit: number): LearningTask[] {
  const unfinished = profile.tasks.filter((task) => !task.completedAt && task.dueDate <= date);
  const ordered = [...unfinished].sort((a, b) => {
    const rank = (task: LearningTask) => task.kind === "review" ? 0 : 1;
    return rank(a) - rank(b) || a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id);
  });
  const result: LearningTask[] = [];
  let minutes = 0;
  for (const task of ordered) {
    if (minutes + task.estimatedMinutes > minuteLimit) continue;
    result.push(task);
    minutes += task.estimatedMinutes;
  }
  return result;
}

export function createPlan(input: PlanInput, profile: LearningProfile, deps: SchedulerDeps): LearningProfile {
  if (!input.name.trim() || input.listIds.length === 0 || !/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) throw new Error("A name, lists, and start date are required.");
  if (!Number.isInteger(input.dailyWordTarget) || input.dailyWordTarget < 1) throw new Error("Daily word target must be positive.");
  if (!Number.isInteger(input.dailyMinuteLimit) || input.dailyMinuteLimit < 5 || input.dailyMinuteLimit > 30) throw new Error("Daily limit must be 5–30 minutes.");
  const planId = deps.ids.next("plan");
  const createdAt = deps.clock.now();
  const plan = { id: planId, name: input.name.trim(), listIds: [...input.listIds], createdAt };
  const estimatedMinutes = Math.min(input.dailyMinuteLimit, Math.max(5, Math.ceil(input.dailyWordTarget / 2)));
  const tasks = input.listIds.map((listId, index) => ({ id: deps.ids.next(`learn-${index + 1}`), listId, dueDate: addDays(input.startDate, index), kind: "learn", estimatedMinutes }));
  return { ...profile, plans: [...profile.plans, plan], tasks: [...profile.tasks, ...tasks] };
}
