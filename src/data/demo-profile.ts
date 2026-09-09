import { createEmptyProfile } from "../domain/profile";
import type { LearningProfile } from "../domain/types";

export function loadDemoProfile(): LearningProfile {
  const profile = createEmptyProfile("demo-profile", "Asia/Shanghai", "2026-09-01T08:00:00.000Z");
  profile.plans = [{ id: "demo-plan", name: "演示词汇计划", listIds: ["L01"], createdAt: profile.createdAt }];
  profile.tasks = [{ id: "demo-task", listId: "L01", dueDate: "2026-09-09", kind: "review", estimatedMinutes: 8 }];
  profile.attempts = [{ id: "demo-attempt", taskId: "demo-task", listId: "L01", kind: "meaning", reviewOccurrenceId: "demo-review-1", occurredAt: "2026-09-09T08:00:00.000Z", results: [{ wordId: "L01-abandon", correct: true }, { wordId: "L01-ability", correct: false }] }];
  return profile;
}
