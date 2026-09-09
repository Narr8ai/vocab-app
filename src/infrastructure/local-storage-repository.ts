import { createEmptyProfile } from "../domain/profile";
import { SCHEMA_VERSION, type LearningProfile, type ProfileMode } from "../domain/types";
import type { LoadProfileResult, ProfileRepository } from "./profile-repository";

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; }

const keyFor = (mode: ProfileMode) => `vocab-app:profile:${mode}:v1`;

function isProfile(value: unknown): value is LearningProfile {
  if (typeof value !== "object" || value === null) return false;
  const profile = value as Partial<LearningProfile>;
  const record = (item: unknown): item is Record<string, unknown> => typeof item === "object" && item !== null;
  const text = (item: unknown) => typeof item === "string";
  const date = (item: unknown) => text(item) && /^\d{4}-\d{2}-\d{2}$/.test(item) && new Date(`${item}T12:00:00.000Z`).toISOString().slice(0, 10) === item;
  const timestamp = (item: unknown) => text(item) && /^\d{4}-\d{2}-\d{2}T/.test(item) && !Number.isNaN(Date.parse(item));
  const stringList = (item: unknown) => Array.isArray(item) && item.every(text);
  const plans = (item: unknown) => Array.isArray(item) && item.every((plan) => record(plan) && text(plan.id) && text(plan.name) && stringList(plan.listIds) && timestamp(plan.createdAt));
  const tasks = (item: unknown) => Array.isArray(item) && item.every((task) => record(task) && text(task.id) && text(task.listId) && date(task.dueDate) && text(task.kind) && typeof task.estimatedMinutes === "number" && task.estimatedMinutes > 0 && (task.sourceTaskId === undefined || text(task.sourceTaskId)) && (task.completedAt === undefined || timestamp(task.completedAt)));
  const listStates = (item: unknown) => Array.isArray(item) && item.every((state) => record(state) && text(state.listId) && stringList(state.completedWordIds));
  const wordStates = (item: unknown) => Array.isArray(item) && item.every((state) => record(state) && text(state.wordId) && typeof state.meaningCorrect === "number" && typeof state.spellingCorrect === "number");
  const attempts = (item: unknown) => Array.isArray(item) && item.every((attempt) => record(attempt) && text(attempt.id) && text(attempt.taskId) && text(attempt.listId) && text(attempt.kind) && text(attempt.reviewOccurrenceId) && timestamp(attempt.occurredAt) && Array.isArray(attempt.results) && attempt.results.every((result) => record(result) && text(result.wordId) && typeof result.correct === "boolean"));
  const sessions = (item: unknown) => Array.isArray(item) && item.every((session) => record(session) && text(session.id) && text(session.taskId) && timestamp(session.startedAt) && (session.lastActiveAt === undefined || timestamp(session.lastActiveAt)) && (session.endedAt === undefined || timestamp(session.endedAt)) && typeof session.activeSeconds === "number");
  const completions = (item: unknown) => Array.isArray(item) && item.every((completion) => record(completion) && date(completion.date) && stringList(completion.taskIds) && timestamp(completion.completedAt));
  const activeLearning = (item: unknown) => item === undefined || (record(item) && text(item.taskId) && text(item.listId)
    && ["study", "recall", "meaning", "spelling"].includes(item.step as string) && stringList(item.wordIds)
    && (item.meaningResults === undefined || (Array.isArray(item.meaningResults) && item.meaningResults.every((result) => record(result) && text(result.wordId) && typeof result.correct === "boolean"))));
  return profile.schemaVersion === SCHEMA_VERSION && text(profile.id) && text(profile.timezone) && timestamp(profile.createdAt)
    && plans(profile.plans) && tasks(profile.tasks) && listStates(profile.listStates) && wordStates(profile.wordStates)
    && attempts(profile.attempts) && sessions(profile.sessions) && completions(profile.dailyCompletions) && activeLearning(profile.activeLearning);
}

export class LocalStorageProfileRepository implements ProfileRepository {
  constructor(private readonly storage: StorageLike, private readonly timezone: string, private readonly now: () => string) {}

  load(mode: ProfileMode): LoadProfileResult {
    const raw = this.storage.getItem(keyFor(mode));
    if (raw === null) {
      const profile = createEmptyProfile(`${mode}-profile`, this.timezone, this.now());
      this.save(profile, mode);
      return { profile };
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isProfile(parsed)) return { profile: parsed };
    } catch { /* recover below */ }
    this.backupCorrupt(raw);
    this.storage.removeItem(keyFor(mode));
    return { profile: createEmptyProfile(`${mode}-profile`, this.timezone, this.now()), warning: "Saved learning data was recovered." };
  }

  save(profile: LearningProfile, mode: ProfileMode = "real"): void {
    const activeKey = keyFor(mode);
    const temporaryKey = `${activeKey}:tmp`;
    const serialized = JSON.stringify(profile);
    try {
      this.storage.setItem(temporaryKey, serialized);
      if (this.storage.getItem(temporaryKey) !== serialized) throw new Error("Learning profile could not be saved.");
      this.storage.setItem(activeKey, serialized);
    } finally {
      this.storage.removeItem(temporaryKey);
    }
  }

  clearReal(): void { this.storage.removeItem(keyFor("real")); }

  backupCorrupt(raw: string): void {
    this.storage.setItem(`vocab-app:profile:corrupt:${this.now()}`, raw);
  }
}
